// 订单控制器
const prisma = require('../config/database')
const { nanoid } = require('nanoid')

// 根据数量匹配批发单价
function resolveWholesalePrice(basePrice, wholesalePrices, quantity) {
    if (!wholesalePrices || !Array.isArray(wholesalePrices) || wholesalePrices.length === 0) {
        return basePrice
    }
    // 取所有 minQty <= quantity 中最大的档
    const sorted = wholesalePrices
        .filter(t => t.minQty <= quantity)
        .sort((a, b) => b.minQty - a.minQty)
    return sorted.length > 0 ? parseFloat(sorted[0].price) : basePrice
}

// 生成订单号
const generateOrderNo = () => {
    const crypto = require('crypto')
    const date = new Date()
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '')
    const random = crypto.randomBytes(9).toString('base64url').slice(0, 12).toUpperCase()
    return `KA${dateStr}${random}`
}

// 创建订单
exports.createOrder = async (req, res, next) => {
    try {
        const { productId, variantId, quantity = 1, email, paymentMethod, remark, agentSlug } = req.body
        const userId = req.user?.id || null

        // ---- 代理分站定价 ----
        let agentInfo = null
        if (agentSlug) {
            const agent = await prisma.agent.findUnique({
                where: { shopSlug: agentSlug },
                select: { id: true, status: true }
            })
            if (agent && agent.status === 'ACTIVE') {
                const ap = await prisma.agentProduct.findUnique({
                    where: { agentId_productId: { agentId: agent.id, productId } }
                })
                if (ap && ap.enabled) {
                    agentInfo = { agentId: agent.id, markup: parseFloat(ap.markup) }
                }
            }
        }

        // 查询商品
        const product = await prisma.product.findUnique({
            where: { id: productId },
            include: { variants: true }
        })

        if (!product) {
            return res.status(404).json({ error: '商品不存在' })
        }

        if (product.status !== 'ACTIVE') {
            return res.status(400).json({ error: '商品已下架' })
        }

        // 如果有规格，查找对应规格
        let variant = null
        let unitPrice = parseFloat(product.price)

        if (variantId) {
            variant = product.variants.find(v => v.id === variantId)
            if (variant) {
                unitPrice = parseFloat(variant.price)
            }
        }

        // 应用批发价（variant 优先，否则用 product 的）
        const wholesalePrices = (variant?.wholesalePrices) || (product.wholesalePrices)
        unitPrice = resolveWholesalePrice(unitPrice, wholesalePrices, quantity)

        // ---- 代理价格计算 ----
        let costPrice = unitPrice // 平台底价
        if (agentInfo) {
            // 如果商品设了代理底价，用代理底价；否则用零售价
            costPrice = product.agentBasePrice ? parseFloat(product.agentBasePrice) : unitPrice
            // 代理售价 = 底价 + 加价
            unitPrice = costPrice + agentInfo.markup
        }

        // 查询库存计算模式设置
        const stockModeSetting = await prisma.setting.findUnique({
            where: { key: 'stockMode' }
        })
        const stockMode = stockModeSetting?.value || 'auto'

        let availableStock
        if (stockMode === 'manual') {
            availableStock = variant ? (variant.stock || 0) : (product.stock || 0)
        } else {
            availableStock = await prisma.card.count({
                where: {
                    productId,
                    variantId: variantId || null,
                    status: 'AVAILABLE'
                }
            })
        }

        if (availableStock < quantity) {
            return res.status(400).json({
                error: availableStock === 0 ? '该商品暂无库存' : `库存不足，仅剩 ${availableStock} 件`
            })
        }

        // 计算金额
        const totalAmount = unitPrice * quantity

        // 构建商品名称（包含规格）
        const productName = variant ? `${product.name} (${variant.name})` : product.name

        // 创建订单
        const order = await prisma.order.create({
            data: {
                orderNo: generateOrderNo(),
                userId,
                email,
                productId,
                productName,
                variantId: variant?.id || null,
                variantName: variant?.name || null,
                quantity,
                unitPrice,
                totalAmount,
                status: 'PENDING',
                paymentMethod,
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                remark: remark || null
            }
        })

        // ---- 创建代理订单记录 ----
        if (agentInfo) {
            await prisma.agentOrder.create({
                data: {
                    agentId: agentInfo.agentId,
                    orderId: order.id,
                    costPrice: costPrice * quantity,
                    sellPrice: unitPrice * quantity,
                    profit: agentInfo.markup * quantity,
                    settled: false
                }
            })
        }

        res.status(201).json({
            message: '订单创建成功',
            order: {
                orderNo: order.orderNo,
                productName: order.productName,
                quantity: order.quantity,
                totalAmount: parseFloat(order.totalAmount),
                status: order.status,
                paymentMethod: order.paymentMethod,
                createdAt: order.createdAt
            }
        })
    } catch (error) {
        next(error)
    }
}

// 查询订单
exports.queryOrder = async (req, res, next) => {
    try {
        const { orderNo, email } = req.query

        if (!orderNo && !email) {
            return res.status(400).json({ error: '请输入订单号或邮箱' })
        }

        // 通过订单号查询（精确查找单个订单）
        if (orderNo) {
            const where = { orderNo }
            if (email) {
                where.email = email
            }

            const order = await prisma.order.findFirst({
                where,
                include: {
                    product: {
                        select: { id: true, name: true, image: true, deliveryNote: true }
                    },
                    cards: {
                        select: { id: true, content: true }
                    }
                }
            })

            if (!order) {
                return res.status(404).json({ error: '订单不存在' })
            }

            return res.json({ order: formatOrder(order) })
        }

        // 通过邮箱查询（仅返回最新 3 条订单）
        const orders = await prisma.order.findMany({
            where: { email },
            include: {
                product: {
                    select: { id: true, name: true, image: true, deliveryNote: true }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: 3
        })

        if (orders.length === 0) {
            return res.status(404).json({ error: '未找到该邮箱关联的订单' })
        }

        res.json({ orders: orders.map(formatOrder) })
    } catch (error) {
        next(error)
    }
}

// 获取订单详情
exports.getOrderByNo = async (req, res, next) => {
    try {
        const { orderNo } = req.params

        let order = await prisma.order.findUnique({
            where: { orderNo },
            include: {
                product: {
                    select: { id: true, name: true, image: true, deliveryNote: true }
                },
                cards: {
                    select: { id: true, content: true }
                }
            }
        })

        if (!order) {
            return res.status(404).json({ error: '订单不存在' })
        }

        // 检查是否为超时的待支付订单（15分钟）
        if (order.status === 'PENDING') {
            const orderAge = Date.now() - new Date(order.createdAt).getTime()
            const timeoutMs = 15 * 60 * 1000 // 15分钟

            if (orderAge > timeoutMs) {
                // 自动取消超时订单
                order = await prisma.order.update({
                    where: { orderNo },
                    data: {
                        status: 'CANCELLED',
                        cancelledAt: new Date()
                    },
                    include: {
                        product: {
                            select: { id: true, name: true, image: true }
                        },
                        cards: {
                            select: { id: true, content: true }
                        }
                    }
                })
                console.log(`订单 ${orderNo} 因超时自动取消`)
            }
        }

        res.json({ order: formatOrder(order) })
    } catch (error) {
        next(error)
    }
}

// 获取订单卡密 (支付成功后)
exports.getOrderCards = async (req, res, next) => {
    try {
        const { orderNo } = req.params

        const order = await prisma.order.findUnique({
            where: { orderNo },
            include: {
                cards: {
                    select: { id: true, content: true }
                }
            }
        })

        if (!order) {
            return res.status(404).json({ error: '订单不存在' })
        }

        if (order.status !== 'COMPLETED') {
            return res.status(400).json({ error: '订单未完成，无法查看卡密' })
        }

        res.json({
            orderNo: order.orderNo,
            cards: order.cards
        })
    } catch (error) {
        next(error)
    }
}

// 格式化订单数据
function formatOrder(order) {
    return {
        id: order.id,
        orderNo: order.orderNo,
        email: order.email,
        product: order.product,
        productName: order.productName,
        quantity: order.quantity,
        unitPrice: parseFloat(order.unitPrice),
        totalAmount: parseFloat(order.totalAmount),
        status: order.status.toLowerCase(),
        paymentMethod: order.paymentMethod,
        paidAt: order.paidAt,
        completedAt: order.completedAt,
        createdAt: order.createdAt,
        cards: order.cards || [],
        deliveryNote: order.product?.deliveryNote || null
    }
}

// 获取当前用户订单列表
exports.getUserOrders = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: '请先登录' })
        }

        const { status } = req.query

        const where = { userId: req.user.id }
        if (status && status !== 'all') {
            where.status = status.toUpperCase()
        }

        const orders = await prisma.order.findMany({
            where,
            include: {
                product: {
                    select: { id: true, name: true, image: true }
                },
                cards: {
                    where: { status: 'SOLD' },
                    select: { content: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        })

        res.json({
            orders: orders.map(order => ({
                orderNo: order.orderNo,
                productName: order.productName,
                productImage: order.product?.image || '',
                quantity: order.quantity,
                totalAmount: parseFloat(order.totalAmount),
                status: order.status.toLowerCase(),
                createdAt: order.createdAt,
                cards: order.cards.map(c => c.content)
            }))
        })
    } catch (error) {
        next(error)
    }
}

// 取消订单
exports.cancelOrder = async (req, res, next) => {
    try {
        const { orderNo } = req.params

        const order = await prisma.order.findUnique({
            where: { orderNo }
        })

        if (!order) {
            return res.status(404).json({ error: '订单不存在' })
        }

        if (order.status !== 'PENDING') {
            return res.status(400).json({ error: '只能取消待支付订单' })
        }

        // 更新订单状态为已取消
        await prisma.order.update({
            where: { orderNo },
            data: {
                status: 'CANCELLED',
                cancelledAt: new Date()
            }
        })

        res.json({ message: '订单已取消', orderNo })
    } catch (error) {
        next(error)
    }
}

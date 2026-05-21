// 订单控制器
const prisma = require('../config/database')

// 获取租户或全局的库存计算模式
async function getStockMode(tenantId) {
    if (tenantId) {
        try {
            const tenantSetting = await prisma.tenantSetting.findUnique({
                where: { tenantId }
            })
            if (tenantSetting && tenantSetting.paymentConfig) {
                const config = JSON.parse(tenantSetting.paymentConfig)
                if (config && config.stock_mode) {
                    return config.stock_mode
                }
            }
        } catch (e) {
            console.error('Failed to get tenant stockMode:', e)
        }
    }
    try {
        const globalSetting = await prisma.setting.findUnique({ where: { key: 'stockMode' } })
        return globalSetting?.value || 'auto'
    } catch (e) {
        return 'auto'
    }
}
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
        const { productId, variantId, quantity = 1, email, paymentMethod, remark, agentSlug, queryPassword } = req.body
        const userId = req.user?.id || null
        const customerId = req.customer?.id || null

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

        // ---- 套餐商品数量限制检查 ----
        if (product.tenantId) {
            const { getPlanLimits } = require('../middleware/planLimits')
            const tenant = await prisma.tenant.findUnique({
                where: { id: product.tenantId },
                select: { shopSlug: true }
            })
            if (tenant) {
                const shop = await prisma.shop.findUnique({ where: { slug: tenant.shopSlug } })
                if (shop && shop.status === 'EXPIRED') {
                    return res.status(403).json({ error: '该商城套餐已到期，暂停接单' })
                }
                // 免费试用期间禁止交易
                if (shop && shop.plan === 'FREE') {
                    return res.status(403).json({
                        error: '该商城正在免费试用中，暂不支持交易。商户升级套餐后即可下单。',
                        code: 'TRIAL_NO_TRANSACTION'
                    })
                }
            }
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
            // 代理底价 = 商品零售价
            costPrice = unitPrice
            // 代理售价 = 底价 + 加价
            unitPrice = costPrice + agentInfo.markup
        }

        // 查询库存计算模式设置
        const stockMode = await getStockMode(product.tenantId)

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

        // 使用事务创建订单与代理订单记录，确保原子性
        const order = await prisma.$transaction(async (tx) => {
            const ord = await tx.order.create({
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
                    remark: remark || null,
                    queryPassword: (!userId && !customerId && queryPassword) ? String(queryPassword).trim() : null,
                    tenantId: product.tenantId || null,
                    customerId
                }
            })

            // ---- 创建代理订单记录 ----
            if (agentInfo) {
                await tx.agentOrder.create({
                    data: {
                        agentId: agentInfo.agentId,
                        orderId: ord.id,
                        costPrice: costPrice * quantity,
                        sellPrice: unitPrice * quantity,
                        profit: agentInfo.markup * quantity,
                        settled: false
                    }
                })
            }

            return ord
        })

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
        const { orderNo, email, password, slug } = req.query

        if (!orderNo && !email) {
            return res.status(400).json({ error: '请输入订单号或邮箱' })
        }
        if (!password || !String(password).trim()) {
            return res.status(400).json({ error: '请输入查询密码' })
        }

        const queryPwd = String(password).trim()

        // 解析租户范围（多租户隔离）
        // 优先级：req.tenantId（自定义域名）> ?slug=xxx
        let scopedTenantId = req.tenantId !== undefined ? req.tenantId : undefined
        if (scopedTenantId === undefined && slug) {
            const t = await prisma.tenant.findUnique({
                where: { shopSlug: slug },
                select: { id: true, status: true }
            })
            scopedTenantId = (t && t.status === 'ACTIVE') ? t.id : null
        }

        // 通过订单号查询（精确查找单个订单）
        if (orderNo) {
            const where = { orderNo }
            if (email) where.email = email
            if (scopedTenantId !== undefined) {
                where.tenantId = scopedTenantId === null ? null : scopedTenantId
            }

            const order = await prisma.order.findFirst({
                where,
                include: {
                    product: { select: { id: true, name: true, image: true, deliveryNote: true } },
                    cards: { select: { id: true, content: true } }
                }
            })

            if (!order) {
                return res.status(404).json({ error: '订单不存在' })
            }

            // 校验查询密码
            if (!order.queryPassword || order.queryPassword !== queryPwd) {
                return res.status(403).json({ error: '查询密码错误' })
            }

            return res.json({ order: formatOrder(order) })
        }

        // 通过邮箱查询（凭查询密码返回所有订单）
        const where = { email, queryPassword: queryPwd }
        if (scopedTenantId !== undefined) {
            where.tenantId = scopedTenantId === null ? null : scopedTenantId
        }

        const orders = await prisma.order.findMany({
            where,
            include: {
                product: { select: { id: true, name: true, image: true, deliveryNote: true } }
            },
            orderBy: { createdAt: 'desc' },
            take: 100
        })

        if (orders.length === 0) {
            return res.status(404).json({ error: '未找到该邮箱关联的订单，或查询密码不正确' })
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

        // 多租户隔离：
        // - 商户订单（order.tenantId 有值）只能从对应商城访问
        // - 主站订单（order.tenantId 为 null）只能从主站访问
        // tenantDetect 中间件会按 host 注入 req.tenantId（自定义域名），
        // 路径模式则需检查 query 或 referer 中的 slug
        const requestSlug = req.query?.slug || null
        let requestTenantId = req.tenantId
        if (!requestTenantId && requestSlug) {
            const t = await prisma.tenant.findUnique({
                where: { shopSlug: requestSlug },
                select: { id: true }
            })
            requestTenantId = t?.id || null
        }

        // 如果订单属于某个 tenant，请求方必须是同一个 tenant
        if (order.tenantId && order.tenantId !== requestTenantId) {
            return res.status(404).json({ error: '订单不存在' })
        }
        // 如果订单是主站订单（tenantId=null），请求方必须没有 tenantId
        if (!order.tenantId && requestTenantId) {
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
        if (!req.user && !req.customer) {
            return res.status(401).json({ error: '请先登录' })
        }

        const { status } = req.query

        // 同时支持顾客 token 和 user token
        const where = req.customer
            ? { customerId: req.customer.id }
            : { userId: req.user.id }
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

        // 如果是套餐订单（tradeNo 关联），同步更新 PlanOrder 状态
        try {
            await prisma.planOrder.updateMany({
                where: { tradeNo: orderNo, paymentStatus: { in: ['PENDING', 'REVIEWING'] } },
                data: { paymentStatus: 'REJECTED' }
            })
        } catch (e) {
            // 忽略：可能不是套餐订单
        }

        res.json({ message: '订单已取消', orderNo })
    } catch (error) {
        next(error)
    }
}

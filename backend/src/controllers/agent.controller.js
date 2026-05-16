// 代理商控制器
const prisma = require('../config/database')

// 申请成为代理
exports.applyAgent = async (req, res, next) => {
    try {
        const userId = req.user.id
        const { shopName, shopSlug, contactEmail, contactInfo, description } = req.body

        if (!shopName || !shopSlug) {
            return res.status(400).json({ error: '请填写店铺名称和分站路径' })
        }

        // 验证 slug 格式（仅允许小写字母、数字、连字符）
        if (!/^[a-z0-9-]{3,30}$/.test(shopSlug)) {
            return res.status(400).json({ error: '分站路径仅允许 3-30 位小写字母、数字和连字符' })
        }

        // 检查是否已经申请过
        const existing = await prisma.agent.findUnique({ where: { userId } })
        if (existing) {
            return res.status(400).json({ error: '您已提交过代理申请', agent: { status: existing.status } })
        }

        // 检查 slug 唯一性
        const slugExists = await prisma.agent.findUnique({ where: { shopSlug } })
        if (slugExists) {
            return res.status(400).json({ error: '该分站路径已被占用' })
        }

        const agent = await prisma.agent.create({
            data: {
                userId,
                shopName,
                shopSlug,
                contactEmail: contactEmail || null,
                contactInfo: contactInfo || null,
                applyDescription: description || null,
                status: 'PENDING'
            }
        })

        // 更新用户角色为 AGENT
        await prisma.user.update({
            where: { id: userId },
            data: { role: 'AGENT' }
        })

        res.status(201).json({
            message: '代理申请已提交，请等待管理员审核',
            agent: { id: agent.id, shopName: agent.shopName, shopSlug: agent.shopSlug, status: agent.status }
        })
    } catch (error) {
        next(error)
    }
}

// 获取代理信息
exports.getAgentProfile = async (req, res, next) => {
    try {
        const agent = req.agent
        res.json({
            agent: {
                id: agent.id,
                shopName: agent.shopName,
                shopSlug: agent.shopSlug,
                shopLogo: agent.shopLogo,
                shopSkin: agent.shopSkin,
                shopNotice: agent.shopNotice,
                status: agent.status,
                balance: parseFloat(agent.balance),
                totalEarnings: parseFloat(agent.totalEarnings),
                withdrawAccounts: agent.withdrawAccounts ? JSON.parse(agent.withdrawAccounts) : {},
                emailNotify: agent.emailNotify,
                notifyEmail: agent.notifyEmail || agent.contactEmail || '',
                createdAt: agent.createdAt
            }
        })
    } catch (error) {
        next(error)
    }
}

// 更新代理信息
exports.updateAgentProfile = async (req, res, next) => {
    try {
        const { shopName, shopLogo, shopSkin, shopNotice, emailNotify, notifyEmail } = req.body
        const data = {}
        if (shopName) data.shopName = shopName
        if (shopLogo !== undefined) data.shopLogo = shopLogo
        if (shopSkin) data.shopSkin = shopSkin
        if (shopNotice !== undefined) data.shopNotice = shopNotice
        if (emailNotify !== undefined) data.emailNotify = !!emailNotify
        if (notifyEmail !== undefined) data.notifyEmail = notifyEmail || null

        const agent = await prisma.agent.update({
            where: { id: req.agent.id },
            data
        })

        res.json({ message: '店铺信息已更新', agent: { shopName: agent.shopName, shopLogo: agent.shopLogo, shopSkin: agent.shopSkin, shopNotice: agent.shopNotice, emailNotify: agent.emailNotify, notifyEmail: agent.notifyEmail } })
    } catch (error) {
        next(error)
    }
}

// 获取可上架商品（所有平台活跃商品 + 代理底价）
exports.getAgentProducts = async (req, res, next) => {
    try {
        const products = await prisma.product.findMany({
            where: { status: 'ACTIVE' },
            include: {
                category: { select: { id: true, name: true } },
                agentProducts: {
                    where: { agentId: req.agent.id }
                }
            },
            orderBy: { sortOrder: 'asc' }
        })

        res.json({
            products: products.map(p => {
                const ap = p.agentProducts[0]
                return {
                    id: p.id,
                    name: p.name,
                    image: p.image,
                    retailPrice: parseFloat(p.price),
                    agentBasePrice: p.agentBasePrice ? parseFloat(p.agentBasePrice) : parseFloat(p.price),
                    category: p.category,
                    // 代理设置
                    enabled: ap?.enabled ?? false,
                    markup: ap ? parseFloat(ap.markup) : 0,
                    agentSellPrice: ap ? (p.agentBasePrice ? parseFloat(p.agentBasePrice) : parseFloat(p.price)) + parseFloat(ap.markup) : null
                }
            })
        })
    } catch (error) {
        next(error)
    }
}

// 设置代理商品（上架/下架 + 加价）
exports.setAgentProduct = async (req, res, next) => {
    try {
        const { productId, markup, enabled } = req.body

        if (!productId) {
            return res.status(400).json({ error: '请指定商品' })
        }

        if (markup !== undefined && markup < 0) {
            return res.status(400).json({ error: '加价金额不能为负数' })
        }

        const product = await prisma.product.findUnique({ where: { id: productId } })
        if (!product || product.status !== 'ACTIVE') {
            return res.status(400).json({ error: '商品不存在或已下架' })
        }

        const agentProduct = await prisma.agentProduct.upsert({
            where: {
                agentId_productId: { agentId: req.agent.id, productId }
            },
            update: {
                markup: markup ?? 0,
                enabled: enabled ?? true
            },
            create: {
                agentId: req.agent.id,
                productId,
                markup: markup ?? 0,
                enabled: enabled ?? true
            }
        })

        res.json({ message: '商品设置已更新', agentProduct })
    } catch (error) {
        next(error)
    }
}

// 获取代理订单
exports.getAgentOrders = async (req, res, next) => {
    try {
        const { page = 1, limit = 20 } = req.query
        const skip = (parseInt(page) - 1) * parseInt(limit)

        const [orders, total] = await Promise.all([
            prisma.agentOrder.findMany({
                where: { agentId: req.agent.id },
                include: {
                    order: {
                        select: {
                            orderNo: true, productName: true, quantity: true,
                            totalAmount: true, status: true, createdAt: true, email: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: parseInt(limit)
            }),
            prisma.agentOrder.count({ where: { agentId: req.agent.id } })
        ])

        res.json({
            orders: orders.map(ao => ({
                id: ao.id,
                orderNo: ao.order.orderNo,
                productName: ao.order.productName,
                quantity: ao.order.quantity,
                buyerEmail: ao.order.email,
                sellPrice: parseFloat(ao.sellPrice),
                costPrice: parseFloat(ao.costPrice),
                profit: parseFloat(ao.profit),
                settled: ao.settled,
                orderStatus: ao.order.status,
                createdAt: ao.createdAt
            })),
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit))
        })
    } catch (error) {
        next(error)
    }
}

// 代理统计
exports.getAgentStats = async (req, res, next) => {
    try {
        const agentId = req.agent.id
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        const [totalOrders, todayOrders, todayProfit, agent, enabledProducts] = await Promise.all([
            prisma.agentOrder.count({ where: { agentId } }),
            prisma.agentOrder.count({ where: { agentId, createdAt: { gte: today } } }),
            prisma.agentOrder.aggregate({
                where: { agentId, createdAt: { gte: today } },
                _sum: { profit: true }
            }),
            prisma.agent.findUnique({ where: { id: agentId }, select: { balance: true, totalEarnings: true } }),
            prisma.agentProduct.count({ where: { agentId, enabled: true } })
        ])

        res.json({
            stats: {
                totalOrders,
                todayOrders,
                todayProfit: parseFloat(todayProfit._sum.profit || 0),
                balance: parseFloat(agent.balance),
                totalEarnings: parseFloat(agent.totalEarnings),
                enabledProducts
            }
        })
    } catch (error) {
        next(error)
    }
}

// 申请提现
exports.requestWithdrawal = async (req, res, next) => {
    try {
        const { amount, method } = req.body
        const agent = req.agent

        if (!amount || amount <= 0) {
            return res.status(400).json({ error: '请输入有效的提现金额' })
        }

        if (amount < 100) {
            return res.status(400).json({ error: '最低提现金额为 ¥100' })
        }

        const validMethods = ['alipay', 'usdt_trc20', 'usdt_bep20']
        if (!method || !validMethods.includes(method)) {
            return res.status(400).json({ error: '请选择提现方式' })
        }

        // 从已保存的账号中获取对应方式的账号
        const accounts = agent.withdrawAccounts ? JSON.parse(agent.withdrawAccounts) : {}
        const account = accounts[method]
        if (!account) {
            return res.status(400).json({ error: '该提现方式还未保存收款账号' })
        }

        if (parseFloat(agent.balance) < amount) {
            return res.status(400).json({ error: `可提现余额不足，当前余额 ¥${parseFloat(agent.balance).toFixed(2)}` })
        }

        const pendingCount = await prisma.withdrawal.count({
            where: { agentId: agent.id, status: 'PENDING' }
        })
        if (pendingCount > 0) {
            return res.status(400).json({ error: '您有未处理的提现申请，请等待审核完成后再提交' })
        }

        await prisma.$transaction([
            prisma.agent.update({
                where: { id: agent.id },
                data: { balance: { decrement: amount } }
            }),
            prisma.withdrawal.create({
                data: { agentId: agent.id, amount, method, account }
            })
        ])

        res.json({ message: '提现申请已提交，请等待管理员审核' })
    } catch (error) {
        next(error)
    }
}

// 保存收款账号
exports.bindWithdrawAccount = async (req, res, next) => {
    try {
        const { method, account } = req.body
        const validMethods = ['alipay', 'usdt_trc20', 'usdt_bep20']

        if (!method || !validMethods.includes(method)) {
            return res.status(400).json({ error: '请选择有效的提现方式' })
        }
        if (!account || !account.trim()) {
            return res.status(400).json({ error: '请填写收款账号/地址' })
        }

        // 合并到现有 JSON
        const existing = req.agent.withdrawAccounts ? JSON.parse(req.agent.withdrawAccounts) : {}
        existing[method] = account.trim()

        await prisma.agent.update({
            where: { id: req.agent.id },
            data: { withdrawAccounts: JSON.stringify(existing) }
        })

        res.json({ message: '收款账号已保存', withdrawAccounts: existing })
    } catch (error) {
        next(error)
    }
}

// 获取提现记录
exports.getWithdrawals = async (req, res, next) => {
    try {
        const withdrawals = await prisma.withdrawal.findMany({
            where: { agentId: req.agent.id },
            orderBy: { createdAt: 'desc' },
            take: 50
        })

        res.json({
            withdrawals: withdrawals.map(w => ({
                id: w.id,
                amount: parseFloat(w.amount),
                method: w.method,
                account: w.account,
                status: w.status,
                remark: w.remark,
                processedAt: w.processedAt,
                createdAt: w.createdAt
            }))
        })
    } catch (error) {
        next(error)
    }
}

// 获取代理用户列表（从分站注册的用户）
exports.getAgentUsers = async (req, res, next) => {
    try {
        const { page = 1, pageSize = 20, search = '' } = req.query
        const skip = (parseInt(page) - 1) * parseInt(pageSize)
        const take = parseInt(pageSize)

        const where = { referralAgentId: req.agent.id }
        if (search) {
            where.OR = [
                { email: { contains: search } },
                { username: { contains: search } }
            ]
        }

        const today = new Date()
        today.setHours(0, 0, 0, 0)

        const [users, total, todayCount] = await Promise.all([
            prisma.user.findMany({
                where,
                select: {
                    id: true,
                    email: true,
                    username: true,
                    avatar: true,
                    createdAt: true,
                    _count: { select: { orders: true } }
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take
            }),
            prisma.user.count({ where }),
            prisma.user.count({ where: { referralAgentId: req.agent.id, createdAt: { gte: today } } })
        ])

        res.json({
            users,
            total,
            todayCount,
            page: parseInt(page),
            totalPages: Math.ceil(total / take)
        })
    } catch (error) {
        next(error)
    }
}


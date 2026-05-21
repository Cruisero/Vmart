// 管理员代理管理控制器
const prisma = require('../config/database')

// 获取代理列表
exports.getAgents = async (req, res, next) => {
    try {
        const { status, page = 1, limit = 20 } = req.query
        const skip = (parseInt(page) - 1) * parseInt(limit)

        const where = {}
        if (status) where.status = status

        const [agents, total] = await Promise.all([
            prisma.agent.findMany({
                where,
                include: {
                    user: { select: { id: true, email: true, username: true } },
                    _count: { select: { orders: true, products: true } }
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: parseInt(limit)
            }),
            prisma.agent.count({ where })
        ])

        res.json({
            agents: agents.map(a => ({
                id: a.id,
                shopName: a.shopName,
                shopSlug: a.shopSlug,
                shopSkin: a.shopSkin,
                contactEmail: a.contactEmail,
                contactInfo: a.contactInfo,
                applyDescription: a.applyDescription,
                status: a.status,
                balance: parseFloat(a.balance),
                totalEarnings: parseFloat(a.totalEarnings),
                user: a.user,
                orderCount: a._count.orders,
                productCount: a._count.products,
                createdAt: a.createdAt
            })),
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit))
        })
    } catch (error) {
        next(error)
    }
}

// 审核/修改代理状态
exports.updateAgentStatus = async (req, res, next) => {
    try {
        const { id } = req.params
        const { status } = req.body

        if (!['ACTIVE', 'SUSPENDED', 'REJECTED'].includes(status)) {
            return res.status(400).json({ error: '无效的状态' })
        }

        const agent = await prisma.agent.update({
            where: { id },
            data: { status }
        })

        // 如果拒绝，恢复用户角色为 USER
        if (status === 'REJECTED') {
            await prisma.user.update({
                where: { id: agent.userId },
                data: { role: 'USER' }
            })
        }

        res.json({ message: `代理状态已更新为 ${status}`, agent: { id: agent.id, status: agent.status } })
    } catch (error) {
        next(error)
    }
}

// 获取代理订单
exports.getAgentOrders = async (req, res, next) => {
    try {
        const { id } = req.params
        const { page = 1, limit = 20 } = req.query
        const skip = (parseInt(page) - 1) * parseInt(limit)

        const [orders, total] = await Promise.all([
            prisma.agentOrder.findMany({
                where: { agentId: id },
                include: {
                    order: {
                        select: {
                            orderNo: true, productName: true, quantity: true,
                            totalAmount: true, status: true, email: true, createdAt: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: parseInt(limit)
            }),
            prisma.agentOrder.count({ where: { agentId: id } })
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

// 获取提现列表
exports.getWithdrawals = async (req, res, next) => {
    try {
        const { status, page = 1, limit = 20 } = req.query
        const skip = (parseInt(page) - 1) * parseInt(limit)

        const where = {}
        if (status) where.status = status

        const [withdrawals, total] = await Promise.all([
            prisma.withdrawal.findMany({
                where,
                include: {
                    agent: {
                        select: { shopName: true, user: { select: { email: true, username: true } } }
                    }
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: parseInt(limit)
            }),
            prisma.withdrawal.count({ where })
        ])

        res.json({
            withdrawals: withdrawals.map(w => ({
                id: w.id,
                amount: parseFloat(w.amount),
                method: w.method,
                account: w.account,
                status: w.status,
                remark: w.remark,
                agentName: w.agent.shopName,
                agentEmail: w.agent.user.email,
                processedAt: w.processedAt,
                createdAt: w.createdAt
            })),
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit))
        })
    } catch (error) {
        next(error)
    }
}

// 审核提现
exports.processWithdrawal = async (req, res, next) => {
    try {
        const { id } = req.params
        const { status, remark } = req.body

        if (!['APPROVED', 'REJECTED'].includes(status)) {
            return res.status(400).json({ error: '无效的状态' })
        }

        // 使用交互式事务进行悲观加锁，防止多名管理员并发审核或双击产生的重复退款漏洞
        try {
            await prisma.$transaction(async (tx) => {
                // 锁住 Withdrawal 行
                const [lockedWithdrawal] = await tx.$queryRaw`SELECT status, amount, agent_id FROM withdrawals WHERE id = ${id} FOR UPDATE`
                
                if (!lockedWithdrawal) {
                    throw new Error('提现记录不存在')
                }
                if (lockedWithdrawal.status !== 'PENDING') {
                    throw new Error('提现记录已处理')
                }

                if (status === 'REJECTED') {
                    // 拒绝：退回余额
                    await tx.withdrawal.update({
                        where: { id },
                        data: { status: 'REJECTED', remark, processedAt: new Date() }
                    })
                    await tx.agent.update({
                        where: { id: lockedWithdrawal.agent_id },
                        data: { balance: { increment: lockedWithdrawal.amount } }
                    })
                } else {
                    // 通过
                    await tx.withdrawal.update({
                        where: { id },
                        data: { status: 'APPROVED', remark, processedAt: new Date() }
                    })
                }
            })
        } catch (error) {
            if (error.message && (error.message.includes('不存在') || error.message.includes('已处理'))) {
                return res.status(400).json({ error: error.message })
            }
            throw error
        }

        res.json({ message: `提现${status === 'APPROVED' ? '已通过' : '已拒绝'}` })
    } catch (error) {
        next(error)
    }
}

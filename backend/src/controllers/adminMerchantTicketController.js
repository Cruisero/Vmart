/**
 * 平台超管：商户工单管理
 */
const prisma = require('../config/database')

// 超管：获取所有商户工单
exports.list = async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query
        const where = {}
        if (status) where.status = status

        const [tickets, total] = await Promise.all([
            prisma.merchantTicket.findMany({
                where,
                orderBy: { updatedAt: 'desc' },
                skip: (page - 1) * Number(limit),
                take: Number(limit),
                include: {
                    merchant: { include: { shop: { select: { name: true, slug: true } } } },
                    messages: { orderBy: { createdAt: 'desc' }, take: 1, select: { content: true, createdAt: true, senderType: true } }
                }
            }),
            prisma.merchantTicket.count({ where })
        ])

        res.json({ tickets, total })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
}

// 超管：获取工单详情
exports.detail = async (req, res) => {
    try {
        const ticket = await prisma.merchantTicket.findUnique({
            where: { id: req.params.id },
            include: {
                merchant: { include: { shop: { select: { name: true, slug: true } } } },
                messages: { orderBy: { createdAt: 'asc' } }
            }
        })
        if (!ticket) return res.status(404).json({ error: '工单不存在' })
        res.json({ ticket })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
}

// 超管：回复工单
exports.reply = async (req, res) => {
    try {
        const { content, images } = req.body
        if (!content) return res.status(400).json({ error: '内容不能为空' })

        const ticket = await prisma.merchantTicket.findUnique({ where: { id: req.params.id } })
        if (!ticket) return res.status(404).json({ error: '工单不存在' })

        const msg = await prisma.merchantTicketMessage.create({
            data: {
                ticketId: ticket.id,
                senderType: 'ADMIN',
                content,
                images: images || null
            }
        })

        // 更新状态为处理中
        await prisma.merchantTicket.update({
            where: { id: ticket.id },
            data: { status: 'IN_PROGRESS', updatedAt: new Date() }
        })

        res.json({ message: msg })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
}

// 超管：关闭工单
exports.close = async (req, res) => {
    try {
        await prisma.merchantTicket.update({
            where: { id: req.params.id },
            data: { status: 'CLOSED', closedAt: new Date() }
        })
        res.json({ message: '工单已关闭' })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
}

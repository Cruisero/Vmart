/**
 * 商户工单控制器（商户 → 平台客服）
 */
const prisma = require('../config/database')
const { v4: uuid } = require('uuid')

function generateTicketNo() {
    const ts = Date.now().toString(36).toUpperCase()
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase()
    return `MT${ts}${rand}`
}

// 商户：创建工单
exports.create = async (req, res) => {
    try {
        const { subject, content, images } = req.body
        if (!subject || !content) return res.status(400).json({ error: '主题和内容必填' })

        const ticket = await prisma.merchantTicket.create({
            data: {
                ticketNo: generateTicketNo(),
                merchantId: req.merchant.id,
                subject
            }
        })

        await prisma.merchantTicketMessage.create({
            data: {
                ticketId: ticket.id,
                senderType: 'MERCHANT',
                content,
                images: images || null
            }
        })

        // 平台超管通知
        try {
            const manNotify = require('../services/manNotifyService')
            manNotify.notifyNewMerchantTicket(ticket, req.merchant).catch(() => {})
        } catch {}

        res.status(201).json({ ticket })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
}

// 商户：获取自己的工单列表
exports.list = async (req, res) => {
    try {
        const tickets = await prisma.merchantTicket.findMany({
            where: { merchantId: req.merchant.id },
            orderBy: { updatedAt: 'desc' },
            include: {
                messages: { orderBy: { createdAt: 'desc' }, take: 1, select: { content: true, createdAt: true, senderType: true } }
            }
        })
        res.json({ tickets })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
}

// 商户：获取工单详情
exports.detail = async (req, res) => {
    try {
        const ticket = await prisma.merchantTicket.findFirst({
            where: { id: req.params.id, merchantId: req.merchant.id },
            include: {
                messages: { orderBy: { createdAt: 'asc' } }
            }
        })
        if (!ticket) return res.status(404).json({ error: '工单不存在' })
        res.json({ ticket })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
}

// 商户：回复工单
exports.reply = async (req, res) => {
    try {
        const { content, images } = req.body
        if (!content) return res.status(400).json({ error: '内容不能为空' })

        const ticket = await prisma.merchantTicket.findFirst({
            where: { id: req.params.id, merchantId: req.merchant.id }
        })
        if (!ticket) return res.status(404).json({ error: '工单不存在' })
        if (ticket.status === 'CLOSED') return res.status(400).json({ error: '工单已关闭' })

        const msg = await prisma.merchantTicketMessage.create({
            data: {
                ticketId: ticket.id,
                senderType: 'MERCHANT',
                content,
                images: images || null
            }
        })

        // 如果状态是 IN_PROGRESS，保持；如果是 OPEN 也保持
        await prisma.merchantTicket.update({
            where: { id: ticket.id },
            data: { updatedAt: new Date() }
        })

        res.json({ message: msg })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
}


// 商户：重新打开已关闭的工单（关闭后 24 小时内可操作）
exports.reopen = async (req, res) => {
    try {
        const ticket = await prisma.merchantTicket.findFirst({
            where: { id: req.params.id, merchantId: req.merchant.id }
        })
        if (!ticket) return res.status(404).json({ error: '工单不存在' })
        if (ticket.status !== 'CLOSED') return res.status(400).json({ error: '工单未关闭，无需重新打开' })

        // 24 小时限制
        const closedAt = ticket.closedAt ? new Date(ticket.closedAt) : null
        if (!closedAt || Date.now() - closedAt.getTime() > 24 * 60 * 60 * 1000) {
            return res.status(400).json({ error: '工单已关闭超过 24 小时，无法重新打开。请提交新工单。' })
        }

        await prisma.merchantTicket.update({
            where: { id: ticket.id },
            data: { status: 'OPEN', closedAt: null, updatedAt: new Date() }
        })

        res.json({ message: '工单已重新打开' })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
}

// 商户：关闭自己的工单
exports.close = async (req, res) => {
    try {
        const ticket = await prisma.merchantTicket.findFirst({
            where: { id: req.params.id, merchantId: req.merchant.id }
        })
        if (!ticket) return res.status(404).json({ error: '工单不存在' })
        if (ticket.status === 'CLOSED') return res.status(400).json({ error: '工单已关闭' })

        await prisma.merchantTicket.update({
            where: { id: ticket.id },
            data: { status: 'CLOSED', closedAt: new Date(), updatedAt: new Date() }
        })

        res.json({ message: '工单已关闭' })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
}

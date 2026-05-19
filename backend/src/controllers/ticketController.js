const crypto = require('crypto')
const prisma = require('../config/database')
const emailService = require('../services/emailService')

// 生成工单号（日期 + 6位随机hex，避免碰撞）
function generateTicketNo() {
    const now = new Date()
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '')
    const random = crypto.randomBytes(3).toString('hex').toUpperCase()
    return `TK${dateStr}${random}`
}

// 工单类型映射
const ticketTypeLabel = {
    ORDER_ISSUE: '订单问题',
    CARD_ISSUE: '卡密问题',
    REFUND: '退款申请',
    OTHER: '其他'
}

const validTicketStatuses = ['OPEN', 'IN_PROGRESS', 'PENDING_SUPER_ADMIN', 'CLOSED']
const superAdminPreviousStatusSettingKey = 'ticketSuperAdminPreviousStatuses'

function getReadUpdateData(isAdmin) {
    const now = new Date()

    return isAdmin
        ? { adminUnreadCount: 0, adminLastReadAt: now }
        : { userUnreadCount: 0, userLastReadAt: now }
}

async function getSuperAdminPreviousStatusMap() {
    const setting = await prisma.setting.findUnique({
        where: { key: superAdminPreviousStatusSettingKey }
    })

    if (!setting?.value) return {}

    try {
        const parsed = JSON.parse(setting.value)
        return parsed && typeof parsed === 'object' ? parsed : {}
    } catch (error) {
        console.error('解析待超管处理前状态失败:', error)
        return {}
    }
}

async function setSuperAdminPreviousStatus(ticketId, previousStatus) {
    const statusMap = await getSuperAdminPreviousStatusMap()
    statusMap[ticketId] = previousStatus

    await prisma.setting.upsert({
        where: { key: superAdminPreviousStatusSettingKey },
        create: { key: superAdminPreviousStatusSettingKey, value: JSON.stringify(statusMap) },
        update: { value: JSON.stringify(statusMap) }
    })
}

async function clearSuperAdminPreviousStatus(ticketId) {
    const statusMap = await getSuperAdminPreviousStatusMap()
    if (!Object.prototype.hasOwnProperty.call(statusMap, ticketId)) return

    delete statusMap[ticketId]
    await prisma.setting.update({
        where: { key: superAdminPreviousStatusSettingKey },
        data: { value: JSON.stringify(statusMap) }
    })
}

function getUserVisibleStatus(ticket, previousStatusMap) {
    if (ticket.status !== 'PENDING_SUPER_ADMIN') {
        return ticket.status
    }

    const previousStatus = previousStatusMap[ticket.id]
    return validTicketStatuses.includes(previousStatus) && previousStatus !== 'PENDING_SUPER_ADMIN'
        ? previousStatus
        : 'IN_PROGRESS'
}

function maskTicketStatusForUser(ticket, previousStatusMap) {
    return {
        ...ticket,
        status: getUserVisibleStatus(ticket, previousStatusMap),
        internalStatus: ticket.status
    }
}

// ==================== 用户端 API ====================

// 创建工单
exports.createTicket = async (req, res, next) => {
    try {
        const isCustomer = req.user.role === 'CUSTOMER'
        const userId = req.user.id
        const { type, subject, content, orderId, images } = req.body

        if (!type || !subject || !content) {
            return res.status(400).json({ error: '请填写完整信息' })
        }

        // 如果关联订单，验证订单属于该用户
        let orderNo = null
        if (orderId) {
            const order = await prisma.order.findUnique({
                where: { id: orderId }
            })
            const ownsOrder = isCustomer
                ? (order && order.customerId === userId)
                : (order && order.userId === userId)
            if (!order || !ownsOrder) {
                return res.status(400).json({ error: '订单不存在或无权限' })
            }
            orderNo = order.orderNo

            // 检查该订单是否已有未关闭的工单
            const ticketWhere = { orderId, status: { not: 'CLOSED' } }
            if (isCustomer) ticketWhere.customerId = userId
            else ticketWhere.userId = userId
            const existingTicket = await prisma.ticket.findFirst({
                where: ticketWhere,
                select: { id: true, ticketNo: true, subject: true, status: true }
            })
            if (existingTicket) {
                const previousStatusMap = await getSuperAdminPreviousStatusMap()
                return res.status(409).json({
                    error: '该订单已有未关闭的工单，请在原工单中继续沟通',
                    existingTicket: maskTicketStatusForUser(existingTicket, previousStatusMap)
                })
            }
        }

        // 解析 tenantId（CUSTOMER 走 token 里的 tenantId）
        let tenantId = req.tenantId || null
        if (!tenantId && isCustomer && req.user.tenantId) {
            tenantId = req.user.tenantId
        }

        // 创建工单和第一条消息
        const now = new Date()
        const ticket = await prisma.ticket.create({
            data: {
                ticketNo: generateTicketNo(),
                userId: isCustomer ? null : userId,
                customerId: isCustomer ? userId : null,
                tenantId,
                orderId: orderId || null,
                orderNo,
                type,
                subject,
                status: 'OPEN',
                userUnreadCount: 0,
                adminUnreadCount: 1,
                userLastReadAt: now,
                messages: {
                    create: {
                        senderId: userId,
                        isAdmin: false,
                        content,
                        images: images || null
                    }
                }
            },
            include: {
                messages: true
            }
        })

        res.status(201).json({
            message: '工单创建成功',
            ticket
        })

        // 通知管理员（异步，不阻塞响应）
        const { notifyNewTicket } = require('../services/notifyDispatcher')
        notifyNewTicket({ ...ticket, contactEmail: req.user?.email, content }).catch(e => console.error('管理员通知失败:', e))
    } catch (error) {
        console.error('[createTicket] ERROR:', error.message)
        next(error)
    }
}

// 获取我的工单列表
exports.getMyTickets = async (req, res, next) => {
    try {
        const userId = req.user.id
        const isCustomer = req.user.role === 'CUSTOMER'
        const { status } = req.query

        const where = isCustomer ? { customerId: userId } : { userId }

        const tickets = await prisma.ticket.findMany({
            where,
            orderBy: { updatedAt: 'desc' },
            include: {
                messages: {
                    orderBy: { createdAt: 'desc' },
                    take: 1
                },
                _count: {
                    select: { messages: true }
                }
            }
        })

        const previousStatusMap = await getSuperAdminPreviousStatusMap()
        const visibleTickets = tickets
            .map(ticket => maskTicketStatusForUser(ticket, previousStatusMap))
            .filter(ticket => !status || status === 'all' || ticket.status === status)

        res.json({ tickets: visibleTickets })
    } catch (error) {
        next(error)
    }
}

// 获取工单详情
exports.getTicketDetail = async (req, res, next) => {
    try {
        const userId = req.user.id
        const { id } = req.params

        const ticket = await prisma.ticket.findUnique({
            where: { id, ...(req.tenantId ? { tenantId: req.tenantId } : {}) },
            include: {
                user: {
                    select: { id: true, email: true, username: true }
                },
                customer: {
                    select: { id: true, email: true, username: true }
                },
                messages: {
                    orderBy: { createdAt: 'asc' },
                    include: {
                        sender: {
                            select: { id: true, username: true, email: true, role: true }
                        }
                    }
                },
                order: {
                    select: { orderNo: true, productName: true, totalAmount: true, status: true }
                }
            }
        })

        if (!ticket) {
            return res.status(404).json({ error: '工单不存在' })
        }

        // 验证权限
        const isAdminRole = ['ADMIN', 'SUPER_ADMIN', 'TENANT_ADMIN'].includes(req.user.role)
        const isCustomer = req.user.role === 'CUSTOMER'
        if (!isAdminRole && ticket.userId !== userId && !(isCustomer && ticket.customerId === userId)) {
            return res.status(403).json({ error: '无权限查看此工单' })
        }

        const isAdmin = isAdminRole
        const unreadCount = isAdmin ? ticket.adminUnreadCount : ticket.userUnreadCount

        if (unreadCount > 0) {
            const readData = getReadUpdateData(isAdmin)
            await prisma.ticket.update({
                where: { id, ...(req.tenantId ? { tenantId: req.tenantId } : {}) },
                data: readData
            })
            Object.assign(ticket, readData)
        }

        const responseTicket = isAdmin
            ? ticket
            : maskTicketStatusForUser(ticket, await getSuperAdminPreviousStatusMap())

        res.json({ ticket: responseTicket })
    } catch (error) {
        next(error)
    }
}

// 用户发送消息
exports.addMessage = async (req, res, next) => {
    try {
        const userId = req.user.id
        const { id } = req.params
        const { content, images } = req.body

        if (!content) {
            return res.status(400).json({ error: '消息内容不能为空' })
        }

        // 验证工单存在且属于用户
        const ticket = await prisma.ticket.findUnique({
            where: { id, ...(req.tenantId ? { tenantId: req.tenantId } : {}) }
        })

        if (!ticket) {
            return res.status(404).json({ error: '工单不存在' })
        }

        const isCustomer = req.user.role === 'CUSTOMER'
        if (ticket.userId !== userId && !(isCustomer && ticket.customerId === userId)) {
            return res.status(403).json({ error: '无权限操作此工单' })
        }

        // 已关闭超过 24h 不可回复
        if (ticket.status === 'CLOSED') {
            const closedAt = ticket.closedAt ? new Date(ticket.closedAt) : null
            if (!closedAt || Date.now() - closedAt.getTime() > 24 * 60 * 60 * 1000) {
                return res.status(400).json({ error: '工单已关闭超过 24 小时，无法发送消息' })
            }
        }

        // 用户回复已关闭的工单（24h内），自动重新打开为处理中
        const shouldReopen = ticket.status === 'CLOSED' && ticket.closedAt &&
            (Date.now() - new Date(ticket.closedAt).getTime() < 24 * 60 * 60 * 1000)

        const now = new Date()
        const [, message] = await prisma.$transaction([
            prisma.ticket.update({
                where: { id, ...(req.tenantId ? { tenantId: req.tenantId } : {}) },
                data: {
                    updatedAt: now,
                    adminUnreadCount: { increment: 1 },
                    userUnreadCount: 0,
                    userLastReadAt: now,
                    ...(shouldReopen ? { status: 'IN_PROGRESS' } : {})
                }
            }),
            prisma.ticketMessage.create({
                data: {
                    ticketId: id,
                    senderId: userId,
                    isAdmin: false,
                    content,
                    images: images || null
                }
            })
        ])

        res.status(201).json({
            message: '消息发送成功',
            data: message
        })

        // 通知管理员（异步，不阻塞响应）
        const { notifyTicketReply } = require('../services/notifyDispatcher')
        notifyTicketReply(ticket, content, req.user).catch(e => console.error('管理员回复通知失败:', e))
    } catch (error) {
        next(error)
    }
}

// 获取用户订单列表（用于选择关联订单）
exports.getMyOrders = async (req, res, next) => {
    try {
        const userId = req.user.id
        const isCustomer = req.user.role === 'CUSTOMER'

        const where = isCustomer ? { customerId: userId } : { userId }
        const orders = await prisma.order.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                orderNo: true,
                productName: true,
                totalAmount: true,
                status: true,
                createdAt: true
            },
            take: 50
        })

        res.json({ orders })
    } catch (error) {
        next(error)
    }
}

// 用户重新打开工单（关闭后 24 小时内可操作）
exports.reopenMyTicket = async (req, res, next) => {
    try {
        const userId = req.user.id
        const isCustomer = req.user.role === 'CUSTOMER'
        const { id } = req.params

        const ticket = await prisma.ticket.findUnique({
            where: { id, ...(req.tenantId ? { tenantId: req.tenantId } : {}) }
        })

        if (!ticket) {
            return res.status(404).json({ error: '工单不存在' })
        }
        if (ticket.userId !== userId && !(isCustomer && ticket.customerId === userId)) {
            return res.status(403).json({ error: '无权限操作此工单' })
        }
        if (ticket.status !== 'CLOSED') {
            return res.status(400).json({ error: '工单未关闭' })
        }

        const closedAt = ticket.closedAt ? new Date(ticket.closedAt) : null
        if (!closedAt || Date.now() - closedAt.getTime() > 24 * 60 * 60 * 1000) {
            return res.status(400).json({ error: '工单已关闭超过 24 小时，无法重新打开。请提交新工单。' })
        }

        const updated = await prisma.ticket.update({
            where: { id, ...(req.tenantId ? { tenantId: req.tenantId } : {}) },
            data: { status: 'IN_PROGRESS', closedAt: null, updatedAt: new Date() }
        })

        res.json({ message: '工单已重新打开', ticket: updated })
    } catch (error) {
        next(error)
    }
}

// 用户主动关闭工单
exports.closeMyTicket = async (req, res, next) => {
    try {
        const userId = req.user.id
        const isCustomer = req.user.role === 'CUSTOMER'
        const { id } = req.params

        const ticket = await prisma.ticket.findUnique({ where: { id, ...(req.tenantId ? { tenantId: req.tenantId } : {}) } })

        if (!ticket) {
            return res.status(404).json({ error: '工单不存在' })
        }
        if (ticket.userId !== userId && !(isCustomer && ticket.customerId === userId)) {
            return res.status(403).json({ error: '无权限操作此工单' })
        }
        if (ticket.status === 'CLOSED') {
            return res.status(400).json({ error: '工单已关闭' })
        }

        const updated = await prisma.ticket.update({
            where: { id, ...(req.tenantId ? { tenantId: req.tenantId } : {}) },
            data: { status: 'CLOSED', closedAt: new Date() }
        })

        res.json({ message: '工单已关闭', ticket: updated })
    } catch (error) {
        next(error)
    }
}

// ==================== 管理端 API ====================

// 获取所有工单
exports.getAllTickets = async (req, res, next) => {
    try {
        const { status, type, page = 1, limit = 20, noReply } = req.query

        const where = {};
        if (req.tenantId) where.tenantId = req.tenantId;
        if (status && status !== 'all') {
            where.status = status
        }
        if (type && type !== 'all') {
            where.type = type
        }

        // 待回复：最后一条消息来自用户，且工单未关闭
        if (noReply === 'true') {
            where.status = { not: 'CLOSED' }
            const rows = await prisma.$queryRaw`
                SELECT t.id FROM tickets t
                INNER JOIN ticket_messages tm ON tm.id = (
                    SELECT id FROM ticket_messages
                    WHERE ticket_id = t.id
                    ORDER BY created_at DESC
                    LIMIT 1
                )
                WHERE tm.is_admin = 0 AND t.status != 'CLOSED'
            `
            where.id = { in: rows.map(r => r.id) }
        }

        const [tickets, total] = await Promise.all([
            prisma.ticket.findMany({
                where,
                orderBy: { updatedAt: 'desc' },
                skip: (page - 1) * limit,
                take: parseInt(limit),
                include: {
                    user: {
                        select: { id: true, email: true, username: true }
                    },
                    customer: {
                        select: { id: true, email: true, username: true }
                    },
                    messages: {
                        orderBy: { createdAt: 'desc' },
                        take: 1
                    },
                    _count: {
                        select: { messages: true }
                    }
                }
            }),
            prisma.ticket.count({ where })
        ])

        res.json({
            tickets,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        })
    } catch (error) {
        next(error)
    }
}

// 管理员回复工单
exports.adminReply = async (req, res, next) => {
    try {
        const { id } = req.params
        const { content, images, updateStatus } = req.body
        const adminId = req.user.id

        if (!content) {
            return res.status(400).json({ error: '回复内容不能为空' })
        }

        const ticket = await prisma.ticket.findUnique({
            where: { id, ...(req.tenantId ? { tenantId: req.tenantId } : {}) },
            include: {
                user: { select: { email: true, username: true } }
            }
        })

        if (!ticket) {
            return res.status(404).json({ error: '工单不存在' })
        }

        const newStatus = updateStatus || (ticket.status === 'OPEN' ? 'IN_PROGRESS' : ticket.status)
        const now = new Date()
        const [, message] = await prisma.$transaction([
            prisma.ticket.update({
                where: { id, ...(req.tenantId ? { tenantId: req.tenantId } : {}) },
                data: {
                    status: newStatus,
                    updatedAt: now,
                    userUnreadCount: { increment: 1 },
                    adminUnreadCount: 0,
                    adminLastReadAt: now
                }
            }),
            prisma.ticketMessage.create({
                data: {
                    ticketId: id,
                    senderId: adminId,
                    isAdmin: true,
                    content,
                    images: images || null
                }
            })
        ])

        // 发送邮件通知用户
        try {
            await emailService.sendTicketReplyNotification(
                ticket.user.email,
                ticket.user.username || '用户',
                ticket.ticketNo,
                ticket.subject,
                content,
                ticket.tenantId
            )
        } catch (emailError) {
            console.error('发送工单回复邮件失败:', emailError)
            // 不影响主流程
        }

        res.json({
            message: '回复成功',
            data: message
        })
    } catch (error) {
        next(error)
    }
}

// 更新工单状态
exports.updateTicketStatus = async (req, res, next) => {
    try {
        const { id } = req.params
        const { status } = req.body

        if (!validTicketStatuses.includes(status)) {
            return res.status(400).json({ error: '无效的状态' })
        }

        // 先取工单及用户信息，用于通知
        const existing = await prisma.ticket.findUnique({
            where: { id, ...(req.tenantId ? { tenantId: req.tenantId } : {}) },
            include: { user: { select: { email: true, username: true } } }
        })
        if (!existing) {
            return res.status(404).json({ error: '工单不存在' })
        }

        const updateData = { status }
        if (status === 'CLOSED') {
            updateData.closedAt = new Date()
        } else {
            updateData.closedAt = null
        }

        // 状态变更为 CLOSED 时，给用户加未读提醒
        const shouldNotifyUser = status === 'CLOSED' && existing.status !== status
        if (shouldNotifyUser) {
            updateData.userUnreadCount = { increment: 1 }
        }

        if (status === 'PENDING_SUPER_ADMIN' && existing.status !== 'PENDING_SUPER_ADMIN') {
            await setSuperAdminPreviousStatus(id, existing.status)
        } else if (existing.status === 'PENDING_SUPER_ADMIN' && status !== 'PENDING_SUPER_ADMIN') {
            await clearSuperAdminPreviousStatus(id)
        }

        const ticket = await prisma.ticket.update({
            where: { id, ...(req.tenantId ? { tenantId: req.tenantId } : {}) },
            data: updateData
        })

        res.json({
            message: '状态更新成功',
            ticket
        })

        // 异步发邮件通知用户
        if (shouldNotifyUser) {
            emailService.sendTicketStatusNotification(
                existing.user.email,
                existing.user.username || '用户',
                existing.ticketNo,
                existing.subject,
                status,
                existing.tenantId
            ).catch(e => console.error('工单状态通知邮件失败:', e))
        }
    } catch (error) {
        next(error)
    }
}


// 管理员：查看某用户/顾客的历史工单
exports.getUserTicketHistory = async (req, res, next) => {
    try {
        const { userId, customerId, email } = req.query
        if (!userId && !customerId && !email) {
            return res.status(400).json({ error: '请提供 userId / customerId / email' })
        }

        const whereOr = []
        if (userId) whereOr.push({ userId })
        if (customerId) whereOr.push({ customerId })
        // 通过 email 查 customer 和 user
        if (email) {
            const [customers, users] = await Promise.all([
                prisma.customer.findMany({ where: { email, ...(req.tenantId ? { tenantId: req.tenantId } : {}) }, select: { id: true } }),
                prisma.user.findMany({ where: { email }, select: { id: true } })
            ])
            customers.forEach(c => whereOr.push({ customerId: c.id }))
            users.forEach(u => whereOr.push({ userId: u.id }))
        }

        if (whereOr.length === 0) return res.json({ tickets: [] })

        const where = { OR: whereOr }
        if (req.tenantId) where.tenantId = req.tenantId

        const tickets = await prisma.ticket.findMany({
            where,
            orderBy: { updatedAt: 'desc' },
            include: {
                user: { select: { id: true, email: true, username: true } },
                customer: { select: { id: true, email: true, username: true } },
                messages: { orderBy: { createdAt: 'desc' }, take: 1 },
                _count: { select: { messages: true } }
            },
            take: 100
        })

        res.json({ tickets })
    } catch (error) {
        next(error)
    }
}

/**
 * 通知分发器
 * 根据订单/事件的 tenantId 决定使用商户通知配置还是全局配置
 */
const prisma = require('../config/database')
const logger = require('../utils/logger')
const { sendTenantEmail } = require('./tenantEmailService')
const adminNotifyService = require('./adminNotifyService')

/**
 * 获取商户的通知配置
 */
async function getTenantNotifyConfig(tenantId) {
    try {
        const settings = await prisma.tenantSetting.findUnique({ where: { tenantId } })
        if (!settings?.paymentConfig) return null
        const config = JSON.parse(settings.paymentConfig)
        return {
            notifyOrderPaid: config.notify_order_paid !== false,
            notifyShipRemind: config.notify_ship_remind !== false,
            notifyNewTicket: config.notify_new_ticket !== false,
            notifyNewUser: config.notify_new_user || false,
            notifyStockAlert: config.notify_stock_alert !== false,
            notifyOrderCancel: config.notify_order_cancel || false,
            notifyRefund: config.notify_refund !== false,
            notifyEmail: config.notify_email || null
        }
    } catch {
        return null
    }
}

/**
 * 获取商户的收信邮箱
 */
async function getTenantNotifyEmail(tenantId) {
    const config = await getTenantNotifyConfig(tenantId)
    if (config?.notifyEmail) return config.notifyEmail

    // 回退到商户注册邮箱
    const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        include: { user: { select: { email: true } } }
    })
    return tenant?.user?.email || null
}

// 事件到子管理员权限 Key 的映射
const SUB_ADMIN_NOTIFY_PERMISSION_MAP = {
    'notifyOrderPaid': 'notify.order_paid',
    'notifyPendingShip': 'notify.ship_remind',
    'notifyNewTicket': 'notify.new_ticket',
    'notifyNewUser': 'notify.new_user',
    'notifyLowStock': 'notify.stock_alert',
    'notifyOrderCancelled': 'notify.order_cancel',
    'notifyRefund': 'notify.refund'
}

/**
 * 发送通知（自动判断走商户通知还是全局通知）
 */
async function dispatch(eventKey, tenantId, subject, htmlContent) {
    // 如果有 tenantId，走商户通知逻辑
    if (tenantId) {
        const config = await getTenantNotifyConfig(tenantId)
        if (!config) {
            logger.info(`[notifyDispatcher] 租户 ${tenantId} 无通知配置，跳过`)
            return
        }

        // 检查该事件是否开启
        const eventMap = {
            'notifyOrderPaid': config.notifyOrderPaid,
            'notifyPendingShip': config.notifyShipRemind,
            'notifyNewTicket': config.notifyNewTicket,
            'notifyNewUser': config.notifyNewUser,
            'notifyLowStock': config.notifyStockAlert,
            'notifyOrderCancelled': config.notifyOrderCancel,
            'notifyRefund': config.notifyRefund,
        }

        // 查找该商户下处于激活状态的子管理员
        const subAdmins = await prisma.user.findMany({
            where: {
                tenantId,
                role: 'ADMIN',
                status: 'ACTIVE'
            },
            select: {
                email: true,
                permissions: true
            }
        })

        const subAdminEmails = []
        const requiredPerm = SUB_ADMIN_NOTIFY_PERMISSION_MAP[eventKey]
        if (requiredPerm) {
            subAdmins.forEach(admin => {
                try {
                    const perms = admin.permissions ? JSON.parse(admin.permissions) : {}
                    if (perms[requiredPerm] === true) {
                        subAdminEmails.push(admin.email)
                    }
                } catch {}
            })
        }

        // 收集所有需要发送的邮箱地址
        const recipients = []

        // 1. 如果店铺级的全局通知开关已开启，添加商户主接收邮箱
        if (eventMap[eventKey]) {
            const toEmail = await getTenantNotifyEmail(tenantId)
            if (toEmail) recipients.push(toEmail)
        }

        // 2. 添加匹配的子管理员邮箱
        subAdminEmails.forEach(email => {
            if (email) recipients.push(email)
        })

        // 去重
        const uniqueRecipients = [...new Set(recipients)]

        if (uniqueRecipients.length === 0) {
            logger.info(`[notifyDispatcher] 租户 ${tenantId} 事件 ${eventKey} 没有接收人，跳过`)
            return
        }

        // 循环向各接收人发送通知邮件（防止邮箱信息泄露）
        for (const recipient of uniqueRecipients) {
            try {
                await sendTenantEmail(tenantId, { to: recipient, subject, html: htmlContent })
            } catch (err) {
                logger.error(`[notifyDispatcher] 发送通知给 ${recipient} 失败:`, err)
            }
        }
        return
    }

    // 无 tenantId，走全局通知（旧逻辑）
    return adminNotifyService.sendAdminNotification(eventKey, subject, htmlContent)
}

/**
 * 通知：订单支付成功
 */
async function notifyOrderPaid(order) {
    const subject = `订单支付成功 - ${order.orderNo}`
    const html = `<h3 style="color:#10b981;">💰 收到新订单付款</h3>
        <p>订单号：<strong>${order.orderNo}</strong></p>
        <p>商品：${order.productName || '—'} × ${order.quantity || 1}</p>
        <p>金额：<strong style="color:#ef4444;">¥${order.totalAmount}</strong></p>
        <p>客户邮箱：${order.email || '—'}</p>`
    return dispatch('notifyOrderPaid', order.tenantId, subject, html)
}

/**
 * 通知：待手动发货
 */
async function notifyPendingShip(order) {
    const subject = `⚡ 待发货 - ${order.orderNo}`
    const html = `<h3 style="color:#f59e0b;">📦 订单已支付，等待手动发货</h3>
        <p style="color:#92400e;background:#fffbeb;padding:10px;border-radius:6px;">该订单无可用卡密，需要手动发货！</p>
        <p>订单号：<strong>${order.orderNo}</strong></p>
        <p>商品：${order.productName || '—'} × ${order.quantity || 1}</p>
        <p>金额：¥${order.totalAmount}</p>
        <p>客户邮箱：${order.email || '—'}</p>`
    return dispatch('notifyPendingShip', order.tenantId, subject, html)
}

/**
 * 通知：新工单
 */
async function notifyNewTicket(ticket, tenantId) {
    const tId = tenantId || ticket.tenantId
    const subject = `新工单 - ${ticket.ticketNo || ticket.id}`
    const html = `<h3 style="color:#f59e0b;">🎫 收到新工单</h3>
        <p>工单号：${ticket.ticketNo || ticket.id}</p>
        <p>主题：<strong>${ticket.subject}</strong></p>
        <p>类型：${ticket.type}</p>`
    return dispatch('notifyNewTicket', tId, subject, html)
}

/**
 * 通知：库存不足
 */
async function notifyLowStock(product) {
    const subject = `库存预警 - ${product.name}`
    const html = `<h3 style="color:#ef4444;">⚠️ 商品库存不足</h3>
        <p>商品：<strong>${product.name}</strong></p>
        <p>当前库存：<strong style="color:#ef4444;">0 件</strong></p>
        <p>请及时补充库存！</p>`
    return dispatch('notifyLowStock', product.tenantId, subject, html)
}

/**
 * 通知：订单取消
 */
async function notifyOrderCancelled(order, reason = '超时未支付') {
    const subject = `订单取消 - ${order.orderNo}`
    const html = `<h3 style="color:#94a3b8;">🚫 订单已取消</h3>
        <p>订单号：${order.orderNo}</p>
        <p>商品：${order.productName || '—'}</p>
        <p>金额：¥${order.totalAmount}</p>
        <p>原因：${reason}</p>`
    return dispatch('notifyOrderCancelled', order.tenantId, subject, html)
}

/**
 * 通知：新用户注册
 */
async function notifyNewUser(user) {
    if (user.tenantId) {
        const subject = `新用户注册 - ${user.username || user.email}`
        const html = `<h3 style="color:#3b82f6;">👤 新用户注册成功</h3>
            <p>用户名：<strong>${user.username || '—'}</strong></p>
            <p>邮箱：${user.email}</p>
            <p>注册时间：${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}</p>`
        return dispatch('notifyNewUser', user.tenantId, subject, html)
    }
    // 新用户注册走全局通知（用户还没有 tenantId）
    return adminNotifyService.notifyNewUser(user)
}

/**
 * 通知：订单已成功退款
 */
async function notifyRefund(order) {
    const subject = `订单已退款 - ${order.orderNo}`
    const html = `<h3 style="color:#64748b;">💸 订单已成功退款</h3>
        <p>订单号：<strong>${order.orderNo}</strong></p>
        <p>商品：${order.productName || '—'} × ${order.quantity || 1}</p>
        <p>退款金额：<strong style="color:#ef4444;">¥${order.totalAmount}</strong></p>
        <p>客户邮箱：${order.email || '—'}</p>`
    return dispatch('notifyRefund', order.tenantId, subject, html)
}

/**
 * 通知：工单新回复
 */
async function notifyTicketReply(ticket, message, user) {
    // 走全局通知（工单系统暂不按租户隔离）
    return adminNotifyService.notifyTicketReply(ticket, message, user)
}

module.exports = {
    notifyOrderPaid,
    notifyPendingShip,
    notifyNewTicket,
    notifyLowStock,
    notifyOrderCancelled,
    notifyNewUser,
    notifyTicketReply,
    notifyRefund,
    dispatch
}

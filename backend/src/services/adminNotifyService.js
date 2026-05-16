const prisma = require('../config/database')
const { createTransporter, getEmailConfig } = require('./emailService')

// 通知事件类型
const NOTIFICATION_EVENTS = {
    ORDER_PAID: 'notifyOrderPaid',           // 订单支付成功
    PENDING_SHIP: 'notifyPendingShip',       // 待手动发货
    NEW_TICKET: 'notifyNewTicket',           // 新工单创建
    NEW_USER: 'notifyNewUser',               // 新用户注册
    LOW_STOCK: 'notifyLowStock',             // 库存不足
    ORDER_CANCELLED: 'notifyOrderCancelled', // 订单取消
}

const ADMIN_NOTIFICATION_CONFIG_KEY = 'adminEmailNotificationConfigs'

/**
 * 获取管理员通知设置
 */
async function getNotifySettings() {
    try {
        const settings = await prisma.setting.findMany({
            where: {
                key: {
                    in: [
                        'adminNotifyEmail',
                        ADMIN_NOTIFICATION_CONFIG_KEY,
                        ...Object.values(NOTIFICATION_EVENTS)
                    ]
                }
            }
        })
        const map = {}
        settings.forEach(s => { map[s.key] = s.value })
        return map
    } catch (error) {
        console.error('获取通知设置失败:', error)
        return {}
    }
}

function parseAdminEmailConfigs(value) {
    if (!value) return []

    try {
        const configs = JSON.parse(value)
        if (!Array.isArray(configs)) return []

        return configs
            .filter(config => config && config.email)
            .map(config => ({
                userId: config.userId || null,
                email: String(config.email).trim(),
                enabled: config.enabled !== false,
                events: Array.isArray(config.events) ? config.events : []
            }))
            .filter(config => config.email)
    } catch (error) {
        console.error('解析管理员邮箱通知配置失败:', error)
        return []
    }
}

/**
 * 发送管理员通知邮件
 */
async function sendAdminNotification(eventKey, subject, htmlContent) {
    try {
        const settings = await getNotifySettings()

        // 检查功能是否开启
        if (settings[eventKey] !== 'true') {
            return { success: false, reason: '该通知事件未开启' }
        }

        const configuredRecipients = parseAdminEmailConfigs(settings[ADMIN_NOTIFICATION_CONFIG_KEY])
            .filter(config => config.enabled && config.events.includes(eventKey))
            .map(config => config.email)

        const recipients = configuredRecipients.length > 0
            ? configuredRecipients
            : (settings.adminNotifyEmail ? [settings.adminNotifyEmail] : [])

        if (recipients.length === 0) {
            return { success: false, reason: '未设置管理员收信邮箱' }
        }

        const emailConfig = await getEmailConfig()
        if (!emailConfig.smtpHost) {
            return { success: false, reason: 'SMTP 未配置' }
        }

        const transporter = await createTransporter()

        await transporter.sendMail({
            from: `"${emailConfig.senderName || 'HaoDongXi'}" <${emailConfig.smtpUser}>`,
            to: [...new Set(recipients)].join(','),
            subject: `[HaoDongXi] ${subject}`,
            html: wrapEmailTemplate(subject, htmlContent)
        })

        console.log(`管理员通知已发送: ${eventKey} -> ${recipients.join(',')}`)
        return { success: true }
    } catch (error) {
        console.error(`管理员通知发送失败 (${eventKey}):`, error.message)
        return { success: false, error: error.message }
    }
}

/**
 * 通知：订单支付成功
 */
async function notifyOrderPaid(order) {
    const subject = `订单支付成功 - ${order.orderNo}`
    const html = `
        <div style="margin-bottom:20px;">
            <h3 style="color:#10b981;margin:0 0 16px;">💰 收到新订单付款</h3>
            <table style="width:100%;border-collapse:collapse;">
                <tr><td style="padding:8px 12px;color:#64748b;border-bottom:1px solid #f1f5f9;">订单号</td><td style="padding:8px 12px;font-weight:600;border-bottom:1px solid #f1f5f9;font-family:monospace;">${order.orderNo}</td></tr>
                <tr><td style="padding:8px 12px;color:#64748b;border-bottom:1px solid #f1f5f9;">商品名称</td><td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;">${order.productName || '—'}</td></tr>
                <tr><td style="padding:8px 12px;color:#64748b;border-bottom:1px solid #f1f5f9;">数量</td><td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;">${order.quantity || 1}</td></tr>
                <tr><td style="padding:8px 12px;color:#64748b;border-bottom:1px solid #f1f5f9;">支付金额</td><td style="padding:8px 12px;font-weight:700;color:#ef4444;border-bottom:1px solid #f1f5f9;">¥${order.totalAmount}</td></tr>
                <tr><td style="padding:8px 12px;color:#64748b;border-bottom:1px solid #f1f5f9;">支付方式</td><td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;">${order.paymentMethod || '—'}</td></tr>
                <tr><td style="padding:8px 12px;color:#64748b;">客户邮箱</td><td style="padding:8px 12px;">${order.email || '—'}</td></tr>
            </table>
        </div>
    `
    return sendAdminNotification(NOTIFICATION_EVENTS.ORDER_PAID, subject, html)
}

/**
 * 通知：订单已支付，等待手动发货
 */
async function notifyPendingShip(order) {
    const subject = `⚡ 待发货 - ${order.orderNo}`
    const html = `
        <div style="margin-bottom:20px;">
            <h3 style="color:#f59e0b;margin:0 0 16px;">📦 订单已支付，等待手动发货</h3>
            <div style="padding:12px 16px;background:#fffbeb;border-radius:8px;border-left:3px solid #f59e0b;margin-bottom:16px;">
                <p style="margin:0;color:#92400e;font-size:14px;font-weight:500;">该订单无可用卡密自动发放，需要管理员手动发货！</p>
            </div>
            <table style="width:100%;border-collapse:collapse;">
                <tr><td style="padding:8px 12px;color:#64748b;border-bottom:1px solid #f1f5f9;">订单号</td><td style="padding:8px 12px;font-weight:600;border-bottom:1px solid #f1f5f9;font-family:monospace;">${order.orderNo}</td></tr>
                <tr><td style="padding:8px 12px;color:#64748b;border-bottom:1px solid #f1f5f9;">商品名称</td><td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;">${order.productName || '—'}</td></tr>
                <tr><td style="padding:8px 12px;color:#64748b;border-bottom:1px solid #f1f5f9;">数量</td><td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;">${order.quantity || 1}</td></tr>
                <tr><td style="padding:8px 12px;color:#64748b;border-bottom:1px solid #f1f5f9;">支付金额</td><td style="padding:8px 12px;font-weight:700;color:#ef4444;border-bottom:1px solid #f1f5f9;">¥${order.totalAmount}</td></tr>
                <tr><td style="padding:8px 12px;color:#64748b;">客户邮箱</td><td style="padding:8px 12px;">${order.email || '—'}</td></tr>
            </table>
        </div>
    `
    return sendAdminNotification(NOTIFICATION_EVENTS.PENDING_SHIP, subject, html)
}

/**
 * 通知：新工单创建
 */
async function notifyNewTicket(ticket) {
    const typeLabels = {
        ORDER_ISSUE: '订单问题',
        CARD_ISSUE: '卡密问题',
        REFUND: '退款申请',
        OTHER: '其他'
    }
    const subject = `新工单 - ${ticket.ticketNo || ticket.id}`
    const html = `
        <div style="margin-bottom:20px;">
            <h3 style="color:#f59e0b;margin:0 0 16px;">🎫 收到新工单</h3>
            <table style="width:100%;border-collapse:collapse;">
                <tr><td style="padding:8px 12px;color:#64748b;border-bottom:1px solid #f1f5f9;">工单号</td><td style="padding:8px 12px;font-family:monospace;border-bottom:1px solid #f1f5f9;">${ticket.ticketNo || ticket.id}</td></tr>
                <tr><td style="padding:8px 12px;color:#64748b;border-bottom:1px solid #f1f5f9;">类型</td><td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;">${typeLabels[ticket.type] || ticket.type}</td></tr>
                <tr><td style="padding:8px 12px;color:#64748b;border-bottom:1px solid #f1f5f9;">主题</td><td style="padding:8px 12px;font-weight:600;border-bottom:1px solid #f1f5f9;">${ticket.subject}</td></tr>
                <tr><td style="padding:8px 12px;color:#64748b;border-bottom:1px solid #f1f5f9;">提交者</td><td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;">${ticket.contactEmail || ticket.user?.email || '—'}</td></tr>
                <tr><td style="padding:8px 12px;color:#64748b;">关联订单</td><td style="padding:8px 12px;">${ticket.orderNo || '无'}</td></tr>
            </table>
            <div style="margin-top:16px;padding:12px 16px;background:#f8fafc;border-radius:8px;border-left:3px solid #f59e0b;">
                <p style="margin:0;font-size:13px;color:#64748b;">问题描述：</p>
                <p style="margin:8px 0 0;color:#334155;">${ticket.content?.substring(0, 200) || '—'}${ticket.content?.length > 200 ? '...' : ''}</p>
            </div>
        </div>
    `
    return sendAdminNotification(NOTIFICATION_EVENTS.NEW_TICKET, subject, html)
}

/**
 * 通知：新用户注册
 */
async function notifyNewUser(user) {
    const subject = `新用户注册 - ${user.username}`
    const html = `
        <div style="margin-bottom:20px;">
            <h3 style="color:#3b82f6;margin:0 0 16px;">👤 新用户注册</h3>
            <table style="width:100%;border-collapse:collapse;">
                <tr><td style="padding:8px 12px;color:#64748b;border-bottom:1px solid #f1f5f9;">用户名</td><td style="padding:8px 12px;font-weight:600;border-bottom:1px solid #f1f5f9;">${user.username}</td></tr>
                <tr><td style="padding:8px 12px;color:#64748b;">邮箱</td><td style="padding:8px 12px;">${user.email}</td></tr>
            </table>
        </div>
    `
    return sendAdminNotification(NOTIFICATION_EVENTS.NEW_USER, subject, html)
}

/**
 * 通知：库存不足
 */
async function notifyLowStock(product, remainingStock) {
    const subject = `库存预警 - ${product.name}`
    const html = `
        <div style="margin-bottom:20px;">
            <h3 style="color:#ef4444;margin:0 0 16px;">⚠️ 商品库存不足</h3>
            <table style="width:100%;border-collapse:collapse;">
                <tr><td style="padding:8px 12px;color:#64748b;border-bottom:1px solid #f1f5f9;">商品名称</td><td style="padding:8px 12px;font-weight:600;border-bottom:1px solid #f1f5f9;">${product.name}</td></tr>
                <tr><td style="padding:8px 12px;color:#64748b;border-bottom:1px solid #f1f5f9;">当前库存</td><td style="padding:8px 12px;font-weight:700;color:#ef4444;border-bottom:1px solid #f1f5f9;">${remainingStock} 件</td></tr>
                <tr><td style="padding:8px 12px;color:#64748b;">售价</td><td style="padding:8px 12px;">¥${product.price}</td></tr>
            </table>
            <p style="margin-top:16px;padding:12px 16px;background:#fef2f2;border-radius:8px;color:#991b1b;font-size:14px;">
                请及时补充库存，避免影响销售！
            </p>
        </div>
    `
    return sendAdminNotification(NOTIFICATION_EVENTS.LOW_STOCK, subject, html)
}

/**
 * 通知：订单取消
 */
async function notifyOrderCancelled(order, reason = '超时未支付') {
    const subject = `订单取消 - ${order.orderNo}`
    const html = `
        <div style="margin-bottom:20px;">
            <h3 style="color:#94a3b8;margin:0 0 16px;">📦 订单已取消</h3>
            <table style="width:100%;border-collapse:collapse;">
                <tr><td style="padding:8px 12px;color:#64748b;border-bottom:1px solid #f1f5f9;">订单号</td><td style="padding:8px 12px;font-family:monospace;border-bottom:1px solid #f1f5f9;">${order.orderNo}</td></tr>
                <tr><td style="padding:8px 12px;color:#64748b;border-bottom:1px solid #f1f5f9;">商品</td><td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;">${order.productName || '—'}</td></tr>
                <tr><td style="padding:8px 12px;color:#64748b;border-bottom:1px solid #f1f5f9;">金额</td><td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;">¥${order.totalAmount}</td></tr>
                <tr><td style="padding:8px 12px;color:#64748b;">取消原因</td><td style="padding:8px 12px;">${reason}</td></tr>
            </table>
        </div>
    `
    return sendAdminNotification(NOTIFICATION_EVENTS.ORDER_CANCELLED, subject, html)
}

/**
 * 通知：工单有新回复
 */
async function notifyTicketReply(ticket, message, user) {
    const subject = `工单新回复 - ${ticket.ticketNo || ticket.id}`
    const html = `
        <div style="margin-bottom:20px;">
            <h3 style="color:#0ea5e9;margin:0 0 16px;">💬 收到工单新回复</h3>
            <table style="width:100%;border-collapse:collapse;">
                <tr><td style="padding:8px 12px;color:#64748b;border-bottom:1px solid #f1f5f9;">工单号</td><td style="padding:8px 12px;font-family:monospace;border-bottom:1px solid #f1f5f9;">${ticket.ticketNo || ticket.id}</td></tr>
                <tr><td style="padding:8px 12px;color:#64748b;border-bottom:1px solid #f1f5f9;">主题</td><td style="padding:8px 12px;font-weight:600;border-bottom:1px solid #f1f5f9;">${ticket.subject}</td></tr>
                <tr><td style="padding:8px 12px;color:#64748b;border-bottom:1px solid #f1f5f9;">回复用户</td><td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;">${user?.email || '—'}</td></tr>
            </table>
            <div style="margin-top:16px;padding:12px 16px;background:#f0f9ff;border-radius:8px;border-left:3px solid #0ea5e9;">
                <p style="margin:0;font-size:13px;color:#64748b;">回复内容：</p>
                <p style="margin:8px 0 0;color:#334155;">${message?.substring(0, 200) || '—'}${message?.length > 200 ? '...' : ''}</p>
            </div>
        </div>
    `
    // 使用 NEW_TICKET 开关统一控制工单的通知
    return sendAdminNotification(NOTIFICATION_EVENTS.NEW_TICKET, subject, html)
}

/**
 * 邮件模板包装
 */
function wrapEmailTemplate(title, content) {
    return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"></head>
    <body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
        <div style="max-width:560px;margin:24px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
            <div style="background:linear-gradient(135deg,#1e293b 0%,#334155 100%);padding:24px 32px;">
                <h2 style="margin:0;color:#fff;font-size:18px;">🔔 ${title}</h2>
                <p style="margin:8px 0 0;color:rgba(255,255,255,0.6);font-size:13px;">${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}</p>
            </div>
            <div style="padding:28px 32px;">
                ${content}
            </div>
            <div style="padding:16px 32px;background:#f8fafc;border-top:1px solid #f1f5f9;text-align:center;">
                <p style="margin:0;font-size:12px;color:#94a3b8;">此通知由 HaoDongXi 系统自动发送</p>
            </div>
        </div>
    </body>
    </html>`
}

module.exports = {
    NOTIFICATION_EVENTS,
    notifyOrderPaid,
    notifyPendingShip,
    notifyNewTicket,
    notifyNewUser,
    notifyLowStock,
    notifyOrderCancelled,
    notifyTicketReply,
    sendAdminNotification
}

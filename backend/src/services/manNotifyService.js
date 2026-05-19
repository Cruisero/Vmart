/**
 * 平台超管通知服务
 * 通过平台 SMTP 给超管邮箱列表发送事件通知
 * 不消耗任何租户额度
 */
const nodemailer = require('nodemailer')
const prisma = require('../config/database')
const logger = require('../utils/logger')
const { getPlatformSmtp } = require('./tenantEmailService')

const NOTIFY_CONFIG_KEY = 'man_notify_config'

const DEFAULT_CONFIG = {
    enabled: true,
    recipients: [], // 多个超管邮箱
    events: {
        newMerchant: true,
        planOrderPaid: true,
        emailPackPaid: true,
        riskHit: true,
        newMerchantTicket: true,
        merchantSuspended: false,
        dailyGmvReport: false
    }
}

const EVENT_LABELS = {
    newMerchant: '新商户注册',
    planOrderPaid: '套餐订单付款',
    emailPackPaid: '邮件资源包付款',
    riskHit: '违禁词命中告警',
    newMerchantTicket: '新商户工单',
    merchantSuspended: '商户冻结/解冻',
    dailyGmvReport: '每日 GMV 报表'
}

async function getNotifyConfig() {
    try {
        const setting = await prisma.platformSetting.findUnique({ where: { key: NOTIFY_CONFIG_KEY } })
        if (!setting?.value) return { ...DEFAULT_CONFIG }
        const parsed = JSON.parse(setting.value)
        return {
            ...DEFAULT_CONFIG,
            ...parsed,
            events: { ...DEFAULT_CONFIG.events, ...(parsed.events || {}) },
            recipients: Array.isArray(parsed.recipients) ? parsed.recipients : []
        }
    } catch {
        return { ...DEFAULT_CONFIG }
    }
}

async function saveNotifyConfig(config) {
    const cleaned = {
        enabled: !!config.enabled,
        recipients: (config.recipients || []).map(s => String(s).trim()).filter(Boolean),
        events: {}
    }
    Object.keys(DEFAULT_CONFIG.events).forEach(k => {
        cleaned.events[k] = !!config.events?.[k]
    })
    await prisma.platformSetting.upsert({
        where: { key: NOTIFY_CONFIG_KEY },
        create: { key: NOTIFY_CONFIG_KEY, value: JSON.stringify(cleaned), description: '平台超管通知设置' },
        update: { value: JSON.stringify(cleaned) }
    })
    return cleaned
}

/**
 * 发送平台通知邮件
 * @param {string} eventKey - 事件 key (newMerchant / planOrderPaid 等)
 * @param {string} subject - 邮件主题
 * @param {string} html - 邮件内容
 */
async function sendManNotify(eventKey, subject, html) {
    try {
        const config = await getNotifyConfig()
        if (!config.enabled) return { success: false, reason: 'disabled' }
        if (!config.events[eventKey]) return { success: false, reason: 'event_disabled' }
        if (config.recipients.length === 0) {
            logger.warn('[manNotify] 未配置收信邮箱，跳过')
            return { success: false, reason: 'no_recipients' }
        }

        const smtp = await getPlatformSmtp()
        if (!smtp) {
            logger.warn('[manNotify] 平台 SMTP 未配置')
            return { success: false, reason: 'smtp_not_configured' }
        }

        const transporter = nodemailer.createTransport({
            host: smtp.host,
            port: smtp.port,
            secure: smtp.port === 465,
            auth: { user: smtp.user, pass: smtp.pass }
        })

        await transporter.sendMail({
            from: `"Vmart 平台" <${smtp.from}>`,
            to: config.recipients.join(','),
            subject: `[Vmart] ${subject}`,
            html: wrapTemplate(subject, html)
        })

        logger.info(`[manNotify] 发送成功: ${eventKey} → ${config.recipients.join(',')}`)
        return { success: true }
    } catch (e) {
        logger.error('[manNotify] 发送失败:', e.message)
        return { success: false, error: e.message }
    }
}

function wrapTemplate(title, body) {
    return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f1f5f9; margin: 0; padding: 30px 15px;">
    <div style="max-width: 580px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 30px rgba(0,0,0,0.08);">
        <div style="background: linear-gradient(135deg, #0ea5e9, #14b8a6); padding: 28px 26px; color: #fff;">
            <div style="font-size: 0.78rem; opacity: 0.85; letter-spacing: 1px;">VMART · 平台通知</div>
            <h1 style="margin: 6px 0 0; font-size: 1.2rem;">${title}</h1>
        </div>
        <div style="padding: 26px; color: #334155; font-size: 0.92rem; line-height: 1.7;">
            ${body}
        </div>
        <div style="padding: 16px 26px; background: #f8fafc; color: #94a3b8; font-size: 0.72rem; text-align: center; border-top: 1px solid #e2e8f0;">
            此邮件由 Vmart 平台系统自动发送 · ${new Date().toLocaleString('zh-CN')}
        </div>
    </div>
</body></html>`
}

// ─── 业务事件辅助方法 ─────────────────────────────────────

async function notifyNewMerchant(merchant) {
    const html = `
        <p><strong>新商户已注册：</strong></p>
        <table style="width: 100%; border-collapse: collapse; margin-top: 12px;">
            <tr><td style="padding: 6px 0; color: #64748b; width: 80px;">邮箱</td><td><strong>${merchant.email}</strong></td></tr>
            <tr><td style="padding: 6px 0; color: #64748b;">店铺名</td><td>${merchant.shopName || '—'}</td></tr>
            <tr><td style="padding: 6px 0; color: #64748b;">注册时间</td><td>${new Date().toLocaleString('zh-CN')}</td></tr>
        </table>
    `
    return sendManNotify('newMerchant', `新商户注册：${merchant.email}`, html)
}

async function notifyPlanOrderPaid(planOrder, merchant) {
    const html = `
        <p><strong>套餐订单已付款：</strong></p>
        <table style="width: 100%; border-collapse: collapse; margin-top: 12px;">
            <tr><td style="padding: 6px 0; color: #64748b; width: 80px;">商户</td><td>${merchant?.email || '—'}</td></tr>
            <tr><td style="padding: 6px 0; color: #64748b;">套餐</td><td><strong>${planOrder.plan} × ${planOrder.months} 个月</strong></td></tr>
            <tr><td style="padding: 6px 0; color: #64748b;">金额</td><td style="color: #ef4444; font-weight: 700;">¥${planOrder.amount}</td></tr>
            <tr><td style="padding: 6px 0; color: #64748b;">支付方式</td><td>${planOrder.paymentMethod}</td></tr>
            <tr><td style="padding: 6px 0; color: #64748b;">交易号</td><td><code>${planOrder.tradeNo || '—'}</code></td></tr>
        </table>
    `
    return sendManNotify('planOrderPaid', `套餐订单付款：${planOrder.plan} ¥${planOrder.amount}`, html)
}

async function notifyEmailPackPaid(order, count, tenant) {
    const html = `
        <p><strong>邮件资源包已付款：</strong></p>
        <table style="width: 100%; border-collapse: collapse; margin-top: 12px;">
            <tr><td style="padding: 6px 0; color: #64748b; width: 80px;">商户</td><td>${tenant?.shopName || '—'}（${tenant?.user?.email || '—'}）</td></tr>
            <tr><td style="padding: 6px 0; color: #64748b;">数量</td><td><strong>${count.toLocaleString()} 封</strong></td></tr>
            <tr><td style="padding: 6px 0; color: #64748b;">金额</td><td style="color: #ef4444; font-weight: 700;">¥${order.totalAmount}</td></tr>
            <tr><td style="padding: 6px 0; color: #64748b;">订单号</td><td><code>${order.orderNo}</code></td></tr>
        </table>
    `
    return sendManNotify('emailPackPaid', `邮件资源包付款：${count} 封 ¥${order.totalAmount}`, html)
}

async function notifyRiskHit(order, hits, tenant) {
    const html = `
        <p style="color: #ef4444;"><strong>🚩 检测到违禁词命中订单：</strong></p>
        <table style="width: 100%; border-collapse: collapse; margin-top: 12px;">
            <tr><td style="padding: 6px 0; color: #64748b; width: 80px;">订单号</td><td><code>${order.orderNo}</code></td></tr>
            <tr><td style="padding: 6px 0; color: #64748b;">商户</td><td>${tenant?.shopName || '—'}（${tenant?.shopSlug || '—'}）</td></tr>
            <tr><td style="padding: 6px 0; color: #64748b;">商品</td><td>${order.productName}</td></tr>
            <tr><td style="padding: 6px 0; color: #64748b;">金额</td><td>¥${order.totalAmount}</td></tr>
            <tr><td style="padding: 6px 0; color: #64748b;">命中</td><td style="color: #dc2626; font-weight: 700;">${hits.join('、')}</td></tr>
            <tr><td style="padding: 6px 0; color: #64748b;">买家</td><td>${order.email || '—'}</td></tr>
        </table>
        <p style="margin-top: 14px; color: #64748b; font-size: 0.85rem;">请尽快前往 /Man/shop-orders 审核处理。</p>
    `
    return sendManNotify('riskHit', `🚩 违禁词命中：${hits.join('、')}`, html)
}

async function notifyNewMerchantTicket(ticket, merchant) {
    const html = `
        <p><strong>新商户工单：</strong></p>
        <table style="width: 100%; border-collapse: collapse; margin-top: 12px;">
            <tr><td style="padding: 6px 0; color: #64748b; width: 80px;">商户</td><td>${merchant?.email || '—'}</td></tr>
            <tr><td style="padding: 6px 0; color: #64748b;">主题</td><td><strong>${ticket.subject}</strong></td></tr>
            <tr><td style="padding: 6px 0; color: #64748b;">工单号</td><td><code>${ticket.ticketNo || ticket.id}</code></td></tr>
        </table>
    `
    return sendManNotify('newMerchantTicket', `新商户工单：${ticket.subject}`, html)
}

async function notifyMerchantSuspended(tenant, action, reason) {
    const html = `
        <p><strong>商户状态变更：${action === 'suspend' ? '冻结' : '解冻'}</strong></p>
        <table style="width: 100%; border-collapse: collapse; margin-top: 12px;">
            <tr><td style="padding: 6px 0; color: #64748b; width: 80px;">店铺</td><td>${tenant?.shopName || '—'}（${tenant?.shopSlug || '—'}）</td></tr>
            ${reason ? `<tr><td style="padding: 6px 0; color: #64748b;">原因</td><td>${reason}</td></tr>` : ''}
            <tr><td style="padding: 6px 0; color: #64748b;">操作时间</td><td>${new Date().toLocaleString('zh-CN')}</td></tr>
        </table>
    `
    return sendManNotify('merchantSuspended', `商户${action === 'suspend' ? '已冻结' : '已解冻'}：${tenant?.shopName}`, html)
}

async function notifyDailyGmvReport({ date, gmv, orders, refunds, newMerchants }) {
    const html = `
        <p><strong>每日 GMV 报表：${date}</strong></p>
        <table style="width: 100%; border-collapse: collapse; margin-top: 12px;">
            <tr><td style="padding: 8px 0; color: #64748b; width: 100px;">总 GMV</td><td style="font-size: 1.2rem; color: #ef4444; font-weight: 700;">¥${gmv.toFixed(2)}</td></tr>
            <tr><td style="padding: 8px 0; color: #64748b;">订单数</td><td>${orders}</td></tr>
            <tr><td style="padding: 8px 0; color: #64748b;">退款数</td><td>${refunds}</td></tr>
            <tr><td style="padding: 8px 0; color: #64748b;">新商户</td><td>${newMerchants}</td></tr>
        </table>
    `
    return sendManNotify('dailyGmvReport', `每日 GMV 报表 ${date}：¥${gmv.toFixed(2)}`, html)
}

module.exports = {
    getNotifyConfig,
    saveNotifyConfig,
    sendManNotify,
    notifyNewMerchant,
    notifyPlanOrderPaid,
    notifyEmailPackPaid,
    notifyRiskHit,
    notifyNewMerchantTicket,
    notifyMerchantSuspended,
    notifyDailyGmvReport,
    EVENT_LABELS,
    DEFAULT_CONFIG
}

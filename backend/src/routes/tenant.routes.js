const express = require('express')
const router = express.Router()
const tenantController = require('../controllers/tenantController')
const { authenticate } = require('../middleware/auth')

// 所有租户路由需要登录
router.use(authenticate)

// 租户基本信息
router.get('/me', tenantController.getMe)
router.post('/setup', tenantController.setup)

// 域名管理
router.post('/domain', tenantController.addDomain)
router.post('/domain/verify', tenantController.verifyDns)
router.delete('/domain', tenantController.deleteDomain)

// 提交审核
router.post('/submit', tenantController.submitReview)

// 设置
router.get('/settings', tenantController.getSettings)
router.put('/settings', tenantController.updateSettings)

// 测试通知
router.post('/test-notify', async (req, res) => {
    try {
        const { type } = req.body
        const prisma = require('../config/database')
        const { sendTenantEmail } = require('../services/tenantEmailService')

        const tenant = await prisma.tenant.findUnique({
            where: { userId: req.user.id },
            include: { user: { select: { email: true } } }
        })
        if (!tenant) return res.status(404).json({ error: '租户不存在' })

        // 获取收信邮箱
        let notifyEmail = tenant.user.email
        try {
            const settings = await prisma.tenantSetting.findUnique({ where: { tenantId: tenant.id } })
            if (settings?.paymentConfig) {
                const config = JSON.parse(settings.paymentConfig)
                if (config.notify_email) notifyEmail = config.notify_email
            }
        } catch {}

        // 使用真实模板（与 adminNotifyService 一致）
        const wrapTemplate = (title, content) => `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;"><div style="max-width:560px;margin:24px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);"><div style="background:linear-gradient(135deg,#1e293b 0%,#334155 100%);padding:24px 32px;"><h2 style="margin:0;color:#fff;font-size:18px;">🔔 ${title}</h2><p style="margin:8px 0 0;color:rgba(255,255,255,0.6);font-size:13px;">${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}</p></div><div style="padding:28px 32px;">${content}</div><div style="padding:16px 32px;background:#f8fafc;border-top:1px solid #f1f5f9;text-align:center;"><p style="margin:0;font-size:12px;color:#94a3b8;">此通知由系统自动发送（测试）</p></div></div></body></html>`

        const templates = {
            order_paid: {
                subject: `【测试】订单支付成功 - KA20260517TEST001`,
                html: wrapTemplate('订单支付成功 - KA20260517TEST001', `
                    <h3 style="color:#10b981;margin:0 0 16px;">💰 收到新订单付款</h3>
                    <table style="width:100%;border-collapse:collapse;">
                        <tr><td style="padding:8px 12px;color:#64748b;border-bottom:1px solid #f1f5f9;">订单号</td><td style="padding:8px 12px;font-weight:600;border-bottom:1px solid #f1f5f9;font-family:monospace;">KA20260517TEST001</td></tr>
                        <tr><td style="padding:8px 12px;color:#64748b;border-bottom:1px solid #f1f5f9;">商品名称</td><td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;">Steam 游戏充值卡 50元</td></tr>
                        <tr><td style="padding:8px 12px;color:#64748b;border-bottom:1px solid #f1f5f9;">数量</td><td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;">2</td></tr>
                        <tr><td style="padding:8px 12px;color:#64748b;border-bottom:1px solid #f1f5f9;">支付金额</td><td style="padding:8px 12px;font-weight:700;color:#ef4444;border-bottom:1px solid #f1f5f9;">¥100.00</td></tr>
                        <tr><td style="padding:8px 12px;color:#64748b;border-bottom:1px solid #f1f5f9;">支付方式</td><td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;">支付宝</td></tr>
                        <tr><td style="padding:8px 12px;color:#64748b;">客户邮箱</td><td style="padding:8px 12px;">buyer@example.com</td></tr>
                    </table>`)
            },
            pending_ship: {
                subject: `【测试】⚡ 待发货 - KA20260517TEST002`,
                html: wrapTemplate('⚡ 待发货 - KA20260517TEST002', `
                    <h3 style="color:#f59e0b;margin:0 0 16px;">📦 订单已支付，等待手动发货</h3>
                    <div style="padding:12px 16px;background:#fffbeb;border-radius:8px;border-left:3px solid #f59e0b;margin-bottom:16px;">
                        <p style="margin:0;color:#92400e;font-size:14px;font-weight:500;">该订单无可用卡密自动发放，需要管理员手动发货！</p>
                    </div>
                    <table style="width:100%;border-collapse:collapse;">
                        <tr><td style="padding:8px 12px;color:#64748b;border-bottom:1px solid #f1f5f9;">订单号</td><td style="padding:8px 12px;font-weight:600;border-bottom:1px solid #f1f5f9;font-family:monospace;">KA20260517TEST002</td></tr>
                        <tr><td style="padding:8px 12px;color:#64748b;border-bottom:1px solid #f1f5f9;">商品名称</td><td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;">Netflix 会员月卡</td></tr>
                        <tr><td style="padding:8px 12px;color:#64748b;border-bottom:1px solid #f1f5f9;">数量</td><td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;">1</td></tr>
                        <tr><td style="padding:8px 12px;color:#64748b;border-bottom:1px solid #f1f5f9;">支付金额</td><td style="padding:8px 12px;font-weight:700;color:#ef4444;border-bottom:1px solid #f1f5f9;">¥35.00</td></tr>
                        <tr><td style="padding:8px 12px;color:#64748b;">客户邮箱</td><td style="padding:8px 12px;">customer@gmail.com</td></tr>
                    </table>`)
            },
            stock_alert: {
                subject: `【测试】库存预警 - Steam 游戏充值卡 50元`,
                html: wrapTemplate('库存预警 - Steam 游戏充值卡 50元', `
                    <h3 style="color:#ef4444;margin:0 0 16px;">⚠️ 商品库存不足</h3>
                    <table style="width:100%;border-collapse:collapse;">
                        <tr><td style="padding:8px 12px;color:#64748b;border-bottom:1px solid #f1f5f9;">商品名称</td><td style="padding:8px 12px;font-weight:600;border-bottom:1px solid #f1f5f9;">Steam 游戏充值卡 50元</td></tr>
                        <tr><td style="padding:8px 12px;color:#64748b;border-bottom:1px solid #f1f5f9;">当前库存</td><td style="padding:8px 12px;font-weight:700;color:#ef4444;border-bottom:1px solid #f1f5f9;">0 件</td></tr>
                        <tr><td style="padding:8px 12px;color:#64748b;">售价</td><td style="padding:8px 12px;">¥50.00</td></tr>
                    </table>
                    <p style="margin-top:16px;padding:12px 16px;background:#fef2f2;border-radius:8px;color:#991b1b;font-size:14px;">请及时补充库存，避免影响销售！</p>`)
            },
            new_ticket: {
                subject: `【测试】新工单 - TK20260517001`,
                html: wrapTemplate('新工单 - TK20260517001', `
                    <h3 style="color:#f59e0b;margin:0 0 16px;">🎫 收到新工单</h3>
                    <table style="width:100%;border-collapse:collapse;">
                        <tr><td style="padding:8px 12px;color:#64748b;border-bottom:1px solid #f1f5f9;">工单号</td><td style="padding:8px 12px;font-family:monospace;border-bottom:1px solid #f1f5f9;">TK20260517001</td></tr>
                        <tr><td style="padding:8px 12px;color:#64748b;border-bottom:1px solid #f1f5f9;">类型</td><td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;">卡密问题</td></tr>
                        <tr><td style="padding:8px 12px;color:#64748b;border-bottom:1px solid #f1f5f9;">主题</td><td style="padding:8px 12px;font-weight:600;border-bottom:1px solid #f1f5f9;">购买的卡密无法使用</td></tr>
                        <tr><td style="padding:8px 12px;color:#64748b;border-bottom:1px solid #f1f5f9;">提交者</td><td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;">user@example.com</td></tr>
                        <tr><td style="padding:8px 12px;color:#64748b;">关联订单</td><td style="padding:8px 12px;">KA20260517TEST001</td></tr>
                    </table>
                    <div style="margin-top:16px;padding:12px 16px;background:#f8fafc;border-radius:8px;border-left:3px solid #f59e0b;">
                        <p style="margin:0;font-size:13px;color:#64748b;">问题描述：</p>
                        <p style="margin:8px 0 0;color:#334155;">您好，我购买的 Steam 充值卡激活后提示已被使用，请帮忙处理一下，谢谢。</p>
                    </div>`)
            },
            order_cancel: {
                subject: `【测试】订单取消 - KA20260517TEST003`,
                html: wrapTemplate('订单取消 - KA20260517TEST003', `
                    <h3 style="color:#94a3b8;margin:0 0 16px;">🚫 订单已取消</h3>
                    <table style="width:100%;border-collapse:collapse;">
                        <tr><td style="padding:8px 12px;color:#64748b;border-bottom:1px solid #f1f5f9;">订单号</td><td style="padding:8px 12px;font-family:monospace;border-bottom:1px solid #f1f5f9;">KA20260517TEST003</td></tr>
                        <tr><td style="padding:8px 12px;color:#64748b;border-bottom:1px solid #f1f5f9;">商品</td><td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;">Netflix 会员月卡</td></tr>
                        <tr><td style="padding:8px 12px;color:#64748b;border-bottom:1px solid #f1f5f9;">金额</td><td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;">¥35.00</td></tr>
                        <tr><td style="padding:8px 12px;color:#64748b;">取消原因</td><td style="padding:8px 12px;">超时未支付（15分钟）</td></tr>
                    </table>`)
            },
        }

        const template = templates[type]
        if (!template) return res.status(400).json({ error: '无效的通知类型' })

        const result = await sendTenantEmail(tenant.id, {
            to: notifyEmail,
            subject: template.subject,
            html: template.html
        })

        if (result.success) {
            res.json({ message: `测试通知已发送到 ${notifyEmail}` })
        } else {
            res.status(400).json({ error: result.reason === 'not_allowed' ? '邮件功能未开通（需标准版以上套餐）' : result.reason === 'platform_smtp_not_configured' ? '平台 SMTP 未配置' : result.reason === 'quota_exceeded' ? '本月邮件额度已用完' : `发送失败：${result.reason}` })
        }
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})

module.exports = router

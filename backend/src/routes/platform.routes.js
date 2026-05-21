/**
 * 平台路由
 * /api/platform/* — 商户操作
 * /api/man/*      — 平台超管操作
 */
const express = require('express')
const router = express.Router()
const ctrl = require('../controllers/platformController')
const planCtrl = require('../controllers/planController')
const { platformAuth, superAdminOnly } = require('../middleware/platformAuth')
const prisma = require('../config/database')

// ── 公开路由（无需登录）─────────────────────────────────────
router.post('/platform/register', ctrl.register)
router.post('/platform/login', ctrl.login)
router.post('/man/login', ctrl.login)   // 超管也用同一登录接口

// 邮箱 OTP（注册验证）
const otpService = require('../services/otpService')
router.post('/platform/otp/send', async (req, res) => {
    try {
        const { email, scope, slug } = req.body || {}
        if (!email || !scope) return res.status(400).json({ error: '参数不完整' })
        if (!['merchant_register', 'customer_register'].includes(scope)) {
            return res.status(400).json({ error: '不支持的 scope' })
        }
        // 校验对应 scope 的开关是否开启
        const switchKey = scope === 'merchant_register' ? 'merchant_register_otp' : 'customer_register_otp'
        const sw = await prisma.platformSetting.findUnique({ where: { key: switchKey } })
        if (sw?.value !== 'true') {
            return res.status(400).json({ error: '该场景未启用注册验证码' })
        }
        let tenantId = null
        if (scope === 'customer_register' && slug) {
            const t = await prisma.tenant.findUnique({ where: { shopSlug: slug }, select: { id: true } })
            tenantId = t?.id || null
        }
        const result = await otpService.sendOtp({ email, scope, tenantId })
        if (!result.ok) return res.status(400).json({ error: result.error })
        res.json({ message: '验证码已发送，请查收' })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})

// 商城公开配置（店面加载）
router.get('/shop/:slug/config', ctrl.getShopPublicConfig)

// 套餐列表（公开）
router.get('/platform/plans', planCtrl.getPlans)

// 平台公告（公开，商户可见）
router.get('/platform/announcements', async (req, res) => {
    try {
        const prisma = require('../config/database')
        const announcements = await prisma.platformSetting.findMany({
            where: { key: { startsWith: 'announcement_' } },
            orderBy: { updatedAt: 'desc' }
        })
        const list = announcements
            .map(a => { try { return JSON.parse(a.value) } catch { return null } })
            .filter(a => a && a.active)
            .map(a => ({ title: a.title, content: a.content, createdAt: a.createdAt }))
        res.json({ announcements: list })
    } catch (e) {
        res.json({ announcements: [] })
    }
})

// ── 商户认证路由 ─────────────────────────────────────────────
router.get('/platform/me', platformAuth, ctrl.getMe)
router.put('/platform/shop', platformAuth, ctrl.updateShop)
router.put('/platform/account', platformAuth, ctrl.updateAccount)
router.patch('/platform/account', platformAuth, ctrl.updateAccount)

// 商户套餐购买
router.post('/platform/plan/buy', platformAuth, planCtrl.createPlanOrder)
router.get('/platform/plan/check/:orderNo', platformAuth, planCtrl.checkPlanPayment)
router.get('/platform/plan/orders', platformAuth, planCtrl.getMyPlanOrders)
router.get('/platform/plan/limits', platformAuth, planCtrl.getPlanLimits)

// 商户工单
const merchantTicketCtrl = require('../controllers/merchantTicketController')
router.post('/platform/tickets', platformAuth, merchantTicketCtrl.create)
router.get('/platform/tickets', platformAuth, merchantTicketCtrl.list)
router.get('/platform/tickets/:id', platformAuth, merchantTicketCtrl.detail)
router.post('/platform/tickets/:id/reply', platformAuth, merchantTicketCtrl.reply)
router.post('/platform/tickets/:id/reopen', platformAuth, merchantTicketCtrl.reopen)
router.post('/platform/tickets/:id/close', platformAuth, merchantTicketCtrl.close)

// ── 平台超管路由（/Man 后台使用）─────────────────────────────
router.get('/man/stats', platformAuth, superAdminOnly, ctrl.getPlatformStats)
router.get('/man/trend', platformAuth, superAdminOnly, ctrl.getPlatformTrend)
router.get('/man/merchants', platformAuth, superAdminOnly, ctrl.listMerchants)
router.patch('/man/merchants/:id', platformAuth, superAdminOnly, ctrl.updateMerchant)
router.get('/man/settings', platformAuth, superAdminOnly, ctrl.getPlatformSettings)
router.put('/man/settings', platformAuth, superAdminOnly, ctrl.updatePlatformSettings)

// 平台超管：商户工单管理
const adminMerchantTicketCtrl = require('../controllers/adminMerchantTicketController')
router.get('/man/tickets', platformAuth, superAdminOnly, adminMerchantTicketCtrl.list)
router.get('/man/tickets/:id', platformAuth, superAdminOnly, adminMerchantTicketCtrl.detail)
router.post('/man/tickets/:id/reply', platformAuth, superAdminOnly, adminMerchantTicketCtrl.reply)
router.post('/man/tickets/:id/close', platformAuth, superAdminOnly, adminMerchantTicketCtrl.close)

// 平台超管：套餐订单管理
router.get('/man/plan-orders', platformAuth, superAdminOnly, planCtrl.listPlanOrders)
router.get('/man/all-orders', platformAuth, superAdminOnly, planCtrl.listAllOrders)
router.post('/man/plan-orders/:id/confirm', platformAuth, superAdminOnly, planCtrl.confirmPlanOrder)
router.post('/man/plan-orders/:id/reject', platformAuth, superAdminOnly, planCtrl.rejectPlanOrder)

// 平台超管：跨租户订单监控 + 风控
const manOrderCtrl = require('../controllers/manOrderController')
router.get('/man/shop-orders', platformAuth, superAdminOnly, manOrderCtrl.listAllShopOrders)
router.get('/man/shop-orders/:id', platformAuth, superAdminOnly, manOrderCtrl.getShopOrderDetail)
router.get('/man/risk-keywords', platformAuth, superAdminOnly, manOrderCtrl.getRiskKeywords)
router.put('/man/risk-keywords', platformAuth, superAdminOnly, manOrderCtrl.saveRiskKeywords)
router.get('/man/risk-overview', platformAuth, superAdminOnly, manOrderCtrl.getRiskOverview)
router.post('/man/merchants/:tenantId/suspend', platformAuth, superAdminOnly, manOrderCtrl.suspendMerchant)
router.post('/man/merchants/:tenantId/unsuspend', platformAuth, superAdminOnly, manOrderCtrl.unsuspendMerchant)

// 平台超管：通知设置
const manNotifyService = require('../services/manNotifyService')
router.get('/man/notify-config', platformAuth, superAdminOnly, async (req, res) => {
    try {
        const config = await manNotifyService.getNotifyConfig()
        res.json({ config, eventLabels: manNotifyService.EVENT_LABELS })
    } catch (e) { res.status(500).json({ error: e.message }) }
})
router.put('/man/notify-config', platformAuth, superAdminOnly, async (req, res) => {
    try {
        const saved = await manNotifyService.saveNotifyConfig(req.body || {})
        res.json({ message: '已保存', config: saved })
    } catch (e) { res.status(500).json({ error: e.message }) }
})
router.post('/man/notify-test', platformAuth, superAdminOnly, async (req, res) => {
    try {
        const result = await manNotifyService.sendManNotify('newMerchant', '通知测试',
            '<p>这是一封测试邮件，用于验证平台通知设置是否正常。</p>')
        if (result.success) res.json({ message: '已发送测试邮件' })
        else res.status(400).json({ error: result.reason || result.error || '发送失败' })
    } catch (e) { res.status(500).json({ error: e.message }) }
})

// 平台超管：定制主题管理
const customThemeCtrl = require('../controllers/customThemeController')
router.get('/man/custom-themes', platformAuth, superAdminOnly, customThemeCtrl.listThemes)
router.post('/man/custom-themes', platformAuth, superAdminOnly, customThemeCtrl.createTheme)
router.patch('/man/custom-themes/:id', platformAuth, superAdminOnly, customThemeCtrl.updateTheme)
router.delete('/man/custom-themes/:id', platformAuth, superAdminOnly, customThemeCtrl.deleteTheme)
router.put('/man/custom-themes/:id/assign', platformAuth, superAdminOnly, customThemeCtrl.assignTenants)

// 平台超管：套餐配置管理
router.get('/man/plan-config', platformAuth, superAdminOnly, planCtrl.getPlanConfig)
router.put('/man/plan-config', platformAuth, superAdminOnly, planCtrl.savePlanConfig)

// 平台超管：公告管理
router.get('/man/announcements', platformAuth, superAdminOnly, ctrl.getAnnouncements)
router.post('/man/announcements', platformAuth, superAdminOnly, ctrl.createAnnouncement)
router.put('/man/announcements/:id', platformAuth, superAdminOnly, ctrl.updateAnnouncement)
router.delete('/man/announcements/:id', platformAuth, superAdminOnly, ctrl.deleteAnnouncement)

// 平台超管：备份管理
router.get('/man/backup', platformAuth, superAdminOnly, ctrl.getBackupInfo)
router.post('/man/backup/run', platformAuth, superAdminOnly, ctrl.triggerBackup)

// 平台超管：测试邮件
router.post('/man/test-email', platformAuth, superAdminOnly, async (req, res) => {
    try {
        const { to } = req.body
        if (!to) return res.status(400).json({ error: '请输入收件邮箱' })
        const { getPlatformSmtp } = require('../services/tenantEmailService')
        const nodemailer = require('nodemailer')
        const smtp = await getPlatformSmtp()
        if (!smtp) return res.status(400).json({ error: '平台 SMTP 未配置，请先保存配置' })
        const transporter = nodemailer.createTransport({
            host: smtp.host, port: smtp.port, secure: smtp.port === 465,
            auth: { user: smtp.user, pass: smtp.pass }
        })
        await transporter.sendMail({
            from: `"Vmart 平台" <${smtp.from}>`,
            to,
            subject: '【Vmart】SMTP 测试邮件',
            html: '<div style="font-family:sans-serif;padding:20px;"><h2>✅ SMTP 配置正常</h2><p>如果你收到这封邮件，说明平台代发 SMTP 配置成功。</p><p style="color:#94a3b8;font-size:12px;">Vmart Platform</p></div>'
        })
        res.json({ message: '测试邮件已发送' })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})

// 商户数据导出
router.get('/platform/export', platformAuth, ctrl.exportMerchantData)

module.exports = router

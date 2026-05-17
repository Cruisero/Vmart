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

// ── 公开路由（无需登录）─────────────────────────────────────
router.post('/platform/register', ctrl.register)
router.post('/platform/login', ctrl.login)
router.post('/man/login', ctrl.login)   // 超管也用同一登录接口

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

// ── 平台超管路由（/Man 后台使用）─────────────────────────────
router.get('/man/stats', platformAuth, superAdminOnly, ctrl.getPlatformStats)
router.get('/man/trend', platformAuth, superAdminOnly, ctrl.getPlatformTrend)
router.get('/man/merchants', platformAuth, superAdminOnly, ctrl.listMerchants)
router.patch('/man/merchants/:id', platformAuth, superAdminOnly, ctrl.updateMerchant)
router.get('/man/settings', platformAuth, superAdminOnly, ctrl.getPlatformSettings)
router.put('/man/settings', platformAuth, superAdminOnly, ctrl.updatePlatformSettings)

// 平台超管：套餐订单管理
router.get('/man/plan-orders', platformAuth, superAdminOnly, planCtrl.listPlanOrders)
router.post('/man/plan-orders/:id/confirm', platformAuth, superAdminOnly, planCtrl.confirmPlanOrder)
router.post('/man/plan-orders/:id/reject', platformAuth, superAdminOnly, planCtrl.rejectPlanOrder)

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

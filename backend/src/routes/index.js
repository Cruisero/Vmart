const express = require('express')
const router = express.Router()

const authRoutes = require('./auth.routes')
const productRoutes = require('./product.routes')
const categoryRoutes = require('./category.routes')
const orderRoutes = require('./order.routes')
const cardRoutes = require('./card.routes')
const paymentRoutes = require('./payment.routes')
const adminRoutes = require('./admin.routes')
const uploadRoutes = require('./upload.routes')
const ticketRoutes = require('./ticket.routes')
const statsRoutes = require('./stats.routes')
const agentRoutes = require('./agent.routes')
const storefrontRoutes = require('./storefront.routes')
const tenantRoutes = require('./tenant.routes')
const platformRoutes = require('./platform.routes')
const customerRoutes = require('./customer.routes')

// API 版本信息
router.get('/', (req, res) => {
    res.json({
        name: 'HaoDongXi API',
        version: '1.0.0',
        description: '虚拟物品发卡平台接口'
    })
})

// 公开设置（无需认证，供前端皮肤切换等使用）
const PUBLIC_KEYS = ['frontend_skin', 'siteName', 'siteDescription', 'notificationEnabled', 'notificationText', 'notificationLink', 'siteLogo', 'siteFavicon', 'agentSkinPool', 'agentEnabled']
const prisma = require('../config/database')

// 公开 OTP 开关查询（前端注册页用来决定是否显示验证码 UI）
router.get('/settings/public/otp', async (req, res) => {
    try {
        const rows = await prisma.platformSetting.findMany({
            where: { key: { in: ['merchant_register_otp', 'customer_register_otp'] } }
        })
        const map = {}
        rows.forEach(r => { map[r.key] = r.value === 'true' })
        res.json({
            merchantRegisterOtp: !!map.merchant_register_otp,
            customerRegisterOtp: !!map.customer_register_otp
        })
    } catch (e) {
        res.json({ merchantRegisterOtp: false, customerRegisterOtp: false })
    }
})

// 公开客服联系方式（商户后台用）
router.get('/settings/public/support', async (req, res) => {
    try {
        const rows = await prisma.platformSetting.findMany({
            where: { key: { in: ['support_email', 'support_telegram', 'support_other', 'support_qq', 'support_whatsapp'] } }
        })
        const map = {}
        rows.forEach(r => { map[r.key] = r.value })
        res.json({
            email: map.support_email || '',
            telegram: map.support_telegram || '',
            qq: map.support_qq || '',
            whatsapp: map.support_whatsapp || '',
            other: map.support_other || ''
        })
    } catch (e) {
        res.json({ email: '', telegram: '', qq: '', whatsapp: '', other: '' })
    }
})

router.get('/settings/public', async (req, res) => {    try {
        // 如果是租户域名请求，返回租户自己的设置
        if (req.tenantId && req.tenant) {
            const tenantSetting = await prisma.tenantSetting.findUnique({
                where: { tenantId: req.tenantId }
            })
            return res.json({
                settings: {
                    siteName: req.tenant.shopName,
                    siteLogo: req.tenant.shopLogo,
                    frontend_skin: req.tenant.shopSkin,
                    notificationEnabled: tenantSetting?.notificationEnabled ? 'true' : 'false',
                    notificationText: tenantSetting?.notificationText || '',
                    notificationLink: tenantSetting?.notificationLink || '',
                    _tenantMode: true,
                    _tenantId: req.tenantId
                }
            })
        }

        // 主站设置
        const rows = await prisma.setting.findMany({
            where: { key: { in: PUBLIC_KEYS } }
        })
        const result = {}
        rows.forEach(r => { result[r.key] = r.value })
        res.json({ settings: result })
    } catch (e) {
        res.json({ settings: {} })
    }
})

// 认证路由
router.use('/auth', authRoutes)

// 商品路由
router.use('/products', productRoutes)

// 分类路由
router.use('/categories', categoryRoutes)

// 订单路由
router.use('/orders', orderRoutes)

// 卡密路由 (需要管理员权限)
router.use('/cards', cardRoutes)

// 支付路由
router.use('/payment', paymentRoutes)

// 管理员路由
router.use('/admin', adminRoutes)

// 上传路由
router.use('/upload', uploadRoutes)

// 工单路由
router.use('/tickets', ticketRoutes)

// 统计路由
router.use('/stats', statsRoutes)

// 代理商路由
router.use('/agent', agentRoutes)

// 代理分站前台路由
router.use('/s', storefrontRoutes)

// SaaS 商户店面路由（/api/v/:slug/*）
const { getMerchantStorefront, getMerchantProducts, getMerchantProduct, getMerchantCategories, getMerchantHotSearches, logMerchantSearch } = require('../controllers/storefront.controller')
router.get('/v/:slug', getMerchantStorefront)
router.get('/v/:slug/products', getMerchantProducts)
router.get('/v/:slug/products/:productId', getMerchantProduct)
router.get('/v/:slug/categories', getMerchantCategories)
router.get('/v/:slug/hot-searches', getMerchantHotSearches)
router.post('/v/:slug/search-log', logMerchantSearch)

// 租户管理路由
router.use('/tenant', tenantRoutes)

// 店面顾客路由（注册/登录/订单/修改密码 — 每个 tenant 独立）
router.use('/customer', customerRoutes)

// SaaS 平台路由（/api/platform/*, /api/man/*, /api/shop/*）
router.use('/', platformRoutes)

module.exports = router

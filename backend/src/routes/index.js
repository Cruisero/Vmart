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

router.get('/settings/public', async (req, res) => {
    try {
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

// 租户管理路由
router.use('/tenant', tenantRoutes)

module.exports = router

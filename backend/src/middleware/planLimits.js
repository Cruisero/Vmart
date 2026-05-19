/**
 * 套餐限制中间件
 * 从数据库读取套餐配置，动态检查限制
 */
const prisma = require('../config/database')
const logger = require('../utils/logger')

// 从数据库获取套餐限制
async function getPlanLimits(planKey) {
    // 免费试用与专业版同权限
    const effectivePlanKey = planKey === 'FREE' ? 'PRO' : planKey
    try {
        const setting = await prisma.platformSetting.findUnique({ where: { key: 'plan_config' } })
        if (setting?.value) {
            const config = JSON.parse(setting.value)
            const plan = config.plans?.find(p => p.key === effectivePlanKey)
            if (plan?.features) {
                return { maxProducts: plan.features.maxProducts || -1 }
            }
        }
    } catch (e) {
        logger.error('[getPlanLimits] 读取套餐配置失败:', e.message)
    }
    // 默认限制（FREE 视同 PRO）
    const defaults = { FREE: 200, BASIC: 10, STANDARD: 50, PRO: 200 }
    return { maxProducts: defaults[planKey] || 5 }
}

/**
 * 检查商品数量限制（用于创建商品时）
 */
async function checkProductLimit(req, res, next) {
    try {
        if (!req.tenantId) return next()

        const tenant = await prisma.tenant.findUnique({
            where: { id: req.tenantId },
            select: { shopSlug: true }
        })
        if (!tenant) return next()

        const shop = await prisma.shop.findUnique({ where: { slug: tenant.shopSlug } })
        if (!shop) return next()

        const limits = await getPlanLimits(shop.plan)
        if (limits.maxProducts === -1) return next()

        const currentCount = await prisma.product.count({
            where: { tenantId: req.tenantId, status: 'ACTIVE' }
        })

        if (currentCount >= limits.maxProducts) {
            return res.status(403).json({
                error: `当前套餐最多可创建 ${limits.maxProducts} 个商品，请升级套餐`,
                code: 'PLAN_LIMIT_PRODUCTS'
            })
        }

        next()
    } catch (error) {
        logger.error('[checkProductLimit]', error)
        next()
    }
}

/**
 * 检查月订单数量限制（用于创建订单时）
 * 注：当前套餐设计没有月订单限制，此函数保留备用
 */
async function checkOrderLimit(req, res, next) {
    try {
        const tenantId = req.body?.tenantId || req.tenantId
        if (!tenantId) return next()

        // 当前套餐设计无订单限制，直接放行
        // 如果将来需要限制，在 plan_config 的 features 里加 maxMonthlyOrders 字段即可
        next()
    } catch (error) {
        logger.error('[checkOrderLimit]', error)
        next()
    }
}

module.exports = { checkProductLimit, checkOrderLimit, getPlanLimits }

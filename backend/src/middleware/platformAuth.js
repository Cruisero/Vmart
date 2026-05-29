/**
 * 平台商户 JWT 中间件（独立于商城 User JWT）
 * 用于 /api/platform/* 和 /api/man/* 路由
 */
const jwt = require('jsonwebtoken')
const prisma = require('../config/database')

const PLATFORM_JWT_SECRET = process.env.PLATFORM_JWT_SECRET || process.env.JWT_SECRET

/**
 * 生成平台 JWT
 */
function generatePlatformToken(merchant) {
    return jwt.sign(
        {
            mid: merchant.id,
            email: merchant.email,
            isSuperAdmin: merchant.isSuperAdmin
        },
        PLATFORM_JWT_SECRET,
        { expiresIn: '7d' }
    )
}

/**
 * 验证平台 JWT，注入 req.merchant
 */
async function platformAuth(req, res, next) {
    const authHeader = req.headers['x-platform-token'] || req.headers['authorization']
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : authHeader

    if (!token) {
        return res.status(401).json({ error: '请先登录' })
    }

    let payload = null
    let isMerchantToken = false

    // 1. 尝试以平台商户 token 验证
    try {
        payload = jwt.verify(token, PLATFORM_JWT_SECRET)
        if (payload && payload.mid) {
            isMerchantToken = true
        }
    } catch (err) {
        // 如果 PLATFORM_JWT_SECRET 与 JWT_SECRET 不同，用 JWT_SECRET 再试一次
        if (process.env.JWT_SECRET && process.env.JWT_SECRET !== PLATFORM_JWT_SECRET) {
            try {
                payload = jwt.verify(token, process.env.JWT_SECRET)
            } catch (e) {
                const msg = e.name === 'TokenExpiredError' ? 'Token 已过期，请重新登录' : 'Token 无效或已过期'
                return res.status(401).json({ error: msg })
            }
        } else {
            // 两个 secret 相同，只需一次验证就够了，失败即终止
            const msg = err.name === 'TokenExpiredError' ? 'Token 已过期，请重新登录' : 'Token 无效或已过期'
            return res.status(401).json({ error: msg })
        }
    }

    if (!payload) {
        return res.status(401).json({ error: 'Token 无效或已过期' })
    }

    try {
        if (isMerchantToken) {
            const merchant = await prisma.merchant.findUnique({
                where: { id: payload.mid },
                include: { shop: true }
            })
            if (!merchant) return res.status(401).json({ error: '账号不存在' })
            req.merchant = merchant
            return next()
        } else if (payload.id) {
            // 这是普通租户管理 token (来自 useAuthStore)
            const user = await prisma.user.findUnique({
                where: { id: payload.id }
            })
            if (!user) return res.status(401).json({ error: '用户不存在' })

            if (user.role !== 'TENANT_ADMIN' && user.role !== 'SUPER_ADMIN') {
                return res.status(403).json({ error: '权限不足，无法执行该操作' })
            }

            const merchant = await prisma.merchant.findUnique({
                where: { email: user.email },
                include: { shop: true }
            })
            if (!merchant) return res.status(401).json({ error: '商户账号不存在或未关联' })

            req.merchant = merchant
            return next()
        } else {
            return res.status(401).json({ error: 'Token 无效或已过期' })
        }
    } catch (error) {
        return res.status(401).json({ error: '验证 Token 失败: ' + error.message })
    }
}

/**
 * 仅平台超管可访问
 */
function superAdminOnly(req, res, next) {
    if (!req.merchant?.isSuperAdmin) {
        return res.status(403).json({ error: '权限不足' })
    }
    next()
}

/**
 * 试用/套餐到期拦截（写操作才拦截）
 * 放行：GET、店铺设置读取、套餐购买
 */
async function trialGate(req, res, next) {
    const shop = req.merchant?.shop
    if (!shop) return res.status(403).json({ error: '商城不存在' })

    // 超管跳过
    if (req.merchant.isSuperAdmin) return next()

    // 检查并应用待生效的降级计划
    try {
        const { applyPendingPlanChangeIfNeeded } = require('../utils/planUpgradeHelper')
        await applyPendingPlanChangeIfNeeded(shop)
    } catch {}

    // GET 请求放行（允许查看数据）
    if (req.method === 'GET') return next()

    const now = new Date()
    const isTrialExpired = shop.status !== 'ACTIVE' ||
        (shop.plan === 'FREE' && now > new Date(shop.trialEndsAt) && !shop.planExpiresAt) ||
        (shop.planExpiresAt && now > new Date(shop.planExpiresAt))

    if (isTrialExpired) {
        return res.status(402).json({
            error: '试用已到期，请升级套餐后继续使用',
            code: 'TRIAL_EXPIRED'
        })
    }
    next()
}

module.exports = { generatePlatformToken, platformAuth, superAdminOnly, trialGate }

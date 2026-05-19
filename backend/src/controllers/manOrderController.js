/**
 * 平台超管：跨租户订单监控 + 违禁词风控
 */
const prisma = require('../config/database')
const logger = require('../utils/logger')

const RISK_KEYWORDS_KEY = 'risk_keywords'

// 获取违禁词库
async function getRiskKeywords() {
    try {
        const setting = await prisma.platformSetting.findUnique({ where: { key: RISK_KEYWORDS_KEY } })
        if (!setting?.value) return []
        return JSON.parse(setting.value).filter(Boolean)
    } catch {
        return []
    }
}

// 检测一段文本是否命中违禁词，返回命中词数组
function findHits(text, keywords) {
    if (!text || keywords.length === 0) return []
    const lower = text.toLowerCase()
    return keywords.filter(k => k && lower.includes(k.toLowerCase()))
}

// ─── 跨租户订单列表 ─────────────────────────────────────────
exports.listAllShopOrders = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 30,
            status,
            tenantId,
            paymentMethod,
            search,
            minAmount,
            maxAmount,
            startDate,
            endDate,
            flagged // true 时只返回命中违禁词的订单
        } = req.query

        const where = {
            tenantId: { not: null } // 排除平台层订单（套餐/资源包等）
        }
        if (status) where.status = status
        if (tenantId) where.tenantId = tenantId
        if (paymentMethod) where.paymentMethod = paymentMethod
        if (minAmount) where.totalAmount = { ...(where.totalAmount || {}), gte: parseFloat(minAmount) }
        if (maxAmount) where.totalAmount = { ...(where.totalAmount || {}), lte: parseFloat(maxAmount) }
        if (startDate) where.createdAt = { ...(where.createdAt || {}), gte: new Date(startDate) }
        if (endDate) where.createdAt = { ...(where.createdAt || {}), lte: new Date(endDate) }
        if (search) {
            where.OR = [
                { orderNo: { contains: search } },
                { email: { contains: search } },
                { productName: { contains: search } }
            ]
        }

        const skip = (parseInt(page) - 1) * parseInt(limit)
        const take = parseInt(limit)

        const [total, orders] = await Promise.all([
            prisma.order.count({ where }),
            prisma.order.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take,
                select: {
                    id: true, orderNo: true, email: true, productName: true,
                    quantity: true, totalAmount: true, status: true,
                    paymentMethod: true, ipAddress: true, createdAt: true,
                    paidAt: true, completedAt: true, tenantId: true,
                    productId: true
                }
            })
        ])

        // 收集 tenantId / productId 做关联查询
        const tenantIds = [...new Set(orders.map(o => o.tenantId).filter(Boolean))]
        const productIds = [...new Set(orders.map(o => o.productId).filter(Boolean))]

        const [tenants, products] = await Promise.all([
            prisma.tenant.findMany({
                where: { id: { in: tenantIds } },
                select: { id: true, shopName: true, shopSlug: true, status: true }
            }),
            prisma.product.findMany({
                where: { id: { in: productIds } },
                select: { id: true, name: true, description: true, tags: true }
            })
        ])
        const tenantMap = Object.fromEntries(tenants.map(t => [t.id, t]))
        const productMap = Object.fromEntries(products.map(p => [p.id, p]))

        // 违禁词扫描
        const keywords = await getRiskKeywords()

        const enriched = orders.map(o => {
            const t = tenantMap[o.tenantId]
            const p = productMap[o.productId]
            const scanText = [
                o.productName,
                p?.name,
                p?.description,
                Array.isArray(p?.tags) ? p.tags.join(' ') : ''
            ].filter(Boolean).join(' ')
            const hits = findHits(scanText, keywords)
            return {
                ...o,
                totalAmount: parseFloat(o.totalAmount),
                tenant: t ? { id: t.id, shopName: t.shopName, shopSlug: t.shopSlug, status: t.status } : null,
                product: p ? { id: p.id, description: p.description, tags: p.tags } : null,
                riskHits: hits,
                isFlagged: hits.length > 0
            }
        })

        const filtered = flagged === 'true' ? enriched.filter(o => o.isFlagged) : enriched

        res.json({
            total: flagged === 'true' ? filtered.length : total,
            page: parseInt(page),
            orders: filtered
        })
    } catch (e) {
        logger.error('[man.listAllShopOrders]', e)
        res.status(500).json({ error: e.message })
    }
}

// ─── 单个订单详情 ─────────────────────────────────────────
exports.getShopOrderDetail = async (req, res) => {
    try {
        const { id } = req.params
        const order = await prisma.order.findUnique({
            where: { id },
            include: {
                product: { select: { id: true, name: true, description: true, image: true, tags: true } },
                cards: { select: { id: true, content: true, status: true } }, // 超管可看
                payment: true
            }
        })
        if (!order) return res.status(404).json({ error: '订单不存在' })

        let tenant = null
        if (order.tenantId) {
            tenant = await prisma.tenant.findUnique({
                where: { id: order.tenantId },
                select: {
                    id: true, shopName: true, shopSlug: true, status: true,
                    user: { select: { email: true, username: true } }
                }
            })
        }

        const keywords = await getRiskKeywords()
        const scanText = [
            order.productName,
            order.product?.name,
            order.product?.description,
            Array.isArray(order.product?.tags) ? order.product.tags.join(' ') : ''
        ].filter(Boolean).join(' ')
        const hits = findHits(scanText, keywords)

        // 审计日志（超管查看了订单详情）
        logger.info(`[audit] superAdmin=${req.merchant?.email || 'unknown'} viewed order=${order.orderNo}`)

        res.json({
            order: {
                ...order,
                totalAmount: parseFloat(order.totalAmount),
                unitPrice: parseFloat(order.unitPrice),
                tenant,
                riskHits: hits
            }
        })
    } catch (e) {
        logger.error('[man.getShopOrderDetail]', e)
        res.status(500).json({ error: e.message })
    }
}

// ─── 违禁词配置 ───────────────────────────────────────────
exports.getRiskKeywords = async (req, res) => {
    try {
        const keywords = await getRiskKeywords()
        res.json({ keywords })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
}

exports.saveRiskKeywords = async (req, res) => {
    try {
        const { keywords } = req.body
        if (!Array.isArray(keywords)) {
            return res.status(400).json({ error: 'keywords 必须是数组' })
        }
        const cleaned = keywords.map(k => String(k).trim()).filter(Boolean)
        await prisma.platformSetting.upsert({
            where: { key: RISK_KEYWORDS_KEY },
            create: { key: RISK_KEYWORDS_KEY, value: JSON.stringify(cleaned), description: '违禁词库（订单/商品扫描）' },
            update: { value: JSON.stringify(cleaned) }
        })
        res.json({ message: '已保存', count: cleaned.length })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
}

// ─── 风险概览（违禁词命中、统计）──────────────────────────────
exports.getRiskOverview = async (req, res) => {
    try {
        const keywords = await getRiskKeywords()

        // 取最近 1000 条订单做扫描（更精准的可改为存表）
        const orders = await prisma.order.findMany({
            where: { tenantId: { not: null } },
            orderBy: { createdAt: 'desc' },
            take: 1000,
            select: {
                id: true, orderNo: true, productName: true, totalAmount: true,
                tenantId: true, productId: true, createdAt: true
            }
        })

        const productIds = [...new Set(orders.map(o => o.productId).filter(Boolean))]
        const products = await prisma.product.findMany({
            where: { id: { in: productIds } },
            select: { id: true, name: true, description: true, tags: true }
        })
        const productMap = Object.fromEntries(products.map(p => [p.id, p]))

        const tenantIds = [...new Set(orders.map(o => o.tenantId).filter(Boolean))]
        const tenants = await prisma.tenant.findMany({
            where: { id: { in: tenantIds } },
            select: { id: true, shopName: true, shopSlug: true }
        })
        const tenantMap = Object.fromEntries(tenants.map(t => [t.id, t]))

        const flagged = []
        const tenantHitCount = {}

        for (const o of orders) {
            const p = productMap[o.productId]
            const scanText = [
                o.productName, p?.name, p?.description,
                Array.isArray(p?.tags) ? p.tags.join(' ') : ''
            ].filter(Boolean).join(' ')
            const hits = findHits(scanText, keywords)
            if (hits.length > 0) {
                flagged.push({
                    id: o.id, orderNo: o.orderNo, productName: o.productName,
                    totalAmount: parseFloat(o.totalAmount), createdAt: o.createdAt,
                    tenant: tenantMap[o.tenantId] || null,
                    riskHits: hits
                })
                tenantHitCount[o.tenantId] = (tenantHitCount[o.tenantId] || 0) + 1
            }
        }

        const topRiskTenants = Object.entries(tenantHitCount)
            .map(([tid, count]) => ({
                tenant: tenantMap[tid],
                count
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10)

        res.json({
            scanned: orders.length,
            flaggedCount: flagged.length,
            keywords,
            recentFlagged: flagged.slice(0, 50),
            topRiskTenants
        })
    } catch (e) {
        logger.error('[man.getRiskOverview]', e)
        res.status(500).json({ error: e.message })
    }
}

// ─── 商户冻结 / 解冻 ──────────────────────────────────────
exports.suspendMerchant = async (req, res) => {
    try {
        const { tenantId } = req.params
        const { reason } = req.body || {}
        const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } })
        if (!tenant) return res.status(404).json({ error: '商户不存在' })

        await prisma.tenant.update({
            where: { id: tenantId },
            data: {
                status: 'SUSPENDED',
                reviewNote: reason ? `[冻结] ${reason}` : '[冻结] 平台风控冻结'
            }
        })

        // 同步暂停 shop
        try {
            await prisma.shop.updateMany({
                where: { slug: tenant.shopSlug },
                data: { status: 'SUSPENDED' }
            })
        } catch {}

        logger.info(`[audit] superAdmin=${req.merchant?.email || 'unknown'} suspended tenant=${tenantId} reason=${reason || ''}`)

        // 平台超管通知（其他超管）
        try {
            const manNotify = require('../services/manNotifyService')
            manNotify.notifyMerchantSuspended(tenant, 'suspend', reason).catch(() => {})
        } catch {}

        res.json({ message: '商户已冻结' })
    } catch (e) {
        logger.error('[man.suspendMerchant]', e)
        res.status(500).json({ error: e.message })
    }
}

exports.unsuspendMerchant = async (req, res) => {
    try {
        const { tenantId } = req.params
        const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } })
        if (!tenant) return res.status(404).json({ error: '商户不存在' })

        await prisma.tenant.update({
            where: { id: tenantId },
            data: { status: 'ACTIVE', reviewNote: null }
        })

        try {
            await prisma.shop.updateMany({
                where: { slug: tenant.shopSlug },
                data: { status: 'ACTIVE' }
            })
        } catch {}

        logger.info(`[audit] superAdmin=${req.merchant?.email || 'unknown'} unsuspended tenant=${tenantId}`)

        try {
            const manNotify = require('../services/manNotifyService')
            manNotify.notifyMerchantSuspended(tenant, 'unsuspend').catch(() => {})
        } catch {}

        res.json({ message: '商户已解冻' })
    } catch (e) {
        logger.error('[man.unsuspendMerchant]', e)
        res.status(500).json({ error: e.message })
    }
}

/**
 * 定制主题管理（平台超管）+ 商户可用主题查询
 */
const prisma = require('../config/database')
const logger = require('../utils/logger')

// 当前公开主题列表
const PUBLIC_SKINS = ['fresh', 'zen', 'class']

// ─── 平台超管：列表 ─────────────────────────────────────────
exports.listThemes = async (req, res) => {
    try {
        const themes = await prisma.customTheme.findMany({
            orderBy: { createdAt: 'desc' }
        })
        const assignments = await prisma.customThemeAssignment.findMany()

        const assignmentsMap = {}
        for (const a of assignments) {
            if (!assignmentsMap[a.themeId]) {
                assignmentsMap[a.themeId] = []
            }
            assignmentsMap[a.themeId].push({ tenantId: a.tenantId, createdAt: a.createdAt })
        }

        const tenantIds = [...new Set(assignments.map(a => a.tenantId))]
        const tenants = tenantIds.length ? await prisma.tenant.findMany({
            where: { id: { in: tenantIds } },
            select: { id: true, shopName: true, shopSlug: true, user: { select: { email: true } } }
        }) : []
        const tenantMap = Object.fromEntries(tenants.map(t => [t.id, t]))

        const result = themes.map(t => {
            const themeAssignments = assignmentsMap[t.id] || []
            return {
                ...t,
                assignments: themeAssignments.map(a => ({
                    tenantId: a.tenantId,
                    tenant: tenantMap[a.tenantId] || null,
                    createdAt: a.createdAt
                }))
            }
        })

        res.json({ themes: result })
    } catch (e) {
        logger.error('[customTheme.list]', e)
        res.status(500).json({ error: e.message })
    }
}

// ─── 平台超管：创建 ─────────────────────────────────────────
exports.createTheme = async (req, res) => {
    try {
        const { key, name, description, status = 'ACTIVE' } = req.body
        if (!key || !name) {
            return res.status(400).json({ error: 'key 和名称必填' })
        }
        if (!/^[a-z0-9-]+$/.test(key)) {
            return res.status(400).json({ error: 'key 只能包含小写字母、数字、短横线' })
        }
        const exists = await prisma.customTheme.findUnique({ where: { key } })
        if (exists) return res.status(409).json({ error: '该 key 已存在' })

        // 目录名 = key（约定）
        const theme = await prisma.customTheme.create({
            data: { key, name, description, componentDir: key, status }
        })
        res.json({ theme })
    } catch (e) {
        logger.error('[customTheme.create]', e)
        res.status(500).json({ error: e.message })
    }
}

// ─── 平台超管：更新 ─────────────────────────────────────────
exports.updateTheme = async (req, res) => {
    try {
        const { id } = req.params
        const { name, description, status } = req.body
        const data = {}
        if (name !== undefined) data.name = name
        if (description !== undefined) data.description = description
        if (status !== undefined) data.status = status

        const theme = await prisma.customTheme.update({ where: { id }, data })
        res.json({ theme })
    } catch (e) {
        logger.error('[customTheme.update]', e)
        res.status(500).json({ error: e.message })
    }
}

// ─── 平台超管：删除 ─────────────────────────────────────────
exports.deleteTheme = async (req, res) => {
    try {
        const { id } = req.params
        const theme = await prisma.customTheme.findUnique({ where: { id } })
        if (!theme) return res.status(404).json({ error: '主题不存在' })

        // 把使用此主题的所有商户切回默认 fresh
        const tenantIds = (await prisma.customThemeAssignment.findMany({
            where: { themeId: id },
            select: { tenantId: true }
        })).map(a => a.tenantId)

        if (tenantIds.length > 0) {
            const slugs = (await prisma.tenant.findMany({
                where: { id: { in: tenantIds } },
                select: { shopSlug: true }
            })).map(t => t.shopSlug).filter(Boolean)

            const customSkin = `custom:${theme.key}`
            await prisma.tenant.updateMany({
                where: { id: { in: tenantIds }, shopSkin: customSkin },
                data: { shopSkin: 'fresh' }
            })
        }

        await prisma.customTheme.delete({ where: { id } })
        res.json({ message: '已删除' })
    } catch (e) {
        logger.error('[customTheme.delete]', e)
        res.status(500).json({ error: e.message })
    }
}

// ─── 平台超管：分配商户 ─────────────────────────────────────
exports.assignTenants = async (req, res) => {
    try {
        const { id } = req.params
        const { tenantIds } = req.body // 完整列表（覆盖式）

        const theme = await prisma.customTheme.findUnique({ where: { id } })
        if (!theme) return res.status(404).json({ error: '主题不存在' })

        if (!Array.isArray(tenantIds)) return res.status(400).json({ error: 'tenantIds 必须为数组' })

        // 删除已撤销的，添加新增的
        await prisma.$transaction([
            prisma.customThemeAssignment.deleteMany({
                where: {
                    themeId: id,
                    tenantId: { notIn: tenantIds.length > 0 ? tenantIds : ['__none__'] }
                }
            }),
            ...tenantIds.map(tid =>
                prisma.customThemeAssignment.upsert({
                    where: { themeId_tenantId: { themeId: id, tenantId: tid } },
                    create: { themeId: id, tenantId: tid },
                    update: {}
                })
            )
        ])

        // 撤销分配的商户如果还在用此主题，自动切回 fresh
        const customSkin = `custom:${theme.key}`
        await prisma.tenant.updateMany({
            where: { shopSkin: customSkin, id: { notIn: tenantIds.length > 0 ? tenantIds : ['__none__'] } },
            data: { shopSkin: 'fresh' }
        })

        res.json({ message: '已更新分配' })
    } catch (e) {
        logger.error('[customTheme.assign]', e)
        res.status(500).json({ error: e.message })
    }
}

// ─── 商户后台：可用主题列表（公共 + 已分配的定制主题）──────
exports.getAvailableThemes = async (req, res) => {
    try {
        if (!req.tenantId) return res.json({ public: PUBLIC_SKINS, custom: [] })

        const activeThemes = await prisma.customTheme.findMany({
            where: { status: 'ACTIVE' }
        })

        const assignments = await prisma.customThemeAssignment.findMany({
            where: { tenantId: req.tenantId }
        })

        const assignedThemeIds = new Set(assignments.map(a => a.themeId))
        const assignedActiveThemes = activeThemes.filter(t => assignedThemeIds.has(t.id))

        // 基础公共主题，按套餐过滤（沿用现有 plan_config.skins 逻辑）
        const tenant = await prisma.tenant.findUnique({
            where: { id: req.tenantId },
            select: { shopSlug: true }
        })
        const shop = tenant ? await prisma.shop.findUnique({
            where: { slug: tenant.shopSlug },
            select: { plan: true }
        }) : null

        let publicSkins = [...PUBLIC_SKINS]
        try {
            const setting = await prisma.platformSetting.findUnique({ where: { key: 'plan_config' } })
            if (setting?.value && shop) {
                const config = JSON.parse(setting.value)
                const planKey = shop.plan === 'FREE' ? 'PRO' : shop.plan
                const planInfo = (config.plans || []).find(p => p.key === planKey)
                if (planInfo?.features?.skins) {
                    if (Array.isArray(planInfo.features.skins)) {
                        publicSkins = planInfo.features.skins.filter(s => PUBLIC_SKINS.includes(s))
                    } else if (planInfo.features.skins !== '全部') {
                        publicSkins = PUBLIC_SKINS.includes(planInfo.features.skins) ? [planInfo.features.skins] : []
                    }
                }
            }
        } catch {}

        res.json({
            public: publicSkins,
            custom: assignedActiveThemes.map(t => ({
                key: t.key,
                name: t.name,
                description: t.description
            }))
        })
    } catch (e) {
        logger.error('[customTheme.available]', e)
        res.status(500).json({ error: e.message })
    }
}

// 主题切换校验工具：返回是否允许该 tenant 使用 skin
exports.canUseSkin = async (tenantId, skin) => {
    if (!skin) return false
    if (PUBLIC_SKINS.includes(skin)) return true
    if (skin.startsWith('custom:')) {
        const themeKey = skin.split(':')[1]
        const theme = await prisma.customTheme.findFirst({
            where: {
                key: themeKey,
                status: 'ACTIVE'
            }
        })
        if (!theme) return false
        const assigned = await prisma.customThemeAssignment.findFirst({
            where: {
                themeId: theme.id,
                tenantId
            }
        })
        return !!assigned
    }
    return false
}

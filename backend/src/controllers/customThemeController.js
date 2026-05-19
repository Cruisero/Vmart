/**
 * 定制主题管理（平台超管）+ 商户可用主题查询
 */
const prisma = require('../config/database')
const logger = require('../utils/logger')

// ─── 平台超管：列表 ─────────────────────────────────────────
exports.listThemes = async (req, res) => {
    try {
        const themes = await prisma.customTheme.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                assignments: {
                    select: { tenantId: true, createdAt: true }
                }
            }
        })

        // 反查 tenant 信息
        const tenantIds = [...new Set(themes.flatMap(t => t.assignments.map(a => a.tenantId)))]
        const tenants = tenantIds.length ? await prisma.tenant.findMany({
            where: { id: { in: tenantIds } },
            select: { id: true, shopName: true, shopSlug: true, user: { select: { email: true } } }
        }) : []
        const tenantMap = Object.fromEntries(tenants.map(t => [t.id, t]))

        const result = themes.map(t => ({
            ...t,
            assignments: t.assignments.map(a => ({
                tenantId: a.tenantId,
                tenant: tenantMap[a.tenantId] || null,
                createdAt: a.createdAt
            }))
        }))

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
        if (!req.tenantId) return res.json({ public: ['fresh', 'zen', 'classic'], custom: [] })

        const assignments = await prisma.customThemeAssignment.findMany({
            where: { tenantId: req.tenantId, theme: { status: 'ACTIVE' } },
            include: { theme: true }
        })

        // 基础公共主题，按套餐过滤（沿用现有 plan_config.skins 逻辑）
        const tenant = await prisma.tenant.findUnique({
            where: { id: req.tenantId },
            select: { shopSlug: true }
        })
        const shop = tenant ? await prisma.shop.findUnique({
            where: { slug: tenant.shopSlug },
            select: { plan: true }
        }) : null

        let publicSkins = ['fresh', 'zen', 'classic']
        try {
            const setting = await prisma.platformSetting.findUnique({ where: { key: 'plan_config' } })
            if (setting?.value && shop) {
                const config = JSON.parse(setting.value)
                const planKey = shop.plan === 'FREE' ? 'PRO' : shop.plan
                const planInfo = (config.plans || []).find(p => p.key === planKey)
                if (planInfo?.features?.skins) {
                    if (Array.isArray(planInfo.features.skins)) {
                        publicSkins = planInfo.features.skins
                    } else if (planInfo.features.skins !== '全部') {
                        publicSkins = [planInfo.features.skins]
                    }
                }
            }
        } catch {}

        // 过滤私有公共主题：不在白名单中的商户看不到
        const privateAllowlist = await getPrivateSkinsAllowlist()
        publicSkins = publicSkins.filter(skin => {
            if (!privateAllowlist[skin]) return true // 非私有
            return privateAllowlist[skin].includes(req.tenantId)
        })

        res.json({
            public: publicSkins,
            custom: assignments.map(a => ({
                key: a.theme.key,
                name: a.theme.name,
                description: a.theme.description
            }))
        })
    } catch (e) {
        logger.error('[customTheme.available]', e)
        res.status(500).json({ error: e.message })
    }
}

// ─── 私有公共主题 allowlist 管理 ─────────────────────────────
const PRIVATE_SKINS_KEY = 'private_skins_allowlist'

async function getPrivateSkinsAllowlist() {
    try {
        const setting = await prisma.platformSetting.findUnique({ where: { key: PRIVATE_SKINS_KEY } })
        if (!setting?.value) return {}
        return JSON.parse(setting.value) || {}
    } catch {
        return {}
    }
}

exports.getPrivateSkins = async (req, res) => {
    try {
        const allowlist = await getPrivateSkinsAllowlist()

        // 反查 tenant 详情用于展示
        const allTenantIds = [...new Set(Object.values(allowlist).flat())]
        const tenants = allTenantIds.length ? await prisma.tenant.findMany({
            where: { id: { in: allTenantIds } },
            select: { id: true, shopName: true, shopSlug: true, user: { select: { email: true } } }
        }) : []
        const tenantMap = Object.fromEntries(tenants.map(t => [t.id, t]))

        const result = {}
        Object.entries(allowlist).forEach(([skin, tenantIds]) => {
            result[skin] = tenantIds.map(tid => ({
                tenantId: tid,
                tenant: tenantMap[tid] || null
            }))
        })

        res.json({ skins: result })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
}

exports.assignPrivateSkin = async (req, res) => {
    try {
        const { skin } = req.params
        const { tenantIds } = req.body
        if (!['fresh', 'zen', 'classic'].includes(skin)) {
            return res.status(400).json({ error: '只能将公共主题设为私有' })
        }
        if (!Array.isArray(tenantIds)) return res.status(400).json({ error: 'tenantIds 必须为数组' })

        const allowlist = await getPrivateSkinsAllowlist()

        if (tenantIds.length === 0) {
            // 清空 = 取消私有，恢复公开
            delete allowlist[skin]
        } else {
            allowlist[skin] = tenantIds
        }

        await prisma.platformSetting.upsert({
            where: { key: PRIVATE_SKINS_KEY },
            create: { key: PRIVATE_SKINS_KEY, value: JSON.stringify(allowlist), description: '私有公共主题白名单' },
            update: { value: JSON.stringify(allowlist) }
        })

        // 已使用此私有主题但被踢出白名单的商户 → 切回 fresh
        if (tenantIds.length > 0) {
            await prisma.tenant.updateMany({
                where: { shopSkin: skin, id: { notIn: tenantIds } },
                data: { shopSkin: 'fresh' }
            })
        }

        res.json({ message: '已更新', skin, count: tenantIds.length })
    } catch (e) {
        logger.error('[customTheme.assignPrivateSkin]', e)
        res.status(500).json({ error: e.message })
    }
}

// 主题切换校验工具：返回是否允许该 tenant 使用 skin
exports.canUseSkin = async (tenantId, skin) => {
    if (!skin) return false
    if (['fresh', 'zen', 'classic'].includes(skin)) {
        // 检查私有 allowlist
        const allowlist = await getPrivateSkinsAllowlist()
        if (allowlist[skin]) {
            return allowlist[skin].includes(tenantId)
        }
        return true
    }
    if (skin.startsWith('custom:')) {
        const themeKey = skin.split(':')[1]
        const allowed = await prisma.customTheme.findFirst({
            where: {
                key: themeKey,
                status: 'ACTIVE',
                assignments: { some: { tenantId } }
            }
        })
        return !!allowed
    }
    return false
}

/**
 * 平台控制器
 * 处理商户注册/登录、商城管理、平台超管操作
 */
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const prisma = require('../config/database')
const { generateUniqueSlug } = require('../utils/slugGenerator')
const { generatePlatformToken } = require('../middleware/platformAuth')

// 为商户生成管理后台用的 User JWT（让现有 admin API 可直接使用）
function generateAdminToken(user) {
    return jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    )
}

// ─── 获取平台配置（如试用时长）───────────────────────────────
async function getPlatformConfig(key, defaultVal) {
    const s = await prisma.platformSetting.findUnique({ where: { key } })
    return s?.value ?? defaultVal
}

// ─── 商户注册（注册即建店）──────────────────────────────────
exports.register = async (req, res) => {
    try {
        const { email, password, shopName, otpCode } = req.body
        if (!email || !password || !shopName) {
            return res.status(400).json({ error: '邮箱、密码、店铺名称均为必填' })
        }
        if (password.length < 6) {
            return res.status(400).json({ error: '密码至少 6 位' })
        }

        // 校验 OTP（如开关开启）
        const otpEnabled = (await getPlatformConfig('merchant_register_otp', 'false')) === 'true'
        if (otpEnabled) {
            if (!otpCode) return res.status(400).json({ error: '请输入邮箱验证码' })
            const otpService = require('../services/otpService')
            const r = await otpService.verifyOtp({ email, code: otpCode, scope: 'merchant_register' })
            if (!r.ok) return res.status(400).json({ error: r.error })
        }

        const exists = await prisma.merchant.findUnique({ where: { email } })
        if (exists) return res.status(409).json({ error: '该邮箱已注册' })

        const hashedPwd = await bcrypt.hash(password, 10)
        const slug = await generateUniqueSlug()

        // 读取平台配置的试用时长（小时），默认 24
        const trialHours = parseInt(await getPlatformConfig('trial_hours', '24'))
        const trialEndsAt = new Date(Date.now() + trialHours * 3600 * 1000)

        const merchant = await prisma.merchant.create({
            data: {
                email,
                password: hashedPwd,
                shopName,
                shop: {
                    create: {
                        slug,
                        name: shopName,
                        trialEndsAt,
                        plan: 'FREE',
                        status: 'ACTIVE'
                    }
                }
            },
            include: { shop: true }
        })

        // 同步创建/确认 User（强制 TENANT_ADMIN 角色），用于现有 admin 后台鉴权
        let adminUser = await prisma.user.findUnique({ where: { email } })
        if (!adminUser) {
            adminUser = await prisma.user.create({
                data: {
                    email,
                    password: hashedPwd,
                    username: shopName,
                    role: 'TENANT_ADMIN',
                    emailVerified: true,
                }
            })
        } else if (adminUser.role !== 'TENANT_ADMIN') {
            // 已存在但角色不对，升级为 TENANT_ADMIN（保证 JWT 携带正确角色）
            adminUser = await prisma.user.update({
                where: { id: adminUser.id },
                data: { role: 'TENANT_ADMIN' }
            })
        }

        // 同步创建 Tenant（与 User 1:1 绑定），让商品/订单能按 tenantId 过滤
        let tenantRecord = await prisma.tenant.findUnique({ where: { userId: adminUser.id } })
        if (!tenantRecord) {
            tenantRecord = await prisma.tenant.create({
                data: {
                    userId: adminUser.id,
                    shopName,
                    shopSlug: slug,
                    shopSkin: 'fresh',
                    status: 'ACTIVE'
                }
            })
            await prisma.tenantSetting.create({ data: { tenantId: tenantRecord.id } })
        } else if (tenantRecord.status !== 'ACTIVE') {
            // 确保 Tenant 状态为 ACTIVE，否则 isAdmin 中间件会返回 403
            await prisma.tenant.update({ where: { id: tenantRecord.id }, data: { status: 'ACTIVE' } })
        }

        const token = generatePlatformToken(merchant)
        const adminToken = generateAdminToken(adminUser)

        // 平台超管异步通知
        try {
            const manNotify = require('../services/manNotifyService')
            manNotify.notifyNewMerchant({ email: merchant.email, shopName }).catch(() => {})
        } catch {}

        return res.status(201).json({
            message: '注册成功，商城已开通',
            token,
            adminToken,
            // adminUser 中的 id/role 是 JWT 签名来源，前端应用此字段写入 authStore
            adminUser: { id: adminUser.id, email: adminUser.email, username: adminUser.username, role: adminUser.role },
            merchant: {
                id: merchant.id,
                email: merchant.email,
                shopName: merchant.shopName,
                isSuperAdmin: merchant.isSuperAdmin
            },
            shop: {
                id: merchant.shop.id,
                slug: merchant.shop.slug,
                name: merchant.shop.name,
                plan: merchant.shop.plan,
                trialEndsAt: merchant.shop.trialEndsAt,
                status: merchant.shop.status
            }
        })
    } catch (e) {
        console.error('[platform.register]', e)
        res.status(500).json({ error: e.message })
    }
}

// ─── 商户登录 ────────────────────────────────────────────────
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body
        if (!email || !password) return res.status(400).json({ error: '请填写邮箱和密码' })

        const merchant = await prisma.merchant.findUnique({
            where: { email },
            include: { shop: true }
        })
        if (!merchant) return res.status(401).json({ error: '邮箱或密码错误' })

        const valid = await bcrypt.compare(password, merchant.password)
        if (!valid) return res.status(401).json({ error: '邮箱或密码错误' })

        // 查找对应的 admin User 记录，确保角色为 TENANT_ADMIN
        let adminUser = await prisma.user.findUnique({ where: { email: merchant.email } })
        if (!adminUser) {
            adminUser = await prisma.user.create({
                data: {
                    email: merchant.email,
                    password: merchant.password,
                    username: merchant.shopName,
                    role: 'TENANT_ADMIN',
                    emailVerified: true,
                }
            })
        } else if (adminUser.role !== 'TENANT_ADMIN') {
            adminUser = await prisma.user.update({
                where: { id: adminUser.id },
                data: { role: 'TENANT_ADMIN' }
            })
        }

        // 确保 Tenant 存在且 ACTIVE（Login 场景下也要保证）
        let tenantRec = await prisma.tenant.findUnique({ where: { userId: adminUser.id } })
        if (!tenantRec && merchant.shop) {
            tenantRec = await prisma.tenant.create({
                data: {
                    userId: adminUser.id,
                    shopName: merchant.shopName,
                    shopSlug: merchant.shop.slug,
                    shopSkin: 'fresh',
                    status: 'ACTIVE'
                }
            })
            await prisma.tenantSetting.create({ data: { tenantId: tenantRec.id } })
        } else if (tenantRec && tenantRec.status !== 'ACTIVE') {
            await prisma.tenant.update({ where: { id: tenantRec.id }, data: { status: 'ACTIVE' } })
        }

        const token = generatePlatformToken(merchant)
        const adminToken = generateAdminToken(adminUser)
        return res.json({
            message: '登录成功',
            token,
            adminToken,
            adminUser: { id: adminUser.id, email: adminUser.email, username: adminUser.username, role: adminUser.role },
            merchant: {
                id: merchant.id,
                email: merchant.email,
                shopName: merchant.shopName,
                isSuperAdmin: merchant.isSuperAdmin
            },
            shop: merchant.shop ? {
                id: merchant.shop.id,
                slug: merchant.shop.slug,
                name: merchant.shop.name,
                plan: merchant.shop.plan,
                trialEndsAt: merchant.shop.trialEndsAt,
                planExpiresAt: merchant.shop.planExpiresAt,
                status: merchant.shop.status,
                customDomain: merchant.shop.customDomain,
                logo: merchant.shop.logo,
                skin: merchant.shop.skin
            } : null
        })
    } catch (e) {
        console.error('[platform.login]', e)
        res.status(500).json({ error: e.message })
    }
}

// ─── 获取当前商户信息 ─────────────────────────────────────────
exports.getMe = async (req, res) => {
    try {
        const merchant = await prisma.merchant.findUnique({
            where: { id: req.merchant.id },
            include: { shop: true }
        })
        res.json({
            merchant: {
                id: merchant.id,
                email: merchant.email,
                shopName: merchant.shopName,
                isSuperAdmin: merchant.isSuperAdmin,
                createdAt: merchant.createdAt
            },
            shop: merchant.shop
        })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
}

// ─── 更新商城基础信息 ─────────────────────────────────────────
exports.updateShop = async (req, res) => {
    try {
        const { name, logo, notice, skin, contactEmail, customDomain, settings } = req.body
        const shop = await prisma.shop.update({
            where: { merchantId: req.merchant.id },
            data: {
                ...(name && { name }),
                ...(logo !== undefined && { logo }),
                ...(notice !== undefined && { notice }),
                ...(skin && { skin }),
                ...(contactEmail !== undefined && { contactEmail }),
                ...(customDomain !== undefined && { customDomain }),
                ...(settings !== undefined && { settings })
            }
        })
        res.json({ message: '保存成功', shop })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
}

// ─── 更新商户账号信息（邮箱/密码）───────────────────────────
exports.updateAccount = async (req, res) => {
    try {
        const { shopName, currentPassword, newPassword } = req.body
        const data = {}
        if (shopName) data.shopName = shopName

        if (newPassword) {
            if (!currentPassword) return res.status(400).json({ error: '请输入当前密码' })
            const merchant = await prisma.merchant.findUnique({ where: { id: req.merchant.id } })
            const valid = await bcrypt.compare(currentPassword, merchant.password)
            if (!valid) return res.status(400).json({ error: '当前密码错误' })
            data.password = await bcrypt.hash(newPassword, 10)
        }

        await prisma.merchant.update({ where: { id: req.merchant.id }, data })
        res.json({ message: '账号信息已更新' })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
}

// ─── 平台超管：获取商户列表 ──────────────────────────────────
exports.listMerchants = async (req, res) => {
    try {
        const { page = 1, limit = 20, status, plan, search } = req.query
        const where = {}
        if (status || plan) {
            where.shop = {}
            if (status) where.shop.status = status
            if (plan) where.shop.plan = plan
        }
        if (search) {
            where.OR = [
                { email: { contains: search } },
                { shopName: { contains: search } },
                { shop: { slug: { contains: search } } }
            ]
        }

        const [total, merchants] = await Promise.all([
            prisma.merchant.count({ where }),
            prisma.merchant.findMany({
                where,
                include: { shop: { select: { id: true, slug: true, name: true, plan: true, status: true, trialEndsAt: true, planExpiresAt: true, createdAt: true } } },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: parseInt(limit)
            })
        ])

        // 关联 tenantId
        const slugs = merchants.map(m => m.shop?.slug).filter(Boolean)
        const tenants = slugs.length ? await prisma.tenant.findMany({
            where: { shopSlug: { in: slugs } },
            select: { id: true, shopSlug: true }
        }) : []
        const tenantBySlug = Object.fromEntries(tenants.map(t => [t.shopSlug, t.id]))
        const enriched = merchants.map(m => ({
            ...m,
            tenantId: m.shop?.slug ? tenantBySlug[m.shop.slug] || null : null
        }))

        res.json({ total, page: parseInt(page), merchants: enriched })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
}

// ─── 平台超管：修改商户套餐/状态 ─────────────────────────────
exports.updateMerchant = async (req, res) => {
    try {
        const { id } = req.params
        const { plan, status, planExpiresAt, months } = req.body

        const merchant = await prisma.merchant.findUnique({ where: { id }, include: { shop: true } })
        if (!merchant) return res.status(404).json({ error: '商户不存在' })

        const shopData = {}
        if (status) shopData.status = status
        if (plan) shopData.plan = plan
        if (planExpiresAt) shopData.planExpiresAt = new Date(planExpiresAt)

        // 如果指定延期月数，在现有到期时间基础上顺延
        if (months && merchant.shop.planExpiresAt) {
            const base = new Date(merchant.shop.planExpiresAt)
            base.setMonth(base.getMonth() + parseInt(months))
            shopData.planExpiresAt = base
        } else if (months) {
            const base = new Date()
            base.setMonth(base.getMonth() + parseInt(months))
            shopData.planExpiresAt = base
        }

        await prisma.shop.update({ where: { merchantId: id }, data: shopData })

        // 同步 Tenant 状态（让冻结/封禁立即对店面生效）
        if (status) {
            const tenantStatusMap = {
                ACTIVE: 'ACTIVE',
                SUSPENDED: 'SUSPENDED',
                EXPIRED: 'SUSPENDED'
            }
            const tenantStatus = tenantStatusMap[status]
            if (tenantStatus && merchant.shop?.slug) {
                try {
                    await prisma.tenant.updateMany({
                        where: { shopSlug: merchant.shop.slug },
                        data: { status: tenantStatus }
                    })
                } catch {}
            }
        }

        res.json({ message: '已更新' })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
}

// ─── 平台超管：获取平台配置 ──────────────────────────────────
exports.getPlatformSettings = async (req, res) => {
    try {
        const settings = await prisma.platformSetting.findMany()
        const map = {}
        settings.forEach(s => { map[s.key] = s.value })
        res.json({ settings: map })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
}

// ─── 平台超管：更新平台配置 ──────────────────────────────────
exports.updatePlatformSettings = async (req, res) => {
    try {
        const updates = req.body // { key: value, ... }
        const ops = Object.entries(updates).map(([key, value]) =>
            prisma.platformSetting.upsert({
                where: { key },
                create: { key, value: String(value) },
                update: { value: String(value) }
            })
        )
        await Promise.all(ops)
        res.json({ message: '配置已保存' })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
}

// ─── 平台超管：公告管理 ──────────────────────────────────────
exports.getAnnouncements = async (req, res) => {
    try {
        const announcements = await prisma.platformSetting.findMany({
            where: { key: { startsWith: 'announcement_' } },
            orderBy: { updatedAt: 'desc' }
        })
        // 解析公告数据
        const list = announcements.map(a => {
            try { return { id: a.id, key: a.key, ...JSON.parse(a.value) } }
            catch { return { id: a.id, key: a.key, title: a.value, content: '', active: true } }
        })
        res.json({ announcements: list })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
}

exports.createAnnouncement = async (req, res) => {
    try {
        const { title, content, active = true } = req.body
        if (!title) return res.status(400).json({ error: '标题不能为空' })

        const key = `announcement_${Date.now()}`
        await prisma.platformSetting.create({
            data: {
                key,
                value: JSON.stringify({ title, content, active, createdAt: new Date().toISOString() }),
                description: '平台公告'
            }
        })
        res.json({ message: '公告已发布' })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
}

exports.updateAnnouncement = async (req, res) => {
    try {
        const { id } = req.params
        const { title, content, active } = req.body

        const existing = await prisma.platformSetting.findUnique({ where: { id } })
        if (!existing) return res.status(404).json({ error: '公告不存在' })

        let data = {}
        try { data = JSON.parse(existing.value) } catch {}
        if (title !== undefined) data.title = title
        if (content !== undefined) data.content = content
        if (active !== undefined) data.active = active

        await prisma.platformSetting.update({
            where: { id },
            data: { value: JSON.stringify(data) }
        })
        res.json({ message: '公告已更新' })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
}

exports.deleteAnnouncement = async (req, res) => {
    try {
        await prisma.platformSetting.delete({ where: { id: req.params.id } })
        res.json({ message: '公告已删除' })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
}

// ─── 平台超管：备份管理 ──────────────────────────────────────
exports.getBackupInfo = async (req, res) => {
    try {
        const backupService = require('../services/backupService')
        const status = backupService.getBackupStatus()
        const settings = await backupService.getBackupSettings()
        res.json({ ...status, settings })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
}

exports.triggerBackup = async (req, res) => {
    try {
        const backupService = require('../services/backupService')
        const result = await backupService.runBackup()
        if (result) {
            res.json({ message: '备份完成', ...result })
        } else {
            res.status(500).json({ error: '备份失败' })
        }
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
}

// ─── 商户数据导出 ────────────────────────────────────────────
exports.exportMerchantData = async (req, res) => {
    try {
        const merchant = req.merchant
        const shop = await prisma.shop.findUnique({ where: { merchantId: merchant.id } })
        if (!shop) return res.status(404).json({ error: '商城不存在' })

        // 查找对应的 tenant
        const tenant = await prisma.tenant.findFirst({ where: { shopSlug: shop.slug } })
        if (!tenant) return res.status(404).json({ error: '商户数据不存在' })

        const { type = 'orders' } = req.query

        if (type === 'orders') {
            const orders = await prisma.order.findMany({
                where: { tenantId: tenant.id },
                include: { cards: { select: { content: true } } },
                orderBy: { createdAt: 'desc' },
                take: 5000
            })
            const csv = [
                '订单号,邮箱,商品名,数量,单价,总额,状态,支付方式,创建时间,卡密'
            ]
            orders.forEach(o => {
                const cards = o.cards.map(c => c.content).join('|')
                csv.push(`${o.orderNo},${o.email},${o.productName},${o.quantity},${o.unitPrice},${o.totalAmount},${o.status},${o.paymentMethod || ''},${o.createdAt.toISOString()},${cards}`)
            })
            res.setHeader('Content-Type', 'text/csv; charset=utf-8')
            res.setHeader('Content-Disposition', `attachment; filename=orders_${shop.slug}_${Date.now()}.csv`)
            return res.send('\uFEFF' + csv.join('\n'))
        }

        if (type === 'products') {
            const products = await prisma.product.findMany({
                where: { tenantId: tenant.id },
                include: { _count: { select: { cards: { where: { status: 'AVAILABLE' } } } } },
                orderBy: { createdAt: 'desc' }
            })
            const csv = ['商品名,价格,库存,已售,状态,创建时间']
            products.forEach(p => {
                csv.push(`${p.name},${p.price},${p._count.cards},${p.soldCount},${p.status},${p.createdAt.toISOString()}`)
            })
            res.setHeader('Content-Type', 'text/csv; charset=utf-8')
            res.setHeader('Content-Disposition', `attachment; filename=products_${shop.slug}_${Date.now()}.csv`)
            return res.send('\uFEFF' + csv.join('\n'))
        }

        if (type === 'cards') {
            const cards = await prisma.card.findMany({
                where: { tenantId: tenant.id },
                include: { product: { select: { name: true } } },
                orderBy: { createdAt: 'desc' },
                take: 10000
            })
            const csv = ['商品名,卡密内容,状态,创建时间,售出时间']
            cards.forEach(c => {
                csv.push(`${c.product?.name || ''},${c.content},${c.status},${c.createdAt.toISOString()},${c.soldAt?.toISOString() || ''}`)
            })
            res.setHeader('Content-Type', 'text/csv; charset=utf-8')
            res.setHeader('Content-Disposition', `attachment; filename=cards_${shop.slug}_${Date.now()}.csv`)
            return res.send('\uFEFF' + csv.join('\n'))
        }

        res.status(400).json({ error: '不支持的导出类型，可选：orders, products, cards' })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
}

// ─── 平台超管：仪表盘统计 ────────────────────────────────────
exports.getPlatformStats = async (req, res) => {
    try {
        const now = new Date()
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

        const [total, active, expired, todayNew, expiringIn7Days, totalRevenue, monthRevenue] = await Promise.all([
            prisma.shop.count(),
            prisma.shop.count({ where: { status: 'ACTIVE' } }),
            prisma.shop.count({ where: { status: 'EXPIRED' } }),
            prisma.merchant.count({ where: { createdAt: { gte: today } } }),
            prisma.shop.count({
                where: {
                    planExpiresAt: {
                        gte: now,
                        lte: new Date(now.getTime() + 7 * 86400000)
                    }
                }
            }),
            prisma.planOrder.aggregate({
                where: { paymentStatus: 'PAID' },
                _sum: { amount: true }
            }),
            prisma.planOrder.aggregate({
                where: {
                    paymentStatus: 'PAID',
                    paidAt: { gte: new Date(now.getFullYear(), now.getMonth(), 1) }
                },
                _sum: { amount: true }
            })
        ])

        res.json({
            total, active, expired, todayNew, expiringIn7Days,
            totalRevenue: Number(totalRevenue._sum.amount || 0),
            monthRevenue: Number(monthRevenue._sum.amount || 0)
        })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
}

// ─── 平台超管：趋势数据（最近30天）─────────────────────────
exports.getPlatformTrend = async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 30
        const now = new Date()
        const startDate = new Date(now)
        startDate.setDate(startDate.getDate() - days + 1)
        startDate.setHours(0, 0, 0, 0)

        // 获取每日新增商户
        const merchants = await prisma.merchant.findMany({
            where: { createdAt: { gte: startDate } },
            select: { createdAt: true }
        })

        // 获取每日套餐收入
        const planOrders = await prisma.planOrder.findMany({
            where: { paymentStatus: 'PAID', paidAt: { gte: startDate } },
            select: { paidAt: true, amount: true }
        })

        // 生成日期数组
        const trend = []
        for (let i = 0; i < days; i++) {
            const d = new Date(startDate)
            d.setDate(d.getDate() + i)
            const dateStr = d.toISOString().split('T')[0]

            const dayMerchants = merchants.filter(m =>
                m.createdAt.toISOString().split('T')[0] === dateStr
            ).length

            const dayRevenue = planOrders
                .filter(o => o.paidAt && o.paidAt.toISOString().split('T')[0] === dateStr)
                .reduce((sum, o) => sum + Number(o.amount), 0)

            trend.push({ date: dateStr, merchants: dayMerchants, revenue: dayRevenue })
        }

        res.json({ trend })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
}

// ─── 商城公开配置（店面加载用）──────────────────────────────
exports.getShopPublicConfig = async (req, res) => {
    try {
        const { slug } = req.params
        const shop = await prisma.shop.findUnique({
            where: { slug },
            select: { id: true, name: true, logo: true, notice: true, skin: true, status: true, slug: true, contactEmail: true }
        })
        if (!shop) return res.status(404).json({ error: '商城不存在' })
        res.json({ shop })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
}

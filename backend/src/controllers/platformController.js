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
        const parsedHours = parseInt(await getPlatformConfig('trial_hours', '24'))
        const trialHours = isNaN(parsedHours) ? 24 : parsedHours
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
                { shop: { slug: { contains: search } } },
                { shop: { customDomain: { contains: search } } }
            ]
        }

        const [total, merchants] = await Promise.all([
            prisma.merchant.count({ where }),
            prisma.merchant.findMany({
                where,
                include: { shop: { select: { id: true, slug: true, name: true, plan: true, status: true, trialEndsAt: true, planExpiresAt: true, createdAt: true, customDomain: true } } },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: parseInt(limit)
            })
        ])

        // 关联 tenantId 及 KYC 信息
        const slugs = merchants.map(m => m.shop?.slug).filter(Boolean)
        const tenants = slugs.length ? await prisma.tenant.findMany({
            where: { shopSlug: { in: slugs } },
            select: {
                id: true,
                shopSlug: true,
                kycStatus: true,
                kycRealName: true,
                kycIdNumber: true,
                kycRejectReason: true,
                kycRequestedAt: true,
                kycAuditLog: true,
                kycPhotoFile: true
            }
        }) : []
        const tenantMap = Object.fromEntries(tenants.map(t => [t.shopSlug, t]))
        const enriched = merchants.map(m => {
            const tenant = m.shop?.slug ? tenantMap[m.shop.slug] || null : null
            return {
                ...m,
                tenantId: tenant ? tenant.id : null,
                kycStatus: tenant ? tenant.kycStatus : 'UNVERIFIED',
                kycRealName: tenant ? tenant.kycRealName : null,
                kycIdNumber: tenant ? tenant.kycIdNumber : null,
                kycRejectReason: tenant ? tenant.kycRejectReason : null,
                kycRequestedAt: tenant ? tenant.kycRequestedAt : null,
                kycAuditLog: tenant ? tenant.kycAuditLog : null,
                kycPhotoFile: tenant ? tenant.kycPhotoFile : null
            }
        })

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

        const { rankingRange = 'all' } = req.query
        let rankingStartDate = null

        if (rankingRange === 'today' || rankingRange === 'day') {
            rankingStartDate = today
        } else if (rankingRange === 'week') {
            rankingStartDate = new Date(now.getTime() - 7 * 24 * 3600 * 1000)
        } else if (rankingRange === 'month') {
            rankingStartDate = new Date(now.getTime() - 30 * 24 * 3600 * 1000)
        }

        // 1. 基础平台统计（商户数、平台套餐订购收入等）
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

        // 2. 全站商户运营 data（总成交额、总订单数、总商品数、总会员数、总访问量）
        const [totalSalesAggregate, totalOrdersCount, totalProductsCount, totalCustomersCount, totalVisitsAggregate] = await Promise.all([
            prisma.order.aggregate({
                where: { status: 'COMPLETED' },
                _sum: { totalAmount: true }
            }),
            prisma.order.count({
                where: { status: 'COMPLETED' }
            }),
            prisma.product.count(),
            prisma.customer.count(),
            prisma.siteVisit ? prisma.siteVisit.aggregate({
                _sum: { visits: true }
            }).catch(() => ({ _sum: { visits: 0 } })) : Promise.resolve({ _sum: { visits: 0 } })
        ])

        // 3. 热销商品排行 Top 5 (若指定区间则从已完成订单聚合)
        let topProducts = []
        if (rankingStartDate) {
            const productSalesGroup = await prisma.order.groupBy({
                by: ['productId'],
                where: {
                    status: 'COMPLETED',
                    createdAt: { gte: rankingStartDate }
                },
                _sum: { quantity: true },
                orderBy: {
                    _sum: { quantity: 'desc' }
                },
                take: 5
            })

            if (productSalesGroup.length > 0) {
                const productIds = productSalesGroup.map(g => g.productId)
                const productsInfo = await prisma.product.findMany({
                    where: { id: { in: productIds } },
                    include: {
                        tenant: {
                            select: { shopName: true, shopSlug: true }
                        }
                    }
                })

                topProducts = productSalesGroup.map(group => {
                    const p = productsInfo.find(x => x.id === group.productId)
                    return {
                        id: group.productId,
                        name: p?.name || '未知商品',
                        price: p ? Number(p.price) : 0,
                        soldCount: group._sum.quantity || 0,
                        shopName: p?.tenant?.shopName || '—',
                        shopSlug: p?.tenant?.shopSlug || ''
                    }
                }).filter(p => p.soldCount > 0)
            }
        } else {
            const topProductsRaw = await prisma.product.findMany({
                orderBy: { soldCount: 'desc' },
                take: 5,
                include: {
                    tenant: {
                        select: { shopName: true, shopSlug: true }
                    }
                }
            })
            topProducts = topProductsRaw.map(p => ({
                id: p.id,
                name: p.name,
                price: Number(p.price),
                soldCount: p.soldCount,
                shopName: p.tenant?.shopName || '—',
                shopSlug: p.tenant?.shopSlug || ''
            }))
        }

        // 4. 销量最高商户 Top 3 (以 COMPLETED 状态订单总额 GMV 排行，加时间区间限制)
        const merchantSalesGroup = await prisma.order.groupBy({
            by: ['tenantId'],
            where: {
                status: 'COMPLETED',
                ...(rankingStartDate && {
                    createdAt: { gte: rankingStartDate }
                })
            },
            _sum: { totalAmount: true },
            _count: { id: true },
            orderBy: {
                _sum: { totalAmount: 'desc' }
            },
            take: 3
        })

        // 解析商户的名称和 Slug
        const topMerchants = await Promise.all(merchantSalesGroup.map(async (group) => {
            if (!group.tenantId) {
                return {
                    tenantId: null,
                    shopName: '平台直营/未知',
                    shopSlug: '',
                    totalSales: Number(group._sum.totalAmount || 0),
                    orderCount: group._count.id
                }
            }
            const tenant = await prisma.tenant.findUnique({
                where: { id: group.tenantId },
                select: { shopName: true, shopSlug: true }
            })
            return {
                tenantId: group.tenantId,
                shopName: tenant?.shopName || '未命名商铺',
                shopSlug: tenant?.shopSlug || '',
                totalSales: Number(group._sum.totalAmount || 0),
                orderCount: group._count.id
            }
        }))

        // 4.5. 商家流量排行 Top 5 (按访问量)
        let topVisits = []
        if (prisma.siteVisit) {
            const visitsGroup = await prisma.siteVisit.groupBy({
                by: ['tenantId'],
                where: {
                    ...(rankingStartDate && {
                        date: { gte: rankingStartDate }
                    })
                },
                _sum: { visits: true },
                orderBy: {
                    _sum: { visits: 'desc' }
                },
                take: 5
            })

            topVisits = await Promise.all(visitsGroup.map(async (group) => {
                if (!group.tenantId || group.tenantId === 'platform') {
                    return {
                        tenantId: 'platform',
                        shopName: '平台直营/主站',
                        shopSlug: '',
                        totalVisits: group._sum.visits || 0
                    }
                }
                const tenant = await prisma.tenant.findUnique({
                    where: { id: group.tenantId },
                    select: { shopName: true, shopSlug: true }
                })
                return {
                    tenantId: group.tenantId,
                    shopName: tenant?.shopName || '未命名商铺',
                    shopSlug: tenant?.shopSlug || '',
                    totalVisits: group._sum.visits || 0
                }
            }))
        }

        // 5. 商家套餐分布
        const planGroup = await prisma.shop.groupBy({
            by: ['plan'],
            _count: { id: true }
        })
        const planBreakdown = planGroup.map(g => ({
            plan: g.plan,
            count: g._count.id
        }))

        // 6. 最近平台套餐订单
        const recentPlanOrdersRaw = await prisma.planOrder.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' },
            include: {
                merchant: {
                    select: {
                        email: true,
                        shopName: true,
                        shop: {
                            select: {
                                slug: true
                            }
                        }
                    }
                }
            }
        })
        const recentPlanOrders = recentPlanOrdersRaw.map(o => ({
            id: o.id,
            plan: o.plan,
            amount: Number(o.amount),
            status: o.paymentStatus,
            merchantEmail: o.merchant?.email || '—',
            merchantShopName: o.merchant?.shopName || '—',
            shopSlug: o.merchant?.shop?.slug || '',
            createdAt: o.createdAt
        }))

        // 7. 全站最近 5 笔交易订单
        const recentStoreOrdersRaw = await prisma.order.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' },
            include: {
                tenant: {
                    select: { shopName: true, shopSlug: true }
                }
            }
        })
        const recentStoreOrders = recentStoreOrdersRaw.map(o => ({
            id: o.id,
            orderNo: o.orderNo,
            productName: o.productName,
            quantity: o.quantity,
            totalAmount: Number(o.totalAmount),
            status: o.status,
            createdAt: o.createdAt,
            shopName: o.tenant?.shopName || '—',
            shopSlug: o.tenant?.shopSlug || ''
        }))

        res.json({
            total, active, expired, todayNew, expiringIn7Days,
            totalRevenue: Number(totalRevenue._sum.amount || 0),
            monthRevenue: Number(monthRevenue._sum.amount || 0),
            // 全站商户统计数据
            shopStats: {
                totalSales: Number(totalSalesAggregate._sum.totalAmount || 0),
                totalOrders: totalOrdersCount,
                totalProducts: totalProductsCount,
                totalCustomers: totalCustomersCount,
                totalVisits: Number(totalVisitsAggregate?._sum?.visits || 0)
            },
            topProducts,
            topMerchants,
            topVisits,
            planBreakdown,
            recentPlanOrders,
            recentStoreOrders
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

        // 获取全站每日完成的商户订单趋势
        const storeOrders = await prisma.order.findMany({
            where: {
                status: 'COMPLETED',
                createdAt: { gte: startDate }
            },
            select: { createdAt: true, totalAmount: true }
        })

        // 获取全站每日新增商品趋势
        const storeProducts = await prisma.product.findMany({
            where: { createdAt: { gte: startDate } },
            select: { createdAt: true }
        })

        // 获取全站每日新增会员趋势
        const storeCustomers = await prisma.customer.findMany({
            where: { createdAt: { gte: startDate } },
            select: { createdAt: true }
        })

        // 获取全站每日访问量趋势
        const storeVisits = prisma.siteVisit ? await prisma.siteVisit.findMany({
            where: { date: { gte: startDate } },
            select: { date: true, visits: true }
        }).catch(() => []) : []

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

            const dayStoreSales = storeOrders
                .filter(o => o.createdAt.toISOString().split('T')[0] === dateStr)
                .reduce((sum, o) => sum + Number(o.totalAmount || 0), 0)

            const dayStoreOrders = storeOrders
                .filter(o => o.createdAt.toISOString().split('T')[0] === dateStr)
                .length

            const dayStoreProducts = storeProducts
                .filter(p => p.createdAt.toISOString().split('T')[0] === dateStr)
                .length

            const dayStoreCustomers = storeCustomers
                .filter(c => c.createdAt.toISOString().split('T')[0] === dateStr)
                .length

            const dayStoreVisits = storeVisits
                .filter(v => v.date && v.date.toISOString().split('T')[0] === dateStr)
                .reduce((sum, v) => sum + v.visits, 0)

            trend.push({
                date: dateStr,
                merchants: dayMerchants,
                revenue: Number(dayRevenue.toFixed(2)),
                storeSales: Number(dayStoreSales.toFixed(2)),
                storeOrders: dayStoreOrders,
                storeProducts: dayStoreProducts,
                storeCustomers: dayStoreCustomers,
                storeVisits: dayStoreVisits
            })
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

// ─── 平台超管：获取商户的仪表盘统计数据 ──────────────────────────────
exports.getMerchantStats = async (req, res) => {
    try {
        const { tenantId } = req.params
        const now = new Date()
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

        const [
            totalOrders,
            totalRevenue,
            totalProducts,
            totalUsers,
            todayOrders,
            todayRevenue,
            totalVisitsData,
            todayVisitsData
        ] = await Promise.all([
            prisma.order.count({ where: { tenantId, status: 'COMPLETED' } }),
            prisma.order.aggregate({
                where: { tenantId, status: 'COMPLETED' },
                _sum: { totalAmount: true }
            }),
            prisma.product.count({ where: { tenantId } }),
            prisma.customer.count({ where: { tenantId } }),
            prisma.order.count({
                where: {
                    tenantId,
                    status: 'COMPLETED',
                    createdAt: { gte: today }
                }
            }),
            prisma.order.aggregate({
                where: {
                    tenantId,
                    status: 'COMPLETED',
                    createdAt: { gte: today }
                },
                _sum: { totalAmount: true }
            }),
            prisma.siteVisit ? prisma.siteVisit.aggregate({ where: { tenantId }, _sum: { visits: true } }).catch(() => ({ _sum: { visits: 0 } })) : Promise.resolve({ _sum: { visits: 0 } }),
            prisma.siteVisit ? prisma.siteVisit.findUnique({ where: { date_tenantId: { date: today, tenantId } } }).catch(() => null) : Promise.resolve(null)
        ])

        res.json({
            totalOrders,
            totalRevenue: Number(totalRevenue._sum.totalAmount || 0),
            totalProducts,
            totalUsers,
            totalVisits: totalVisitsData?._sum?.visits || 0,
            todayOrders,
            todayRevenue: Number(todayRevenue._sum.totalAmount || 0),
            todayVisits: todayVisitsData?.visits || 0
        })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
}

// ─── 平台超管：获取特定商户的销售/指标趋势数据 ──────────────────────────────
exports.getMerchantTrend = async (req, res) => {
    try {
        const { tenantId } = req.params
        const days = parseInt(req.query.days) || 7
        const today = new Date()
        today.setHours(23, 59, 59, 999)
        
        const startDate = new Date(today)
        startDate.setDate(startDate.getDate() - days + 1)
        startDate.setHours(0, 0, 0, 0)

        // 生成日期数组
        const dateList = []
        for (let i = 0; i < days; i++) {
            const d = new Date(startDate)
            d.setDate(d.getDate() + i)
            const dateStr = d.toISOString().split('T')[0]
            dateList.push({
                date: dateStr,
                orders: 0,
                revenue: 0,
                users: 0,
                products: 0,
                visits: 0
            })
        }

        // 并行查询
        const [orders, customers, products, siteVisits] = await Promise.all([
            prisma.order.findMany({
                where: {
                    tenantId,
                    status: 'COMPLETED',
                    createdAt: {
                        gte: startDate,
                        lte: today
                    }
                },
                select: { createdAt: true, totalAmount: true }
            }),
            prisma.customer.findMany({
                where: {
                    tenantId,
                    createdAt: {
                        gte: startDate,
                        lte: today
                    }
                },
                select: { createdAt: true }
            }),
            prisma.product.findMany({
                where: {
                    tenantId,
                    createdAt: {
                        gte: startDate,
                        lte: today
                    }
                },
                select: { createdAt: true }
            }),
            prisma.siteVisit ? prisma.siteVisit.findMany({
                where: {
                    tenantId,
                    date: {
                        gte: startDate,
                        lte: today
                    }
                },
                select: { date: true, visits: true }
            }).catch(() => []) : Promise.resolve([])
        ])

        // 整理数据
        const dataMap = new Map(dateList.map(item => [item.date, item]))

        orders.forEach(o => {
            const dateStr = o.createdAt.toISOString().split('T')[0]
            if (dataMap.has(dateStr)) {
                dataMap.get(dateStr).orders += 1
                dataMap.get(dateStr).revenue += parseFloat(o.totalAmount || 0)
            }
        })

        customers.forEach(u => {
            const dateStr = u.createdAt.toISOString().split('T')[0]
            if (dataMap.has(dateStr)) {
                dataMap.get(dateStr).users += 1
            }
        })

        products.forEach(p => {
            const dateStr = p.createdAt.toISOString().split('T')[0]
            if (dataMap.has(dateStr)) {
                dataMap.get(dateStr).products += 1
            }
        })

        siteVisits.forEach(sv => {
            const dateStr = sv.date.toISOString().split('T')[0]
            if (dataMap.has(dateStr)) {
                dataMap.get(dateStr).visits += sv.visits
            }
        })

        // 固定两位小数
        dateList.forEach(item => {
            item.revenue = parseFloat(item.revenue.toFixed(2))
        })

        res.json({
            trend: dateList
        })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
}

// 平台超管：获取商户提现申请列表
exports.getAdminWithdrawals = async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query
        const where = {}
        if (status) {
            where.status = status
        }

        const [total, list] = await Promise.all([
            prisma.tenantWithdrawal.count({ where }),
            prisma.tenantWithdrawal.findMany({
                where,
                include: {
                    tenant: {
                        select: {
                            id: true,
                            shopName: true,
                            shopSlug: true,
                            kycRealName: true,
                            kycStatus: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' },
                skip: (parseInt(page) - 1) * parseInt(limit),
                take: parseInt(limit)
            })
        ])

        res.json({
            total,
            page: parseInt(page),
            withdrawals: list.map(w => ({
                id: w.id,
                tenantId: w.tenantId,
                shopName: w.tenant.shopName,
                shopSlug: w.tenant.shopSlug,
                kycRealName: w.tenant.kycRealName || '—',
                amount: parseFloat(w.amount),
                method: w.method,
                account: w.account,
                status: w.status,
                rejectReason: w.rejectReason || null,
                processedAt: w.processedAt || null,
                createdAt: w.createdAt
            }))
        })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
}

// 平台超管：审批商户提现申请
exports.auditAdminWithdrawal = async (req, res) => {
    try {
        const { id, action, rejectReason } = req.body
        if (!id || !['APPROVE', 'REJECT'].includes(action)) {
            return res.status(400).json({ error: '参数无效或不完整' })
        }

        const withdrawal = await prisma.tenantWithdrawal.findUnique({
            where: { id },
            include: { tenant: true }
        })
        if (!withdrawal) {
            return res.status(404).json({ error: '提现记录不存在' })
        }
        if (withdrawal.status !== 'PENDING') {
            return res.status(400).json({ error: '该提现申请已在之前处理完毕' })
        }

        const amount = parseFloat(withdrawal.amount)

        if (action === 'APPROVE') {
            await prisma.$transaction(async (tx) => {
                // 扣减冻结余额（可用余额已在申请时扣减）
                await tx.tenant.update({
                    where: { id: withdrawal.tenantId },
                    data: {
                        frozenBalance: { decrement: amount }
                    }
                })

                // 更新提现状态为已通过
                await tx.tenantWithdrawal.update({
                    where: { id },
                    data: {
                        status: 'APPROVED',
                        processedAt: new Date()
                    }
                })
            })

            res.json({ message: '提现申请已批准并完成打款扣账' })
        } else {
            // REJECT
            await prisma.$transaction(async (tx) => {
                // 扣除商户冻结额度，返还至商户可用余额中
                const updatedTenant = await tx.tenant.update({
                    where: { id: withdrawal.tenantId },
                    data: {
                        balance: { increment: amount },
                        frozenBalance: { decrement: amount }
                    }
                })

                // 更新提现状态为已拒绝
                await tx.tenantWithdrawal.update({
                    where: { id },
                    data: {
                        status: 'REJECTED',
                        processedAt: new Date(),
                        rejectReason: rejectReason || '提现信息不符合要求，申请被驳回'
                    }
                })

                // 记账流水：退回
                await tx.tenantBalanceLog.create({
                    data: {
                        tenantId: withdrawal.tenantId,
                        type: 'REJECT',
                        amount: amount,
                        balance: updatedTenant.balance,
                        referenceId: id,
                        remark: `提现申请被驳回，资金已自动返还 (驳回原因: ${rejectReason || '未填写'})`
                    }
                })
            })

            res.json({ message: '已成功驳回提现申请，资金已退还商户余额' })
        }
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
}




/**
 * 套餐购买控制器
 * 套餐配置从数据库读取（平台超管可在 /Man 后台编辑）
 */
const prisma = require('../config/database')
const logger = require('../utils/logger')

// 默认套餐（数据库无配置时的 fallback）
const DEFAULT_PLANS = [
    {
        key: 'BASIC', name: '基础版', monthlyPrice: 19, yearlyPrice: 15,
        features: { maxProducts: 10, skins: '简约', paymentMethods: '全部', customDomain: false, agentSystem: false, emailNotifications: 0, maxSubAdmins: 0, ssl: '共享', support: true, dataRetentionDays: 30 }
    },
    {
        key: 'STANDARD', name: '标准版', monthlyPrice: 39, yearlyPrice: 31,
        features: { maxProducts: 50, skins: '全部', paymentMethods: '全部', customDomain: true, agentSystem: false, emailNotifications: 2000, maxSubAdmins: 2, ssl: '独立', support: true, dataRetentionDays: 30 }
    },
    {
        key: 'PRO', name: '专业版', monthlyPrice: 59, yearlyPrice: 47,
        features: { maxProducts: 200, skins: '全部', paymentMethods: '全部', customDomain: true, agentSystem: true, emailNotifications: 5000, maxSubAdmins: 10, ssl: '独立', support: true, dataRetentionDays: 90 }
    }
]

// 从数据库获取套餐配置
async function getPlanConfig() {
    try {
        const setting = await prisma.platformSetting.findUnique({ where: { key: 'plan_config' } })
        if (setting?.value) {
            const config = JSON.parse(setting.value)
            return config
        }
    } catch (e) {
        logger.error('[getPlanConfig] 解析套餐配置失败:', e.message)
    }
    return { plans: DEFAULT_PLANS, trialHours: 48, yearlyDiscount: 20 }
}

// 获取套餐列表（公开）
exports.getPlans = async (req, res) => {
    try {
        const config = await getPlanConfig()
        res.json({ plans: config.plans, trialHours: config.trialHours, yearlyDiscount: config.yearlyDiscount })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
}

// 平台超管：获取套餐配置（用于编辑）
exports.getPlanConfig = async (req, res) => {
    try {
        const config = await getPlanConfig()
        res.json(config)
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
}

// 平台超管：保存套餐配置
exports.savePlanConfig = async (req, res) => {
    try {
        const { plans, trialHours, yearlyDiscount } = req.body
        if (!plans || !Array.isArray(plans)) return res.status(400).json({ error: '套餐数据格式错误' })

        const value = JSON.stringify({ plans, trialHours: trialHours || 48, yearlyDiscount: yearlyDiscount || 20 })
        await prisma.platformSetting.upsert({
            where: { key: 'plan_config' },
            create: { key: 'plan_config', value, description: '套餐配置' },
            update: { value }
        })
        res.json({ message: '套餐配置已保存' })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
}

// 创建套餐购买订单（复用商城支付流程）
exports.createPlanOrder = async (req, res) => {
    try {
        const { plan, months, paymentMethod } = req.body
        const merchant = req.merchant

        const config = await getPlanConfig()
        const planInfo = config.plans.find(p => p.key === plan)
        if (!planInfo) return res.status(400).json({ error: '无效的套餐类型' })
        if (!months || months < 1 || months > 36) return res.status(400).json({ error: '购买时长 1-36 个月' })
        if (!['alipay', 'usdt', 'bsc_usdt'].includes(paymentMethod)) return res.status(400).json({ error: '不支持的支付方式' })

        const shop = await prisma.shop.findUnique({ where: { merchantId: merchant.id } })
        if (!shop) return res.status(404).json({ error: '商城不存在' })

        // 计算金额
        const pricePerMonth = months >= 12 ? planInfo.yearlyPrice : planInfo.monthlyPrice
        const amount = pricePerMonth * months

        // 创建 PlanOrder 记录
        const planOrder = await prisma.planOrder.create({
            data: {
                merchantId: merchant.id,
                shopId: shop.id,
                plan,
                months: parseInt(months),
                amount,
                paymentMethod,
                paymentStatus: 'PENDING'
            }
        })

        // 同时创建一个商城 Order 记录（复用支付系统）
        const orderNo = `PL${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`

        // 找一个占位 product（或用虚拟商品）
        let planProduct = await prisma.product.findFirst({ where: { name: '套餐订阅', status: 'INACTIVE' } })
        if (!planProduct) {
            planProduct = await prisma.product.create({
                data: { name: '套餐订阅', price: 0, status: 'INACTIVE', description: '平台套餐购买占位商品' }
            })
        }

        const order = await prisma.order.create({
            data: {
                orderNo,
                email: merchant.email,
                productId: planProduct.id,
                productName: `${planInfo.name} × ${months}个月`,
                quantity: 1,
                unitPrice: amount,
                totalAmount: amount,
                status: 'PENDING',
                paymentMethod,
                remark: `plan_order:${planOrder.id}`
            }
        })

        // 更新 planOrder 关联 orderNo
        await prisma.planOrder.update({
            where: { id: planOrder.id },
            data: { tradeNo: orderNo }
        })

        // 调用现有支付系统生成支付信息
        let paymentData = {}

        if (paymentMethod === 'alipay') {
            const alipayService = require('../services/alipayService')
            try {
                const frontendUrl = process.env.FRONTEND_URL || `${req.protocol}://${req.get('host')}`
                const base = frontendUrl.endsWith('/') ? frontendUrl.slice(0, -1) : frontendUrl
                const notifyUrl = `${base}/api/payment/alipay/notify`

                const result = await alipayService.createQrCodePayment({
                    orderNo,
                    totalAmount: amount,
                    productName: `Vmart ${planInfo.name} ${months}个月`
                }, null, notifyUrl)
                paymentData = { paymentType: 'qrcode', qrCode: result.qrCode, orderNo }
            } catch (e) {
                logger.error('[planOrder] 支付宝二维码生成失败:', e.message)
                return res.status(500).json({ error: '支付宝支付暂不可用，请选择其他方式' })
            }
        } else if (paymentMethod === 'usdt') {
            const walletSetting = await prisma.platformSetting.findUnique({ where: { key: 'usdt_wallet' } })
            if (!walletSetting?.value) return res.status(400).json({ error: 'USDT-TRC20 收款地址未配置，请联系平台管理员' })

            const rateSetting = await prisma.platformSetting.findUnique({ where: { key: 'usdt_rate' } })
            const exchangeRate = rateSetting?.value ? parseFloat(rateSetting.value) || 7.2 : 7.2

            const usdtAmount = parseFloat((amount / exchangeRate).toFixed(2))
            // 加随机尾数避免重复
            const uniqueAmount = usdtAmount + parseFloat((Math.random() * 0.09 + 0.01).toFixed(2))

            await prisma.order.update({ where: { id: order.id }, data: { usdtAmount: uniqueAmount, paymentMethod: 'usdt' } })

            paymentData = {
                paymentType: 'usdt',
                walletAddress: walletSetting.value,
                usdtAmount: uniqueAmount,
                qrContent: `tron:${walletSetting.value}?amount=${uniqueAmount}`,
                exchangeRate,
                orderNo
            }
        } else if (paymentMethod === 'bsc_usdt') {
            const walletSetting = await prisma.platformSetting.findUnique({ where: { key: 'bsc_usdt_wallet' } })
            if (!walletSetting?.value) return res.status(400).json({ error: 'USDT-BEP20 收款地址未配置，请联系平台管理员' })

            const rateSetting = await prisma.platformSetting.findUnique({ where: { key: 'bsc_usdt_rate' } })
            const exchangeRate = rateSetting?.value ? parseFloat(rateSetting.value) || 7.2 : 7.2

            const usdtAmount = parseFloat((amount / exchangeRate).toFixed(2))
            const uniqueAmount = usdtAmount + parseFloat((Math.random() * 0.09 + 0.01).toFixed(2))

            await prisma.order.update({ where: { id: order.id }, data: { bscUsdtAmount: uniqueAmount, paymentMethod: 'bsc_usdt' } })

            paymentData = {
                paymentType: 'bsc_usdt',
                walletAddress: walletSetting.value,
                usdtAmount: uniqueAmount,
                qrContent: walletSetting.value,
                exchangeRate,
                orderNo
            }
        }

        res.json({
            orderId: planOrder.id,
            orderNo,
            plan,
            months,
            amount,
            ...paymentData
        })
    } catch (e) {
        logger.error('[planController.createPlanOrder]', e)
        res.status(500).json({ error: e.message })
    }
}

// 查询套餐订单支付状态（前端轮询）
exports.checkPlanPayment = async (req, res) => {
    try {
        const { orderNo } = req.params
        const merchant = req.merchant

        const order = await prisma.order.findUnique({ where: { orderNo } })
        if (!order) return res.status(404).json({ error: '订单不存在' })

        // 如果订单已支付/完成，自动激活套餐
        if (order.status === 'PAID' || order.status === 'COMPLETED') {
            // 找到对应的 planOrder
            const planOrder = await prisma.planOrder.findFirst({
                where: { tradeNo: orderNo, merchantId: merchant.id },
                include: { shop: true }
            })

            if (planOrder && planOrder.paymentStatus !== 'PAID') {
                // 计算到期时间
                const now = new Date()
                let baseDate = now
                if (planOrder.shop.planExpiresAt && new Date(planOrder.shop.planExpiresAt) > now) {
                    baseDate = new Date(planOrder.shop.planExpiresAt)
                }
                const newExpiry = new Date(baseDate)
                newExpiry.setMonth(newExpiry.getMonth() + planOrder.months)

                // 更新套餐
                await prisma.planOrder.update({ where: { id: planOrder.id }, data: { paymentStatus: 'PAID', paidAt: new Date() } })
                await prisma.shop.update({
                    where: { id: planOrder.shopId },
                    data: { plan: planOrder.plan, planExpiresAt: newExpiry, status: 'ACTIVE' }
                })
                await prisma.order.update({
                    where: { id: order.id },
                    data: { status: 'COMPLETED', completedAt: new Date() }
                })

                logger.info(`[planPayment] 套餐自动激活: ${merchant.email} → ${planOrder.plan}, 到期 ${newExpiry.toISOString()}`)

                // 平台超管通知
                try {
                    const manNotify = require('../services/manNotifyService')
                    manNotify.notifyPlanOrderPaid({
                        plan: planOrder.plan,
                        months: planOrder.months,
                        amount: planOrder.amount,
                        paymentMethod: planOrder.paymentMethod,
                        tradeNo: planOrder.tradeNo
                    }, merchant).catch(() => {})
                } catch {}
            }

            return res.json({ status: 'paid', message: '支付成功，套餐已激活' })
        }

        if (order.status === 'CANCELLED') {
            return res.json({ status: 'cancelled' })
        }

        res.json({ status: 'pending' })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
}

// 商户查询自己的套餐订单
exports.getMyPlanOrders = async (req, res) => {
    try {
        const orders = await prisma.planOrder.findMany({
            where: { merchantId: req.merchant.id },
            orderBy: { createdAt: 'desc' },
            take: 50
        })
        res.json({ orders })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
}

// ─── 平台超管：套餐订单列表 ─────────────────────────────────
exports.listPlanOrders = async (req, res) => {
    try {
        const { status, page = 1, limit = 20, search } = req.query
        const where = {}
        if (status) where.paymentStatus = status
        if (search) {
            where.OR = [
                { merchant: { email: { contains: search } } },
                { tradeNo: { contains: search } }
            ]
        }

        const [total, orders] = await Promise.all([
            prisma.planOrder.count({ where }),
            prisma.planOrder.findMany({
                where,
                include: {
                    merchant: { select: { id: true, email: true, shopName: true } },
                    shop: { select: { id: true, slug: true, name: true } }
                },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * parseInt(limit),
                take: parseInt(limit)
            })
        ])

        res.json({ total, page: parseInt(page), orders })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
}

// ─── 平台超管：所有订单（套餐订单 + 邮件资源包等）────────────────
exports.listAllOrders = async (req, res) => {
    try {
        const { status, type = 'all', search } = req.query

        // 1. 套餐订单
        let planOrders = []
        if (type === 'all' || type === 'plan') {
            const planWhere = {}
            if (status) planWhere.paymentStatus = status
            if (search) {
                planWhere.OR = [
                    { merchant: { email: { contains: search } } },
                    { tradeNo: { contains: search } }
                ]
            }
            const rows = await prisma.planOrder.findMany({
                where: planWhere,
                include: {
                    merchant: { select: { id: true, email: true, shopName: true } },
                    shop: { select: { id: true, slug: true, name: true } }
                },
                orderBy: { createdAt: 'desc' },
                take: 500
            })
            planOrders = rows.map(o => ({
                id: o.id,
                type: 'plan',
                typeLabel: '套餐订单',
                merchantEmail: o.merchant?.email || '—',
                merchantName: o.merchant?.shopName || '',
                productName: `${o.plan} × ${o.months} 个月`,
                planKey: o.plan,
                amount: parseFloat(o.amount),
                paymentMethod: o.paymentMethod,
                tradeNo: o.tradeNo,
                paymentStatus: o.paymentStatus,
                createdAt: o.createdAt,
                paidAt: o.paidAt,
                _raw: { months: o.months, plan: o.plan }
            }))
        }

        // 2. 邮件资源包订单（remark 以 email_pack: 开头的 Order）
        let packOrders = []
        if (type === 'all' || type === 'email_pack') {
            const packWhere = { remark: { startsWith: 'email_pack:' } }
            if (search) {
                packWhere.OR = [
                    { email: { contains: search } },
                    { orderNo: { contains: search } }
                ]
            }
            // 把 status 映射成 Order.status
            if (status) {
                const map = { PENDING: 'PENDING', REVIEWING: 'PENDING', PAID: 'COMPLETED', REJECTED: 'CANCELLED' }
                packWhere.status = map[status] || status
            }
            const rows = await prisma.order.findMany({
                where: packWhere,
                orderBy: { createdAt: 'desc' },
                take: 500
            })

            // 反查 tenant -> merchant 邮箱
            const tenantIds = [...new Set(rows.map(o => o.remark?.split(':')[1]).filter(Boolean))]
            const tenants = await prisma.tenant.findMany({
                where: { id: { in: tenantIds } },
                include: { user: { select: { email: true } } }
            })
            const tenantMap = Object.fromEntries(tenants.map(t => [t.id, t]))

            packOrders = rows.map(o => {
                const parts = (o.remark || '').split(':')
                const tenantId = parts[1]
                const count = parseInt(parts[2]) || 0
                const tenant = tenantMap[tenantId]
                // 把 Order.status 反向映射到 paymentStatus
                let paymentStatus = 'PENDING'
                if (o.status === 'COMPLETED') paymentStatus = 'PAID'
                else if (o.status === 'CANCELLED') paymentStatus = 'REJECTED'
                else if (o.status === 'PAID') paymentStatus = 'PAID'
                return {
                    id: o.id,
                    type: 'email_pack',
                    typeLabel: '邮件资源包',
                    merchantEmail: tenant?.user?.email || o.email || '—',
                    merchantName: tenant?.shopName || '',
                    productName: `邮件资源包 ${count.toLocaleString()} 封`,
                    amount: parseFloat(o.totalAmount),
                    paymentMethod: o.paymentMethod,
                    tradeNo: o.orderNo,
                    paymentStatus,
                    createdAt: o.createdAt,
                    paidAt: o.completedAt || o.paidAt,
                    _raw: { count, tenantId }
                }
            })
        }

        const orders = [...planOrders, ...packOrders].sort((a, b) =>
            new Date(b.createdAt) - new Date(a.createdAt)
        )

        res.json({ total: orders.length, orders })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
}

// 平台超管：手动确认套餐订单
exports.confirmPlanOrder = async (req, res) => {
    try {
        const { id } = req.params
        const planOrder = await prisma.planOrder.findUnique({ where: { id }, include: { shop: true } })
        if (!planOrder) return res.status(404).json({ error: '订单不存在' })
        if (planOrder.paymentStatus === 'PAID') return res.status(400).json({ error: '订单已确认' })

        const now = new Date()
        let baseDate = now
        if (planOrder.shop.planExpiresAt && new Date(planOrder.shop.planExpiresAt) > now) {
            baseDate = new Date(planOrder.shop.planExpiresAt)
        }
        const newExpiry = new Date(baseDate)
        newExpiry.setMonth(newExpiry.getMonth() + planOrder.months)

        await prisma.planOrder.update({ where: { id }, data: { paymentStatus: 'PAID', paidAt: new Date() } })
        await prisma.shop.update({ where: { id: planOrder.shopId }, data: { plan: planOrder.plan, planExpiresAt: newExpiry, status: 'ACTIVE' } })

        res.json({ message: '已确认，套餐已更新', expiresAt: newExpiry })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
}

// 平台超管：拒绝套餐订单
exports.rejectPlanOrder = async (req, res) => {
    try {
        const { id } = req.params
        await prisma.planOrder.update({ where: { id }, data: { paymentStatus: 'REJECTED' } })
        res.json({ message: '已拒绝' })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
}

// 获取套餐限制信息
exports.getPlanLimits = async (req, res) => {
    try {
        const shop = req.merchant.shop
        if (!shop) return res.status(404).json({ error: '商城不存在' })

        const config = await getPlanConfig()
        // 免费试用 == 专业版（同等权限）
        const effectivePlanKey = shop.plan === 'FREE' ? 'PRO' : shop.plan
        const planInfo = config.plans.find(p => p.key === effectivePlanKey)
        const planConfigured = !!planInfo?.features
        const limits = planInfo?.features ? { ...planInfo.features } : { maxProducts: 5 }

        // 免费试用与专业版一致 — 不再覆盖 maxProducts
        // (保留原代码注释以便后续调整)

        // 兜底：plan_config 旧版本没有 maxSubAdmins 字段时，根据 plan key fallback
        if (typeof limits.maxSubAdmins !== 'number') {
            const fallback = { FREE: 10, BASIC: 0, STANDARD: 2, PRO: 10 }
            limits.maxSubAdmins = fallback[shop.plan] ?? 0
        }

        // 兜底：support / customerTickets 字段缺失时
        if (typeof limits.support !== 'boolean') {
            limits.support = !planConfigured
        }
        if (typeof limits.customerTickets !== 'boolean') {
            limits.customerTickets = !planConfigured
        }

        const tenant = await prisma.tenant.findFirst({ where: { shopSlug: shop.slug } })
        let currentProducts = 0, currentMonthOrders = 0
        if (tenant) {
            const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0)
            ;[currentProducts, currentMonthOrders] = await Promise.all([
                prisma.product.count({ where: { tenantId: tenant.id, status: 'ACTIVE' } }),
                prisma.order.count({ where: { tenantId: tenant.id, createdAt: { gte: monthStart } } })
            ])
        }

        res.json({
            plan: shop.plan,
            planName: shop.plan === 'FREE' ? '免费试用' : (planInfo?.name || shop.plan),
            expiresAt: shop.planExpiresAt || shop.trialEndsAt,
            limits,
            usage: { products: currentProducts, monthlyOrders: currentMonthOrders }
        })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
}

module.exports = exports

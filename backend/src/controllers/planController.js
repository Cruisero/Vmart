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
        features: { maxProducts: 10, skins: '简约', paymentMethods: '全部', customDomain: false, agentSystem: false, emailNotifications: 0, ssl: '共享', support: true, dataRetentionDays: 30 }
    },
    {
        key: 'STANDARD', name: '标准版', monthlyPrice: 39, yearlyPrice: 31,
        features: { maxProducts: 50, skins: '全部', paymentMethods: '全部', customDomain: true, agentSystem: false, emailNotifications: 2000, ssl: '独立', support: true, dataRetentionDays: 30 }
    },
    {
        key: 'PRO', name: '专业版', monthlyPrice: 59, yearlyPrice: 47,
        features: { maxProducts: 200, skins: '全部', paymentMethods: '全部', customDomain: true, agentSystem: true, emailNotifications: 5000, ssl: '独立', support: true, dataRetentionDays: 90 }
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
                const result = await alipayService.createQrCodePayment({
                    orderNo,
                    totalAmount: amount,
                    productName: `Vmart ${planInfo.name} ${months}个月`
                })
                paymentData = { paymentType: 'qrcode', qrCode: result.qrCode, orderNo }
            } catch (e) {
                logger.error('[planOrder] 支付宝二维码生成失败:', e.message)
                return res.status(500).json({ error: '支付宝支付暂不可用，请选择其他方式' })
            }
        } else if (paymentMethod === 'usdt') {
            const walletSetting = await prisma.platformSetting.findUnique({ where: { key: 'usdt_wallet' } })
            if (!walletSetting?.value) return res.status(400).json({ error: 'USDT-TRC20 收款地址未配置，请联系平台管理员' })

            const exchangeRate = 7.2
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

            const exchangeRate = 7.2
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

                logger.info(`[planPayment] 套餐自动激活: ${merchant.email} → ${planOrder.plan}, 到期 ${newExpiry.toISOString()}`)
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
        const planInfo = config.plans.find(p => p.key === shop.plan)
        const limits = planInfo?.features || { maxProducts: 5 }

        // 免费版默认限制
        if (shop.plan === 'FREE') {
            limits.maxProducts = 5
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

// 管理员控制器
const prisma = require('../config/database')
const bcrypt = require('bcryptjs')
const emailService = require('../services/emailService')
const agentService = require('../services/agentService')

// 获取租户或全局的库存计算模式
async function getStockMode(tenantId) {
    if (tenantId) {
        try {
            const tenantSetting = await prisma.tenantSetting.findUnique({
                where: { tenantId }
            })
            if (tenantSetting && tenantSetting.paymentConfig) {
                const config = JSON.parse(tenantSetting.paymentConfig)
                if (config && config.stock_mode) {
                    return config.stock_mode
                }
            }
        } catch (e) {
            console.error('Failed to get tenant stockMode:', e)
        }
    }
    try {
        const globalSetting = await prisma.setting.findUnique({ where: { key: 'stockMode' } })
        return globalSetting?.value || 'auto'
    } catch (e) {
        return 'auto'
    }
}

// 检查租户的当前套餐是否允许代理系统
async function isAgentSystemAllowed(tenantId) {
    try {
        const tenant = await prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { shopSlug: true }
        })
        if (!tenant) return false
        const shop = await prisma.shop.findUnique({
            where: { slug: tenant.shopSlug },
            select: { plan: true }
        })
        if (!shop) return false
        // 免费试用与专业版同权限：FREE 视同 PRO 来读取功能配置
        const effectivePlanKey = shop.plan === 'FREE' ? 'PRO' : shop.plan

        // 读 plan_config 中对应套餐的 features.agentSystem
        const setting = await prisma.platformSetting.findUnique({
            where: { key: 'plan_config' }
        })
        if (setting?.value) {
            try {
                const config = JSON.parse(setting.value)
                const planInfo = (config.plans || []).find(p => p.key === effectivePlanKey)
                if (planInfo) {
                    return planInfo.features?.agentSystem === true
                }
            } catch {}
        }

        // fallback：默认仅 PRO 允许（FREE 视同 PRO，所以这里返回 true）
        return effectivePlanKey === 'PRO'
    } catch (e) {
        console.error('[isAgentSystemAllowed] 失败:', e.message)
        return false
    }
}

// 获取租户允许的子管理员数量上限
// 返回 -1 = 不限；0 = 不允许；>0 = 上限
async function getSubAdminLimit(tenantId) {
    try {
        const tenant = await prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { shopSlug: true }
        })
        if (!tenant) return 0
        const shop = await prisma.shop.findUnique({
            where: { slug: tenant.shopSlug },
            select: { plan: true }
        })
        if (!shop) return 0
        // 免费试用与专业版同权限
        const effectivePlanKey = shop.plan === 'FREE' ? 'PRO' : shop.plan

        const setting = await prisma.platformSetting.findUnique({
            where: { key: 'plan_config' }
        })
        if (setting?.value) {
            try {
                const config = JSON.parse(setting.value)
                const planInfo = (config.plans || []).find(p => p.key === effectivePlanKey)
                if (planInfo) {
                    const v = planInfo.features?.maxSubAdmins
                    if (typeof v === 'number') return v
                }
            } catch {}
        }
        // fallback：未配置时按 plan key 给保守默认（FREE 视同 PRO）
        const fallback = { FREE: 10, BASIC: 0, STANDARD: 2, PRO: 10 }
        return fallback[shop.plan] ?? 0
    } catch (e) {
        console.error('[getSubAdminLimit] 失败:', e.message)
        return 0
    }
}

async function releaseOrderCards(tx, order) {
    const releasedCards = order.cards || []
    const releasedCount = releasedCards.length

    if (releasedCount === 0) {
        return 0
    }

    await tx.card.updateMany({
        where: { orderId: order.id },
        data: {
            status: 'AVAILABLE',
            orderId: null,
            soldAt: null
        }
    })

    await tx.product.update({
        where: { id: order.productId },
        data: { stock: { increment: releasedCount } }
    })

    const variantCountMap = new Map()
    releasedCards.forEach((card) => {
        if (card.variantId) {
            variantCountMap.set(card.variantId, (variantCountMap.get(card.variantId) || 0) + 1)
        }
    })

    for (const [variantId, count] of variantCountMap.entries()) {
        await tx.productVariant.update({
            where: { id: variantId },
            data: { stock: { increment: count } }
        })
    }

    return releasedCount
}

async function deleteAvailableCardsForVariants(tx, variantIds) {
    if (!variantIds || variantIds.length === 0) {
        return 0
    }

    const deleted = await tx.card.deleteMany({
        where: {
            variantId: { in: variantIds },
            status: 'AVAILABLE'
        }
    })

    // Keep sold card/order history, but detach it from variants that no longer exist.
    await tx.card.updateMany({
        where: { variantId: { in: variantIds } },
        data: { variantId: null }
    })

    return deleted.count
}

const ADMIN_DASHBOARD_PERMISSION_DEFAULTS = {
    adminPermissionViewStatsGrid: true,
    adminPermissionViewTodayStats: true
}

const ADMIN_EMAIL_NOTIFICATION_EVENTS = [
    'notifyOrderPaid',
    'notifyPendingShip',
    'notifyNewTicket',
    'notifyNewUser',
    'notifyLowStock',
    'notifyOrderCancelled'
]

async function getAdminDashboardPermissions(req) {
    const userRole = (req?.user?.role || '').toUpperCase()
    // 所有者拥有全部仪表盘权限
    if (['SUPER_ADMIN', 'TENANT_ADMIN'].includes(userRole)) {
        return { adminPermissionViewStatsGrid: true, adminPermissionViewTodayStats: true }
    }
    // 子管理员（ADMIN）按个人 permissions 判断
    if (userRole === 'ADMIN') {
        const perms = req?.permissions || {}
        return {
            adminPermissionViewStatsGrid: !!perms['dashboard.viewStatsGrid'],
            adminPermissionViewTodayStats: !!perms['dashboard.viewTodayStats']
        }
    }
    return { adminPermissionViewStatsGrid: false, adminPermissionViewTodayStats: false }
}

function parseAdminEmailConfigs(value) {
    if (!value) return []

    try {
        const configs = JSON.parse(value)
        return Array.isArray(configs) ? configs : []
    } catch (error) {
        return []
    }
}

function normalizeAdminEmailConfigs(configs, admins) {
    const adminMap = new Map(admins.map(admin => [admin.id, admin]))

    return (Array.isArray(configs) ? configs : [])
        .map(config => {
            const admin = adminMap.get(config.userId)
            if (!admin) return null

            const events = Array.isArray(config.events)
                ? config.events.filter(event => ADMIN_EMAIL_NOTIFICATION_EVENTS.includes(event))
                : []

            return {
                userId: admin.id,
                email: admin.email,
                username: admin.username,
                role: admin.role,
                enabled: config.enabled !== false,
                events
            }
        })
        .filter(Boolean)
}

// 仪表盘统计
exports.getDashboard = async (req, res, next) => {
    try {
        const dashboardPermissions = await getAdminDashboardPermissions(req)
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        const [
            totalOrders,
            totalRevenue,
            totalProducts,
            totalUsers,
            todayOrders,
            recentOrders,
            pendingTickets,
            unpaidOrders,
            paidOrders,
            refundingOrders,
            pendingPayments,
            totalVisitsData,
            todayVisitsData,
            stockModeSetting
        ] = await Promise.all([
            prisma.order.count({ where: { ...(req.tenantId ? { tenantId: req.tenantId } : {}), status: 'COMPLETED' } }),
            prisma.order.aggregate({
                where: { ...(req.tenantId ? { tenantId: req.tenantId } : {}), status: 'COMPLETED' },
                _sum: { totalAmount: true }
            }),
            prisma.product.count({ where: { ...(req.tenantId ? { tenantId: req.tenantId } : {}) } }),
            req.tenantId
                ? prisma.customer.count({ where: { tenantId: req.tenantId } })
                : prisma.user.count(),
            prisma.order.count({
                where: {
                ...(req.tenantId ? { tenantId: req.tenantId } : {}),
                status: 'COMPLETED',
                    createdAt: { gte: today }
                }
            }),
            prisma.order.findMany({
                where: { ...(req.tenantId ? { tenantId: req.tenantId } : {}) },
                take: 10,
                orderBy: { createdAt: 'desc' },
                include: {
                    product: { select: { name: true } }
                }
            }),
            prisma.ticket.count({ where: { ...(req.tenantId ? { tenantId: req.tenantId } : {}), adminUnreadCount: { gt: 0 } } }),
            prisma.order.count({ where: { ...(req.tenantId ? { tenantId: req.tenantId } : {}), status: 'PENDING' } }),
            prisma.order.count({ where: { ...(req.tenantId ? { tenantId: req.tenantId } : {}), status: 'PAID' } }),
            prisma.order.count({ where: { ...(req.tenantId ? { tenantId: req.tenantId } : {}), status: 'REFUNDING' } }),
            // 待确认的支付订单（USDT / BSC_USDT 等）
             prisma.order.findMany({
                 where: { ...(req.tenantId ? { tenantId: req.tenantId } : {}), status: 'PENDING' },
                 select: {
                     id: true,
                     orderNo: true,
                     productName: true,
                     totalAmount: true,
                     paymentMethod: true,
                     usdtAmount: true,
                     bscUsdtAmount: true,
                     createdAt: true,
                     email: true
                 },
                 orderBy: { createdAt: 'desc' },
                 take: 20
             }),
             prisma.siteVisit ? (
                 req.tenantId
                     ? prisma.siteVisit.aggregate({ where: { tenantId: req.tenantId }, _sum: { visits: true } }).catch(() => ({ _sum: { visits: 0 } }))
                     : prisma.siteVisit.aggregate({ _sum: { visits: true } }).catch(() => ({ _sum: { visits: 0 } }))
             ) : Promise.resolve({ _sum: { visits: 0 } }),
             prisma.siteVisit ? (
                 req.tenantId
                     ? prisma.siteVisit.findUnique({ where: { date_tenantId: { date: today, tenantId: req.tenantId } } }).catch(() => null)
                     : prisma.siteVisit.aggregate({ where: { date: today }, _sum: { visits: true } }).then(res => ({ visits: res._sum.visits || 0 })).catch(() => null)
             ) : Promise.resolve(null),
             getStockMode(req.tenantId)
        ])
        const stockMode = stockModeSetting || 'auto'

        const todayRevenue = await prisma.order.aggregate({
            where: {
                ...(req.tenantId ? { tenantId: req.tenantId } : {}),
                status: 'COMPLETED',
                createdAt: { gte: today }
            },
            _sum: { totalAmount: true }
        })

        // 按支付方式汇总待支付订单
        const paymentMethodSummary = {}
        pendingPayments.forEach(o => {
            const method = o.paymentMethod || '未知'
            if (!paymentMethodSummary[method]) {
                paymentMethodSummary[method] = { count: 0, amount: 0 }
            }
            paymentMethodSummary[method].count += 1
            paymentMethodSummary[method].amount += parseFloat(o.totalAmount || 0)
        })

        // 查询库存告警商品
        let stockAlertProducts = []
        try {
            const alertSetting = await prisma.setting.findUnique({ where: { key: 'stockAlertProductIds' } })
            const alertIds = alertSetting?.value ? JSON.parse(alertSetting.value) : []
            if (alertIds.length > 0) {
                const alertProducts = await prisma.product.findMany({
                    where: { id: { in: alertIds }, ...(req.tenantId ? { tenantId: req.tenantId } : {}) },
                    select: {
                        id: true,
                        name: true,
                        stock: true,
                        _count: {
                            select: { cards: { where: { ...(req.tenantId ? { tenantId: req.tenantId } : {}), status: 'AVAILABLE' } } }
                        }
                    }
                })

                stockAlertProducts = alertProducts
                    .map((p) => {
                        const effectiveStock = stockMode === 'auto' ? p._count.cards : p.stock
                        return { id: p.id, name: p.name, stock: effectiveStock }
                    })
                    .filter((p) => p.stock <= 0)
            }
        } catch (e) {
            console.error('查询库存告警失败:', e)
        }

        const canViewStatsGrid = dashboardPermissions.adminPermissionViewStatsGrid
        const canViewTodayStats = dashboardPermissions.adminPermissionViewTodayStats

        res.json({
            permissions: {
                dashboard: {
                    viewStatsGrid: canViewStatsGrid,
                    viewTodayStats: canViewTodayStats
                }
            },
            totalOrders: canViewStatsGrid ? totalOrders : 0,
            totalRevenue: canViewStatsGrid ? parseFloat(totalRevenue._sum.totalAmount || 0) : 0,
            totalProducts: canViewStatsGrid ? totalProducts : 0,
            totalUsers: canViewStatsGrid ? totalUsers : 0,
            totalVisits: canViewStatsGrid ? totalVisitsData._sum.visits || 0 : 0,
            todayOrders: canViewTodayStats ? todayOrders : 0,
            todayRevenue: canViewTodayStats ? parseFloat(todayRevenue._sum.totalAmount || 0) : 0,
            todayVisits: canViewTodayStats ? todayVisitsData?.visits || 0 : 0,
            pendingTickets,
            unpaidOrders,
            paidOrders,
            refundingOrders,
            stockAlertProducts,
            paymentMethodSummary,
            pendingPayments: pendingPayments.map(o => ({
                id: o.id,
                orderNo: o.orderNo,
                productName: o.productName,
                amount: parseFloat(o.totalAmount),
                paymentMethod: o.paymentMethod,
                usdtAmount: o.usdtAmount ? parseFloat(o.usdtAmount) : null,
                bscUsdtAmount: o.bscUsdtAmount ? parseFloat(o.bscUsdtAmount) : null,
                email: o.email,
                createdAt: o.createdAt
            })),
            recentOrders: recentOrders.map(o => ({
                id: o.id,
                orderNo: o.orderNo,
                product: o.product?.name || o.productName,
                amount: parseFloat(o.totalAmount),
                status: o.status.toLowerCase(),
                createdAt: o.createdAt
            }))
        })
    } catch (error) {
        next(error)
    }
}

// 仪表盘趋势数据
exports.getDashboardTrend = async (req, res, next) => {
    try {
        const dashboardPermissions = await getAdminDashboardPermissions(req)
        if (!dashboardPermissions.adminPermissionViewStatsGrid) {
            return res.status(403).json({ error: '无权限查看仪表盘统计趋势' })
        }

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
        const [orders, users, products, siteVisits] = await Promise.all([
            prisma.order.findMany({
                where: {
                ...(req.tenantId ? { tenantId: req.tenantId } : {}),
                status: 'COMPLETED',
                    createdAt: {
                        gte: startDate,
                        lte: today
                    }
                },
                select: { createdAt: true, totalAmount: true }
            }),
            req.tenantId
                ? prisma.customer.findMany({
                    where: {
                        tenantId: req.tenantId,
                        createdAt: {
                            gte: startDate,
                            lte: today
                        }
                    },
                    select: { createdAt: true }
                })
                : prisma.user.findMany({
                    where: {
                        createdAt: {
                            gte: startDate,
                            lte: today
                        }
                    },
                    select: { createdAt: true }
                }),
            prisma.product.findMany({
                where: {
                    ...(req.tenantId ? { tenantId: req.tenantId } : {}),
                    createdAt: {
                        gte: startDate,
                        lte: today
                    }
                },
                select: { createdAt: true }
            }),
            prisma.siteVisit ? (
                req.tenantId
                    ? prisma.siteVisit.findMany({
                        where: {
                            tenantId: req.tenantId,
                            date: {
                                gte: startDate,
                                lte: today
                            }
                        },
                        select: { date: true, visits: true }
                    }).catch(() => [])
                    : prisma.siteVisit.groupBy({
                        by: ['date'],
                        where: {
                            date: {
                                gte: startDate,
                                lte: today
                            }
                        },
                        _sum: {
                            visits: true
                        }
                    }).then(items => items.map(item => ({ date: item.date, visits: item._sum.visits || 0 }))).catch(() => [])
            ) : Promise.resolve([])
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

        users.forEach(u => {
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
    } catch (error) {
        next(error)
    }
}

// 商品管理 - 列表
exports.getProducts = async (req, res, next) => {
    try {
        const { page = 1, pageSize = 20, status } = req.query

        const where = {};
        if (req.tenantId) where.tenantId = req.tenantId;
        
        if (req.tenantId) where.tenantId = req.tenantId
if (status) where.status = status.toUpperCase()

        const [products, total, stockModeSetting] = await Promise.all([
            prisma.product.findMany({
                where,
                include: {
                    category: { select: { name: true } },
                    _count: { select: { cards: { where: { ...(req.tenantId ? { tenantId: req.tenantId } : {}), status: 'AVAILABLE' } } } },
                    variants: {
                        orderBy: { sortOrder: 'asc' }
                    }
                },
                orderBy: [{ status: 'asc' }, { weight: 'desc' }, { createdAt: 'desc' }],
                skip: (page - 1) * pageSize,
                take: parseInt(pageSize)
            }),
            prisma.product.count({ where }),
            getStockMode(req.tenantId)
        ])
        const stockMode = stockModeSetting || 'auto'

        res.json({
            products: products.map(p => ({
                ...p,
                price: parseFloat(p.price),
                originalPrice: p.originalPrice ? parseFloat(p.originalPrice) : null,
                stock: stockMode === 'auto' ? p._count.cards : p.stock,
                availableCards: p._count.cards,
                variants: (p.variants || []).map(v => ({
                    ...v,
                    price: parseFloat(v.price),
                    originalPrice: v.originalPrice ? parseFloat(v.originalPrice) : null
                }))
            })),
            total,
            page: parseInt(page),
            pageSize: parseInt(pageSize)
        })
    } catch (error) {
        next(error)
    }
}

// 商品管理 - 创建
exports.createProduct = async (req, res, next) => {
    try {
        const { name, description, fullDescription, price, originalPrice, categoryId, image, images, tags, stock, variants, weight, deliveryNote, wholesalePrices } = req.body

        // 构建数据对象，只包含有值的字段
        const productData = {
            name,
            description,
            fullDescription,
            price,
            originalPrice,
            image,
            images: images || [],
            stock: stock || 0,
            tags: tags || [],
            weight: parseInt(weight) || 0,
            deliveryNote: deliveryNote || null,
            wholesalePrices: wholesalePrices || [],
            status: 'ACTIVE'
        ,
            tenantId: req.tenantId || null
        }

        // 只有当 categoryId 有效时才添加
        if (categoryId && categoryId !== '' && categoryId !== 'null') {
            productData.categoryId = categoryId
        }

        // 如果有规格数据，使用嵌套创建，并自动设置商品价格为最低规格价格
        if (variants && variants.length > 0) {
            const validVariants = variants.filter(v => v.name && v.price)
            if (validVariants.length > 0) {
                // 商品价格自动取最低规格价格
                const prices = validVariants.map(v => parseFloat(v.price) || 0)
                const minPrice = Math.min(...prices)
                productData.price = minPrice

                // 原价取最高规格原价（如果有）
                const originalPrices = validVariants
                    .map(v => v.originalPrice ? parseFloat(v.originalPrice) : 0)
                    .filter(p => p > 0)
                if (originalPrices.length > 0) {
                    productData.originalPrice = Math.max(...originalPrices)
                }

                // 库存为各规格库存之和
                const totalStock = validVariants.reduce((sum, v) => sum + (parseInt(v.stock) || 0), 0)
                productData.stock = totalStock

                productData.variants = {
                    create: validVariants.map((v, index) => ({
                        type: v.type || null,
                        name: v.name,
                        price: parseFloat(v.price) || 0,
                        originalPrice: v.originalPrice ? parseFloat(v.originalPrice) : null,
                        stock: parseInt(v.stock) || 0,
                        sortOrder: index,
                        wholesalePrices: v.wholesalePrices || [],
                        status: 'ACTIVE'
                    }))
                }
            }
        }

        const product = await prisma.product.create({
            data: productData,
            include: {
                variants: true
            }
        })

        res.status(201).json({ message: '商品创建成功', product })
    } catch (error) {
        next(error)
    }
}

// 商品管理 - 更新
exports.updateProduct = async (req, res, next) => {
    try {
        const { id } = req.params
        if (req.tenantId) { const item = await prisma.product.findFirst({ where: { id, tenantId: req.tenantId } }); if (!item) return res.status(403).json({ error: '无权操作或记录不存在' }) }
        const { name, description, fullDescription, price, originalPrice, categoryId, image, images, tags, status, stock, variants, weight, deliveryNote, wholesalePrices } = req.body

        // 构建更新数据对象
        const updateData = {
            name,
            description,
            fullDescription,
            price,
            originalPrice,
            image,
            images: images || [],
            stock,
            tags,
            weight: weight !== undefined ? parseInt(weight) || 0 : undefined,
            deliveryNote: deliveryNote !== undefined ? (deliveryNote || null) : undefined,
            wholesalePrices: wholesalePrices !== undefined ? (wholesalePrices || []) : undefined,
            status: status?.toUpperCase()
        }

        // 只有当 categoryId 有效时才更新，否则设置为 null
        if (categoryId && categoryId !== '' && categoryId !== 'null') {
            updateData.categoryId = categoryId
        } else {
            updateData.categoryId = null
        }

        // 使用事务处理规格更新
        const product = await prisma.$transaction(async (tx) => {
            // 更新商品基本信息
            const updatedProduct = await tx.product.update({
                where: { id, ...(req.tenantId ? { tenantId: req.tenantId } : {}) },
                data: updateData
            })

            // 如果传入了 variants 数组，使用 upsert 策略保留已有规格 ID
            if (variants !== undefined) {
                // 获取当前数据库中的旧规格
                const existingVariants = await tx.productVariant.findMany({
                    where: { productId: id }
                })

                if (variants && variants.length > 0) {
                    const validVariants = variants.filter(v => v.name && v.price)

                    if (validVariants.length > 0) {
                        // 构建匹配 key: name + type
                        const makeKey = (name, type) => `${(type || '').trim()}::${(name || '').trim()}`

                        // 将旧规格按 key 索引
                        const existingMap = new Map()
                        for (const ev of existingVariants) {
                            existingMap.set(makeKey(ev.name, ev.type), ev)
                        }

                        const matchedExistingIds = new Set()

                        // 逐个处理传入的规格：匹配则更新，不匹配则新建
                        for (let i = 0; i < validVariants.length; i++) {
                            const v = validVariants[i]
                            const key = makeKey(v.name, v.type)
                            const existing = existingMap.get(key)

                            if (existing) {
                                // 更新已有规格（保留 ID）
                                matchedExistingIds.add(existing.id)
                                await tx.productVariant.update({
                                    where: { id: existing.id },
                                    data: {
                                        price: parseFloat(v.price) || 0,
                                        originalPrice: v.originalPrice ? parseFloat(v.originalPrice) : null,
                                        stock: parseInt(v.stock) || 0,
                                        sortOrder: i,
                                        status: 'ACTIVE',
                                        wholesalePrices: v.wholesalePrices || []
                                    }
                                })
                            } else {
                                // 新建规格
                                await tx.productVariant.create({
                                    data: {
                                        productId: id,
                                        type: v.type || null,
                                        name: v.name,
                                        price: parseFloat(v.price) || 0,
                                        originalPrice: v.originalPrice ? parseFloat(v.originalPrice) : null,
                                        stock: parseInt(v.stock) || 0,
                                        sortOrder: i,
                                        status: 'ACTIVE',
                                        wholesalePrices: v.wholesalePrices || []
                                    }
                                })
                            }
                        }

                        // 找出需要删除的旧规格（不在新列表中的）
                        const toDeleteIds = existingVariants
                            .filter(ev => !matchedExistingIds.has(ev.id))
                            .map(ev => ev.id)

                        if (toDeleteIds.length > 0) {
                            await deleteAvailableCardsForVariants(tx, toDeleteIds)
                            await tx.productVariant.deleteMany({
                                where: { id: { in: toDeleteIds } }
                            })
                        }

                        // 更新商品价格和库存
                        const prices = validVariants.map(v => parseFloat(v.price) || 0)
                        const minPrice = Math.min(...prices)

                        const originalPrices = validVariants
                            .map(v => v.originalPrice ? parseFloat(v.originalPrice) : 0)
                            .filter(p => p > 0)
                        const maxOriginalPrice = originalPrices.length > 0 ? Math.max(...originalPrices) : null

                        const totalStock = validVariants.reduce((sum, v) => sum + (parseInt(v.stock) || 0), 0)

                        await tx.product.update({
                            where: { id, ...(req.tenantId ? { tenantId: req.tenantId } : {}) },
                            data: {
                                price: minPrice,
                                originalPrice: maxOriginalPrice,
                                stock: totalStock
                            }
                        })
                    }
                } else {
                    // variants 为空数组，删除所有规格和对应未售卡密
                    if (existingVariants.length > 0) {
                        const allVariantIds = existingVariants.map(ev => ev.id)
                        await deleteAvailableCardsForVariants(tx, allVariantIds)
                        await tx.productVariant.deleteMany({
                            where: { productId: id }
                        })
                        const stockMode = await getStockMode(req.tenantId)
                        if (stockMode === 'manual') {
                            await tx.product.update({
                                where: { id, ...(req.tenantId ? { tenantId: req.tenantId } : {}) },
                                data: { stock: stock !== undefined ? parseInt(stock) || 0 : 0 }
                            })
                        } else {
                            const remainingStock = await tx.card.count({
                                where: {
                                    productId: id,
                                    status: 'AVAILABLE'
                                }
                            })
                            await tx.product.update({
                                where: { id, ...(req.tenantId ? { tenantId: req.tenantId } : {}) },
                                data: { stock: remainingStock }
                            })
                        }
                    }
                }
            }

            // 返回包含规格的商品数据
            return tx.product.findUnique({
                where: { id, ...(req.tenantId ? { tenantId: req.tenantId } : {}) },
                include: { variants: true }
            })
        })

        res.json({ message: '商品更新成功', product })
    } catch (error) {
        next(error)
    }
}

// 商品管理 - 删除
exports.deleteProduct = async (req, res, next) => {
    try {
        const { id } = req.params
        if (req.tenantId) { const item = await prisma.product.findFirst({ where: { id, tenantId: req.tenantId } }); if (!item) return res.status(403).json({ error: '无权操作或记录不存在' }) }

        await prisma.product.delete({ where: { id, ...(req.tenantId ? { tenantId: req.tenantId } : {}) } })

        res.json({ message: '商品删除成功' })
    } catch (error) {
        next(error)
    }
}

// 分类管理
exports.getCategories = async (req, res, next) => {
    try {
        const categories = await prisma.category.findMany({
            orderBy: { sortOrder: 'asc' },
            include: { _count: { select: { products: true } } }
        })

        // 转换格式，添加 productCount 字段
        const formattedCategories = categories.map(cat => ({
            id: cat.id,
            name: cat.name,
            description: cat.description,
            icon: cat.icon,
            status: cat.status,
            sortOrder: cat.sortOrder,
            productCount: cat._count?.products || 0
        }))

        res.json({ categories: formattedCategories })
    } catch (error) {
        next(error)
    }
}

exports.createCategory = async (req, res, next) => {
    try {
        const { name, description, icon, sortOrder } = req.body

        const category = await prisma.category.create({
            data: { name, description, icon, sortOrder: sortOrder || 0 }
        })

        res.status(201).json({ message: '分类创建成功', category })
    } catch (error) {
        next(error)
    }
}

exports.updateCategory = async (req, res, next) => {
    try {
        const { id } = req.params
        if (req.tenantId) { const item = await prisma.category.findFirst({ where: { id, tenantId: req.tenantId } }); if (!item) return res.status(403).json({ error: '无权操作或记录不存在' }) }
        const { name, description, icon, sortOrder, status } = req.body

        const category = await prisma.category.update({
            where: { id, ...(req.tenantId ? { tenantId: req.tenantId } : {}) },
            data: { name, description, icon, sortOrder, status: status?.toUpperCase() }
        })

        res.json({ message: '分类更新成功', category })
    } catch (error) {
        next(error)
    }
}

exports.deleteCategory = async (req, res, next) => {
    try {
        const { id } = req.params
        if (req.tenantId) { const item = await prisma.category.findFirst({ where: { id, tenantId: req.tenantId } }); if (!item) return res.status(403).json({ error: '无权操作或记录不存在' }) }

        await prisma.category.delete({ where: { id, ...(req.tenantId ? { tenantId: req.tenantId } : {}) } })

        res.json({ message: '分类删除成功' })
    } catch (error) {
        next(error)
    }
}

// 订单管理 - 列表
exports.getOrders = async (req, res, next) => {
    try {
        const { page = 1, pageSize = 20, status, userId, email, search } = req.query

        const where = {};
        if (req.tenantId) where.tenantId = req.tenantId;
        
        if (status) where.status = status.toUpperCase()
        if (email) where.email = email

        const andConditions = []

        if (userId) {
            andConditions.push({
                OR: [
                    { userId: userId },
                    { customerId: userId }
                ]
            })
        }

        // 搜索：按订单号、邮箱、商品名称模糊匹配
        if (search && search.trim()) {
            const keyword = search.trim()
            andConditions.push({
                OR: [
                    { orderNo: { contains: keyword } },
                    { email: { contains: keyword } },
                    { productName: { contains: keyword } }
                ]
            })
        }

        if (andConditions.length > 0) {
            where.AND = andConditions
        }

        const [orders, total] = await Promise.all([
            prisma.order.findMany({
                where,
                include: {
                    product: { select: { name: true, image: true } }
                },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * pageSize,
                take: parseInt(pageSize)
            }),
            prisma.order.count({ where })
        ])

        res.json({
            orders: orders.map(o => ({
                ...o,
                unitPrice: parseFloat(o.unitPrice),
                totalAmount: parseFloat(o.totalAmount),
                status: o.status.toLowerCase()
            })),
            total,
            page: parseInt(page),
            pageSize: parseInt(pageSize)
        })
    } catch (error) {
        next(error)
    }
}

// 订单管理 - 更新状态
exports.updateOrderStatus = async (req, res, next) => {
    try {
        const { id } = req.params
        const { status } = req.body

        const order = await prisma.order.update({
            where: { id, ...(req.tenantId ? { tenantId: req.tenantId } : {}) },
            data: { status: status.toUpperCase() }
        })

        res.json({ message: '订单状态更新成功', order })
    } catch (error) {
        next(error)
    }
}

// 订单管理 - 退款
exports.refundOrder = async (req, res, next) => {
    try {
        const { id } = req.params

        const order = await prisma.order.findFirst({ where: { ...(req.tenantId ? { tenantId: req.tenantId } : {}), id } })

        if (!order) {
            return res.status(404).json({ error: '订单不存在' })
        }

        if (order.status === 'REFUNDING') {
            return res.status(400).json({ error: '该订单已在退款中' })
        }

        if (order.status === 'REFUNDED') {
            return res.status(400).json({ error: '该订单已退款' })
        }

        if (!['PAID', 'COMPLETED'].includes(order.status)) {
            return res.status(400).json({ error: '当前订单状态不能发起退款' })
        }

        await prisma.order.update({
            where: { id, ...(req.tenantId ? { tenantId: req.tenantId } : {}) },
            data: {
                status: 'REFUNDING'
            }
        })

        res.json({ message: '订单已标记为退款中' })
    } catch (error) {
        next(error)
    }
}

// 订单管理 - 完成退款
exports.completeRefundOrder = async (req, res, next) => {
    try {
        const { id } = req.params
        const refundCompletedAt = new Date()

        const order = await prisma.order.findUnique({
            where: { id, ...(req.tenantId ? { tenantId: req.tenantId } : {}) },
            include: {
                cards: true,
                product: {
                    select: { name: true }
                }
            }
        })

        if (!order) {
            return res.status(404).json({ error: '订单不存在' })
        }

        if (order.status === 'REFUNDED') {
            return res.status(400).json({ error: '该订单已退款' })
        }

        if (order.status !== 'REFUNDING') {
            return res.status(400).json({ error: '订单需先进入退款中状态' })
        }

        await prisma.$transaction(async (tx) => {
            await tx.order.update({
                where: { id, ...(req.tenantId ? { tenantId: req.tenantId } : {}) },
                data: {
                    status: 'REFUNDED',
                    completedAt: refundCompletedAt
                }
            })

            await releaseOrderCards(tx, order)

            await tx.payment.updateMany({
                where: { orderId: id },
                data: { status: 'REFUNDED' }
            })

            // 回滚已结算的代理商佣金（如有）
            await agentService.rollbackAgentOrder(id, tx)
        })

        let emailSent = false
        try {
            const emailResult = await emailService.sendOrderRefundedEmail({
                ...order,
                status: 'REFUNDED',
                completedAt: refundCompletedAt
            })
            emailSent = emailResult.success
        } catch (emailError) {
            console.error('退款成功邮件发送失败:', emailError)
        }

        // 通知管理员订单已成功退款
        try {
            const { notifyRefund } = require('../services/notifyDispatcher')
            notifyRefund({
                ...order,
                completedAt: refundCompletedAt
            }).catch(e => console.error('管理员退款通知失败:', e))
        } catch (notifyError) {
            console.error('触发退款通知失败:', notifyError)
        }

        res.json({
            message: emailSent ? '订单已退款，卡密已释放，退款通知邮件已发送' : '订单已退款，卡密已释放',
            emailSent
        })
    } catch (error) {
        next(error)
    }
}

// 订单管理 - 拒绝/取消退款
exports.cancelRefundOrder = async (req, res, next) => {
    try {
        const { id } = req.params

        const order = await prisma.order.findUnique({
            where: { id, ...(req.tenantId ? { tenantId: req.tenantId } : {}) },
            include: { cards: true }
        })

        if (!order) {
            return res.status(404).json({ error: '订单不存在' })
        }

        if (order.status !== 'REFUNDING') {
            return res.status(400).json({ error: '只有退款中的订单才能拒绝退款' })
        }

        // 恢复状态的判定规则：如果有关联卡密或 completedAt 不为空，则恢复为 COMPLETED，否则恢复为 PAID
        const targetStatus = (order.cards && order.cards.length > 0) || order.completedAt ? 'COMPLETED' : 'PAID'

        await prisma.order.update({
            where: { id, ...(req.tenantId ? { tenantId: req.tenantId } : {}) },
            data: {
                status: targetStatus
            }
        })

        res.json({ message: `退款已拒绝，订单已恢复为${targetStatus === 'COMPLETED' ? '已完成' : '已支付'}状态`, status: targetStatus })
    } catch (error) {
        next(error)
    }
}


// 订单管理 - 删除订单
exports.deleteOrder = async (req, res, next) => {
    try {
        const { id } = req.params

        const order = await prisma.order.findUnique({
            where: { id, ...(req.tenantId ? { tenantId: req.tenantId } : {}) },
            include: { cards: true, payment: true }
        })

        if (!order) {
            return res.status(404).json({ error: '订单不存在' })
        }

        // 使用事务：释放卡密 + 删除支付记录 + 删除订单
        await prisma.$transaction(async (tx) => {
            const releasedCards = order.cards || []
            const releasedCount = releasedCards.length

            // 释放关联卡密（解除关联，但不删除卡密本身）
            if (order.cards && order.cards.length > 0) {
                await tx.card.updateMany({
                    where: { orderId: id },
                    data: {
                        status: 'AVAILABLE',
                        orderId: null,
                        soldAt: null
                    }
                })

                // 回补商品库存
                await tx.product.update({
                    where: { id: order.productId },
                    data: { stock: { increment: releasedCount } }
                })

                // 回补规格库存
                const variantCountMap = new Map()
                releasedCards.forEach((c) => {
                    if (c.variantId) {
                        variantCountMap.set(c.variantId, (variantCountMap.get(c.variantId) || 0) + 1)
                    }
                })

                for (const [variantId, count] of variantCountMap.entries()) {
                    await tx.productVariant.update({
                        where: { id: variantId },
                        data: { stock: { increment: count } }
                    })
                }
            }

            // 删除支付记录
            if (order.payment) {
                await tx.payment.delete({ where: { orderId: id } })
            }

            // 删除关联的工单（如果有）
            await tx.ticketMessage.deleteMany({
                where: { ticket: { orderId: id } }
            })
            await tx.ticket.deleteMany({ where: { orderId: id } })

            // 删除订单
            await tx.order.delete({ where: { id, ...(req.tenantId ? { tenantId: req.tenantId } : {}) } })
        })

        res.json({ message: '订单已删除' })
    } catch (error) {
        next(error)
    }
}

// 订单管理 - 手动发货（完成订单并发送邮件）
exports.shipOrder = async (req, res, next) => {
    try {
        const { id } = req.params
        const { cardContent } = req.body  // 支持手动输入卡密内容
        const emailService = require('../services/emailService')

        // 获取订单和卡密信息
        const order = await prisma.order.findUnique({
            where: { id, ...(req.tenantId ? { tenantId: req.tenantId } : {}) },
            include: {
                product: true,
                cards: true
            }
        })

        if (!order) {
            return res.status(404).json({ error: '订单不存在' })
        }

        if (order.status !== 'PAID') {
            return res.status(400).json({ error: '只有已支付订单才能发货' })
        }

        // 检查是否需要手动输入卡密
        const hasExistingCards = order.cards && order.cards.length > 0
        const hasManualInput = cardContent && cardContent.trim()

        if (!hasExistingCards && !hasManualInput) {
            return res.status(400).json({
                error: '该订单没有卡密，请输入卡密内容后再发货',
                needCardContent: true,
                orderNo: order.orderNo
            })
        }

        // 如果手动输入了卡密，创建卡密记录并关联到订单
        let newCards = []
        if (hasManualInput) {
            // 手动发货始终为单条导入：整段内容作为一个卡密（支持多行长卡密/内容）
            const content = cardContent.trim()
            if (content.length > 0) {
                const card = await prisma.card.create({
                    data: {
                        productId: order.productId,
                        variantId: order.variantId || null,
                        content: content,
                        status: 'SOLD',
                        orderId: order.id,
                        soldAt: new Date()
                    }
                })
                newCards.push(card)

                // 更新商品已售数量
                await prisma.product.update({
                    where: { id: order.productId },
                    data: { soldCount: { increment: order.quantity } }
                })
            }
        }

        // 更新订单状态为已完成
        const updatedOrder = await prisma.order.update({
            where: { id, ...(req.tenantId ? { tenantId: req.tenantId } : {}) },
            data: {
                status: 'COMPLETED',
                completedAt: new Date()
            },
            include: {
                product: true,
                cards: true  // 包含刚创建的卡密
            }
        })

        // ---- 代理利润结算 ----
        await agentService.settleAgentOrder(updatedOrder.id)

        // 发送邮件通知
        let emailSent = false
        try {
            await emailService.sendOrderCompletedEmail(updatedOrder, updatedOrder.cards)
            emailSent = true
        } catch (emailError) {
            console.error('发货邮件发送失败:', emailError)
        }

        res.json({
            message: emailSent ? '发货成功，邮件已发送' : '发货成功，但邮件发送失败',
            order: {
                orderNo: updatedOrder.orderNo,
                status: updatedOrder.status,
                completedAt: updatedOrder.completedAt
            },
            cardsAdded: newCards.length,
            emailSent
        })
    } catch (error) {
        next(error)
    }
}

// 订单管理 - 补发卡密（已完成订单追加卡密并重发邮件）
exports.resendCards = async (req, res, next) => {
    try {
        const { id } = req.params
        const { cardContent } = req.body
        const emailService = require('../services/emailService')

        if (!cardContent || !cardContent.trim()) {
            return res.status(400).json({ error: '请输入补发的卡密内容' })
        }

        // 获取订单
        const order = await prisma.order.findUnique({
            where: { id, ...(req.tenantId ? { tenantId: req.tenantId } : {}) },
            include: { product: true, cards: true }
        })

        if (!order) {
            return res.status(404).json({ error: '订单不存在' })
        }

        if (order.status !== 'COMPLETED' && order.status !== 'PAID') {
            return res.status(400).json({ error: '只有已支付或已完成的订单才能补发' })
        }

        // 重发/补发卡密始终为单条导入：整段内容作为一个卡密（支持多行长卡密/内容）
        const content = cardContent.trim()
        const newCards = []
        if (content.length > 0) {
            const card = await prisma.card.create({
                data: {
                    productId: order.productId,
                    variantId: order.variantId || null,
                    content: content,
                    status: 'SOLD',
                    orderId: order.id,
                    soldAt: new Date()
                }
            })
            newCards.push(card)
        }

        // 如果订单还是 PAID 状态，更新为 COMPLETED
        if (order.status === 'PAID') {
            await prisma.order.update({
                where: { id, ...(req.tenantId ? { tenantId: req.tenantId } : {}) },
                data: { status: 'COMPLETED', completedAt: new Date() }
            })
            // ---- 代理利润结算 ----
            await agentService.settleAgentOrder(order.id)
        }

        // 重新获取包含所有卡密的订单
        const fullOrder = await prisma.order.findUnique({
            where: { id, ...(req.tenantId ? { tenantId: req.tenantId } : {}) },
            include: { product: true, cards: true }
        })

        // 重新发送邮件（包含所有卡密）
        let emailSent = false
        try {
            await emailService.sendOrderCompletedEmail(fullOrder, fullOrder.cards)
            emailSent = true
        } catch (emailError) {
            console.error('补发邮件发送失败:', emailError)
        }

        res.json({
            message: emailSent ? '补发成功，邮件已发送' : '补发成功，但邮件发送失败',
            cardsAdded: newCards.length,
            totalCards: fullOrder.cards.length,
            emailSent
        })
    } catch (error) {
        next(error)
    }
}

// 用户管理
exports.getUsers = async (req, res, next) => {
    try {
        const { page = 1, pageSize = 20, search = '', role = 'all' } = req.query

        // 商户后台：返回该商城的顾客 + 商城管理员（合并展示）
        if (req.tenantId) {
            // 1. 查询本商城所有者 + 子管理员（users 表）
            const tenant = await prisma.tenant.findUnique({
                where: { id: req.tenantId },
                select: { userId: true }
            })
            const ownerId = tenant?.userId
            const adminUsers = await prisma.user.findMany({
                where: {
                    OR: [
                        ...(ownerId ? [{ id: ownerId }] : []),
                        { tenantId: req.tenantId, role: 'ADMIN' }
                    ]
                },
                select: {
                    id: true, email: true, username: true, role: true, status: true, createdAt: true
                }
            })

            // 2. 查询本商城顾客（customers 表）
            const customerWhere = { tenantId: req.tenantId }
            if (search) {
                customerWhere.OR = [
                    { email: { contains: search } },
                    { username: { contains: search } }
                ]
            }
            const customers = await prisma.customer.findMany({
                where: customerWhere,
                select: {
                    id: true,
                    email: true,
                    username: true,
                    status: true,
                    emailVerified: true,
                    createdAt: true,
                    _count: { select: { orders: true } }
                },
                orderBy: { createdAt: 'desc' }
            })

            // 3. 合并 + 处理搜索过滤（admin 需在内存中过滤搜索）
            let allUsers = [
                ...adminUsers.map(u => ({
                    id: u.id,
                    email: u.email,
                    username: u.username,
                    role: u.role, // TENANT_ADMIN / ADMIN
                    emailVerified: true,
                    status: u.status,
                    createdAt: u.createdAt,
                    _count: { orders: 0 }
                })),
                ...customers.map(c => ({
                    id: c.id,
                    email: c.email,
                    username: c.username,
                    role: 'CUSTOMER',
                    emailVerified: c.emailVerified,
                    status: c.status,
                    createdAt: c.createdAt,
                    _count: c._count
                }))
            ]

            // 搜索过滤（admin 部分）
            if (search) {
                const term = search.toLowerCase()
                allUsers = allUsers.filter(u =>
                    (u.email || '').toLowerCase().includes(term) ||
                    (u.username || '').toLowerCase().includes(term)
                )
            }

            // role 过滤
            if (role && role !== 'all') {
                allUsers = allUsers.filter(u => u.role === role)
            }

            // 排序
            allUsers.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

            const total = allUsers.length
            const skip = (parseInt(page) - 1) * parseInt(pageSize)
            const paged = allUsers.slice(skip, skip + parseInt(pageSize))

            return res.json({ users: paged, total, page: parseInt(page), pageSize: parseInt(pageSize) })
        }

        // 主站（SUPER_ADMIN）：返回 users 表（平台账号）
        const where = {};
        if (search) {
            where.OR = [
                { email: { contains: search } },
                { username: { contains: search } }
            ]
        }
        if (role && role !== 'all') {
            where.role = role
        }

        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where,
                select: {
                    id: true,
                    email: true,
                    username: true,
                    role: true,
                    status: true,
                    createdAt: true,
                    _count: { select: { orders: true } },
                    referralAgent: { select: { shopName: true, shopSlug: true } }
                },
                orderBy: { createdAt: 'desc' },
                skip: (parseInt(page) - 1) * parseInt(pageSize),
                take: parseInt(pageSize)
            }),
            prisma.user.count({ where })
        ])

        res.json({ users, total, page: parseInt(page), pageSize: parseInt(pageSize) })
    } catch (error) {
        next(error)
    }
}

// 邮件资源包套餐定义
const EMAIL_PACK_OPTIONS = [
    { key: '2K', count: 2000, price: 7 },
    { key: '5K', count: 5000, price: 15 },
    { key: '10K', count: 10000, price: 30 }
]

exports.getEmailPackOptions = async (req, res) => {
    res.json({ packs: EMAIL_PACK_OPTIONS })
}

// 创建邮件资源包订单（复用支付流程）
exports.createEmailPackOrder = async (req, res, next) => {
    try {
        if (!req.tenantId) return res.status(400).json({ error: '未识别商户' })
        const { packKey, paymentMethod } = req.body
        const pack = EMAIL_PACK_OPTIONS.find(p => p.key === packKey)
        if (!pack) return res.status(400).json({ error: '无效的资源包' })
        if (!['alipay', 'usdt', 'bsc_usdt'].includes(paymentMethod)) {
            return res.status(400).json({ error: '不支持的支付方式' })
        }

        const tenant = await prisma.tenant.findUnique({ where: { id: req.tenantId } })
        if (!tenant) return res.status(404).json({ error: '租户不存在' })

        const orderNo = `EP${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`

        // 占位商品
        let pkgProduct = await prisma.product.findFirst({ where: { name: '邮件资源包', status: 'INACTIVE' } })
        if (!pkgProduct) {
            pkgProduct = await prisma.product.create({
                data: { name: '邮件资源包', price: 0, status: 'INACTIVE', description: '平台邮件资源包占位商品' }
            })
        }

        const order = await prisma.order.create({
            data: {
                orderNo,
                email: req.user?.email || tenant.shopName,
                productId: pkgProduct.id,
                productName: `邮件资源包 ${pack.count} 封`,
                quantity: 1,
                unitPrice: pack.price,
                totalAmount: pack.price,
                status: 'PENDING',
                paymentMethod,
                remark: `email_pack:${tenant.id}:${pack.count}`
            }
        })

        let paymentData = {}
        if (paymentMethod === 'alipay') {
            const alipayService = require('../services/alipayService')
            try {
                const frontendUrl = process.env.FRONTEND_URL || `${req.protocol}://${req.get('host')}`
                const base = frontendUrl.endsWith('/') ? frontendUrl.slice(0, -1) : frontendUrl
                const notifyUrl = `${base}/api/payment/alipay/notify`

                const result = await alipayService.createQrCodePayment({
                    orderNo,
                    totalAmount: pack.price,
                    productName: `Vmart 邮件资源包 ${pack.count}封`
                }, null, notifyUrl)
                paymentData = { paymentType: 'qrcode', qrCode: result.qrCode, orderNo }
            } catch (e) {
                return res.status(500).json({ error: '支付宝支付暂不可用，请选择其他方式' })
            }
        } else if (paymentMethod === 'usdt' || paymentMethod === 'bsc_usdt') {
            const walletKey = paymentMethod === 'usdt' ? 'usdt_wallet' : 'bsc_usdt_wallet'
            const walletSetting = await prisma.platformSetting.findUnique({ where: { key: walletKey } })
            if (!walletSetting?.value) {
                return res.status(400).json({ error: 'USDT 收款地址未配置，请联系平台' })
            }
            
            const rateKey = paymentMethod === 'usdt' ? 'usdt_rate' : 'bsc_usdt_rate'
            const rateSetting = await prisma.platformSetting.findUnique({ where: { key: rateKey } })
            const exchangeRate = rateSetting?.value ? parseFloat(rateSetting.value) || 7.2 : 7.2

            const usdtAmount = parseFloat((pack.price / exchangeRate).toFixed(2))
            const uniqueAmount = usdtAmount + parseFloat((Math.random() * 0.09 + 0.01).toFixed(2))
            const updateData = paymentMethod === 'usdt'
                ? { usdtAmount: uniqueAmount }
                : { bscUsdtAmount: uniqueAmount }
            await prisma.order.update({ where: { id: order.id }, data: updateData })
            paymentData = {
                paymentType: paymentMethod,
                walletAddress: walletSetting.value,
                usdtAmount: uniqueAmount,
                exchangeRate,
                qrContent: paymentMethod === 'usdt' ? `tron:${walletSetting.value}?amount=${uniqueAmount}` : walletSetting.value,
                orderNo
            }
        }

        res.json({
            orderNo,
            packKey,
            count: pack.count,
            amount: pack.price,
            ...paymentData
        })
    } catch (error) {
        next(error)
    }
}

// 查询邮件资源包订单状态
exports.checkEmailPackOrder = async (req, res, next) => {
    try {
        const { orderNo } = req.params
        const order = await prisma.order.findUnique({ where: { orderNo } })
        if (!order) return res.status(404).json({ error: '订单不存在' })
        if (!order.remark?.startsWith('email_pack:')) {
            return res.status(400).json({ error: '订单类型不符' })
        }
        return res.json({
            status: ['COMPLETED', 'PAID'].includes(order.status) ? 'paid' : (order.status === 'CANCELLED' ? 'cancelled' : 'pending')
        })
    } catch (error) {
        next(error)
    }
}

// 取消邮件资源包订单（用户主动取消，或前端超时触发）
exports.cancelEmailPackOrder = async (req, res, next) => {
    try {
        const { orderNo } = req.params
        const order = await prisma.order.findUnique({ where: { orderNo } })
        if (!order) return res.status(404).json({ error: '订单不存在' })
        if (!order.remark?.startsWith('email_pack:')) {
            return res.status(400).json({ error: '订单类型不符' })
        }
        if (order.status !== 'PENDING') {
            return res.status(400).json({ error: '订单已处理，无法取消' })
        }
        await prisma.order.update({
            where: { id: order.id },
            data: { status: 'CANCELLED', cancelledAt: new Date() }
        })
        res.json({ message: '订单已取消' })
    } catch (error) {
        next(error)
    }
}

// 当前租户本月邮件使用情况
exports.getEmailUsage = async (req, res, next) => {
    try {
        if (!req.tenantId) return res.json({ used: 0, limit: -1, plan: null, packBalance: 0 })

        const tenant = await prisma.tenant.findUnique({
            where: { id: req.tenantId },
            select: { shopSlug: true }
        })
        if (!tenant) return res.json({ used: 0, limit: -1, plan: null, packBalance: 0 })

        const shop = await prisma.shop.findUnique({
            where: { slug: tenant.shopSlug },
            select: { plan: true }
        })

        const effectivePlanKey = shop?.plan === 'FREE' ? 'PRO' : shop?.plan
        // 兜底默认值：未配置过的套餐或已配置但缺字段的，按默认额度处理
        const fallbackQuota = { FREE: 5000, BASIC: 0, STANDARD: 2000, PRO: 5000 }
        let emailLimit = fallbackQuota[effectivePlanKey] ?? 0

        const setting = await prisma.platformSetting.findUnique({ where: { key: 'plan_config' } })
        if (setting?.value) {
            try {
                const config = JSON.parse(setting.value)
                const planInfo = (config.plans || []).find(p => p.key === effectivePlanKey)
                if (planInfo?.features?.emailNotifications !== undefined) {
                    emailLimit = planInfo.features.emailNotifications
                }
            } catch {}
        }

        const { getEmailUsage, getEmailPackBalance } = require('../services/tenantEmailService')
        const used = await getEmailUsage(req.tenantId)
        const packBalance = await getEmailPackBalance(req.tenantId)

        res.json({ used, limit: emailLimit, plan: shop?.plan, packBalance })
    } catch (error) {
        next(error)
    }
}

// 获取当前租户的套餐限制（供商户后台菜单等使用，无需 platform token）
exports.getPlanLimits = async (req, res, next) => {
    try {
        if (!req.tenantId) return res.json({ limits: {}, plan: null })

        const tenant = await prisma.tenant.findUnique({
            where: { id: req.tenantId },
            select: { shopSlug: true }
        })
        if (!tenant) return res.json({ limits: {}, plan: null })

        const shop = await prisma.shop.findUnique({
            where: { slug: tenant.shopSlug },
            select: { plan: true }
        })
        if (!shop) return res.json({ limits: {}, plan: null })

        // 免费试用与专业版同权限
        const effectivePlanKey = shop.plan === 'FREE' ? 'PRO' : shop.plan

        const setting = await prisma.platformSetting.findUnique({
            where: { key: 'plan_config' }
        })

        let limits = {}
        let planConfigured = false
        if (setting?.value) {
            try {
                const config = JSON.parse(setting.value)
                const planInfo = (config.plans || []).find(p => p.key === effectivePlanKey)
                if (planInfo?.features) {
                    limits = { ...planInfo.features }
                    planConfigured = true
                }
            } catch {}
        }

        // 兜底：未配置过的套餐使用默认值；已配置但缺字段的，按"未启用"处理
        if (typeof limits.maxSubAdmins !== 'number') {
            const fallback = { FREE: 10, BASIC: 0, STANDARD: 2, PRO: 10 }
            limits.maxSubAdmins = fallback[shop.plan] ?? 0
        }
        if (typeof limits.emailNotifications !== 'number') {
            const fallback = { FREE: 5000, BASIC: 0, STANDARD: 2000, PRO: 5000 }
            limits.emailNotifications = fallback[shop.plan] ?? 0
        }
        if (typeof limits.support !== 'boolean') {
            limits.support = !planConfigured // 已配置过的套餐缺该字段 = 关闭
        }
        if (typeof limits.customerTickets !== 'boolean') {
            limits.customerTickets = !planConfigured
        }

        res.json({ plan: shop.plan, limits })
    } catch (error) {
        next(error)
    }
}

// 系统设置
exports.getSettings = async (req, res, next) => {
    try {
        if (req.user?.role === 'ADMIN') {
            return res.status(403).json({ error: '子管理员无权访问商城设置' })
        }
        let settingsObj = {};
        
        if (req.tenantId) {
            // Tenant specific settings
            const tenantSetting = await prisma.tenantSetting.findUnique({
                where: { tenantId: req.tenantId }
            });
            if (tenantSetting && tenantSetting.systemSettings) {
                try {
                    settingsObj = JSON.parse(tenantSetting.systemSettings);
                } catch (e) {
                    console.error('Failed to parse tenant systemSettings:', e);
                }
            }

            // 获取超管后台控制的商户支付渠道与平台代收渠道开关，并拼接到设置中
            let globalChannels = {};
            try {
                const channelSettings = await prisma.platformSetting.findMany({
                    where: {
                        OR: [
                            { key: { startsWith: 'channel_' } },
                            { key: { startsWith: 'platform_channel_' } }
                        ]
                    }
                });
                channelSettings.forEach(s => {
                    globalChannels[s.key] = s.value;
                    settingsObj[s.key] = s.value;
                });
            } catch (e) {
                console.error('Failed to load platform channel settings:', e);
            }

            let platformPaymentEnabled = false;
            if (tenantSetting && tenantSetting.paymentConfig) {
                try {
                    const payConfig = JSON.parse(tenantSetting.paymentConfig);
                    settingsObj.stockMode = payConfig.stock_mode || 'auto';
                    settingsObj.orderTimeout = payConfig.order_timeout || 15;
                    settingsObj.fuzzyStockEnabled = !!payConfig.fuzzy_stock_enabled;
                    settingsObj.fuzzyStockThreshold = typeof payConfig.fuzzy_stock_threshold === 'number'
                        ? payConfig.fuzzy_stock_threshold
                        : parseInt(payConfig.fuzzy_stock_threshold || '10', 10);
                    settingsObj.showSalesCount = payConfig.show_sales_count !== false;

                    platformPaymentEnabled = !!(
                        (tenantSetting.alipayEnabled && payConfig.alipay_mode === 'platform' && globalChannels['platform_channel_alipay'] === 'true') ||
                        (tenantSetting.wechatEnabled && payConfig.wechat_mode === 'platform' && globalChannels['platform_channel_wechat'] === 'true') ||
                        (tenantSetting.usdtEnabled && payConfig.usdt_mode === 'platform' && globalChannels['platform_channel_usdt_trc20'] === 'true') ||
                        (tenantSetting.bscUsdtEnabled && payConfig.bsc_usdt_mode === 'platform' && globalChannels['platform_channel_usdt_bep20'] === 'true') ||
                        (payConfig.yipay_enabled && payConfig.yipay_mode === 'platform' && globalChannels['platform_channel_yipay'] === 'true')
                    );
                } catch (e) {}
            }

            // 即使商户关闭了平台代收渠道，如果可用余额或冻结中余额仍有钱，不要隐藏提现菜单
            let hasFunds = false;
            try {
                const tenant = await prisma.tenant.findUnique({
                    where: { id: req.tenantId },
                    select: { balance: true, frozenBalance: true }
                });
                if (tenant) {
                    const balance = parseFloat(tenant.balance || 0);
                    const frozenBalance = parseFloat(tenant.frozenBalance || 0);
                    if (balance > 0 || frozenBalance > 0) {
                        hasFunds = true;
                    }
                }
            } catch (e) {
                console.error('Failed to query tenant funds:', e);
            }

            settingsObj.platformPaymentEnabled = platformPaymentEnabled || hasFunds;
            if (!settingsObj.stockMode) {
                settingsObj.stockMode = 'auto';
            }
            if (!settingsObj.orderTimeout) {
                settingsObj.orderTimeout = 15;
            }
            
            const admins = await prisma.user.findMany({
                where: { tenant: { id: req.tenantId }, role: { in: ['ADMIN', 'SUPER_ADMIN', 'TENANT_ADMIN'] } },
                select: { id: true, email: true, username: true, role: true },
                orderBy: { createdAt: 'asc' }
            });
            
            const rawAdminEmailConfigs = parseAdminEmailConfigs(settingsObj.adminEmailNotificationConfigs);
            const normalizedConfigs = normalizeAdminEmailConfigs(rawAdminEmailConfigs, admins);
            const configuredIds = new Set(normalizedConfigs.map(config => config.userId));
            const missingConfigs = admins
                .filter(admin => !configuredIds.has(admin.id))
                .map(admin => ({
                    userId: admin.id,
                    email: admin.email,
                    username: admin.username,
                    role: admin.role,
                    enabled: false,
                    events: []
                }));
            settingsObj.adminEmailNotificationConfigs = JSON.stringify([...normalizedConfigs, ...missingConfigs]);

            // 加上当前商户是否允许代理系统的标记，前端用于禁用/隐藏 toggle
            settingsObj._planAllowsAgent = await isAgentSystemAllowed(req.tenantId);
            
        } else {            // Global settings
            const [settings, admins] = await Promise.all([
                prisma.setting.findMany(),
                prisma.user.findMany({
                    where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } },
                    select: { id: true, email: true, username: true, role: true },
                    orderBy: { createdAt: 'asc' }
                })
            ]);

            settings.forEach(s => {
                settingsObj[s.key] = s.value;
            });

            const rawAdminEmailConfigs = parseAdminEmailConfigs(settingsObj.adminEmailNotificationConfigs);
            const normalizedConfigs = normalizeAdminEmailConfigs(rawAdminEmailConfigs, admins);
            const configuredIds = new Set(normalizedConfigs.map(config => config.userId));
            const missingConfigs = admins
                .filter(admin => !configuredIds.has(admin.id))
                .map(admin => ({
                    userId: admin.id,
                    email: admin.email,
                    username: admin.username,
                    role: admin.role,
                    enabled: false,
                    events: []
                }));
            settingsObj.adminEmailNotificationConfigs = JSON.stringify([...normalizedConfigs, ...missingConfigs]);
        }

        res.json({ settings: settingsObj });
    } catch (error) {
        next(error);
    }
}

exports.updateSettings = async (req, res, next) => {
    try {
        if (req.user?.role === 'ADMIN') {
            return res.status(403).json({ error: '子管理员无权访问商城设置' })
        }
        const settings = req.body

        if (req.tenantId) {
            // 校验：开启 agentEnabled 必须满足套餐 agentSystem 条件
            if (settings.agentEnabled === true || settings.agentEnabled === 'true') {
                const allowed = await isAgentSystemAllowed(req.tenantId)
                if (!allowed) {
                    return res.status(403).json({ error: '当前套餐不支持代理系统，请升级到专业版' })
                }
            }

            // Tenant specific settings
            const tenantSetting = await prisma.tenantSetting.findUnique({
                where: { tenantId: req.tenantId }
            });
            let currentSettings = {};
            if (tenantSetting && tenantSetting.systemSettings) {
                try {
                    currentSettings = JSON.parse(tenantSetting.systemSettings);
                } catch (e) {}
            }
            const updatedSettings = { ...currentSettings, ...settings };
            await prisma.tenantSetting.upsert({
                where: { tenantId: req.tenantId },
                update: { systemSettings: JSON.stringify(updatedSettings) },
                create: { tenantId: req.tenantId, systemSettings: JSON.stringify(updatedSettings) }
            });
            res.json({ message: '设置更新成功' });
            return;
        }

        for (const [key, value] of Object.entries(settings)) {
            await prisma.setting.upsert({
                where: { key },
                create: { key, value },
                update: { value }
            })
        }

        // 检查是否更新了备份相关的设置，如果是，则重启备份调度
        const backupKeys = ['backupEnabled', 'backupFrequency', 'backupRetentionDays', 'backupEmailEnabled', 'backupEmail']
        const hasBackupUpdate = Object.keys(settings).some(key => backupKeys.includes(key))
        
        if (hasBackupUpdate) {
            const backupService = require('../services/backupService')
            backupService.startBackupSchedule().catch(err => {
                console.error('重启备份服务失败:', err)
            })
        }

        res.json({ message: '设置更新成功' })
    } catch (error) {
        next(error)
    }
}

// 测试邮件配置
exports.testEmail = async (req, res, next) => {
    try {
        if (req.user?.role === 'ADMIN') {
            return res.status(403).json({ error: '子管理员无权访问商城设置' })
        }
        const emailService = require('../services/emailService')
        const result = await emailService.testEmailConnection(req.tenantId)

        if (result.success) {
            res.json({ success: true, message: '邮件配置测试成功，连接正常' })
        } else {
            res.status(400).json({ success: false, error: result.error })
        }
    } catch (error) {
        next(error)
    }
}

// ==================== 卡密管理 ====================

// 获取卡密列表
exports.getCards = async (req, res, next) => {
    try {
        const { productId, variantId, status, keyword, page = 1, pageSize = 20 } = req.query

        const baseWhere = {};
        if (req.tenantId) baseWhere.tenantId = req.tenantId;
        if (productId) baseWhere.productId = productId
        if (variantId === 'default') {
            baseWhere.variantId = null
        } else if (variantId) {
            baseWhere.variantId = variantId
        }

        const listWhere = { ...baseWhere }
        if (status) listWhere.status = status.toUpperCase()
        if (keyword && keyword.trim()) {
            listWhere.OR = [
                { content: { contains: keyword.trim() } },
                { order: { orderNo: { contains: keyword.trim() } } }
            ]
        }

        const [cards, total, statsTotal, statsByStatus] = await Promise.all([
            prisma.card.findMany({
                where: listWhere,
                include: {
                    product: { select: { id: true, name: true } },
                    variant: { select: { id: true, name: true } },
                    order: { select: { orderNo: true } }
                },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * pageSize,
                take: parseInt(pageSize)
            }),
            prisma.card.count({ where: listWhere }),
            prisma.card.count({ where: baseWhere }),
            prisma.card.groupBy({
                by: ['status'],
                where: baseWhere,
                _count: { _all: true }
            })
        ])

        const statsMap = statsByStatus.reduce((acc, item) => {
            acc[item.status] = item._count._all
            return acc
        }, {})

        res.json({
            cards,
            total,
            page: parseInt(page),
            pageSize: parseInt(pageSize),
            totalPages: Math.ceil(total / pageSize),
            stats: {
                total: statsTotal,
                available: statsMap.AVAILABLE || 0,
                sold: statsMap.SOLD || 0,
                expired: statsMap.EXPIRED || 0
            }
        })
    } catch (error) {
        next(error)
    }
}

// 批量导入卡密
exports.importCards = async (req, res, next) => {
    try {
        const { productId, variantId, cards } = req.body

        if (!productId) {
            return res.status(400).json({ error: '请选择商品' })
        }

        if (!cards || !Array.isArray(cards) || cards.length === 0) {
            return res.status(400).json({ error: '请提供卡密数据' })
        }

        // 校验商品归属（防止跨租户导入）
        const product = await prisma.product.findFirst({
            where: { id: productId, ...(req.tenantId ? { tenantId: req.tenantId } : {}) }
        })
        if (!product) {
            return res.status(404).json({ error: '商品不存在或无权限' })
        }

        // 过滤空行并去重
        const uniqueCards = [...new Set(cards.filter(c => c && c.trim()))]

        if (uniqueCards.length === 0) {
            return res.status(400).json({ error: '没有有效的卡密数据' })
        }

        // 批量创建
        const result = await prisma.card.createMany({
            data: uniqueCards.map(content => ({
                productId,
                variantId: variantId || null,
                content: content.trim(),
                status: 'AVAILABLE',
                tenantId: req.tenantId || null
            })),
            skipDuplicates: false
        })

        // 更新库存：商品库存始终同步，规格库存按需同步
        await prisma.$transaction(async (tx) => {
            await tx.product.update({
                where: { id: productId },
                data: { stock: { increment: result.count } }
            })

            if (variantId) {
                await tx.productVariant.update({
                    where: { id: variantId },
                    data: { stock: { increment: result.count } }
                })
            }
        })

        res.json({
            message: `成功导入 ${result.count} 个卡密`,
            count: result.count
        })
    } catch (error) {
        next(error)
    }
}

// 删除单个卡密
exports.deleteCard = async (req, res, next) => {
    try {
        const { id } = req.params

        const card = await prisma.card.findFirst({ where: { ...(req.tenantId ? { tenantId: req.tenantId } : {}), id } })
        if (!card) {
            return res.status(404).json({ error: '卡密不存在' })
        }

        if (card.status === 'SOLD') {
            return res.status(400).json({ error: '已售出的卡密不能删除' })
        }

        await prisma.$transaction(async (tx) => {
            await tx.card.delete({ where: { id, ...(req.tenantId ? { tenantId: req.tenantId } : {}) } })

            // 商品库存始终同步
            await tx.product.update({
                where: { id: card.productId },
                data: { stock: { decrement: 1 } }
            })

            // 规格库存按需同步
            if (card.variantId) {
                await tx.productVariant.update({
                    where: { id: card.variantId },
                    data: { stock: { decrement: 1 } }
                })
            }
        })

        res.json({ message: '卡密删除成功' })
    } catch (error) {
        next(error)
    }
}

// 批量删除卡密
exports.deleteCards = async (req, res, next) => {
    try {
        const { ids, productId } = req.body

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ error: '请选择要删除的卡密' })
        }

        // 先查询将要删除的可用卡密，用于精确回写商品/规格库存
        const cardsToDelete = await prisma.card.findMany({
            where: {
                id: { in: ids },
                status: 'AVAILABLE'
            },
            select: {
                id: true,
                productId: true,
                variantId: true
            }
        })

        if (cardsToDelete.length === 0) {
            return res.json({
                message: '没有可删除的卡密',
                count: 0
            })
        }

        const cardIds = cardsToDelete.map(c => c.id)

        const productCountMap = new Map()
        const variantCountMap = new Map()

        cardsToDelete.forEach((c) => {
            productCountMap.set(c.productId, (productCountMap.get(c.productId) || 0) + 1)
            if (c.variantId) {
                variantCountMap.set(c.variantId, (variantCountMap.get(c.variantId) || 0) + 1)
            }
        })

        const result = await prisma.$transaction(async (tx) => {
            const deleted = await tx.card.deleteMany({
                where: {
                    id: { in: cardIds },
                    status: 'AVAILABLE'
                }
            })

            for (const [pid, count] of productCountMap.entries()) {
                await tx.product.update({
                    where: { id: pid },
                    data: { stock: { decrement: count } }
                })
            }

            for (const [vid, count] of variantCountMap.entries()) {
                await tx.productVariant.update({
                    where: { id: vid },
                    data: { stock: { decrement: count } }
                })
            }

            return deleted
        })

        res.json({
            message: `成功删除 ${result.count} 个卡密`,
            count: result.count
        })
    } catch (error) {
        next(error)
    }
}

// 更新单个卡密
exports.updateCard = async (req, res, next) => {
    try {
        const { id } = req.params
        const { content } = req.body

        if (!content || !content.trim()) {
            return res.status(400).json({ error: '卡密内容不能为空' })
        }

        const card = await prisma.card.findFirst({ where: { ...(req.tenantId ? { tenantId: req.tenantId } : {}), id } })
        if (!card) {
            return res.status(404).json({ error: '卡密不存在' })
        }

        if (card.status === 'SOLD') {
            return res.status(400).json({ error: '已售出的卡密不能编辑' })
        }

        const updatedCard = await prisma.card.update({
            where: { id, ...(req.tenantId ? { tenantId: req.tenantId } : {}) },
            data: { content: content.trim() }
        })

        res.json({ message: '卡密更新成功', card: updatedCard })
    } catch (error) {
        next(error)
    }
}

// 手动清理未验证账户
exports.cleanupUnverifiedAccounts = async (req, res, next) => {
    try {
        const days = parseInt(req.query.days) || 14
        const { cleanupUnverifiedAccounts } = require('../utils/accountCleanup')

        const result = await cleanupUnverifiedAccounts(days)

        res.json({
            message: `已清理 ${result.deleted} 个未验证账户`,
            deleted: result.deleted,
            users: result.users || []
        })
    } catch (error) {
        next(error)
    }
}

// ==================== 数据库备份 ====================

// 获取备份状态
exports.getBackupStatus = async (req, res, next) => {
    if (req.tenantId) return res.json({ status: 'idle', lastBackup: null, isRunning: false, settings: {} });
    try {
        const backupService = require('../services/backupService')
        const status = backupService.getBackupStatus()
        const settings = await backupService.getBackupSettings()
        res.json({ ...status, settings })
    } catch (error) {
        next(error)
    }
}

// 手动执行备份（不推送邮件）
exports.runBackup = async (req, res, next) => {
    if (req.tenantId) return res.status(403).json({ success: false, error: '商户暂不支持整库备份功能，请联系平台管理员导出数据' });
    try {
        const backupService = require('../services/backupService')
        const result = await backupService.performBackup()
        if (result) {
            res.json({ success: true, message: '备份完成', ...result })
        } else {
            res.status(500).json({ success: false, error: '备份失败，请查看服务器日志' })
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message || '备份失败' })
    }
}

// 重启备份定时任务（设置更新后调用）
exports.restartBackupSchedule = async (req, res, next) => {
    try {
        const backupService = require('../services/backupService')
        await backupService.startBackupSchedule()
        const settings = await backupService.getBackupSettings()
        res.json({ success: true, message: '备份计划已更新', settings })
    } catch (error) {
        next(error)
    }
}

// 推送备份文件到邮箱
exports.emailBackup = async (req, res, next) => {
    try {
        const { filename } = req.body
        if (!filename) {
            return res.status(400).json({ success: false, error: '缺少文件名' })
        }
        const backupService = require('../services/backupService')
        await backupService.sendBackupByFilename(filename)
        res.json({ success: true, message: '备份已推送至邮箱' })
    } catch (error) {
        res.status(500).json({ success: false, error: error.message || '推送失败' })
    }
}

// 下载备份文件
exports.downloadBackup = async (req, res, next) => {
    try {
        const { filename } = req.params
        if (!filename || !filename.endsWith('.sql')) {
            return res.status(400).json({ error: '无效的文件名' })
        }
        const path = require('path')
        const fs = require('fs')
        const BACKUP_DIR = '/app/backups'
        const filepath = path.join(BACKUP_DIR, path.basename(filename))
        if (!fs.existsSync(filepath)) {
            return res.status(404).json({ error: '备份文件不存在' })
        }
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
        res.setHeader('Content-Type', 'application/sql')
        const fileStream = fs.createReadStream(filepath)
        fileStream.pipe(res)
    } catch (error) {
        next(error)
    }
}

// ==================== 库存警报 ====================

// 获取开启库存警报的商品ID列表
exports.getStockAlertProducts = async (req, res, next) => {
    try {
        const setting = await prisma.setting.findUnique({
            where: { key: 'stockAlertProductIds' }
        })
        const productIds = setting?.value ? JSON.parse(setting.value) : []
        res.json({ productIds })
    } catch (error) {
        next(error)
    }
}

// 设置开启库存警报的商品ID列表
exports.setStockAlertProducts = async (req, res, next) => {
    try {
        const { productIds } = req.body
        if (!Array.isArray(productIds)) {
            return res.status(400).json({ error: '参数格式错误' })
        }
        await prisma.setting.upsert({
            where: { key: 'stockAlertProductIds' },
            update: { value: JSON.stringify(productIds) },
            create: { key: 'stockAlertProductIds', value: JSON.stringify(productIds), description: '库存警报商品ID列表' }
        })
        res.json({ message: '库存警报设置已更新', productIds })
    } catch (error) {
        next(error)
    }
}

// 按可用卡密重建商品/规格库存（用于修复历史库存漂移）
exports.rebuildStockFromCards = async (req, res, next) => {
    try {
        const { productIds } = req.body || {}
        const targetIds = Array.isArray(productIds) && productIds.length > 0 ? productIds : null

        const products = await prisma.product.findMany({
            where: targetIds ? { id: { in: targetIds } } : {},
            select: { id: true, name: true, stock: true }
        })

        if (products.length === 0) {
            return res.json({
                message: '没有可同步的商品',
                updatedProducts: 0,
                updatedVariants: 0
            })
        }

        const productIdList = products.map(p => p.id)

        const [productCardGroups, variants] = await Promise.all([
            prisma.card.groupBy({
                by: ['productId'],
                where: {
                ...(req.tenantId ? { tenantId: req.tenantId } : {}),
                status: 'AVAILABLE',
                    productId: { in: productIdList }
                },
                _count: { _all: true }
            }),
            prisma.productVariant.findMany({
                where: { productId: { in: productIdList } },
                select: { id: true, productId: true, name: true, stock: true }
            })
        ])

        const productCountMap = new Map(productCardGroups.map(g => [g.productId, g._count._all]))
        const variantIdList = variants.map(v => v.id)

        const variantCardGroups = variantIdList.length > 0
            ? await prisma.card.groupBy({
                by: ['variantId'],
                where: {
                ...(req.tenantId ? { tenantId: req.tenantId } : {}),
                status: 'AVAILABLE',
                    variantId: { in: variantIdList }
                },
                _count: { _all: true }
            })
            : []

        const variantCountMap = new Map(
            variantCardGroups
                .filter(g => !!g.variantId)
                .map(g => [g.variantId, g._count._all])
        )

        const productChanges = []
        const variantChanges = []

        await prisma.$transaction(async (tx) => {
            for (const p of products) {
                const nextStock = productCountMap.get(p.id) || 0
                if (p.stock !== nextStock) {
                    await tx.product.update({
                        where: { id: p.id },
                        data: { stock: nextStock }
                    })
                    productChanges.push({
                        id: p.id,
                        name: p.name,
                        before: p.stock,
                        after: nextStock
                    })
                }
            }

            for (const v of variants) {
                const nextStock = variantCountMap.get(v.id) || 0
                if (v.stock !== nextStock) {
                    await tx.productVariant.update({
                        where: { id: v.id },
                        data: { stock: nextStock }
                    })
                    variantChanges.push({
                        id: v.id,
                        name: v.name,
                        before: v.stock,
                        after: nextStock
                    })
                }
            }
        })

        res.json({
            message: '库存重建完成',
            updatedProducts: productChanges.length,
            updatedVariants: variantChanges.length,
            products: productChanges,
            variants: variantChanges
        })
    } catch (error) {
        next(error)
    }
}

// ==================== 管理员管理 ====================

// 创建子管理员
exports.createAdmin = async (req, res, next) => {
    try {
        const { email, password, username, permissions } = req.body
        const { DEFAULT_ADMIN_PERMISSIONS, ALL_PERMISSION_KEYS } = require('../constants/permissions')

        if (!email || !password) {
            return res.status(400).json({ error: '邮箱和密码为必填项' })
        }

        if (password.length < 6) {
            return res.status(400).json({ error: '密码至少6位' })
        }

        // 套餐校验：检查 maxSubAdmins
        if (req.tenantId) {
            const limit = await getSubAdminLimit(req.tenantId)
            if (limit === 0) {
                return res.status(403).json({ error: '当前套餐不支持添加子管理员，请升级套餐' })
            }
            if (limit > 0) {
                const currentCount = await prisma.user.count({
                    where: { role: 'ADMIN', tenantId: req.tenantId }
                })
                if (currentCount >= limit) {
                    return res.status(403).json({ error: `已达到当前套餐子管理员上限（${limit} 人），请升级套餐` })
                }
            }
        }

        // 净化 permissions：只保留预定义的 key
        const cleanPermissions = {}
        const inputPerms = permissions || DEFAULT_ADMIN_PERMISSIONS
        for (const k of ALL_PERMISSION_KEYS) {
            cleanPermissions[k] = !!inputPerms[k]
        }

        // 检查邮箱是否已存在
        const existing = await prisma.user.findUnique({ where: { email } })
        if (existing) {
            // 已经是当前商城的子管理员
            if (existing.role === 'ADMIN' && existing.tenantId === req.tenantId) {
                return res.status(409).json({ error: '该邮箱已是本商城的子管理员' })
            }
            // 是其他商城的所有者或子管理员
            if (['TENANT_ADMIN', 'SUPER_ADMIN'].includes(existing.role) ||
                (existing.role === 'ADMIN' && existing.tenantId && existing.tenantId !== req.tenantId)) {
                return res.status(409).json({ error: '该邮箱已被其他商城使用，请换一个邮箱' })
            }
            // 跨租户劫持防御：如果是其他商城的普通用户或代理，禁止跨租户强行接管
            if (existing.tenantId && existing.tenantId !== req.tenantId) {
                return res.status(409).json({ error: '该邮箱已被其他商城使用，请换一个邮箱' })
            }
            // 普通用户（USER / AGENT）— 升级为本商城的子管理员
            if (req.tenantId) {
                const updated = await prisma.user.update({
                    where: { id: existing.id },
                    data: {
                        role: 'ADMIN',
                        tenantId: req.tenantId,
                        permissions: JSON.stringify(cleanPermissions)
                    }
                })
                return res.status(200).json({
                    message: '该邮箱已存在，已邀请为子管理员',
                    admin: {
                        id: updated.id,
                        email: updated.email,
                        username: updated.username,
                        role: updated.role,
                        tenantId: updated.tenantId,
                        permissions: cleanPermissions,
                        createdAt: updated.createdAt
                    }
                })
            }
            return res.status(409).json({ error: '该邮箱已被注册' })
        }

        // 创建子管理员（绑定到当前租户）
        const hashedPassword = await bcrypt.hash(password, 10)
        const admin = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                username: username || email.split('@')[0],
                role: 'ADMIN',
                emailVerified: true,
                tenantId: req.tenantId || null,
                permissions: JSON.stringify(cleanPermissions)
            }
        })

        res.status(201).json({
            message: '子管理员创建成功',
            admin: {
                id: admin.id,
                email: admin.email,
                username: admin.username,
                role: admin.role,
                tenantId: admin.tenantId,
                permissions: cleanPermissions,
                createdAt: admin.createdAt
            }
        })
    } catch (error) {
        next(error)
    }
}

// 获取当前租户下的子管理员列表
exports.getSubAdmins = async (req, res, next) => {
    try {
        const where = { role: 'ADMIN' }
        if (req.tenantId) where.tenantId = req.tenantId

        const admins = await prisma.user.findMany({
            where,
            select: { id: true, email: true, username: true, role: true, permissions: true, createdAt: true },
            orderBy: { createdAt: 'desc' }
        })

        // 解析 permissions 字段
        const result = admins.map(a => {
            let perms = {}
            try { perms = a.permissions ? JSON.parse(a.permissions) : {} } catch {}
            return { ...a, permissions: perms }
        })

        res.json({ admins: result })
    } catch (error) {
        next(error)
    }
}

// 更新子管理员权限
exports.updateAdminPermissions = async (req, res, next) => {
    try {
        const { id } = req.params
        const { permissions, username } = req.body
        const { ALL_PERMISSION_KEYS } = require('../constants/permissions')

        // 查找目标
        const target = await prisma.user.findFirst({
            where: { id, role: 'ADMIN', ...(req.tenantId ? { tenantId: req.tenantId } : {}) }
        })
        if (!target) return res.status(404).json({ error: '子管理员不存在' })

        const data = {}
        if (typeof username === 'string') data.username = username
        if (permissions && typeof permissions === 'object') {
            const cleanPermissions = {}
            for (const k of ALL_PERMISSION_KEYS) {
                cleanPermissions[k] = !!permissions[k]
            }
            data.permissions = JSON.stringify(cleanPermissions)
        }

        await prisma.user.update({ where: { id }, data })
        res.json({ message: '已更新' })
    } catch (error) {
        next(error)
    }
}

// 获取权限配置元数据（供前端渲染）
exports.getPermissionGroups = async (req, res) => {
    const { PERMISSION_GROUPS, DEFAULT_ADMIN_PERMISSIONS } = require('../constants/permissions')
    res.json({ groups: PERMISSION_GROUPS, defaults: DEFAULT_ADMIN_PERMISSIONS })
}

// 删除子管理员
exports.deleteAdmin = async (req, res, next) => {
    try {
        const { id } = req.params

        const targetUser = await prisma.user.findFirst({ where: { ...(req.tenantId ? { tenantId: req.tenantId } : {}), id } })
        if (!targetUser) {
            return res.status(404).json({ error: '用户不存在' })
        }

        // 不能删除超级管理员
        if (targetUser.role === 'SUPER_ADMIN') {
            return res.status(403).json({ error: '不能删除超级管理员' })
        }

        // 不能删除自己
        if (targetUser.id === req.user.id) {
            return res.status(403).json({ error: '不能删除自己的账号' })
        }

        // 只允许删除管理员角色
        if (targetUser.role !== 'ADMIN') {
            return res.status(400).json({ error: '该用户不是管理员' })
        }

        // 将角色降为普通用户而非物理删除，保留其在该商城的 tenantId 以便历史数据和买家上下文完整
        await prisma.user.update({
            where: { id },
            data: { role: 'USER' }
        })

        res.json({ message: '子管理员已移除（降级为普通用户）' })
    } catch (error) {
        next(error)
    }
}

// 修改用户角色
exports.updateUserRole = async (req, res, next) => {
    try {
        const { id } = req.params
        const { role } = req.body

        if (!['USER', 'ADMIN', 'CUSTOMER'].includes(role)) {
            return res.status(400).json({ error: '无效的角色' })
        }

        if (req.tenantId) {
            // 商城店主 (TENANT_ADMIN) 视角：
            // 1. 尝试在 Customer 表中查找
            const customer = await prisma.customer.findFirst({
                where: { id, tenantId: req.tenantId }
            })

            // 2. 尝试在 User 表中查找（子管理员）
            const adminUser = await prisma.user.findFirst({
                where: { id, tenantId: req.tenantId, role: 'ADMIN' }
            })

            if (!customer && !adminUser) {
                return res.status(404).json({ error: '用户不存在' })
            }

            if (role === 'ADMIN') {
                // 升级为子管理员
                if (adminUser) {
                    return res.json({ message: '角色已是管理员' })
                }
                // 从 Customer 升级
                const { DEFAULT_ADMIN_PERMISSIONS } = require('../constants/permissions')
                
                // 检查 User 表中是否已有该 email
                let existingUser = await prisma.user.findUnique({ where: { email: customer.email } })
                if (existingUser) {
                    await prisma.user.update({
                        where: { id: existingUser.id },
                        data: {
                            role: 'ADMIN',
                            tenantId: req.tenantId,
                            permissions: JSON.stringify(DEFAULT_ADMIN_PERMISSIONS)
                        }
                    })
                } else {
                    await prisma.user.create({
                        data: {
                            email: customer.email,
                            password: customer.password,
                            username: customer.username || customer.email.split('@')[0],
                            role: 'ADMIN',
                            emailVerified: true,
                            tenantId: req.tenantId,
                            permissions: JSON.stringify(DEFAULT_ADMIN_PERMISSIONS)
                        }
                    })
                }
                return res.json({ message: '成功升级为子管理员，请到店铺设置-管理员设置中配置具体权限' })
            } else {
                // 降级为普通用户 (CUSTOMER)
                if (adminUser) {
                    await prisma.user.update({
                        where: { id: adminUser.id },
                        data: {
                            role: 'USER',
                            tenantId: null,
                            permissions: null
                        }
                    })
                    return res.json({ message: '已成功取消管理员权限，降级为普通用户' })
                }
                return res.json({ message: '角色已是普通用户' })
            }

        } else {
            // 超级管理员 (SUPER_ADMIN) 视角：全局修改 User 表中的角色
            if (!['USER', 'ADMIN', 'SUPER_ADMIN'].includes(role)) {
                return res.status(400).json({ error: '无效的角色' })
            }
            const targetUser = await prisma.user.findUnique({ where: { id } })
            if (!targetUser) {
                return res.status(404).json({ error: '用户不存在' })
            }
            if (targetUser.role === 'SUPER_ADMIN') {
                return res.status(403).json({ error: '不能修改超级管理员的角色' })
            }
            if (targetUser.id === req.user.id) {
                return res.status(403).json({ error: '不能修改自己的角色' })
            }

            await prisma.user.update({
                where: { id },
                data: { role }
            })
            return res.json({ message: '角色更新成功' })
        }
    } catch (error) {
        next(error)
    }
}

// 修改用户状态 (封禁/激活)
exports.updateUserStatus = async (req, res, next) => {
    try {
        const { id } = req.params
        const { status } = req.body // 'ACTIVE' | 'BANNED'

        if (!['ACTIVE', 'BANNED'].includes(status)) {
            return res.status(400).json({ error: '无效的状态' })
        }

        if (req.tenantId) {
            // 商户视角
            const customer = await prisma.customer.findFirst({
                where: { id, tenantId: req.tenantId }
            })
            const adminUser = await prisma.user.findFirst({
                where: { id, tenantId: req.tenantId, role: 'ADMIN' }
            })

            if (!customer && !adminUser) {
                return res.status(404).json({ error: '用户不存在' })
            }

            if (customer) {
                await prisma.customer.update({
                    where: { id: customer.id },
                    data: { status }
                })
            }
            if (adminUser) {
                await prisma.user.update({
                    where: { id: adminUser.id },
                    data: { status }
                })
            }
            return res.json({ message: status === 'BANNED' ? '用户已封禁' : '用户已解封' })
        } else {
            // 超管视角：全局封禁 User
            const targetUser = await prisma.user.findUnique({ where: { id } })
            if (!targetUser) {
                return res.status(404).json({ error: '用户不存在' })
            }
            if (targetUser.role === 'SUPER_ADMIN') {
                return res.status(403).json({ error: '不能封禁超级管理员' })
            }
            if (targetUser.id === req.user.id) {
                return res.status(403).json({ error: '不能封禁自己' })
            }

            await prisma.user.update({
                where: { id },
                data: { status }
            })
            return res.json({ message: status === 'BANNED' ? '用户已封禁' : '用户已解封' })
        }
    } catch (error) {
        next(error)
    }
}

// 删除用户
exports.deleteUser = async (req, res, next) => {
    try {
        const { id } = req.params

        if (req.tenantId) {
            // 商户视角
            const customer = await prisma.customer.findFirst({
                where: { id, tenantId: req.tenantId }
            })
            const adminUser = await prisma.user.findFirst({
                where: { id, tenantId: req.tenantId, role: 'ADMIN' }
            })

            if (!customer && !adminUser) {
                return res.status(404).json({ error: '用户不存在' })
            }

            if (customer) {
                // 安全删除：解绑订单和工单，防止外键报错并保留历史数据
                await prisma.order.updateMany({
                    where: { customerId: customer.id },
                    data: { customerId: null }
                })
                await prisma.ticket.updateMany({
                    where: { customerId: customer.id },
                    data: { customerId: null }
                })
                await prisma.customer.delete({
                    where: { id: customer.id }
                })
            }
            if (adminUser) {
                await prisma.user.updateMany({
                    where: { referralAgentId: adminUser.id },
                    data: { referralAgentId: null }
                })
                await prisma.user.delete({
                    where: { id: adminUser.id }
                })
            }
            return res.json({ message: '用户删除成功' })
        } else {
            // 超管视角：全局删除 User
            const targetUser = await prisma.user.findUnique({ where: { id } })
            if (!targetUser) {
                return res.status(404).json({ error: '用户不存在' })
            }
            if (targetUser.role === 'SUPER_ADMIN') {
                return res.status(403).json({ error: '不能删除超级管理员' })
            }
            if (targetUser.id === req.user.id) {
                return res.status(403).json({ error: '不能删除自己' })
            }

            // 清理解绑
            await prisma.user.updateMany({
                where: { referralAgentId: targetUser.id },
                data: { referralAgentId: null }
            })
            await prisma.user.delete({
                where: { id: targetUser.id }
            })
            return res.json({ message: '用户删除成功' })
        }
    } catch (error) {
        next(error)
    }
}

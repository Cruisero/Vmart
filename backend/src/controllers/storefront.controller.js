// 代理分站前台控制器（公开 API）
const prisma = require('../config/database')

// 获取分站信息
exports.getStorefront = async (req, res, next) => {
    try {
        const { slug } = req.params

        const agent = await prisma.agent.findUnique({
            where: { shopSlug: slug },
            select: {
                id: true, shopName: true, shopSlug: true,
                shopLogo: true, shopSkin: true, shopNotice: true, status: true
            }
        })

        if (!agent || agent.status !== 'ACTIVE') {
            return res.status(404).json({ error: '分站不存在或已关闭' })
        }

        res.json({
            storefront: {
                shopName: agent.shopName,
                shopSlug: agent.shopSlug,
                shopLogo: agent.shopLogo,
                shopSkin: agent.shopSkin,
                shopNotice: agent.shopNotice
            }
        })
    } catch (error) {
        next(error)
    }
}

// 获取分站商品列表
exports.getStorefrontProducts = async (req, res, next) => {
    try {
        const { slug } = req.params
        const { categoryId } = req.query

        const agent = await prisma.agent.findUnique({
            where: { shopSlug: slug },
            select: { id: true, status: true }
        })

        if (!agent || agent.status !== 'ACTIVE') {
            return res.status(404).json({ error: '分站不存在' })
        }

        // 查询代理已上架的商品
        const where = { agentId: agent.id, enabled: true }
        const agentProducts = await prisma.agentProduct.findMany({
            where,
            include: {
                product: {
                    include: {
                        category: { select: { id: true, name: true, icon: true } },
                        cards: { where: { status: 'AVAILABLE' }, select: { id: true } },
                        variants: {
                            where: { status: 'ACTIVE' },
                            orderBy: { sortOrder: 'asc' },
                            include: {
                                cards: { where: { status: 'AVAILABLE' }, select: { id: true } }
                            }
                        }
                    }
                }
            }
        })

        // 过滤分类
        let products = agentProducts
            .filter(ap => ap.product.status === 'ACTIVE')
            .filter(ap => !categoryId || ap.product.categoryId === categoryId)

        // 获取库存模式
        const stockModeSetting = await prisma.setting.findUnique({ where: { key: 'stockMode' } })
        const stockMode = stockModeSetting?.value || 'auto'

        const result = products.map(ap => {
            const p = ap.product
            const basePrice = parseFloat(p.price)
            const agentPrice = basePrice + parseFloat(ap.markup)

            // 计算库存
            let stock
            if (stockMode === 'manual') {
                stock = p.stock
            } else {
                stock = p.cards.length
                if (p.variants.length > 0) {
                    stock = p.variants.reduce((sum, v) => sum + v.cards.length, 0)
                }
            }

            return {
                id: p.id,
                name: p.name,
                description: p.description,
                image: p.image,
                images: p.images,
                price: agentPrice,
                originalPrice: agentPrice < parseFloat(p.price) ? parseFloat(p.price) : null,
                stock,
                soldCount: p.soldCount,
                category: p.category,
                tags: p.tags,
                variants: p.variants.map(v => ({
                    id: v.id,
                    name: v.name,
                    price: (v.price ? parseFloat(v.price) : basePrice) + parseFloat(ap.markup),
                    stock: stockMode === 'manual' ? v.stock : v.cards.length
                }))
            }
        })

        // 收集分类
        const categoriesMap = new Map()
        result.forEach(p => {
            if (p.category && !categoriesMap.has(p.category.id)) {
                categoriesMap.set(p.category.id, p.category)
            }
        })

        res.json({
            products: result,
            categories: Array.from(categoriesMap.values())
        })
    } catch (error) {
        next(error)
    }
}

// 获取分站商品详情
exports.getStorefrontProduct = async (req, res, next) => {
    try {
        const { slug, productId } = req.params

        const agent = await prisma.agent.findUnique({
            where: { shopSlug: slug },
            select: { id: true, status: true }
        })

        if (!agent || agent.status !== 'ACTIVE') {
            return res.status(404).json({ error: '分站不存在' })
        }

        const agentProduct = await prisma.agentProduct.findUnique({
            where: { agentId_productId: { agentId: agent.id, productId } },
            include: {
                product: {
                    include: {
                        category: { select: { id: true, name: true } },
                        cards: { where: { status: 'AVAILABLE' }, select: { id: true } },
                        variants: {
                            where: { status: 'ACTIVE' },
                            orderBy: { sortOrder: 'asc' },
                            include: {
                                cards: { where: { status: 'AVAILABLE' }, select: { id: true } }
                            }
                        }
                    }
                }
            }
        })

        if (!agentProduct || !agentProduct.enabled || agentProduct.product.status !== 'ACTIVE') {
            return res.status(404).json({ error: '商品不存在' })
        }

        const p = agentProduct.product
        const basePrice = parseFloat(p.price)
        const agentPrice = basePrice + parseFloat(agentProduct.markup)

        const stockModeSetting = await prisma.setting.findUnique({ where: { key: 'stockMode' } })
        const stockMode = stockModeSetting?.value || 'auto'

        let stock = stockMode === 'manual' ? p.stock : p.cards.length
        if (p.variants.length > 0 && stockMode !== 'manual') {
            stock = p.variants.reduce((sum, v) => sum + v.cards.length, 0)
        }

        res.json({
            product: {
                id: p.id,
                name: p.name,
                description: p.description,
                fullDescription: p.fullDescription,
                image: p.image,
                images: p.images,
                price: agentPrice,
                originalPrice: agentPrice < parseFloat(p.price) ? parseFloat(p.price) : null,
                stock,
                soldCount: p.soldCount,
                category: p.category,
                tags: p.tags,
                deliveryNote: p.deliveryNote,
                wholesalePrices: p.wholesalePrices,
                variants: p.variants.map(v => ({
                    id: v.id,
                    name: v.name,
                    price: (v.price ? parseFloat(v.price) : basePrice) + parseFloat(agentProduct.markup),
                    stock: stockMode === 'manual' ? v.stock : v.cards.length
                })),
                // 用于下单时传递
                _agentSlug: slug
            }
        })
    } catch (error) {
        next(error)
    }
}
// ==================== 租户自定义域名前台 ====================

// 租户首页数据（通过自定义域名访问时，tenantId 由 tenantDetect 中间件注入）
exports.getTenantStorefront = async (req, res, next) => {
    try {
        if (!req.tenantId) return res.status(404).json({ error: '商城不存在' })

        res.json({
            storefront: {
                shopName: req.tenant.shopName,
                shopLogo: req.tenant.shopLogo,
                shopSkin: req.tenant.shopSkin,
                shopNotice: req.tenant.shopNotice,
                tenantId: req.tenantId,
                _tenantMode: true
            }
        })
    } catch (error) { next(error) }
}

// 租户商品列表（自定义域名访问）
exports.getTenantProducts = async (req, res, next) => {
    try {
        if (!req.tenantId) return res.status(404).json({ error: '商城不存在' })

        const { categoryId, search, page = 1, limit = 20 } = req.query
        const where = { tenantId: req.tenantId, status: 'ACTIVE' }
        if (categoryId) where.categoryId = categoryId
        if (search) where.name = { contains: search }

        const [products, stockModeSetting] = await Promise.all([
            prisma.product.findMany({
                where,
                include: {
                    category: { select: { id: true, name: true, icon: true } },
                    cards: { where: { status: 'AVAILABLE', tenantId: req.tenantId }, select: { id: true } },
                    variants: {
                        where: { status: 'ACTIVE' }, orderBy: { sortOrder: 'asc' },
                        include: { cards: { where: { status: 'AVAILABLE' }, select: { id: true } } }
                    }
                },
                orderBy: [{ weight: 'desc' }, { createdAt: 'desc' }],
                skip: (page - 1) * Number(limit),
                take: Number(limit)
            }),
            prisma.setting.findUnique({ where: { key: 'stockMode' } })
        ])

        const stockMode = stockModeSetting?.value || 'auto'

        const categoriesMap = new Map()
        const result = products.map(p => {
            if (p.category) categoriesMap.set(p.category.id, p.category)

            let stock = stockMode === 'manual' ? p.stock : p.cards.length
            if (p.variants.length > 0 && stockMode !== 'manual') {
                stock = p.variants.reduce((sum, v) => sum + v.cards.length, 0)
            }

            return {
                id: p.id, name: p.name, description: p.description,
                image: p.image, images: p.images, price: parseFloat(p.price),
                originalPrice: p.originalPrice ? parseFloat(p.originalPrice) : null,
                stock,
                soldCount: p.soldCount, category: p.category, tags: p.tags,
                variants: p.variants.map(v => ({
                    id: v.id, name: v.name, price: parseFloat(v.price),
                    stock: stockMode === 'manual' ? v.stock : v.cards.length
                }))
            }
        })

        res.json({ products: result, categories: Array.from(categoriesMap.values()) })
    } catch (error) { next(error) }
}

// 租户商品详情（自定义域名访问）
exports.getTenantProduct = async (req, res, next) => {
    try {
        if (!req.tenantId) return res.status(404).json({ error: '商城不存在' })

        const { productId } = req.params
        const [product, stockModeSetting] = await Promise.all([
            prisma.product.findFirst({
                where: { id: productId, tenantId: req.tenantId, status: 'ACTIVE' },
                include: {
                    category: { select: { id: true, name: true } },
                    cards: { where: { status: 'AVAILABLE', tenantId: req.tenantId }, select: { id: true } },
                    variants: {
                        where: { status: 'ACTIVE' }, orderBy: { sortOrder: 'asc' },
                        include: { cards: { where: { status: 'AVAILABLE' }, select: { id: true } } }
                    }
                }
            }),
            prisma.setting.findUnique({ where: { key: 'stockMode' } })
        ])

        if (!product) return res.status(404).json({ error: '商品不存在' })

        const stockMode = stockModeSetting?.value || 'auto'
        let stock = stockMode === 'manual' ? product.stock : product.cards.length
        if (product.variants.length > 0 && stockMode !== 'manual') {
            stock = product.variants.reduce((sum, v) => sum + v.cards.length, 0)
        }

        res.json({
            product: {
                id: product.id, name: product.name, description: product.description,
                fullDescription: product.fullDescription, image: product.image, images: product.images,
                price: parseFloat(product.price),
                originalPrice: product.originalPrice ? parseFloat(product.originalPrice) : null,
                stock,
                soldCount: product.soldCount, category: product.category, tags: product.tags,
                deliveryNote: product.deliveryNote, wholesalePrices: product.wholesalePrices,
                variants: product.variants.map(v => ({
                    id: v.id, name: v.name, price: parseFloat(v.price), stock: stockMode === 'manual' ? v.stock : v.cards.length
                })),
                _tenantId: req.tenantId
            }
        })
    } catch (error) { next(error) }
}

// ==================== SaaS 商户店面（/v/:slug 路由）====================
// 通过 Tenant.shopSlug 直接查找，无需自定义域名中间件

// 通用：通过 slug 找到 tenant（辅助函数）
async function findTenantBySlug(slug) {
    return prisma.tenant.findUnique({
        where: { shopSlug: slug },
        select: {
            id: true, shopName: true, shopSlug: true,
            shopLogo: true, shopSkin: true, shopNotice: true, status: true
        }
    })
}

// GET /api/v/:slug — 商户店面基础信息
exports.getMerchantStorefront = async (req, res, next) => {
    try {
        const { slug } = req.params
        const tenant = await findTenantBySlug(slug)
        if (!tenant || tenant.status !== 'ACTIVE') {
            return res.status(404).json({ error: '商城不存在或已关闭' })
        }

        // shop 表保存了 logo 和 settings(含 favicon)
        const shop = await prisma.shop.findUnique({
            where: { slug: tenant.shopSlug },
            select: { logo: true, settings: true, name: true, notice: true, skin: true }
        })

        let shopFavicon = null
        if (shop?.settings) {
            try { shopFavicon = JSON.parse(shop.settings)?.favicon || null } catch {}
        }

        // 读取 tenant_settings.system_settings.featureCard
        let featureCard = null
        let agreements = null
        let language = 'zh'
        let currency = 'CNY'
        try {
            const ts = await prisma.tenantSetting.findUnique({
                where: { tenantId: tenant.id },
                select: { systemSettings: true }
            })
            if (ts?.systemSettings) {
                const sys = JSON.parse(ts.systemSettings)
                if (sys.featureCard && sys.featureCard.enabled) {
                    featureCard = {
                        title: sys.featureCard.title || '',
                        description: sys.featureCard.description || '',
                        image: sys.featureCard.image || '',
                        buttonText: sys.featureCard.buttonText || '',
                        buttonLink: sys.featureCard.buttonLink || '',
                        collapsed: !!sys.featureCard.collapsed
                    }
                }
                // 店铺协议声明
                if (sys.agreements && sys.agreements.enabled && (sys.agreements.purchasePolicy || sys.agreements.refundPolicy)) {
                    agreements = {
                        purchasePolicy: sys.agreements.purchasePolicy || '',
                        refundPolicy: sys.agreements.refundPolicy || ''
                    }
                }
                // 店铺语言
                if (sys.language) language = sys.language
                // 经营货币
                if (sys.currency) currency = sys.currency
            }
        } catch {}

        res.json({
            storefront: {
                shopName: tenant.shopName || shop?.name || null,
                shopSlug: tenant.shopSlug,
                shopLogo: tenant.shopLogo || shop?.logo || null,
                shopSkin: tenant.shopSkin || shop?.skin || 'fresh',
                shopNotice: tenant.shopNotice || shop?.notice || null,
                shopFavicon,
                featureCard,
                agreements,
                language,
                currency,
                tenantId: tenant.id,
                _tenantMode: true
            }
        })
    } catch (error) { next(error) }
}

// GET /api/v/:slug/products — 商户商品列表
exports.getMerchantProducts = async (req, res, next) => {
    try {
        const { slug } = req.params
        const tenant = await findTenantBySlug(slug)
        if (!tenant || tenant.status !== 'ACTIVE') {
            return res.status(404).json({ error: '商城不存在' })
        }

        const { categoryId, search, page = 1, limit = 20 } = req.query
        const where = { tenantId: tenant.id, status: 'ACTIVE' }
        if (categoryId) where.categoryId = categoryId
        if (search) where.name = { contains: search }

        const [products, stockModeSetting] = await Promise.all([
            prisma.product.findMany({
                where,
                include: {
                    category: { select: { id: true, name: true, icon: true } },
                    cards: { where: { status: 'AVAILABLE', tenantId: tenant.id }, select: { id: true } },
                    variants: {
                        where: { status: 'ACTIVE' }, orderBy: { sortOrder: 'asc' },
                        include: { cards: { where: { status: 'AVAILABLE' }, select: { id: true } } }
                    }
                },
                orderBy: [{ weight: 'desc' }, { createdAt: 'desc' }],
                skip: (page - 1) * Number(limit),
                take: Number(limit)
            }),
            prisma.setting.findUnique({ where: { key: 'stockMode' } })
        ])

        const stockMode = stockModeSetting?.value || 'auto'

        const categoriesMap = new Map()
        const result = products.map(p => {
            if (p.category) categoriesMap.set(p.category.id, p.category)

            let stock = stockMode === 'manual' ? p.stock : p.cards.length
            if (p.variants.length > 0 && stockMode !== 'manual') {
                stock = p.variants.reduce((sum, v) => sum + v.cards.length, 0)
            }

            return {
                id: p.id, name: p.name, description: p.description,
                image: p.image, images: p.images, price: parseFloat(p.price),
                originalPrice: p.originalPrice ? parseFloat(p.originalPrice) : null,
                stock,
                soldCount: p.soldCount, category: p.category, tags: p.tags,
                variants: p.variants.map(v => ({
                    id: v.id, name: v.name, price: parseFloat(v.price), stock: stockMode === 'manual' ? v.stock : v.cards.length
                }))
            }
        })

        res.json({ products: result, categories: Array.from(categoriesMap.values()) })
    } catch (error) { next(error) }
}

// GET /api/v/:slug/products/:productId — 商户商品详情
exports.getMerchantProduct = async (req, res, next) => {
    try {
        const { slug, productId } = req.params
        const tenant = await findTenantBySlug(slug)
        if (!tenant || tenant.status !== 'ACTIVE') {
            return res.status(404).json({ error: '商城不存在' })
        }

        const [product, stockModeSetting] = await Promise.all([
            prisma.product.findFirst({
                where: { id: productId, tenantId: tenant.id, status: 'ACTIVE' },
                include: {
                    category: { select: { id: true, name: true } },
                    cards: { where: { status: 'AVAILABLE', tenantId: tenant.id }, select: { id: true } },
                    variants: {
                        where: { status: 'ACTIVE' }, orderBy: { sortOrder: 'asc' },
                        include: { cards: { where: { status: 'AVAILABLE' }, select: { id: true } } }
                    }
                }
            }),
            prisma.setting.findUnique({ where: { key: 'stockMode' } })
        ])

        if (!product) return res.status(404).json({ error: '商品不存在' })

        const stockMode = stockModeSetting?.value || 'auto'
        let stock = stockMode === 'manual' ? product.stock : product.cards.length
        if (product.variants.length > 0 && stockMode !== 'manual') {
            stock = product.variants.reduce((sum, v) => sum + v.cards.length, 0)
        }

        res.json({
            product: {
                id: product.id, name: product.name, description: product.description,
                fullDescription: product.fullDescription, image: product.image, images: product.images,
                price: parseFloat(product.price),
                originalPrice: product.originalPrice ? parseFloat(product.originalPrice) : null,
                stock,
                soldCount: product.soldCount, category: product.category, tags: product.tags,
                deliveryNote: product.deliveryNote, wholesalePrices: product.wholesalePrices,
                variants: product.variants.map(v => ({
                    id: v.id, name: v.name, price: parseFloat(v.price), stock: stockMode === 'manual' ? v.stock : v.cards.length
                })),
                _tenantId: tenant.id
            }
        })
    } catch (error) { next(error) }
}

// GET /api/v/:slug/categories — 商户分类列表（带商品数）
exports.getMerchantCategories = async (req, res, next) => {
    try {
        const { slug } = req.params
        const tenant = await findTenantBySlug(slug)
        if (!tenant || tenant.status !== 'ACTIVE') {
            return res.status(404).json({ error: '商城不存在' })
        }

        // 取该 tenant 下所有商品涉及到的分类
        const categories = await prisma.category.findMany({
            where: {
                products: { some: { tenantId: tenant.id, status: 'ACTIVE' } }
            },
            include: {
                _count: {
                    select: {
                        products: { where: { tenantId: tenant.id, status: 'ACTIVE' } }
                    }
                }
            },
            orderBy: { sortOrder: 'asc' }
        })

        const result = categories.map(c => ({
            id: c.id,
            name: c.name,
            icon: c.icon,
            productCount: c._count.products
        }))

        res.json({ categories: result })
    } catch (error) { next(error) }
}


// GET /api/v/:slug/hot-searches — 商户真实热门搜索词（按搜索量降序）
exports.getMerchantHotSearches = async (req, res, next) => {
    try {
        const { slug } = req.params
        const limit = Math.min(parseInt(req.query.limit, 10) || 8, 20)
        const tenant = await findTenantBySlug(slug)
        if (!tenant || tenant.status !== 'ACTIVE') {
            return res.status(404).json({ error: '商城不存在' })
        }

        const rows = await prisma.searchLog.findMany({
            where: { tenantId: tenant.id },
            orderBy: [{ count: 'desc' }, { lastUsedAt: 'desc' }],
            take: limit,
            select: { keyword: true, count: true }
        })

        res.json({ keywords: rows.map(r => r.keyword) })
    } catch (error) { next(error) }
}

// POST /api/v/:slug/search-log — 上报搜索关键词（用户实际搜索行为）
exports.logMerchantSearch = async (req, res, next) => {
    try {
        const { slug } = req.params
        const { keyword } = req.body || {}
        if (!keyword) return res.json({ ok: true })

        const trimmed = String(keyword).trim().slice(0, 60)
        if (!trimmed) return res.json({ ok: true })

        const tenant = await findTenantBySlug(slug)
        if (!tenant || tenant.status !== 'ACTIVE') {
            return res.json({ ok: true })
        }

        // upsert：count +1，更新 lastUsedAt
        await prisma.searchLog.upsert({
            where: {
                tenantId_keyword: { tenantId: tenant.id, keyword: trimmed }
            },
            update: { count: { increment: 1 }, lastUsedAt: new Date() },
            create: { tenantId: tenant.id, keyword: trimmed }
        })

        res.json({ ok: true })
    } catch (error) {
        // 上报失败不影响主流程，静默返回
        res.json({ ok: false })
    }
}

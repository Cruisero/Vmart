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
            const basePrice = p.agentBasePrice ? parseFloat(p.agentBasePrice) : parseFloat(p.price)
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
        const basePrice = p.agentBasePrice ? parseFloat(p.agentBasePrice) : parseFloat(p.price)
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

        const products = await prisma.product.findMany({
            where,
            include: {
                category: { select: { id: true, name: true, icon: true } },
                cards: { where: { status: 'AVAILABLE', tenantId: req.tenantId }, select: { id: true } },
                variants: {
                    where: { status: 'ACTIVE' }, orderBy: { sortOrder: 'asc' },
                    include: { cards: { where: { status: 'AVAILABLE' }, select: { id: true } } }
                }
            },
            orderBy: [{ sortScore: 'desc' }, { createdAt: 'desc' }],
            skip: (page - 1) * Number(limit),
            take: Number(limit)
        })

        const categoriesMap = new Map()
        const result = products.map(p => {
            if (p.category) categoriesMap.set(p.category.id, p.category)
            return {
                id: p.id, name: p.name, description: p.description,
                image: p.image, images: p.images, price: parseFloat(p.price),
                originalPrice: p.originalPrice ? parseFloat(p.originalPrice) : null,
                stock: p.cards.length || p.variants.reduce((s, v) => s + v.cards.length, 0),
                soldCount: p.soldCount, category: p.category, tags: p.tags,
                variants: p.variants.map(v => ({
                    id: v.id, name: v.name, price: parseFloat(v.price),
                    stock: v.cards.length
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
        const product = await prisma.product.findFirst({
            where: { id: productId, tenantId: req.tenantId, status: 'ACTIVE' },
            include: {
                category: { select: { id: true, name: true } },
                cards: { where: { status: 'AVAILABLE', tenantId: req.tenantId }, select: { id: true } },
                variants: {
                    where: { status: 'ACTIVE' }, orderBy: { sortOrder: 'asc' },
                    include: { cards: { where: { status: 'AVAILABLE' }, select: { id: true } } }
                }
            }
        })

        if (!product) return res.status(404).json({ error: '商品不存在' })

        res.json({
            product: {
                id: product.id, name: product.name, description: product.description,
                fullDescription: product.fullDescription, image: product.image, images: product.images,
                price: parseFloat(product.price),
                originalPrice: product.originalPrice ? parseFloat(product.originalPrice) : null,
                stock: product.cards.length || product.variants.reduce((s, v) => s + v.cards.length, 0),
                soldCount: product.soldCount, category: product.category, tags: product.tags,
                deliveryNote: product.deliveryNote, wholesalePrices: product.wholesalePrices,
                variants: product.variants.map(v => ({
                    id: v.id, name: v.name, price: parseFloat(v.price), stock: v.cards.length
                })),
                _tenantId: req.tenantId
            }
        })
    } catch (error) { next(error) }
}

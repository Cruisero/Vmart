// 商品控制器
const prisma = require('../config/database')

// 获取商品列表
exports.getProducts = async (req, res, next) => {
    try {
        const {
            category,
            categoryId,
            search,
            status = 'ACTIVE',
            sort = 'weight',
            order = 'desc',
            page = 1,
            pageSize = 20
        } = req.query

        const where = {
            status: status.toUpperCase()
        }

        // 支持 category 和 categoryId 两种参数名
        const catId = categoryId || category
        if (catId && catId !== 'all') {
            where.categoryId = catId
        }

        // 搜索功能 - 支持商品名称、描述、分类名、标签
        let tagMatchIds = []
        if (search && search.trim()) {
            const searchTerm = search.trim()

            // 先用原生 SQL 查询标签匹配的商品 ID（MySQL JSON_CONTAINS）
            try {
                const tagResults = await prisma.$queryRaw`
                    SELECT id FROM products 
                    WHERE status = 'ACTIVE' 
                    AND JSON_CONTAINS(tags, JSON_QUOTE(${searchTerm}))
                `
                tagMatchIds = tagResults.map(r => r.id)
            } catch (e) {
                // 忽略 JSON 查询错误
            }

            // 组合搜索条件
            const orConditions = [
                { name: { contains: searchTerm } },
                { description: { contains: searchTerm } },
                // 搜索分类名称
                { category: { name: { contains: searchTerm } } }
            ]

            // 如果有标签匹配的商品，加入搜索条件
            if (tagMatchIds.length > 0) {
                orConditions.push({ id: { in: tagMatchIds } })
            }

            where.OR = orConditions
        }

        // 排序配置
        const orderBy = {}
        if (sort === 'price') {
            orderBy.price = order
        } else if (sort === 'sales') {
            orderBy.soldCount = order
        } else if (sort === 'weight') {
            orderBy.weight = 'desc'
        } else {
            orderBy.createdAt = order
        }

        const [products, total, stockModeSetting] = await Promise.all([
            prisma.product.findMany({
                where,
                include: {
                    category: {
                        select: { id: true, name: true, icon: true }
                    },
                    _count: {
                        select: { cards: { where: { status: 'AVAILABLE' } } }
                    },
                    variants: {
                        where: { status: 'ACTIVE' },
                        orderBy: { sortOrder: 'asc' }
                    }
                },
                orderBy,
                skip: (page - 1) * pageSize,
                take: parseInt(pageSize)
            }),
            prisma.product.count({ where }),
            prisma.setting.findUnique({ where: { key: 'stockMode' } })
        ])
        const stockMode = stockModeSetting?.value || 'auto'

        res.json({
            products: products.map(p => {
                const { _count, ...productData } = p
                return {
                    ...productData,
                    price: parseFloat(productData.price),
                    originalPrice: productData.originalPrice ? parseFloat(productData.originalPrice) : null,
                    stock: stockMode === 'auto' ? _count.cards : productData.stock,
                    tags: productData.tags || []
                }
            }),
            total,
            page: parseInt(page),
            pageSize: parseInt(pageSize),
            totalPages: Math.ceil(total / pageSize)
        })
    } catch (error) {
        next(error)
    }
}

// 获取热门商品
exports.getHotProducts = async (req, res, next) => {
    try {
        const { limit = 8 } = req.query

        const [products, stockModeSetting] = await Promise.all([
            prisma.product.findMany({
                where: { status: 'ACTIVE' },
                orderBy: { weight: 'desc' },
                take: parseInt(limit),
                include: {
                    category: {
                        select: { id: true, name: true }
                    },
                    _count: {
                        select: { cards: { where: { status: 'AVAILABLE' } } }
                    },
                    variants: {
                        where: { status: 'ACTIVE' },
                        orderBy: { sortOrder: 'asc' }
                    }
                }
            }),
            prisma.setting.findUnique({ where: { key: 'stockMode' } })
        ])
        const stockMode = stockModeSetting?.value || 'auto'

        res.json({
            products: products.map(p => {
                const { _count, ...productData } = p
                return {
                    ...productData,
                    price: parseFloat(productData.price),
                    originalPrice: productData.originalPrice ? parseFloat(productData.originalPrice) : null,
                    stock: stockMode === 'auto' ? _count.cards : productData.stock,
                    tags: productData.tags || []
                }
            })
        })
    } catch (error) {
        next(error)
    }
}

// 获取商品详情
exports.getProductById = async (req, res, next) => {
    try {
        const { id } = req.params

        const product = await prisma.product.findUnique({
            where: { id, ...(req.tenantId ? { tenantId: req.tenantId } : {}) },
            include: {
                category: {
                    select: { id: true, name: true, icon: true }
                },
                variants: {
                    where: { status: 'ACTIVE' },
                    orderBy: { sortOrder: 'asc' }
                }
            }
        })

        if (!product) {
            return res.status(404).json({ error: '商品不存在' })
        }

        // 异步增加浏览量（不阻塞响应）
        prisma.product.update({
            where: { id, ...(req.tenantId ? { tenantId: req.tenantId } : {}) },
            data: {
                tenantId: req.tenantId || null, viewCount: { increment: 1 } }
        }).catch(() => { })

        // 查询库存计算模式设置
        const stockModeSetting = await prisma.setting.findUnique({
            where: { key: 'stockMode' }
        })
        const stockMode = stockModeSetting?.value || 'auto'

        let baseStock, variantsWithStock

        if (stockMode === 'manual') {
            // 手动模式：使用商品表的 stock 字段
            baseStock = product.stock || 0
            variantsWithStock = (product.variants || []).map(v => ({
                ...v,
                price: parseFloat(v.price),
                originalPrice: v.originalPrice ? parseFloat(v.originalPrice) : null,
                stock: v.stock || 0
            }))
        } else {
            // 自动模式：使用可用卡密数量
            baseStock = await prisma.card.count({
                where: {
                    productId: id,
                    variantId: null,
                    status: 'AVAILABLE'
                }
            })

            variantsWithStock = await Promise.all(
                (product.variants || []).map(async (v) => {
                    const variantStock = await prisma.card.count({
                        where: {
                            productId: id,
                            variantId: v.id,
                            status: 'AVAILABLE'
                        }
                    })
                    return {
                        ...v,
                        price: parseFloat(v.price),
                        originalPrice: v.originalPrice ? parseFloat(v.originalPrice) : null,
                        stock: variantStock
                    }
                })
            )
        }

        res.json({
            ...product,
            price: parseFloat(product.price),
            originalPrice: product.originalPrice ? parseFloat(product.originalPrice) : null,
            tags: product.tags || [],
            wholesalePrices: product.wholesalePrices || [],
            stock: baseStock,
            variants: variantsWithStock.map(v => ({
                ...v,
                wholesalePrices: v.wholesalePrices || []
            }))
        })
    } catch (error) {
        next(error)
    }
}

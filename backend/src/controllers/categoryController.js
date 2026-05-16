// 分类控制器
const prisma = require('../config/database')

// 获取分类列表
exports.getCategories = async (req, res, next) => {
    try {
        const categories = await prisma.category.findMany({
            where: { status: 'ACTIVE' },
            orderBy: { sortOrder: 'asc' },
            include: {
                _count: {
                    select: { products: true }
                }
            }
        })

        res.json({
            categories: categories.map(c => ({
                id: c.id,
                name: c.name,
                description: c.description,
                icon: c.icon,
                productCount: c._count.products
            }))
        })
    } catch (error) {
        next(error)
    }
}

// 获取分类下的商品
exports.getCategoryProducts = async (req, res, next) => {
    try {
        const { id } = req.params
        const { page = 1, pageSize = 20 } = req.query

        const [products, total] = await Promise.all([
            prisma.product.findMany({
                where: {
                    categoryId: id,
                    status: 'ACTIVE'
                },
                orderBy: { sortOrder: 'asc' },
                skip: (page - 1) * pageSize,
                take: parseInt(pageSize)
            }),
            prisma.product.count({
                where: { categoryId: id, status: 'ACTIVE' }
            })
        ])

        res.json({
            products: products.map(p => ({
                ...p,
                price: parseFloat(p.price),
                originalPrice: p.originalPrice ? parseFloat(p.originalPrice) : null
            })),
            total,
            page: parseInt(page),
            pageSize: parseInt(pageSize)
        })
    } catch (error) {
        next(error)
    }
}

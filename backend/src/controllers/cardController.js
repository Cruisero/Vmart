// 卡密控制器
const prisma = require('../config/database')

// 获取卡密列表 (管理员)
exports.getCards = async (req, res, next) => {
    try {
        const { productId, status, page = 1, pageSize = 50 } = req.query

        const where = {}
        if (productId) where.productId = productId
        if (status) where.status = status.toUpperCase()

        const [cards, total] = await Promise.all([
            prisma.card.findMany({
                where,
                include: {
                    product: { select: { id: true, name: true } },
                    order: { select: { orderNo: true } }
                },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * pageSize,
                take: parseInt(pageSize)
            }),
            prisma.card.count({ where })
        ])

        res.json({
            cards,
            total,
            page: parseInt(page),
            pageSize: parseInt(pageSize)
        })
    } catch (error) {
        next(error)
    }
}

// 批量导入卡密 (管理员)
exports.importCards = async (req, res, next) => {
    try {
        const { productId, cards } = req.body

        if (!productId || !cards || !Array.isArray(cards) || cards.length === 0) {
            return res.status(400).json({ error: '请提供商品ID和卡密列表' })
        }

        // 检查商品是否存在
        const product = await prisma.product.findUnique({
            where: { id: productId }
        })

        if (!product) {
            return res.status(404).json({ error: '商品不存在' })
        }

        // 批量创建卡密
        const createdCards = await prisma.card.createMany({
            data: cards.map(content => ({
                productId,
                content: content.trim(),
                status: 'AVAILABLE'
            }))
        })

        // 更新商品库存
        await prisma.product.update({
            where: { id: productId },
            data: { stock: { increment: createdCards.count } }
        })

        res.status(201).json({
            message: '卡密导入成功',
            count: createdCards.count
        })
    } catch (error) {
        next(error)
    }
}

// 删除卡密 (管理员)
exports.deleteCard = async (req, res, next) => {
    try {
        const { id } = req.params

        const card = await prisma.card.findUnique({
            where: { id }
        })

        if (!card) {
            return res.status(404).json({ error: '卡密不存在' })
        }

        if (card.status === 'SOLD') {
            return res.status(400).json({ error: '已售出的卡密无法删除' })
        }

        await prisma.card.delete({ where: { id } })

        // 更新商品库存
        await prisma.product.update({
            where: { id: card.productId },
            data: { stock: { decrement: 1 } }
        })

        res.json({ message: '卡密删除成功' })
    } catch (error) {
        next(error)
    }
}

// 发放卡密 (内部使用)
exports.dispenseCards = async (orderId, productId, quantity, variantId = null) => {
    // 构建查询条件
    const whereCondition = {
        productId,
        status: 'AVAILABLE'
    }

    // 如果有规格ID，优先按规格发放
    if (variantId) {
        whereCondition.variantId = variantId
    }

    // 获取可用卡密
    const availableCards = await prisma.card.findMany({
        where: whereCondition,
        take: quantity
    })

    if (availableCards.length < quantity) {
        throw new Error('库存不足')
    }

    // 更新卡密状态
    const cardIds = availableCards.map(c => c.id)
    await prisma.card.updateMany({
        where: { id: { in: cardIds } },
        data: {
            status: 'SOLD',
            orderId,
            soldAt: new Date()
        }
    })

    // 更新库存（规格或商品）
    if (variantId) {
        await prisma.productVariant.update({
            where: { id: variantId },
            data: {
                stock: { decrement: quantity }
            }
        })
    }

    // 更新商品销量和库存
    await prisma.product.update({
        where: { id: productId },
        data: {
            stock: { decrement: quantity },
            soldCount: { increment: quantity }
        }
    })

    // 检查库存警报
    try {
        const updatedProduct = await prisma.product.findUnique({
            where: { id: productId },
            select: { id: true, name: true, stock: true, price: true }
        })
        if (updatedProduct && updatedProduct.stock <= 0) {
            const alertSetting = await prisma.setting.findUnique({ where: { key: 'stockAlertProductIds' } })
            const alertIds = alertSetting?.value ? JSON.parse(alertSetting.value) : []
            if (alertIds.includes(productId)) {
                const { notifyLowStock } = require('../services/adminNotifyService')
                notifyLowStock(updatedProduct, 0).catch(e => console.error('库存警报邮件发送失败:', e))
            }
        }
    } catch (e) {
        console.error('库存警报检查失败:', e)
    }

    return availableCards
}

const prisma = require('../config/database')
const logger = require('./logger')

/**
 * 商品排名评分算法
 * 
 * 评分公式: (销量×40% + 时间衰减×30% + 权重×20% + 浏览量×10%) × 库存惩罚
 * 
 * - 销量: 归一化到 0-100，相对于最高销量商品
 * - 时间衰减: 30天指数衰减，越新得分越高
 * - 权重: 管理员手动设置 0-100
 * - 浏览量: 归一化到 0-100，相对于最高浏览量商品
 * - 库存惩罚: 有库存=1，无库存=0.3
 */

async function recalculateAllScores() {
    try {
        const products = await prisma.product.findMany({
            where: { status: 'ACTIVE' },
            select: {
                id: true,
                soldCount: true,
                viewCount: true,
                weight: true,
                stock: true,
                createdAt: true
            }
        })

        if (products.length === 0) return 0

        // 获取归一化基准值
        const maxSold = Math.max(...products.map(p => p.soldCount), 1)
        const maxViews = Math.max(...products.map(p => p.viewCount), 1)

        const now = Date.now()
        let updatedCount = 0

        for (const product of products) {
            const score = calculateScore(product, maxSold, maxViews, now)

            await prisma.product.update({
                where: { id: product.id },
                data: { sortScore: Math.round(score * 100) / 100 }
            })
            updatedCount++
        }

        logger.info(`商品评分重算完成: 更新了 ${updatedCount} 个商品`)
        return updatedCount
    } catch (error) {
        logger.error('商品评分重算失败:', error)
        throw error
    }
}

function calculateScore(product, maxSold, maxViews, now) {
    // 1. 销量得分 (40%)
    const salesScore = maxSold > 0
        ? (product.soldCount / maxSold) * 100
        : 0

    // 2. 时间衰减得分 (30%) - 30天半衰期的指数衰减
    const daysSinceCreated = (now - new Date(product.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    const timeScore = 100 * Math.exp(-daysSinceCreated / 30)

    // 3. 权重得分 (20%) - 管理员直接设置 0-100
    const weightScore = product.weight || 0

    // 4. 浏览量得分 (10%)
    const viewScore = maxViews > 0
        ? (product.viewCount / maxViews) * 100
        : 0

    // 库存惩罚: 无库存降权到 30%
    const stockMultiplier = product.stock > 0 ? 1 : 0.3

    const totalScore = (
        salesScore * 0.4 +
        timeScore * 0.3 +
        weightScore * 0.2 +
        viewScore * 0.1
    ) * stockMultiplier

    return totalScore
}

module.exports = { recalculateAllScores, calculateScore }

// 定时清理未验证账户
const prisma = require('../config/database')
const logger = require('./logger')

// 清理超过指定天数未验证的账户
const cleanupUnverifiedAccounts = async (days = 14) => {
    try {
        const cutoffDate = new Date()
        cutoffDate.setDate(cutoffDate.getDate() - days)

        // 查找未验证且超过指定天数的用户（排除管理员）
        const usersToDelete = await prisma.user.findMany({
            where: {
                emailVerified: false,
                role: { not: 'ADMIN' },
                createdAt: {
                    lt: cutoffDate
                }
            },
            select: {
                id: true,
                email: true,
                createdAt: true
            }
        })

        if (usersToDelete.length === 0) {
            logger.info('没有需要清理的未验证账户')
            return { deleted: 0 }
        }

        // 删除这些用户
        const result = await prisma.user.deleteMany({
            where: {
                id: {
                    in: usersToDelete.map(u => u.id)
                }
            }
        })

        logger.info(`已清理 ${result.count} 个未验证账户`, {
            deletedEmails: usersToDelete.map(u => u.email)
        })

        return {
            deleted: result.count,
            users: usersToDelete.map(u => u.email)
        }
    } catch (error) {
        logger.error('清理未验证账户失败:', error)
        throw error
    }
}

module.exports = {
    cleanupUnverifiedAccounts
}

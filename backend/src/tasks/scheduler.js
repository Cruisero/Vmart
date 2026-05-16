// 定时任务调度器
const cron = require('node-cron')
const prisma = require('../config/database')
const { cleanupUnverifiedAccounts } = require('../utils/accountCleanup')
const { recalculateAllScores } = require('../utils/sortScoreCalculator')
const logger = require('../utils/logger')

// 自动取消超时未支付订单
const cancelExpiredOrders = async () => {
    try {
        // 获取设置中的超时时间（默认15分钟）
        const setting = await prisma.setting.findUnique({
            where: { key: 'orderTimeout' }
        })
        const timeoutMinutes = parseInt(setting?.value) || 15

        const expireTime = new Date(Date.now() - timeoutMinutes * 60 * 1000)

        // 查找并取消超时订单
        const result = await prisma.order.updateMany({
            where: {
                status: 'PENDING',
                createdAt: { lt: expireTime }
            },
            data: {
                status: 'CANCELLED',
                cancelledAt: new Date()
            }
        })

        if (result.count > 0) {
            logger.info(`自动取消了 ${result.count} 个超时订单`)
        }
    } catch (error) {
        logger.error('自动取消订单任务失败:', error)
    }
}

// 自动关闭已完成工单（24小时无用户回复）
const autoCloseCompletedTickets = async () => {
    try {
        // 查找所有 COMPLETED 状态的工单
        const completedTickets = await prisma.ticket.findMany({
            where: { status: 'COMPLETED' },
            include: {
                messages: {
                    orderBy: { createdAt: 'desc' },
                    take: 1
                }
            }
        })

        const now = new Date()
        const cutoff = 24 * 60 * 60 * 1000 // 24小时
        let closedCount = 0

        for (const ticket of completedTickets) {
            // 以最后一条消息的时间或工单更新时间为准
            const lastActivity = ticket.messages[0]?.createdAt || ticket.updatedAt
            const elapsed = now - new Date(lastActivity)

            if (elapsed >= cutoff) {
                await prisma.ticket.update({
                    where: { id: ticket.id },
                    data: {
                        status: 'CLOSED',
                        closedAt: now
                    }
                })
                closedCount++
            }
        }

        if (closedCount > 0) {
            logger.info(`自动关闭了 ${closedCount} 个已完成工单（24小时无回复）`)
        }
    } catch (error) {
        logger.error('自动关闭已完成工单任务失败:', error)
    }
}

const initScheduledTasks = () => {
    // 每天凌晨 3 点执行清理任务
    cron.schedule('0 3 * * *', async () => {
        logger.info('开始执行定时清理未验证账户...')
        try {
            const result = await cleanupUnverifiedAccounts(14) // 14天未验证
            logger.info(`定时清理完成: 删除了 ${result.deleted} 个账户`)
        } catch (error) {
            logger.error('定时清理任务失败:', error)
        }
    }, {
        timezone: 'Asia/Shanghai'
    })

    // 每分钟检查并取消超时订单
    cron.schedule('* * * * *', cancelExpiredOrders)

    // 每小时重算商品排名评分
    cron.schedule('0 * * * *', async () => {
        logger.info('开始重算商品排名评分...')
        try {
            await recalculateAllScores()
        } catch (error) {
            logger.error('商品评分重算任务失败:', error)
        }
    })

    // 启动时立即计算一次评分
    setTimeout(async () => {
        try {
            await recalculateAllScores()
            logger.info('✅ 商品评分初始计算完成')
        } catch (error) {
            logger.error('商品评分初始计算失败:', error)
        }
    }, 5000)

    // 每小时检查并自动关闭已完成工单（24小时无用户回复）
    cron.schedule('30 * * * *', async () => {
        logger.info('检查已完成工单是否需要自动关闭...')
        await autoCloseCompletedTickets()
    })

    // 启动数据库自动备份
    const backupService = require('../services/backupService')
    backupService.startBackupSchedule().catch(e => logger.error('备份调度启动失败:', e))

    logger.info('✅ 定时任务已启动: 每天 3:00 清理未验证账户, 每分钟检查超时订单, 每小时重算商品评分, 每小时检查已完成工单, 数据库自动备份')
}

module.exports = { initScheduledTasks, cancelExpiredOrders }

// 定时任务调度器
const cron = require('node-cron')
const prisma = require('../config/database')
const { cleanupUnverifiedAccounts } = require('../utils/accountCleanup')
const { checkExpiredShops, sendExpiryReminders } = require('./planExpiry')
const logger = require('../utils/logger')

// 自动取消超时未支付订单
const cancelExpiredOrders = async () => {
    try {
        // 订单超时时间固定为 15 分钟
        const timeoutMinutes = 15

        const expireTime = new Date(Date.now() - timeoutMinutes * 60 * 1000)

        // 先找出超时的订单（按 orderNo），用于后续同步 PlanOrder 状态
        const expiredOrders = await prisma.order.findMany({
            where: { status: 'PENDING', createdAt: { lt: expireTime } },
            select: { orderNo: true, remark: true }
        })
        const expiredOrderNos = expiredOrders.map(o => o.orderNo)

        if (expiredOrderNos.length === 0) return

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

        // 同步取消关联的 PlanOrder（remark 为 plan_order:xxx 或 tradeNo 匹配）
        try {
            await prisma.planOrder.updateMany({
                where: {
                    tradeNo: { in: expiredOrderNos },
                    paymentStatus: { in: ['PENDING', 'REVIEWING'] }
                },
                data: { paymentStatus: 'REJECTED' }
            })
        } catch (e) {
            logger.error('同步 PlanOrder 状态失败:', e)
        }

        if (result.count > 0) {
            logger.info(`自动取消了 ${result.count} 个超时订单`)
        }
    } catch (error) {
        logger.error('自动取消订单任务失败:', error)
    }
}

// 自动关闭已完成工单（24小时无用户回复）— 已废弃：现已无 COMPLETED 状态
const autoCloseCompletedTickets = async () => {
    // 兼容旧数据：如果数据库中还残留有 COMPLETED 状态的工单，统一改为 CLOSED
    try {
        const result = await prisma.ticket.updateMany({
            where: { status: 'COMPLETED' },
            data: { status: 'CLOSED', closedAt: new Date() }
        })
        if (result.count > 0) {
            logger.info(`迁移了 ${result.count} 个 COMPLETED 残留工单为 CLOSED`)
        }
    } catch (error) {
        logger.error('清理 COMPLETED 残留工单失败:', error)
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

    // 每小时检查并自动关闭已完成工单（24小时无用户回复）
    cron.schedule('30 * * * *', async () => {
        logger.info('检查已完成工单是否需要自动关闭...')
        await autoCloseCompletedTickets()
    })

    // 启动数据库自动备份
    const backupService = require('../services/backupService')
    backupService.startBackupSchedule().catch(e => logger.error('备份调度启动失败:', e))

    // 每小时检查套餐到期
    cron.schedule('15 * * * *', async () => {
        logger.info('检查商户套餐到期...')
        await checkExpiredShops()
    })

    // 每天早上 9 点发送到期提醒邮件
    cron.schedule('0 9 * * *', async () => {
        logger.info('发送套餐到期提醒...')
        await sendExpiryReminders()
    }, { timezone: 'Asia/Shanghai' })

    // 每天早上 9:05 发送 GMV 日报给超管
    cron.schedule('5 9 * * *', async () => {
        try {
            const yesterday = new Date()
            yesterday.setDate(yesterday.getDate() - 1)
            yesterday.setHours(0, 0, 0, 0)
            const today = new Date(yesterday)
            today.setDate(today.getDate() + 1)

            const [orders, refunds, newMerchants, gmvAgg] = await Promise.all([
                prisma.order.count({
                    where: { createdAt: { gte: yesterday, lt: today }, tenantId: { not: null } }
                }),
                prisma.order.count({
                    where: {
                        cancelledAt: { gte: yesterday, lt: today },
                        status: { in: ['CANCELLED', 'REFUNDED'] }
                    }
                }),
                prisma.merchant.count({ where: { createdAt: { gte: yesterday, lt: today } } }),
                prisma.order.aggregate({
                    where: {
                        completedAt: { gte: yesterday, lt: today },
                        status: 'COMPLETED',
                        tenantId: { not: null }
                    },
                    _sum: { totalAmount: true }
                })
            ])
            const gmv = parseFloat(gmvAgg._sum.totalAmount || 0)
            const manNotify = require('../services/manNotifyService')
            await manNotify.notifyDailyGmvReport({
                date: yesterday.toLocaleDateString('zh-CN'),
                gmv, orders, refunds, newMerchants
            })
        } catch (e) {
            logger.error('GMV 日报发送失败:', e)
        }
    }, { timezone: 'Asia/Shanghai' })

    logger.info('✅ 定时任务已启动: 每天 3:00 清理未验证账户, 每分钟检查超时订单, 每小时检查已完成工单, 每小时检查套餐到期, 每天 9:00 到期提醒, 数据库自动备份')
}

module.exports = { initScheduledTasks, cancelExpiredOrders }

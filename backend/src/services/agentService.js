// 代理商服务层
const prisma = require('../config/database')
const logger = require('../utils/logger')

/**
 * 结算代理商订单利润
 * @param {string} orderId 订单ID
 * @param {object} [tx] 事务客户端（可选，用于复用外部事务）
 */
async function settleAgentOrder(orderId, tx = prisma) {
    try {
        const agentOrder = await tx.agentOrder.findUnique({
            where: { orderId }
        })

        if (!agentOrder) {
            return { success: false, reason: 'NOT_AGENT_ORDER' }
        }

        if (agentOrder.settled) {
            return { success: false, reason: 'ALREADY_SETTLED' }
        }

        const profit = parseFloat(agentOrder.profit)

        // 执行结算：更新代理余额、总收益，以及结算标记
        if (tx !== prisma) {
            await tx.agent.update({
                where: { id: agentOrder.agentId },
                data: {
                    balance: { increment: profit },
                    totalEarnings: { increment: profit }
                }
            })
            await tx.agentOrder.update({
                where: { id: agentOrder.id },
                data: { settled: true }
            })
        } else {
            await prisma.$transaction([
                prisma.agent.update({
                    where: { id: agentOrder.agentId },
                    data: {
                        balance: { increment: profit },
                        totalEarnings: { increment: profit }
                    }
                }),
                prisma.agentOrder.update({
                    where: { id: agentOrder.id },
                    data: { settled: true }
                })
            ])
        }

        logger.info(`代理订单 ${orderId} 利润 ¥${profit} 已成功结算`)
        return { success: true, profit }
    } catch (error) {
        logger.error(`代理订单 ${orderId} 结算失败:`, error)
        throw error
    }
}

/**
 * 回滚已结算的代理商订单利润 (通常用于退款情况)
 * @param {string} orderId 订单ID
 * @param {object} [tx] 事务客户端（可选，用于复用外部事务）
 */
async function rollbackAgentOrder(orderId, tx = prisma) {
    try {
        const agentOrder = await tx.agentOrder.findUnique({
            where: { orderId }
        })

        if (!agentOrder) {
            return { success: false, reason: 'NOT_AGENT_ORDER' }
        }

        if (!agentOrder.settled) {
            return { success: false, reason: 'NOT_SETTLED' }
        }

        const profit = parseFloat(agentOrder.profit)

        // 执行回滚：扣减代理余额、总收益，以及取消结算标记
        if (tx !== prisma) {
            await tx.agent.update({
                where: { id: agentOrder.agentId },
                data: {
                    balance: { decrement: profit },
                    totalEarnings: { decrement: profit }
                }
            })
            await tx.agentOrder.update({
                where: { id: agentOrder.id },
                data: { settled: false }
            })
        } else {
            await prisma.$transaction([
                prisma.agent.update({
                    where: { id: agentOrder.agentId },
                    data: {
                        balance: { decrement: profit },
                        totalEarnings: { decrement: profit }
                    }
                }),
                prisma.agentOrder.update({
                    where: { id: agentOrder.id },
                    data: { settled: false }
                })
            ])
        }

        logger.info(`代理订单 ${orderId} 利润 ¥${profit} 已成功回滚（退款）`)
        return { success: true, profit }
    } catch (error) {
        logger.error(`代理订单 ${orderId} 回滚失败:`, error)
        throw error
    }
}

module.exports = {
    settleAgentOrder,
    rollbackAgentOrder
}

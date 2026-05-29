const prisma = require('../config/database')
const logger = require('./logger')
const { computePlanActivation, storePendingPlanChange, clearPendingPlanChange } = require('./planUpgradeHelper')

async function processPlanOrderIfNeeded(order) {
    if (!order?.remark || !order.remark.startsWith('plan_order:')) return false

    try {
        const parts = order.remark.split(':') // plan_order:planOrderId
        const planOrderId = parts[1]

        const planOrder = await prisma.planOrder.findUnique({
            where: { id: planOrderId },
            include: { shop: true, merchant: true }
        })

        if (planOrder && planOrder.paymentStatus !== 'PAID') {
            const { effectivePlan, newExpiry, pendingDowngrade, action } = computePlanActivation(
                planOrder.shop.plan,
                planOrder.shop.planExpiresAt,
                planOrder.plan,
                planOrder.months
            )

            await prisma.$transaction(async (tx) => {
                await tx.planOrder.update({
                    where: { id: planOrder.id },
                    data: { paymentStatus: 'PAID', paidAt: new Date() }
                })

                await tx.shop.update({
                    where: { id: planOrder.shopId },
                    data: { plan: effectivePlan, planExpiresAt: newExpiry, status: 'ACTIVE' }
                })

                await tx.order.update({
                    where: { id: order.id },
                    data: { status: 'COMPLETED', completedAt: new Date() }
                })
            })

            // 降级：存储待生效记录；升级/续费：清除旧的降级记录
            if (pendingDowngrade) {
                await storePendingPlanChange(planOrder.shopId, pendingDowngrade.plan, pendingDowngrade.switchAt)
            } else {
                await clearPendingPlanChange(planOrder.shopId)
            }

            const actionLabels = { new: '新购', renewal: '续费', upgrade: '升级', downgrade: '降级排队' }
            logger.info(`[planOrder] 套餐${actionLabels[action] || action}: ${planOrder.merchant.email} → ${effectivePlan}${pendingDowngrade ? `(待降至${pendingDowngrade.plan})` : ''}, 到期 ${newExpiry.toISOString()}`)

            // 平台超管通知
            try {
                const manNotify = require('../services/manNotifyService')
                manNotify.notifyPlanOrderPaid({
                    plan: planOrder.plan,
                    months: planOrder.months,
                    amount: planOrder.amount,
                    paymentMethod: planOrder.paymentMethod,
                    tradeNo: planOrder.tradeNo
                }, planOrder.merchant).catch(() => {})
            } catch {}
        }
    } catch (e) {
        logger.error('[planOrder] 自动处理套餐升级失败:', e)
    }

    return true
}

module.exports = { processPlanOrderIfNeeded }

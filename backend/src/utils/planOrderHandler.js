const prisma = require('../config/database')
const logger = require('./logger')

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
            const now = new Date()
            let baseDate = now
            if (planOrder.shop.planExpiresAt && new Date(planOrder.shop.planExpiresAt) > now) {
                baseDate = new Date(planOrder.shop.planExpiresAt)
            }
            const newExpiry = new Date(baseDate)
            newExpiry.setMonth(newExpiry.getMonth() + planOrder.months)

            await prisma.$transaction(async (tx) => {
                await tx.planOrder.update({
                    where: { id: planOrder.id },
                    data: { paymentStatus: 'PAID', paidAt: new Date() }
                })

                await tx.shop.update({
                    where: { id: planOrder.shopId },
                    data: { plan: planOrder.plan, planExpiresAt: newExpiry, status: 'ACTIVE' }
                })

                await tx.order.update({
                    where: { id: order.id },
                    data: { status: 'COMPLETED', completedAt: new Date() }
                })
            })

            logger.info(`[planOrder] 套餐自动激活: ${planOrder.merchant.email} → ${planOrder.plan}, 到期 ${newExpiry.toISOString()}`)

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

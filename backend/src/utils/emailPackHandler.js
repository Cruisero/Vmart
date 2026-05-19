/**
 * 邮件资源包订单处理工具
 * 共享给 paymentController / usdtService / bscUsdtService 等支付通道
 */
const prisma = require('../config/database')
const logger = require('./logger')

/**
 * 如果订单的 remark 是 email_pack 格式，则增加租户永久额度并将订单标记为已完成。
 * @param {Object} order - 订单对象（必须包含 id, remark）
 * @returns {Promise<boolean>} 是否是邮件资源包订单（如果是则调用方应跳过卡密分发等后续流程）
 */
async function processEmailPackIfNeeded(order) {
    if (!order?.remark || !order.remark.startsWith('email_pack:')) return false

    try {
        const parts = order.remark.split(':') // email_pack:tenantId:count
        const tenantId = parts[1]
        const count = parseInt(parts[2]) || 0

        if (tenantId && count > 0) {
            const key = `email_pack_balance_${tenantId}`
            const existing = await prisma.platformSetting.findUnique({ where: { key } })
            const current = parseInt(existing?.value || '0')
            const newBalance = current + count

            await prisma.platformSetting.upsert({
                where: { key },
                create: { key, value: String(newBalance), description: '商户邮件永久额度（资源包累计）' },
                update: { value: String(newBalance) }
            })

            await prisma.order.update({
                where: { id: order.id },
                data: { status: 'COMPLETED', completedAt: new Date() }
            })

            logger.info(`[emailPack] 租户 ${tenantId} 邮件额度 +${count}，当前 ${newBalance}`)

            // 平台超管通知
            try {
                const tenant = await prisma.tenant.findUnique({
                    where: { id: tenantId },
                    select: {
                        shopName: true, shopSlug: true,
                        user: { select: { email: true } }
                    }
                })
                const manNotify = require('../services/manNotifyService')
                manNotify.notifyEmailPackPaid({ orderNo: order.orderNo, totalAmount: order.totalAmount }, count, tenant).catch(() => {})
            } catch {}
        }
    } catch (e) {
        logger.error('[emailPack] 处理邮件资源包失败:', e)
    }

    return true
}

module.exports = { processEmailPackIfNeeded }

const prisma = require('../config/database')

/**
 * 结算订单资金至商户（Tenant）钱包余额
 * @param {string} orderId 订单ID
 */
async function settleTenantOrder(orderId) {
    try {
        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: { tenant: true }
        })
        
        if (!order || !order.tenantId || !order.tenant) {
            return
        }

        // 1. 检查该订单是否已成功付款，非支付订单不结算
        if (order.status !== 'PAID' && order.status !== 'COMPLETED') {
            return
        }

        // 2. 检查是否已经结算过（避免重复记账）
        const exists = await prisma.tenantBalanceLog.findFirst({
            where: { referenceId: orderId, type: 'INCOME' }
        })
        if (exists) {
            return
        }

        // 3. 检查该商户对应的支付方式是否为平台代收模式
        const ts = await prisma.tenantSetting.findUnique({ where: { tenantId: order.tenantId } })
        if (!ts || !ts.paymentConfig) {
            return
        }

        let isPlatformChannel = false
        try {
            const payConfig = JSON.parse(ts.paymentConfig)
            const method = order.paymentMethod?.toLowerCase() || ''
            
            if (method.includes('alipay') && payConfig.alipay_mode === 'platform') {
                isPlatformChannel = true
            } else if (method.includes('wechat') && payConfig.wechat_mode === 'platform') {
                isPlatformChannel = true
            } else if (method.includes('usdt') && payConfig.usdt_mode === 'platform') {
                isPlatformChannel = true
            }
        } catch (e) {
            console.error('[TenantWallet] 解析商户支付配置失败:', e)
            return
        }

        if (!isPlatformChannel) {
            return
        }

        // 4. 执行扣减费率记账逻辑
        const feeRate = Number(order.tenant.feeRate || 0.02)
        const totalAmount = Number(order.totalAmount)
        const feeAmount = totalAmount * feeRate
        const finalAmount = totalAmount - feeAmount

        await prisma.$transaction(async (tx) => {
            // 用 SELECT ... FOR UPDATE 锁住 Tenant，确保并发安全性
            const [lockedTenant] = await tx.$queryRaw`SELECT balance FROM tenants WHERE id = ${order.tenantId} FOR UPDATE`
            if (!lockedTenant) {
                throw new Error('租户不存在')
            }

            // 更新商户可用余额及累计销售额
            const updatedTenant = await tx.tenant.update({
                where: { id: order.tenantId },
                data: {
                    balance: { increment: finalAmount },
                    totalSales: { increment: totalAmount }
                }
            })

            // 写入财务收支日志
            await tx.tenantBalanceLog.create({
                data: {
                    tenantId: order.tenantId,
                    type: 'INCOME',
                    amount: finalAmount,
                    balance: updatedTenant.balance,
                    referenceId: orderId,
                    remark: `订单代收款入账，订单号: ${order.orderNo} (费率: ${(feeRate * 100).toFixed(1)}%, 手续费: -${feeAmount.toFixed(2)})`
                }
            })
        })

        console.log(`[TenantWallet] 成功结算代收订单: ${order.orderNo}, 入账金额: ${finalAmount.toFixed(2)}, 手续费: ${feeAmount.toFixed(2)}`)
    } catch (err) {
        console.error('[TenantWallet] 结算商户代收资金时发生错误:', err)
    }
}

module.exports = {
    settleTenantOrder
}

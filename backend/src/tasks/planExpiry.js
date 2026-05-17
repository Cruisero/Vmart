/**
 * 套餐到期检查任务
 * - 每小时检查一次
 * - 到期商户标记为 EXPIRED
 * - 到期前 3 天 / 1 天发送提醒邮件
 */
const prisma = require('../config/database')
const logger = require('../utils/logger')

// 检查并标记到期商户
async function checkExpiredShops() {
    try {
        const now = new Date()

        // 1. 免费试用到期
        const expiredTrials = await prisma.shop.updateMany({
            where: {
                plan: 'FREE',
                status: 'ACTIVE',
                trialEndsAt: { lt: now },
                planExpiresAt: null
            },
            data: { status: 'EXPIRED' }
        })

        // 2. 付费套餐到期
        const expiredPaid = await prisma.shop.updateMany({
            where: {
                plan: { not: 'FREE' },
                status: 'ACTIVE',
                planExpiresAt: { lt: now }
            },
            data: { status: 'EXPIRED' }
        })

        const total = expiredTrials.count + expiredPaid.count
        if (total > 0) {
            logger.info(`[planExpiry] 标记 ${total} 个商城为到期（试用 ${expiredTrials.count}，付费 ${expiredPaid.count}）`)
        }

        return total
    } catch (error) {
        logger.error('[planExpiry] 检查到期商户失败:', error)
        return 0
    }
}

// 发送到期提醒（到期前 3 天和 1 天）
async function sendExpiryReminders() {
    try {
        const now = new Date()
        const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
        const in1Day = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000)

        // 查找 3 天内到期的商户（付费套餐）
        const expiringShops = await prisma.shop.findMany({
            where: {
                status: 'ACTIVE',
                planExpiresAt: {
                    gte: now,
                    lte: in3Days
                }
            },
            include: {
                merchant: { select: { email: true, shopName: true } }
            }
        })

        // 查找 1 天内到期的免费试用
        const expiringTrials = await prisma.shop.findMany({
            where: {
                plan: 'FREE',
                status: 'ACTIVE',
                trialEndsAt: {
                    gte: now,
                    lte: in1Day
                },
                planExpiresAt: null
            },
            include: {
                merchant: { select: { email: true, shopName: true } }
            }
        })

        const allExpiring = [...expiringShops, ...expiringTrials]

        if (allExpiring.length > 0) {
            logger.info(`[planExpiry] ${allExpiring.length} 个商城即将到期，准备发送提醒`)

            for (const shop of allExpiring) {
                try {
                    const emailService = require('../services/emailService')
                    const transporter = await emailService.createTransporter()
                    if (!transporter) continue

                    const config = await emailService.getEmailConfig()
                    const expiryDate = shop.planExpiresAt || shop.trialEndsAt
                    const daysLeft = Math.ceil((new Date(expiryDate) - now) / (24 * 60 * 60 * 1000))

                    await transporter.sendMail({
                        from: `"Vmart" <${config.smtpUser}>`,
                        to: shop.merchant.email,
                        subject: `【Vmart】您的商城套餐将在 ${daysLeft} 天后到期`,
                        html: `
                            <div style="font-family: -apple-system, sans-serif; max-width: 500px; margin: 0 auto; padding: 30px;">
                                <h2 style="color: #1e293b;">⏰ 套餐到期提醒</h2>
                                <p>您好，${shop.merchant.shopName}：</p>
                                <p>您的商城 <strong>${shop.name}</strong> 的${shop.plan === 'FREE' ? '免费试用' : '套餐'}将在 <strong style="color: #ef4444;">${daysLeft} 天后</strong>到期。</p>
                                <p>到期后商城将暂停服务（商品不可购买），请及时续费以避免影响业务。</p>
                                <p style="margin-top: 20px;">
                                    <a href="${process.env.FRONTEND_URL || 'http://localhost:3100'}/v/${shop.slug}/admin" 
                                       style="background: #6366f1; color: white; padding: 10px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
                                        前往续费 →
                                    </a>
                                </p>
                                <p style="color: #94a3b8; font-size: 12px; margin-top: 30px;">Vmart 平台自动发送</p>
                            </div>
                        `
                    })
                    logger.info(`[planExpiry] 到期提醒已发送: ${shop.merchant.email} (${shop.slug})`)
                } catch (emailErr) {
                    logger.error(`[planExpiry] 发送提醒邮件失败 ${shop.merchant?.email}:`, emailErr.message)
                }
            }
        }
    } catch (error) {
        logger.error('[planExpiry] 发送到期提醒失败:', error)
    }
}

module.exports = { checkExpiredShops, sendExpiryReminders }

/**
 * 租户邮件发送服务
 * 支持两种模式：商户自有 SMTP / 平台代发
 */
const nodemailer = require('nodemailer')
const prisma = require('../config/database')
const logger = require('../utils/logger')

/**
 * 获取平台 SMTP 配置
 */
async function getPlatformSmtp() {
    const keys = ['platform_smtp_host', 'platform_smtp_port', 'platform_smtp_user', 'platform_smtp_pass', 'platform_smtp_from']
    const settings = await prisma.platformSetting.findMany({ where: { key: { in: keys } } })
    const map = {}
    settings.forEach(s => { map[s.key] = s.value })
    if (!map.platform_smtp_host || !map.platform_smtp_user) return null
    return {
        host: map.platform_smtp_host,
        port: parseInt(map.platform_smtp_port) || 465,
        user: map.platform_smtp_user,
        pass: map.platform_smtp_pass,
        from: map.platform_smtp_from || map.platform_smtp_user
    }
}

/**
 * 获取商户自有 SMTP 配置
 */
async function getTenantSmtp(tenantId) {
    const settings = await prisma.tenantSetting.findUnique({ where: { tenantId } })
    if (!settings?.paymentConfig) return null
    try {
        const config = JSON.parse(settings.paymentConfig)
        if (!config.smtp_host || !config.smtp_user) return null
        return {
            host: config.smtp_host,
            port: parseInt(config.smtp_port) || 465,
            user: config.smtp_user,
            pass: config.smtp_pass,
            from: config.smtp_from || config.smtp_user
        }
    } catch { return null }
}

/**
 * 获取商户邮件模式和套餐额度
 */
async function getTenantEmailConfig(tenantId) {
    const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { shopSlug: true, shopName: true, settings: true, userId: true }
    })
    if (!tenant) return null

    // 获取商户的 shop 和套餐（先通过 slug，再通过 user 的 merchant）
    let shop = await prisma.shop.findUnique({ where: { slug: tenant.shopSlug } })
    if (!shop) {
        // fallback: 通过 user -> merchant -> shop 查找
        const merchant = await prisma.merchant.findFirst({
            where: { email: (await prisma.user.findUnique({ where: { id: tenant.userId }, select: { email: true } }))?.email },
            include: { shop: true }
        })
        shop = merchant?.shop
    }
    if (!shop) {
        // 没有关联的 shop，默认允许（不限制）
        return { allowed: true, mode: 'platform', tenantId, shopName: tenant.shopName, shopSlug: tenant.shopSlug, plan: 'UNKNOWN', emailLimit: -1 }
    }

    // 免费版不支持邮件
    if (shop.plan === 'FREE') return { allowed: false }

    // 获取套餐配置中的邮件额度
    let emailLimit = -1 // -1 = 无限（自有SMTP）或按套餐配置
    try {
        const planSetting = await prisma.platformSetting.findUnique({ where: { key: 'plan_config' } })
        if (planSetting?.value) {
            const config = JSON.parse(planSetting.value)
            const plan = config.plans?.find(p => p.key === shop.plan)
            if (plan?.features?.emailNotifications !== undefined) {
                emailLimit = plan.features.emailNotifications
            }
        }
    } catch {}

    // emailNotifications 为 0 且不是自有 SMTP 时不允许
    if (emailLimit === 0) return { allowed: false }

    // 获取邮件模式（platform / custom）
    let emailMode = 'platform'
    try {
        const config = JSON.parse(tenant.settings?.paymentConfig || '{}')
        emailMode = config.email_mode || 'platform'
    } catch {}

    return {
        allowed: true,
        mode: emailMode,
        tenantId,
        shopName: tenant.shopName,
        shopSlug: tenant.shopSlug,
        plan: shop.plan,
        emailLimit // 0 = 无限（自有 SMTP），>0 = 平台代发月限
    }
}

/**
 * 检查平台代发额度
 */
async function checkPlatformEmailQuota(tenantId, emailLimit) {
    if (emailLimit <= 0) return true // 无限制

    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)

    // 统计本月已发送数量（从 platform_settings 读取计数）
    const countKey = `email_count_${tenantId}_${monthStart.toISOString().slice(0, 7)}`
    const countSetting = await prisma.platformSetting.findUnique({ where: { key: countKey } })
    const currentCount = parseInt(countSetting?.value || '0')

    return currentCount < emailLimit
}

/**
 * 增加平台代发计数
 */
async function incrementEmailCount(tenantId) {
    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)
    const countKey = `email_count_${tenantId}_${monthStart.toISOString().slice(0, 7)}`

    const existing = await prisma.platformSetting.findUnique({ where: { key: countKey } })
    const newCount = (parseInt(existing?.value || '0') + 1).toString()

    await prisma.platformSetting.upsert({
        where: { key: countKey },
        create: { key: countKey, value: '1', description: '商户月邮件计数' },
        update: { value: newCount }
    })
}

/**
 * 为租户发送邮件
 * @param {string} tenantId - 租户 ID
 * @param {object} mailOptions - { to, subject, html }
 */
async function sendTenantEmail(tenantId, mailOptions) {
    try {
        const emailConfig = await getTenantEmailConfig(tenantId)
        if (!emailConfig || !emailConfig.allowed) {
            logger.info(`[tenantEmail] 租户 ${tenantId} 邮件功能未开通，跳过`)
            return { success: false, reason: 'not_allowed' }
        }

        let transporter
        let fromAddress

        if (emailConfig.mode === 'custom') {
            // 商户自有 SMTP
            const smtp = await getTenantSmtp(tenantId)
            if (!smtp) {
                logger.warn(`[tenantEmail] 租户 ${tenantId} 自有 SMTP 未配置`)
                return { success: false, reason: 'smtp_not_configured' }
            }
            transporter = nodemailer.createTransport({
                host: smtp.host,
                port: smtp.port,
                secure: smtp.port === 465,
                auth: { user: smtp.user, pass: smtp.pass }
            })
            fromAddress = `"${emailConfig.shopName}" <${smtp.from}>`
        } else {
            // 平台代发
            const platformSmtp = await getPlatformSmtp()
            if (!platformSmtp) {
                logger.warn('[tenantEmail] 平台 SMTP 未配置，无法代发')
                return { success: false, reason: 'platform_smtp_not_configured' }
            }

            // 检查额度
            const hasQuota = await checkPlatformEmailQuota(tenantId, emailConfig.emailLimit)
            if (!hasQuota) {
                logger.warn(`[tenantEmail] 租户 ${tenantId} 本月邮件额度已用完`)
                return { success: false, reason: 'quota_exceeded' }
            }

            transporter = nodemailer.createTransport({
                host: platformSmtp.host,
                port: platformSmtp.port,
                secure: platformSmtp.port === 465,
                auth: { user: platformSmtp.user, pass: platformSmtp.pass }
            })
            fromAddress = `"${emailConfig.shopName}" <${platformSmtp.from}>`

            // 增加计数
            await incrementEmailCount(tenantId)
        }

        await transporter.sendMail({
            from: fromAddress,
            to: mailOptions.to,
            subject: mailOptions.subject,
            html: mailOptions.html
        })

        logger.info(`[tenantEmail] 发送成功: ${tenantId} → ${mailOptions.to} (${emailConfig.mode})`)
        return { success: true }
    } catch (error) {
        logger.error(`[tenantEmail] 发送失败: ${tenantId}`, error.message)
        return { success: false, reason: 'send_failed', error: error.message }
    }
}

/**
 * 获取租户本月邮件使用情况
 */
async function getEmailUsage(tenantId) {
    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)
    const countKey = `email_count_${tenantId}_${monthStart.toISOString().slice(0, 7)}`

    const countSetting = await prisma.platformSetting.findUnique({ where: { key: countKey } })
    return parseInt(countSetting?.value || '0')
}

module.exports = {
    sendTenantEmail,
    getPlatformSmtp,
    getTenantSmtp,
    getTenantEmailConfig,
    getEmailUsage
}

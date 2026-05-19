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

    // 免费试用与专业版同权限：FREE 视同 PRO 读取邮件额度
    const effectivePlanKey = shop.plan === 'FREE' ? 'PRO' : shop.plan

    // 获取套餐配置中的邮件额度
    let emailLimit = -1 // -1 = 无限（自有SMTP）或按套餐配置
    try {
        const planSetting = await prisma.platformSetting.findUnique({ where: { key: 'plan_config' } })
        if (planSetting?.value) {
            const config = JSON.parse(planSetting.value)
            const plan = config.plans?.find(p => p.key === effectivePlanKey)
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
 * 检查平台代发额度（先看月限额，超出则看永久额度）
 * @returns {object} { allowed: boolean, source: 'monthly' | 'pack' | null }
 */
async function checkPlatformEmailQuota(tenantId, emailLimit) {
    if (emailLimit < 0) return { allowed: true, source: 'monthly' } // -1 不限

    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)

    // 当月已发送数
    const countKey = `email_count_${tenantId}_${monthStart.toISOString().slice(0, 7)}`
    const countSetting = await prisma.platformSetting.findUnique({ where: { key: countKey } })
    const currentCount = parseInt(countSetting?.value || '0')

    if (currentCount < emailLimit) return { allowed: true, source: 'monthly' }

    // 月限额用完 → 检查永久资源包余量
    const packKey = `email_pack_balance_${tenantId}`
    const packSetting = await prisma.platformSetting.findUnique({ where: { key: packKey } })
    const packBalance = parseInt(packSetting?.value || '0')
    if (packBalance > 0) return { allowed: true, source: 'pack' }

    return { allowed: false, source: null }
}

/**
 * 增加平台代发计数 / 扣减永久资源包
 */
async function consumeEmailQuota(tenantId, source) {
    if (source === 'pack') {
        const key = `email_pack_balance_${tenantId}`
        const existing = await prisma.platformSetting.findUnique({ where: { key } })
        const current = parseInt(existing?.value || '0')
        const next = Math.max(0, current - 1)
        await prisma.platformSetting.upsert({
            where: { key },
            create: { key, value: '0', description: '商户邮件永久额度（资源包累计）' },
            update: { value: String(next) }
        })
        return
    }
    // 默认增加月计数
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
 * 兼容旧调用名
 */
async function incrementEmailCount(tenantId) {
    return consumeEmailQuota(tenantId, 'monthly')
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

            // 检查额度（先月度，再永久包）
            const quotaCheck = await checkPlatformEmailQuota(tenantId, emailConfig.emailLimit)
            if (!quotaCheck.allowed) {
                logger.warn(`[tenantEmail] 租户 ${tenantId} 本月邮件额度已用完且无永久资源包`)
                return { success: false, reason: 'quota_exceeded' }
            }

            transporter = nodemailer.createTransport({
                host: platformSmtp.host,
                port: platformSmtp.port,
                secure: platformSmtp.port === 465,
                auth: { user: platformSmtp.user, pass: platformSmtp.pass }
            })
            fromAddress = `"${emailConfig.shopName}" <${platformSmtp.from}>`

            // 扣减额度（按 source 分别扣）
            await consumeEmailQuota(tenantId, quotaCheck.source)
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

/**
 * 获取租户永久资源包余量
 */
async function getEmailPackBalance(tenantId) {
    const setting = await prisma.platformSetting.findUnique({
        where: { key: `email_pack_balance_${tenantId}` }
    })
    return parseInt(setting?.value || '0')
}

module.exports = {
    sendTenantEmail,
    getPlatformSmtp,
    getTenantSmtp,
    getTenantEmailConfig,
    getEmailUsage,
    getEmailPackBalance
}

/**
 * 邮箱 OTP 服务
 * 用途：注册时验证邮箱归属
 * scope: merchant_register | customer_register
 */
const prisma = require('../config/database')
const logger = require('../utils/logger')
const tenantEmailService = require('./tenantEmailService')
const nodemailer = require('nodemailer')

const OTP_TTL_MINUTES = 10
const OTP_RESEND_SECONDS = 60
const MAX_ATTEMPTS = 5

function generateCode() {
    return String(Math.floor(100000 + Math.random() * 900000))
}

function buildHtml({ shopName, code }) {
    return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; color: #1f2937;">
        <h2 style="margin: 0 0 16px;">${shopName || ''} 邮箱验证</h2>
        <p style="margin: 0 0 8px; font-size: 14px; color: #6b7280;">您的注册验证码：</p>
        <div style="font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #ef4444; margin: 16px 0; padding: 16px 24px; background: #fef2f2; border-radius: 8px; text-align: center;">${code}</div>
        <p style="font-size: 13px; color: #6b7280; margin: 8px 0;">验证码 ${OTP_TTL_MINUTES} 分钟内有效，请勿泄露给他人。</p>
        <p style="font-size: 12px; color: #9ca3af; margin-top: 24px;">如果不是您本人操作，请忽略此邮件。</p>
    </div>`
}

/**
 * 发送 OTP
 * @param {object} opts
 *   - email: 收件人邮箱
 *   - scope: 'merchant_register' | 'customer_register'
 *   - tenantId: 仅 customer_register 时必填，用于走商户邮件配置
 */
async function sendOtp({ email, scope, tenantId = null }) {
    if (!email) return { ok: false, error: '邮箱不能为空' }

    // 防刷：60 秒内同邮箱+scope 不能重复发
    const recent = await prisma.emailOtp.findFirst({
        where: {
            email,
            scope,
            tenantId: tenantId || null,
            createdAt: { gt: new Date(Date.now() - OTP_RESEND_SECONDS * 1000) }
        },
        orderBy: { createdAt: 'desc' }
    })
    if (recent) {
        const waitSec = OTP_RESEND_SECONDS - Math.floor((Date.now() - recent.createdAt.getTime()) / 1000)
        return { ok: false, error: `请 ${waitSec} 秒后再试` }
    }

    const code = generateCode()
    await prisma.emailOtp.create({
        data: {
            email,
            code,
            scope,
            tenantId: tenantId || null,
            expiresAt: new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000)
        }
    })

    let shopName = ''
    let result
    try {
        if (scope === 'customer_register' && tenantId) {
            // 走商户邮件配置（自有 SMTP 或平台代发，发件人显示店铺名）
            const tenant = await prisma.tenant.findUnique({
                where: { id: tenantId },
                select: { shopName: true }
            })
            shopName = tenant?.shopName || ''
            result = await tenantEmailService.sendTenantEmail(tenantId, {
                to: email,
                subject: `${shopName} - 邮箱验证码`,
                html: buildHtml({ shopName, code })
            })
        } else {
            // 商户注册 → 平台 SMTP
            shopName = 'Vmart'
            const platformSmtp = await tenantEmailService.getPlatformSmtp()
            if (!platformSmtp) {
                return { ok: false, error: '平台 SMTP 未配置，无法发送' }
            }
            const transporter = nodemailer.createTransport({
                host: platformSmtp.host,
                port: platformSmtp.port,
                secure: platformSmtp.port === 465,
                auth: { user: platformSmtp.user, pass: platformSmtp.pass }
            })
            const sendResult = await transporter.sendMail({
                from: `"Vmart" <${platformSmtp.from}>`,
                to: email,
                subject: 'Vmart - 邮箱验证码',
                html: buildHtml({ shopName, code })
            })
            result = { success: true, messageId: sendResult.messageId }
        }
    } catch (e) {
        logger.error('[otp] 发送失败:', e.message)
        return { ok: false, error: '邮件发送失败，请稍后重试' }
    }

    if (!result?.success && !result?.messageId) {
        // 平台 SMTP 路径返回 messageId，租户路径返回 success
        return { ok: false, error: '邮件发送失败' }
    }
    return { ok: true }
}

/**
 * 校验 OTP（成功后立刻标记 used）
 */
async function verifyOtp({ email, code, scope, tenantId = null }) {
    if (!email || !code) return { ok: false, error: '验证码必填' }

    const otp = await prisma.emailOtp.findFirst({
        where: {
            email,
            scope,
            tenantId: tenantId || null,
            used: false
        },
        orderBy: { createdAt: 'desc' }
    })

    if (!otp) return { ok: false, error: '请先获取验证码' }
    if (otp.expiresAt < new Date()) return { ok: false, error: '验证码已过期' }
    if (otp.attempts >= MAX_ATTEMPTS) return { ok: false, error: '错误次数过多，请重新获取' }

    if (otp.code !== String(code).trim()) {
        await prisma.emailOtp.update({
            where: { id: otp.id },
            data: { attempts: { increment: 1 } }
        })
        return { ok: false, error: '验证码错误' }
    }

    await prisma.emailOtp.update({
        where: { id: otp.id },
        data: { used: true }
    })
    return { ok: true }
}

module.exports = { sendOtp, verifyOtp }

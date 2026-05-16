const prisma = require('../config/database')
const logger = require('../utils/logger')

const SETTINGS_KEYS = [
    'securityEnabled',
    'securityEnableIpBlock',
    'securityBlockedIps',
    'securityEnableEmailSuffixBlock',
    'securityBlockedEmailSuffixes',
    'securityRequireVerifiedForTicket',
    'securityRegisterLimitMax',
    'securityRegisterLimitWindowMinutes',
    'securityOrderQueryLimitMax',
    'securityOrderQueryLimitWindowMinutes',
    'securityTicketCreateLimitMax',
    'securityTicketCreateLimitWindowMinutes'
]

const DEFAULT_SETTINGS = {
    securityEnabled: true,
    securityEnableIpBlock: true,
    securityBlockedIps: [],
    securityEnableEmailSuffixBlock: true,
    securityBlockedEmailSuffixes: [],
    securityRequireVerifiedForTicket: true,
    securityRegisterLimitMax: 5,
    securityRegisterLimitWindowMinutes: 10,
    securityOrderQueryLimitMax: 20,
    securityOrderQueryLimitWindowMinutes: 10,
    securityTicketCreateLimitMax: 3,
    securityTicketCreateLimitWindowMinutes: 10
}

const settingsCache = {
    value: { ...DEFAULT_SETTINGS },
    expiresAt: 0
}

const rateBuckets = new Map()

function parseBoolean(value, fallback) {
    if (value === undefined || value === null || value === '') return fallback
    if (typeof value === 'boolean') return value
    const normalized = String(value).trim().toLowerCase()
    if (normalized === 'true') return true
    if (normalized === 'false') return false
    return fallback
}

function parseNumber(value, fallback, min, max) {
    const num = Number(value)
    if (!Number.isFinite(num)) return fallback
    if (num < min) return min
    if (num > max) return max
    return Math.floor(num)
}

function parseList(value) {
    if (!value) return []
    return String(value)
        .split(/[\n,]+/)
        .map(v => v.trim())
        .filter(Boolean)
}

function normalizeIp(rawIp) {
    if (!rawIp) return ''
    let ip = String(rawIp).trim()
    if (ip.includes(',')) ip = ip.split(',')[0].trim()
    if (ip.startsWith('::ffff:')) ip = ip.slice(7)
    if (ip === '::1') ip = '127.0.0.1'
    return ip
}

function getClientIp(req) {
    const forwardedFor = req.headers['x-forwarded-for']
    if (forwardedFor) {
        const first = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor
        return normalizeIp(first)
    }
    return normalizeIp(req.ip || req.connection?.remoteAddress || '')
}

function isValidIPv4(ip) {
    if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(ip)) return false
    return ip.split('.').every(part => {
        const n = Number(part)
        return Number.isInteger(n) && n >= 0 && n <= 255
    })
}

function ipv4ToInt(ip) {
    return ip.split('.').reduce((acc, part) => ((acc << 8) + Number(part)) >>> 0, 0)
}

function isIpv4InCidr(ip, cidr) {
    const [baseIpRaw, prefixRaw] = cidr.split('/')
    const baseIp = normalizeIp(baseIpRaw)
    const prefix = Number(prefixRaw)

    if (!isValidIPv4(ip) || !isValidIPv4(baseIp)) return false
    if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) return false

    const ipInt = ipv4ToInt(ip)
    const baseInt = ipv4ToInt(baseIp)
    const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0

    return (ipInt & mask) === (baseInt & mask)
}

function isIpBlocked(clientIp, blockedList) {
    if (!clientIp || !blockedList.length) return false
    const normalizedClientIp = normalizeIp(clientIp).toLowerCase()

    return blockedList.some(rawRule => {
        const rule = normalizeIp(rawRule).toLowerCase()
        if (!rule) return false
        if (rule.includes('/')) return isIpv4InCidr(normalizedClientIp, rule)
        return normalizedClientIp === rule
    })
}

function getEmailDomain(email) {
    if (!email || typeof email !== 'string') return ''
    const at = email.lastIndexOf('@')
    if (at < 0) return ''
    return email.slice(at + 1).trim().toLowerCase()
}

function normalizeSuffix(suffix) {
    if (!suffix) return ''
    return String(suffix).trim().toLowerCase().replace(/^@/, '').replace(/^\./, '')
}

function isEmailSuffixBlocked(email, blockedSuffixes) {
    const domain = getEmailDomain(email)
    if (!domain || !blockedSuffixes.length) return false

    return blockedSuffixes.some(rawSuffix => {
        const suffix = normalizeSuffix(rawSuffix)
        if (!suffix) return false
        return domain === suffix || domain.endsWith(`.${suffix}`)
    })
}

async function loadSecuritySettings() {
    const now = Date.now()
    if (settingsCache.expiresAt > now) {
        return settingsCache.value
    }

    try {
        const rows = await prisma.setting.findMany({
            where: { key: { in: SETTINGS_KEYS } },
            select: { key: true, value: true }
        })

        const map = {}
        for (const row of rows) map[row.key] = row.value

        const merged = {
            securityEnabled: parseBoolean(map.securityEnabled, DEFAULT_SETTINGS.securityEnabled),
            securityEnableIpBlock: parseBoolean(map.securityEnableIpBlock, DEFAULT_SETTINGS.securityEnableIpBlock),
            securityBlockedIps: parseList(map.securityBlockedIps),
            securityEnableEmailSuffixBlock: parseBoolean(map.securityEnableEmailSuffixBlock, DEFAULT_SETTINGS.securityEnableEmailSuffixBlock),
            securityBlockedEmailSuffixes: parseList(map.securityBlockedEmailSuffixes).map(normalizeSuffix).filter(Boolean),
            securityRequireVerifiedForTicket: parseBoolean(map.securityRequireVerifiedForTicket, DEFAULT_SETTINGS.securityRequireVerifiedForTicket),
            securityRegisterLimitMax: parseNumber(map.securityRegisterLimitMax, DEFAULT_SETTINGS.securityRegisterLimitMax, 1, 500),
            securityRegisterLimitWindowMinutes: parseNumber(map.securityRegisterLimitWindowMinutes, DEFAULT_SETTINGS.securityRegisterLimitWindowMinutes, 1, 1440),
            securityOrderQueryLimitMax: parseNumber(map.securityOrderQueryLimitMax, DEFAULT_SETTINGS.securityOrderQueryLimitMax, 1, 1000),
            securityOrderQueryLimitWindowMinutes: parseNumber(map.securityOrderQueryLimitWindowMinutes, DEFAULT_SETTINGS.securityOrderQueryLimitWindowMinutes, 1, 1440),
            securityTicketCreateLimitMax: parseNumber(map.securityTicketCreateLimitMax, DEFAULT_SETTINGS.securityTicketCreateLimitMax, 1, 200),
            securityTicketCreateLimitWindowMinutes: parseNumber(map.securityTicketCreateLimitWindowMinutes, DEFAULT_SETTINGS.securityTicketCreateLimitWindowMinutes, 1, 1440)
        }

        settingsCache.value = merged
        settingsCache.expiresAt = now + 10 * 1000
        return merged
    } catch (error) {
        logger.error('读取安全设置失败，使用默认配置', { error: error.message })
        settingsCache.value = { ...DEFAULT_SETTINGS }
        settingsCache.expiresAt = now + 10 * 1000
        return settingsCache.value
    }
}

function cleanExpiredBuckets(now) {
    if (rateBuckets.size < 5000) return
    for (const [key, value] of rateBuckets.entries()) {
        if (value.resetAt <= now) {
            rateBuckets.delete(key)
        }
    }
}

function createSecurityRateLimiter({
    actionName,
    maxKey,
    windowKey,
    defaultMax,
    defaultWindowMinutes,
    keyPrefix,
    keyGenerator
}) {
    return async (req, res, next) => {
        try {
            const settings = await loadSecuritySettings()
            if (!settings.securityEnabled) return next()

            const max = parseNumber(settings[maxKey], defaultMax, 1, 10000)
            const windowMinutes = parseNumber(settings[windowKey], defaultWindowMinutes, 1, 1440)
            const windowMs = windowMinutes * 60 * 1000

            const keyValue = keyGenerator ? keyGenerator(req) : getClientIp(req)
            const bucketKey = `${keyPrefix}:${keyValue || 'unknown'}`
            const now = Date.now()

            let bucket = rateBuckets.get(bucketKey)
            if (!bucket || bucket.resetAt <= now) {
                bucket = { count: 0, resetAt: now + windowMs }
                rateBuckets.set(bucketKey, bucket)
            }

            if (bucket.count >= max) {
                const retryAfterSec = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))
                res.setHeader('Retry-After', String(retryAfterSec))
                logger.warn('安全限流命中', {
                    action: actionName,
                    ip: getClientIp(req),
                    key: bucketKey
                })
                return res.status(429).json({ error: `${actionName}过于频繁，请稍后再试` })
            }

            bucket.count += 1
            cleanExpiredBuckets(now)
            next()
        } catch (error) {
            next(error)
        }
    }
}

async function resolveCurrentUser(req) {
    if (req._securityUser !== undefined) return req._securityUser
    if (!req.user?.id) {
        req._securityUser = null
        return null
    }

    const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { id: true, email: true, emailVerified: true }
    })
    req._securityUser = user
    return user
}

function createSecurityAccessGuard({ actionName, getEmail, requireVerifiedForTicket = false }) {
    return async (req, res, next) => {
        try {
            const settings = await loadSecuritySettings()
            if (!settings.securityEnabled) return next()

            const ip = getClientIp(req)
            if (settings.securityEnableIpBlock && isIpBlocked(ip, settings.securityBlockedIps)) {
                logger.warn('命中 IP 黑名单', { action: actionName, ip })
                return res.status(403).json({ error: '访问被安全策略拦截' })
            }

            const email = getEmail ? await getEmail(req) : ''
            if (settings.securityEnableEmailSuffixBlock && email && isEmailSuffixBlocked(email, settings.securityBlockedEmailSuffixes)) {
                logger.warn('命中邮箱后缀黑名单', { action: actionName, ip, email })
                return res.status(403).json({ error: '该邮箱后缀暂不支持，请更换邮箱' })
            }

            if (requireVerifiedForTicket && settings.securityRequireVerifiedForTicket) {
                const user = await resolveCurrentUser(req)
                if (!user) {
                    return res.status(401).json({ error: '请先登录' })
                }
                if (!user.emailVerified) {
                    return res.status(403).json({ error: '请先完成邮箱验证后再提交工单' })
                }
            }

            next()
        } catch (error) {
            next(error)
        }
    }
}

const registerSecurityGuard = createSecurityAccessGuard({
    actionName: '注册',
    getEmail: async (req) => req.body?.email
})

const orderQuerySecurityGuard = createSecurityAccessGuard({
    actionName: '订单查询',
    getEmail: async (req) => req.query?.email
})

const ticketCreateSecurityGuard = createSecurityAccessGuard({
    actionName: '工单创建',
    getEmail: async (req) => {
        const user = await resolveCurrentUser(req)
        return user?.email || req.user?.email || ''
    },
    requireVerifiedForTicket: true
})

const registerRateLimiter = createSecurityRateLimiter({
    actionName: '注册',
    maxKey: 'securityRegisterLimitMax',
    windowKey: 'securityRegisterLimitWindowMinutes',
    defaultMax: DEFAULT_SETTINGS.securityRegisterLimitMax,
    defaultWindowMinutes: DEFAULT_SETTINGS.securityRegisterLimitWindowMinutes,
    keyPrefix: 'register',
    keyGenerator: (req) => getClientIp(req)
})

const orderQueryRateLimiter = createSecurityRateLimiter({
    actionName: '订单查询',
    maxKey: 'securityOrderQueryLimitMax',
    windowKey: 'securityOrderQueryLimitWindowMinutes',
    defaultMax: DEFAULT_SETTINGS.securityOrderQueryLimitMax,
    defaultWindowMinutes: DEFAULT_SETTINGS.securityOrderQueryLimitWindowMinutes,
    keyPrefix: 'order-query',
    keyGenerator: (req) => getClientIp(req)
})

const ticketCreateRateLimiter = createSecurityRateLimiter({
    actionName: '工单提交',
    maxKey: 'securityTicketCreateLimitMax',
    windowKey: 'securityTicketCreateLimitWindowMinutes',
    defaultMax: DEFAULT_SETTINGS.securityTicketCreateLimitMax,
    defaultWindowMinutes: DEFAULT_SETTINGS.securityTicketCreateLimitWindowMinutes,
    keyPrefix: 'ticket-create',
    keyGenerator: (req) => `${req.user?.id || 'guest'}@${getClientIp(req)}`
})

module.exports = {
    registerSecurityGuard,
    orderQuerySecurityGuard,
    ticketCreateSecurityGuard,
    registerRateLimiter,
    orderQueryRateLimiter,
    ticketCreateRateLimiter
}

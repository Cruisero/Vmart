const prisma = require('../config/database')

// 主站 hostname 列表（这些请求不走租户逻辑）
const MAIN_HOSTS = new Set([
    'localhost',
    '127.0.0.1',
    'vmart.cc',
    'www.vmart.cc',
    'backend',
    'kashop-backend',
])

/**
 * 租户检测中间件
 * 根据请求的 Host 头判断是哪个租户，注入 req.tenantId / req.tenant
 * 主站请求 tenantId = null，直接 next()
 */
async function tenantDetect(req, res, next) {
    // 去掉端口号
    const host = (req.hostname || req.headers.host || '').replace(/:\d+$/, '').toLowerCase()

    // 主站域名或本地开发环境
    if (!host || MAIN_HOSTS.has(host)) {
        req.tenantId = null
        req.tenant = null
        return next()
    }

    try {
        const domainRecord = await prisma.tenantDomain.findUnique({
            where: { domain: host },
            include: { tenant: true }
        })

        if (!domainRecord) {
            // 未知域名，当主站处理
            req.tenantId = null
            req.tenant = null
            return next()
        }

        if (domainRecord.tenant.status !== 'ACTIVE') {
            // 租户存在但未激活
            req.tenantId = null
            req.tenant = null
            return res.status(503).json({
                error: '商城暂未开放，请稍后再试',
                status: domainRecord.tenant.status
            })
        }

        // 注入租户信息到请求
        req.tenantId = domainRecord.tenantId
        req.tenant = domainRecord.tenant
        return next()
    } catch (err) {
        console.error('[tenantDetect] error:', err)
        req.tenantId = null
        req.tenant = null
        next()
    }
}

module.exports = tenantDetect

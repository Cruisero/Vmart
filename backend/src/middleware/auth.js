const jwt = require('jsonwebtoken')

// 验证 Token
const authenticate = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization
        console.log('[authenticate] authHeader:', authHeader ? authHeader.substring(0, 30) + '...' : 'MISSING')

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: '请先登录' })
        }

        const token = authHeader.substring(7)
        const decoded = jwt.verify(token, process.env.JWT_SECRET)

        // 兼容 platform token（payload 里是 mid 而不是 id）
        if (decoded.mid && !decoded.id) {
            decoded.id = decoded.mid
            decoded.role = decoded.isSuperAdmin ? 'SUPER_ADMIN' : 'TENANT_ADMIN'
        }

        req.user = decoded
        next()
    } catch (error) {
        console.log('[authenticate] error:', error.message)
        return res.status(401).json({ error: '登录已过期，请重新登录' })
    }
}

// 顾客认证（仅识别 role === 'CUSTOMER' 的 token，注入 req.customer）
const authenticateCustomer = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: '请先登录' })
        }
        const token = authHeader.substring(7)
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        if (decoded.role !== 'CUSTOMER') {
            return res.status(403).json({ error: '需要顾客身份' })
        }
        req.customer = decoded
        next()
    } catch (error) {
        next(error)
    }
}

// 可选顾客认证（带 token 则解析为 customer，无 token 也放行）
const optionalCustomerAuth = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7)
            const decoded = jwt.verify(token, process.env.JWT_SECRET)
            if (decoded.role === 'CUSTOMER') req.customer = decoded
            else req.user = decoded
        }
        next()
    } catch {
        next()
    }
}

// 可选认证 (有Token则解析,无Token也放行)
const optionalAuth = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7)
            const decoded = jwt.verify(token, process.env.JWT_SECRET)
            req.user = decoded
        }

        next()
    } catch (error) {
        // Token无效也放行
        next()
    }
}

// 管理员权限验证（ADMIN, SUPER_ADMIN 和 TENANT_ADMIN 均可通过）
const isAdmin = async (req, res, next) => {
    try {
        const role = req.user?.role?.toUpperCase()
        if (!req.user || !['ADMIN', 'SUPER_ADMIN', 'TENANT_ADMIN'].includes(role)) {
            return res.status(403).json({ error: '需要管理员权限' })
        }

        // 如果是租户管理员，获取其 tenantId 供后续隔离数据使用
        if (role === 'TENANT_ADMIN') {
            const prisma = require('../config/database')
            const tenant = await prisma.tenant.findUnique({
                where: { userId: req.user.id },
                select: { id: true, status: true }
            })
            if (!tenant || tenant.status !== 'ACTIVE') {
                return res.status(403).json({ error: '租户商城尚未开通或已被暂停，请前往 SaaS 控制台查看状态' })
            }
            req.tenantId = tenant.id
        }

        // 如果是子管理员（ADMIN 角色，绑定到某个租户），使用其 tenantId
        if (role === 'ADMIN') {
            const prisma = require('../config/database')
            const u = await prisma.user.findUnique({
                where: { id: req.user.id },
                select: { tenantId: true, permissions: true }
            })
            
            if (!u?.tenantId) {
                // 彻底阻断无租户绑定的越权孤儿管理员
                return res.status(403).json({ error: '该子管理员账号未绑定所属商城，禁止访问' })
            }

            // 验证 tenant 仍 ACTIVE
            const tenant = await prisma.tenant.findUnique({
                where: { id: u.tenantId },
                select: { id: true, status: true }
            })
            if (!tenant || tenant.status !== 'ACTIVE') {
                return res.status(403).json({ error: '所属商城已被暂停，请联系商城所有者' })
            }
            req.tenantId = tenant.id

            // 解析权限
            try {
                req.permissions = u?.permissions ? JSON.parse(u.permissions) : {}
            } catch {
                req.permissions = {}
            }
        }

        next()
    } catch (error) {
        next(error)
    }
}

// 超级管理员权限验证（仅 SUPER_ADMIN 可通过）
const isSuperAdmin = (req, res, next) => {
    const role = req.user?.role?.toUpperCase()
    if (!req.user || role !== 'SUPER_ADMIN') {
        return res.status(403).json({ error: '需要超级管理员权限' })
    }
    next()
}

// 权限检查中间件工厂：要求子管理员拥有指定权限
// 所有者（TENANT_ADMIN / SUPER_ADMIN）自动通过
const requirePermission = (...permissionKeys) => (req, res, next) => {
    const role = req.user?.role?.toUpperCase()
    // 所有者拥有全部权限
    if (role === 'TENANT_ADMIN' || role === 'SUPER_ADMIN') return next()
    // 子管理员需要检查 permissions
    if (role === 'ADMIN') {
        const perms = req.permissions || {}
        const ok = permissionKeys.every(k => perms[k] === true)
        if (!ok) return res.status(403).json({ error: '权限不足，请联系商城所有者授权' })
        return next()
    }
    return res.status(403).json({ error: '需要管理员权限' })
}

// 代理商权限验证（需已激活的代理商身份）
const isAgent = async (req, res, next) => {
    try {
        const prisma = require('../config/database')
        const agent = await prisma.agent.findUnique({
            where: { userId: req.user?.id }
        })
        if (!agent || agent.status !== 'ACTIVE') {
            return res.status(403).json({ error: '需要已激活的代理商权限' })
        }
        req.agent = agent
        next()
    } catch (error) {
        next(error)
    }
}



module.exports = {
    authenticate, optionalAuth, isAdmin, isSuperAdmin, isAgent,
    authenticateCustomer, optionalCustomerAuth, requirePermission }

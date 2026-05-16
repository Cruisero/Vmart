const jwt = require('jsonwebtoken')

// 验证 Token
const authenticate = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: '请先登录' })
        }

        const token = authHeader.substring(7)
        const decoded = jwt.verify(token, process.env.JWT_SECRET)

        req.user = decoded
        next()
    } catch (error) {
        next(error)
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
    authenticate, optionalAuth, isAdmin, isSuperAdmin, isAgent }

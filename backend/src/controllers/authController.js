// 认证控制器
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const prisma = require('../config/database')

// 生成 JWT Token
const generateToken = (user) => {
    return jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    )
}

// 用户注册
exports.register = async (req, res, next) => {
    try {
        const { email, password, username, agentSlug, storefrontSlug } = req.body

        // 仅 SaaS 商户注册或代理分站注册或店面租户注册场景允许调用此接口
        // 平台已不再有"主站商城"概念，禁止无 context 的普通 USER 注册
        if (!req.body.isSaas && !agentSlug && !storefrontSlug && !req.tenantId) {
            return res.status(400).json({ error: '请通过商户店面或注册商户账号' })
        }

        // 检查邮箱是否已存在
        const existingUser = await prisma.user.findUnique({
            where: { email }
        })

        if (existingUser) {
            return res.status(409).json({ error: '该邮箱已被注册' })
        }

        // 如果从分站注册，查找代理 ID
        let referralAgentId = null
        if (agentSlug) {
            const agent = await prisma.agent.findUnique({
                where: { shopSlug: agentSlug },
                select: { id: true, status: true }
            })
            if (agent && agent.status === 'ACTIVE') {
                referralAgentId = agent.id
            }
        }

        // 自动识别店面租户：
        // 1. 自定义域名场景 — tenantDetect 中间件已通过 Host 头注入 req.tenantId
        // 2. 路径模式（/v/:slug）— 前端传入 storefrontSlug
        let tenantId = req.tenantId || null
        if (!tenantId && storefrontSlug) {
            const t = await prisma.tenant.findUnique({
                where: { shopSlug: storefrontSlug },
                select: { id: true, status: true }
            })
            if (t && t.status === 'ACTIVE') {
                tenantId = t.id
            }
        }

        // 加密密码
        const hashedPassword = await bcrypt.hash(password, 10)

        // 创建用户
        const role = req.body.isSaas ? 'TENANT_ADMIN' : 'USER'
        // SaaS 注册的商户所有者 (TENANT_ADMIN) 为全局所有者实体，其 user.tenantId 应置为 null，防止绑定到当前浏览的他人商户
        const userTenantId = req.body.isSaas ? null : tenantId
        
        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                username: username || email.split('@')[0],
                role,
                emailVerified: true,
                referralAgentId,
                tenantId: userTenantId
            }
        })
        
        // 如果是 SaaS 注册，自动为其开通 Tenant 记录实现极速入驻
        if (req.body.isSaas) {
            const tenant = await prisma.tenant.create({
                data: {
                    userId: user.id,
                    shopName: '数字商城',
                    shopSlug: 'shop-' + Math.random().toString(36).substring(2, 8),
                    status: 'ACTIVE'
                }
            })
            await prisma.tenantSetting.create({
                data: { tenantId: tenant.id }
            })
        }

        // 关联该邮箱下的游客订单到新账号
        try {
            const result = await prisma.order.updateMany({
                where: {
                    email: email,
                    userId: null
                },
                data: {
                    userId: user.id
                }
            })
            if (result.count > 0) {
                console.log(`已将 ${result.count} 个游客订单关联到用户 ${email}`)
            }
        } catch (err) {
            console.error('关联游客订单失败:', err)
        }

        // 生成 Token
        const token = generateToken(user)

        res.status(201).json({
            message: '注册成功',
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                role: user.role,
                emailVerified: user.emailVerified
            },
            token
        })

        // 通知管理员（异步，不阻塞响应）
        const { notifyNewUser } = require('../services/notifyDispatcher')
        notifyNewUser(user).catch(e => console.error('管理员通知失败:', e))
    } catch (error) { res.status(500).json({ error: error.message, stack: error.stack }); }
}

// 用户登录
exports.login = async (req, res, next) => {
    try {
        const { email, password } = req.body

        // 查找用户
        const user = await prisma.user.findUnique({
            where: { email }
        })

        if (!user) {
            return res.status(401).json({ error: '邮箱或密码错误' })
        }

        if (user.status === 'BANNED') {
            return res.status(403).json({ error: '您的账号已被封禁，请联系客服' })
        }

        // 验证密码
        const isValidPassword = await bcrypt.compare(password, user.password)

        if (!isValidPassword) {
            return res.status(401).json({ error: '邮箱或密码错误' })
        }

        // 生成 Token
        const token = generateToken(user)

        res.json({
            message: '登录成功',
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                role: user.role,
                emailVerified: user.emailVerified
            },
            token
        })
    } catch (error) { res.status(500).json({ error: error.message, stack: error.stack }); }
}

// 获取当前用户信息
exports.getCurrentUser = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: '请先登录' })
        }

        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: {
                id: true,
                email: true,
                username: true,
                role: true,
                avatar: true,
                emailVerified: true,
                permissions: true,
                tenantId: true,
                createdAt: true
            }
        })

        if (!user) {
            return res.status(404).json({ error: '用户不存在' })
        }

        // 解析 permissions JSON
        let permissions = null
        if (user.role === 'ADMIN' && user.permissions) {
            try { permissions = JSON.parse(user.permissions) } catch {}
        }

        res.json({
            user: {
                ...user,
                permissions: user.role === 'ADMIN' ? (permissions || {}) : null
            }
        })
    } catch (error) { res.status(500).json({ error: error.message, stack: error.stack }); }
}

// 刷新 Token
exports.refreshToken = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: '请先登录' })
        }

        const user = await prisma.user.findUnique({
            where: { id: req.user.id }
        })

        if (!user) {
            return res.status(404).json({ error: '用户不存在' })
        }

        const token = generateToken(user)

        res.json({ token })
    } catch (error) { res.status(500).json({ error: error.message, stack: error.stack }); }
}

// 退出登录
exports.logout = async (req, res, next) => {
    try {
        // 可以在这里将 Token 加入黑名单 (使用 Redis)
        res.json({ message: '已退出登录' })
    } catch (error) { res.status(500).json({ error: error.message, stack: error.stack }); }
}

// 修改密码
exports.changePassword = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: '请先登录' })
        }

        const { oldPassword, newPassword } = req.body

        if (!oldPassword || !newPassword) {
            return res.status(400).json({ error: '请填写完整信息' })
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ error: '新密码至少6位' })
        }

        const user = await prisma.user.findUnique({
            where: { id: req.user.id }
        })

        if (!user) {
            return res.status(404).json({ error: '用户不存在' })
        }

        // 验证旧密码
        const isMatch = await bcrypt.compare(oldPassword, user.password)
        if (!isMatch) {
            return res.status(400).json({ error: '当前密码错误' })
        }

        // 更新密码
        const hashedPassword = await bcrypt.hash(newPassword, 10)
        await prisma.user.update({
            where: { id: user.id },
            data: { password: hashedPassword }
        })

        res.json({ message: '密码修改成功' })
    } catch (error) { res.status(500).json({ error: error.message, stack: error.stack }); }
}

// 请求重置密码（忘记密码）
exports.forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body

        if (!email) {
            return res.status(400).json({ error: '请输入邮箱地址' })
        }

        // 1. 检测是否处于租户店面环境（店面买家模式）
        let tenantId = req.tenantId
        
        // 尝试从 body 里的 storefrontSlug 或 tenantId 获取
        const slugFromBody = req.body.storefrontSlug
        if (!tenantId && slugFromBody) {
            const t = await prisma.tenant.findUnique({
                where: { shopSlug: slugFromBody },
                select: { id: true }
            })
            if (t) tenantId = t.id
        }

        // 如果仍未获取，尝试解析 Referer
        if (!tenantId && req.headers.referer) {
            const referer = req.headers.referer
            // 匹配 /v/:slug 或 /s/:slug
            const match = referer.match(/\/v\/([^/]+)/) || referer.match(/\/s\/([^/]+)/)
            if (match && match[1]) {
                const slugFromReferer = match[1].split('?')[0]
                const t = await prisma.tenant.findUnique({
                    where: { shopSlug: slugFromReferer },
                    select: { id: true }
                })
                if (t) tenantId = t.id
            }
        }

        let customer = null
        let user = null

        if (tenantId) {
            // 如果是租户模式，优先查询该商铺下的买家顾客 (Customer 表)
            customer = await prisma.customer.findUnique({
                where: {
                    tenantId_email: {
                        tenantId,
                        email
                    }
                }
            })
            
            // fallback: 查找该商铺下的所有者（User 表中对应当前 tenant 的所有者）或子管理员
            if (!customer) {
                user = await prisma.user.findFirst({
                    where: {
                        email,
                        OR: [
                            { tenant: { id: tenantId } }, // 商城所有者
                            { tenantId: tenantId, role: 'ADMIN' } // 子管理员
                        ]
                    }
                })
            }
        } else {
            // 如果没有租户上下文，全局查询平台管理员用户 (User 表)
            user = await prisma.user.findUnique({
                where: { email }
            })
        }

        // 无论是买家还是商户/管理员，如果没找到，就返回模糊的成功消息，以防邮箱枚举攻击
        if (!customer && !user) {
            return res.json({ message: '如果该邮箱已注册，您将收到重置密码邮件' })
        }

        // 解析发送邮件所需要的租户/商户 id (用于商户自定义 SMTP 邮件代发)
        let emailTenantId = tenantId
        if (!emailTenantId && user) {
            // 尝试通过 user.tenantId (子管理员) 或 Tenant.userId = user.id (商城所有者) 查找 tenantId
            if (user.tenantId) {
                emailTenantId = user.tenantId
            } else {
                const ownedTenant = await prisma.tenant.findUnique({
                    where: { userId: user.id },
                    select: { id: true }
                })
                if (ownedTenant) emailTenantId = ownedTenant.id
            }
        }

        // 生成重置 token
        const crypto = require('crypto')
        const resetToken = crypto.randomBytes(32).toString('hex')
        const resetTokenExpiry = new Date(Date.now() + 30 * 60 * 1000) // 30分钟有效

        if (customer) {
            await prisma.customer.update({
                where: { id: customer.id },
                data: { resetToken, resetTokenExpiry }
            })
        } else {
            await prisma.user.update({
                where: { id: user.id },
                data: { resetToken, resetTokenExpiry }
            })
        }

        // 发送重置密码邮件
        const emailService = require('../services/emailService')
        
        // 动态构建更精准的重置密码 baseUrl (多商户隔离子路径与自定义域名自适应适配)
        let resolvedBaseUrl = req.headers.origin || 'http://localhost:3100'
        const hostName = (req.hostname || req.headers.host || '').replace(/:\d+$/, '').toLowerCase()
        const MAIN_HOSTS = new Set(['localhost', '127.0.0.1', 'vmart.cc', 'www.vmart.cc', 'backend', 'kashop-backend'])
        
        if (emailTenantId && MAIN_HOSTS.has(hostName)) {
            const tenant = await prisma.tenant.findUnique({
                where: { id: emailTenantId },
                select: { shopSlug: true }
            })
            if (tenant?.shopSlug) {
                let subPath = `/v/${tenant.shopSlug}`
                if (req.headers.referer && req.headers.referer.includes(`/s/${tenant.shopSlug}`)) {
                    subPath = `/s/${tenant.shopSlug}`
                }
                resolvedBaseUrl = `${resolvedBaseUrl}${subPath}`
            }
        }
        
        // 传递对象并附加精准的 tenantId，以使 emailService 能够正确读取该租户/商户的 SMTP 邮件通道
        const targetUser = customer 
            ? { ...customer, username: customer.username || customer.email, tenantId: emailTenantId } 
            : { ...user, tenantId: emailTenantId }
            
        const result = await emailService.sendPasswordResetEmail(targetUser, resetToken, resolvedBaseUrl)

        if (result.success) {
            res.json({ message: '重置密码邮件已发送，请查收' })
        } else {
            console.error('发送重置邮件失败:', result.error || result.reason)
            
            // 根据租户邮件服务的错误原因，返回精细、对店面用户友好的报错提示
            if (result.reason === 'quota_exceeded') {
                return res.status(400).json({ error: '该商城的邮件服务额度已超限，请联系商铺客服' })
            } else if (result.reason === 'smtp_not_configured') {
                return res.status(400).json({ error: '该商城尚未配置邮件发信通道，请联系商铺客服' })
            } else if (result.reason === 'not_allowed') {
                return res.status(400).json({ error: '该商城的邮件发送功能尚未开通，请联系商铺客服' })
            }
            
            res.status(500).json({ error: '邮件发送失败，请稍后重试' })
        }
    } catch (error) { res.status(500).json({ error: error.message, stack: error.stack }); }
}

// 重置密码
exports.resetPassword = async (req, res, next) => {
    try {
        const { token, password } = req.body

        if (!token || !password) {
            return res.status(400).json({ error: '请填写完整信息' })
        }

        if (password.length < 6) {
            return res.status(400).json({ error: '密码至少6位' })
        }

        // 同时检查 User 表和 Customer 表中的 token
        const user = await prisma.user.findFirst({
            where: {
                resetToken: token,
                resetTokenExpiry: {
                    gt: new Date()
                }
            }
        })

        const customer = await prisma.customer.findFirst({
            where: {
                resetToken: token,
                resetTokenExpiry: {
                    gt: new Date()
                }
            }
        })

        if (!user && !customer) {
            return res.status(400).json({ error: '重置链接无效或已过期' })
        }

        const hashedPassword = await bcrypt.hash(password, 10)

        if (customer) {
            await prisma.customer.update({
                where: { id: customer.id },
                data: {
                    password: hashedPassword,
                    resetToken: null,
                    resetTokenExpiry: null
                }
            })
        } else {
            await prisma.user.update({
                where: { id: user.id },
                data: {
                    password: hashedPassword,
                    resetToken: null,
                    resetTokenExpiry: null
                }
            })
        }

        res.json({ message: '密码重置成功，请使用新密码登录' })
    } catch (error) { res.status(500).json({ error: error.message, stack: error.stack }); }
}

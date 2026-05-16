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
        const { email, password, username, agentSlug } = req.body

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

        // 加密密码
        const hashedPassword = await bcrypt.hash(password, 10)

        // 生成验证 token
        const crypto = require('crypto')
        const verificationToken = crypto.randomBytes(32).toString('hex')

        // 创建用户
        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                username: username || email.split('@')[0],
                role: 'USER',
                emailVerified: false,
                verificationToken,
                referralAgentId
            }
        })

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

        // 发送验证邮件
        const emailService = require('../services/emailService')
        const baseUrl = req.headers.origin || 'http://localhost:3000'
        emailService.sendVerificationEmail(user, verificationToken, baseUrl)
            .then(result => {
                if (result.success) {
                    console.log(`验证邮件已发送至 ${email}`)
                } else {
                    console.log(`验证邮件发送失败: ${result.error || result.reason}`)
                }
            })

        // 生成 Token
        const token = generateToken(user)

        res.status(201).json({
            message: '注册成功，请查收验证邮件',
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
        const { notifyNewUser } = require('../services/adminNotifyService')
        notifyNewUser(user).catch(e => console.error('管理员通知失败:', e))
    } catch (error) {
        next(error)
    }
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
    } catch (error) {
        next(error)
    }
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
                createdAt: true
            }
        })

        if (!user) {
            return res.status(404).json({ error: '用户不存在' })
        }

        res.json({ user })
    } catch (error) {
        next(error)
    }
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
    } catch (error) {
        next(error)
    }
}

// 退出登录
exports.logout = async (req, res, next) => {
    try {
        // 可以在这里将 Token 加入黑名单 (使用 Redis)
        res.json({ message: '已退出登录' })
    } catch (error) {
        next(error)
    }
}

// 验证邮箱
exports.verifyEmail = async (req, res, next) => {
    try {
        const { token } = req.query

        if (!token) {
            return res.status(400).json({ error: '验证链接无效' })
        }

        const user = await prisma.user.findFirst({
            where: { verificationToken: token }
        })

        if (!user) {
            return res.status(400).json({ error: '验证链接无效或已过期' })
        }

        if (user.emailVerified) {
            return res.json({ message: '邮箱已验证，无需重复操作' })
        }

        // 更新用户验证状态
        await prisma.user.update({
            where: { id: user.id },
            data: {
                emailVerified: true,
                verificationToken: null
            }
        })

        res.json({ message: '邮箱验证成功！' })
    } catch (error) {
        next(error)
    }
}

// 重发验证邮件
exports.resendVerification = async (req, res, next) => {
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

        if (user.emailVerified) {
            return res.json({ message: '邮箱已验证，无需重复发送' })
        }

        // 生成新的验证 token
        const crypto = require('crypto')
        const verificationToken = crypto.randomBytes(32).toString('hex')

        await prisma.user.update({
            where: { id: user.id },
            data: { verificationToken }
        })

        // 发送验证邮件
        const emailService = require('../services/emailService')
        const baseUrl = req.headers.origin || 'http://localhost:3000'
        const result = await emailService.sendVerificationEmail(user, verificationToken, baseUrl)

        if (result.success) {
            res.json({ message: '验证邮件已发送，请查收' })
        } else {
            res.status(500).json({ error: '邮件发送失败，请稍后重试' })
        }
    } catch (error) {
        next(error)
    }
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
    } catch (error) {
        next(error)
    }
}

// 请求重置密码（忘记密码）
exports.forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body

        if (!email) {
            return res.status(400).json({ error: '请输入邮箱地址' })
        }

        const user = await prisma.user.findUnique({
            where: { email }
        })

        // 即使用户不存在也返回成功，防止邮箱枚举攻击
        if (!user) {
            return res.json({ message: '如果该邮箱已注册，您将收到重置密码邮件' })
        }

        // 生成重置 token
        const crypto = require('crypto')
        const resetToken = crypto.randomBytes(32).toString('hex')
        const resetTokenExpiry = new Date(Date.now() + 30 * 60 * 1000) // 30分钟有效

        await prisma.user.update({
            where: { id: user.id },
            data: { resetToken, resetTokenExpiry }
        })

        // 发送重置密码邮件
        const emailService = require('../services/emailService')
        const baseUrl = req.headers.origin || 'https://haodongxi.shop'
        const result = await emailService.sendPasswordResetEmail(user, resetToken, baseUrl)

        if (result.success) {
            res.json({ message: '重置密码邮件已发送，请查收' })
        } else {
            console.error('发送重置邮件失败:', result.error)
            res.status(500).json({ error: '邮件发送失败，请稍后重试' })
        }
    } catch (error) {
        next(error)
    }
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

        const user = await prisma.user.findFirst({
            where: {
                resetToken: token,
                resetTokenExpiry: {
                    gt: new Date()
                }
            }
        })

        if (!user) {
            return res.status(400).json({ error: '重置链接无效或已过期' })
        }

        // 更新密码并清除 token
        const hashedPassword = await bcrypt.hash(password, 10)
        await prisma.user.update({
            where: { id: user.id },
            data: {
                password: hashedPassword,
                resetToken: null,
                resetTokenExpiry: null
            }
        })

        res.json({ message: '密码重置成功，请使用新密码登录' })
    } catch (error) {
        next(error)
    }
}

/**
 * 店面顾客控制器（每个 tenant 独立维护，类似 Shopify Customer）
 * 同一邮箱在不同 tenant 下可以独立注册
 */
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const prisma = require('../config/database')
const logger = require('../utils/logger')

// ─── 解析当前请求所属的 tenant ─────────────────
async function resolveTenantId(req) {
    // 1. 自定义域名场景：tenantDetect 中间件已注入
    if (req.tenantId) return req.tenantId
    // 2. 路径模式：body 或 query 里传 storefrontSlug
    const slug = req.body?.storefrontSlug || req.query?.storefrontSlug
    if (slug) {
        const t = await prisma.tenant.findUnique({
            where: { shopSlug: slug },
            select: { id: true, status: true }
        })
        if (t && t.status === 'ACTIVE') return t.id
    }
    return null
}

function generateCustomerToken(customer) {
    return jwt.sign(
        { id: customer.id, email: customer.email, role: 'CUSTOMER', tenantId: customer.tenantId },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    )
}

// ─── 注册 ─────────────────────────────────
exports.register = async (req, res, next) => {
    try {
        const { email, password, username, otpCode } = req.body
        if (!email || !password) {
            return res.status(400).json({ error: '邮箱和密码必填' })
        }
        if (password.length < 6) {
            return res.status(400).json({ error: '密码至少 6 位' })
        }

        const tenantId = await resolveTenantId(req)
        if (!tenantId) {
            return res.status(400).json({ error: '无法识别商城信息' })
        }

        // 校验 OTP（如平台开关开启）
        const sw = await prisma.platformSetting.findUnique({ where: { key: 'customer_register_otp' } })
        if (sw?.value === 'true') {
            if (!otpCode) return res.status(400).json({ error: '请输入邮箱验证码' })
            const otpService = require('../services/otpService')
            const r = await otpService.verifyOtp({ email, code: otpCode, scope: 'customer_register', tenantId })
            if (!r.ok) return res.status(400).json({ error: r.error })
        }

        // 检查 (tenantId, email) 是否已存在
        const existing = await prisma.customer.findUnique({
            where: { tenantId_email: { tenantId, email } }
        })
        if (existing) {
            return res.status(409).json({ error: '该邮箱已在本商城注册过' })
        }

        const hashedPassword = await bcrypt.hash(password, 10)

        const customer = await prisma.customer.create({
            data: {
                tenantId,
                email,
                password: hashedPassword,
                username: username || email.split('@')[0],
                emailVerified: true
            }
        })

        // 关联该邮箱+tenant 下的游客订单
        try {
            await prisma.order.updateMany({
                where: { email, tenantId, customerId: null, userId: null },
                data: { customerId: customer.id }
            })
        } catch (e) {
            logger.warn('关联游客订单失败:', e.message)
        }

        const token = generateCustomerToken(customer)
        res.status(201).json({
            message: '注册成功',
            token,
            user: {
                id: customer.id,
                email: customer.email,
                username: customer.username,
                role: 'CUSTOMER',
                emailVerified: customer.emailVerified,
                tenantId: customer.tenantId
            }
        })
    } catch (e) {
        next(e)
    }
}

// ─── 登录 ─────────────────────────────────
exports.login = async (req, res, next) => {
    try {
        const { email, password } = req.body
        if (!email || !password) {
            return res.status(400).json({ error: '邮箱和密码必填' })
        }

        const tenantId = await resolveTenantId(req)
        if (!tenantId) {
            return res.status(400).json({ error: '无法识别商城信息' })
        }

        // 1. 优先尝试匹配 User 表里属于当前 tenant 的所有者 / 子管理员
        const adminUser = await prisma.user.findFirst({
            where: {
                email,
                OR: [
                    { tenant: { id: tenantId } }, // 商城所有者（通过 Tenant.userId 反向）
                    { tenantId: tenantId, role: 'ADMIN' } // 子管理员
                ]
            }
        })
        if (adminUser) {
            if (adminUser.status === 'BANNED') {
                return res.status(403).json({ error: '您的账号已被封禁，请联系客服' })
            }
            const valid = await bcrypt.compare(password, adminUser.password)
            if (!valid) return res.status(401).json({ error: '邮箱或密码错误' })

            // 用 User token（普通 auth 流程）
            const jwt = require('jsonwebtoken')
            const token = jwt.sign(
                { id: adminUser.id, email: adminUser.email, role: adminUser.role },
                process.env.JWT_SECRET,
                { expiresIn: '7d' }
            )
            // 解析 permissions JSON
            let permissions = null
            if (adminUser.role === 'ADMIN' && adminUser.permissions) {
                try { permissions = JSON.parse(adminUser.permissions) } catch {}
            }

            return res.json({
                message: '登录成功',
                token,
                user: {
                    id: adminUser.id,
                    email: adminUser.email,
                    username: adminUser.username,
                    role: adminUser.role,
                    emailVerified: adminUser.emailVerified,
                    tenantId,
                    permissions: adminUser.role === 'ADMIN' ? (permissions || {}) : null
                }
            })
        }

        // 2. 其次尝试按 customer 登录
        const customer = await prisma.customer.findUnique({
            where: { tenantId_email: { tenantId, email } }
        })
        if (customer) {
            if (customer.status === 'BANNED') {
                return res.status(403).json({ error: '您的账号已被封禁，请联系客服' })
            }
            const valid = await bcrypt.compare(password, customer.password)
            if (!valid) return res.status(401).json({ error: '邮箱或密码错误' })

            const token = generateCustomerToken(customer)
            return res.json({
                message: '登录成功',
                token,
                user: {
                    id: customer.id,
                    email: customer.email,
                    username: customer.username,
                    role: 'CUSTOMER',
                    emailVerified: customer.emailVerified,
                    tenantId: customer.tenantId
                }
            })
        }

        return res.status(401).json({ error: '邮箱或密码错误' })
    } catch (e) {
        next(e)
    }
}

// ─── 获取当前顾客信息 ─────────────────────────
exports.getMe = async (req, res, next) => {
    try {
        if (!req.customer) return res.status(401).json({ error: '未登录' })
        const customer = await prisma.customer.findUnique({
            where: { id: req.customer.id },
            select: {
                id: true, email: true, username: true, avatar: true,
                emailVerified: true, tenantId: true, createdAt: true
            }
        })
        res.json({ user: { ...customer, role: 'CUSTOMER' } })
    } catch (e) {
        next(e)
    }
}

// ─── 顾客自己的订单列表 ──────────────────────
exports.getMyOrders = async (req, res, next) => {
    try {
        if (!req.customer) return res.status(401).json({ error: '未登录' })
        const orders = await prisma.order.findMany({
            where: { customerId: req.customer.id },
            include: {
                product: { select: { id: true, name: true, image: true } },
                cards: { select: { id: true, content: true } }
            },
            orderBy: { createdAt: 'desc' }
        })
        res.json({
            orders: orders.map(o => ({
                id: o.id,
                orderNo: o.orderNo,
                productName: o.productName,
                productImage: o.product?.image,
                quantity: o.quantity,
                totalAmount: parseFloat(o.totalAmount),
                status: o.status.toLowerCase(),
                paymentMethod: o.paymentMethod,
                createdAt: o.createdAt,
                paidAt: o.paidAt,
                cards: o.status === 'COMPLETED' ? o.cards : []
            }))
        })
    } catch (e) {
        next(e)
    }
}

// ─── 修改密码 ───────────────────────────────
exports.changePassword = async (req, res, next) => {
    try {
        if (!req.customer) return res.status(401).json({ error: '未登录' })
        // 兼容两种字段命名：currentPassword/oldPassword
        const currentPassword = req.body.currentPassword || req.body.oldPassword
        const { newPassword } = req.body
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: '请填写完整' })
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ error: '新密码至少 6 位' })
        }

        const customer = await prisma.customer.findUnique({ where: { id: req.customer.id } })
        const valid = await bcrypt.compare(currentPassword, customer.password)
        if (!valid) return res.status(400).json({ error: '当前密码错误' })

        const hashed = await bcrypt.hash(newPassword, 10)
        await prisma.customer.update({
            where: { id: customer.id },
            data: { password: hashed }
        })
        res.json({ message: '密码已更新' })
    } catch (e) {
        next(e)
    }
}

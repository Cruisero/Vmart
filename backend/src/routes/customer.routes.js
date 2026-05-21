const express = require('express')
const router = express.Router()
const customerController = require('../controllers/customerController')
const { authenticateCustomer } = require('../middleware/auth')

// 注册 / 登录
router.post('/register', customerController.register)
router.post('/login', customerController.login)

// 邮箱 OTP（注册场景）
router.post('/otp/send', async (req, res) => {
    try {
        const prisma = require('../config/database')
        const otpService = require('../services/otpService')
        const { email, slug } = req.body || {}
        if (!email) return res.status(400).json({ error: '邮箱不能为空' })
        const sw = await prisma.platformSetting.findUnique({ where: { key: 'customer_register_otp' } })
        if (sw?.value !== 'true') {
            return res.status(400).json({ error: '该商城未启用注册验证码' })
        }
        let tenantId = null
        if (slug) {
            const t = await prisma.tenant.findUnique({ where: { shopSlug: slug }, select: { id: true } })
            tenantId = t?.id || null
        }
        if (!tenantId) return res.status(400).json({ error: '无法识别商城' })
        const result = await otpService.sendOtp({ email, scope: 'customer_register', tenantId })
        if (!result.ok) return res.status(400).json({ error: result.error })
        res.json({ message: '验证码已发送，请查收' })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})

// 已登录顾客
router.get('/me', authenticateCustomer, customerController.getMe)
router.get('/orders', authenticateCustomer, customerController.getMyOrders)
router.put('/password', authenticateCustomer, customerController.changePassword)
router.post('/password', authenticateCustomer, customerController.changePassword)

module.exports = router

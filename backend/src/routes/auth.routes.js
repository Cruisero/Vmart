const express = require('express')
const router = express.Router()
const authController = require('../controllers/authController')
const { validateBody } = require('../middleware/validation')
const { loginSchema, registerSchema } = require('../validators/auth')
const { authenticate } = require('../middleware/auth')
const {
    registerSecurityGuard,
    registerRateLimiter
} = require('../middleware/security')

// 用户注册
router.post('/register', registerRateLimiter, registerSecurityGuard, validateBody(registerSchema), authController.register)

// 用户登录
router.post('/login', validateBody(loginSchema), authController.login)

// 获取当前用户信息 (需要登录)
router.get('/me', authenticate, authController.getCurrentUser)

// 刷新 Token
router.post('/refresh', authController.refreshToken)

// 退出登录
router.post('/logout', authController.logout)

// 验证邮箱
router.get('/verify-email', authController.verifyEmail)

// 重发验证邮件 (需要登录)
router.post('/resend-verification', authenticate, authController.resendVerification)

// 修改密码 (需要登录)
router.post('/change-password', authenticate, authController.changePassword)

// 忘记密码 - 请求重置链接
router.post('/forgot-password', authController.forgotPassword)

// 重置密码
router.post('/reset-password', authController.resetPassword)

module.exports = router

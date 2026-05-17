const express = require('express')
const router = express.Router()
const customerController = require('../controllers/customerController')
const { authenticateCustomer } = require('../middleware/auth')

// 注册 / 登录
router.post('/register', customerController.register)
router.post('/login', customerController.login)

// 已登录顾客
router.get('/me', authenticateCustomer, customerController.getMe)
router.get('/orders', authenticateCustomer, customerController.getMyOrders)
router.put('/password', authenticateCustomer, customerController.changePassword)

module.exports = router

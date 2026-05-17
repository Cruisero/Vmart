const express = require('express')
const router = express.Router()
const orderController = require('../controllers/orderController')
const { validateBody, validateQuery } = require('../middleware/validation')
const { createOrderSchema, queryOrderSchema } = require('../validators/order')
const { authenticate, optionalAuth, optionalCustomerAuth } = require('../middleware/auth')
const {
    orderQuerySecurityGuard,
    orderQueryRateLimiter
} = require('../middleware/security')

// 创建订单（识别 customer token / user token / 游客）
router.post('/', optionalCustomerAuth, validateBody(createOrderSchema), orderController.createOrder)

// 获取当前用户的订单列表 (需要登录，支持顾客 token 或 user token)
router.get('/my-orders', optionalCustomerAuth, orderController.getUserOrders)

// 通过订单号或邮箱查询订单
router.get('/query', orderQueryRateLimiter, orderQuerySecurityGuard, validateQuery(queryOrderSchema), orderController.queryOrder)

// 获取订单详情
router.get('/:orderNo', orderController.getOrderByNo)

// 获取订单卡密 (支付成功后)
router.get('/:orderNo/cards', orderController.getOrderCards)

// 取消订单
router.post('/:orderNo/cancel', orderController.cancelOrder)

module.exports = router

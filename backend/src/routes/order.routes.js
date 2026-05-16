const express = require('express')
const router = express.Router()
const orderController = require('../controllers/orderController')
const { validateBody, validateQuery } = require('../middleware/validation')
const { createOrderSchema, queryOrderSchema } = require('../validators/order')
const { authenticate, optionalAuth } = require('../middleware/auth')
const {
    orderQuerySecurityGuard,
    orderQueryRateLimiter
} = require('../middleware/security')

// 创建订单 (可选认证 - 登录用户会关联userId)
router.post('/', optionalAuth, validateBody(createOrderSchema), orderController.createOrder)

// 获取当前用户的订单列表 (需要登录)
router.get('/my-orders', authenticate, orderController.getUserOrders)

// 通过订单号或邮箱查询订单
router.get('/query', orderQueryRateLimiter, orderQuerySecurityGuard, validateQuery(queryOrderSchema), orderController.queryOrder)

// 获取订单详情
router.get('/:orderNo', orderController.getOrderByNo)

// 获取订单卡密 (支付成功后)
router.get('/:orderNo/cards', orderController.getOrderCards)

// 取消订单
router.post('/:orderNo/cancel', orderController.cancelOrder)

module.exports = router

const express = require('express')
const router = express.Router()
const paymentController = require('../controllers/paymentController')

// 获取支付方式列表
router.get('/methods', paymentController.getPaymentMethods)

// 创建支付订单
router.post('/create', paymentController.createPayment)

// 支付回调 - 支付宝
router.post('/callback/alipay', paymentController.alipayCallback)
router.post('/alipay/notify', paymentController.alipayCallback) // 别名路由

// 支付回调 - 微信
router.post('/callback/wechat', paymentController.wechatCallback)

// 查询支付状态
router.get('/status/:orderNo', paymentController.getPaymentStatus)

// 模拟支付页面 (仅开发/测试环境)
if (process.env.NODE_ENV !== 'production') {
    router.get('/mock', paymentController.mockPayment)
    router.post('/mock/confirm', paymentController.confirmMockPayment)
}

module.exports = router

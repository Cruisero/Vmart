const express = require('express')
const router = express.Router()
const tenantController = require('../controllers/tenantController')
const { authenticate } = require('../middleware/auth')

// 所有租户路由需要登录
router.use(authenticate)

// 租户基本信息
router.get('/me', tenantController.getMe)
router.post('/setup', tenantController.setup)

// 域名管理
router.post('/domain', tenantController.addDomain)
router.post('/domain/verify', tenantController.verifyDns)

// 提交审核
router.post('/submit', tenantController.submitReview)

// 设置
router.get('/settings', tenantController.getSettings)
router.put('/settings', tenantController.updateSettings)

// 商品管理
router.get('/products', tenantController.getProducts)
router.post('/products', tenantController.createProduct)
router.put('/products/:id', tenantController.updateProduct)
router.delete('/products/:id', tenantController.deleteProduct)
router.post('/products/:id/cards', tenantController.uploadCards)

// 订单
router.get('/orders', tenantController.getOrders)

// 统计
router.get('/stats', tenantController.getStats)

module.exports = router

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

module.exports = router

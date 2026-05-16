const express = require('express')
const router = express.Router()
const cardController = require('../controllers/cardController')
const { authenticate, isAdmin } = require('../middleware/auth')

// 以下路由需要管理员权限
router.use(authenticate, isAdmin)

// 获取卡密列表
router.get('/', cardController.getCards)

// 批量导入卡密
router.post('/import', cardController.importCards)

// 删除卡密
router.delete('/:id', cardController.deleteCard)

module.exports = router

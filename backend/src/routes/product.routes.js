const express = require('express')
const router = express.Router()
const productController = require('../controllers/productController')

// 获取商品列表
router.get('/', productController.getProducts)

// 获取热门商品
router.get('/hot', productController.getHotProducts)

// 获取商品详情
router.get('/:id', productController.getProductById)

module.exports = router

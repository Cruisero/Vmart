const express = require('express')
const router = express.Router()
const storefront = require('../controllers/storefront.controller')

// 分站公开 API（无需认证）
router.get('/:slug', storefront.getStorefront)
router.get('/:slug/products', storefront.getStorefrontProducts)
router.get('/:slug/products/:productId', storefront.getStorefrontProduct)

module.exports = router

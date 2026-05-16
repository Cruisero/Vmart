const express = require('express')
const router = express.Router()
const { upload, uploadImages, deleteImage, brandingUpload, uploadBranding } = require('../controllers/upload.controller')

// 上传图片 (支持多张)
router.post('/', upload.array('images', 10), uploadImages)

// 品牌文件上传（Logo / Favicon）
router.post('/branding', brandingUpload.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'favicon', maxCount: 1 }
]), uploadBranding)

// 删除图片
router.delete('/:fileName', deleteImage)

module.exports = router

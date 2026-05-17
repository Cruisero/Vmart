const multer = require('multer')
const path = require('path')
const fs = require('fs')
const crypto = require('crypto')

// 确保上传目录存在
const uploadDir = 'uploads/products'
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true })
}

// 生成唯一文件名
const generateFileName = (originalName) => {
    const timestamp = Date.now()
    const random = crypto.randomBytes(8).toString('hex')
    const ext = path.extname(originalName).toLowerCase()
    return `${timestamp}_${random}${ext}`
}

// Multer 配置 - 磁盘存储
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir)
    },
    filename: (req, file, cb) => {
        cb(null, generateFileName(file.originalname))
    }
})

const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/x-icon', 'image/vnd.microsoft.icon', 'image/svg+xml']
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true)
    } else {
        cb(new Error('不支持的图片格式，仅支持 JPG、PNG、GIF、WebP、SVG、ICO'), false)
    }
}

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
        files: 10 // 最多10张图片
    }
})

// 上传单张/多张图片
const uploadImages = async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: '请选择要上传的图片' })
        }

        const uploadResults = []

        for (const file of req.files) {
            const url = `/uploads/products/${file.filename}`
            uploadResults.push({
                fileName: file.filename,
                originalName: file.originalname,
                size: file.size,
                urls: {
                    original: url,
                    large: url,
                    medium: url
                }
            })
        }

        res.json({
            success: true,
            message: `成功上传 ${uploadResults.length} 张图片`,
            images: uploadResults
        })
    } catch (error) {
        console.error('图片上传失败:', error)
        res.status(500).json({ error: '图片上传失败: ' + error.message })
    }
}

// 删除图片
const deleteImage = async (req, res) => {
    try {
        const { fileName } = req.params
        const filePath = path.join(uploadDir, fileName)

        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath)
        }

        res.json({ success: true, message: '图片已删除' })
    } catch (error) {
        console.error('图片删除失败:', error)
        res.status(500).json({ error: '图片删除失败' })
    }
}

// ---------- 品牌文件上传（Logo / Favicon）----------
const brandingDir = 'uploads/branding'
if (!fs.existsSync(brandingDir)) {
    fs.mkdirSync(brandingDir, { recursive: true })
}

const brandingStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, brandingDir),
    filename: (req, file, cb) => {
        // field name 决定文件名：logo / favicon
        const ext = path.extname(file.originalname).toLowerCase() || '.png'
        cb(null, `${file.fieldname}${ext}`)
    }
})

const brandingUpload = multer({
    storage: brandingStorage,
    fileFilter,
    limits: { fileSize: 2 * 1024 * 1024 } // 2MB
})

const uploadBranding = async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: '请选择要上传的文件' })
        }
        const result = {}
        for (const file of req.files) {
            result[file.fieldname] = `/uploads/branding/${file.filename}`
        }
        res.json({ success: true, urls: result })
    } catch (error) {
        console.error('品牌文件上传失败:', error)
        res.status(500).json({ error: '上传失败: ' + error.message })
    }
}

module.exports = {
    upload,
    uploadImages,
    deleteImage,
    brandingUpload,
    uploadBranding
}

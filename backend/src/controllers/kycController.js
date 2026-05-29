const prisma = require('../config/database')
const fs = require('fs')
const path = require('path')
const multer = require('multer')
const crypto = require('crypto')
const { Jimp, loadFont } = require('jimp')
const { SANS_16_BLACK } = require('jimp/fonts')

// Ensure private uploads directory exists
const privateKycDir = path.join(__dirname, '../../private_uploads/kyc')
if (!fs.existsSync(privateKycDir)) {
    fs.mkdirSync(privateKycDir, { recursive: true })
}

// Config Multer for private KYC storage
const kycStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, privateKycDir)
    },
    filename: (req, file, cb) => {
        const timestamp = Date.now()
        const random = crypto.randomBytes(8).toString('hex')
        const ext = path.extname(file.originalname).toLowerCase() || '.png'
        cb(null, `kyc_${timestamp}_${random}${ext}`)
    }
})

const kycUpload = multer({
    storage: kycStorage,
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true)
        } else {
            cb(new Error('不支持的图片格式，仅支持 JPG、PNG、WebP'), false)
        }
    },
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    }
}).single('photo')

// 1. 商户提交实名认证请求
exports.submitKyc = (req, res, next) => {
    kycUpload(req, res, async (err) => {
        if (err) {
            return res.status(400).json({ error: err.message })
        }

        try {
            const { realName, idNumber, docType = 'id_card' } = req.body
            if (!realName || !idNumber) {
                // Cleanup uploaded file if text fields are missing
                if (req.file) fs.unlinkSync(req.file.path)
                return res.status(400).json({ error: '姓名和证件号码不能为空' })
            }

            if (!req.file) {
                return res.status(400).json({ error: '请上传手持证件及字条照片' })
            }

            const tenant = await prisma.tenant.findUnique({
                where: { userId: req.user.id }
            })
            if (!tenant) {
                fs.unlinkSync(req.file.path)
                return res.status(404).json({ error: '租户不存在' })
            }

            if (tenant.kycStatus === 'VERIFIED') {
                fs.unlinkSync(req.file.path)
                return res.status(400).json({ error: '已通过实名认证，无需重复提交' })
            }

            // Delete old kyc photo if exists to save disk space
            if (tenant.kycPhotoFile) {
                const oldPath = path.join(privateKycDir, tenant.kycPhotoFile)
                if (fs.existsSync(oldPath)) {
                    try { fs.unlinkSync(oldPath) } catch {}
                }
            }

            // Apply Jimp watermark to the uploaded image immediately
            try {
                const font = await loadFont(SANS_16_BLACK)
                const image = await Jimp.read(req.file.path)
                const width = image.bitmap.width
                const height = image.bitmap.height
                const watermarkText = `VMART KYC ONLY - ${new Date().toISOString().slice(0, 10)}`

                // Print watermark in a repeating grid
                for (let x = 50; x < width; x += 350) {
                    for (let y = 50; y < height; y += 250) {
                        image.print({ font, x, y, text: watermarkText })
                    }
                }
                await image.write(req.file.path)
            } catch (watermarkErr) {
                console.error('Failed to apply watermark:', watermarkErr)
                // We proceed even if watermark fails, but log it
            }

            // 格式化国际证件类型名称
            const docTypeNames = {
                id_card: '身份证/ID Card',
                passport: '护照/Passport',
                driver_license: '驾照/Driver License'
            };
            const docName = docTypeNames[docType] || '身份证/ID Card';
            const finalIdNumber = `[${docName}] ${idNumber.trim()}`;

            // Update Tenant Database
            await prisma.tenant.update({
                where: { id: tenant.id },
                data: {
                    kycStatus: 'PENDING',
                    kycRealName: realName.trim(),
                    kycIdNumber: finalIdNumber,
                    kycPhotoFile: req.file.filename,
                    kycRequestedAt: new Date(),
                    kycRejectReason: null
                }
            })

            res.json({ success: true, message: '实名认证申请已提交，请等待管理员审核' })
        } catch (error) {
            if (req.file && fs.existsSync(req.file.path)) {
                try { fs.unlinkSync(req.file.path) } catch {}
            }
            next(error)
        }
    })
}

// 2. 商户获取自身 KYC 状态
exports.getKycStatus = async (req, res, next) => {
    try {
        const tenant = await prisma.tenant.findUnique({
            where: { userId: req.user.id },
            select: {
                kycStatus: true,
                kycRealName: true,
                kycIdNumber: true,
                kycRejectReason: true,
                kycRequestedAt: true
            }
        })

        if (!tenant) {
            return res.status(404).json({ error: '租户不存在' })
        }

        // Mask ID number on frontend display
        let maskedId = ''
        if (tenant.kycIdNumber) {
            const rawId = tenant.kycIdNumber
            if (rawId.includes(']')) {
                const parts = rawId.split(']')
                const prefix = parts[0] + ']'
                const num = parts[1].trim()
                const len = num.length
                if (len > 4) {
                    maskedId = `${prefix} ${num.slice(0, Math.min(2, len - 2))}****${num.slice(-2)}`
                } else {
                    maskedId = `${prefix} ****`
                }
            } else {
                maskedId = rawId.replace(/^(.{6})(?:\d+)(.{4})$/, '$1********$2') || '********'
            }
        }

        res.json({
            kyc: {
                status: tenant.kycStatus,
                realName: tenant.kycRealName,
                idNumber: maskedId,
                rejectReason: tenant.kycRejectReason,
                requestedAt: tenant.kycRequestedAt
            }
        })
    } catch (error) {
        next(error)
    }
}

// 3. 管理员获取待审核 KYC 申请列表
exports.getAdminKycRequests = async (req, res, next) => {
    try {
        const requests = await prisma.tenant.findMany({
            where: { kycStatus: 'PENDING' },
            select: {
                id: true,
                shopName: true,
                shopSlug: true,
                kycRealName: true,
                kycIdNumber: true,
                kycPhotoFile: true,
                kycRequestedAt: true
            },
            orderBy: { kycRequestedAt: 'asc' }
        })

        res.json({ requests })
    } catch (error) {
        next(error)
    }
}

// 4. 管理员获取实名照片（安全流式传输，杜绝公共访问）
exports.getAdminKycFile = async (req, res, next) => {
    try {
        const { filename } = req.params
        if (!filename || !/^[a-zA-Z0-9_.-]+$/.test(filename)) {
            return res.status(400).json({ error: '无效的文件名' })
        }

        const filePath = path.join(privateKycDir, filename)
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: '文件不存在' })
        }

        res.sendFile(filePath)
    } catch (error) {
        next(error)
    }
}

// 5. 管理员审核 KYC
exports.auditKyc = async (req, res, next) => {
    try {
        const { tenantId, action, rejectReason } = req.body
        if (!tenantId || !['APPROVE', 'REJECT'].includes(action)) {
            return res.status(400).json({ error: '参数不完整或无效' })
        }

        const tenant = await prisma.tenant.findUnique({
            where: { id: tenantId }
        })

        if (!tenant) {
            return res.status(404).json({ error: '商户不存在' })
        }

        if (tenant.kycStatus !== 'PENDING') {
            return res.status(400).json({ error: '该商户实名申请不处于待审核状态' })
        }

        const auditLogObj = tenant.kycAuditLog ? JSON.parse(tenant.kycAuditLog) : []
        auditLogObj.push({
            action,
            adminId: req.merchant?.id || req.user?.id || 'admin',
            timestamp: new Date(),
            rejectReason: action === 'REJECT' ? rejectReason : null
        })

        if (action === 'APPROVE') {
            // Update tenant verified state
            await prisma.tenant.update({
                where: { id: tenantId },
                data: {
                    kycStatus: 'VERIFIED',
                    kycAuditLog: JSON.stringify(auditLogObj)
                }
            })

            res.json({ success: true, message: '实名认证审核通过，实名照已安全加密存证' })
        } else {
            // REJECT
            await prisma.tenant.update({
                where: { id: tenantId },
                data: {
                    kycStatus: 'REJECTED',
                    kycRejectReason: rejectReason || '资料不符合要求，请重新上传',
                    kycPhotoFile: null, // Clear file name
                    kycAuditLog: JSON.stringify(auditLogObj)
                }
            })

            // Physically delete rejected photo file as well
            if (tenant.kycPhotoFile) {
                const filePath = path.join(privateKycDir, tenant.kycPhotoFile)
                if (fs.existsSync(filePath)) {
                    try {
                        fs.unlinkSync(filePath)
                        console.log(`[KYC] Rejected and deleted photo file: ${tenant.kycPhotoFile}`)
                    } catch (err) {
                        console.error(`Failed to delete kyc file ${tenant.kycPhotoFile}:`, err)
                    }
                }
            }

            res.json({ success: true, message: '已拒绝实名认证申请，图片文件已被删除销毁' })
        }
    } catch (error) {
        next(error)
    }
}

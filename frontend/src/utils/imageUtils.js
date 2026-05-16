/**
 * 图片处理工具
 * - 压缩图片
 * - 生成缩略图
 * - 上传到服务器
 */

const API_BASE = '/api'

/**
 * 压缩图片
 * @param {File} file - 原始文件
 * @param {number} maxWidth - 最大宽度
 * @param {number} quality - 压缩质量 (0-1)
 * @returns {Promise<Blob>}
 */
export const compressImage = (file, maxWidth = 1200, quality = 0.8) => {
    return new Promise((resolve, reject) => {
        const img = new Image()
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')

        img.onload = () => {
            let { width, height } = img

            // 如果图片小于最大宽度，不需要压缩尺寸
            if (width > maxWidth) {
                height = (height * maxWidth) / width
                width = maxWidth
            }

            canvas.width = width
            canvas.height = height
            ctx.drawImage(img, 0, 0, width, height)

            canvas.toBlob(
                (blob) => {
                    if (blob) {
                        resolve(blob)
                    } else {
                        reject(new Error('压缩失败'))
                    }
                },
                'image/webp',
                quality
            )
        }

        img.onerror = () => reject(new Error('图片加载失败'))
        img.src = URL.createObjectURL(file)
    })
}

/**
 * 生成缩略图预览
 * @param {File} file - 原始文件
 * @param {number} size - 缩略图尺寸
 * @returns {Promise<string>} Base64 预览图
 */
export const generateThumbnail = (file, size = 200) => {
    return new Promise((resolve, reject) => {
        const img = new Image()
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')

        img.onload = () => {
            let { width, height } = img

            // 等比缩放
            if (width > height) {
                if (width > size) {
                    height = (height * size) / width
                    width = size
                }
            } else {
                if (height > size) {
                    width = (width * size) / height
                    height = size
                }
            }

            canvas.width = width
            canvas.height = height
            ctx.drawImage(img, 0, 0, width, height)

            resolve(canvas.toDataURL('image/webp', 0.7))
        }

        img.onerror = () => reject(new Error('缩略图生成失败'))
        img.src = URL.createObjectURL(file)
    })
}

/**
 * 上传图片到服务器
 * @param {File[]} files - 文件数组
 * @param {Function} onProgress - 进度回调 (0-100)
 * @returns {Promise<Object[]>} 上传结果
 */
export const uploadImages = async (files, onProgress = () => { }) => {
    const formData = new FormData()

    for (const file of files) {
        // 前端先压缩
        const compressed = await compressImage(file, 1920, 0.85)
        const compressedFile = new File([compressed], file.name, { type: 'image/webp' })
        formData.append('images', compressedFile)
    }

    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest()

        xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
                const percent = Math.round((e.loaded / e.total) * 100)
                onProgress(percent)
            }
        })

        xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                const result = JSON.parse(xhr.responseText)
                resolve(result.images)
            } else {
                const error = JSON.parse(xhr.responseText)
                reject(new Error(error.error || '上传失败'))
            }
        })

        xhr.addEventListener('error', () => reject(new Error('网络错误')))
        xhr.addEventListener('abort', () => reject(new Error('上传已取消')))

        xhr.open('POST', `${API_BASE}/upload`)
        xhr.send(formData)
    })
}

/**
 * 删除服务器上的图片
 * @param {string} fileName - 文件名
 * @returns {Promise<void>}
 */
export const deleteImage = async (fileName) => {
    const response = await fetch(`${API_BASE}/upload/${fileName}`, {
        method: 'DELETE'
    })

    if (!response.ok) {
        throw new Error('删除失败')
    }
}

/**
 * 处理文件选择，返回带预览的文件对象数组
 * @param {FileList} fileList - 选择的文件列表
 * @returns {Promise<Object[]>}
 */
export const processSelectedFiles = async (fileList) => {
    const files = Array.from(fileList)
    const processed = []

    for (const file of files) {
        // 验证文件类型
        if (!file.type.startsWith('image/')) {
            continue
        }

        // 验证文件大小 (5MB)
        if (file.size > 5 * 1024 * 1024) {
            console.warn(`文件 ${file.name} 超过 5MB，已跳过`)
            continue
        }

        // 生成预览
        const preview = await generateThumbnail(file, 200)

        processed.push({
            file,
            preview,
            name: file.name,
            size: file.size,
            status: 'pending' // pending, uploading, done, error
        })
    }

    return processed
}

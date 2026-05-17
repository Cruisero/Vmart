/**
 * 随机 slug 生成器
 * 生成 6 位字母数字混合 slug，确保在 shops 表中唯一
 */
const prisma = require('../config/database')

const CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789'

function randomSlug(length = 6) {
    let result = ''
    for (let i = 0; i < length; i++) {
        result += CHARS[Math.floor(Math.random() * CHARS.length)]
    }
    return result
}

/**
 * 生成唯一 slug，自动检测碰撞重试
 */
async function generateUniqueSlug(length = 6, maxRetries = 10) {
    for (let i = 0; i < maxRetries; i++) {
        const slug = randomSlug(length)
        const existing = await prisma.shop.findUnique({ where: { slug } })
        if (!existing) return slug
    }
    // 极低概率走到这里：增加长度再试
    return generateUniqueSlug(length + 1, maxRetries)
}

module.exports = { generateUniqueSlug }

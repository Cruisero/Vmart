// API 配置
// 生产环境使用相对路径（通过 Nginx 反向代理）
// 开发环境使用完整 URL

const isDev = import.meta.env.DEV

export const API_BASE_URL = isDev ? '' : ''

export const API_URL = `${API_BASE_URL}/api`

// 图片 URL 处理
export const getImageUrl = (url, size = 'large') => {
    if (!url) return '/placeholder.png'
    if (url.startsWith('http')) return url

    // 替换尺寸路径
    if (url.includes('/uploads/products/')) {
        const newUrl = url.replace(/\/(large|medium|original)\//, `/${size}/`)
        return `${API_BASE_URL}${newUrl}`
    }
    return `${API_BASE_URL}${url}`
}

export default {
    API_BASE_URL,
    API_URL,
    getImageUrl
}

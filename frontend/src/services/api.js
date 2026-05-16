// API 服务配置
import axios from 'axios'
import { useAuthStore } from '../store/authStore'

// 创建 Axios 实例
const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || '/api',
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json'
    }
})

// 请求拦截器 - 添加认证 Token
api.interceptors.request.use(
    (config) => {
        const token = useAuthStore.getState().token
        if (token) {
            config.headers.Authorization = `Bearer ${token}`
        }
        return config
    },
    (error) => Promise.reject(error)
)

// 响应拦截器 - 处理错误
api.interceptors.response.use(
    (response) => response.data,
    (error) => {
        const { response, config } = error

        if (response?.status === 401) {
            // 打印详细信息帮助调试
            console.warn('[API] 401 错误触发登出:', {
                url: config?.url,
                method: config?.method,
                hasToken: !!config?.headers?.Authorization
            })
            // Token 过期，清除登录状态
            useAuthStore.getState().logout()
            window.location.href = '/login'
        }

        const message = response?.data?.error || error.message || '网络错误'
        return Promise.reject(new Error(message))
    }
)

export default api

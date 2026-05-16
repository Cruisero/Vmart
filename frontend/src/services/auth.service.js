// 认证 API 服务
import api from './api'

// 用户登录
export const login = (email, password) => {
    return api.post('/auth/login', { email, password })
}

// 用户注册
export const register = (data) => {
    return api.post('/auth/register', data)
}

// 获取当前用户
export const getCurrentUser = () => {
    return api.get('/auth/me')
}

// 退出登录
export const logout = () => {
    return api.post('/auth/logout')
}

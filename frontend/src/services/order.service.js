// 订单 API 服务
import api from './api'

// 创建订单
export const createOrder = (data) => {
    return api.post('/orders', data)
}

// 查询订单
export const queryOrder = (orderNo, email) => {
    return api.get('/orders/query', { params: { orderNo, email } })
}

// 获取订单详情
export const getOrderByNo = (orderNo) => {
    return api.get(`/orders/${orderNo}`)
}

// 获取订单卡密
export const getOrderCards = (orderNo) => {
    return api.get(`/orders/${orderNo}/cards`)
}

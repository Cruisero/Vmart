// 支付 API 服务
import api from './api'

// 获取支付方式
export const getPaymentMethods = () => {
    return api.get('/payment/methods')
}

// 创建支付
export const createPayment = (orderNo, paymentMethod) => {
    return api.post('/payment/create', { orderNo, paymentMethod })
}

// 获取支付状态
export const getPaymentStatus = (orderNo) => {
    return api.get(`/payment/status/${orderNo}`)
}

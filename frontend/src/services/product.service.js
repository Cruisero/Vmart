// 商品 API 服务
import api from './api'

// 获取商品列表
export const getProducts = (params = {}) => {
    return api.get('/products', { params })
}

// 获取热门商品
export const getHotProducts = (limit = 8) => {
    return api.get('/products/hot', { params: { limit } })
}

// 获取商品详情
export const getProductById = (id) => {
    return api.get(`/products/${id}`)
}

// 获取分类列表
export const getCategories = () => {
    return api.get('/categories')
}

// 获取分类商品
export const getCategoryProducts = (categoryId, params = {}) => {
    return api.get(`/categories/${categoryId}/products`, { params })
}

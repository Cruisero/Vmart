const Joi = require('joi')

// 登录验证
const loginSchema = Joi.object({
    email: Joi.string().email().required().messages({
        'string.email': '请输入有效的邮箱地址',
        'any.required': '邮箱不能为空'
    }),
    password: Joi.string().min(6).required().messages({
        'string.min': '密码至少6位',
        'any.required': '密码不能为空'
    })
})

// 注册验证
const registerSchema = Joi.object({
    email: Joi.string().email().required().messages({
        'string.email': '请输入有效的邮箱地址',
        'any.required': '邮箱不能为空'
    }),
    password: Joi.string().min(6).max(50).required().messages({
        'string.min': '密码至少6位',
        'string.max': '密码最多50位',
        'any.required': '密码不能为空'
    }),
    username: Joi.string().min(2).max(50).optional().messages({
        'string.min': '用户名至少2位',
        'string.max': '用户名最多50位'
    })
})

module.exports = { loginSchema, registerSchema }

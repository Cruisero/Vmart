const Joi = require('joi')

// 创建订单验证
const createOrderSchema = Joi.object({
    productId: Joi.string().uuid().required().messages({
        'any.required': '商品ID不能为空'
    }),
    variantId: Joi.string().uuid().optional().allow(null).messages({
        'string.guid': '无效的规格ID'
    }),
    quantity: Joi.number().integer().min(1).max(100).default(1).messages({
        'number.min': '数量至少为1',
        'number.max': '单次最多购买100个'
    }),
    email: Joi.string().email().required().messages({
        'string.email': '请输入有效的邮箱地址',
        'any.required': '邮箱不能为空'
    }),
    paymentMethod: Joi.string().valid('alipay', 'wechat', 'usdt', 'bsc_usdt').required().messages({
        'any.only': '不支持的支付方式',
        'any.required': '请选择支付方式'
    }),
    remark: Joi.string().max(500).optional().allow('', null).messages({
        'string.max': '备注最多500个字符'
    })
})

// 订单查询验证
const queryOrderSchema = Joi.object({
    orderNo: Joi.string().optional(),
    email: Joi.string().email().optional()
}).or('orderNo', 'email').messages({
    'object.missing': '请输入订单号或邮箱'
})

module.exports = { createOrderSchema, queryOrderSchema }

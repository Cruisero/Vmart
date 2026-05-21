// 易支付SDK服务
const crypto = require('crypto')
const logger = require('../utils/logger')

function md5(str) {
    return crypto.createHash('md5').update(str, 'utf8').digest('hex')
}

/**
 * 计算易支付标准 MD5 签名
 * @param {Object} params - 参与签名的参数
 * @param {string} key - 商户密钥
 * @returns {string} 签名结果 (小写)
 */
function generateSignature(params, key) {
    // 过滤掉 sign、sign_type 以及空值参数
    const sortedKeys = Object.keys(params)
        .filter(k => k !== 'sign' && k !== 'sign_type' && params[k] !== '' && params[k] !== null && params[k] !== undefined)
        .sort()

    const query = sortedKeys.map(k => `${k}=${params[k]}`).join('&')
    
    logger.debug(`易支付待签名串: ${query + key}`)
    return md5(query + key)
}

/**
 * 构建易支付跳转链接
 * @param {Object} order - 订单对象
 * @param {number} payAmount - 实际支付人民币金额
 * @param {Object} tenantConfig - 租户支付配置
 * @param {string} baseUrl - 当前请求的 baseUrl (支持自定义域名)
 * @param {string} [type] - 支付渠道类型 (如 alipay, wxpay)
 * @returns {string} 完整的网关支付 URL
 */
function createPaymentUrl(order, payAmount, tenantConfig, baseUrl, returnUrlOrType, type) {
    const { yipay_api_url, yipay_pid, yipay_key } = tenantConfig

    if (!yipay_api_url || !yipay_pid || !yipay_key) {
        throw new Error('易支付配置不完整')
    }

    const notifyUrl = `${baseUrl}/api/payment/callback/yipay`
    
    let finalReturnUrl = ''
    let finalType = type

    if (typeof returnUrlOrType === 'string' && (returnUrlOrType.startsWith('http://') || returnUrlOrType.startsWith('https://'))) {
        finalReturnUrl = returnUrlOrType
    } else {
        if (returnUrlOrType) {
            finalType = returnUrlOrType
        }
        let redirectBaseUrl = baseUrl
        if (redirectBaseUrl.includes('localhost:3100')) {
            redirectBaseUrl = redirectBaseUrl.replace('3100', '3000')
        } else if (redirectBaseUrl.includes('127.0.0.1:3100')) {
            redirectBaseUrl = redirectBaseUrl.replace('127.0.0.1:3100', 'localhost:3000')
        }
        finalReturnUrl = `${redirectBaseUrl}/order/${order.orderNo}`
    }

    // 拼接待签名参数
    const params = {
        pid: parseInt(yipay_pid),
        out_trade_no: order.orderNo,
        notify_url: notifyUrl,
        return_url: finalReturnUrl,
        name: order.productName || '商品购买',
        money: parseFloat(payAmount).toFixed(2)
    }

    // 如果指定了具体支付渠道类型，则传递它
    if (finalType) {
        params.type = finalType
    }

    const sign = generateSignature(params, yipay_key)

    // 构建完整请求参数
    const queryParams = new URLSearchParams()
    Object.keys(params).forEach(k => {
        queryParams.set(k, params[k])
    })
    queryParams.set('sign', sign)
    queryParams.set('sign_type', 'MD5')

    // 拼接最终提交 URL
    let submitUrl = yipay_api_url
    if (!submitUrl.includes('?')) {
        submitUrl = submitUrl + '?' + queryParams.toString()
    } else {
        submitUrl = submitUrl + '&' + queryParams.toString()
    }

    logger.info(`易支付请求链接构建成功: 订单 ${order.orderNo}, 金额 ${params.money}, URL ${submitUrl}`)
    return submitUrl
}

/**
 * 校验易支付回调签名
 * @param {Object} params - 回调收到的参数
 * @param {string} key - 商户密钥
 * @returns {boolean} 签名是否有效
 */
function verifySignature(params, key) {
    if (!params || !params.sign) {
        return false
    }
    const expectedSign = generateSignature(params, key)
    return expectedSign.toLowerCase() === params.sign.toLowerCase()
}

module.exports = {
    generateSignature,
    createPaymentUrl,
    verifySignature
}

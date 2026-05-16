// 支付宝SDK服务
const AlipaySdk = require('alipay-sdk').default
const AlipayFormData = require('alipay-sdk/lib/form').default
const logger = require('../utils/logger')

// 延迟初始化支付宝SDK（避免在配置缺失时崩溃）
let alipaySdk = null

function getAlipaySdk() {
    if (alipaySdk) return alipaySdk

    const appId = process.env.ALIPAY_APP_ID
    if (!appId) {
        logger.warn('支付宝未配置 ALIPAY_APP_ID，相关功能不可用')
        return null
    }

    alipaySdk = new AlipaySdk({
        appId: appId,
        privateKey: process.env.ALIPAY_PRIVATE_KEY,
        alipayPublicKey: process.env.ALIPAY_PUBLIC_KEY,
        gateway: process.env.ALIPAY_GATEWAY || 'https://openapi.alipay.com/gateway.do',
        timeout: 5000,
        camelcase: true
    })

    return alipaySdk
}

/**
 * 生成当面付二维码（扫码支付）
 * @param {Object} order - 订单信息
 * @param {string} order.orderNo - 订单号
 * @param {number} order.totalAmount - 订单金额
 * @param {string} order.productName - 商品名称
 * @returns {Promise<Object>} 包含二维码URL的结果
 */
async function createQrCodePayment(order) {
    try {
        const sdk = getAlipaySdk()
        if (!sdk) {
            throw new Error('支付宝未配置')
        }

        const result = await sdk.exec('alipay.trade.precreate', {
            notifyUrl: process.env.ALIPAY_NOTIFY_URL,
            bizContent: {
                outTradeNo: order.orderNo,
                totalAmount: parseFloat(order.totalAmount).toFixed(2),
                subject: order.productName || '商品购买',
                body: `订单号: ${order.orderNo}`
            }
        })

        // 调试日志：输出完整响应
        logger.info(`支付宝API响应: ${JSON.stringify(result)}`)

        // 支付宝当面付接口返回的字段可能是 qrCode 或 qr_code
        const qrCode = result.qrCode || result.qr_code
        logger.info(`支付宝二维码生成成功: ${order.orderNo}, qrCode: ${qrCode}`)

        return {
            qrCode: qrCode,
            orderNo: order.orderNo
        }
    } catch (error) {
        logger.error(`支付宝二维码生成失败: ${error.message}`)
        throw error
    }
}

/**
 * 生成电脑网站支付URL (备用)
 * @param {Object} order - 订单信息
 * @returns {Promise<string>} 支付页面URL
 */
async function createPagePayment(order) {
    const formData = new AlipayFormData()

    formData.setMethod('get')
    formData.addField('returnUrl', process.env.ALIPAY_RETURN_URL)
    formData.addField('notifyUrl', process.env.ALIPAY_NOTIFY_URL)

    formData.addField('bizContent', {
        outTradeNo: order.orderNo,
        productCode: 'FAST_INSTANT_TRADE_PAY',
        totalAmount: parseFloat(order.totalAmount).toFixed(2),
        subject: order.productName || '商品购买',
        body: `订单号: ${order.orderNo}`
    })

    try {
        const sdk = getAlipaySdk()
        if (!sdk) {
            throw new Error('支付宝未配置')
        }

        const result = await sdk.exec(
            'alipay.trade.page.pay',
            {},
            { formData }
        )

        logger.info(`支付宝支付链接生成成功: ${order.orderNo}`)
        return result
    } catch (error) {
        logger.error(`支付宝支付链接生成失败: ${error.message}`)
        throw error
    }
}

/**
 * 生成手机网站支付URL
 * @param {Object} order - 订单信息
 * @returns {Promise<string>} 支付页面URL
 */
async function createWapPayment(order) {
    const formData = new AlipayFormData()

    formData.setMethod('get')
    formData.addField('returnUrl', process.env.ALIPAY_RETURN_URL)
    formData.addField('notifyUrl', process.env.ALIPAY_NOTIFY_URL)

    formData.addField('bizContent', {
        outTradeNo: order.orderNo,
        productCode: 'QUICK_WAP_WAY',
        totalAmount: parseFloat(order.totalAmount).toFixed(2),
        subject: order.productName || '商品购买',
        body: `订单号: ${order.orderNo}`,
        quitUrl: process.env.ALIPAY_RETURN_URL
    })

    try {
        const sdk = getAlipaySdk()
        if (!sdk) {
            throw new Error('支付宝未配置')
        }

        const result = await sdk.exec(
            'alipay.trade.wap.pay',
            {},
            { formData }
        )

        logger.info(`支付宝WAP支付链接生成成功: ${order.orderNo}`)
        return result
    } catch (error) {
        logger.error(`支付宝WAP支付链接生成失败: ${error.message}`)
        throw error
    }
}

/**
 * 验证支付宝异步通知签名
 * @param {Object} params - 回调参数
 * @returns {boolean} 验证结果
 */
function verifyCallback(params) {
    try {
        const sdk = getAlipaySdk()
        if (!sdk) {
            return false
        }
        const result = sdk.checkNotifySign(params)
        return result
    } catch (error) {
        logger.error(`支付宝验签失败: ${error.message}`)
        return false
    }
}

/**
 * 查询订单状态
 * @param {string} orderNo - 订单号
 * @returns {Promise<Object>} 查询结果
 */
async function queryOrder(orderNo) {
    try {
        const sdk = getAlipaySdk()
        if (!sdk) {
            throw new Error('支付宝未配置')
        }

        const result = await sdk.exec('alipay.trade.query', {
            bizContent: {
                outTradeNo: orderNo
            }
        })

        return result
    } catch (error) {
        logger.error(`支付宝订单查询失败: ${error.message}`)
        throw error
    }
}

/**
 * 关闭订单
 * @param {string} orderNo - 订单号
 * @returns {Promise<Object>} 操作结果
 */
async function closeOrder(orderNo) {
    try {
        const sdk = getAlipaySdk()
        if (!sdk) {
            throw new Error('支付宝未配置')
        }

        const result = await sdk.exec('alipay.trade.close', {
            bizContent: {
                outTradeNo: orderNo
            }
        })

        return result
    } catch (error) {
        logger.error(`支付宝订单关闭失败: ${error.message}`)
        throw error
    }
}

module.exports = {
    getAlipaySdk,
    createQrCodePayment,
    createPagePayment,
    createWapPayment,
    verifyCallback,
    queryOrder,
    closeOrder
}

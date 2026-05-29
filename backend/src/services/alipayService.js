// 支付宝SDK服务
const AlipaySdk = require('alipay-sdk').default
const AlipayFormData = require('alipay-sdk/lib/form').default
const logger = require('../utils/logger')
const prisma = require('../config/database')

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

// 用商户配置临时构建一个 SDK 实例（不缓存，避免污染全局）
function buildTenantSdk({ appId, privateKey, alipayPublicKey, gateway }) {
    if (!appId || !privateKey || !alipayPublicKey) {
        throw new Error('支付宝配置不完整')
    }
    return new AlipaySdk({
        appId,
        privateKey,
        alipayPublicKey,
        gateway: gateway || 'https://openapi.alipay.com/gateway.do',
        timeout: 5000,
        camelcase: true
    })
}

// 从数据库 PlatformSetting 载入平台支付配置，若无则降级为环境变量配置
async function getPlatformAlipayConfig() {
    try {
        const keys = ['alipay_app_id', 'alipay_private_key', 'alipay_public_key', 'alipay_gateway']
        const settings = await prisma.platformSetting.findMany({
            where: { key: { in: keys } }
        })
        const map = {}
        settings.forEach(s => {
            if (s.value) map[s.key] = s.value
        })

        if (map.alipay_app_id && map.alipay_private_key && map.alipay_public_key) {
            return {
                appId: map.alipay_app_id,
                privateKey: map.alipay_private_key,
                alipayPublicKey: map.alipay_public_key,
                gateway: map.alipay_gateway || 'https://openapi.alipay.com/gateway.do'
            }
        }
    } catch (error) {
        logger.error('获取平台支付宝配置失败:', error)
    }

    const appId = process.env.ALIPAY_APP_ID
    if (appId) {
        return {
            appId,
            privateKey: process.env.ALIPAY_PRIVATE_KEY,
            alipayPublicKey: process.env.ALIPAY_PUBLIC_KEY,
            gateway: process.env.ALIPAY_GATEWAY || 'https://openapi.alipay.com/gateway.do'
        }
    }
    return null
}

// 动态构建当前有效的 SDK 实例
async function getActiveSdk(tenantConfig = null) {
    if (tenantConfig) {
        return buildTenantSdk(tenantConfig)
    }

    const platformConfig = await getPlatformAlipayConfig()
    if (!platformConfig) {
        return null
    }

    return new AlipaySdk({
        appId: platformConfig.appId,
        privateKey: platformConfig.privateKey,
        alipayPublicKey: platformConfig.alipayPublicKey,
        gateway: platformConfig.gateway,
        timeout: 5000,
        camelcase: true
    })
}

/**
 * 生成当面付二维码（扫码支付）
 * @param {Object} order - 订单信息
 * @param {string} order.orderNo - 订单号
 * @param {number} order.totalAmount - 订单金额
 * @param {string} order.productName - 商品名称
 * @returns {Promise<Object>} 包含二维码URL的结果
 */
async function createQrCodePayment(order, tenantConfig = null, notifyUrl = null) {
    try {
        const sdk = await getActiveSdk(tenantConfig)
        if (!sdk) {
            throw new Error('支付宝未配置')
        }

        const result = await sdk.exec('alipay.trade.precreate', {
            notifyUrl: notifyUrl || process.env.ALIPAY_NOTIFY_URL,
            bizContent: {
                outTradeNo: order.orderNo,
                totalAmount: parseFloat(order.totalAmount).toFixed(2),
                subject: order.productName || '商品购买',
                body: `订单号: ${order.orderNo}`
            }
        })

        // 调试日志：输出完整响应
        logger.info(`支付宝API响应: ${JSON.stringify(result)}`)

        if (result.code !== '10000') {
            throw new Error(`支付宝接口及网关返回失败: [${result.subCode || result.code}] ${result.subMsg || result.msg || '未知错误'}`)
        }

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
async function createPagePayment(order, tenantConfig = null, notifyUrl = null, returnUrl = null) {
    const formData = new AlipayFormData()

    formData.setMethod('get')
    formData.addField('returnUrl', returnUrl || process.env.ALIPAY_RETURN_URL)
    formData.addField('notifyUrl', notifyUrl || process.env.ALIPAY_NOTIFY_URL)

    formData.addField('bizContent', {
        outTradeNo: order.orderNo,
        productCode: 'FAST_INSTANT_TRADE_PAY',
        totalAmount: parseFloat(order.totalAmount).toFixed(2),
        subject: order.productName || '商品购买',
        body: `订单号: ${order.orderNo}`
    })

    try {
        const sdk = await getActiveSdk(tenantConfig)
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
async function createWapPayment(order, tenantConfig = null, notifyUrl = null, returnUrl = null) {
    const formData = new AlipayFormData()

    formData.setMethod('get')
    formData.addField('returnUrl', returnUrl || process.env.ALIPAY_RETURN_URL)
    formData.addField('notifyUrl', notifyUrl || process.env.ALIPAY_NOTIFY_URL)

    formData.addField('bizContent', {
        outTradeNo: order.orderNo,
        productCode: 'QUICK_WAP_WAY',
        totalAmount: parseFloat(order.totalAmount).toFixed(2),
        subject: order.productName || '商品购买',
        body: `订单号: ${order.orderNo}`,
        quitUrl: returnUrl || process.env.ALIPAY_RETURN_URL
    })

    try {
        const sdk = await getActiveSdk(tenantConfig)
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
 * @param {Object} [tenantConfig] - 可选的商户端专属支付宝配置
 * @returns {Promise<boolean>} 验证结果
 */
async function verifyCallback(params, tenantConfig = null) {
    try {
        const sdk = await getActiveSdk(tenantConfig)
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
        const sdk = await getActiveSdk()
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
        const sdk = await getActiveSdk()
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

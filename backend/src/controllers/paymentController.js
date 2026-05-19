// 支付控制器
const prisma = require('../config/database')
const { dispenseCards } = require('./cardController')
const logger = require('../utils/logger')
const alipayService = require('../services/alipayService')

// 支付方式配置（默认值）
const defaultPaymentMethods = [
    { id: 'alipay', name: '支付宝', icon: 'alipay', settingKey: 'alipayEnabled' },
    { id: 'wechat', name: '微信支付', icon: 'wechat', settingKey: 'wechatEnabled' },
    { id: 'usdt', name: 'USDT-TRC20', icon: 'usdt', settingKey: 'usdtEnabled' },
    { id: 'bsc_usdt', name: 'USDT-BEP20', icon: 'bsc_usdt', settingKey: 'bscUsdtEnabled' }
]

// 获取支付方式列表（从数据库读取启用状态）
exports.getPaymentMethods = async (req, res, next) => {
    try {
        // 解析租户：优先 req.tenantId（自定义域名），其次 query.slug 或 query.tenantId（路径模式 /v/:slug）
        let tenantId = req.tenantId || null
        if (!tenantId && req.query.slug) {
            const t = await prisma.tenant.findUnique({
                where: { shopSlug: req.query.slug },
                select: { id: true, status: true }
            })
            if (t && t.status === 'ACTIVE') tenantId = t.id
        }
        if (!tenantId && req.query.tenantId) tenantId = req.query.tenantId

        // 商户店面：从 TenantSetting 读取
        if (tenantId) {
            const ts = await prisma.tenantSetting.findUnique({ where: { tenantId } })
            const methods = defaultPaymentMethods
                .filter(m => m.id !== 'wechat') // 商户暂不支持微信支付
                .map(m => {
                    let enabled = false
                    if (m.id === 'alipay') enabled = !!ts?.alipayEnabled
                    else if (m.id === 'usdt') enabled = !!ts?.usdtEnabled
                    else if (m.id === 'bsc_usdt') enabled = !!ts?.bscUsdtEnabled
                    return { id: m.id, name: m.name, icon: m.icon, enabled }
                })
            return res.json({ methods })
        }

        // 主站：从 Setting 读取
        const settings = await prisma.setting.findMany({
            where: {
                key: {
                    in: ['alipayEnabled', 'wechatEnabled', 'usdtEnabled', 'bscUsdtEnabled']
                }
            }
        })

        const settingsMap = {}
        settings.forEach(s => {
            settingsMap[s.key] = s.value === 'true'
        })

        const methods = defaultPaymentMethods.map(method => ({
            id: method.id,
            name: method.name,
            icon: method.icon,
            enabled: settingsMap[method.settingKey] === true
        }))

        res.json({ methods })
    } catch (error) {
        next(error)
    }
}

// 创建支付订单
exports.createPayment = async (req, res, next) => {
    try {
        const { orderNo, paymentMethod } = req.body

        // 查询订单（先查到 tenantId 才能正确判断启用状态）
        const order = await prisma.order.findUnique({
            where: { orderNo }
        })

        if (!order) {
            return res.status(404).json({ error: '订单不存在' })
        }

        if (order.status !== 'PENDING') {
            return res.status(400).json({ error: '订单状态异常' })
        }

        // 【安全修复】校验支付方式是否启用（区分租户/主站）
        const methodConfig = defaultPaymentMethods.find(m => m.id === paymentMethod)
        if (methodConfig) {
            let enabled = false
            if (order.tenantId) {
                const ts = await prisma.tenantSetting.findUnique({ where: { tenantId: order.tenantId } })
                if (paymentMethod === 'alipay') enabled = !!ts?.alipayEnabled
                else if (paymentMethod === 'usdt') enabled = !!ts?.usdtEnabled
                else if (paymentMethod === 'bsc_usdt') enabled = !!ts?.bscUsdtEnabled
            } else {
                const setting = await prisma.setting.findFirst({
                    where: { key: methodConfig.settingKey }
                })
                enabled = setting?.value === 'true'
            }
            if (!enabled) {
                logger.warn(`拒绝未启用的支付方式: ${paymentMethod} (订单 ${orderNo}, tenantId=${order.tenantId || 'main'})`)
                return res.status(400).json({ error: '该支付方式未启用' })
            }
        }

        // 创建支付记录
        const payment = await prisma.payment.upsert({
            where: { orderId: order.id },
            create: {
                orderId: order.id,
                paymentMethod,
                amount: order.totalAmount,
                status: 'PENDING'
            },
            update: {
                paymentMethod,
                status: 'PENDING'
            }
        })

        // 解析租户支付配置（如果是租户订单）
        let tenantPayConfig = null
        if (order.tenantId) {
            const ts = await prisma.tenantSetting.findUnique({ where: { tenantId: order.tenantId } })
            if (ts?.paymentConfig) {
                try { tenantPayConfig = JSON.parse(ts.paymentConfig) } catch {}
            }
        }

        // 根据支付方式生成支付信息
        let paymentData = {}
        if (paymentMethod === 'alipay') {
            // 使用当面付二维码（租户订单使用商户配置）
            const tenantSdkConfig = tenantPayConfig ? {
                appId: tenantPayConfig.alipay_app_id,
                privateKey: tenantPayConfig.alipay_private_key,
                alipayPublicKey: tenantPayConfig.alipay_public_key
            } : null
            const result = await generateAlipayQrCode(order, payment, tenantSdkConfig)
            paymentData = {
                paymentType: 'qrcode',
                qrCode: result.qrCode,
                payUrl: null
            }
        } else if (paymentMethod === 'wechat') {
            const payUrl = await generateWechatUrl(order, payment)
            paymentData = {
                paymentType: 'redirect',
                qrCode: null,
                payUrl
            }
        } else if (paymentMethod === 'usdt') {
            const usdtService = require('../services/usdtService')
            const overrideConfig = tenantPayConfig ? {
                WALLET_ADDRESS: tenantPayConfig.usdt_wallet || '',
                EXCHANGE_RATE: parseFloat(tenantPayConfig.usdt_exchange_rate) || 7.2,
                ENABLED: true
            } : null
            const usdtInfo = await usdtService.createUsdtPayment(order, overrideConfig)
            paymentData = {
                paymentType: 'usdt',
                walletAddress: usdtInfo.walletAddress,
                usdtAmount: usdtInfo.usdtAmount,
                qrContent: usdtInfo.qrContent,
                exchangeRate: usdtInfo.exchangeRate
            }
        } else if (paymentMethod === 'bsc_usdt') {
            const bscUsdtService = require('../services/bscUsdtService')
            const overrideConfig = tenantPayConfig ? {
                WALLET_ADDRESS: tenantPayConfig.bsc_usdt_wallet || '',
                EXCHANGE_RATE: parseFloat(tenantPayConfig.usdt_exchange_rate) || 7.2,
                ENABLED: true
            } : null
            const usdtInfo = await bscUsdtService.createBscUsdtPayment(order, overrideConfig)
            paymentData = {
                paymentType: 'bsc_usdt',
                walletAddress: usdtInfo.walletAddress,
                usdtAmount: usdtInfo.usdtAmount,
                qrContent: usdtInfo.qrContent,
                exchangeRate: usdtInfo.exchangeRate
            }
        }

        res.json({
            paymentId: payment.id,
            ...paymentData,
            orderNo: order.orderNo,
            amount: parseFloat(order.totalAmount)
        })
    } catch (error) {
        next(error)
    }
}

// 生成支付宝二维码（当面付）
async function generateAlipayQrCode(order, payment, tenantSdkConfig = null) {
    try {
        const result = await alipayService.createQrCodePayment({
            orderNo: order.orderNo,
            totalAmount: order.totalAmount,
            productName: order.productName
        }, tenantSdkConfig)
        return result
    } catch (error) {
        logger.error('支付宝二维码生成失败:', error)
        throw error
    }
}

// 生成支付宝支付链接 (备用)
async function generateAlipayUrl(order, payment) {
    try {
        // 使用支付宝SDK生成支付链接
        const payUrl = await alipayService.createPagePayment({
            orderNo: order.orderNo,
            totalAmount: order.totalAmount,
            productName: order.productName
        })
        return payUrl
    } catch (error) {
        logger.error('支付宝支付链接生成失败:', error)
        // 如果SDK调用失败，返回模拟支付页面
        const params = new URLSearchParams({
            orderNo: order.orderNo,
            amount: order.totalAmount.toString(),
            subject: order.productName
        })
        return `/api/payment/mock?${params.toString()}`
    }
}

// 生成微信支付链接 (模拟)
async function generateWechatUrl(order, payment) {
    const params = new URLSearchParams({
        orderNo: order.orderNo,
        amount: order.totalAmount.toString(),
        subject: order.productName
    })
    return `/api/payment/mock?${params.toString()}`
}

// 支付宝回调
exports.alipayCallback = async (req, res, next) => {
    try {
        const params = req.body
        const { out_trade_no, trade_no, trade_status } = params

        logger.info('支付宝回调:', { out_trade_no, trade_no, trade_status })

        // 验证签名
        const signValid = alipayService.verifyCallback(params)
        if (!signValid) {
            logger.warn('支付宝回调验签失败:', { out_trade_no })
            return res.send('fail')
        }

        if (trade_status === 'TRADE_SUCCESS' || trade_status === 'TRADE_FINISHED') {
            await processPaymentSuccess(out_trade_no, trade_no, 'alipay')
        }

        res.send('success')
    } catch (error) {
        logger.error('支付宝回调处理失败:', error)
        res.send('fail')
    }
}

// 微信回调
exports.wechatCallback = async (req, res, next) => {
    try {
        const { out_trade_no, transaction_id, result_code } = req.body

        // 【安全修复】微信支付未配置SDK，拒绝所有回调（无法验签）
        logger.warn('收到微信回调但微信支付未配置，拒绝处理:', { out_trade_no, transaction_id, result_code })
        return res.json({ code: 'FAIL', message: '微信支付未配置' })
    } catch (error) {
        logger.error('微信回调处理失败:', error)
        res.json({ code: 'FAIL', message: error.message })
    }
}

// 处理支付成功
async function processPaymentSuccess(orderNo, tradeNo, paymentMethod) {
    const order = await prisma.order.findUnique({
        where: { orderNo },
        include: { payment: true, product: true }
    })

    if (!order || order.status === 'COMPLETED') {
        return // 订单不存在或已处理
    }

    // 开启事务
    await prisma.$transaction(async (tx) => {
        // 更新支付记录
        await tx.payment.update({
            where: { orderId: order.id },
            data: {
                status: 'SUCCESS',
                tradeNo
            }
        })

        // 更新订单状态
        await tx.order.update({
            where: { id: order.id },
            data: {
                status: 'PAID',
                paymentNo: tradeNo,
                paidAt: new Date()
            }
        })
    })

    // 邮件资源包：识别 remark 中的 email_pack:{tenantId}:{count}，增加永久额度
    const { processEmailPackIfNeeded } = require('../utils/emailPackHandler')
    if (await processEmailPackIfNeeded(order)) {
        return // 邮件资源包订单到此结束，不发卡密/邮件
    }

    // 发放卡密
    let cards = []
    try {
        cards = await dispenseCards(order.id, order.productId, order.quantity, order.variantId)

        // 更新订单为已完成
        await prisma.order.update({
            where: { id: order.id },
            data: {
                status: 'COMPLETED',
                completedAt: new Date()
            }
        })

        // ---- 代理利润结算 ----
        const agentOrder = await prisma.agentOrder.findUnique({ where: { orderId: order.id } })
        if (agentOrder && !agentOrder.settled) {
            await prisma.$transaction([
                prisma.agent.update({
                    where: { id: agentOrder.agentId },
                    data: {
                        balance: { increment: agentOrder.profit },
                        totalEarnings: { increment: agentOrder.profit }
                    }
                }),
                prisma.agentOrder.update({
                    where: { id: agentOrder.id },
                    data: { settled: true }
                })
            ])
            logger.info(`代理订单 ${orderNo} 利润 ¥${agentOrder.profit} 已结算`)
        }

        logger.info(`订单 ${orderNo} 卡密发放成功`)
    } catch (error) {
        // 无卡密可发放，订单保持 PAID 状态，等待管理员手动发货
        logger.warn(`订单 ${orderNo} 无可用卡密，等待管理员手动发货: ${error.message}`)
    }

    // 只有成功发放卡密时才发送邮件
    // 无卡密的订单等管理员手动发货时再发送邮件
    if (cards && cards.length > 0) {
        try {
            const emailService = require('../services/emailService')

            // 获取完整订单信息
            const fullOrder = await prisma.order.findUnique({
                where: { id: order.id },
                include: { product: true, cards: true }
            })

            // 检查是否是代理订单
            const agentOrder = await prisma.agentOrder.findUnique({
                where: { orderId: order.id },
                include: { agent: { include: { user: { select: { email: true } } } } }
            })

            if (agentOrder) {
                // 分站订单：不发邮件给买家，通知代理商（如果开启了邮件通知）
                if (agentOrder.agent.emailNotify) {
                    const agentEmail = agentOrder.agent.notifyEmail || agentOrder.agent.user.email
                    const agentName = agentOrder.agent.shopName || '代理商'
                    await emailService.sendAgentOrderNotifyEmail(agentEmail, agentName, fullOrder, fullOrder.cards, agentOrder.profit)
                    logger.info(`分站订单 ${orderNo} 已通知代理商 ${agentEmail}`)
                } else {
                    logger.info(`分站订单 ${orderNo} 代理商已关闭邮件通知，跳过`)
                }
            } else {
                // 主站订单：发邮件给买家
                await emailService.sendOrderCompletedEmail(fullOrder, fullOrder.cards)
                logger.info(`订单 ${orderNo} 邮件通知已发送`)
            }

            // 通知管理员
            const { notifyOrderPaid } = require('../services/notifyDispatcher')
            notifyOrderPaid(fullOrder).catch(e => logger.error('管理员通知失败:', e))

            // 平台超管违禁词扫描
            try {
                const manNotify = require('../services/manNotifyService')
                const prismaClient = require('../config/database')
                const setting = await prismaClient.platformSetting.findUnique({ where: { key: 'risk_keywords' } })
                if (setting?.value && fullOrder.tenantId) {
                    const keywords = JSON.parse(setting.value).filter(Boolean)
                    if (keywords.length > 0) {
                        const scanText = [
                            fullOrder.productName,
                            fullOrder.product?.name,
                            fullOrder.product?.description,
                            Array.isArray(fullOrder.product?.tags) ? fullOrder.product.tags.join(' ') : ''
                        ].filter(Boolean).join(' ').toLowerCase()
                        const hits = keywords.filter(k => k && scanText.includes(k.toLowerCase()))
                        if (hits.length > 0) {
                            const tenant = await prismaClient.tenant.findUnique({
                                where: { id: fullOrder.tenantId },
                                select: { shopName: true, shopSlug: true }
                            })
                            manNotify.notifyRiskHit({
                                orderNo: fullOrder.orderNo,
                                productName: fullOrder.productName,
                                totalAmount: fullOrder.totalAmount,
                                email: fullOrder.email
                            }, hits, tenant).catch(() => {})
                        }
                    }
                }
            } catch (e) {
                logger.error('[riskScan] 扫描失败:', e.message)
            }
        } catch (error) {
            logger.error(`订单 ${orderNo} 邮件发送失败:`, error)
        }
    } else {
        logger.info(`订单 ${orderNo} 无卡密，等待管理员手动发货后发送邮件`)
        // 通知管理员需要手动发货
        const { notifyPendingShip } = require('../services/notifyDispatcher')
        notifyPendingShip(order).catch(e => logger.error('管理员通知失败:', e))
    }
}

// 查询支付状态
exports.getPaymentStatus = async (req, res, next) => {
    try {
        const { orderNo } = req.params

        const order = await prisma.order.findUnique({
            where: { orderNo },
            include: { payment: true }
        })

        if (!order) {
            return res.status(404).json({ error: '订单不存在' })
        }

        res.json({
            orderNo: order.orderNo,
            orderStatus: order.status.toLowerCase(),
            paymentStatus: order.payment?.status?.toLowerCase() || 'pending',
            paidAt: order.paidAt
        })
    } catch (error) {
        next(error)
    }
}

// 模拟支付 (开发测试用)
exports.mockPayment = async (req, res, next) => {
    try {
        const { orderNo } = req.query

        if (!orderNo) {
            return res.status(400).send('缺少订单号')
        }

        // 返回模拟支付页面
        res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>模拟支付</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: sans-serif; max-width: 400px; margin: 50px auto; padding: 20px; text-align: center; }
          .card { background: #f5f5f5; padding: 30px; border-radius: 8px; }
          .amount { font-size: 32px; color: #1677ff; margin: 20px 0; }
          button { width: 100%; padding: 15px; font-size: 16px; border: none; border-radius: 4px; cursor: pointer; margin: 5px 0; }
          .pay-btn { background: #1677ff; color: white; }
          .cancel-btn { background: #f5f5f5; color: #666; }
        </style>
      </head>
      <body>
        <div class="card">
          <h2>模拟支付</h2>
          <p>订单号: ${orderNo}</p>
          <div class="amount">¥${req.query.amount || '0.00'}</div>
          <p>商品: ${req.query.subject || '未知商品'}</p>
          <form action="/api/payment/mock/confirm" method="POST">
            <input type="hidden" name="orderNo" value="${orderNo}">
            <button type="submit" class="pay-btn">确认支付</button>
          </form>
          <button class="cancel-btn" onclick="history.back()">取消</button>
        </div>
      </body>
      </html>
    `)
    } catch (error) {
        next(error)
    }
}

// 确认模拟支付 - 仅开发环境可用
exports.confirmMockPayment = async (req, res, next) => {
    try {
        // 【安全修复】生产环境禁止使用模拟支付
        if (process.env.NODE_ENV === 'production') {
            logger.warn('生产环境拒绝模拟支付请求:', { orderNo: req.body.orderNo, ip: req.ip })
            return res.status(403).json({ error: '模拟支付在生产环境中不可用' })
        }

        const { orderNo } = req.body

        await processPaymentSuccess(orderNo, `MOCK${Date.now()}`, 'mock')

        // 重定向到订单结果页
        res.redirect(`http://localhost:3000/order/${orderNo}`)
    } catch (error) {
        next(error)
    }
}

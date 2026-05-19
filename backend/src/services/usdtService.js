// USDT-TRC20 支付服务（支持多租户）
const prisma = require('../config/database')
const logger = require('../utils/logger')

// 默认配置
const DEFAULT_CONFIG = {
    USDT_CONTRACT: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t', // USDT-TRC20 合约地址
    TRONGRID_API: 'https://api.trongrid.io',
    POLL_INTERVAL: 30000, // 30秒轮询一次
    AMOUNT_PRECISION: 2 // 金额精度（小数位数）
}

// ─── 主站配置（从全局 Setting 读）──────────────────────────
async function getMainConfig() {
    try {
        const settings = await prisma.setting.findMany({
            where: { key: { in: ['usdtEnabled', 'usdtWalletAddress', 'usdtExchangeRate'] } }
        })
        const map = {}
        settings.forEach(s => { map[s.key] = s.value })
        return {
            ...DEFAULT_CONFIG,
            tenantId: null,
            WALLET_ADDRESS: map.usdtWalletAddress || '',
            EXCHANGE_RATE: parseFloat(map.usdtExchangeRate) || 7,
            ENABLED: map.usdtEnabled === 'true'
        }
    } catch (error) {
        logger.error('获取主站USDT配置失败:', error)
        return { ...DEFAULT_CONFIG, tenantId: null, WALLET_ADDRESS: '', EXCHANGE_RATE: 7, ENABLED: false }
    }
}

// 兼容老接口：默认返回主站配置
async function getConfig() {
    return getMainConfig()
}

// ─── 收集所有开启的钱包组（主站 + 各租户）──────────────────
async function getAllWalletGroups() {
    const groups = []
    const main = await getMainConfig()
    if (main.ENABLED && main.WALLET_ADDRESS) groups.push(main)

    const tenantSettings = await prisma.tenantSetting.findMany({
        where: { usdtEnabled: true },
        select: { tenantId: true, paymentConfig: true }
    })
    for (const ts of tenantSettings) {
        try {
            const cfg = JSON.parse(ts.paymentConfig || '{}')
            if (cfg.usdt_wallet) {
                groups.push({
                    ...DEFAULT_CONFIG,
                    tenantId: ts.tenantId,
                    WALLET_ADDRESS: cfg.usdt_wallet,
                    EXCHANGE_RATE: parseFloat(cfg.usdt_exchange_rate) || 7.2,
                    ENABLED: true
                })
            }
        } catch {}
    }
    return groups
}

// ─── 工具函数 ─────────────────────────────────────────────
async function cnyToUsdt(cnyAmount, exchangeRate) {
    const rate = exchangeRate || (await getMainConfig()).EXCHANGE_RATE
    return parseFloat((cnyAmount / rate).toFixed(DEFAULT_CONFIG.AMOUNT_PRECISION))
}

// 生成唯一USDT金额（按 tenantId 范围去重）
async function generateUniqueAmount(baseAmount, tenantId = null) {
    const where = {
        status: 'PENDING',
        paymentMethod: 'usdt',
        ...(tenantId === null ? { tenantId: null } : { tenantId })
    }
    const pendingOrders = await prisma.order.findMany({
        where, select: { usdtAmount: true }
    })
    const usedAmounts = new Set(pendingOrders.map(o => o.usdtAmount?.toString()))

    for (let i = 0; i < 100; i++) {
        const offset = (i % 2 === 0 ? 1 : -1) * Math.floor(i / 2 + 1) * 0.01
        const uniqueAmount = parseFloat((baseAmount + offset).toFixed(DEFAULT_CONFIG.AMOUNT_PRECISION))
        if (uniqueAmount > 0 && !usedAmounts.has(uniqueAmount.toString())) return uniqueAmount
    }
    return baseAmount
}

// ─── 生成支付信息（接受 overrideConfig 用于商户订单）─────
async function createUsdtPayment(order, overrideConfig = null) {
    const config = overrideConfig
        ? { ...DEFAULT_CONFIG, ...overrideConfig }
        : await getMainConfig()

    if (!config.WALLET_ADDRESS) throw new Error('USDT收款地址未配置')

    const baseUsdt = await cnyToUsdt(parseFloat(order.totalAmount), config.EXCHANGE_RATE)
    const usdtAmount = await generateUniqueAmount(baseUsdt, order.tenantId || null)

    await prisma.order.update({
        where: { id: order.id },
        data: { usdtAmount, paymentMethod: 'usdt' }
    })

    const qrContent = `tron:${config.WALLET_ADDRESS}?amount=${usdtAmount}&token=${DEFAULT_CONFIG.USDT_CONTRACT}`
    return {
        walletAddress: config.WALLET_ADDRESS,
        usdtAmount,
        qrContent,
        exchangeRate: config.EXCHANGE_RATE
    }
}

// ─── 查询某钱包的最近交易 ─────────────────────────────────
async function getRecentTransactions(walletAddress, limit = 50) {
    if (!walletAddress) return []
    try {
        const url = `${DEFAULT_CONFIG.TRONGRID_API}/v1/accounts/${walletAddress}/transactions/trc20?limit=${limit}&contract_address=${DEFAULT_CONFIG.USDT_CONTRACT}`
        const response = await fetch(url, { headers: { 'Accept': 'application/json' } })
        if (!response.ok) throw new Error(`TronGrid API error: ${response.status}`)
        const data = await response.json()
        return data.data || []
    } catch (error) {
        logger.error(`获取TRC20交易失败 (wallet=${walletAddress}):`, error)
        return []
    }
}

// ─── 检查单个钱包组 ───────────────────────────────────────
async function checkGroup(group) {
    if (!group.ENABLED || !group.WALLET_ADDRESS) return

    const where = {
        status: 'PENDING',
        paymentMethod: 'usdt',
        usdtAmount: { not: null },
        ...(group.tenantId === null ? { tenantId: null } : { tenantId: group.tenantId })
    }
    const pendingOrders = await prisma.order.findMany({ where, include: { payment: true } })
    if (pendingOrders.length === 0) return

    const transactions = await getRecentTransactions(group.WALLET_ADDRESS)

    for (const tx of transactions) {
        if (tx.to !== group.WALLET_ADDRESS) continue
        const txAmount = parseFloat(tx.value) / 1000000

        const matched = pendingOrders.find(o => Math.abs(parseFloat(o.usdtAmount) - txAmount) < 0.001)
        if (!matched) continue

        const existing = await prisma.payment.findFirst({ where: { tradeNo: tx.transaction_id } })
        if (existing) continue

        logger.info(`USDT支付匹配成功 (tenant=${group.tenantId || 'main'}): 订单 ${matched.orderNo}, 金额 ${txAmount} USDT, 交易 ${tx.transaction_id}`)
        await processUsdtPaymentSuccess(matched, tx.transaction_id, txAmount)
    }
}

// ─── 入口：遍历所有钱包组 ─────────────────────────────────
async function checkUsdtPayments() {
    try {
        const groups = await getAllWalletGroups()
        for (const group of groups) {
            try { await checkGroup(group) }
            catch (e) { logger.error(`USDT 检查失败 (tenant=${group.tenantId || 'main'}):`, e) }
        }
    } catch (error) {
        logger.error('USDT支付轮询失败:', error)
    }
}

// ─── 处理USDT支付成功 ─────────────────────────────────────
async function processUsdtPaymentSuccess(order, txHash, usdtAmount) {
    const { dispenseCards } = require('../controllers/cardController')

    await prisma.$transaction(async (tx) => {
        await tx.payment.upsert({
            where: { orderId: order.id },
            create: { orderId: order.id, paymentMethod: 'usdt', amount: order.totalAmount, tradeNo: txHash, status: 'SUCCESS' },
            update: { status: 'SUCCESS', tradeNo: txHash }
        })
        await tx.order.update({
            where: { id: order.id },
            data: { status: 'PAID', paymentNo: txHash, paidAt: new Date() }
        })
    })

    // 邮件资源包：跳过卡密分发逻辑
    const { processEmailPackIfNeeded } = require('../utils/emailPackHandler')
    if (await processEmailPackIfNeeded(order)) return

    let cards = []
    try {
        cards = await dispenseCards(order.id, order.productId, order.quantity, order.variantId)
        await prisma.order.update({
            where: { id: order.id },
            data: { status: 'COMPLETED', completedAt: new Date() }
        })
        logger.info(`USDT订单 ${order.orderNo} 卡密发放成功`)
    } catch (error) {
        logger.error(`USDT订单 ${order.orderNo} 卡密发放失败:`, error)
    }

    if (cards && cards.length > 0) {
        try {
            const emailService = require('./emailService')
            const fullOrder = await prisma.order.findUnique({
                where: { id: order.id },
                include: { product: true, cards: true }
            })

            const agentOrder = await prisma.agentOrder.findUnique({
                where: { orderId: order.id },
                include: { agent: { include: { user: { select: { email: true } } } } }
            })

            if (agentOrder) {
                if (agentOrder.agent.emailNotify) {
                    const agentEmail = agentOrder.agent.notifyEmail || agentOrder.agent.user.email
                    const agentName = agentOrder.agent.shopName || '代理商'
                    await emailService.sendAgentOrderNotifyEmail(agentEmail, agentName, fullOrder, fullOrder.cards, agentOrder.profit)
                    logger.info(`USDT分站订单 ${order.orderNo} 已通知代理商 ${agentEmail}`)
                }
            } else {
                await emailService.sendOrderCompletedEmail(fullOrder, fullOrder.cards)
                logger.info(`USDT订单 ${order.orderNo} 邮件通知已发送`)
            }

            const { notifyOrderPaid } = require('./notifyDispatcher')
            notifyOrderPaid(fullOrder).catch(e => logger.error('管理员通知失败:', e))
        } catch (error) {
            logger.error(`USDT订单 ${order.orderNo} 邮件发送失败:`, error)
        }
    } else {
        logger.info(`USDT订单 ${order.orderNo} 无卡密，等待管理员手动发货后发送邮件`)
        const { notifyPendingShip } = require('./notifyDispatcher')
        notifyPendingShip(order).catch(e => logger.error('管理员通知失败:', e))
    }
}

// ─── 启动/停止轮询 ────────────────────────────────────────
let pollingInterval = null

function startPolling() {
    if (pollingInterval) return
    logger.info('USDT支付监控已启动（多租户模式）')
    pollingInterval = setInterval(checkUsdtPayments, DEFAULT_CONFIG.POLL_INTERVAL)
    checkUsdtPayments()
}

function stopPolling() {
    if (pollingInterval) {
        clearInterval(pollingInterval)
        pollingInterval = null
        logger.info('USDT支付监控已停止')
    }
}

module.exports = {
    getConfig, cnyToUsdt, createUsdtPayment, checkUsdtPayments,
    getAllWalletGroups, startPolling, stopPolling
}

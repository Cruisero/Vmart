// USDT-BEP20 支付服务（支持多租户，使用免费 BSC RPC 余额轮询）
const prisma = require('../config/database')
const logger = require('../utils/logger')

// 默认配置
const DEFAULT_CONFIG = {
    USDT_CONTRACT: '0x55d398326f99059fF775485246999027B3197955', // USDT-BEP20 合约地址
    BSC_RPC_URLS: [
        'https://bsc-dataseed.binance.org/',
        'https://bsc-dataseed1.binance.org/',
        'https://bsc-dataseed2.binance.org/',
        'https://bsc-dataseed3.binance.org/',
        'https://bsc-dataseed4.binance.org/'
    ],
    POLL_INTERVAL: 30000,
    AMOUNT_PRECISION: 2
}

// 每个钱包独立的余额缓存 { walletAddress: lastBalance }
const lastKnownBalances = new Map()

// ─── 主站配置 ─────────────────────────────────────────────
async function getMainConfig() {
    try {
        const settings = await prisma.setting.findMany({
            where: { key: { in: ['bscUsdtEnabled', 'bscUsdtWalletAddress', 'bscUsdtExchangeRate', 'bscUsdtApiKey'] } }
        })
        const map = {}
        settings.forEach(s => { map[s.key] = s.value })
        return {
            ...DEFAULT_CONFIG,
            tenantId: null,
            WALLET_ADDRESS: map.bscUsdtWalletAddress || '',
            EXCHANGE_RATE: parseFloat(map.bscUsdtExchangeRate) || 7,
            ENABLED: map.bscUsdtEnabled === 'true',
            API_KEY: map.bscUsdtApiKey || ''
        }
    } catch (error) {
        logger.error('获取主站BSC USDT配置失败:', error)
        return { ...DEFAULT_CONFIG, tenantId: null, WALLET_ADDRESS: '', EXCHANGE_RATE: 7, ENABLED: false, API_KEY: '' }
    }
}

async function getConfig() { return getMainConfig() }

// ─── 收集所有开启的钱包组 ─────────────────────────────────
async function getAllWalletGroups() {
    const groups = []
    const main = await getMainConfig()
    if (main.ENABLED && main.WALLET_ADDRESS) groups.push(main)

    const tenantSettings = await prisma.tenantSetting.findMany({
        where: { bscUsdtEnabled: true },
        select: { tenantId: true, paymentConfig: true }
    })
    for (const ts of tenantSettings) {
        try {
            const cfg = JSON.parse(ts.paymentConfig || '{}')
            if (cfg.bsc_usdt_wallet) {
                groups.push({
                    ...DEFAULT_CONFIG,
                    tenantId: ts.tenantId,
                    WALLET_ADDRESS: cfg.bsc_usdt_wallet,
                    EXCHANGE_RATE: parseFloat(cfg.usdt_exchange_rate) || 7.2,
                    ENABLED: true,
                    API_KEY: ''
                })
            }
        } catch {}
    }
    return groups
}

// ─── BSC RPC 查询余额 ─────────────────────────────────────
async function getUsdtBalance(walletAddress) {
    const balanceOfSelector = '0x70a08231'
    const paddedAddress = walletAddress.replace('0x', '').toLowerCase().padStart(64, '0')
    const data = balanceOfSelector + paddedAddress

    for (const rpcUrl of DEFAULT_CONFIG.BSC_RPC_URLS) {
        try {
            const response = await fetch(rpcUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    method: 'eth_call',
                    params: [{ to: DEFAULT_CONFIG.USDT_CONTRACT, data }, 'latest'],
                    id: 1
                })
            })
            const result = await response.json()
            if (result.result) {
                const balanceWei = BigInt(result.result)
                return Number(balanceWei) / 1e18
            }
        } catch { continue }
    }
    throw new Error('所有BSC RPC节点查询余额均失败')
}

// ─── Etherscan API V2 查询交易（仅主站启用 API_KEY 时使用）─
async function getRecentTransactionsViaApi(walletAddress, apiKey, limit = 50) {
    if (!apiKey || !walletAddress) return null
    try {
        const url = `https://api.etherscan.io/v2/api?chainid=56&module=account&action=tokentx&contractaddress=${DEFAULT_CONFIG.USDT_CONTRACT}&address=${walletAddress}&page=1&offset=${limit}&sort=desc&apikey=${apiKey}`
        const response = await fetch(url, { headers: { 'Accept': 'application/json' } })
        if (!response.ok) return null
        const data = await response.json()
        if (data.status === '1' && data.message === 'OK') return data.result || []
        return null
    } catch { return null }
}

// ─── 工具函数 ─────────────────────────────────────────────
async function cnyToUsdt(cnyAmount, exchangeRate) {
    const rate = exchangeRate || (await getMainConfig()).EXCHANGE_RATE
    return parseFloat((cnyAmount / rate).toFixed(DEFAULT_CONFIG.AMOUNT_PRECISION))
}

async function generateUniqueAmount(baseAmount, tenantId = null) {
    const where = {
        status: 'PENDING',
        paymentMethod: 'bsc_usdt',
        ...(tenantId === null ? { tenantId: null } : { tenantId })
    }
    const pendingOrders = await prisma.order.findMany({ where, select: { bscUsdtAmount: true } })
    const usedAmounts = new Set(pendingOrders.map(o => o.bscUsdtAmount?.toString()))

    for (let i = 0; i < 100; i++) {
        const offset = (i % 2 === 0 ? 1 : -1) * Math.floor(i / 2 + 1) * 0.01
        const uniqueAmount = parseFloat((baseAmount + offset).toFixed(DEFAULT_CONFIG.AMOUNT_PRECISION))
        if (uniqueAmount > 0 && !usedAmounts.has(uniqueAmount.toString())) return uniqueAmount
    }
    return baseAmount
}

// ─── 生成支付信息 ─────────────────────────────────────────
async function createBscUsdtPayment(order, overrideConfig = null) {
    const config = overrideConfig
        ? { ...DEFAULT_CONFIG, ...overrideConfig }
        : await getMainConfig()

    if (!config.WALLET_ADDRESS) throw new Error('BSC USDT收款地址未配置')

    const baseUsdt = await cnyToUsdt(parseFloat(order.totalAmount), config.EXCHANGE_RATE)
    const usdtAmount = await generateUniqueAmount(baseUsdt, order.tenantId || null)

    await prisma.order.update({
        where: { id: order.id },
        data: { bscUsdtAmount: usdtAmount, paymentMethod: 'bsc_usdt' }
    })

    const qrContent = `ethereum:${config.WALLET_ADDRESS}?contractAddress=${DEFAULT_CONFIG.USDT_CONTRACT}&value=${usdtAmount}`
    return {
        walletAddress: config.WALLET_ADDRESS,
        usdtAmount,
        qrContent,
        exchangeRate: config.EXCHANGE_RATE
    }
}

// ─── 检查单个钱包组 ───────────────────────────────────────
async function checkGroup(group) {
    if (!group.ENABLED || !group.WALLET_ADDRESS) return

    const where = {
        status: 'PENDING',
        paymentMethod: 'bsc_usdt',
        bscUsdtAmount: { not: null },
        ...(group.tenantId === null ? { tenantId: null } : { tenantId: group.tenantId })
    }
    const pendingOrders = await prisma.order.findMany({ where, include: { payment: true } })
    if (pendingOrders.length === 0) return

    // API 模式（如果配置了 API_KEY）
    const apiTransactions = group.API_KEY
        ? await getRecentTransactionsViaApi(group.WALLET_ADDRESS, group.API_KEY)
        : null

    if (apiTransactions !== null && apiTransactions.length > 0) {
        await matchTransactionsFromApi(apiTransactions, pendingOrders, group)
        return
    }

    // 余额变化检测模式
    await checkBalanceChange(pendingOrders, group)
}

// API 模式：精确匹配交易
async function matchTransactionsFromApi(transactions, pendingOrders, group) {
    for (const tx of transactions) {
        if (tx.to.toLowerCase() !== group.WALLET_ADDRESS.toLowerCase()) continue
        const txAmount = parseFloat(tx.value) / 1e18

        const matched = pendingOrders.find(o => Math.abs(parseFloat(o.bscUsdtAmount) - txAmount) < 0.001)
        if (!matched) continue

        const existing = await prisma.payment.findFirst({ where: { tradeNo: tx.hash } })
        if (existing) continue

        logger.info(`BSC USDT支付匹配成功(API模式 tenant=${group.tenantId || 'main'}): 订单 ${matched.orderNo}, 金额 ${txAmount} USDT, 交易 ${tx.hash}`)
        await processBscUsdtPaymentSuccess(matched, tx.hash, txAmount)
    }
}

// 余额变化检测模式
async function checkBalanceChange(pendingOrders, group) {
    try {
        const currentBalance = await getUsdtBalance(group.WALLET_ADDRESS)
        const lastBalance = lastKnownBalances.get(group.WALLET_ADDRESS)

        if (lastBalance === undefined) {
            lastKnownBalances.set(group.WALLET_ADDRESS, currentBalance)
            logger.info(`BSC USDT钱包初始余额 (tenant=${group.tenantId || 'main'}): ${currentBalance} USDT`)
            return
        }

        const balanceDiff = currentBalance - lastBalance
        if (balanceDiff <= 0) return

        logger.info(`BSC USDT余额变化 (tenant=${group.tenantId || 'main'}): +${balanceDiff.toFixed(6)} USDT`)

        // 单笔精确匹配
        const singleMatch = pendingOrders.find(o => Math.abs(parseFloat(o.bscUsdtAmount) - balanceDiff) < 0.01)
        if (singleMatch) {
            const virtualTxId = `bsc_balance_${Date.now()}_${singleMatch.orderNo}`
            logger.info(`BSC USDT支付匹配成功(单笔): 订单 ${singleMatch.orderNo}, 余额增加 ${balanceDiff.toFixed(6)} USDT`)
            await processBscUsdtPaymentSuccess(singleMatch, virtualTxId, parseFloat(singleMatch.bscUsdtAmount))
            lastKnownBalances.set(group.WALLET_ADDRESS, currentBalance)
            return
        }

        // 多笔组合匹配
        const ordersToMatch = pendingOrders.slice(0, 10)
        const matchedCombination = findMatchingCombination(ordersToMatch, balanceDiff)
        if (matchedCombination && matchedCombination.length > 0) {
            logger.info(`BSC USDT多笔组合匹配成功: ${matchedCombination.length} 笔订单, 总计 ${balanceDiff.toFixed(6)} USDT`)
            for (const order of matchedCombination) {
                const virtualTxId = `bsc_balance_${Date.now()}_${order.orderNo}`
                await processBscUsdtPaymentSuccess(order, virtualTxId, parseFloat(order.bscUsdtAmount))
            }
        } else {
            logger.info(`BSC USDT余额增加 ${balanceDiff.toFixed(6)} USDT，但未找到匹配订单`)
        }

        lastKnownBalances.set(group.WALLET_ADDRESS, currentBalance)
    } catch (error) {
        logger.error(`BSC USDT余额检测失败 (tenant=${group.tenantId || 'main'}):`, error)
    }
}

function findMatchingCombination(orders, targetAmount) {
    const n = orders.length
    if (n === 0) return null
    const totalSubsets = 1 << n
    for (let size = 2; size <= n; size++) {
        for (let mask = 0; mask < totalSubsets; mask++) {
            if (countBits(mask) !== size) continue
            let sum = 0
            const subset = []
            for (let i = 0; i < n; i++) {
                if (mask & (1 << i)) {
                    sum += parseFloat(orders[i].bscUsdtAmount)
                    subset.push(orders[i])
                }
            }
            if (Math.abs(sum - targetAmount) < 0.01 * size) return subset
        }
    }
    return null
}

function countBits(n) {
    let count = 0
    while (n) { count += n & 1; n >>= 1 }
    return count
}

// ─── 入口：遍历所有钱包组 ─────────────────────────────────
async function checkBscUsdtPayments() {
    try {
        const groups = await getAllWalletGroups()
        for (const group of groups) {
            try { await checkGroup(group) }
            catch (e) { logger.error(`BSC USDT 检查失败 (tenant=${group.tenantId || 'main'}):`, e) }
        }
    } catch (error) {
        logger.error('BSC USDT支付轮询失败:', error)
    }
}

// ─── 处理支付成功 ─────────────────────────────────────────
async function processBscUsdtPaymentSuccess(order, txHash, usdtAmount) {
    const { dispenseCards } = require('../controllers/cardController')

    await prisma.$transaction(async (tx) => {
        await tx.payment.upsert({
            where: { orderId: order.id },
            create: { orderId: order.id, paymentMethod: 'bsc_usdt', amount: order.totalAmount, tradeNo: txHash, status: 'SUCCESS' },
            update: { status: 'SUCCESS', tradeNo: txHash }
        })
        await tx.order.update({
            where: { id: order.id },
            data: { status: 'PAID', paymentNo: txHash, paidAt: new Date() }
        })
    })

    let cards = []
    try {
        cards = await dispenseCards(order.id, order.productId, order.quantity, order.variantId)
        await prisma.order.update({
            where: { id: order.id },
            data: { status: 'COMPLETED', completedAt: new Date() }
        })
        logger.info(`BSC USDT订单 ${order.orderNo} 卡密发放成功`)
    } catch (error) {
        logger.error(`BSC USDT订单 ${order.orderNo} 卡密发放失败:`, error)
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
                    logger.info(`BSC USDT分站订单 ${order.orderNo} 已通知代理商 ${agentEmail}`)
                }
            } else {
                await emailService.sendOrderCompletedEmail(fullOrder, fullOrder.cards)
                logger.info(`BSC USDT订单 ${order.orderNo} 邮件通知已发送`)
            }

            const { notifyOrderPaid } = require('./notifyDispatcher')
            notifyOrderPaid(fullOrder).catch(e => logger.error('管理员通知失败:', e))
        } catch (error) {
            logger.error(`BSC USDT订单 ${order.orderNo} 邮件发送失败:`, error)
        }
    } else {
        logger.info(`BSC USDT订单 ${order.orderNo} 无卡密，等待管理员手动发货后发送邮件`)
        const { notifyPendingShip } = require('./notifyDispatcher')
        notifyPendingShip(order).catch(e => logger.error('管理员通知失败:', e))
    }
}

// ─── 启动/停止轮询 ────────────────────────────────────────
let pollingInterval = null

function startPolling() {
    if (pollingInterval) return
    logger.info('BSC USDT支付监控已启动（多租户模式）')
    pollingInterval = setInterval(checkBscUsdtPayments, DEFAULT_CONFIG.POLL_INTERVAL)
    checkBscUsdtPayments()
}

function stopPolling() {
    if (pollingInterval) {
        clearInterval(pollingInterval)
        pollingInterval = null
        logger.info('BSC USDT支付监控已停止')
    }
}

module.exports = {
    getConfig, cnyToUsdt, createBscUsdtPayment, checkBscUsdtPayments,
    getAllWalletGroups, startPolling, stopPolling
}

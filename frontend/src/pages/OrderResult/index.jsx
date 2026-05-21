import { useState, useEffect } from 'react'
import { usePageTitle } from '../../hooks/usePageTitle'
import { useParams, Link } from 'react-router-dom'
import { FiCheck, FiClock, FiCopy, FiPackage, FiAlertCircle, FiRefreshCw } from 'react-icons/fi'
import { useTranslation } from 'react-i18next'
import { useStorefront, useStorefrontPath } from '../../store/storefrontStore'
import { formatPrice } from '../../utils/currencyFormat'
import toast from 'react-hot-toast'
import './OrderResult.css'

const statusConfig = {
    pending: { icon: FiClock, color: 'warning' },
    paid: { icon: FiCheck, color: 'info' },
    completed: { icon: FiCheck, color: 'success' },
    cancelled: { icon: FiAlertCircle, color: 'error' },
    refunding: { icon: FiRefreshCw, color: 'refunding' },
    refunded: { icon: FiRefreshCw, color: 'refunded' },
}

function OrderResult() {
    const { t } = useTranslation()
    usePageTitle(t('order.title'))
    const { orderNo } = useParams()
    const { withPrefix } = useStorefrontPath()
    const storefront = useStorefront()
    const currency = storefront?.currency || 'CNY'
    const [order, setOrder] = useState(null)
    const [loading, setLoading] = useState(true)
    const [showCards, setShowCards] = useState(false)
    const [paying, setPaying] = useState(false)

    const fetchOrder = async () => {
        setLoading(true)
        try {
            const url = storefront?.slug
                ? `/api/orders/${orderNo}?slug=${storefront.slug}`
                : `/api/orders/${orderNo}`
            const res = await fetch(url)
            const data = await res.json()

            if (data.error || !data.order) {
                setOrder(null)
            } else {
                const orderData = data.order
                setOrder({
                    orderNo: orderData.orderNo,
                    status: orderData.status?.toLowerCase() || 'pending',
                    email: orderData.email,
                    product: {
                        name: orderData.productName || orderData.product?.name,
                        image: orderData.product?.image || 'https://via.placeholder.com/200x150',
                    },
                    quantity: orderData.quantity,
                    totalAmount: parseFloat(orderData.totalAmount) || 0,
                    paymentMethod: orderData.paymentMethod === 'alipay' ? 'Alipay' :
                        orderData.paymentMethod === 'wechat' ? 'WeChat Pay' :
                            orderData.paymentMethod === 'bsc_usdt' ? 'USDT-BEP20' :
                                orderData.paymentMethod === 'yipay' ? '在线支付' : orderData.paymentMethod,
                    createdAt: orderData.createdAt ? new Date(orderData.createdAt).toLocaleString() : '',
                    paidAt: orderData.paidAt ? new Date(orderData.paidAt).toLocaleString() : null,
                    cards: (orderData.cards || []).map((c, idx) => ({
                        id: idx + 1,
                        content: c.content || c
                    })),
                    deliveryNote: orderData.deliveryNote || null
                })
            }
        } catch (error) {
            console.error('fetchOrder failed:', error)
            setOrder(null)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (orderNo) fetchOrder()
    }, [orderNo])

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text).then(() => {
            toast.success(t('order.copied'))
        }).catch(() => {
            toast.error(t('order.copyFailed'))
        })
    }

    const [qrCodeUrl, setQrCodeUrl] = useState(null)
    const [usdtPayment, setUsdtPayment] = useState(null)
    const [countdown, setCountdown] = useState(null) // 倒计时秒数
    const ORDER_TIMEOUT_MINUTES = 15 // 订单超时时间（分钟）

    // 订单倒计时
    useEffect(() => {
        if (!order || order.status !== 'pending') {
            setCountdown(null)
            return
        }

        const calculateRemaining = () => {
            const createdAt = new Date(order.createdAt).getTime()
            const expireAt = createdAt + ORDER_TIMEOUT_MINUTES * 60 * 1000
            const remaining = Math.max(0, Math.floor((expireAt - Date.now()) / 1000))
            return remaining
        }

        setCountdown(calculateRemaining())

        const timer = setInterval(() => {
            const remaining = calculateRemaining()
            setCountdown(remaining)

            if (remaining <= 0) {
                clearInterval(timer)
                // 订单已过期，刷新页面获取最新状态
                fetchOrder()
            }
        }, 1000)

        return () => clearInterval(timer)
    }, [order])

    // 格式化倒计时显示
    const formatCountdown = (seconds) => {
        if (seconds === null || seconds <= 0) return t('order.expired')
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    // 轮询支付状态 - 当显示二维码或USDT支付时启动
    useEffect(() => {
        // 判断是否是 USDT/BSC_USDT 待支付订单（即使页面刷新也要继续轮询）
        const isUsdtPending = order?.status === 'pending' &&
            (order?.paymentMethod === 'USDT-TRC20' || order?.paymentMethod === 'USDT-BEP20' ||
                order?.paymentMethod === 'usdt' || order?.paymentMethod === 'bsc_usdt')

        // 只有显示支付信息并且订单状态为待支付时才轮询
        if ((!qrCodeUrl && !usdtPayment && !isUsdtPending) || order?.status !== 'pending') {
            return
        }

        const interval = setInterval(async () => {
            try {
                const res = await fetch(`/api/payment/status/${order.orderNo}`)
                const data = await res.json()
                if (data.orderStatus === 'paid' || data.orderStatus === 'completed') {
                    setQrCodeUrl(null)
                    toast.success(t('order.paySuccess'))
                    // 刷新订单信息
                    window.location.reload()
                }
            } catch (error) {
                console.error('轮询支付状态失败:', error)
            }
        }, 3000) // 每3秒检查一次

        return () => clearInterval(interval)
    }, [qrCodeUrl, usdtPayment, order?.orderNo, order?.status, order?.paymentMethod])

    // 订单待支付时自动生成二维码
    useEffect(() => {
        if (order?.status === 'pending' && !qrCodeUrl && !paying) {
            handlePayment()
        }
    }, [order?.status])

    const handlePayment = async () => {
        if (!order || paying) return
        setPaying(true)
        try {
            // 确定支付方式
            let paymentMethod = 'alipay'
            if (order.paymentMethod === 'WeChat Pay') {
                paymentMethod = 'wechat'
            } else if (order.paymentMethod === 'USDT-TRC20' || order.paymentMethod === 'usdt') {
                paymentMethod = 'usdt'
            } else if (order.paymentMethod === 'USDT-BEP20' || order.paymentMethod === 'bsc_usdt') {
                paymentMethod = 'bsc_usdt'
            } else if (order.paymentMethod === '在线支付' || order.paymentMethod === 'yipay') {
                paymentMethod = 'yipay'
            }

            const res = await fetch('/api/payment/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderNo: order.orderNo,
                    paymentMethod: paymentMethod
                })
            })
            const data = await res.json()

            if (data.paymentType === 'usdt' || data.paymentType === 'bsc_usdt') {
                // USDT/BSC USDT支付
                setUsdtPayment({
                    type: data.paymentType,
                    walletAddress: data.walletAddress,
                    usdtAmount: data.usdtAmount,
                    qrContent: data.qrContent,
                    exchangeRate: data.exchangeRate
                })
                toast.success(t('order.usdtTransferHint'))
            } else if (data.paymentType === 'qrcode' && data.qrCode) {
                // 支付宝二维码
                setQrCodeUrl(data.qrCode)
                toast.success(t('order.scanAlipay'))
            } else if (data.payUrl) {
                window.location.href = data.payUrl
            } else {
                toast.error(data.error || t('order.payInfoFailed'))
            }
        } catch (error) {
            console.error('支付请求失败:', error)
            toast.error(t('order.payRequestFailed'))
        } finally {
            setPaying(false)
        }
    }

    // 取消支付并更新订单状态
    const cancelPayment = async () => {
        try {
            const res = await fetch(`/api/orders/${order.orderNo}/cancel`, {
                method: 'POST'
            })
            const data = await res.json()
            if (res.ok) {
                toast.success(t('order.cancelSuccess'))
                setQrCodeUrl(null)
                setUsdtPayment(null)
                // 刷新订单状态
                fetchOrder()
            } else {
                toast.error(data.error || t('order.cancelFailed'))
            }
        } catch (error) {
            console.error('取消订单失败:', error)
            toast.error(t('order.cancelFailed'))
        }
    }

    const cancelQrPayment = () => {
        cancelPayment()
    }

    if (loading) {
        return (
            <div className="loading">
                <div className="spinner"></div>
            </div>
        )
    }

    if (!order) {
        return (
            <div className="order-not-found">
                <FiPackage className="not-found-icon" />
                <h2>{t('order.notFound')}</h2>
                <p>{t('order.notFoundDesc', { orderNo })}</p>
                <Link to={withPrefix('/order-query')} className="btn btn-primary">
                    {t('order.queryAgain')}
                </Link>
            </div>
        )
    }

    const status = statusConfig[order.status] || statusConfig.pending
    const StatusIcon = status.icon

    const statusLabelMap = {
        pending: t('order.pending'),
        paid: t('order.paid'),
        completed: t('order.completed'),
        cancelled: t('order.cancelled'),
        refunding: t('order.refunding'),
        refunded: t('order.refunded'),
    }

    return (
        <div className="order-result-page">
            {/* 订单状态 */}
            <div className={`order-status-card status-${status.color}`}>
                <div className="status-icon">
                    <StatusIcon />
                </div>
                <div className="status-info">
                    <h2>{statusLabelMap[order.status] || t('order.pending')}</h2>
                    <p>{t('order.orderNo')}：{order.orderNo}</p>
                </div>
            </div>

            <div className="order-content">
                {/* 商品信息 */}
                <div className="order-section">
                    <h3 className="section-subtitle">{t('order.product')}</h3>
                    <div className="order-product">
                        <img src={order.product.image} alt={order.product.name} />
                        <div className="product-info">
                            <h4>{order.product.name}</h4>
                            <p>{t('order.quantity')}：{order.quantity}</p>
                        </div>
                        <div className="product-amount">
                            {formatPrice(order.totalAmount, currency)}
                        </div>
                    </div>
                </div>

                {/* 卡密信息 */}
                {(order.status === 'completed' || order.status === 'paid') && order.cards.length > 0 && (
                    <div className="order-section cards-section">
                        <div className="section-header">
                            <h3 className="section-subtitle">🎁 {t('order.cardKeys')}</h3>
                            <button
                                className="copy-all-btn"
                                onClick={() => {
                                    const allCards = order.cards.map(c => c.content).join('\n')
                                    copyToClipboard(allCards)
                                }}
                            >
                                <FiCopy /> {t('order.copyAll')}
                            </button>
                        </div>

                        <div className="cards-container">
                            {order.cards.map((card, index) => (
                                <div key={card.id} className="card-item">
                                    <div className="card-index">#{index + 1}</div>
                                    <div className="card-content-wrapper">
                                        <code className="card-content">{card.content}</code>
                                    </div>
                                    <button
                                        className="card-copy-btn"
                                        onClick={() => copyToClipboard(card.content)}
                                        title={t('order.copy')}
                                    >
                                        <FiCopy />
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div className="cards-footer">
                            <div className="cards-count">
                                {order.cards.length} {t('order.cardsCount')}
                            </div>
                            <div className="cards-warning">
                                ⚠️ {t('order.cardsKeepSafe')}
                            </div>
                        </div>
                    </div>
                )}

                {/* 发货备注 */}
                {(order.status === 'completed' || order.status === 'paid') && order.deliveryNote && (
                    <div className="order-section delivery-note-section">
                        <div className="delivery-note-card">
                            <div className="delivery-note-icon">📋</div>
                            <div className="delivery-note-content">
                                <h4>{t('order.merchantNote')}</h4>
                                <p>{order.deliveryNote}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* 已完成但没有卡密（卡密发放中） */}
                {(order.status === 'completed' || order.status === 'paid') && order.cards.length === 0 && (
                    <div className="order-section cards-pending-section">
                        <div className="cards-pending-notice">
                            <FiClock />
                            <div>
                                <h4>{t('order.cardsDelivering')}</h4>
                                <p>{t('order.cardsDeliveringDesc')}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* 待支付提示 */}
                {order.status === 'pending' && (
                    <div className="order-section pending-section">
                        {usdtPayment ? (
                            /* USDT支付区域 */
                            <div className="usdt-payment-section">
                                <h4>{usdtPayment.type === 'bsc_usdt' ? '🟡 USDT-BEP20' : '💎 USDT-TRC20'}</h4>

                                <div className="usdt-amount-display">
                                    <span className="amount-label">{t('order.pleaseTransfer')}</span>
                                    <span className="usdt-amount">{usdtPayment.usdtAmount} USDT</span>
                                    <button
                                        className="copy-amount-btn"
                                        onClick={() => copyToClipboard(usdtPayment.usdtAmount.toString())}
                                    >
                                        <FiCopy /> {t('order.copy')}
                                    </button>
                                </div>

                                <div className="usdt-address-section">
                                    <label>{t('order.receivingAddress')} ({usdtPayment.type === 'bsc_usdt' ? 'BEP20/BSC' : 'TRC20/TRON'})</label>
                                    <div className="address-box">
                                        <code>{usdtPayment.walletAddress}</code>
                                        <button
                                            className="copy-btn"
                                            onClick={() => copyToClipboard(usdtPayment.walletAddress)}
                                        >
                                            <FiCopy />
                                        </button>
                                    </div>
                                </div>

                                <div className="usdt-qr-container">
                                    <img
                                        src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(usdtPayment.walletAddress)}`}
                                        alt="USDT QR"
                                        className="usdt-qr-image"
                                    />
                                </div>

                                <div className="usdt-info">
                                    <p>{t('order.exchangeRate')}：1 USDT = {formatPrice(usdtPayment.exchangeRate, currency)}</p>
                                    <p>{t('order.originalAmount')}：{formatPrice(order.totalAmount, currency)}</p>
                                </div>

                                <div className="usdt-warning">
                                    ⚠️ {t('order.usdtWarning', { amount: usdtPayment.usdtAmount })}
                                </div>

                                <div className={`payment-countdown ${countdown !== null && countdown <= 60 ? 'urgent' : ''}`}>
                                    <span className="countdown-icon">⏱️</span>
                                    <span>{t('order.countdown')}:</span>
                                    <span className="countdown-time">{formatCountdown(countdown)}</span>
                                </div>

                                <button
                                    className="btn btn-secondary"
                                    onClick={cancelPayment}
                                >
                                    {t('order.cancelOrder')}
                                </button>
                            </div>
                        ) : qrCodeUrl ? (
                            /* 二维码支付区域 */
                            <div className="qr-payment-section">
                                <h4>{t('order.scanAlipay')}</h4>
                                <div className="qr-code-container">
                                    <img
                                        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCodeUrl)}`}
                                        alt={t('order.scanToPay')}
                                        className="qr-code-image"
                                    />
                                </div>
                                <p className="qr-amount">{t('order.payAmount')}：<strong>{formatPrice(order.totalAmount, currency)}</strong></p>
                                <p className="qr-hint">{t('order.autoUpdateAfterPay')}</p>
                                <div className={`payment-countdown ${countdown !== null && countdown <= 60 ? 'urgent' : ''}`}>
                                    <span className="countdown-icon">⏱️</span>
                                    <span>{t('order.countdown')}:</span>
                                    <span className="countdown-time">{formatCountdown(countdown)}</span>
                                </div>
                                <button
                                    className="btn btn-secondary"
                                    onClick={cancelQrPayment}
                                >
                                    {t('order.cancelOrder')}
                                </button>
                            </div>
                        ) : (
                            /* 默认待支付区域 */
                            <>
                                <div className="pending-notice">
                                    <FiClock />
                                    <div>
                                        <h4>{t('order.orderPending')}</h4>
                                        <p>{t('order.pendingDesc')}</p>
                                    </div>
                                </div>
                                <button
                                    className="btn btn-primary btn-lg pay-now-btn"
                                    onClick={handlePayment}
                                    disabled={paying}
                                >
                                    {paying ? t('order.generating') : `${t('order.payNow')} ${formatPrice(order.totalAmount, currency)}`}
                                </button>
                            </>
                        )}
                    </div>
                )}

                {/* 已取消提示 */}
                {order.status === 'cancelled' && (
                    <div className="order-section cancelled-section">
                        <div className="cancelled-notice">
                            <FiAlertCircle />
                            <div>
                                <h4>{t('order.orderCancelled')}</h4>
                                <p>{t('order.cancelledDesc')}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* 退款中提示 */}
                {order.status === 'refunding' && (
                    <div className="order-section refunding-section">
                        <div className="refunding-notice">
                            <FiRefreshCw />
                            <div>
                                <h4>{t('order.refundingTitle')}</h4>
                                <p>{t('order.refundingDesc')}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* 已退款提示 */}
                {order.status === 'refunded' && (
                    <div className="order-section refunded-section">
                        <div className="refunded-notice">
                            <FiRefreshCw />
                            <div>
                                <h4>{t('order.refundedTitle')}</h4>
                                <p>{t('order.refundedDesc')}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* 订单详情 */}
                <div className="order-section">
                    <h3 className="section-subtitle">{t('order.title')}</h3>
                    <div className="order-details">
                        <div className="detail-row">
                            <span>{t('order.orderNo')}</span>
                            <span>{order.orderNo}</span>
                        </div>
                        <div className="detail-row">
                            <span>{t('order.email')}</span>
                            <span>{order.email}</span>
                        </div>
                        <div className="detail-row">
                            <span>{t('order.paymentMethod')}</span>
                            <span>{order.paymentMethod}</span>
                        </div>
                        <div className="detail-row">
                            <span>{t('order.createdAt')}</span>
                            <span>{order.createdAt}</span>
                        </div>
                        {order.paidAt && (
                            <div className="detail-row">
                                <span>{t('order.paidAt')}</span>
                                <span>{order.paidAt}</span>
                            </div>
                        )}
                        <div className="detail-row total">
                            <span>{t('order.amount')}</span>
                            <span>{formatPrice(order.totalAmount, currency)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* 底部操作 */}
            <div className="order-actions">
                <Link to={withPrefix('/order-query')} className="btn btn-secondary">
                    {t('order.viewOrder')}
                </Link>
                <Link to={withPrefix('/')} className="btn btn-primary">
                    {t('order.backToShop')}
                </Link>
            </div>
        </div>
    )
}

export default OrderResult

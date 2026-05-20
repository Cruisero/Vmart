import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { FiCheck, FiClock, FiCopy, FiPackage, FiAlertCircle, FiRefreshCw } from 'react-icons/fi'
import { useTranslation } from 'react-i18next'
import { useStorefront } from '../../../../store/storefrontStore'
import { getStorefrontBasePath } from '../../../../utils/agentDomain'
import toast from 'react-hot-toast'
import './OrderResult.css'

const ORDER_TIMEOUT_MINUTES = 15

export default function ZenOrderResult() {
    const { t } = useTranslation()
    const { orderNo } = useParams()
    const storefront = useStorefront()
    const prefix = storefront ? getStorefrontBasePath(storefront) : ''
    const [order, setOrder] = useState(null)
    const [loading, setLoading] = useState(true)
    const [paying, setPaying] = useState(false)
    const [qrCodeUrl, setQrCodeUrl] = useState(null)
    const [usdtPayment, setUsdtPayment] = useState(null)
    const [countdown, setCountdown] = useState(null)

    const statusConfig = {
        pending:   { label: t('order.pending'),   icon: FiClock,        bg: '#FEF3C7', iconBg: '#FDE68A', iconColor: '#D97706', border: '#FCD34D' },
        paid:      { label: t('order.paid'),      icon: FiCheck,        bg: '#EFF6FF', iconBg: '#DBEAFE', iconColor: '#2563EB', border: '#BFDBFE' },
        completed: { label: t('order.completed'), icon: FiCheck,        bg: '#ECFDF5', iconBg: '#D1FAE5', iconColor: '#059669', border: '#A7F3D0' },
        cancelled: { label: t('order.cancelled'), icon: FiAlertCircle,  bg: '#FEF2F2', iconBg: '#FEE2E2', iconColor: '#DC2626', border: '#FECACA' },
        refunded:  { label: t('order.refunded'),  icon: FiRefreshCw,    bg: '#F5F3FF', iconBg: '#EDE9FE', iconColor: '#B91C1C', border: '#DDD6FE' },
    }

    const fetchOrder = async () => {
        setLoading(true)
        try {
            const url = storefront?.slug ? `/api/orders/${orderNo}?slug=${storefront.slug}` : `/api/orders/${orderNo}`
            const res = await fetch(url)
            const data = await res.json()
            if (data.error || !data.order) { setOrder(null); return }
            const o = data.order
            setOrder({
                orderNo: o.orderNo,
                status: o.status?.toLowerCase() || 'pending',
                email: o.email,
                product: { name: o.productName || o.product?.name, image: o.product?.image || null },
                quantity: o.quantity,
                totalAmount: parseFloat(o.totalAmount) || 0,
                paymentMethod: o.paymentMethod === 'alipay' ? 'Alipay' :
                    o.paymentMethod === 'wechat' ? 'WeChat Pay' :
                    o.paymentMethod === 'bsc_usdt' ? 'USDT-BEP20' : o.paymentMethod,
                createdAt: o.createdAt ? new Date(o.createdAt).toLocaleString() : '',
                paidAt: o.paidAt ? new Date(o.paidAt).toLocaleString() : null,
                cards: (o.cards || []).map((c, i) => ({ id: i + 1, content: c.content || c })),
                deliveryNote: o.deliveryNote || null,
            })
        } catch {
            setOrder(null)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { if (orderNo) fetchOrder() }, [orderNo])

    // Countdown
    useEffect(() => {
        if (!order || order.status !== 'pending') { setCountdown(null); return }
        const calc = () => {
            const exp = new Date(order.createdAt).getTime() + ORDER_TIMEOUT_MINUTES * 60000
            return Math.max(0, Math.floor((exp - Date.now()) / 1000))
        }
        setCountdown(calc())
        const t = setInterval(() => {
            const r = calc()
            setCountdown(r)
            if (r <= 0) { clearInterval(t); fetchOrder() }
        }, 1000)
        return () => clearInterval(t)
    }, [order?.createdAt, order?.status])

    const formatCountdown = (s) => {
        if (s === null || s <= 0) return t('order.expired')
        return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`
    }

    // Polling when QR / USDT shown
    useEffect(() => {
        const isUsdtPending = order?.status === 'pending' &&
            ['USDT-TRC20','USDT-BEP20','usdt','bsc_usdt'].includes(order?.paymentMethod)
        if ((!qrCodeUrl && !usdtPayment && !isUsdtPending) || order?.status !== 'pending') return
        const iv = setInterval(async () => {
            try {
                const res = await fetch(`/api/payment/status/${order.orderNo}`)
                const data = await res.json()
                if (data.orderStatus === 'paid' || data.orderStatus === 'completed') {
                    setQrCodeUrl(null); toast.success(t('common.success')); window.location.reload()
                }
            } catch {}
        }, 3000)
        return () => clearInterval(iv)
    }, [qrCodeUrl, usdtPayment, order?.orderNo, order?.status, order?.paymentMethod])

    // Auto-trigger payment
    useEffect(() => {
        if (order?.status === 'pending' && !qrCodeUrl && !paying) handlePayment()
    }, [order?.status])

    const handlePayment = async () => {
        if (!order || paying) return
        setPaying(true)
        try {
            let method = 'alipay'
            if (order.paymentMethod === 'WeChat Pay') method = 'wechat'
            else if (['USDT-TRC20','usdt'].includes(order.paymentMethod)) method = 'usdt'
            else if (['USDT-BEP20','bsc_usdt'].includes(order.paymentMethod)) method = 'bsc_usdt'

            const res = await fetch('/api/payment/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderNo: order.orderNo, paymentMethod: method })
            })
            const data = await res.json()

            if (data.paymentType === 'usdt' || data.paymentType === 'bsc_usdt') {
                setUsdtPayment({ type: data.paymentType, walletAddress: data.walletAddress,
                    usdtAmount: data.usdtAmount, exchangeRate: data.exchangeRate })
                toast.success('Please send USDT to the wallet address')
            } else if (data.paymentType === 'qrcode' && data.qrCode) {
                setQrCodeUrl(data.qrCode)
                toast.success(t('order.scanToPay'))
            } else if (data.payUrl) {
                window.location.href = data.payUrl
            } else {
                toast.error(data.error || t('common.failed'))
            }
        } catch {
            toast.error(t('common.networkError'))
        } finally {
            setPaying(false)
        }
    }

    const cancelPayment = async () => {
        try {
            const res = await fetch(`/api/orders/${order.orderNo}/cancel`, { method: 'POST' })
            const data = await res.json()
            if (res.ok) {
                toast.success(t('order.cancelSuccess'))
                setQrCodeUrl(null); setUsdtPayment(null)
                fetchOrder()
            } else {
                toast.error(data.error || t('common.failed'))
            }
        } catch {
            toast.error(t('common.failed'))
        }
    }

    const copy = (text) => navigator.clipboard.writeText(text)
        .then(() => toast.success(t('order.copied')))
        .catch(() => toast.error(t('common.failed')))

    if (loading) return (
        <div className="for-page">
            <div className="for-loading"><div className="for-spinner" /></div>
        </div>
    )

    if (!order) return (
        <div className="for-page">
            <div className="for-empty">
                <FiPackage size={48} style={{ color: '#D1D5DB', marginBottom: 16 }} />
                <h2>{t('orderQuery.notFound')}</h2>
                <p>{orderNo}</p>
                <Link to={`${prefix}/order-query`} className="for-btn-outline">{t('orderQuery.query')}</Link>
            </div>
        </div>
    )

    const sc = statusConfig[order.status] || statusConfig.pending
    const StatusIcon = sc.icon

    return (
        <div className="for-page">
            {/* ── Pending: payment ── */}
            {order.status === 'pending' && (
                <div className="for-card">
                    {usdtPayment ? (
                        <div className="for-usdt">
                            <div className="for-usdt-title">
                                {usdtPayment.type === 'bsc_usdt' ? '🟡 USDT-BEP20' : '💎 USDT-TRC20'}
                            </div>
                            <div className="for-usdt-amount">
                                <span className="for-usdt-label">Amount</span>
                                <span className="for-usdt-val">{usdtPayment.usdtAmount} USDT</span>
                                <button className="for-copy-sm" onClick={() => copy(usdtPayment.usdtAmount.toString())}>
                                    <FiCopy size={12} /> {t('order.copy')}
                                </button>
                            </div>
                            <div className="for-addr-label">
                                Address ({usdtPayment.type === 'bsc_usdt' ? 'BEP20/BSC' : 'TRC20/TRON'})
                            </div>
                            <div className="for-addr-box">
                                <code>{usdtPayment.walletAddress}</code>
                                <button className="for-copy-icon" onClick={() => copy(usdtPayment.walletAddress)}>
                                    <FiCopy size={14} />
                                </button>
                            </div>
                            <div className="for-qr-wrap">
                                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(usdtPayment.walletAddress)}`} alt="QR" />
                            </div>
                            <div className="for-usdt-info">Rate: 1 USDT = ¥{usdtPayment.exchangeRate} · ¥{order.totalAmount.toFixed(2)}</div>
                            <div className="for-usdt-warn">
                                ⚠️ Please send exactly <strong>{usdtPayment.usdtAmount} USDT</strong> for auto-confirmation
                            </div>
                            {countdown !== null && (
                                <div className={`for-countdown${countdown <= 60 ? ' urgent' : ''}`}>
                                    <FiClock size={14} /> {t('order.countdown')}: <strong>{formatCountdown(countdown)}</strong>
                                </div>
                            )}
                            <button className="for-btn-ghost" onClick={cancelPayment}>{t('order.cancelOrder')}</button>
                        </div>
                    ) : qrCodeUrl ? (
                        <div className="for-qr-section">
                            <div className="for-qr-title">{t('order.scanToPay')}</div>
                            <div className="for-qr-box">
                                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCodeUrl)}`} alt="QR" />
                            </div>
                            <div className="for-qr-amount">¥{order.totalAmount.toFixed(2)}</div>
                            <div className="for-qr-hint">{t('order.scanToPay')}</div>
                            {countdown !== null && (
                                <div className={`for-countdown${countdown <= 60 ? ' urgent' : ''}`}>
                                    <FiClock size={14} /> {t('order.countdown')}: <strong>{formatCountdown(countdown)}</strong>
                                </div>
                            )}
                            <button className="for-btn-ghost" onClick={cancelPayment}>{t('order.cancelOrder')}</button>
                        </div>
                    ) : (
                        <div className="for-pending-default">
                            <div className="for-pending-notice">
                                <FiClock size={18} style={{ color: '#D97706', flexShrink: 0 }} />
                                <div>
                                    <div className="for-pn-title">{t('order.pending')}</div>
                                    <div className="for-pn-sub">{t('order.countdown')}</div>
                                </div>
                            </div>
                            <button className="for-pay-btn" onClick={handlePayment} disabled={paying}>
                                {paying ? t('checkout.submitting') : `${t('checkout.payNow')} ¥${order.totalAmount.toFixed(2)}`}
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* ── Cards (completed / paid) ── */}
            {(order.status === 'completed' || order.status === 'paid') && order.cards.length > 0 && (
                <div className="for-card">
                    <div className="for-card-header">
                        <div className="for-card-title">🎁 {t('order.cardKeys')}</div>
                        <button className="for-copy-all" onClick={() => copy(order.cards.map(c => c.content).join('\n'))}>
                            <FiCopy size={12} /> {t('order.copyAll')}
                        </button>
                    </div>
                    <div className="for-cards-list">
                        {order.cards.map((card, i) => (
                            <div key={card.id} className="for-card-item">
                                <div className="for-card-idx">#{i + 1}</div>
                                <code className="for-card-content">{card.content}</code>
                                <button className="for-copy-icon" onClick={() => copy(card.content)} title={t('order.copy')}>
                                    <FiCopy size={13} />
                                </button>
                            </div>
                        ))}
                    </div>
                    <div className="for-cards-footer">
                        <span><strong>{order.cards.length}</strong> {t('order.cardKeys')}</span>
                    </div>
                </div>
            )}

            {/* Cancelled */}
            {order.status === 'cancelled' && (
                <div className="for-card for-status-notice cancelled">
                    <FiAlertCircle size={20} />
                    <div>
                        <div className="for-pn-title">{t('order.cancelled')}</div>
                    </div>
                </div>
            )}

            {/* Refunded */}
            {order.status === 'refunded' && (
                <div className="for-card for-status-notice refunded">
                    <FiRefreshCw size={20} />
                    <div>
                        <div className="for-pn-title">{t('order.refunded')}</div>
                    </div>
                </div>
            )}

            {/* ── Product info ── */}
            <div className="for-card">
                <div className="for-card-title" style={{ marginBottom: 16 }}>{t('checkout.productInfo')}</div>
                <div className="for-product-row">
                    {order.product.image
                        ? <img className="for-product-img" src={order.product.image} alt={order.product.name} />
                        : <div className="for-product-img for-product-placeholder">📦</div>
                    }
                    <div className="for-product-info">
                        <div className="for-product-name">{order.product.name}</div>
                        <div className="for-product-qty">{t('checkout.quantity')}: {order.quantity}</div>
                    </div>
                    <div className="for-product-price">¥{order.totalAmount.toFixed(2)}</div>
                </div>
            </div>

            {/* Delivery note */}
            {(order.status === 'completed' || order.status === 'paid') && order.deliveryNote && (
                <div className="for-card for-note-card">
                    <span className="for-note-icon">📋</span>
                    <div>
                        <div className="for-note-title">📋</div>
                        <div className="for-note-body">{order.deliveryNote}</div>
                    </div>
                </div>
            )}

            {/* Cards pending */}
            {(order.status === 'completed' || order.status === 'paid') && order.cards.length === 0 && (
                <div className="for-card for-cards-pending">
                    <FiClock size={20} style={{ color: '#059669' }} />
                    <div>
                        <div className="for-pn-title" style={{ color: '#065F46' }}>{t('order.cardKeys')}</div>
                    </div>
                </div>
            )}

            {/* ── Order details ── */}
            <div className="for-card">
                <div className="for-card-title" style={{ marginBottom: 16 }}>{t('order.title')}</div>
                <div className="for-details">
                    <div className="for-detail-row">
                        <span className="for-detail-label">{t('order.status')}</span>
                        <span className="for-detail-status" style={{ color: sc.iconColor }}>
                            <StatusIcon size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                            {sc.label}
                        </span>
                    </div>
                    {[
                        [t('order.orderNo'), order.orderNo],
                        [t('checkout.email'), order.email],
                        [t('order.paymentMethod'), order.paymentMethod],
                        [t('order.createdAt'), order.createdAt],
                        ...(order.paidAt ? [[t('order.paidAt'), order.paidAt]] : []),
                        [t('order.amount'), `¥${order.totalAmount.toFixed(2)}`],
                    ].map(([label, val], i, arr) => (
                        <div key={label} className={`for-detail-row${i === arr.length - 1 ? ' last' : ''}`}>
                            <span className="for-detail-label">{label}</span>
                            <span className="for-detail-val">{val}</span>
                        </div>
                    ))}
                </div>
            </div>

        </div>
    )
}

import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { FiCheck, FiClock, FiCopy, FiPackage, FiAlertCircle, FiRefreshCw } from 'react-icons/fi'
import { useStorefront } from '../../../store/storefrontStore'
import { getStorefrontBasePath } from '../../../utils/agentDomain'
import toast from 'react-hot-toast'
import './OrderResult.css'

const statusConfig = {
    pending:   { label: '待支付',  icon: FiClock,        bg: '#FEF3C7', iconBg: '#FDE68A', iconColor: '#D97706', border: '#FCD34D' },
    paid:      { label: '已支付',  icon: FiCheck,        bg: '#EFF6FF', iconBg: '#DBEAFE', iconColor: '#2563EB', border: '#BFDBFE' },
    completed: { label: '已完成',  icon: FiCheck,        bg: '#ECFDF5', iconBg: '#D1FAE5', iconColor: '#059669', border: '#A7F3D0' },
    cancelled: { label: '已取消',  icon: FiAlertCircle,  bg: '#FEF2F2', iconBg: '#FEE2E2', iconColor: '#DC2626', border: '#FECACA' },
    refunded:  { label: '已退款',  icon: FiRefreshCw,    bg: '#F5F3FF', iconBg: '#EDE9FE', iconColor: '#B91C1C', border: '#DDD6FE' },
}

const ORDER_TIMEOUT_MINUTES = 15

export default function FreshOrderResult() {
    const { orderNo } = useParams()
    const storefront = useStorefront()
    const prefix = storefront ? getStorefrontBasePath(storefront) : ''
    const [order, setOrder] = useState(null)
    const [loading, setLoading] = useState(true)
    const [paying, setPaying] = useState(false)
    const [qrCodeUrl, setQrCodeUrl] = useState(null)
    const [usdtPayment, setUsdtPayment] = useState(null)
    const [countdown, setCountdown] = useState(null)

    const fetchOrder = async () => {
        setLoading(true)
        try {
            const res = await fetch(`/api/orders/${orderNo}`)
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
                paymentMethod: o.paymentMethod === 'alipay' ? '支付宝' :
                    o.paymentMethod === 'wechat' ? '微信支付' :
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
        if (s === null || s <= 0) return '已过期'
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
                    setQrCodeUrl(null); toast.success('支付成功！'); window.location.reload()
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
            if (order.paymentMethod === '微信支付') method = 'wechat'
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
                toast.success('请向指定地址转账 USDT')
            } else if (data.paymentType === 'qrcode' && data.qrCode) {
                setQrCodeUrl(data.qrCode)
                toast.success('请使用支付宝扫描二维码支付')
            } else if (data.payUrl) {
                window.location.href = data.payUrl
            } else {
                toast.error(data.error || '获取支付信息失败')
            }
        } catch {
            toast.error('支付请求失败')
        } finally {
            setPaying(false)
        }
    }

    const cancelPayment = async () => {
        try {
            const res = await fetch(`/api/orders/${order.orderNo}/cancel`, { method: 'POST' })
            const data = await res.json()
            if (res.ok) {
                toast.success('订单已取消')
                setQrCodeUrl(null); setUsdtPayment(null)
                fetchOrder()
            } else {
                toast.error(data.error || '取消失败')
            }
        } catch {
            toast.error('取消订单失败')
        }
    }

    const copy = (text) => navigator.clipboard.writeText(text)
        .then(() => toast.success('已复制'))
        .catch(() => toast.error('复制失败'))

    if (loading) return (
        <div className="for-page">
            <div className="for-loading"><div className="for-spinner" /></div>
        </div>
    )

    if (!order) return (
        <div className="for-page">
            <div className="for-empty">
                <FiPackage size={48} style={{ color: '#D1D5DB', marginBottom: 16 }} />
                <h2>订单不存在</h2>
                <p>未找到订单号 {orderNo}</p>
                <Link to={`${prefix}/order-query`} className="for-btn-outline">重新查询</Link>
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
                                {usdtPayment.type === 'bsc_usdt' ? '🟡 USDT-BEP20 支付' : '💎 USDT-TRC20 支付'}
                            </div>
                            <div className="for-usdt-amount">
                                <span className="for-usdt-label">请转账</span>
                                <span className="for-usdt-val">{usdtPayment.usdtAmount} USDT</span>
                                <button className="for-copy-sm" onClick={() => copy(usdtPayment.usdtAmount.toString())}>
                                    <FiCopy size={12} /> 复制
                                </button>
                            </div>
                            <div className="for-addr-label">
                                收款地址（{usdtPayment.type === 'bsc_usdt' ? 'BEP20/BSC' : 'TRC20/波场'}）
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
                            <div className="for-usdt-info">汇率：1 USDT = ¥{usdtPayment.exchangeRate} · 原价 ¥{order.totalAmount.toFixed(2)}</div>
                            <div className="for-usdt-warn">
                                ⚠️ 请务必转账 <strong>{usdtPayment.usdtAmount} USDT</strong>，金额不符将无法自动确认
                            </div>
                            {countdown !== null && (
                                <div className={`for-countdown${countdown <= 60 ? ' urgent' : ''}`}>
                                    <FiClock size={14} /> 支付剩余时间：<strong>{formatCountdown(countdown)}</strong>
                                </div>
                            )}
                            <button className="for-btn-ghost" onClick={cancelPayment}>取消支付</button>
                        </div>
                    ) : qrCodeUrl ? (
                        <div className="for-qr-section">
                            <div className="for-qr-title">请使用支付宝扫码支付</div>
                            <div className="for-qr-box">
                                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCodeUrl)}`} alt="支付二维码" />
                            </div>
                            <div className="for-qr-amount">¥{order.totalAmount.toFixed(2)}</div>
                            <div className="for-qr-hint">扫码后支付状态将自动更新</div>
                            {countdown !== null && (
                                <div className={`for-countdown${countdown <= 60 ? ' urgent' : ''}`}>
                                    <FiClock size={14} /> 支付剩余时间：<strong>{formatCountdown(countdown)}</strong>
                                </div>
                            )}
                            <button className="for-btn-ghost" onClick={cancelPayment}>取消支付</button>
                        </div>
                    ) : (
                        <div className="for-pending-default">
                            <div className="for-pending-notice">
                                <FiClock size={18} style={{ color: '#D97706', flexShrink: 0 }} />
                                <div>
                                    <div className="for-pn-title">订单待支付</div>
                                    <div className="for-pn-sub">请尽快完成支付，超时订单将自动取消</div>
                                </div>
                            </div>
                            <button className="for-pay-btn" onClick={handlePayment} disabled={paying}>
                                {paying ? '生成中…' : `立即支付 ¥${order.totalAmount.toFixed(2)}`}
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* ── Cards (completed / paid) ── */}
            {(order.status === 'completed' || order.status === 'paid') && order.cards.length > 0 && (
                <div className="for-card">
                    <div className="for-card-header">
                        <div className="for-card-title">🎁 卡密信息</div>
                        <button className="for-copy-all" onClick={() => copy(order.cards.map(c => c.content).join('\n'))}>
                            <FiCopy size={12} /> 复制全部
                        </button>
                    </div>
                    <div className="for-cards-list">
                        {order.cards.map((card, i) => (
                            <div key={card.id} className="for-card-item">
                                <div className="for-card-idx">#{i + 1}</div>
                                <code className="for-card-content">{card.content}</code>
                                <button className="for-copy-icon" onClick={() => copy(card.content)} title="复制">
                                    <FiCopy size={13} />
                                </button>
                            </div>
                        ))}
                    </div>
                    <div className="for-cards-footer">
                        <span>共 <strong>{order.cards.length}</strong> 个卡密</span>
                        <span className="for-cards-warn">⚠️ 请妥善保管，避免泄露</span>
                    </div>
                </div>
            )}

            {/* Cancelled */}
            {order.status === 'cancelled' && (
                <div className="for-card for-status-notice cancelled">
                    <FiAlertCircle size={20} />
                    <div>
                        <div className="for-pn-title">订单已取消</div>
                        <div className="for-pn-sub">如需购买请重新下单</div>
                    </div>
                </div>
            )}

            {/* Refunded */}
            {order.status === 'refunded' && (
                <div className="for-card for-status-notice refunded">
                    <FiRefreshCw size={20} />
                    <div>
                        <div className="for-pn-title">商品已退款</div>
                        <div className="for-pn-sub">如有疑问请联系客服</div>
                    </div>
                </div>
            )}

            {/* ── Product info ── */}
            <div className="for-card">
                <div className="for-card-title" style={{ marginBottom: 16 }}>商品信息</div>
                <div className="for-product-row">
                    {order.product.image
                        ? <img className="for-product-img" src={order.product.image} alt={order.product.name} />
                        : <div className="for-product-img for-product-placeholder">📦</div>
                    }
                    <div className="for-product-info">
                        <div className="for-product-name">{order.product.name}</div>
                        <div className="for-product-qty">数量：{order.quantity}</div>
                    </div>
                    <div className="for-product-price">¥{order.totalAmount.toFixed(2)}</div>
                </div>
            </div>

            {/* Delivery note */}
            {(order.status === 'completed' || order.status === 'paid') && order.deliveryNote && (
                <div className="for-card for-note-card">
                    <span className="for-note-icon">📋</span>
                    <div>
                        <div className="for-note-title">商家提示</div>
                        <div className="for-note-body">{order.deliveryNote}</div>
                    </div>
                </div>
            )}

            {/* Cards pending */}
            {(order.status === 'completed' || order.status === 'paid') && order.cards.length === 0 && (
                <div className="for-card for-cards-pending">
                    <FiClock size={20} style={{ color: '#059669' }} />
                    <div>
                        <div className="for-pn-title" style={{ color: '#065F46' }}>卡密发放中</div>
                        <div className="for-pn-sub">请在订单详情或邮箱中查看卡密信息</div>
                    </div>
                </div>
            )}

            {/* ── Order details ── */}
            <div className="for-card">
                <div className="for-card-title" style={{ marginBottom: 16 }}>订单详情</div>
                <div className="for-details">
                    <div className="for-detail-row">
                        <span className="for-detail-label">订单状态</span>
                        <span className="for-detail-status" style={{ color: sc.iconColor }}>
                            <StatusIcon size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                            {sc.label}
                        </span>
                    </div>
                    {[
                        ['订单号', order.orderNo],
                        ['接收邮箱', order.email],
                        ['支付方式', order.paymentMethod],
                        ['创建时间', order.createdAt],
                        ...(order.paidAt ? [['支付时间', order.paidAt]] : []),
                        ['订单金额', `¥${order.totalAmount.toFixed(2)}`],
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

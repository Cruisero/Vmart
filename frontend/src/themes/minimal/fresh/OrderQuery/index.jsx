import { useState } from 'react'
import { useNavigate, Link, Navigate } from 'react-router-dom'
import { FiSearch, FiPackage, FiChevronRight, FiMail, FiHash, FiLock } from 'react-icons/fi'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../../../store/authStore'
import { useStorefront } from '../../../../store/storefrontStore'
import { getStorefrontBasePath } from '../../../../utils/agentDomain'
import './OrderQuery.css'

export default function FreshOrderQuery() {
    const { t } = useTranslation()
    const navigate = useNavigate()
    const { isAuthenticated } = useAuthStore()
    const storefront = useStorefront()
    const prefix = storefront ? getStorefrontBasePath(storefront) : ''
    const [query, setQuery] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [orders, setOrders] = useState(null)

    const statusConfig = {
        pending:   { label: t('order.pending'), bg: '#FEF3C7', color: '#D97706' },
        paid:      { label: t('order.paid'), bg: '#DBEAFE', color: '#2563EB' },
        completed: { label: t('order.completed'), bg: '#D1FAE5', color: '#059669' },
        cancelled: { label: t('order.cancelled'), bg: '#F3F4F6', color: '#6B7280' },
        expired:   { label: t('order.expired'), bg: '#FEE2E2', color: '#DC2626' },
        refunded:  { label: t('order.refunded'), bg: '#EDE9FE', color: '#B91C1C' },
    }

    const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)

    const handleSubmit = async (e) => {
        e.preventDefault()
        const input = query.trim()
        if (!input) { toast.error(t('orderQuery.missing')); return }
        if (!password.trim()) { toast.error(t('orderQuery.missingPassword')); return }

        setLoading(true)
        setOrders(null)
        try {
            const params = new URLSearchParams({ password: password.trim() })
            if (isEmail(input)) {
                params.set('email', input)
            } else {
                params.set('orderNo', input)
            }
            if (storefront?.slug) params.set('slug', storefront.slug)
            const res = await fetch(`/api/orders/query?${params.toString()}`)
            const data = await res.json()
            if (data.error) { toast.error(data.error); return }
            if (data.order) { navigate(`${prefix}/order/${data.order.orderNo}`); return }
            if (data.orders) setOrders(data.orders)
        } catch {
            toast.error(t('orderQuery.queryFailed'))
        } finally {
            setLoading(false)
        }
    }

    const inputIsEmail = isEmail(query.trim())
    const hasInput = query.trim().length > 0

    if (isAuthenticated && !storefront) return <Navigate to="/user/orders" replace />

    return (
        <div className="foq-page">
            <div className="foq-wrap">
                <div className="foq-header">
                    <div className="foq-icon-wrap">
                        <FiPackage size={24} />
                    </div>
                    <h1 className="foq-title">{t('orderQuery.title')}</h1>
                    <p className="foq-sub">{t('orderQuery.desc')}</p>
                </div>

                <div className="foq-card">
                    <form onSubmit={handleSubmit}>
                        <div className="foq-input-row" style={{ marginBottom: '10px' }}>
                            <div className="foq-input-wrap">
                                <span className="foq-input-icon">
                                    {hasInput
                                        ? inputIsEmail ? <FiMail size={16} /> : <FiHash size={16} />
                                        : <FiSearch size={16} />
                                    }
                                </span>
                                <input
                                    className="foq-input"
                                    type="text"
                                    placeholder={t('orderQuery.orderNoOrEmail')}
                                    value={query}
                                    onChange={e => { setQuery(e.target.value); setOrders(null) }}
                                    autoFocus
                                />
                                {hasInput && (
                                    <span className="foq-input-hint">
                                        {inputIsEmail ? t('orderQuery.byEmail') : t('orderQuery.byOrderNo')}
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="foq-input-row">
                            <div className="foq-input-wrap">
                                <span className="foq-input-icon">
                                    <FiLock size={16} />
                                </span>
                                <input
                                    className="foq-input"
                                    type="password"
                                    placeholder={t('orderQuery.passwordPlaceholder')}
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                />
                            </div>
                            <button type="submit" className="foq-search-btn" disabled={loading}>
                                {loading
                                    ? <span className="foq-btn-spinner" />
                                    : <><FiSearch size={15} /> {t('orderQuery.query')}</>
                                }
                            </button>
                        </div>
                    </form>

                    {!orders && (
                        <div className="foq-tips">
                            <div className="foq-tip-item">
                                <span className="foq-tip-dot" />
                                {t('orderQuery.tipOrderNo')}
                            </div>
                            <div className="foq-tip-item">
                                <span className="foq-tip-dot" />
                                {t('orderQuery.tipPassword')}
                            </div>
                            <div className="foq-tip-item">
                                <span className="foq-tip-dot" />
                                {t('orderQuery.tipContact')}
                            </div>
                        </div>
                    )}
                </div>

                {orders && (
                    <div className="foq-results">
                        <div className="foq-results-title">
                            {t('orderQuery.foundOrders')} <strong>{orders.length}</strong> {t('orderQuery.ordersUnit')}
                        </div>
                        {orders.length === 0 ? (
                            <div className="foq-empty">
                                <FiPackage size={36} style={{ color: '#D1D5DB', marginBottom: 12 }} />
                                <p>{t('orderQuery.noOrdersFound')}</p>
                            </div>
                        ) : (
                            <div className="foq-order-list">
                                {orders.map(order => {
                                    const s = statusConfig[order.status] || statusConfig.pending
                                    return (
                                        <Link
                                            key={order.id}
                                            to={`${prefix}/order/${order.orderNo}`}
                                            className="foq-order-item"
                                        >
                                            {order.product?.image
                                                ? <img className="foq-order-img" src={order.product.image} alt="" />
                                                : <div className="foq-order-img foq-order-ph">📦</div>
                                            }
                                            <div className="foq-order-info">
                                                <div className="foq-order-name">{order.product?.name || t('order.product')}</div>
                                                <div className="foq-order-no">{order.orderNo}</div>
                                            </div>
                                            <div className="foq-order-right">
                                                <span className="foq-status-badge" style={{ background: s.bg, color: s.color }}>
                                                    {s.label}
                                                </span>
                                                <span className="foq-order-price">¥{parseFloat(order.totalAmount).toFixed(2)}</span>
                                            </div>
                                            <FiChevronRight size={16} className="foq-chevron" />
                                        </Link>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

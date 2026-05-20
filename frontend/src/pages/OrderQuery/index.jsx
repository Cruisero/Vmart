import { useState } from 'react'
import { usePageTitle } from '../../hooks/usePageTitle'
import { useNavigate, Link } from 'react-router-dom'
import { FiSearch, FiPackage, FiClock, FiCheckCircle, FiXCircle, FiAlertCircle } from 'react-icons/fi'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../store/authStore'
import { useStorefront } from '../../store/storefrontStore'
import './OrderQuery.css'

function OrderQuery() {
    const { t } = useTranslation()
    usePageTitle(t('orderQuery.title'))
    const navigate = useNavigate()
    const { isAuthenticated } = useAuthStore()
    const storefront = useStorefront()
    const [query, setQuery] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [orders, setOrders] = useState(null)

    const statusMap = {
        pending: { label: t('order.pending'), icon: <FiClock />, color: '#f59e0b' },
        paid: { label: t('order.paid'), icon: <FiCheckCircle />, color: '#3b82f6' },
        completed: { label: t('order.paid'), icon: <FiCheckCircle />, color: '#10b981' },
        cancelled: { label: t('order.cancelled'), icon: <FiXCircle />, color: '#94a3b8' },
        refunding: { label: t('order.refunding'), icon: <FiAlertCircle />, color: '#f97316' },
        expired: { label: t('order.expired'), icon: <FiAlertCircle />, color: '#ef4444' },
        refunded: { label: t('order.refunded'), icon: <FiAlertCircle />, color: '#7c3aed' }
    }

    const isEmail = (str) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str)

    const handleSubmit = async (e) => {
        e.preventDefault()

        const input = query.trim()
        if (!input) {
            toast.error(t('orderQuery.orderNoPlaceholder'))
            return
        }
        if (!password.trim()) {
            toast.error(t('orderQuery.passwordPlaceholder'))
            return
        }

        setLoading(true)
        setOrders(null)

        try {
            const params = new URLSearchParams({ password: password.trim() })
            if (isEmail(input)) params.set('email', input)
            else params.set('orderNo', input)
            if (storefront?.slug) params.set('slug', storefront.slug)

            const res = await fetch(`/api/orders/query?${params.toString()}`)
            const data = await res.json()

            if (data.error) {
                toast.error(data.error)
                return
            }

            if (data.order) {
                navigate(`/order/${data.order.orderNo}`)
                return
            }

            if (data.orders) {
                setOrders(data.orders)
            }
        } catch (error) {
            toast.error(t('common.networkError'))
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="order-query-page">
            <div className="query-container">
                <div className="query-icon">
                    <FiPackage />
                </div>

                <h1>{t('orderQuery.title')}</h1>
                <p className="query-desc">
                    {t('orderQuery.desc')}
                </p>

                <form className="query-form" onSubmit={handleSubmit}>
                    <div className="form-group">
                        <input
                            type="text"
                            className="input query-input"
                            placeholder={t('orderQuery.orderNoPlaceholder')}
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                        />
                        {query.trim() && (
                            <span className="input-hint">
                                {isEmail(query.trim()) ? `📧 ${t('orderQuery.emailQueryDesc')}` : `📋 ${t('orderQuery.orderNo')}`}
                            </span>
                        )}
                    </div>

                    <div className="form-group">
                        <input
                            type="password"
                            className="input query-input"
                            placeholder={t('orderQuery.passwordPlaceholder')}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary btn-lg query-btn"
                        disabled={loading}
                    >
                        {loading ? (
                            <span className="loading-text">
                                <span className="spinner-small"></span>
                                {t('orderQuery.querying')}
                            </span>
                        ) : (
                            <>
                                <FiSearch />
                                {t('orderQuery.query')}
                            </>
                        )}
                    </button>
                </form>

                {/* 订单列表结果 */}
                {orders && (
                    <div className="order-results">
                        <h3 className="results-title">
                            {orders.length} {t('orderQuery.title')}
                        </h3>
                        <div className="order-list">
                            {orders.map(order => {
                                const status = statusMap[order.status] || statusMap.pending
                                return (
                                    <Link
                                        key={order.id}
                                        to={`/order/${order.orderNo}`}
                                        className="order-list-item"
                                    >
                                        <div className="order-item-left">
                                            <div className="order-item-product">
                                                {order.product?.image && (
                                                    <img src={order.product.image} alt="" className="order-item-img" />
                                                )}
                                                <div>
                                                    <div className="order-item-name">{order.product?.name || t('order.product')}</div>
                                                    <div className="order-item-no">{order.orderNo}</div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="order-item-right">
                                            <div className="order-item-price">¥{order.totalAmount}</div>
                                            <div className="order-item-status" style={{ color: status.color }}>
                                                {status.icon}
                                                <span>{status.label}</span>
                                            </div>
                                        </div>
                                    </Link>
                                )
                            })}
                        </div>
                    </div>
                )}

                {!orders && (
                    <div className="query-tips">
                        <h3>📌 Tips</h3>
                        <ul>
                            <li>{t('orderQuery.desc')}</li>
                        </ul>
                    </div>
                )}
            </div>
        </div>
    )
}

export default OrderQuery

import { useState, useEffect } from 'react'
import { useNavigate, Link, Navigate } from 'react-router-dom'
import { FiSearch, FiPackage, FiClock, FiCheckCircle, FiXCircle, FiAlertCircle, FiChevronRight, FiMail, FiHash, FiLock } from 'react-icons/fi'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../../../store/authStore'
import { useStorefront } from '../../../../store/storefrontStore'
import { getStorefrontBasePath } from '../../../../utils/agentDomain'
import './OrderQuery.css'

const statusConfig = {
    pending:   { label: '待支付', bg: '#FEF3C7', color: '#D97706' },
    paid:      { label: '已支付', bg: '#DBEAFE', color: '#2563EB' },
    completed: { label: '已完成', bg: '#D1FAE5', color: '#059669' },
    cancelled: { label: '已取消', bg: '#F3F4F6', color: '#6B7280' },
    expired:   { label: '已过期', bg: '#FEE2E2', color: '#C45D3E' },
    refunded:  { label: '已退款', bg: '#EDE9FE', color: '#A04030' },
}

export default function ZenOrderQuery() {
    const navigate = useNavigate()
    const { isAuthenticated } = useAuthStore()
    const storefront = useStorefront()
    const prefix = storefront ? getStorefrontBasePath(storefront) : ''
    const [query, setQuery] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [orders, setOrders] = useState(null)

    const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)

    const handleSubmit = async (e) => {
        e.preventDefault()
        const input = query.trim()
        if (!input) { toast.error('请输入订单号或邮箱'); return }
        if (!password.trim()) { toast.error('请输入查询密码'); return }

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
            toast.error('查询失败，请稍后重试')
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
                {/* Header */}
                <div className="foq-header">
                    <div className="foq-icon-wrap">
                        <FiPackage size={24} />
                    </div>
                    <h1 className="foq-title">订单查询</h1>
                    <p className="foq-sub">输入订单号或邮箱，配合查询密码查询订单</p>
                </div>

                {/* Search card */}
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
                                    placeholder="订单号 或 邮箱地址"
                                    value={query}
                                    onChange={e => { setQuery(e.target.value); setOrders(null) }}
                                    autoFocus
                                />
                                {hasInput && (
                                    <span className="foq-input-hint">
                                        {inputIsEmail ? '按邮箱查询' : '按订单号查询'}
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
                                    placeholder="查询密码"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                />
                            </div>
                            <button type="submit" className="foq-search-btn" disabled={loading}>
                                {loading
                                    ? <span className="foq-btn-spinner" />
                                    : <><FiSearch size={15} /> 查询</>
                                }
                            </button>
                        </div>
                    </form>

                    {/* Tips (shown when no results) */}
                    {!orders && (
                        <div className="foq-tips">
                            <div className="foq-tip-item">
                                <span className="foq-tip-dot" />
                                订单号可在支付成功页面找到
                            </div>
                            <div className="foq-tip-item">
                                <span className="foq-tip-dot" />
                                查询密码为下单时设置的密码
                            </div>
                            <div className="foq-tip-item">
                                <span className="foq-tip-dot" />
                                如有问题请通过工单联系客服
                            </div>
                        </div>
                    )}
                </div>

                {/* Results */}
                {orders && (
                    <div className="foq-results">
                        <div className="foq-results-title">
                            共找到 <strong>{orders.length}</strong> 个订单
                        </div>
                        {orders.length === 0 ? (
                            <div className="foq-empty">
                                <FiPackage size={36} style={{ color: '#D1D5DB', marginBottom: 12 }} />
                                <p>未找到相关订单</p>
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
                                                <div className="foq-order-name">{order.product?.name || '商品'}</div>
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

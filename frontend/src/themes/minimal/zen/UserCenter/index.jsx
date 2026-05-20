import { useState, useEffect } from 'react'
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom'
import { FiUser, FiPackage, FiLock, FiLogOut, FiCopy, FiEye, FiEyeOff, FiChevronRight } from 'react-icons/fi'
import { useBuyerL } from '../../../../hooks/useBuyerL'
import { useAuthStore } from '../../../../store/authStore'
import { useStorefront } from '../../../../store/storefrontStore'
import { getStorefrontBasePath } from '../../../../utils/agentDomain'
import { formatPrice } from '../../../../utils/currencyFormat'
import toast from 'react-hot-toast'
import './UserCenter.css'

// ── Profile header (always visible) ──
function ProfileHeader({ user, stats, currency }) {
    const L = useBuyerL()
    const initial = user?.username?.charAt(0)?.toUpperCase() || 'U'
    const joinDate = user?.createdAt
        ? new Date(user.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
        : ''

    return (
        <div className="fuc-hero">
            <div className="fuc-hero-left">
                <div className="fuc-avatar">{initial}</div>
                <div>
                    <div className="fuc-name">{user?.username || L('nav.user')}</div>
                    <div className="fuc-email">{user?.email}</div>
                    {joinDate && <div className="fuc-join">{joinDate}</div>}
                </div>
            </div>
            <div className="fuc-stats">
                <div className="fuc-stat">
                    <div className="fuc-stat-num">{stats.total}</div>
                    <div className="fuc-stat-label">{L('user.orders')}</div>
                </div>
                <div className="fuc-stat-divider" />
                <div className="fuc-stat">
                    <div className="fuc-stat-num">{formatPrice(stats.spent, currency || 'CNY')}</div>
                    <div className="fuc-stat-label">{L('checkout.subtotal')}</div>
                </div>
                <div className="fuc-stat-divider" />
                <div className="fuc-stat">
                    <div className="fuc-stat-num">{stats.completed}</div>
                    <div className="fuc-stat-label">{L('order.completed')}</div>
                </div>
            </div>
        </div>
    )
}

// ── Orders tab ──
function OrdersPage() {
    const L = useBuyerL()
    const { token } = useAuthStore()
    const storefront = useStorefront()
    const currency = storefront?.currency || 'CNY'
    const [orders, setOrders] = useState([])
    const [loading, setLoading] = useState(true)
    const [expandedOrder, setExpandedOrder] = useState(null)
    const [filter, setFilter] = useState('all')

    useEffect(() => { fetchOrders() }, [filter])

    const fetchOrders = async () => {
        setLoading(true)
        try {
            const url = filter === 'all' ? '/api/orders/my-orders' : `/api/orders/my-orders?status=${filter}`
            const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } })
            const data = await res.json()
            setOrders(data.orders || [])
        } catch {}
        finally { setLoading(false) }
    }

    const copy = (text) => navigator.clipboard.writeText(text)
        .then(() => toast.success(L('order.copied')))
        .catch(() => toast.error(L('common.failed')))

    const statusMap = {
        pending:   { label: L('order.pending'), cls: 'warning' },
        paid:      { label: L('order.paid'), cls: 'info' },
        completed: { label: L('order.completed'), cls: 'success' },
        cancelled: { label: L('order.cancelled'), cls: 'error' },
    }

    const filters = [
        { key: 'all', label: L('products.all') },
        { key: 'pending', label: L('order.pending') },
        { key: 'completed', label: L('order.completed') },
    ]

    return (
        <div className="fuc-section">
            <div className="fuc-filter-row">
                {filters.map(f => (
                    <button
                        key={f.key}
                        className={`fuc-filter-btn${filter === f.key ? ' active' : ''}`}
                        onClick={() => setFilter(f.key)}
                    >{f.label}</button>
                ))}
            </div>

            {loading ? (
                <div className="fuc-loading"><div className="fuc-spinner" /></div>
            ) : orders.length === 0 ? (
                <div className="fuc-empty">
                    <FiPackage size={36} style={{ color: '#D1D5DB', marginBottom: 12 }} />
                    <p>{L('user.noOrders')}</p>
                </div>
            ) : (
                <div className="fuc-order-list">
                    {orders.map(order => {
                        const s = statusMap[order.status] || { label: order.status, cls: '' }
                        const isExpired = order.status === 'pending' &&
                            Date.now() > new Date(order.createdAt).getTime() + 15 * 60000
                        return (
                            <div key={order.orderNo} className="fuc-order-card">
                                <div className="fuc-order-main">
                                    {order.productImage
                                        ? <img className="fuc-order-img" src={order.productImage} alt={order.productName} />
                                        : <div className="fuc-order-img fuc-order-img-ph">📦</div>
                                    }
                                    <div className="fuc-order-info">
                                        <div className="fuc-order-name">{order.productName}</div>
                                        <div className="fuc-order-no">{order.orderNo}</div>
                                        <div className="fuc-order-time">{new Date(order.createdAt).toLocaleString()}</div>
                                    </div>
                                    <div className="fuc-order-right">
                                        <span className={`fuc-badge ${s.cls}`}>{s.label}</span>
                                        <span className="fuc-order-amount">{formatPrice(order.totalAmount, currency)}</span>
                                        {order.status === 'pending' && !isExpired && (
                                            <Link to={`/order/${order.orderNo}`} className="fuc-action-btn primary">
                                                {L('checkout.submit')} <FiChevronRight size={12} />
                                            </Link>
                                        )}
                                        {order.status === 'pending' && isExpired && (
                                            <span className="fuc-expired">{L('order.expired')}</span>
                                        )}
                                        {order.status === 'completed' && order.cards?.length > 0 && (
                                            <button
                                                className="fuc-action-btn ghost"
                                                onClick={() => setExpandedOrder(expandedOrder === order.orderNo ? null : order.orderNo)}
                                            >
                                                {expandedOrder === order.orderNo ? L('common.back') : L('order.cardKeys')}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {expandedOrder === order.orderNo && (
                                    <div className="fuc-cards">
                                        {order.cards.map((card, i) => (
                                            <div key={i} className="fuc-card-item">
                                                <span className="fuc-card-idx">#{i + 1}</span>
                                                <code className="fuc-card-content">{card}</code>
                                                <button className="fuc-copy-btn" onClick={() => copy(card)}>
                                                    <FiCopy size={13} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

// ── Password tab ──
function PasswordPage() {
    const L = useBuyerL()
    const { token, user } = useAuthStore()
    const [form, setForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' })
    const [show, setShow] = useState({ old: false, new: false, confirm: false })
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (form.newPassword !== form.confirmPassword) { toast.error(L('auth.passwordMismatch')); return }
        if (form.newPassword.length < 6) { toast.error(L('auth.passwordMin')); return }
        setLoading(true)
        try {
            const url = user?.role === 'CUSTOMER' ? '/api/customer/password' : '/api/auth/change-password'
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ oldPassword: form.oldPassword, newPassword: form.newPassword })
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || L('common.failed'))
            toast.success(data.message || L('common.success'))
            setForm({ oldPassword: '', newPassword: '', confirmPassword: '' })
        } catch (err) {
            toast.error(err.message)
        } finally {
            setLoading(false)
        }
    }

    const fields = [
        { key: 'oldPassword', label: L('auth.password'), showKey: 'old', placeholder: L('auth.passwordPlaceholder') },
        { key: 'newPassword', label: L('auth.password'), showKey: 'new', placeholder: L('auth.passwordWithMinPlaceholder') },
        { key: 'confirmPassword', label: L('auth.confirmPassword'), showKey: 'confirm', placeholder: L('auth.confirmPlaceholder') },
    ]

    return (
        <div className="fuc-section">
            <form className="fuc-pw-form" onSubmit={handleSubmit}>
                {fields.map(f => (
                    <div key={f.key} className="fuc-field">
                        <label className="fuc-label">{f.label}</label>
                        <div className="fuc-input-wrap">
                            <input
                                type={show[f.showKey] ? 'text' : 'password'}
                                className="fuc-input"
                                value={form[f.key]}
                                placeholder={f.placeholder}
                                onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                                required
                            />
                            <button
                                type="button"
                                className="fuc-toggle-pw"
                                onClick={() => setShow({ ...show, [f.showKey]: !show[f.showKey] })}
                            >
                                {show[f.showKey] ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                            </button>
                        </div>
                    </div>
                ))}
                <button type="submit" className="fuc-submit-btn" disabled={loading}>
                    {loading ? L('checkout.submitting') : L('common.save')}
                </button>
            </form>
        </div>
    )
}

// ── Main ──
export default function ZenUserCenter() {
    const L = useBuyerL()
    const location = useLocation()
    const navigate = useNavigate()
    const { user, isAuthenticated, token, logout } = useAuthStore()
    const storefront = useStorefront()
    const prefix = storefront ? getStorefrontBasePath(storefront) : ''
    const [stats, setStats] = useState({ total: 0, spent: 0, completed: 0 })

    useEffect(() => {
        if (!token) return
        fetch('/api/orders/my-orders', { headers: { 'Authorization': `Bearer ${token}` } })
            .then(r => r.json())
            .then(data => {
                const orders = data.orders || []
                const paidStatuses = ['paid', 'completed']
                setStats({
                    total: orders.length,
                    spent: orders.filter(o => paidStatuses.includes(o.status)).reduce((s, o) => s + o.totalAmount, 0),
                    completed: orders.filter(o => o.status === 'completed').length,
                })
            })
            .catch(() => {})
    }, [token])

    if (!isAuthenticated) return (
        <div className="fuc-page">
            <div className="fuc-not-logged">
                <FiUser size={44} style={{ color: '#D1D5DB', marginBottom: 16 }} />
                <h2>{L('nav.login')}</h2>
                <p>{L('auth.loginContinue')}</p>
                <Link to={`${prefix}/login`} className="fuc-submit-btn" style={{ display: 'inline-block', textDecoration: 'none', textAlign: 'center' }}>
                    {L('nav.login')}
                </Link>
            </div>
        </div>
    )

    const handleLogout = () => { logout(); toast.success(L('nav.logout')); navigate(`${prefix}/`) }

    const tabs = [
        { path: `${prefix}/user/orders`, label: L('user.orders'), icon: FiPackage },
        { path: `${prefix}/user/password`, label: L('auth.password'), icon: FiLock },
    ]

    const activeTab = tabs.find(t => location.pathname.startsWith(t.path))?.path || tabs[0].path

    return (
        <div className="fuc-page">
            <ProfileHeader user={user} stats={stats} currency={storefront?.currency || 'CNY'} />

            <div className="fuc-body">
                {/* Tab nav */}
                <div className="fuc-tabs">
                    {tabs.map(t => (
                        <Link
                            key={t.path}
                            to={t.path}
                            className={`fuc-tab${activeTab === t.path ? ' active' : ''}`}
                        >
                            <t.icon size={15} />
                            {t.label}
                        </Link>
                    ))}
                    <button className="fuc-tab fuc-logout-tab" onClick={handleLogout}>
                        <FiLogOut size={15} />
                        {L('nav.logout')}
                    </button>
                </div>

                {/* Content */}
                <div className="fuc-content">
                    <Routes>
                        <Route index element={<OrdersPage />} />
                        <Route path="orders" element={<OrdersPage />} />
                        <Route path="password" element={<PasswordPage />} />
                    </Routes>
                </div>
            </div>
        </div>
    )
}

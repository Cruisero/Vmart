import { useState, useEffect } from 'react'
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom'
import { FiUser, FiPackage, FiLock, FiLogOut, FiCopy, FiEye, FiEyeOff, FiChevronRight } from 'react-icons/fi'
import { useAuthStore } from '../../../../store/authStore'
import { useStorefront } from '../../../../store/storefrontStore'
import { getStorefrontBasePath } from '../../../../utils/agentDomain'
import toast from 'react-hot-toast'
import './UserCenter.css'

// ── Profile header (always visible) ──
function ProfileHeader({ user, stats }) {
    const initial = user?.username?.charAt(0)?.toUpperCase() || 'U'
    const joinDate = user?.createdAt
        ? new Date(user.createdAt).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
        : ''

    return (
        <div className="fuc-hero">
            <div className="fuc-hero-left">
                <div className="fuc-avatar">{initial}</div>
                <div>
                    <div className="fuc-name">{user?.username || '用户'}</div>
                    <div className="fuc-email">{user?.email}</div>
                    {joinDate && <div className="fuc-join">注册于 {joinDate}</div>}
                </div>
            </div>
            <div className="fuc-stats">
                <div className="fuc-stat">
                    <div className="fuc-stat-num">{stats.total}</div>
                    <div className="fuc-stat-label">订单</div>
                </div>
                <div className="fuc-stat-divider" />
                <div className="fuc-stat">
                    <div className="fuc-stat-num">¥{stats.spent.toFixed(0)}</div>
                    <div className="fuc-stat-label">消费</div>
                </div>
                <div className="fuc-stat-divider" />
                <div className="fuc-stat">
                    <div className="fuc-stat-num">{stats.completed}</div>
                    <div className="fuc-stat-label">完成</div>
                </div>
            </div>
        </div>
    )
}

// ── Orders tab ──
function OrdersPage() {
    const { token } = useAuthStore()
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
        .then(() => toast.success('已复制'))
        .catch(() => toast.error('复制失败'))

    const statusMap = {
        pending:   { label: '待支付', cls: 'warning' },
        paid:      { label: '已支付', cls: 'info' },
        completed: { label: '已完成', cls: 'success' },
        cancelled: { label: '已取消', cls: 'error' },
    }

    const filters = [
        { key: 'all', label: '全部' },
        { key: 'pending', label: '待支付' },
        { key: 'completed', label: '已完成' },
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
                    <p>暂无订单</p>
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
                                        <span className="fuc-order-amount">¥{order.totalAmount.toFixed(2)}</span>
                                        {order.status === 'pending' && !isExpired && (
                                            <Link to={`/order/${order.orderNo}`} className="fuc-action-btn primary">
                                                去支付 <FiChevronRight size={12} />
                                            </Link>
                                        )}
                                        {order.status === 'pending' && isExpired && (
                                            <span className="fuc-expired">已过期</span>
                                        )}
                                        {order.status === 'completed' && order.cards?.length > 0 && (
                                            <button
                                                className="fuc-action-btn ghost"
                                                onClick={() => setExpandedOrder(expandedOrder === order.orderNo ? null : order.orderNo)}
                                            >
                                                {expandedOrder === order.orderNo ? '收起' : '查看卡密'}
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
    const { token, user } = useAuthStore()
    const [form, setForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' })
    const [show, setShow] = useState({ old: false, new: false, confirm: false })
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (form.newPassword !== form.confirmPassword) { toast.error('两次密码不一致'); return }
        if (form.newPassword.length < 6) { toast.error('新密码至少6位'); return }
        setLoading(true)
        try {
            const url = user?.role === 'CUSTOMER' ? '/api/customer/password' : '/api/auth/change-password'
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ oldPassword: form.oldPassword, newPassword: form.newPassword })
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || '修改失败')
            toast.success(data.message || '修改成功')
            setForm({ oldPassword: '', newPassword: '', confirmPassword: '' })
        } catch (err) {
            toast.error(err.message)
        } finally {
            setLoading(false)
        }
    }

    const fields = [
        { key: 'oldPassword', label: '当前密码', showKey: 'old', placeholder: '请输入当前密码' },
        { key: 'newPassword', label: '新密码', showKey: 'new', placeholder: '请输入新密码（至少6位）' },
        { key: 'confirmPassword', label: '确认新密码', showKey: 'confirm', placeholder: '请再次输入新密码' },
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
                    {loading ? '提交中…' : '确认修改'}
                </button>
            </form>
        </div>
    )
}


// ── Main ──
export default function ZenUserCenter() {
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
                <h2>请先登录</h2>
                <p>登录后可查看个人信息和订单</p>
                <Link to={`${prefix}/login`} className="fuc-submit-btn" style={{ display: 'inline-block', textDecoration: 'none', textAlign: 'center' }}>
                    去登录
                </Link>
            </div>
        </div>
    )

    const handleLogout = () => { logout(); toast.success('已退出登录'); navigate(`${prefix}/`) }

    const tabs = [
        { path: `${prefix}/user/orders`, label: '我的订单', icon: FiPackage },
        { path: `${prefix}/user/password`, label: '修改密码', icon: FiLock },
    ]

    const activeTab = tabs.find(t => location.pathname.startsWith(t.path))?.path || tabs[0].path

    return (
        <div className="fuc-page">
            <ProfileHeader user={user} stats={stats} />

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
                        退出登录
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

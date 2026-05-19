import { useState, useEffect } from 'react'
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom'
import { FiUser, FiPackage, FiLock, FiLogOut, FiMail, FiCalendar, FiCopy, FiEye, FiEyeOff, FiMessageCircle, FiPlus, FiClock, FiCheck, FiAlertCircle, FiCheckCircle } from 'react-icons/fi'
import { useAuthStore } from '../../store/authStore'
import { useStorefrontPath } from '../../store/storefrontStore'
import toast from 'react-hot-toast'
import './User.css'

// 侧边菜单
const menuItems = [
    { path: '/user', icon: FiUser, label: '个人信息', exact: true },
    { path: '/user/orders', icon: FiPackage, label: '我的订单' },
    { path: '/user/tickets', icon: FiMessageCircle, label: '我的工单' }
]

// 个人信息页
function ProfilePage() {
    const { user, token } = useAuthStore()
    const [resending, setResending] = useState(false)
    const [stats, setStats] = useState({ total: 0, spent: 0, completed: 0 })

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await fetch('/api/orders/my-orders', {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
                const data = await res.json()
                const orders = data.orders || []
                const paidStatuses = ['paid', 'completed']
                setStats({
                    total: orders.length,
                    spent: orders.filter(o => paidStatuses.includes(o.status)).reduce((sum, o) => sum + o.totalAmount, 0),
                    completed: orders.filter(o => o.status === 'completed').length
                })
            } catch (error) {
                console.error('获取统计失败:', error)
            }
        }
        if (token) fetchStats()
    }, [token])

    const handleResendVerification = async () => {
        setResending(true)
        try {
            const res = await fetch('/api/auth/resend-verification', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            })
            const data = await res.json()
            if (res.ok) {
                toast.success(data.message)
            } else {
                toast.error(data.error)
            }
        } catch (error) {
            toast.error('发送失败，请稍后重试')
        } finally {
            setResending(false)
        }
    }

    return (
        <div className="profile-page">
            <h2>个人信息</h2>

            {/* 邮箱未验证提示 */}
            {user && !user.emailVerified && user.role !== 'ADMIN' && (
                <div className="email-verify-alert">
                    <div className="alert-content">
                        <span>⚠️ 您的邮箱尚未验证</span>
                        <p>请查收验证邮件并点击链接完成验证，以确保账户安全</p>
                    </div>
                    <button
                        className="btn btn-warning"
                        onClick={handleResendVerification}
                        disabled={resending}
                    >
                        {resending ? '发送中...' : '重新发送验证邮件'}
                    </button>
                </div>
            )}

            {/* 个人资料卡片 - 现代设计 */}
            <div className="profile-hero-card">
                <div className="hero-top">
                    <div className="hero-avatar">
                        {user?.avatar ? (
                            <img src={user.avatar} alt={user.username} />
                        ) : (
                            <div className="avatar-placeholder">
                                {user?.username?.charAt(0)?.toUpperCase() || 'U'}
                            </div>
                        )}
                    </div>
                    <div className="hero-info">
                        <h3 className="hero-name">{user?.username || '用户'}</h3>
                        <p className="hero-email">
                            {user?.email || '未绑定邮箱'}
                            {user?.role !== 'ADMIN' && (
                                user?.emailVerified ? (
                                    <span className="verified-tag">已验证</span>
                                ) : (
                                    <span className="unverified-tag">未验证</span>
                                )
                            )}
                        </p>
                        <p className="hero-date">
                            {user?.createdAt
                                ? `注册于 ${new Date(user.createdAt).toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' })}`
                                : ''}
                        </p>
                    </div>
                </div>

                {/* 统计数据横条 */}
                <div className="hero-stats">
                    <div className="hero-stat">
                        <span className="stat-num">{stats.total}</span>
                        <span className="stat-text">订单</span>
                    </div>
                    <div className="hero-stat">
                        <span className="stat-num">¥{stats.spent.toFixed(0)}</span>
                        <span className="stat-text">消费</span>
                    </div>
                    <div className="hero-stat">
                        <span className="stat-num">{stats.completed}</span>
                        <span className="stat-text">完成</span>
                    </div>
                </div>
            </div>

            {/* 修改密码（内嵌） */}
            <PasswordSection />
        </div>
    )
}

// 我的订单页
function OrdersPage() {
    const { token } = useAuthStore()
    const { withPrefix } = useStorefrontPath()
    const [orders, setOrders] = useState([])
    const [loading, setLoading] = useState(true)
    const [expandedOrder, setExpandedOrder] = useState(null)
    const [filter, setFilter] = useState('all')

    useEffect(() => {
        fetchOrders()
    }, [filter])

    const fetchOrders = async () => {
        setLoading(true)
        try {
            const url = filter === 'all'
                ? '/api/orders/my-orders'
                : `/api/orders/my-orders?status=${filter}`
            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            const data = await res.json()
            setOrders(data.orders || [])
        } catch (error) {
            console.error('获取订单失败:', error)
        } finally {
            setLoading(false)
        }
    }

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text).then(() => {
            toast.success('已复制到剪贴板')
        })
    }

    const statusMap = {
        pending: { label: '待支付', class: 'warning' },
        paid: { label: '已支付', class: 'info' },
        completed: { label: '已完成', class: 'success' },
        cancelled: { label: '已取消', class: 'error' },
        refunding: { label: '退款中', class: 'warning' },
        refunded: { label: '已退款', class: 'error' }
    }

    return (
        <div className="orders-page">
            <div className="orders-header">
                <h2>我的订单</h2>
                <div className="order-filters">
                    <button
                        className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
                        onClick={() => setFilter('all')}
                    >
                        全部
                    </button>
                    <button
                        className={`filter-btn ${filter === 'pending' ? 'active' : ''}`}
                        onClick={() => setFilter('pending')}
                    >
                        待支付
                    </button>
                    <button
                        className={`filter-btn ${filter === 'completed' ? 'active' : ''}`}
                        onClick={() => setFilter('completed')}
                    >
                        已完成
                    </button>
                </div>
            </div>

            <div className="orders-list">
                {loading ? (
                    <div className="empty-orders">
                        <p>加载中...</p>
                    </div>
                ) : orders.length === 0 ? (
                    <div className="empty-orders">
                        <FiPackage />
                        <p>暂无订单</p>
                    </div>
                ) : orders.map(order => (
                    <div key={order.orderNo} className="order-item">
                        <div className="order-main">
                            <img src={order.productImage || 'https://via.placeholder.com/100x80'} alt={order.productName} />
                            <div className="order-info">
                                <h4>{order.productName}</h4>
                                <p className="order-no">订单号: {order.orderNo}</p>
                                <p className="order-time">{new Date(order.createdAt).toLocaleString()}</p>
                            </div>
                            <div className="order-right">
                                <span className={`status-badge ${statusMap[order.status]?.class || ''}`}>
                                    {statusMap[order.status]?.label || order.status}
                                </span>
                                <span className="order-amount">¥{order.totalAmount.toFixed(2)}</span>
                                {order.status === 'pending' && (() => {
                                    const createdAt = new Date(order.createdAt).getTime()
                                    const expireAt = createdAt + 15 * 60 * 1000 // 15 minutes
                                    const isExpired = Date.now() > expireAt

                                    return isExpired ? (
                                        <span className="expired-badge">已过期</span>
                                    ) : (
                                        <Link
                                            to={withPrefix(`/order/${order.orderNo}`)}
                                            className="pay-btn"
                                        >
                                            去支付
                                        </Link>
                                    )
                                })()}
                                {order.status === 'completed' && order.cards?.length > 0 && (
                                    <button
                                        className="view-cards-btn"
                                        onClick={() => setExpandedOrder(
                                            expandedOrder === order.orderNo ? null : order.orderNo
                                        )}
                                    >
                                        {expandedOrder === order.orderNo ? '收起卡密' : '查看卡密'}
                                    </button>
                                )}
                            </div>
                        </div>

                        {expandedOrder === order.orderNo && (
                            <div className="order-cards">
                                {order.cards.map((card, idx) => (
                                    <div key={idx} className="card-item">
                                        <pre>{card}</pre>
                                        <button
                                            className="copy-btn"
                                            onClick={() => copyToClipboard(card)}
                                        >
                                            <FiCopy /> 复制
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}
// 修改密码（内嵌组件，挂在个人信息页底部）
function PasswordSection() {
    const { token, user } = useAuthStore()
    const [formData, setFormData] = useState({
        oldPassword: '',
        newPassword: '',
        confirmPassword: ''
    })
    const [showPasswords, setShowPasswords] = useState({ old: false, new: false, confirm: false })
    const [loading, setLoading] = useState(false)
    const [collapsed, setCollapsed] = useState(true)

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value })
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (formData.newPassword !== formData.confirmPassword) { toast.error('两次密码输入不一致'); return }
        if (formData.newPassword.length < 6) { toast.error('新密码至少6位'); return }
        setLoading(true)
        try {
            const url = user?.role === 'CUSTOMER' ? '/api/customer/password' : '/api/auth/change-password'
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ oldPassword: formData.oldPassword, newPassword: formData.newPassword })
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || '修改失败')
            toast.success(data.message || '修改成功')
            setFormData({ oldPassword: '', newPassword: '', confirmPassword: '' })
            setCollapsed(true)
        } catch (error) {
            toast.error(error.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="profile-password-section">
            <div className="profile-password-header" onClick={() => setCollapsed(c => !c)}>
                <div>
                    <h3 style={{ margin: 0, fontSize: '1rem' }}>
                        <FiLock style={{ verticalAlign: '-3px', marginRight: 6 }} />修改密码
                    </h3>
                    <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        定期更换密码可以提升账户安全性
                    </p>
                </div>
                <button type="button" className="btn btn-secondary" style={{ padding: '6px 14px', fontSize: '0.85rem' }}>
                    {collapsed ? '修改' : '收起'}
                </button>
            </div>

            {!collapsed && (
                <form className="password-form" onSubmit={handleSubmit} style={{ marginTop: 16 }}>
                    {[
                        { key: 'oldPassword', show: 'old', label: '当前密码', placeholder: '请输入当前密码' },
                        { key: 'newPassword', show: 'new', label: '新密码', placeholder: '请输入新密码 (至少6位)' },
                        { key: 'confirmPassword', show: 'confirm', label: '确认新密码', placeholder: '请再次输入新密码' },
                    ].map(f => (
                        <div className="form-group" key={f.key}>
                            <label>{f.label}</label>
                            <div className="input-wrapper">
                                <input
                                    type={showPasswords[f.show] ? 'text' : 'password'}
                                    name={f.key}
                                    value={formData[f.key]}
                                    onChange={handleChange}
                                    placeholder={f.placeholder}
                                    required
                                />
                                <button type="button" className="toggle-password" onClick={() => setShowPasswords({ ...showPasswords, [f.show]: !showPasswords[f.show] })}>
                                    {showPasswords[f.show] ? <FiEyeOff /> : <FiEye />}
                                </button>
                            </div>
                        </div>
                    ))}
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                        {loading ? '提交中...' : '确认修改'}
                    </button>
                </form>
            )}
        </div>
    )
}

// 修改密码页
function PasswordPage() {
    const { token, user } = useAuthStore()
    const [formData, setFormData] = useState({
        oldPassword: '',
        newPassword: '',
        confirmPassword: ''
    })
    const [showPasswords, setShowPasswords] = useState({
        old: false,
        new: false,
        confirm: false
    })
    const [loading, setLoading] = useState(false)

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value })
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (formData.newPassword !== formData.confirmPassword) {
            toast.error('两次密码输入不一致')
            return
        }

        if (formData.newPassword.length < 6) {
            toast.error('新密码至少6位')
            return
        }

        setLoading(true)
        try {
            const url = user?.role === 'CUSTOMER' ? '/api/customer/password' : '/api/auth/change-password'
            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    oldPassword: formData.oldPassword,
                    newPassword: formData.newPassword
                })
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || '修改失败')
            }

            toast.success(data.message)
            setFormData({ oldPassword: '', newPassword: '', confirmPassword: '' })
        } catch (error) {
            toast.error(error.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="password-page">
            <h2>修改密码</h2>

            <form className="password-form" onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>当前密码</label>
                    <div className="input-wrapper">
                        <input
                            type={showPasswords.old ? 'text' : 'password'}
                            name="oldPassword"
                            value={formData.oldPassword}
                            onChange={handleChange}
                            placeholder="请输入当前密码"
                            required
                        />
                        <button
                            type="button"
                            className="toggle-password"
                            onClick={() => setShowPasswords({ ...showPasswords, old: !showPasswords.old })}
                        >
                            {showPasswords.old ? <FiEyeOff /> : <FiEye />}
                        </button>
                    </div>
                </div>

                <div className="form-group">
                    <label>新密码</label>
                    <div className="input-wrapper">
                        <input
                            type={showPasswords.new ? 'text' : 'password'}
                            name="newPassword"
                            value={formData.newPassword}
                            onChange={handleChange}
                            placeholder="请输入新密码 (至少6位)"
                            required
                        />
                        <button
                            type="button"
                            className="toggle-password"
                            onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                        >
                            {showPasswords.new ? <FiEyeOff /> : <FiEye />}
                        </button>
                    </div>
                </div>

                <div className="form-group">
                    <label>确认新密码</label>
                    <div className="input-wrapper">
                        <input
                            type={showPasswords.confirm ? 'text' : 'password'}
                            name="confirmPassword"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            placeholder="请再次输入新密码"
                            required
                        />
                        <button
                            type="button"
                            className="toggle-password"
                            onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                        >
                            {showPasswords.confirm ? <FiEyeOff /> : <FiEye />}
                        </button>
                    </div>
                </div>

                <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? '提交中...' : '确认修改'}
                </button>
            </form>
        </div>
    )
}

// 工单状态映射
const ticketStatusMap = {
    OPEN: { label: '待处理', class: 'open', icon: <FiAlertCircle /> },
    IN_PROGRESS: { label: '处理中', class: 'in-progress', icon: <FiClock /> },
    PENDING_SUPER_ADMIN: { label: '处理中', class: 'in-progress', icon: <FiClock /> },
    CLOSED: { label: '已关闭', class: 'closed', icon: <FiCheck /> }
}

const ticketTypeMap = {
    ORDER_ISSUE: '订单问题',
    CARD_ISSUE: '卡密问题',
    REFUND: '退款申请',
    OTHER: '其他'
}

// 我的工单页
function TicketsPage() {
    const navigate = useNavigate()
    const { token } = useAuthStore()
    const { withPrefix } = useStorefrontPath()
    const [tickets, setTickets] = useState([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState('all')

    useEffect(() => {
        fetchTickets()
        const handleFocus = () => fetchTickets()
        const intervalId = window.setInterval(fetchTickets, 30000)
        window.addEventListener('focus', handleFocus)

        return () => {
            window.clearInterval(intervalId)
            window.removeEventListener('focus', handleFocus)
        }
    }, [filter, token])

    const fetchTickets = async () => {
        try {
            const url = filter === 'all'
                ? '/api/tickets'
                : `/api/tickets?status=${filter}`

            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            const data = await res.json()
            setTickets(data.tickets || [])
        } catch (error) {
            console.error('获取工单失败:', error)
        } finally {
            setLoading(false)
        }
    }

    const formatTime = (dateStr) => {
        const date = new Date(dateStr)
        const now = new Date()
        const diff = now - date

        // 使用不间断空格 \u00A0 防止换行
        if (diff < 60000) return '刚刚'
        if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
        if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`

        return date.toLocaleDateString('zh-CN')
    }

    const unreadCount = tickets.reduce((sum, ticket) => sum + (ticket.userUnreadCount || 0), 0)

    if (loading) {
        return <div className="loading-state">加载中...</div>
    }

    return (
        <div className="tickets-page-embed">
            <div className="page-header-row">
                <div>
                    <h2>我的工单</h2>
                    <p className="tickets-summary">
                        {unreadCount > 0 ? `当前有 ${unreadCount} 条新消息待查看` : '查看工单处理进度与最新回复'}
                    </p>
                </div>
                <Link to={withPrefix("/tickets/new")} className="btn btn-primary btn-sm">
                    <FiPlus />
                    提交工单
                </Link>
            </div>

            {/* 筛选 */}
            <div className="tickets-filters">
                <button
                    className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
                    onClick={() => setFilter('all')}
                >
                    全部
                </button>
                <button
                    className={`filter-btn ${filter === 'OPEN' ? 'active' : ''}`}
                    onClick={() => setFilter('OPEN')}
                >
                    待处理
                </button>
                <button
                    className={`filter-btn ${filter === 'IN_PROGRESS' ? 'active' : ''}`}
                    onClick={() => setFilter('IN_PROGRESS')}
                >
                    处理中
                </button>
                <button
                    className={`filter-btn ${filter === 'CLOSED' ? 'active' : ''}`}
                    onClick={() => setFilter('CLOSED')}
                >
                    已关闭
                </button>
            </div>

            {/* 工单列表 */}
            {tickets.length === 0 ? (
                <div className="empty-state">
                    <FiMessageCircle className="empty-icon" />
                    <h3>暂无工单</h3>
                    <p>如有问题，欢迎提交工单咨询</p>
                </div>
            ) : (
                <div className="tickets-list-embed">
                    {tickets.map(ticket => (
                        <Link
                            to={withPrefix(`/tickets/${ticket.id}`)}
                            key={ticket.id}
                            className="ticket-card-embed"
                        >
                            <div className="ticket-header">
                                <span className="ticket-no">{ticket.ticketNo}</span>
                                <div className="ticket-badges">
                                    {ticket.userUnreadCount > 0 && (
                                        <span className="ticket-unread-badge">
                                            {ticket.userUnreadCount > 99 ? '99+' : ticket.userUnreadCount} 条新消息
                                        </span>
                                    )}
                                    <span className={`ticket-status ${ticketStatusMap[ticket.status]?.class}`}>
                                        {ticketStatusMap[ticket.status]?.icon}
                                        {ticketStatusMap[ticket.status]?.label}
                                    </span>
                                </div>
                            </div>
                            <h3 className="ticket-subject">{ticket.subject}</h3>
                            <div className="ticket-meta">
                                <span className="ticket-type">{ticketTypeMap[ticket.type]}</span>
                                {ticket.orderNo && (
                                    <span className="ticket-order">订单: {ticket.orderNo}</span>
                                )}
                            </div>
                            <div className="ticket-footer">
                                <span className="ticket-time">
                                    <FiClock />
                                    {formatTime(ticket.updatedAt)}
                                </span>
                                <span className="ticket-messages">
                                    <FiMessageCircle />
                                    {ticket.userUnreadCount > 0
                                        ? `${ticket._count?.messages || 0} 条消息 / ${ticket.userUnreadCount} 条未读`
                                        : `${ticket._count?.messages || 0} 条消息`}
                                </span>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    )
}

// 用户中心主组件
function UserCenter() {
    const location = useLocation()
    const navigate = useNavigate()
    const { withPrefix, prefix } = useStorefrontPath()
    const { user, isAuthenticated, logout } = useAuthStore()

    // 未登录跳转
    if (!isAuthenticated) {
        return (
            <div className="user-not-logged">
                <FiUser className="icon" />
                <h2>请先登录</h2>
                <p>登录后可查看个人信息和订单</p>
                <Link to={withPrefix("/login")} className="btn btn-primary">去登录</Link>
            </div>
        )
    }

    const handleLogout = () => {
        logout()
        toast.success('已退出登录')
        navigate(withPrefix('/'))
    }

    return (
        <div className="user-center">
            {/* 侧边栏 */}
            <aside className="user-sidebar">
                <div className="user-brief">
                    <div className="brief-avatar">
                        {user?.username?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <div className="brief-info">
                        <span className="brief-name">{user?.username || '用户'}</span>
                        <span className="brief-email">{user?.email}</span>
                    </div>
                </div>

                <nav className="user-nav">
                    {menuItems.map(item => {
                        const fullPath = `${prefix}${item.path}`
                        const isActive = item.exact
                            ? location.pathname === fullPath
                            : location.pathname.startsWith(fullPath) && item.path !== '/user'
                        return (
                            <Link
                                key={item.path}
                                to={fullPath}
                                className={`nav-item ${isActive || (item.exact && location.pathname === fullPath) ? 'active' : ''}`}
                            >
                                <item.icon />
                                <span>{item.label}</span>
                            </Link>
                        )
                    })}
                </nav>

                <button className="logout-btn" onClick={handleLogout}>
                    <FiLogOut />
                    <span>退出登录</span>
                </button>
            </aside>

            {/* 主内容 */}
            <main className="user-main">
                <Routes>
                    <Route index element={<ProfilePage />} />
                    <Route path="orders" element={<OrdersPage />} />
                    <Route path="tickets/*" element={<TicketsPage />} />
                </Routes>
            </main>
        </div>
    )
}

export default UserCenter

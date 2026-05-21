import { useState, useEffect, useRef } from 'react'
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom'
import {
    FiHome, FiPackage, FiShoppingBag, FiDollarSign,
    FiSettings, FiLogOut, FiMenu, FiX, FiCopy, FiExternalLink, FiUsers,
    FiMail, FiBell, FiCheckCircle, FiLink
} from 'react-icons/fi'
import { useAuthStore } from '../../../store/authStore'
import { getStorefrontBasePath } from '../../../utils/agentDomain'
import './AgentDashboard.css'

function AgentDashboard() {
    const { user, token, logout } = useAuthStore()
    const [agent, setAgent] = useState(null)
    const [loading, setLoading] = useState(true)
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const location = useLocation()
    const navigate = useNavigate()

    useEffect(() => {
        fetchAgent()
    }, [])

    useEffect(() => {
        if (!agent) return
        const items = [
            { path: '/agent/products', label: '商品管理' },
            { path: '/agent/orders', label: '订单列表' },
            { path: '/agent/customers', label: '用户管理' },
            { path: '/agent/withdraw', label: '提现管理' },
            { path: '/agent/settings', label: '店铺设置' },
            { path: '/agent', label: '仪表盘' },
        ]
        const matched = items.find(item => location.pathname.toLowerCase().startsWith(item.path.toLowerCase()))
        const subTitle = matched ? matched.label : '代理后台'
        const shopPrefix = agent.shopName ? `${agent.shopName} - ` : ''
        document.title = `${shopPrefix}${subTitle} - 代理分站管理`
    }, [location.pathname, agent])

    const fetchAgent = async () => {
        try {
            const res = await fetch('/api/agent/profile', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (res.ok) {
                const data = await res.json()
                setAgent(data.agent)
            } else {
                navigate('/')
            }
        } catch { navigate('/') }
        setLoading(false)
    }

    if (loading) return <div className="agent-loading">加载中...</div>
    if (!agent) return null

    const menuItems = [
        { path: '/agent', icon: FiHome, label: '仪表盘', exact: true },
        { path: '/agent/products', icon: FiPackage, label: '商品管理' },
        { path: '/agent/orders', icon: FiShoppingBag, label: '订单列表' },
        { path: '/agent/customers', icon: FiUsers, label: '用户管理' },
        { path: '/agent/withdraw', icon: FiDollarSign, label: '提现管理' },
        { path: '/agent/settings', icon: FiSettings, label: '店铺设置' },
    ]

    const isActive = (path, exact) => exact ? location.pathname === path : location.pathname.startsWith(path)

    return (
        <div className="agent-layout">
            {/* Mobile topbar */}
            <header className="agent-topbar">
                <button onClick={() => setSidebarOpen(true)}><FiMenu /></button>
                <span>{agent.shopName}</span>
                <div />
            </header>

            {/* Sidebar */}
            {sidebarOpen && <div className="agent-overlay" onClick={() => setSidebarOpen(false)} />}
            <aside className={`agent-sidebar ${sidebarOpen ? 'open' : ''}`}>
                <div className="agent-sidebar-header">
                    <h3>{agent.shopName}</h3>
                    <span className="agent-slug">/s/{agent.shopSlug}</span>
                    <button className="agent-close-btn" onClick={() => setSidebarOpen(false)}><FiX /></button>
                </div>
                <nav className="agent-nav">
                    {menuItems.map(item => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`agent-nav-item ${isActive(item.path, item.exact) ? 'active' : ''}`}
                            onClick={() => setSidebarOpen(false)}
                        >
                            <item.icon /> {item.label}
                        </Link>
                    ))}
                </nav>
                <div className="agent-sidebar-footer">
                    <span>{user?.email}</span>
                    <button onClick={() => { logout(); navigate('/') }}><FiLogOut /> 退出</button>
                </div>
            </aside>

            {/* Main */}
            <main className="agent-main">
                <Routes>
                    <Route index element={<AgentHome agent={agent} token={token} />} />
                    <Route path="products" element={<AgentProducts agent={agent} token={token} />} />
                    <Route path="orders" element={<AgentOrders token={token} />} />
                    <Route path="customers" element={<AgentCustomers token={token} />} />
                    <Route path="withdraw" element={<AgentWithdraw agent={agent} token={token} onUpdate={fetchAgent} />} />
                    <Route path="settings" element={<AgentSettings agent={agent} token={token} onUpdate={fetchAgent} />} />
                </Routes>
            </main>
        </div>
    )
}

// ==================== 仪表盘 ====================
function AgentHome({ agent, token }) {
    const [stats, setStats] = useState(null)

    useEffect(() => {
        fetch('/api/agent/stats', { headers: { 'Authorization': `Bearer ${token}` } })
            .then(r => r.json()).then(d => setStats(d.stats)).catch(() => {})
    }, [])

    const cards = [
        { label: '今日订单', value: stats?.todayOrders ?? '-', color: '#4F46E5' },
        { label: '今日收益', value: stats ? `¥${stats.todayProfit.toFixed(2)}` : '-', color: '#10B981' },
        { label: '可提现余额', value: `¥${agent.balance.toFixed(2)}`, color: '#F59E0B' },
        { label: '累计收益', value: `¥${agent.totalEarnings.toFixed(2)}`, color: '#EF4444' },
    ]
    const storefrontUrl = `${window.location.origin}/s/${agent.shopSlug}`

    return (
        <div className="agent-page">
            <h2>仪表盘</h2>
            <div className="agent-stats-grid">
                {cards.map((c, i) => (
                    <div key={i} className="agent-stat-card" style={{ borderLeft: `4px solid ${c.color}` }}>
                        <div className="agent-stat-label">{c.label}</div>
                        <div className="agent-stat-value" style={{ color: c.color }}>{c.value}</div>
                    </div>
                ))}
            </div>
            <div className="agent-info-card">
                <h3>分站链接</h3>
                <div className="agent-link-row">
                    <code>{storefrontUrl}</code>
                    <button onClick={() => { navigator.clipboard.writeText(storefrontUrl); alert('已复制') }}>
                        <FiCopy /> 复制
                    </button>
                    <a href={storefrontUrl} target="_blank" rel="noreferrer"><FiExternalLink /> 访问</a>
                </div>
            </div>
        </div>
    )
}

// ==================== 商品管理 ====================
function AgentProducts({ agent, token }) {
    const [products, setProducts] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => { fetchProducts() }, [])

    const fetchProducts = async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/agent/products', { headers: { 'Authorization': `Bearer ${token}` } })
            const data = await res.json()
            setProducts(data.products || [])
        } catch {}
        setLoading(false)
    }

    const updateProduct = async (productId, markup, enabled) => {
        try {
            await fetch('/api/agent/products', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ productId, markup: parseFloat(markup), enabled })
            })
            fetchProducts()
        } catch {}
    }

    return (
        <div className="agent-page">
            <h2>商品管理</h2>
            <p style={{ color: '#6B7280', marginBottom: 20, fontSize: '0.88rem' }}>
                选择要上架到分站的商品，并设置加价金额
            </p>
            {loading ? <p>加载中...</p> : (
                <div className="agent-products-list">
                    {products.map(p => (
                        <div key={p.id} className={`agent-product-card ${p.enabled ? 'enabled' : ''}`}>
                            <div className="agent-product-img">
                                {p.image ? <img src={p.image} alt={p.name} /> : <FiPackage />}
                            </div>
                            <div className="agent-product-info">
                                <div className="agent-product-name">{p.name}</div>
                                <div className="agent-product-prices">
                                    <span>底价: ¥{p.agentBasePrice.toFixed(2)}</span>
                                    {p.enabled && p.agentSellPrice && (
                                        <span className="agent-sell-price">售价: ¥{p.agentSellPrice.toFixed(2)}</span>
                                    )}
                                </div>
                            </div>
                            <div className="agent-product-actions">
                                <div className="agent-markup-input">
                                    <label>加价 ¥</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        defaultValue={p.markup}
                                        onBlur={e => {
                                            if (p.enabled) updateProduct(p.id, e.target.value, true)
                                        }}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') {
                                                e.target.blur()
                                            }
                                        }}
                                    />
                                </div>
                                <button
                                    className={`agent-toggle-btn ${p.enabled ? 'on' : 'off'}`}
                                    onClick={() => updateProduct(p.id, p.markup, !p.enabled)}
                                >
                                    {p.enabled ? '已上架' : '上架'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

// ==================== 订单列表 ====================
function AgentOrders({ token }) {
    const [orders, setOrders] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetch('/api/agent/orders', { headers: { 'Authorization': `Bearer ${token}` } })
            .then(r => r.json()).then(d => setOrders(d.orders || [])).catch(() => {})
            .finally(() => setLoading(false))
    }, [])

    const statusLabel = { PENDING: '待支付', PAID: '已支付', COMPLETED: '已完成', CANCELLED: '已取消' }
    const statusColor = { PENDING: '#F59E0B', PAID: '#3B82F6', COMPLETED: '#10B981', CANCELLED: '#6B7280' }

    return (
        <div className="agent-page">
            <h2>订单列表</h2>
            {loading ? <p>加载中...</p> : orders.length === 0 ? (
                <p style={{ color: '#9CA3AF', textAlign: 'center', padding: 40 }}>暂无订单</p>
            ) : (
                <div className="agent-table-wrap">
                    <table className="agent-table">
                        <thead>
                            <tr>
                                <th>订单号</th>
                                <th>商品</th>
                                <th>数量</th>
                                <th>售价</th>
                                <th>底价</th>
                                <th>利润</th>
                                <th>状态</th>
                                <th>时间</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.map(o => (
                                <tr key={o.id}>
                                    <td><code style={{ fontSize: '0.78rem' }}>{o.orderNo}</code></td>
                                    <td>{o.productName}</td>
                                    <td>{o.quantity}</td>
                                    <td>¥{o.sellPrice.toFixed(2)}</td>
                                    <td>¥{o.costPrice.toFixed(2)}</td>
                                    <td style={{ fontWeight: 700, color: '#10B981' }}>+¥{o.profit.toFixed(2)}</td>
                                    <td>
                                        <span style={{
                                            padding: '2px 8px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 600,
                                            background: (statusColor[o.orderStatus] || '#6B7280') + '20',
                                            color: statusColor[o.orderStatus] || '#6B7280'
                                        }}>
                                            {statusLabel[o.orderStatus] || o.orderStatus}
                                        </span>
                                    </td>
                                    <td style={{ fontSize: '0.8rem', color: '#9CA3AF' }}>
                                        {new Date(o.createdAt).toLocaleString()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}

// ==================== 用户管理 ====================
function AgentCustomers({ token }) {
    const [users, setUsers] = useState([])
    const [loading, setLoading] = useState(true)
    const [total, setTotal] = useState(0)
    const [todayCount, setTodayCount] = useState(0)
    const [currentPage, setCurrentPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [search, setSearch] = useState('')
    const [searchInput, setSearchInput] = useState('')
    const searchTimer = useRef(null)

    const fetchUsers = (page = 1, q = '') => {
        setLoading(true)
        const params = new URLSearchParams({ page, pageSize: 20, search: q })
        fetch(`/api/agent/users?${params}`, { headers: { 'Authorization': `Bearer ${token}` } })
            .then(r => r.json())
            .then(d => {
                setUsers(d.users || [])
                setTotal(d.total || 0)
                setTodayCount(d.todayCount || 0)
                setTotalPages(d.totalPages || 1)
                setCurrentPage(d.page || 1)
            })
            .catch(() => {})
            .finally(() => setLoading(false))
    }

    useEffect(() => { fetchUsers(1, '') }, [])

    useEffect(() => {
        clearTimeout(searchTimer.current)
        searchTimer.current = setTimeout(() => {
            setSearch(searchInput)
            fetchUsers(1, searchInput)
        }, 400)
        return () => clearTimeout(searchTimer.current)
    }, [searchInput])

    return (
        <div className="agent-page">
            <h2>用户管理</h2>

            {/* 统计卡片 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 24 }}>
                <div style={{ background: '#fff', borderRadius: 12, padding: '20px 16px', display: 'flex', alignItems: 'center', gap: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                    <div style={{ width: 42, height: 42, borderRadius: 10, background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 18 }}>
                        <FiUsers />
                    </div>
                    <div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#111' }}>{total}</div>
                        <div style={{ fontSize: '0.78rem', color: '#9CA3AF' }}>总用户</div>
                    </div>
                </div>
                <div style={{ background: '#fff', borderRadius: 12, padding: '20px 16px', display: 'flex', alignItems: 'center', gap: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                    <div style={{ width: 42, height: 42, borderRadius: 10, background: 'linear-gradient(135deg, #10B981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 18 }}>
                        <FiUsers />
                    </div>
                    <div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#111' }}>{todayCount}</div>
                        <div style={{ fontSize: '0.78rem', color: '#9CA3AF' }}>今日新增</div>
                    </div>
                </div>
            </div>

            {/* 搜索栏 */}
            <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                <input
                    type="text" placeholder="搜索邮箱或用户名..."
                    value={searchInput} onChange={e => setSearchInput(e.target.value)}
                    style={{ flex: 1, padding: '10px 14px', border: '1px solid #E5E7EB', borderRadius: 10, fontSize: '0.88rem', outline: 'none' }}
                />
                {searchInput && (
                    <button onClick={() => setSearchInput('')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#9CA3AF' }}>×</button>
                )}
                <span style={{ fontSize: '0.82rem', color: '#9CA3AF', whiteSpace: 'nowrap' }}>
                    {searchInput ? `找到 ${total} 个结果` : `共 ${total} 位用户`}
                </span>
            </div>

            {/* 用户表格 */}
            {loading ? <p style={{ textAlign: 'center', padding: 40, color: '#9CA3AF' }}>加载中...</p> : users.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 60, color: '#9CA3AF' }}>
                    <FiUsers size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
                    <p>{searchInput ? `未找到与「${searchInput}」匹配的用户` : '暂无注册用户'}</p>
                </div>
            ) : (
                <div className="agent-table-wrap">
                    <table className="agent-table">
                        <thead>
                            <tr>
                                <th>用户</th>
                                <th>订单数</th>
                                <th>注册时间</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(u => (
                                <tr key={u.id}>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <div style={{ width: 32, height: 32, borderRadius: '50%', background: u.avatar ? 'none' : '#E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.78rem', color: '#9CA3AF', fontWeight: 600, overflow: 'hidden', flexShrink: 0 }}>
                                                {u.avatar ? <img src={u.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (u.username || u.email)?.[0]?.toUpperCase() || '?'}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 500, fontSize: '0.88rem' }}>{u.username || '未设置'}</div>
                                                <div style={{ fontSize: '0.78rem', color: '#9CA3AF' }}>{u.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>{u._count?.orders || 0}</td>
                                    <td style={{ fontSize: '0.82rem', color: '#9CA3AF' }}>{new Date(u.createdAt).toLocaleDateString('zh-CN')}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* 分页 */}
            {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20, alignItems: 'center' }}>
                    <button disabled={currentPage <= 1} onClick={() => fetchUsers(currentPage - 1, search)}
                        style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #E5E7EB', background: '#fff', cursor: currentPage <= 1 ? 'not-allowed' : 'pointer', fontSize: '0.82rem' }}>
                        ← 上一页
                    </button>
                    <span style={{ fontSize: '0.82rem', color: '#6B7280' }}>第 {currentPage}/{totalPages} 页</span>
                    <button disabled={currentPage >= totalPages} onClick={() => fetchUsers(currentPage + 1, search)}
                        style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #E5E7EB', background: '#fff', cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer', fontSize: '0.82rem' }}>
                        下一页 →
                    </button>
                </div>
            )}
        </div>
    )
}


// ==================== 提现管理 ====================
function AgentWithdraw({ agent, token, onUpdate }) {
    const [withdrawals, setWithdrawals] = useState([])
    const [amount, setAmount] = useState('')
    const [method, setMethod] = useState('alipay')
    const [submitting, setSubmitting] = useState(false)
    const [accounts, setAccounts] = useState(agent.withdrawAccounts || {})
    const [editingMethod, setEditingMethod] = useState(null)
    const [editValue, setEditValue] = useState('')
    const [saving, setSaving] = useState(false)

    useEffect(() => { fetchWithdrawals() }, [])

    const fetchWithdrawals = async () => {
        try {
            const res = await fetch('/api/agent/withdrawals', { headers: { 'Authorization': `Bearer ${token}` } })
            const data = await res.json()
            setWithdrawals(data.withdrawals || [])
        } catch {}
    }

    const methods = [
        { key: 'alipay', label: '支付宝', placeholder: '请输入支付宝账号', icon: '💳' },
        { key: 'usdt_trc20', label: 'USDT-TRC20', placeholder: '请输入 TRC20 钱包地址', icon: '🔷' },
        { key: 'usdt_bep20', label: 'USDT-BEP20', placeholder: '请输入 BEP20 钱包地址', icon: '🟡' },
    ]
    const methodLabels = { alipay: '支付宝', usdt_trc20: 'USDT-TRC20', usdt_bep20: 'USDT-BEP20' }

    const handleSave = async (m) => {
        if (!editValue.trim()) return
        setSaving(true)
        try {
            const res = await fetch('/api/agent/withdraw/bind', {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ method: m, account: editValue.trim() })
            })
            const data = await res.json()
            if (res.ok) {
                setAccounts(data.withdrawAccounts)
                agent.withdrawAccounts = data.withdrawAccounts
                setEditingMethod(null)
                setEditValue('')
            } else { alert(data.error) }
        } catch { alert('保存失败') }
        setSaving(false)
    }

    const handleWithdraw = async (e) => {
        e.preventDefault()
        if (!accounts[method]) return alert('请先保存该方式的收款账号')
        setSubmitting(true)
        try {
            const res = await fetch('/api/agent/withdraw', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: parseFloat(amount), method })
            })
            const data = await res.json()
            if (res.ok) {
                alert(data.message)
                setAmount('')
                fetchWithdrawals()
                onUpdate?.()
            } else { alert(data.error) }
        } catch { alert('提交失败') }
        setSubmitting(false)
    }

    const statusLabel = { PENDING: '待处理', APPROVED: '已通过', REJECTED: '已拒绝' }
    const statusColor = { PENDING: '#F59E0B', APPROVED: '#10B981', REJECTED: '#EF4444' }

    return (
        <div className="agent-page">
            <h2>提现管理</h2>
            <div className="agent-withdraw-balance">
                可提现余额：<strong>¥{agent.balance.toFixed(2)}</strong>
            </div>

            <div className="agent-withdraw-grid">
                {/* 左侧 */}
                <div className="agent-withdraw-form">
                    {/* 收款方式图标选择 */}
                    <div style={{ marginBottom: 24 }}>
                        <label style={{ fontWeight: 600, fontSize: '0.92rem', color: '#1F2937', marginBottom: 12, display: 'block' }}>收款账号</label>
                        {/* 图标行 */}
                        <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
                            {methods.map(m => (
                                <div key={m.key}
                                    onClick={() => { setMethod(m.key); if (editingMethod && editingMethod !== m.key) { setEditingMethod(null); setEditValue('') } }}
                                    style={{
                                        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                                        padding: '14px 8px', borderRadius: 12, cursor: 'pointer', transition: 'all 0.15s',
                                        background: method === m.key ? '#EEF2FF' : '#F9FAFB',
                                        border: method === m.key ? '2px solid #6366F1' : '1px solid #E5E7EB',
                                    }}>
                                    <span style={{ fontSize: '1.6rem' }}>{m.icon}</span>
                                    <span style={{ fontSize: '0.72rem', fontWeight: 600, color: method === m.key ? '#6366F1' : '#6B7280' }}>{m.label}</span>
                                    {accounts[m.key] && (
                                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981' }} />
                                    )}
                                </div>
                            ))}
                        </div>
                        {/* 选中方式的账号详情 */}
                        {(() => {
                            const cur = methods.find(m => m.key === method)
                            return (
                                <div style={{ padding: '14px 16px', borderRadius: 10, background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
                                    {editingMethod === method ? (
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <input type="text" value={editValue} onChange={e => setEditValue(e.target.value)}
                                                placeholder={cur.placeholder} autoFocus
                                                style={{ flex: 1, padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: '0.85rem' }} />
                                            <button type="button" onClick={() => handleSave(method)} disabled={saving}
                                                style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: '#10B981', color: '#fff', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                                {saving ? '...' : '保存'}
                                            </button>
                                            <button type="button" onClick={() => { setEditingMethod(null); setEditValue('') }}
                                                style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #E5E7EB', background: '#fff', color: '#9CA3AF', fontSize: '0.82rem', cursor: 'pointer' }}>
                                                ✕
                                            </button>
                                        </div>
                                    ) : accounts[method] ? (
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <div style={{ fontSize: '0.85rem', color: '#374151', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                                                {accounts[method]}
                                            </div>
                                            <button type="button" onClick={() => { setEditingMethod(method); setEditValue(accounts[method]) }}
                                                style={{ background: 'none', border: 'none', color: '#6366F1', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 500, whiteSpace: 'nowrap', marginLeft: 12 }}>
                                                修改
                                            </button>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <span style={{ fontSize: '0.85rem', color: '#9CA3AF' }}>未设置</span>
                                            <button type="button" onClick={() => { setEditingMethod(method); setEditValue('') }}
                                                style={{ background: 'none', border: 'none', color: '#6366F1', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 500 }}>
                                                设置
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )
                        })()}
                    </div>

                    {/* 提现表单 */}
                    <form onSubmit={handleWithdraw}>
                        <div className="agent-form-row">
                            <label>提现金额</label>
                            <div style={{ position: 'relative' }}>
                                <input type="number" step="0.01" min="100" value={amount}
                                    onChange={e => setAmount(e.target.value)} placeholder="最低提现金额 ¥100" required
                                    style={{ paddingRight: 56 }} />
                                <button type="button"
                                    onClick={() => setAmount(agent.balance.toFixed(2))}
                                    style={{
                                        position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                                        background: '#EEF2FF', border: 'none', color: '#6366F1', fontWeight: 600,
                                        fontSize: '0.78rem', padding: '4px 10px', borderRadius: 6, cursor: 'pointer'
                                    }}>全部</button>
                            </div>
                        </div>
                        <button type="submit" className="agent-submit-btn" disabled={submitting || !accounts[method]}>
                            {submitting ? '提交中...' : !accounts[method] ? '请先保存收款账号' : '申请提现'}
                        </button>
                    </form>
                </div>

                {/* 右侧：提现记录 */}
                <div style={{ background: '#fff', borderRadius: 14, padding: '24px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', minHeight: 280 }}>
                    <h3 style={{ margin: '0 0 16px', fontSize: '1rem', fontWeight: 600, color: '#1F2937', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ display: 'inline-block', width: 4, height: 18, borderRadius: 2, background: 'linear-gradient(180deg, #6366F1, #8B5CF6)' }} />
                        提现记录
                    </h3>
                    {withdrawals.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px 0', color: '#D1D5DB' }}>
                            <FiDollarSign size={36} style={{ marginBottom: 8, opacity: 0.4 }} />
                            <p style={{ margin: 0, fontSize: '0.88rem' }}>暂无提现记录</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {withdrawals.map(w => (
                                <div key={w.id} style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '12px 14px', borderRadius: 10, background: '#F9FAFB', border: '1px solid #F3F4F6'
                                }}>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: '1rem', color: '#111' }}>¥{w.amount.toFixed(2)}</div>
                                        <div style={{ fontSize: '0.75rem', color: '#9CA3AF', marginTop: 2 }}>
                                            {methodLabels[w.method] || w.method} · {w.account}
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <span style={{
                                            display: 'inline-block', padding: '2px 10px', borderRadius: 20,
                                            fontSize: '0.72rem', fontWeight: 600,
                                            background: statusColor[w.status] + '18', color: statusColor[w.status]
                                        }}>{statusLabel[w.status]}</span>
                                        <div style={{ fontSize: '0.72rem', color: '#D1D5DB', marginTop: 4 }}>
                                            {new Date(w.createdAt).toLocaleDateString('zh-CN')}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
// ==================== 店铺设置 ====================
function AgentSettings({ agent, token, onUpdate }) {
    const [form, setForm] = useState({
        shopName: agent.shopName,
        shopSkin: agent.shopSkin,
        shopNotice: agent.shopNotice || '',
        emailNotify: agent.emailNotify !== false,
        notifyEmail: agent.notifyEmail || '',
    })
    const [skinPool, setSkinPool] = useState([])
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        fetch('/api/settings/public').then(r => r.json()).then(d => {
            const pool = d.settings?.agentSkinPool
            setSkinPool(pool ? JSON.parse(pool) : ['zen'])
        }).catch(() => setSkinPool(['zen']))
    }, [])

    const skinNames = { zen: 'Zen 极简', fresh: 'Fresh 清新', classic: '经典风格' }
    const skinDescriptions = {
        zen: '留白克制，适合数字商品和效率型店铺',
        fresh: '明亮清爽，适合轻量零售和年轻化风格',
        classic: '传统商城布局，适合品类较多的分站',
    }
    const storefrontUrl = `${window.location.origin}/s/${agent.shopSlug}`

    const handleSave = async () => {
        setSaving(true)
        try {
            const res = await fetch('/api/agent/profile', {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            })
            if (res.ok) {
                alert('保存成功')
                onUpdate?.()
            }
        } catch { alert('保存失败') }
        setSaving(false)
    }

    return (
        <div className="agent-page agent-settings-page">
            <div className="agent-page-heading">
                <div>
                    <h2>店铺设置</h2>
                    <p>管理分站展示信息、前台皮肤和订单通知。</p>
                </div>
                <a className="agent-page-link" href={storefrontUrl} target="_blank" rel="noreferrer">
                    <FiExternalLink /> 访问分站
                </a>
            </div>

            <div className="agent-settings-shell">
                <section className="agent-settings-panel">
                    <div className="agent-settings-section-head">
                        <span className="agent-settings-icon"><FiSettings /></span>
                        <div>
                            <h3>基础信息</h3>
                            <p>这些信息会展示在分站前台。</p>
                        </div>
                    </div>

                    <div className="agent-form-grid">
                        <div className="agent-form-row">
                            <label>店铺名称</label>
                            <input
                                type="text"
                                value={form.shopName}
                                onChange={e => setForm({ ...form, shopName: e.target.value })}
                                placeholder="输入店铺名称"
                            />
                        </div>
                        <div className="agent-form-row">
                            <label>分站路径</label>
                            <div className="agent-input-with-icon readonly">
                                <FiLink />
                                <input type="text" value={`/s/${agent.shopSlug}`} disabled />
                            </div>
                            <span className="agent-field-hint">路径创建后不可修改</span>
                        </div>
                    </div>

                    <div className="agent-form-row">
                        <label>公告</label>
                        <input
                            type="text"
                            value={form.shopNotice}
                            onChange={e => setForm({ ...form, shopNotice: e.target.value })}
                            placeholder="输入分站顶部通知文字，留空则不显示"
                        />
                        <span className="agent-field-hint">设置后会在分站顶部显示滚动通知横幅</span>
                        {form.shopNotice.trim() && (
                            <div className="agent-notice-preview">
                                <FiBell />
                                <span>{form.shopNotice}</span>
                            </div>
                        )}
                    </div>
                </section>

                <section className="agent-settings-panel">
                    <div className="agent-settings-section-head">
                        <span className="agent-settings-icon"><FiCheckCircle /></span>
                        <div>
                            <h3>前台皮肤</h3>
                            <p>选择客户访问分站时看到的页面风格。</p>
                        </div>
                    </div>

                    <div className="agent-skin-grid">
                        {skinPool.map(s => (
                            <label key={s} className={`agent-skin-card ${form.shopSkin === s ? 'active' : ''}`}>
                                <input
                                    type="radio"
                                    name="skin"
                                    value={s}
                                    checked={form.shopSkin === s}
                                    onChange={() => setForm({ ...form, shopSkin: s })}
                                />
                                <span className="agent-skin-check"><FiCheckCircle /></span>
                                <strong>{skinNames[s] || s}</strong>
                                <small>{skinDescriptions[s] || '适合当前分站的可用主题'}</small>
                            </label>
                        ))}
                    </div>
                </section>

                <section className="agent-settings-panel agent-mail-panel">
                    <div className="agent-settings-section-head">
                        <span className="agent-settings-icon"><FiMail /></span>
                        <div>
                            <h3>邮件通知</h3>
                            <p>分站订单完成后，系统会按设置发送通知。</p>
                        </div>
                    </div>

                    <div className={`agent-notify-row ${form.emailNotify ? 'enabled' : ''}`}>
                        <div>
                            <strong>订单交易通知</strong>
                            <span>分站有新订单完成时发送邮件通知</span>
                        </div>
                        <button
                            type="button"
                            className={`agent-switch ${form.emailNotify ? 'on' : ''}`}
                            onClick={() => setForm({ ...form, emailNotify: !form.emailNotify })}
                            aria-pressed={form.emailNotify}
                            aria-label="切换订单交易通知"
                        >
                            <span />
                        </button>
                    </div>

                    {form.emailNotify && (
                        <div className="agent-form-row agent-email-row">
                            <label>接收邮箱</label>
                            <div className="agent-input-with-icon">
                                <FiMail />
                                <input
                                    type="email"
                                    value={form.notifyEmail}
                                    onChange={e => setForm({ ...form, notifyEmail: e.target.value })}
                                    placeholder="输入接收通知的邮箱地址"
                                />
                            </div>
                            <span className="agent-field-hint">留空则使用注册账号邮箱</span>
                        </div>
                    )}
                </section>

                <div className="agent-settings-actions">
                    <button className="agent-submit-btn" onClick={handleSave} disabled={saving}>
                        {saving ? '保存中...' : '保存设置'}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default AgentDashboard

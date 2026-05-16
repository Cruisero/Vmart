import { useState, useEffect } from 'react'
import { NavLink, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import './Dashboard.css'
import useAuthStore from '../../store/authStore'
import TenantOverview from './Overview'
import TenantSetup from './Setup'
import TenantProducts from './Products'
import TenantOrders from './Orders'
import TenantSettings from './Settings'

const API = import.meta.env.VITE_API_URL || '/api'

export default function TenantDashboard() {
    const { token, user } = useAuthStore()
    const navigate = useNavigate()
    const [tenant, setTenant] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!token) { navigate('/login'); return }
        fetch(`${API}/tenant/me`, { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.json())
            .then(d => { setTenant(d.tenant); setLoading(false) })
            .catch(() => setLoading(false))
    }, [token])

    const statusBadge = {
        PENDING: { label: '待配置', cls: 'pending' },
        REVIEWING: { label: '审核中', cls: 'reviewing' },
        ACTIVE: { label: '运营中', cls: 'active' },
        SUSPENDED: { label: '已暂停', cls: 'suspended' },
        REJECTED: { label: '已拒绝', cls: 'rejected' },
    }

    const navItems = [
        { to: '/tenant/overview', icon: '📊', label: '概览' },
        { to: '/tenant/setup', icon: '⚙️', label: '开通配置' },
        { to: '/tenant/products', icon: '📦', label: '商品管理' },
        { to: '/tenant/orders', icon: '🧾', label: '订单管理' },
        { to: '/tenant/settings', icon: '🔧', label: '店铺设置' },
    ]

    if (loading) return (
        <div className="tenant-loading" style={{ minHeight: '100vh', background: '#0F0F13' }}>
            <div className="tenant-spinner" />
            <span>加载中...</span>
        </div>
    )

    return (
        <div className="tenant-layout">
            {/* 侧边栏 */}
            <aside className="tenant-sidebar">
                <div className="tenant-sidebar-logo">
                    <div className="tenant-sidebar-logo-icon">🏪</div>
                    <div>
                        <div className="tenant-sidebar-logo-text">
                            {tenant?.shopName || '我的商城'}
                        </div>
                        {tenant && (
                            <span className={`tenant-badge ${statusBadge[tenant.status]?.cls}`} style={{ fontSize: '0.65rem', padding: '2px 8px', marginTop: 2 }}>
                                {statusBadge[tenant.status]?.label}
                            </span>
                        )}
                    </div>
                </div>

                <nav className="tenant-sidebar-nav">
                    <div className="tenant-nav-section">控制台</div>
                    {navItems.map(item => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            className={({ isActive }) => `tenant-nav-item${isActive ? ' active' : ''}`}
                        >
                            <span className="nav-icon">{item.icon}</span>
                            {item.label}
                        </NavLink>
                    ))}
                </nav>

                <div className="tenant-sidebar-footer">
                    <div style={{ fontSize: '0.78rem', color: 'var(--tenant-muted)', marginBottom: 8 }}>
                        {user?.email}
                    </div>
                    {tenant?.status === 'ACTIVE' && tenant?.domains?.[0] && (
                        <a
                            href={`https://${tenant.domains[0].domain}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="tenant-btn tenant-btn-success"
                            style={{ width: '100%', justifyContent: 'center', fontSize: '0.78rem', padding: '8px' }}
                        >
                            🔗 访问我的商城
                        </a>
                    )}
                </div>
            </aside>

            {/* 主内容 */}
            <main className="tenant-main">
                <header className="tenant-header">
                    <div className="tenant-header-title">
                        {tenant?.shopName || '商城管理后台'}
                    </div>
                    <div className="tenant-header-user">
                        <span>👤 {user?.username || user?.email}</span>
                        <button
                            onClick={() => { useAuthStore.getState().logout(); navigate('/login') }}
                            style={{ background: 'none', border: 'none', color: 'var(--tenant-muted)', cursor: 'pointer', fontSize: '0.82rem' }}
                        >
                            退出
                        </button>
                    </div>
                </header>

                <div className="tenant-content">
                    <Routes>
                        <Route index element={<Navigate to="overview" replace />} />
                        <Route path="overview" element={<TenantOverview tenant={tenant} token={token} />} />
                        <Route path="setup" element={<TenantSetup tenant={tenant} setTenant={setTenant} token={token} />} />
                        <Route path="products/*" element={<TenantProducts tenant={tenant} token={token} />} />
                        <Route path="orders" element={<TenantOrders tenant={tenant} token={token} />} />
                        <Route path="settings" element={<TenantSettings tenant={tenant} setTenant={setTenant} token={token} />} />
                    </Routes>
                </div>
            </main>
        </div>
    )
}

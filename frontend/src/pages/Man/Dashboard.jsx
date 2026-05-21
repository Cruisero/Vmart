import { useState, useEffect, useRef } from 'react'
import { useNavigate, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom'
import { useMerchantStore } from '../../store/merchantStore'
import ManSupportTickets from './ManSupportTickets'
import './Man.css'

function Sidebar({ onLogout }) {
    const loc = useLocation()
    const items = [
        { path: '/Man/dashboard', icon: '📊', label: '数据概览' },
        { path: '/Man/merchants', icon: '🏪', label: '商户管理' },
        { path: '/Man/plan-config', icon: '📦', label: '套餐管理' },
        { path: '/Man/plan-orders', icon: '💳', label: '所有订单' },
        { path: '/Man/shop-orders', icon: '🛒', label: '商户订单' },
        { path: '/Man/risk-control', icon: '🛡️', label: '风控管理' },
        { path: '/Man/custom-themes', icon: '🎨', label: '主题管理' },
        { path: '/Man/announcements', icon: '📢', label: '公告管理' },
        { path: '/Man/support-tickets', icon: '🎫', label: '商户工单' },
        { path: '/Man/backup', icon: '💾', label: '数据备份' },
        { path: '/Man/settings', icon: '⚙️', label: '平台设置' },
    ]
    return (
        <aside className="man-sidebar">
            <div className="man-brand">
                <span className="man-logo">V</span>
                <div>
                    <div className="man-brand-name">Vmart</div>
                    <div className="man-brand-sub">平台管理后台</div>
                </div>
            </div>
            <nav className="man-nav">
                {items.map(item => (
                    <Link
                        key={item.path}
                        to={item.path}
                        className={`man-nav-item ${loc.pathname === item.path ? 'active' : ''}`}
                    >
                        <span>{item.icon}</span>
                        <span>{item.label}</span>
                    </Link>
                ))}
            </nav>
            <div className="man-sidebar-footer">
                <button className="man-logout" onClick={onLogout}>退出登录</button>
            </div>
        </aside>
    )
}

function Overview({ token }) {
    const [stats, setStats] = useState(null)
    const [trend, setTrend] = useState([])

    useEffect(() => {
        fetch('/api/man/stats', { headers: { 'Authorization': `Bearer ${token}` } })
            .then(r => r.json()).then(d => setStats(d)).catch(() => {})
        fetch('/api/man/trend?days=14', { headers: { 'Authorization': `Bearer ${token}` } })
            .then(r => r.json()).then(d => setTrend(d.trend || [])).catch(() => {})
    }, [token])

    const cards = [
        { label: '商城总数', value: stats?.total ?? '—', color: '#6366f1' },
        { label: '活跃商城', value: stats?.active ?? '—', color: '#10b981' },
        { label: '今日新增', value: stats?.todayNew ?? '—', color: '#f59e0b' },
        { label: '7天内到期', value: stats?.expiringIn7Days ?? '—', color: '#ef4444' },
        { label: '本月收入', value: stats?.monthRevenue != null ? `¥${stats.monthRevenue}` : '—', color: '#8b5cf6' },
        { label: '累计收入', value: stats?.totalRevenue != null ? `¥${stats.totalRevenue}` : '—', color: '#06b6d4' },
    ]

    return (
        <div className="man-page">
            <h1 className="man-page-title">数据概览</h1>
            <div className="man-stats-grid">
                {cards.map(c => (
                    <div key={c.label} className="man-stat-card" style={{ borderTopColor: c.color }}>
                        <div className="man-stat-value" style={{ color: c.color }}>{c.value}</div>
                        <div className="man-stat-label">{c.label}</div>
                    </div>
                ))}
            </div>

            {/* 趋势图 */}
            {trend.length > 0 && (
                <div style={{ marginTop: 28 }}>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e293b', marginBottom: 16 }}>
                        最近 14 天趋势
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16 }}>
                            <div style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: 8 }}>新增商户</div>
                            <div style={{ display: 'flex', alignItems: 'end', gap: 3, height: 80 }}>
                                {trend.map((d, i) => {
                                    const max = Math.max(...trend.map(t => t.merchants), 1)
                                    const h = (d.merchants / max) * 100
                                    return (
                                        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                            <div style={{
                                                width: '100%', height: `${Math.max(h, 4)}%`, minHeight: 3,
                                                background: d.merchants > 0 ? '#6366f1' : '#e2e8f0',
                                                borderRadius: 3
                                            }} title={`${d.date}: ${d.merchants}`} />
                                        </div>
                                    )
                                })}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: '0.68rem', color: '#94a3b8' }}>
                                <span>{trend[0]?.date?.slice(5)}</span>
                                <span>{trend[trend.length - 1]?.date?.slice(5)}</span>
                            </div>
                        </div>
                        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16 }}>
                            <div style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: 8 }}>套餐收入 (¥)</div>
                            <div style={{ display: 'flex', alignItems: 'end', gap: 3, height: 80 }}>
                                {trend.map((d, i) => {
                                    const max = Math.max(...trend.map(t => t.revenue), 1)
                                    const h = (d.revenue / max) * 100
                                    return (
                                        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                            <div style={{
                                                width: '100%', height: `${Math.max(h, 4)}%`, minHeight: 3,
                                                background: d.revenue > 0 ? '#10b981' : '#e2e8f0',
                                                borderRadius: 3
                                            }} title={`${d.date}: ¥${d.revenue}`} />
                                        </div>
                                    )
                                })}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: '0.68rem', color: '#94a3b8' }}>
                                <span>{trend[0]?.date?.slice(5)}</span>
                                <span>{trend[trend.length - 1]?.date?.slice(5)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

function Merchants({ token }) {
    const [merchants, setMerchants] = useState([])
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(true)
    const [editing, setEditing] = useState(null)
    const [patchForm, setPatchForm] = useState({ plan: '', status: '', months: '' })
    const [saving, setSaving] = useState(false)
    const [search, setSearch] = useState('')

    const load = () => {
        setLoading(true)
        const params = search ? `?search=${encodeURIComponent(search)}` : ''
        fetch(`/api/man/merchants${params}`, { headers: { 'Authorization': `Bearer ${token}` } })
            .then(r => r.json())
            .then(d => { setMerchants(d.merchants || []); setTotal(d.total || 0) })
            .finally(() => setLoading(false))
    }

    useEffect(load, [token, search])

    const openEdit = (m) => {
        setEditing(m)
        setPatchForm({ plan: m.shop?.plan || '', status: m.shop?.status || '', months: '' })
    }

    const handlePatch = async () => {
        setSaving(true)
        const body = {}
        if (patchForm.plan) body.plan = patchForm.plan
        if (patchForm.status) body.status = patchForm.status
        if (patchForm.months) body.months = patchForm.months
        await fetch(`/api/man/merchants/${editing.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(body)
        })
        setSaving(false); setEditing(null); load()
    }

    const PLAN_LABELS = { FREE: '免费试用', BASIC: '基础版', STANDARD: '标准版', PRO: '专业版' }
    const STATUS_COLORS = { ACTIVE: '#10b981', EXPIRED: '#ef4444', SUSPENDED: '#f59e0b' }

    return (
        <div className="man-page">
            <div className="man-page-header">
                <h1 className="man-page-title">商户管理</h1>
                <span className="man-total-badge">共 {total} 个商户</span>
            </div>
            <div style={{ marginBottom: 16 }}>
                <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="搜索邮箱、店铺名或 slug..."
                    style={{
                        padding: '9px 14px', width: 280,
                        border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)',
                        background: 'var(--bg-secondary)', color: 'var(--text-primary)',
                        fontSize: '0.85rem', outline: 'none'
                    }}
                />
            </div>
            {loading ? <div className="man-loading">加载中...</div> : (
                <div className="man-table-wrap">
                    <table className="man-table">
                        <thead>
                            <tr>
                                <th>邮箱</th>
                                <th>店铺名</th>
                                <th>商城 slug</th>
                                <th>套餐</th>
                                <th>状态</th>
                                <th>到期时间</th>
                                <th>注册时间</th>
                                <th>操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            {merchants.map(m => (
                                <tr key={m.id}>
                                    <td>{m.email}</td>
                                    <td>{m.shopName}</td>
                                    <td><a href={`/v/${m.shop?.slug}`} target="_blank" rel="noreferrer" className="slug-link">{m.shop?.slug}</a></td>
                                    <td><span className="plan-chip">{PLAN_LABELS[m.shop?.plan] || '—'}</span></td>
                                    <td><span style={{ color: STATUS_COLORS[m.shop?.status] || '#aaa' }}>● {m.shop?.status || '—'}</span></td>
                                    <td className="time-cell">
                                        {m.shop?.planExpiresAt
                                            ? new Date(m.shop.planExpiresAt).toLocaleDateString()
                                            : (m.shop?.trialEndsAt ? `试用至 ${new Date(m.shop.trialEndsAt).toLocaleDateString()}` : '—')}
                                    </td>
                                    <td className="time-cell">{new Date(m.createdAt).toLocaleDateString()}</td>
                                    <td>
                                        <button className="man-btn-edit" onClick={() => openEdit(m)}>管理</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* 编辑弹窗 */}
            {editing && (
                <div className="man-modal-overlay" onClick={() => setEditing(null)}>
                    <div className="man-modal" onClick={e => e.stopPropagation()}>
                        <h3>管理商户：{editing.email}</h3>
                        <div className="man-modal-form">
                            <div className="form-row">
                                <label>套餐</label>
                                <select value={patchForm.plan} onChange={e => setPatchForm(f => ({ ...f, plan: e.target.value }))}>
                                    <option value="">不变</option>
                                    <option value="FREE">免费试用</option>
                                    <option value="BASIC">基础版</option>
                                    <option value="STANDARD">标准版</option>
                                    <option value="PRO">专业版</option>
                                </select>
                            </div>
                            <div className="form-row">
                                <label>状态</label>
                                <select value={patchForm.status} onChange={e => setPatchForm(f => ({ ...f, status: e.target.value }))}>
                                    <option value="">不变</option>
                                    <option value="ACTIVE">正常</option>
                                    <option value="EXPIRED">到期</option>
                                    <option value="SUSPENDED">封禁</option>
                                </select>
                            </div>
                            <div className="form-row">
                                <label>延期（月）</label>
                                <input type="number" min="1" value={patchForm.months} onChange={e => setPatchForm(f => ({ ...f, months: e.target.value }))} placeholder="在现有到期时间上顺延" />
                            </div>
                        </div>
                        <div className="man-modal-actions">
                            <button className="man-btn-cancel" onClick={() => setEditing(null)}>取消</button>
                            <button className="man-btn-save" onClick={handlePatch} disabled={saving}>{saving ? '保存中...' : '保存'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

function PlatformSettings({ token }) {
    const [settings, setSettings] = useState({})
    const [saving, setSaving] = useState(false)
    const [msg, setMsg] = useState('')
    const [activeSection, setActiveSection] = useState('general')

    useEffect(() => {
        fetch('/api/man/settings', { headers: { 'Authorization': `Bearer ${token}` } })
            .then(r => r.json()).then(d => setSettings(d.settings || {})).catch(() => {})
    }, [token])

    const handleSave = async e => {
        e.preventDefault(); setSaving(true); setMsg('')
        const res = await fetch('/api/man/settings', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(settings)
        })
        const d = await res.json()
        setMsg(res.ok ? '✅ 配置已保存' : `❌ ${d.error}`)
        setSaving(false)
    }

    const Toggle = ({ settingKey, label }) => (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{label}</span>
            <label style={{ position: 'relative', width: 42, height: 24, cursor: 'pointer' }}>
                <input type="checkbox" checked={settings[settingKey] === 'true'} onChange={e => setSettings(s => ({ ...s, [settingKey]: e.target.checked ? 'true' : 'false' }))} style={{ display: 'none' }} />
                <span style={{
                    position: 'absolute', inset: 0, borderRadius: 12,
                    background: settings[settingKey] === 'true' ? 'var(--primary)' : 'var(--border-color)',
                    transition: 'background 0.2s'
                }}>
                    <span style={{
                        position: 'absolute', top: 3, left: settings[settingKey] === 'true' ? 21 : 3,
                        width: 18, height: 18, borderRadius: '50%', background: '#fff',
                        transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                    }} />
                </span>
            </label>
        </div>
    )

    return (
        <div className="man-page">
            <h1 className="man-page-title">平台设置</h1>
            {msg && <div className={`man-msg ${msg.startsWith('✅') ? 'success' : 'error'}`}>{msg}</div>}

            {/* Section tabs */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 24, borderBottom: '1px solid var(--border-color)', paddingBottom: 12 }}>
                {[
                    { key: 'general', label: '⚙️ 基本设置' },
                    { key: 'payment', label: '💳 收款配置' },
                    { key: 'channels', label: '🏪 商户支付渠道' },
                    { key: 'email', label: '📧 平台邮件' },
                    { key: 'notify', label: '🔔 通知设置' },
                    { key: 'security', label: '🛡 安全策略' },
                ].map(t => (
                    <button key={t.key} onClick={() => setActiveSection(t.key)} style={{
                        padding: '8px 18px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)',
                        background: activeSection === t.key ? 'rgba(239,68,68,0.15)' : 'transparent',
                        color: activeSection === t.key ? 'var(--primary-light)' : 'var(--text-secondary)',
                        fontWeight: activeSection === t.key ? 600 : 400,
                        borderColor: activeSection === t.key ? 'var(--primary)' : 'var(--border-color)',
                        cursor: 'pointer', fontSize: '0.85rem', fontFamily: 'inherit'
                    }}>{t.label}</button>
                ))}
            </div>

            <form onSubmit={handleSave}>
                {/* 基本设置 */}
                {activeSection === 'general' && (
                    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: 24 }}>
                        <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 20 }}>基本设置</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 480 }}>
                            <div className="form-row">
                                <label style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: 6, display: 'block' }}>平台名称</label>
                                <input value={settings.platform_name || ''} onChange={e => setSettings(s => ({ ...s, platform_name: e.target.value }))} placeholder="Vmart" style={{ width: '100%', padding: '12px 16px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none' }} />
                            </div>
                            <div className="form-row">
                                <label style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: 6, display: 'block' }}>新商户免费试用时长（小时）</label>
                                <input type="number" value={settings.trial_hours || ''} onChange={e => setSettings(s => ({ ...s, trial_hours: e.target.value }))} placeholder="24" style={{ width: '100%', padding: '12px 16px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none' }} />
                            </div>
                            <Toggle settingKey="register_open" label="开放注册" />
                            <Toggle settingKey="merchant_register_otp" label="商户注册：邮箱验证码" />
                            <Toggle settingKey="customer_register_otp" label="商城用户注册：邮箱验证码" />
                            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
                                开启后用户在注册时必须输入邮箱收到的 6 位验证码才能完成注册。商城用户的验证码邮件会以店铺名作为发件人。
                            </p>

                        </div>
                    </div>
                )}

                {/* 收款配置 */}
                {activeSection === 'payment' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        {/* 支付宝当面付 */}
                        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: 24 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                <div>
                                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>支付宝当面付</div>
                                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>商户购买套餐时使用支付宝扫码支付</div>
                                </div>
                                <label style={{ position: 'relative', width: 42, height: 24, cursor: 'pointer' }}>
                                    <input type="checkbox" checked={settings.alipay_enabled === 'true'} onChange={e => setSettings(s => ({ ...s, alipay_enabled: e.target.checked ? 'true' : 'false' }))} style={{ display: 'none' }} />
                                    <span style={{ position: 'absolute', inset: 0, borderRadius: 12, background: settings.alipay_enabled === 'true' ? 'var(--primary)' : 'var(--border-color)', transition: 'background 0.2s' }}>
                                        <span style={{ position: 'absolute', top: 3, left: settings.alipay_enabled === 'true' ? 21 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                                    </span>
                                </label>
                            </div>
                            {settings.alipay_enabled === 'true' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: 16, background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                                    <div>
                                        <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>App ID</label>
                                        <input value={settings.alipay_app_id || ''} onChange={e => setSettings(s => ({ ...s, alipay_app_id: e.target.value }))} placeholder="2021..." style={{ width: '100%', padding: '10px 14px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none', fontFamily: 'monospace' }} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>应用私钥</label>
                                        <input type="password" value={settings.alipay_private_key || ''} onChange={e => setSettings(s => ({ ...s, alipay_private_key: e.target.value }))} placeholder="MIIEvQ..." style={{ width: '100%', padding: '10px 14px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none', fontFamily: 'monospace' }} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>支付宝公钥</label>
                                        <input type="password" value={settings.alipay_public_key || ''} onChange={e => setSettings(s => ({ ...s, alipay_public_key: e.target.value }))} placeholder="MIIBIj..." style={{ width: '100%', padding: '10px 14px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none', fontFamily: 'monospace' }} />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* USDT-TRC20 */}
                        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: 24 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                <div>
                                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>USDT-TRC20</div>
                                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>Tron 网络 USDT 收款</div>
                                </div>
                                <label style={{ position: 'relative', width: 42, height: 24, cursor: 'pointer' }}>
                                    <input type="checkbox" checked={settings.usdt_enabled === 'true'} onChange={e => setSettings(s => ({ ...s, usdt_enabled: e.target.checked ? 'true' : 'false' }))} style={{ display: 'none' }} />
                                    <span style={{ position: 'absolute', inset: 0, borderRadius: 12, background: settings.usdt_enabled === 'true' ? 'var(--primary)' : 'var(--border-color)', transition: 'background 0.2s' }}>
                                        <span style={{ position: 'absolute', top: 3, left: settings.usdt_enabled === 'true' ? 21 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                                    </span>
                                </label>
                            </div>
                            {settings.usdt_enabled === 'true' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: 16, background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                                    <div>
                                        <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>TRC20 收款钱包地址</label>
                                        <input value={settings.usdt_wallet || ''} onChange={e => setSettings(s => ({ ...s, usdt_wallet: e.target.value }))} placeholder="T..." style={{ width: '100%', padding: '10px 14px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none', fontFamily: 'monospace' }} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>USDT-TRC20 折算汇率 (1 USDT = ? 元人民币，默认 7.2)</label>
                                        <input value={settings.usdt_rate || ''} onChange={e => setSettings(s => ({ ...s, usdt_rate: e.target.value }))} placeholder="7.2" type="number" step="0.01" style={{ width: '100%', padding: '10px 14px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none' }} />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* USDT-BEP20 */}
                        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: 24 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                <div>
                                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>USDT-BEP20 (BSC)</div>
                                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>BSC 网络 USDT 收款</div>
                                </div>
                                <label style={{ position: 'relative', width: 42, height: 24, cursor: 'pointer' }}>
                                    <input type="checkbox" checked={settings.bsc_usdt_enabled === 'true'} onChange={e => setSettings(s => ({ ...s, bsc_usdt_enabled: e.target.checked ? 'true' : 'false' }))} style={{ display: 'none' }} />
                                    <span style={{ position: 'absolute', inset: 0, borderRadius: 12, background: settings.bsc_usdt_enabled === 'true' ? 'var(--primary)' : 'var(--border-color)', transition: 'background 0.2s' }}>
                                        <span style={{ position: 'absolute', top: 3, left: settings.bsc_usdt_enabled === 'true' ? 21 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                                    </span>
                                </label>
                            </div>
                            {settings.bsc_usdt_enabled === 'true' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: 16, background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                                    <div>
                                        <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>BEP20 收款钱包地址</label>
                                        <input value={settings.bsc_usdt_wallet || ''} onChange={e => setSettings(s => ({ ...s, bsc_usdt_wallet: e.target.value }))} placeholder="0x..." style={{ width: '100%', padding: '10px 14px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none', fontFamily: 'monospace' }} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>USDT-BEP20 折算汇率 (1 USDT = ? 元人民币，默认 7.2)</label>
                                        <input value={settings.bsc_usdt_rate || ''} onChange={e => setSettings(s => ({ ...s, bsc_usdt_rate: e.target.value }))} placeholder="7.2" type="number" step="0.01" style={{ width: '100%', padding: '10px 14px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none' }} />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* 商户支付渠道 */}
                {activeSection === 'channels' && (
                    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: 24 }}>
                        <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>商户支付渠道管理</div>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 20 }}>控制商户可以使用哪些支付方式收款。禁用后商户将无法在店铺设置中开启该渠道。</p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {[
                                { key: 'channel_alipay', name: '支付宝当面付', desc: '商户配置自己的支付宝 App ID 和密钥收款', defaultDomestic: true, defaultInternational: false },
                                { key: 'channel_wechat', name: '微信支付', desc: '商户配置微信支付商户号收款', defaultDomestic: true, defaultInternational: false },
                                { key: 'channel_usdt_trc20', name: 'USDT-TRC20', desc: '商户配置 TRC20 钱包地址收款', defaultDomestic: false, defaultInternational: true },
                                { key: 'channel_usdt_bep20', name: 'USDT-BEP20 (BSC)', desc: '商户配置 BEP20 钱包地址收款', defaultDomestic: false, defaultInternational: true },
                                { key: 'channel_yipay', name: '在线支付 (易支付)', desc: '商户配置易支付通道收款', defaultDomestic: true, defaultInternational: false },
                            ].map(ch => (
                                <div key={ch.key} style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    padding: '16px 18px', background: 'var(--bg-tertiary)',
                                    border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)',
                                    opacity: settings[ch.key] === 'false' ? 0.5 : 1
                                }}>
                                    <div>
                                        <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>{ch.name}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>{ch.desc}</div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', cursor: 'pointer', color: 'var(--text-primary)' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={settings[`${ch.key}_is_domestic`] !== undefined 
                                                        ? settings[`${ch.key}_is_domestic`] === 'true' 
                                                        : ch.defaultDomestic}
                                                    onChange={e => setSettings(s => ({ ...s, [`${ch.key}_is_domestic`]: e.target.checked ? 'true' : 'false' }))}
                                                    style={{ cursor: 'pointer' }}
                                                />
                                                🇨🇳 国内
                                            </label>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', cursor: 'pointer', color: 'var(--text-primary)' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={settings[`${ch.key}_is_international`] !== undefined 
                                                        ? settings[`${ch.key}_is_international`] === 'true' 
                                                        : ch.defaultInternational}
                                                    onChange={e => setSettings(s => ({ ...s, [`${ch.key}_is_international`]: e.target.checked ? 'true' : 'false' }))}
                                                    style={{ cursor: 'pointer' }}
                                                />
                                                🌐 国际
                                            </label>
                                        </div>
                                        <label style={{ position: 'relative', width: 42, height: 24, cursor: 'pointer' }}>
                                            <input type="checkbox" checked={settings[ch.key] !== 'false'} onChange={e => setSettings(s => ({ ...s, [ch.key]: e.target.checked ? 'true' : 'false' }))} style={{ display: 'none' }} />
                                            <span style={{ position: 'absolute', inset: 0, borderRadius: 12, background: settings[ch.key] !== 'false' ? 'var(--success)' : 'var(--border-color)', transition: 'background 0.2s' }}>
                                                <span style={{ position: 'absolute', top: 3, left: settings[ch.key] !== 'false' ? 21 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                                            </span>
                                        </label>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 平台邮件 SMTP */}
                {activeSection === 'email' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: 24 }}>
                            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>平台代发 SMTP 配置</div>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 20 }}>
                                商户选择"平台代发"模式时，使用此 SMTP 发送邮件。发件人名称显示为商户店铺名。
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: 16, background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                                <div>
                                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>SMTP 服务器</label>
                                    <input value={settings.platform_smtp_host || ''} onChange={e => setSettings(s => ({ ...s, platform_smtp_host: e.target.value }))} placeholder="smtp.example.com" style={{ width: '100%', padding: '10px 14px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none' }} />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                    <div>
                                        <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>端口</label>
                                        <input type="number" value={settings.platform_smtp_port || ''} onChange={e => setSettings(s => ({ ...s, platform_smtp_port: e.target.value }))} placeholder="465" style={{ width: '100%', padding: '10px 14px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none' }} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>发件地址</label>
                                        <input value={settings.platform_smtp_from || ''} onChange={e => setSettings(s => ({ ...s, platform_smtp_from: e.target.value }))} placeholder="noreply@vmart.cc" style={{ width: '100%', padding: '10px 14px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none' }} />
                                    </div>
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>SMTP 用户名</label>
                                    <input value={settings.platform_smtp_user || ''} onChange={e => setSettings(s => ({ ...s, platform_smtp_user: e.target.value }))} placeholder="noreply@vmart.cc" style={{ width: '100%', padding: '10px 14px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none' }} />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>SMTP 密码/授权码</label>
                                    <input type="password" value={settings.platform_smtp_pass || ''} onChange={e => setSettings(s => ({ ...s, platform_smtp_pass: e.target.value }))} placeholder="授权码" style={{ width: '100%', padding: '10px 14px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none' }} />
                                </div>
                            </div>
                            <button type="button" onClick={async () => {
                                setMsg('')
                                try {
                                    const res = await fetch('/api/man/test-email', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                                        body: JSON.stringify({ to: settings.platform_smtp_user || settings.platform_smtp_from })
                                    })
                                    const d = await res.json()
                                    setMsg(res.ok ? '✅ SMTP 连接成功，测试邮件已发送' : `❌ ${d.error}`)
                                } catch { setMsg('❌ 连接失败') }
                            }} style={{ marginTop: 14, padding: '9px 18px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: '0.84rem', cursor: 'pointer', fontFamily: 'inherit', width: '100%', textAlign: 'center' }}>
                                测试邮件连接
                            </button>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 6, textAlign: 'center' }}>先保存设置，再测试连接</div>
                        </div>

                        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: 24 }}>
                            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>邮件额度说明</div>
                            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.8 }}>
                                <div>• 商户选择"平台代发"时，使用上方 SMTP 发送，发件人显示为商户店铺名</div>
                                <div>• 商户选择"自有 SMTP"时，使用商户自己配置的邮箱发送，不受额度限制</div>
                                <div>• 每月额度在套餐管理中配置（emailNotifications 字段）</div>
                                <div>• 基础版默认不支持邮件，标准版/专业版可用</div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 通知设置 */}
                {activeSection === 'notify' && (
                    <NotifySettings token={token} />
                )}

                {/* 安全策略 */}
                {activeSection === 'security' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {/* 启用安全策略 */}
                        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: 24 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>启用安全策略</div>
                                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>总开关，关闭后跳过黑名单与限流</div>
                                </div>
                                <label style={{ position: 'relative', width: 42, height: 24, cursor: 'pointer' }}>
                                    <input type="checkbox" checked={settings.securityEnabled === 'true'} onChange={e => setSettings(s => ({ ...s, securityEnabled: e.target.checked ? 'true' : 'false' }))} style={{ display: 'none' }} />
                                    <span style={{ position: 'absolute', inset: 0, borderRadius: 12, background: settings.securityEnabled === 'true' ? 'var(--primary)' : 'var(--border-color)', transition: 'background 0.2s' }}>
                                        <span style={{ position: 'absolute', top: 3, left: settings.securityEnabled === 'true' ? 21 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                                    </span>
                                </label>
                            </div>
                        </div>

                        {/* IP 黑名单 */}
                        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: 24 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                <div>
                                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>IP 黑名单拦截</div>
                                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>支持单 IP 和 CIDR 网段</div>
                                </div>
                                <label style={{ position: 'relative', width: 42, height: 24, cursor: 'pointer' }}>
                                    <input type="checkbox" checked={settings.securityEnableIpBlock === 'true'} onChange={e => setSettings(s => ({ ...s, securityEnableIpBlock: e.target.checked ? 'true' : 'false' }))} style={{ display: 'none' }} />
                                    <span style={{ position: 'absolute', inset: 0, borderRadius: 12, background: settings.securityEnableIpBlock === 'true' ? 'var(--primary)' : 'var(--border-color)', transition: 'background 0.2s' }}>
                                        <span style={{ position: 'absolute', top: 3, left: settings.securityEnableIpBlock === 'true' ? 21 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                                    </span>
                                </label>
                            </div>
                            {settings.securityEnableIpBlock === 'true' && (
                                <textarea value={settings.securityBlockedIps || ''} onChange={e => setSettings(s => ({ ...s, securityBlockedIps: e.target.value }))} placeholder="每行一个 IP 或 CIDR，如：1.2.3.4 或 45.67.0.0/16" rows={4} style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.85rem', resize: 'vertical', fontFamily: 'monospace', outline: 'none' }} />
                            )}
                        </div>

                        {/* 邮箱后缀黑名单 */}
                        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: 24 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                <div>
                                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>邮箱后缀黑名单</div>
                                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>拦截指定邮箱域名的注册和订单</div>
                                </div>
                                <label style={{ position: 'relative', width: 42, height: 24, cursor: 'pointer' }}>
                                    <input type="checkbox" checked={settings.securityEnableEmailBlock === 'true'} onChange={e => setSettings(s => ({ ...s, securityEnableEmailBlock: e.target.checked ? 'true' : 'false' }))} style={{ display: 'none' }} />
                                    <span style={{ position: 'absolute', inset: 0, borderRadius: 12, background: settings.securityEnableEmailBlock === 'true' ? 'var(--primary)' : 'var(--border-color)', transition: 'background 0.2s' }}>
                                        <span style={{ position: 'absolute', top: 3, left: settings.securityEnableEmailBlock === 'true' ? 21 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                                    </span>
                                </label>
                            </div>
                            {settings.securityEnableEmailBlock === 'true' && (
                                <textarea value={settings.securityBlockedEmails || ''} onChange={e => setSettings(s => ({ ...s, securityBlockedEmails: e.target.value }))} placeholder="每行一个域名后缀，如：mailinator.com" rows={4} style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.85rem', resize: 'vertical', fontFamily: 'monospace', outline: 'none' }} />
                            )}
                        </div>

                        {/* 限流配置 */}
                        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: 24 }}>
                            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>限流配置</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', width: 120 }}>注册限流</span>
                                    <input type="number" value={settings.securityRegisterLimit || '5'} onChange={e => setSettings(s => ({ ...s, securityRegisterLimit: e.target.value }))} style={{ width: 70, padding: '8px 10px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.85rem' }} />
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>次 / 15分钟</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', width: 120 }}>订单查询限流</span>
                                    <input type="number" value={settings.securityQueryLimit || '20'} onChange={e => setSettings(s => ({ ...s, securityQueryLimit: e.target.value }))} style={{ width: 70, padding: '8px 10px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.85rem' }} />
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>次 / 15分钟</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', width: 120 }}>工单创建限流</span>
                                    <input type="number" value={settings.securityTicketLimit || '5'} onChange={e => setSettings(s => ({ ...s, securityTicketLimit: e.target.value }))} style={{ width: 70, padding: '8px 10px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.85rem' }} />
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>次 / 15分钟</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <button type="submit" className="man-btn-save-full" disabled={saving} style={{ marginTop: 24 }}>
                    {saving ? '保存中...' : '保存所有配置'}
                </button>
            </form>
        </div>
    )
}

function PlanOrders({ token }) {
    const [orders, setOrders] = useState([])
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState('')
    const [typeFilter, setTypeFilter] = useState('all')
    const [search, setSearch] = useState('')
    const [detailOrder, setDetailOrder] = useState(null)

    const load = () => {
        setLoading(true)
        const params = new URLSearchParams()
        if (filter) params.set('status', filter)
        if (typeFilter && typeFilter !== 'all') params.set('type', typeFilter)
        if (search) params.set('search', search)
        const qs = params.toString() ? `?${params.toString()}` : ''
        fetch(`/api/man/all-orders${qs}`, { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.json())
            .then(d => { setOrders(d.orders || []); setTotal(d.total || 0) })
            .finally(() => setLoading(false))
    }

    useEffect(load, [token, filter, typeFilter, search])

    const STATUS_MAP = {
        PENDING: { label: '待支付', color: '#f59e0b' },
        REVIEWING: { label: '待审核', color: '#6366f1' },
        PAID: { label: '已完成', color: '#10b981' },
        REJECTED: { label: '已取消', color: '#ef4444' }
    }
    const TYPE_MAP = {
        plan: { label: '套餐', color: '#6366f1', bg: 'rgba(99, 102, 241, 0.1)' },
        email_pack: { label: '邮件包', color: '#0ea5e9', bg: 'rgba(14, 165, 233, 0.1)' }
    }

    return (
        <div className="man-page">
            <div className="man-page-header">
                <h1 className="man-page-title">所有订单</h1>
                <span className="man-total-badge">共 {total} 笔</span>
            </div>

            {/* 类型筛选 */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                {[
                    { key: 'all', label: '全部类型' },
                    { key: 'plan', label: '套餐订单' },
                    { key: 'email_pack', label: '邮件资源包' }
                ].map(t => (
                    <button
                        key={t.key}
                        onClick={() => setTypeFilter(t.key)}
                        style={{
                            background: typeFilter === t.key ? 'var(--primary)' : 'var(--bg-tertiary)',
                            color: typeFilter === t.key ? 'white' : 'var(--text-secondary)',
                            border: 'none', padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'inherit'
                        }}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {/* 状态筛选 */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                {['', 'REVIEWING', 'PENDING', 'PAID', 'REJECTED'].map(s => (
                    <button
                        key={s}
                        onClick={() => setFilter(s)}
                        style={{
                            background: filter === s ? 'var(--primary)' : 'var(--bg-tertiary)',
                            color: filter === s ? 'white' : 'var(--text-secondary)',
                            border: 'none', padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'inherit'
                        }}
                    >
                        {s === '' ? '全部状态' : STATUS_MAP[s]?.label || s}
                    </button>
                ))}
                <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="搜索邮箱或交易号..."
                    style={{
                        marginLeft: 'auto', padding: '7px 14px', width: 200,
                        border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)',
                        background: 'var(--bg-secondary)', color: 'var(--text-primary)',
                        fontSize: '0.82rem', outline: 'none'
                    }}
                />
            </div>

            {loading ? <div className="man-loading">加载中...</div> : orders.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#94a3b8', padding: 40 }}>暂无订单</div>
            ) : (
                <div className="man-table-wrap">
                    <table className="man-table">
                        <thead>
                            <tr>
                                <th>类型</th>
                                <th>商户</th>
                                <th>订单内容</th>
                                <th>金额</th>
                                <th>支付方式</th>
                                <th>交易号</th>
                                <th>状态</th>
                                <th>时间</th>
                                <th>操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.map(o => {
                                const t = TYPE_MAP[o.type] || { label: o.type, color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.1)' }
                                return (
                                    <tr key={`${o.type}-${o.id}`}>
                                        <td>
                                            <span style={{
                                                display: 'inline-block', padding: '2px 10px', borderRadius: 4,
                                                background: t.bg, color: t.color, fontSize: '0.72rem', fontWeight: 600
                                            }}>{t.label}</span>
                                        </td>
                                        <td>{o.merchantEmail || '—'}</td>
                                        <td>{o.productName}</td>
                                        <td style={{ fontWeight: 700 }}>¥{o.amount}</td>
                                        <td>{o.paymentMethod || '—'}</td>
                                        <td style={{ fontSize: '0.75rem', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {o.tradeNo || '—'}
                                        </td>
                                        <td>
                                            <span style={{ color: STATUS_MAP[o.paymentStatus]?.color || '#aaa', fontWeight: 600 }}>
                                                {STATUS_MAP[o.paymentStatus]?.label || o.paymentStatus}
                                            </span>
                                        </td>
                                        <td className="time-cell">{new Date(o.createdAt).toLocaleString()}</td>
                                        <td>
                                            <button
                                                className="man-btn-edit"
                                                style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
                                                onClick={() => setDetailOrder(o)}
                                            >
                                                查看
                                            </button>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* 订单详情弹窗 */}
            {detailOrder && (
                <OrderDetailModal order={detailOrder} onClose={() => setDetailOrder(null)} />
            )}
        </div>
    )
}

// 订单详情弹窗
function OrderDetailModal({ order, onClose }) {
    const STATUS_MAP = {
        PENDING: { label: '待支付', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' },
        REVIEWING: { label: '待审核', color: '#6366f1', bg: 'rgba(99, 102, 241, 0.1)' },
        PAID: { label: '已完成', color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' },
        REJECTED: { label: '已取消', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' }
    }
    const TYPE_MAP = {
        plan: { label: '套餐订单', color: '#6366f1' },
        email_pack: { label: '邮件资源包', color: '#0ea5e9' }
    }
    const PAY_LABEL = { alipay: '支付宝', usdt: 'USDT-TRC20', bsc_usdt: 'USDT-BEP20' }
    const status = STATUS_MAP[order.paymentStatus] || { label: order.paymentStatus, color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.1)' }
    const type = TYPE_MAP[order.type] || { label: order.type, color: '#94a3b8' }

    const Row = ({ label, value, copy }) => (
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border-color)', gap: 12, alignItems: 'center' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', flexShrink: 0 }}>{label}</span>
            <span style={{ color: 'var(--text-primary)', fontSize: '0.88rem', fontWeight: 500, textAlign: 'right', wordBreak: 'break-all' }}>
                {value}
                {copy && (
                    <button
                        onClick={() => { navigator.clipboard.writeText(copy); }}
                        style={{ marginLeft: 8, padding: '2px 8px', fontSize: '0.72rem', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: 4, color: 'var(--text-muted)', cursor: 'pointer' }}
                    >
                        复制
                    </button>
                )}
            </span>
        </div>
    )

    return (
        <div onClick={onClose} style={{
            position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.55)',
            backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999, padding: 20
        }}>
            <div onClick={e => e.stopPropagation()} style={{
                background: 'var(--bg-card)', borderRadius: 14, padding: '24px 26px',
                width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto',
                boxShadow: '0 24px 60px rgba(0, 0, 0, 0.25)',
                position: 'relative'
            }}>
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute', top: 14, right: 14, width: 28, height: 28,
                        border: 'none', background: 'var(--bg-tertiary)', borderRadius: '50%',
                        color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13
                    }}
                >✕</button>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <span style={{ padding: '3px 10px', borderRadius: 4, background: type.color + '20', color: type.color, fontSize: '0.72rem', fontWeight: 600 }}>
                        {type.label}
                    </span>
                    <span style={{ padding: '3px 10px', borderRadius: 4, background: status.bg, color: status.color, fontSize: '0.72rem', fontWeight: 600 }}>
                        {status.label}
                    </span>
                </div>
                <h3 style={{ margin: '8px 0 18px', fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {order.productName}
                </h3>

                <div>
                    <Row label="商户邮箱" value={order.merchantEmail} />
                    {order.merchantName && <Row label="商户名称" value={order.merchantName} />}
                    <Row
                        label="金额"
                        value={<strong style={{ color: 'var(--primary)', fontSize: '1rem' }}>¥{order.amount}</strong>}
                    />
                    <Row label="支付方式" value={PAY_LABEL[order.paymentMethod] || order.paymentMethod || '—'} />
                    <Row label="交易号" value={<code style={{ fontSize: '0.78rem', fontFamily: 'monospace' }}>{order.tradeNo || '—'}</code>} copy={order.tradeNo} />
                    <Row label="创建时间" value={new Date(order.createdAt).toLocaleString()} />
                    {order.paidAt && <Row label="支付时间" value={new Date(order.paidAt).toLocaleString()} />}
                    {order.type === 'plan' && order._raw?.months && (
                        <Row label="时长" value={`${order._raw.months} 个月`} />
                    )}
                    {order.type === 'email_pack' && order._raw?.count && (
                        <Row label="数量" value={`${order._raw.count.toLocaleString()} 封`} />
                    )}
                </div>

                <div style={{ marginTop: 20, padding: '12px 14px', background: 'var(--bg-tertiary)', borderRadius: 8, fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                    💡 所有支付方式均通过支付平台/区块链自动确认，无需人工干预。如有异常订单可联系商户核对交易号。
                </div>
            </div>
        </div>
    )
}

function Announcements({ token }) {
    const [list, setList] = useState([])
    const [loading, setLoading] = useState(true)
    const [form, setForm] = useState({ title: '', content: '' })
    const [editing, setEditing] = useState(null)
    const [msg, setMsg] = useState('')

    const load = () => {
        setLoading(true)
        fetch('/api/man/announcements', { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.json()).then(d => setList(d.announcements || []))
            .finally(() => setLoading(false))
    }

    useEffect(load, [token])

    const handleCreate = async e => {
        e.preventDefault()
        if (!form.title.trim()) return
        setMsg('')
        const res = await fetch('/api/man/announcements', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(form)
        })
        const d = await res.json()
        if (res.ok) { setMsg('✅ 公告已发布'); setForm({ title: '', content: '' }); load() }
        else setMsg(`❌ ${d.error}`)
    }

    const handleToggle = async (item) => {
        await fetch(`/api/man/announcements/${item.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ active: !item.active })
        })
        load()
    }

    const handleDelete = async (item) => {
        if (!confirm(`确定删除公告「${item.title}」？`)) return
        await fetch(`/api/man/announcements/${item.id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` }
        })
        load()
    }

    return (
        <div className="man-page">
            <div className="man-page-header">
                <h1 className="man-page-title">公告管理</h1>
                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>发布的公告会展示在所有商户后台顶部</span>
            </div>
            {msg && <div className={`man-msg ${msg.startsWith('✅') ? 'success' : 'error'}`}>{msg}</div>}

            {/* 发布表单 */}
            <form onSubmit={handleCreate} style={{
                background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 14,
                padding: 24, marginBottom: 28, boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
            }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#0f172a', marginBottom: 16 }}>📝 发布新公告</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: '#64748b', marginBottom: 6 }}>标题 *</label>
                        <input
                            value={form.title}
                            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                            placeholder="例如：系统维护通知"
                            required
                            style={{
                                width: '100%', padding: '11px 14px', border: '1px solid #e2e8f0',
                                borderRadius: 9, fontSize: '0.88rem', outline: 'none', boxSizing: 'border-box',
                                transition: 'border-color 0.15s'
                            }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: '#64748b', marginBottom: 6 }}>详细内容（可选）</label>
                        <textarea
                            value={form.content}
                            onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                            placeholder="补充说明..."
                            rows={3}
                            style={{
                                width: '100%', padding: '11px 14px', border: '1px solid #e2e8f0',
                                borderRadius: 9, fontSize: '0.88rem', resize: 'vertical',
                                boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit'
                            }}
                        />
                    </div>
                </div>
                <button type="submit" style={{
                    marginTop: 16, padding: '10px 24px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    border: 'none', borderRadius: 9, color: '#fff', fontSize: '0.88rem',
                    fontWeight: 600, cursor: 'pointer'
                }}>
                    发布公告
                </button>
            </form>

            {/* 公告列表 */}
            {loading ? <div className="man-loading">加载中...</div> : list.length === 0 ? (
                <div style={{
                    textAlign: 'center', padding: '60px 20px', background: '#ffffff',
                    border: '1px solid #e2e8f0', borderRadius: 14
                }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📢</div>
                    <div style={{ color: '#94a3b8', fontSize: '0.9rem' }}>暂无公告，发布后商户即可看到</div>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {list.map(item => (
                        <div key={item.id} style={{
                            background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12,
                            padding: '18px 22px', transition: 'box-shadow 0.15s',
                            opacity: item.active ? 1 : 0.55,
                            borderLeft: item.active ? '4px solid #6366f1' : '4px solid #cbd5e1'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                                        <strong style={{ color: '#0f172a', fontSize: '0.92rem' }}>{item.title}</strong>
                                        <span style={{
                                            fontSize: '0.68rem', padding: '2px 8px', borderRadius: 10,
                                            background: item.active ? '#ecfdf5' : '#f1f5f9',
                                            color: item.active ? '#059669' : '#94a3b8',
                                            fontWeight: 500
                                        }}>
                                            {item.active ? '展示中' : '已隐藏'}
                                        </span>
                                    </div>
                                    {item.content && (
                                        <p style={{ color: '#64748b', fontSize: '0.82rem', margin: '6px 0 0', lineHeight: 1.5 }}>{item.content}</p>
                                    )}
                                    {item.createdAt && (
                                        <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: 8 }}>
                                            发布于 {new Date(item.createdAt).toLocaleString()}
                                        </div>
                                    )}
                                </div>
                                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                                    <button
                                        onClick={() => handleToggle(item)}
                                        style={{
                                            padding: '6px 12px', borderRadius: 7, border: '1px solid #e2e8f0',
                                            background: '#f8fafc', color: '#475569', fontSize: '0.75rem',
                                            cursor: 'pointer', fontFamily: 'inherit'
                                        }}
                                    >
                                        {item.active ? '隐藏' : '显示'}
                                    </button>
                                    <button
                                        onClick={() => handleDelete(item)}
                                        style={{
                                            padding: '6px 12px', borderRadius: 7, border: '1px solid #fecaca',
                                            background: '#fef2f2', color: '#dc2626', fontSize: '0.75rem',
                                            cursor: 'pointer', fontFamily: 'inherit'
                                        }}
                                    >
                                        删除
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}


function BackupManage({ token }) {
    const [info, setInfo] = useState(null)
    const [loading, setLoading] = useState(true)
    const [running, setRunning] = useState(false)
    const [savingConfig, setSavingConfig] = useState(false)
    const [msg, setMsg] = useState('')
    const [backupConfig, setBackupConfig] = useState({
        enabled: false, frequency: 1, retentionDays: 7, emailEnabled: false, email: ''
    })

    const load = () => {
        setLoading(true)
        fetch('/api/man/backup', { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.json()).then(d => {
                setInfo(d)
                if (d.settings) setBackupConfig(d.settings)
            })
            .finally(() => setLoading(false))
    }

    useEffect(load, [token])

    const handleBackup = async () => {
        setRunning(true); setMsg('')
        try {
            const res = await fetch('/api/man/backup/run', { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
            const d = await res.json()
            if (res.ok) { setMsg(`✅ 备份完成：${d.filename} (${d.sizeMB} MB)`); load() }
            else setMsg(`❌ ${d.error}`)
        } catch { setMsg('❌ 备份失败') }
        finally { setRunning(false) }
    }

    const handleSaveConfig = async () => {
        setSavingConfig(true); setMsg('')
        try {
            // 保存备份配置到商城 settings
            const body = {
                backupEnabled: backupConfig.enabled ? 'true' : 'false',
                backupFrequency: String(backupConfig.frequency),
                backupRetentionDays: String(backupConfig.retentionDays),
                backupEmailEnabled: backupConfig.emailEnabled ? 'true' : 'false',
                backupEmail: backupConfig.email || ''
            }
            const res = await fetch('/api/man/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(body)
            })
            if (res.ok) { setMsg('✅ 备份计划已保存'); load() }
            else setMsg('❌ 保存失败')
        } catch { setMsg('❌ 网络错误') }
        setSavingConfig(false)
    }

    const formatSize = (bytes) => {
        if (!bytes) return '0 B'
        if (bytes < 1024) return bytes + ' B'
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
        return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
    }

    if (loading) return <div className="man-loading">加载中...</div>

    return (
        <div className="man-page">
            <h1 className="man-page-title">数据库备份</h1>
            {msg && <div className={`man-msg ${msg.startsWith('✅') ? 'success' : 'error'}`}>{msg}</div>}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>
                {/* 左侧：备份配置 */}
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
                        <span style={{ fontSize: '1.2rem' }}>⚙️</span>
                        <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>备份配置</span>
                    </div>

                    {/* 启用自动备份 */}
                    <div style={{ padding: '16px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', marginBottom: 16 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>🗂 启用自动备份</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>定时自动备份 MySQL 数据库</div>
                            </div>
                            <label style={{ position: 'relative', width: 42, height: 24, cursor: 'pointer' }}>
                                <input type="checkbox" checked={backupConfig.enabled} onChange={e => setBackupConfig(c => ({ ...c, enabled: e.target.checked }))} style={{ display: 'none' }} />
                                <span style={{ position: 'absolute', inset: 0, borderRadius: 12, background: backupConfig.enabled ? 'var(--success)' : 'var(--border-color)', transition: 'background 0.2s' }}>
                                    <span style={{ position: 'absolute', top: 3, left: backupConfig.enabled ? 21 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                                </span>
                            </label>
                        </div>
                    </div>

                    {/* 备份频率 */}
                    <div style={{ padding: '16px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', marginBottom: 16 }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>⏱ 备份频率</div>
                        <select value={backupConfig.frequency} onChange={e => setBackupConfig(c => ({ ...c, frequency: Number(e.target.value) }))} style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.85rem' }}>
                            <option value={1}>每天 1 次（凌晨3点）</option>
                            <option value={2}>每天 2 次</option>
                            <option value={4}>每天 4 次</option>
                            <option value={6}>每天 6 次</option>
                            <option value={12}>每天 12 次</option>
                            <option value={24}>每小时 1 次</option>
                        </select>
                    </div>

                    {/* 保留天数 */}
                    <div style={{ padding: '16px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', marginBottom: 16 }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>🗑 备份保留天数</div>
                        <select value={backupConfig.retentionDays} onChange={e => setBackupConfig(c => ({ ...c, retentionDays: Number(e.target.value) }))} style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.85rem' }}>
                            <option value={3}>3 天</option>
                            <option value={7}>7 天</option>
                            <option value={14}>14 天</option>
                            <option value={30}>30 天</option>
                            <option value={60}>60 天</option>
                            <option value={90}>90 天</option>
                        </select>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 6 }}>超过保留天数的备份将自动清理</div>
                    </div>

                    {/* 邮件推送 */}
                    <div style={{ padding: '16px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', marginBottom: 20 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>📧 邮件推送</div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>备份完成后发送通知（附带SQL文件）</div>
                            </div>
                            <label style={{ position: 'relative', width: 42, height: 24, cursor: 'pointer' }}>
                                <input type="checkbox" checked={backupConfig.emailEnabled} onChange={e => setBackupConfig(c => ({ ...c, emailEnabled: e.target.checked }))} style={{ display: 'none' }} />
                                <span style={{ position: 'absolute', inset: 0, borderRadius: 12, background: backupConfig.emailEnabled ? 'var(--success)' : 'var(--border-color)', transition: 'background 0.2s' }}>
                                    <span style={{ position: 'absolute', top: 3, left: backupConfig.emailEnabled ? 21 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                                </span>
                            </label>
                        </div>
                        {backupConfig.emailEnabled && (
                            <input value={backupConfig.email || ''} onChange={e => setBackupConfig(c => ({ ...c, email: e.target.value }))} placeholder="接收备份的邮箱" style={{ width: '100%', marginTop: 12, padding: '9px 14px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none' }} />
                        )}
                    </div>

                    <button onClick={handleSaveConfig} disabled={savingConfig} className="man-btn-save-full" style={{ width: '100%' }}>
                        {savingConfig ? '保存中...' : '💾 保存并应用备份计划'}
                    </button>
                </div>

                {/* 右侧：备份记录 + 手动备份 */}
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
                        <span style={{ fontSize: '1.2rem' }}>📁</span>
                        <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>备份记录</span>
                    </div>

                    {info?.backups && info.backups.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                            {info.backups.map(b => (
                                <div key={b.filename} style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    padding: '12px 14px', background: 'var(--bg-tertiary)',
                                    border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)'
                                }}>
                                    <div>
                                        <div style={{ fontSize: '0.82rem', fontFamily: 'monospace', color: 'var(--text-primary)' }}>{b.filename}</div>
                                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>{new Date(b.createdAt).toLocaleString()}</div>
                                    </div>
                                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 500 }}>{formatSize(b.size)}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                            <div style={{ fontSize: '2.5rem', marginBottom: 8, opacity: 0.4 }}>📂</div>
                            <div style={{ fontSize: '0.88rem' }}>暂无备份文件</div>
                            <div style={{ fontSize: '0.78rem', marginTop: 4 }}>启用自动备份或手动执行一次备份</div>
                        </div>
                    )}

                    <button onClick={handleBackup} disabled={running} className="man-btn-save-full" style={{ width: '100%', background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}>
                        {running ? '备份中...' : '🚀 立即执行备份'}
                    </button>
                </div>
            </div>
        </div>
    )
}

function PlanConfigPage({ token }) {
    const [config, setConfig] = useState({ plans: [], trialHours: 48 })
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [msg, setMsg] = useState('')

    useEffect(() => {
        fetch('/api/man/plan-config', { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.json()).then(d => setConfig(d)).catch(() => {})
            .finally(() => setLoading(false))
    }, [token])

    const updatePlan = (idx, field, value) => {
        setConfig(c => {
            const plans = [...c.plans]
            if (field.startsWith('features.')) {
                const fKey = field.split('.')[1]
                plans[idx] = { ...plans[idx], features: { ...plans[idx].features, [fKey]: value } }
            } else {
                plans[idx] = { ...plans[idx], [field]: value }
            }
            return { ...c, plans }
        })
    }

    const handleSave = async () => {
        setSaving(true); setMsg('')
        try {
            const res = await fetch('/api/man/plan-config', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(config)
            })
            const d = await res.json()
            setMsg(res.ok ? '✅ 套餐配置已保存' : `❌ ${d.error}`)
        } catch { setMsg('❌ 网络错误') }
        setSaving(false)
    }

    if (loading) return <div className="man-loading">加载中...</div>

    return (
        <div className="man-page">
            <div className="man-page-header">
                <h1 className="man-page-title">套餐管理</h1>
            </div>
            {msg && <div className={`man-msg ${msg.startsWith('✅') ? 'success' : 'error'}`}>{msg}</div>}

            {/* 全局设置 */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: 20, marginBottom: 24 }}>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>全局设置</div>
                <div style={{ display: 'flex', gap: 24 }}>
                    <div>
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>免费试用时长（小时）</label>
                        <input type="number" value={config.trialHours || ''} onChange={e => setConfig(c => ({ ...c, trialHours: parseInt(e.target.value) || 48 }))} style={{ padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', width: 100 }} />
                    </div>
                </div>
            </div>

            {/* 套餐列表 */}
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${config.plans.length}, 1fr)`, gap: 16, marginBottom: 24 }}>
                {config.plans.map((plan, idx) => (
                    <div key={idx} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: 20 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div>
                                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>套餐 Key</label>
                                <input value={plan.key} onChange={e => updatePlan(idx, 'key', e.target.value)} style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border-color)', borderRadius: 6, background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.85rem' }} />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>名称</label>
                                <input value={plan.name} onChange={e => updatePlan(idx, 'name', e.target.value)} style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border-color)', borderRadius: 6, background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.85rem' }} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                <div>
                                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>月付价格</label>
                                    <input type="number" value={plan.monthlyPrice} onChange={e => updatePlan(idx, 'monthlyPrice', Number(e.target.value))} style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border-color)', borderRadius: 6, background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.85rem' }} />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>年付价格/月</label>
                                    <input type="number" value={plan.yearlyPrice} onChange={e => updatePlan(idx, 'yearlyPrice', Number(e.target.value))} style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border-color)', borderRadius: 6, background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.85rem' }} />
                                </div>
                            </div>

                            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 12, marginTop: 4 }}>
                                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>功能限制</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    <div>
                                        <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>商品数量</label>
                                        <input type="number" value={plan.features?.maxProducts || 0} onChange={e => updatePlan(idx, 'features.maxProducts', Number(e.target.value))} style={{ width: '100%', padding: '6px 10px', border: '1px solid var(--border-color)', borderRadius: 6, background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.82rem' }} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>主题皮肤</label>
                                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                                            {['fresh', 'zen', 'class'].map(skin => {
                                                const SKIN_LABELS = { fresh: 'Fresh', zen: 'Zen', class: 'Class' }
                                                const skins = Array.isArray(plan.features?.skins) ? plan.features.skins : (plan.features?.skins === '全部' ? ['fresh','zen','class'] : [plan.features?.skins || 'fresh'])
                                                const checked = skins.includes(skin)
                                                return (
                                                    <label key={skin} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8rem', color: 'var(--text-primary)', cursor: 'pointer' }}>
                                                        <input type="checkbox" checked={checked} onChange={e => {
                                                            let newSkins = [...skins]
                                                            if (e.target.checked) { newSkins.push(skin) } else { newSkins = newSkins.filter(s => s !== skin) }
                                                            updatePlan(idx, 'features.skins', newSkins)
                                                        }} style={{ accentColor: 'var(--primary)' }} />
                                                        {SKIN_LABELS[skin]}
                                                    </label>
                                                )
                                            })}
                                            <button type="button" onClick={() => updatePlan(idx, 'features.skins', ['fresh','zen','class'])} style={{ fontSize: '0.7rem', padding: '2px 8px', border: '1px solid var(--border-color)', borderRadius: 4, background: 'var(--bg-tertiary)', color: 'var(--text-muted)', cursor: 'pointer' }}>全选</button>
                                        </div>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>邮件通知额度</label>
                                        <input type="number" value={plan.features?.emailNotifications || 0} onChange={e => updatePlan(idx, 'features.emailNotifications', Number(e.target.value))} style={{ width: '100%', padding: '6px 10px', border: '1px solid var(--border-color)', borderRadius: 6, background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.82rem' }} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>子管理员数量</label>
                                        <input type="number" min={0} value={plan.features?.maxSubAdmins ?? 0} onChange={e => updatePlan(idx, 'features.maxSubAdmins', Number(e.target.value))} style={{ width: '100%', padding: '6px 10px', border: '1px solid var(--border-color)', borderRadius: 6, background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.82rem' }} />
                                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>0 = 不允许；-1 = 不限</span>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>数据保留（天）</label>
                                        <input type="number" value={plan.features?.dataRetentionDays || 30} onChange={e => updatePlan(idx, 'features.dataRetentionDays', Number(e.target.value))} style={{ width: '100%', padding: '6px 10px', border: '1px solid var(--border-color)', borderRadius: 6, background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.82rem' }} />
                                    </div>
                                    {[
                                        { key: 'customDomain', label: '自定义域名' },
                                        { key: 'agentSystem', label: '代理商系统' },
                                        { key: 'support', label: '联系客服（商户提交工单到平台）' },
                                        { key: 'customerTickets', label: '工单管理（商城用户工单）' },
                                    ].map(f => (
                                        <label key={f.key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', color: 'var(--text-primary)', cursor: 'pointer' }}>
                                            <input type="checkbox" checked={!!plan.features?.[f.key]} onChange={e => updatePlan(idx, `features.${f.key}`, e.target.checked)} style={{ accentColor: 'var(--primary)' }} />
                                            {f.label}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <button onClick={handleSave} disabled={saving} className="man-btn-save-full">
                {saving ? '保存中...' : '保存套餐配置'}
            </button>
        </div>
    )
}

function ThemeManage({ token }) {
    const [config, setConfig] = useState(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [msg, setMsg] = useState('')

    // 默认主题配置
    const defaultConfig = {
        themes: [
            {
                key: 'classic',
                name: '经典主题',
                description: '功能完整：搜索、购物车、工单、完整用户中心',
                enabled: true,
                skins: [
                    { key: 'classic', name: 'Classic', description: '深色顶部导航栏', enabled: true }
                ]
            },
            {
                key: 'minimal',
                name: '简约主题',
                description: '精简轻量：快速下单、订单查询',
                enabled: true,
                skins: [
                    { key: 'fresh', name: 'Fresh', description: '清新明亮，白色背景', enabled: true },
                    { key: 'zen', name: 'Zen', description: '深色质感，极简留白', enabled: true }
                ]
            }
        ]
    }

    useEffect(() => {
        fetch('/api/man/settings', { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.json())
            .then(d => {
                if (d.settings?.theme_config) {
                    try { setConfig(JSON.parse(d.settings.theme_config)) } catch { setConfig(defaultConfig) }
                } else {
                    setConfig(defaultConfig)
                }
            })
            .finally(() => setLoading(false))
    }, [token])

    const handleSave = async () => {
        setSaving(true); setMsg('')
        try {
            const res = await fetch('/api/man/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ theme_config: JSON.stringify(config) })
            })
            setMsg(res.ok ? '✅ 主题配置已保存' : '❌ 保存失败')
        } catch { setMsg('❌ 网络错误') }
        setSaving(false)
    }

    const toggleTheme = (themeIdx) => {
        setConfig(c => {
            const themes = [...c.themes]
            themes[themeIdx] = { ...themes[themeIdx], enabled: !themes[themeIdx].enabled }
            return { ...c, themes }
        })
    }

    const toggleSkin = (themeIdx, skinIdx) => {
        setConfig(c => {
            const themes = [...c.themes]
            const skins = [...themes[themeIdx].skins]
            skins[skinIdx] = { ...skins[skinIdx], enabled: !skins[skinIdx].enabled }
            themes[themeIdx] = { ...themes[themeIdx], skins }
            return { ...c, themes }
        })
    }

    if (loading) return <div className="man-loading">加载中...</div>

    return (
        <div className="man-page">
            <div className="man-page-header">
                <h1 className="man-page-title">主题管理</h1>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 24 }}>
                管理平台可用的主题和皮肤。主题决定功能集，皮肤决定外观样式。
            </p>
            {msg && <div className={`man-msg ${msg.startsWith('✅') ? 'success' : 'error'}`}>{msg}</div>}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 24 }}>
                {config?.themes?.map((theme, tIdx) => (
                    <div key={theme.key} style={{
                        background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-md)', overflow: 'hidden',
                        opacity: theme.enabled ? 1 : 0.5
                    }}>
                        {/* 主题头部 */}
                        <div style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '18px 24px', borderBottom: '1px solid var(--border-color)',
                            background: 'var(--bg-secondary)'
                        }}>
                            <div>
                                <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                    {theme.name}
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400, marginLeft: 8 }}>
                                        ({theme.key})
                                    </span>
                                </div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>{theme.description}</div>
                            </div>
                            <label style={{ position: 'relative', width: 42, height: 24, cursor: 'pointer' }}>
                                <input type="checkbox" checked={theme.enabled} onChange={() => toggleTheme(tIdx)} style={{ display: 'none' }} />
                                <span style={{
                                    position: 'absolute', inset: 0, borderRadius: 12,
                                    background: theme.enabled ? 'var(--primary)' : 'var(--border-color)', transition: 'background 0.2s'
                                }}>
                                    <span style={{
                                        position: 'absolute', top: 3, left: theme.enabled ? 21 : 3,
                                        width: 18, height: 18, borderRadius: '50%', background: '#fff',
                                        transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                                    }} />
                                </span>
                            </label>
                        </div>

                        {/* 皮肤列表 */}
                        <div style={{ padding: '16px 24px' }}>
                            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 12 }}>
                                皮肤 ({theme.skins.length})
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {theme.skins.map((skin, sIdx) => (
                                    <div key={skin.key} style={{
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        padding: '12px 16px', background: 'var(--bg-tertiary)',
                                        border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)',
                                        opacity: skin.enabled ? 1 : 0.5
                                    }}>
                                        <div>
                                            <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                                {skin.name}
                                                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: 6 }}>({skin.key})</span>
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>{skin.description}</div>
                                        </div>
                                        <label style={{ position: 'relative', width: 36, height: 20, cursor: 'pointer' }}>
                                            <input type="checkbox" checked={skin.enabled} onChange={() => toggleSkin(tIdx, sIdx)} style={{ display: 'none' }} />
                                            <span style={{
                                                position: 'absolute', inset: 0, borderRadius: 10,
                                                background: skin.enabled ? 'var(--success)' : 'var(--border-color)', transition: 'background 0.2s'
                                            }}>
                                                <span style={{
                                                    position: 'absolute', top: 2, left: skin.enabled ? 18 : 2,
                                                    width: 16, height: 16, borderRadius: '50%', background: '#fff',
                                                    transition: 'left 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.2)'
                                                }} />
                                            </span>
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <button onClick={handleSave} disabled={saving} className="man-btn-save-full">
                {saving ? '保存中...' : '保存主题配置'}
            </button>
        </div>
    )
}

// ─── 商户订单监控 ──────────────────────────────────────────
function ShopOrders({ token }) {
    const [orders, setOrders] = useState([])
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(true)
    const [page, setPage] = useState(1)
    const [filters, setFilters] = useState({
        search: '', status: '', flagged: false, paymentMethod: '',
        minAmount: '', maxAmount: '', startDate: '', endDate: ''
    })
    const [detailOrder, setDetailOrder] = useState(null)
    const [tenants, setTenants] = useState([])
    const [tenantFilter, setTenantFilter] = useState('') // tenantId
    const [tenantQuery, setTenantQuery] = useState('') // 输入框文本
    const [tenantOpen, setTenantOpen] = useState(false)
    const tenantBoxRef = useRef(null)

    const load = () => {
        setLoading(true)
        const params = new URLSearchParams()
        params.set('page', page)
        params.set('limit', 30)
        if (filters.search) params.set('search', filters.search)
        if (filters.status) params.set('status', filters.status)
        if (filters.flagged) params.set('flagged', 'true')
        if (filters.paymentMethod) params.set('paymentMethod', filters.paymentMethod)
        if (filters.minAmount) params.set('minAmount', filters.minAmount)
        if (filters.maxAmount) params.set('maxAmount', filters.maxAmount)
        if (filters.startDate) params.set('startDate', filters.startDate)
        if (filters.endDate) params.set('endDate', filters.endDate)
        if (tenantFilter) params.set('tenantId', tenantFilter)

        fetch(`/api/man/shop-orders?${params.toString()}`, { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.json())
            .then(d => { setOrders(d.orders || []); setTotal(d.total || 0) })
            .finally(() => setLoading(false))
    }

    useEffect(load, [token, page, filters, tenantFilter])

    // 加载商户列表用于筛选
    useEffect(() => {
        fetch('/api/man/merchants?limit=200', { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.json())
            .then(d => setTenants(d.merchants || []))
            .catch(() => {})
    }, [token])

    // 点击外部关闭商户下拉
    useEffect(() => {
        const handler = (e) => {
            if (tenantBoxRef.current && !tenantBoxRef.current.contains(e.target)) {
                setTenantOpen(false)
            }
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    const STATUS_MAP = {
        PENDING: { label: '待支付', color: '#f59e0b' },
        PAID: { label: '已支付', color: '#3b82f6' },
        COMPLETED: { label: '已完成', color: '#10b981' },
        CANCELLED: { label: '已取消', color: '#94a3b8' },
        REFUNDING: { label: '退款中', color: '#f97316' },
        REFUNDED: { label: '已退款', color: '#a78bfa' }
    }

    return (
        <div className="man-page">
            <div className="man-page-header">
                <h1 className="man-page-title">商户订单监控</h1>
                <span className="man-total-badge">共 {total} 笔</span>
            </div>

            <div className="so-filter-bar">
                <div className="so-filter-row">
                    <div ref={tenantBoxRef} className="so-filter-field so-filter-merchant">
                        <label>商户</label>
                        <div className="so-input-wrap">
                            <span className="so-input-icon">🏪</span>
                            <input
                                value={tenantQuery}
                                onChange={e => { setTenantQuery(e.target.value); setTenantOpen(true); if (!e.target.value) { setTenantFilter(''); setPage(1) } }}
                                onFocus={() => setTenantOpen(true)}
                                placeholder={tenantFilter ? '已选择' : '搜索店铺名/邮箱/slug'}
                            />
                            {tenantFilter && (
                                <button
                                    type="button"
                                    onClick={() => { setTenantFilter(''); setTenantQuery(''); setPage(1); setTenantOpen(false) }}
                                    className="so-input-clear"
                                    aria-label="清除"
                                >✕</button>
                            )}
                        </div>
                        {tenantOpen && (
                            <div className="so-dropdown">
                                <div
                                    onClick={() => { setTenantFilter(''); setTenantQuery(''); setTenantOpen(false); setPage(1) }}
                                    className={`so-dropdown-item all ${!tenantFilter ? 'active' : ''}`}
                                >
                                    全部商户
                                </div>
                                {(() => {
                                    const q = tenantQuery.trim().toLowerCase()
                                    const filtered = tenants.filter(m => {
                                        if (!q) return true
                                        return [m.email, m.shopName, m.shop?.slug]
                                            .filter(Boolean)
                                            .some(s => String(s).toLowerCase().includes(q))
                                    }).slice(0, 50)
                                    if (filtered.length === 0) return (
                                        <div className="so-dropdown-empty">无匹配商户</div>
                                    )
                                    return filtered.map(m => (
                                        <div
                                            key={m.id}
                                            onClick={() => {
                                                if (!m.tenantId) {
                                                    alert('该商户未关联 tenant，无法筛选')
                                                    return
                                                }
                                                setTenantFilter(m.tenantId)
                                                setTenantQuery(`${m.shopName} (${m.email})`)
                                                setTenantOpen(false)
                                                setPage(1)
                                            }}
                                            className={`so-dropdown-item ${tenantFilter === m.tenantId ? 'active' : ''}`}
                                        >
                                            <div className="so-dropdown-title">{m.shopName || '(未命名)'}</div>
                                            <div className="so-dropdown-meta">{m.email} · {m.shop?.slug || '—'}</div>
                                        </div>
                                    ))
                                })()}
                            </div>
                        )}
                    </div>

                    <div className="so-filter-field">
                        <label>关键词</label>
                        <div className="so-input-wrap">
                            <span className="so-input-icon">🔍</span>
                            <input
                                value={filters.search}
                                onChange={e => { setFilters(f => ({ ...f, search: e.target.value })); setPage(1) }}
                                placeholder="订单号 / 商品名 / 邮箱"
                            />
                        </div>
                    </div>

                    <div className="so-filter-field" style={{ minWidth: 130 }}>
                        <label>状态</label>
                        <select value={filters.status} onChange={e => { setFilters(f => ({ ...f, status: e.target.value })); setPage(1) }}>
                            <option value="">全部</option>
                            {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                        </select>
                    </div>

                    <div className="so-filter-field" style={{ minWidth: 140 }}>
                        <label>支付方式</label>
                        <select value={filters.paymentMethod} onChange={e => { setFilters(f => ({ ...f, paymentMethod: e.target.value })); setPage(1) }}>
                            <option value="">全部</option>
                            <option value="alipay">支付宝</option>
                            <option value="wechat">微信</option>
                            <option value="usdt">USDT-TRC20</option>
                            <option value="bsc_usdt">USDT-BEP20</option>
                        </select>
                    </div>

                    <div className="so-filter-field" style={{ minWidth: 200 }}>
                        <label>金额范围 (¥)</label>
                        <div className="so-amount-range">
                            <input type="number" value={filters.minAmount} onChange={e => { setFilters(f => ({ ...f, minAmount: e.target.value })); setPage(1) }} placeholder="最低" />
                            <span className="so-range-divider">—</span>
                            <input type="number" value={filters.maxAmount} onChange={e => { setFilters(f => ({ ...f, maxAmount: e.target.value })); setPage(1) }} placeholder="最高" />
                        </div>
                    </div>

                    <div className="so-filter-field">
                        <label>下单时间</label>
                        <div className="so-amount-range">
                            <input type="date" value={filters.startDate} onChange={e => { setFilters(f => ({ ...f, startDate: e.target.value })); setPage(1) }} />
                            <span className="so-range-divider">—</span>
                            <input type="date" value={filters.endDate} onChange={e => { setFilters(f => ({ ...f, endDate: e.target.value })); setPage(1) }} />
                        </div>
                    </div>
                </div>

                <div className="so-filter-actions">
                    <label className={`so-flag-toggle ${filters.flagged ? 'active' : ''}`}>
                        <input type="checkbox" checked={filters.flagged} onChange={e => { setFilters(f => ({ ...f, flagged: e.target.checked })); setPage(1) }} />
                        <span className="so-flag-icon">🚩</span>
                        仅看违禁词命中
                    </label>
                    <button
                        type="button"
                        className="so-reset-btn"
                        onClick={() => {
                            setFilters({ search: '', status: '', flagged: false, paymentMethod: '', minAmount: '', maxAmount: '', startDate: '', endDate: '' })
                            setTenantFilter('')
                            setTenantQuery('')
                            setPage(1)
                        }}
                    >
                        重置筛选
                    </button>
                </div>
            </div>

            {loading ? <div className="man-loading">加载中...</div> : orders.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#94a3b8', padding: 40 }}>暂无订单</div>
            ) : (
                <div className="man-table-wrap">
                    <table className="man-table">
                        <thead>
                            <tr>
                                <th>订单号</th>
                                <th>商户</th>
                                <th>商品</th>
                                <th>买家</th>
                                <th>金额</th>
                                <th>支付</th>
                                <th>IP</th>
                                <th>状态</th>
                                <th>风控</th>
                                <th>时间</th>
                                <th>操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.map(o => {
                                const s = STATUS_MAP[o.status] || { label: o.status, color: '#94a3b8' }
                                return (
                                    <tr key={o.id} style={{ background: o.isFlagged ? 'rgba(239, 68, 68, 0.04)' : 'transparent' }}>
                                        <td style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{o.orderNo}</td>
                                        <td>{o.tenant?.shopName || '—'}<div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{o.tenant?.shopSlug}</div></td>
                                        <td style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.productName} × {o.quantity}</td>
                                        <td style={{ fontSize: '0.78rem' }}>{o.email}</td>
                                        <td style={{ fontWeight: 700 }}>¥{o.totalAmount}</td>
                                        <td style={{ fontSize: '0.75rem' }}>{o.paymentMethod || '—'}</td>
                                        <td style={{ fontSize: '0.7rem', fontFamily: 'monospace' }}>{o.ipAddress || '—'}</td>
                                        <td><span style={{ color: s.color, fontWeight: 600 }}>{s.label}</span></td>
                                        <td>
                                            {o.isFlagged ? (
                                                <span title={o.riskHits.join(', ')} style={{
                                                    background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444',
                                                    padding: '2px 8px', borderRadius: 4, fontSize: '0.72rem', fontWeight: 600
                                                }}>
                                                    🚩 命中 {o.riskHits.length}
                                                </span>
                                            ) : <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>—</span>}
                                        </td>
                                        <td className="time-cell">{new Date(o.createdAt).toLocaleString()}</td>
                                        <td>
                                            <button
                                                className="man-btn-edit"
                                                style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
                                                onClick={() => setDetailOrder(o)}
                                            >
                                                查看
                                            </button>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* 分页 */}
            {total > 30 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
                    <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="man-btn-edit">上一页</button>
                    <span style={{ padding: '6px 12px', color: 'var(--text-muted)' }}>第 {page} / {Math.ceil(total / 30)} 页</span>
                    <button disabled={page * 30 >= total} onClick={() => setPage(p => p + 1)} className="man-btn-edit">下一页</button>
                </div>
            )}

            {detailOrder && <ShopOrderDetailModal token={token} orderId={detailOrder.id} onClose={() => { setDetailOrder(null); load() }} />}
        </div>
    )
}

const inputStyle = {
    width: '100%', padding: '7px 10px', border: '1px solid var(--border-color)',
    borderRadius: 6, background: 'var(--bg-secondary)', color: 'var(--text-primary)',
    fontSize: '0.82rem', outline: 'none', fontFamily: 'inherit'
}

// 商户订单详情弹窗
function ShopOrderDetailModal({ token, orderId, onClose }) {
    const [order, setOrder] = useState(null)
    const [loading, setLoading] = useState(true)
    const [showCards, setShowCards] = useState(false)

    useEffect(() => {
        fetch(`/api/man/shop-orders/${orderId}`, { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.json())
            .then(d => setOrder(d.order))
            .finally(() => setLoading(false))
    }, [orderId])

    const handleSuspend = async () => {
        if (!order?.tenant?.id) return
        const reason = prompt('冻结原因（必填）')
        if (!reason) return
        const r = await fetch(`/api/man/merchants/${order.tenant.id}/suspend`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ reason })
        })
        const d = await r.json()
        if (r.ok) {
            alert('商户已冻结')
            setOrder(o => ({ ...o, tenant: { ...o.tenant, status: 'SUSPENDED' } }))
        } else {
            alert(d.error || '操作失败')
        }
    }

    const handleUnsuspend = async () => {
        if (!order?.tenant?.id) return
        if (!confirm('确认解冻该商户？')) return
        const r = await fetch(`/api/man/merchants/${order.tenant.id}/unsuspend`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` }
        })
        const d = await r.json()
        if (r.ok) {
            alert('商户已解冻')
            setOrder(o => ({ ...o, tenant: { ...o.tenant, status: 'ACTIVE' } }))
        } else {
            alert(d.error || '操作失败')
        }
    }

    return (
        <div onClick={onClose} className="ep-overlay">
            <div onClick={e => e.stopPropagation()} className="ep-modal" style={{ maxWidth: 640 }}>
                <button onClick={onClose} className="ep-close" aria-label="关闭">✕</button>
                {loading ? <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>加载中...</div> : !order ? (
                    <div style={{ padding: 40, textAlign: 'center', color: '#ef4444' }}>订单不存在</div>
                ) : (
                    <>
                        <h3 style={{ margin: '0 0 14px', fontSize: '1.1rem', color: 'var(--text-primary)' }}>订单详情</h3>

                        {order.riskHits?.length > 0 && (
                            <div style={{ padding: '10px 14px', marginBottom: 14, background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 8, fontSize: '0.82rem' }}>
                                <strong style={{ color: '#ef4444' }}>🚩 风控命中：</strong>
                                <span style={{ color: '#dc2626', marginLeft: 6 }}>{order.riskHits.join(', ')}</span>
                            </div>
                        )}

                        <DetailSection title="订单信息">
                            <DetailRow label="订单号" value={<code>{order.orderNo}</code>} />
                            <DetailRow label="商品" value={`${order.productName} × ${order.quantity}`} />
                            {order.product?.description && <DetailRow label="商品描述" value={order.product.description} />}
                            <DetailRow label="单价 / 总额" value={`¥${order.unitPrice} / ¥${order.totalAmount}`} />
                            <DetailRow label="状态" value={order.status} />
                            <DetailRow label="支付方式" value={order.paymentMethod || '—'} />
                            <DetailRow label="买家邮箱" value={order.email} />
                            <DetailRow label="IP" value={<code>{order.ipAddress || '—'}</code>} />
                            <DetailRow label="UA" value={<span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{order.userAgent || '—'}</span>} />
                            <DetailRow label="下单时间" value={new Date(order.createdAt).toLocaleString()} />
                            {order.paidAt && <DetailRow label="支付时间" value={new Date(order.paidAt).toLocaleString()} />}
                        </DetailSection>

                        <DetailSection title="商户信息">
                            <DetailRow label="店铺名" value={order.tenant?.shopName || '—'} />
                            <DetailRow label="Slug" value={<code>{order.tenant?.shopSlug || '—'}</code>} />
                            <DetailRow label="商户邮箱" value={order.tenant?.user?.email || '—'} />
                            <DetailRow label="状态" value={
                                <span style={{
                                    padding: '2px 10px', borderRadius: 4, fontSize: '0.72rem', fontWeight: 600,
                                    background: order.tenant?.status === 'ACTIVE' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                    color: order.tenant?.status === 'ACTIVE' ? '#10b981' : '#ef4444'
                                }}>{order.tenant?.status === 'SUSPENDED' ? '已冻结' : order.tenant?.status === 'ACTIVE' ? '正常' : order.tenant?.status}</span>
                            } />
                        </DetailSection>

                        {/* 卡密内容 - 默认隐藏，需要点击「查看」二次确认 */}
                        {order.cards?.length > 0 && (
                            <DetailSection title={`卡密 (${order.cards.length} 张)`}>
                                {!showCards ? (
                                    <button onClick={() => setShowCards(true)} style={{
                                        padding: '6px 14px', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b',
                                        border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: 6,
                                        fontSize: '0.78rem', cursor: 'pointer'
                                    }}>
                                        ⚠️ 查看卡密内容（操作将记录审计日志）
                                    </button>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                        {order.cards.map(c => (
                                            <code key={c.id} style={{ padding: '6px 10px', background: 'var(--bg-tertiary)', borderRadius: 4, fontSize: '0.75rem' }}>
                                                {c.content}
                                            </code>
                                        ))}
                                    </div>
                                )}
                            </DetailSection>
                        )}

                        {/* 操作 */}
                        <div style={{ marginTop: 18, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                            {order.tenant?.status !== 'SUSPENDED' ? (
                                <button onClick={handleSuspend} style={{
                                    padding: '8px 18px', background: '#ef4444', color: '#fff',
                                    border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600
                                }}>
                                    🚫 冻结商户
                                </button>
                            ) : (
                                <button onClick={handleUnsuspend} style={{
                                    padding: '8px 18px', background: '#10b981', color: '#fff',
                                    border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600
                                }}>
                                    ✓ 解冻商户
                                </button>
                            )}
                            <button onClick={() => window.open(`/v/${order.tenant?.shopSlug}/order/${order.orderNo}`, '_blank')} style={{
                                padding: '8px 18px', background: 'var(--bg-tertiary)', color: 'var(--text-primary)',
                                border: '1px solid var(--border-color)', borderRadius: 8, cursor: 'pointer', fontSize: '0.85rem'
                            }}>
                                查看商户视角
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}

function DetailSection({ title, children }) {
    return (
        <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>{title}</div>
            <div style={{ background: 'var(--bg-tertiary)', borderRadius: 8, padding: '4px 14px' }}>{children}</div>
        </div>
    )
}

function DetailRow({ label, value }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-color)', gap: 12, alignItems: 'center' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem', flexShrink: 0 }}>{label}</span>
            <span style={{ color: 'var(--text-primary)', fontSize: '0.85rem', textAlign: 'right', wordBreak: 'break-all', maxWidth: '70%' }}>{value}</span>
        </div>
    )
}

// ─── 通知设置（平台超管事件邮件通知）────────────────────────
function NotifySettings({ token }) {
    const [config, setConfig] = useState(null)
    const [eventLabels, setEventLabels] = useState({})
    const [recipientInput, setRecipientInput] = useState('')
    const [saving, setSaving] = useState(false)
    const [testing, setTesting] = useState(false)
    const [msg, setMsg] = useState(null)

    useEffect(() => {
        fetch('/api/man/notify-config', { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.json())
            .then(d => {
                setConfig(d.config)
                setEventLabels(d.eventLabels || {})
            })
    }, [token])

    if (!config) return <div className="man-loading">加载中...</div>

    const addRecipient = () => {
        const v = recipientInput.trim()
        if (!v) return
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
            setMsg({ type: 'error', text: '请输入合法邮箱地址' })
            return
        }
        if (config.recipients.includes(v)) return
        setConfig(c => ({ ...c, recipients: [...c.recipients, v] }))
        setRecipientInput('')
        setMsg(null)
    }
    const removeRecipient = (email) => {
        setConfig(c => ({ ...c, recipients: c.recipients.filter(e => e !== email) }))
    }
    const toggleEvent = (key) => {
        setConfig(c => ({ ...c, events: { ...c.events, [key]: !c.events[key] } }))
    }

    const handleSave = async () => {
        setSaving(true); setMsg(null)
        try {
            const r = await fetch('/api/man/notify-config', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(config)
            })
            const d = await r.json()
            if (r.ok) setMsg({ type: 'success', text: '✅ 已保存' })
            else setMsg({ type: 'error', text: d.error || '保存失败' })
        } finally {
            setSaving(false)
        }
    }

    const handleTest = async () => {
        setTesting(true); setMsg(null)
        try {
            const r = await fetch('/api/man/notify-test', {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            })
            const d = await r.json()
            if (r.ok) setMsg({ type: 'success', text: '✅ 测试邮件已发送，请查收' })
            else setMsg({ type: 'error', text: d.error || '发送失败' })
        } finally {
            setTesting(false)
        }
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: 24 }}>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>平台事件通知</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 18 }}>
                    通过平台 SMTP 发送给超管邮箱，不消耗任何商户额度。请先在「📧 平台邮件」配置 SMTP。
                </div>

                {msg && (
                    <div style={{
                        padding: '10px 14px', marginBottom: 16, borderRadius: 8,
                        background: msg.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        color: msg.type === 'success' ? '#059669' : '#dc2626',
                        border: `1px solid ${msg.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                        fontSize: '0.85rem'
                    }}>{msg.text}</div>
                )}

                {/* 总开关 */}
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, cursor: 'pointer' }}>
                    <div
                        onClick={() => setConfig(c => ({ ...c, enabled: !c.enabled }))}
                        style={{
                            width: 44, height: 24, borderRadius: 12,
                            background: config.enabled ? 'var(--primary)' : 'var(--border-color)',
                            position: 'relative', transition: 'all 0.2s'
                        }}
                    >
                        <div style={{
                            width: 18, height: 18, borderRadius: '50%', background: '#fff',
                            position: 'absolute', top: 3, left: config.enabled ? 23 : 3,
                            transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                        }} />
                    </div>
                    <div>
                        <div style={{ fontWeight: 600 }}>启用平台通知</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>关闭后所有事件邮件均不发送</div>
                    </div>
                </label>

                {/* 收信邮箱 */}
                <div style={{ marginBottom: 22 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 8 }}>收信邮箱</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 10 }}>
                        所有启用的事件通知都会发送到下列邮箱（多个）
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                        <input
                            value={recipientInput}
                            onChange={e => setRecipientInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addRecipient())}
                            placeholder="admin@example.com"
                            style={{
                                flex: 1, padding: '8px 12px', border: '1px solid var(--border-color)',
                                borderRadius: 8, background: 'var(--bg-secondary)', color: 'var(--text-primary)',
                                fontSize: '0.85rem', outline: 'none'
                            }}
                        />
                        <button type="button" onClick={addRecipient} style={{
                            padding: '8px 18px', background: 'var(--primary)', color: '#fff',
                            border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: '0.85rem'
                        }}>+ 添加</button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {config.recipients.length === 0 && (
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', padding: '10px 0' }}>
                                未添加任何邮箱
                            </div>
                        )}
                        {config.recipients.map(email => (
                            <div key={email} style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: '10px 14px', background: 'var(--bg-tertiary)', borderRadius: 8
                            }}>
                                <span style={{ fontSize: '0.85rem' }}>📧 {email}</span>
                                <button onClick={() => removeRecipient(email)} style={{
                                    background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer',
                                    fontSize: '0.78rem', padding: '4px 10px'
                                }}>移除</button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 事件订阅 */}
                <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 12 }}>订阅事件</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 8 }}>
                        {Object.entries(eventLabels).map(([key, label]) => (
                            <label
                                key={key}
                                onClick={() => toggleEvent(key)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 12,
                                    padding: '12px 14px', border: '1px solid var(--border-color)',
                                    borderRadius: 8, cursor: 'pointer',
                                    background: config.events[key] ? 'rgba(239, 68, 68, 0.04)' : 'transparent',
                                    borderColor: config.events[key] ? 'var(--primary)' : 'var(--border-color)'
                                }}
                            >
                                <div style={{
                                    width: 36, height: 20, borderRadius: 10,
                                    background: config.events[key] ? 'var(--primary)' : 'var(--border-color)',
                                    position: 'relative', flexShrink: 0, transition: 'all 0.2s'
                                }}>
                                    <div style={{
                                        width: 14, height: 14, borderRadius: '50%', background: '#fff',
                                        position: 'absolute', top: 3, left: config.events[key] ? 19 : 3,
                                        transition: 'all 0.2s'
                                    }} />
                                </div>
                                <span style={{ fontSize: '0.85rem' }}>{label}</span>
                            </label>
                        ))}
                    </div>
                </div>

                {/* 保存 / 测试 */}
                <div style={{ display: 'flex', gap: 10, marginTop: 24, paddingTop: 18, borderTop: '1px solid var(--border-color)' }}>
                    <button onClick={handleSave} disabled={saving} style={{
                        padding: '10px 24px', background: 'var(--primary)', color: '#fff',
                        border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: '0.88rem', fontWeight: 600
                    }}>
                        {saving ? '保存中...' : '保存设置'}
                    </button>
                    <button onClick={handleTest} disabled={testing || config.recipients.length === 0} style={{
                        padding: '10px 24px', background: 'var(--bg-tertiary)', color: 'var(--text-primary)',
                        border: '1px solid var(--border-color)', borderRadius: 8, cursor: 'pointer', fontSize: '0.88rem'
                    }}>
                        {testing ? '发送中...' : '🔔 发送测试邮件'}
                    </button>
                </div>
            </div>
        </div>
    )
}

// ─── 风控管理页（违禁词配置 + 风险概览）────────────────────
function RiskControlPage({ token }) {
    const [keywords, setKeywords] = useState([])
    const [keywordInput, setKeywordInput] = useState('')
    const [overview, setOverview] = useState({ scanned: 0, flaggedCount: 0, recentFlagged: [], topRiskTenants: [] })
    const [saving, setSaving] = useState(false)

    const loadKeywords = () => {
        fetch('/api/man/risk-keywords', { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.json())
            .then(d => setKeywords(d.keywords || []))
    }
    const loadOverview = () => {
        fetch('/api/man/risk-overview', { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.json())
            .then(d => setOverview(d))
    }

    useEffect(() => {
        loadKeywords()
        loadOverview()
    }, [token])

    const addKeyword = () => {
        const v = keywordInput.trim()
        if (!v) return
        if (keywords.includes(v)) return
        setKeywords([...keywords, v])
        setKeywordInput('')
    }

    const removeKeyword = (k) => setKeywords(keywords.filter(x => x !== k))

    const handleSave = async () => {
        setSaving(true)
        try {
            const r = await fetch('/api/man/risk-keywords', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ keywords })
            })
            if (r.ok) {
                alert('已保存')
                loadOverview()
            }
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="man-page">
            <div className="man-page-header">
                <h1 className="man-page-title">风控管理</h1>
            </div>

            {/* 概览卡片 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 18 }}>
                <div style={statCard}>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>近期扫描</div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 700 }}>{overview.scanned}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>笔订单</div>
                </div>
                <div style={statCard}>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>命中违禁词</div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#ef4444' }}>{overview.flaggedCount}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>笔订单</div>
                </div>
                <div style={statCard}>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>违禁词条数</div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#0ea5e9' }}>{keywords.length}</div>
                </div>
                <div style={statCard}>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>风险商户</div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#f59e0b' }}>{overview.topRiskTenants?.length || 0}</div>
                </div>
            </div>

            {/* 违禁词配置 */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 10, padding: 18, marginBottom: 18 }}>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>违禁词库</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 12 }}>
                    匹配商品名/描述/标签的关键词将自动标记为风险订单。不区分大小写。建议添加：盗版、外挂、辅助、刷单、博彩、菠菜、引流等
                </div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                    <input
                        value={keywordInput}
                        onChange={e => setKeywordInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && addKeyword()}
                        placeholder="输入违禁词后回车添加"
                        style={{ ...inputStyle, flex: 1 }}
                    />
                    <button onClick={addKeyword} className="man-btn-edit" style={{ background: 'var(--primary)', color: '#fff', border: 'none' }}>+ 添加</button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, minHeight: 40 }}>
                    {keywords.map(k => (
                        <span key={k} style={{
                            padding: '4px 10px 4px 12px', background: 'rgba(239, 68, 68, 0.08)',
                            color: '#dc2626', borderRadius: 999, fontSize: '0.82rem',
                            display: 'inline-flex', alignItems: 'center', gap: 6
                        }}>
                            {k}
                            <button onClick={() => removeKeyword(k)} style={{
                                background: 'none', border: 'none', color: '#ef4444',
                                cursor: 'pointer', fontSize: 14, padding: 0, lineHeight: 1
                            }}>✕</button>
                        </span>
                    ))}
                    {keywords.length === 0 && <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>暂无违禁词</span>}
                </div>
                <div style={{ marginTop: 14 }}>
                    <button onClick={handleSave} disabled={saving} className="man-btn-save-full" style={{ width: 'auto', padding: '8px 20px' }}>
                        {saving ? '保存中...' : '保存'}
                    </button>
                </div>
            </div>

            {/* 风险商户 Top */}
            {overview.topRiskTenants?.length > 0 && (
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 10, padding: 18, marginBottom: 18 }}>
                    <div style={{ fontWeight: 600, marginBottom: 12 }}>风险商户排行</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {overview.topRiskTenants.map((t, i) => (
                            <div key={t.tenant?.id || i} style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                padding: '10px 14px', background: 'var(--bg-tertiary)', borderRadius: 8
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <span style={{ width: 24, height: 24, borderRadius: '50%', background: i < 3 ? '#ef4444' : 'var(--text-muted)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700 }}>
                                        {i + 1}
                                    </span>
                                    <div>
                                        <div style={{ fontWeight: 600 }}>{t.tenant?.shopName || '未知商户'}</div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{t.tenant?.shopSlug}</div>
                                    </div>
                                </div>
                                <span style={{ color: '#ef4444', fontWeight: 700 }}>{t.count} 笔风险订单</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* 最新命中订单 */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 10, padding: 18 }}>
                <div style={{ fontWeight: 600, marginBottom: 12 }}>最近违禁词命中订单</div>
                {overview.recentFlagged?.length === 0 ? (
                    <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 30 }}>暂无命中订单</div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {overview.recentFlagged.slice(0, 20).map(o => (
                            <div key={o.id} style={{
                                padding: '10px 14px', background: 'rgba(239, 68, 68, 0.04)',
                                border: '1px solid rgba(239, 68, 68, 0.15)', borderRadius: 8,
                                display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap'
                            }}>
                                <div style={{ flex: 1, minWidth: 200 }}>
                                    <div style={{ fontWeight: 600 }}>{o.productName}</div>
                                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                        {o.tenant?.shopName} · {o.orderNo} · {new Date(o.createdAt).toLocaleString()}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                                    {o.riskHits.map(h => (
                                        <span key={h} style={{
                                            padding: '2px 8px', background: 'rgba(239, 68, 68, 0.12)',
                                            color: '#dc2626', borderRadius: 4, fontSize: '0.72rem', fontWeight: 600
                                        }}>{h}</span>
                                    ))}
                                </div>
                                <div style={{ fontWeight: 700 }}>¥{o.totalAmount}</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

const statCard = {
    background: 'var(--bg-card)', border: '1px solid var(--border-color)',
    borderRadius: 10, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 4
}

// 公共主题区皮肤行样式
const skinRowStyle = {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '10px 12px', background: 'var(--bg-tertiary)',
    border: '1px solid var(--border-color)', borderRadius: 8,
    marginBottom: 6
}
const skinDotStyle = { display: 'inline-block', width: 10, height: 10, borderRadius: '50%', flexShrink: 0 }
const skinKeyStyle = { fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 400, marginLeft: 6 }
const skinPathStyle = { fontSize: '0.68rem', color: 'var(--text-muted)' }

// ─── 定制主题管理 ────────────────────────────────────────────
function CustomThemesPage({ token }) {
    const [themes, setThemes] = useState([])
    const [loading, setLoading] = useState(true)
    const [showCreate, setShowCreate] = useState(false)
    const [editing, setEditing] = useState(null)
    const [assigning, setAssigning] = useState(null)

    const load = () => {
        setLoading(true)
        fetch('/api/man/custom-themes', { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.json())
            .then(d => setThemes(d.themes || []))
            .finally(() => setLoading(false))
    }

    useEffect(load, [token])

    const handleDelete = async (id) => {
        if (!confirm('确认删除？使用此主题的商户将被切回 Fresh 主题。')) return
        const r = await fetch(`/api/man/custom-themes/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` }
        })
        if (r.ok) { alert('已删除'); load() }
    }

    return (
        <div className="man-page">
            <div className="man-page-header">
                <h1 className="man-page-title">主题管理</h1>
                <button
                    onClick={() => setShowCreate(true)}
                    style={{
                        marginLeft: 'auto', padding: '8px 18px',
                        background: 'var(--primary)', color: '#fff',
                        border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: '0.85rem'
                    }}
                >
                    + 新建定制主题
                </button>
            </div>

            {/* 公共主题概览 */}
            <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10, letterSpacing: 0.3 }}>公共主题</div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {/* Minimal 主题 */}
                    <div style={{
                        background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                        borderRadius: 12, overflow: 'hidden'
                    }}>
                        <div style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '14px 18px', borderBottom: '1px solid var(--border-color)',
                            background: 'var(--bg-secondary)'
                        }}>
                            <div>
                                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                    📦 Minimal
                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 400, marginLeft: 8 }}>
                                        themes/minimal
                                    </span>
                                </div>
                                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                                    精简主题 · 全功能（搜索、购物车、用户中心、工单）
                                </div>
                            </div>
                            <span style={{
                                padding: '3px 10px', borderRadius: 4,
                                background: 'rgba(16, 185, 129, 0.1)', color: '#10b981',
                                fontSize: '0.7rem', fontWeight: 600
                            }}>公开</span>
                        </div>
                        <div style={{ padding: '10px 14px' }}>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 8, paddingLeft: 4 }}>皮肤 (2)</div>
                            {[
                                { key: 'fresh', name: 'Fresh', desc: '清新明亮，白色背景，侧边栏布局', dot: '#0ea5e9' },
                                { key: 'zen', name: 'Zen', desc: '深色质感，极简留白', dot: '#64748b' }
                            ].map(s => (
                                <div key={s.key} style={skinRowStyle}>
                                    <span style={{ ...skinDotStyle, background: s.dot }} />
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>
                                            {s.name}
                                            <code style={skinKeyStyle}>{s.key}</code>
                                        </div>
                                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 2 }}>{s.desc}</div>
                                    </div>
                                    <code style={skinPathStyle}>themes/minimal/{s.key}</code>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Origin 主题 */}
                    <div style={{
                        background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                        borderRadius: 12, overflow: 'hidden'
                    }}>
                        <div style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '14px 18px', borderBottom: '1px solid var(--border-color)',
                            background: 'var(--bg-secondary)'
                        }}>
                            <div>
                                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                    ✨ Origin
                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 400, marginLeft: 8 }}>
                                        themes/Origin
                                    </span>
                                </div>
                                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                                    第二代经典主题 · 二创 · 玻璃质感导航
                                </div>
                            </div>
                            <span style={{
                                padding: '3px 10px', borderRadius: 4,
                                background: 'rgba(16, 185, 129, 0.1)', color: '#10b981',
                                fontSize: '0.7rem', fontWeight: 600
                            }}>公开</span>
                        </div>
                        <div style={{ padding: '10px 14px' }}>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 8, paddingLeft: 4 }}>皮肤 (1)</div>
                            <div style={skinRowStyle}>
                                <span style={{ ...skinDotStyle, background: '#2563eb' }} />
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>
                                        Class
                                        <code style={skinKeyStyle}>class</code>
                                    </div>
                                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 2 }}>
                                        现代经典风格，毛玻璃顶栏，全功能商城
                                    </div>
                                </div>
                                <code style={skinPathStyle}>themes/Origin/class</code>
                            </div>
                        </div>
                    </div>
                </div>

                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 8 }}>
                    💬 公共主题对所有商户开放（按套餐过滤）。新增皮肤需在 <code>themes/minimal/&lt;新皮肤&gt;/</code> 创建并在 <code>customThemeController.PUBLIC_SKINS</code> 注册。
                </div>
            </div>

            <div style={{ height: 1, background: 'var(--border-color)', margin: '20px 0' }} />

            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10, letterSpacing: 0.3, display: 'flex', alignItems: 'center', gap: 8 }}>
                ✨ 定制主题
                <span style={{ fontSize: '0.7rem', fontWeight: 400, color: 'var(--text-muted)' }}>（私有，仅授权商户可使用）</span>
            </div>

            <div style={{ marginBottom: 16, padding: '12px 16px', background: 'rgba(14, 165, 233, 0.06)', border: '1px solid rgba(14, 165, 233, 0.25)', borderRadius: 8, fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                💡 <strong>使用说明：</strong>
                <br />1. 在 <code>frontend/src/themes/custom/&lt;key&gt;/index.jsx</code> 编写主题代码（参考 <code>dark-luxury</code> 示例）
                <br />2. 在此页面创建主题记录（key 与目录名一致）
                <br />3. 点击「分配商户」选择哪些商户能使用
                <br />4. 商户进入 <code>/admin/settings → 外观</code> 即可看到并切换
            </div>

            {loading ? <div className="man-loading">加载中...</div> : themes.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#94a3b8', padding: 60 }}>
                    暂无定制主题。点击右上角「新建主题」开始。
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 14 }}>
                    {themes.map(t => (
                        <div key={t.id} style={{
                            background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                            borderRadius: 12, padding: 18
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>{t.name}</div>
                                    <code style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>custom:{t.key}</code>
                                </div>
                                <span style={{
                                    fontSize: '0.72rem', padding: '2px 10px', borderRadius: 4,
                                    background: t.status === 'ACTIVE' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(148, 163, 184, 0.1)',
                                    color: t.status === 'ACTIVE' ? '#10b981' : '#94a3b8',
                                    fontWeight: 600
                                }}>
                                    {t.status === 'ACTIVE' ? '已启用' : '草稿'}
                                </span>
                            </div>
                            {t.description && <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 10, lineHeight: 1.5 }}>{t.description}</div>}
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: 12, padding: '8px 10px', background: 'var(--bg-tertiary)', borderRadius: 6 }}>
                                <span style={{ color: 'var(--text-muted)' }}>📁 目录：</span>
                                <code style={{ fontSize: '0.78rem' }}>themes/custom/{t.componentDir}</code>
                            </div>
                            <div style={{ fontSize: '0.78rem', marginBottom: 14 }}>
                                <span style={{ color: 'var(--text-muted)' }}>已分配 </span>
                                <strong style={{ color: 'var(--primary)' }}>{t.assignments.length}</strong>
                                <span style={{ color: 'var(--text-muted)' }}> 个商户</span>
                                {t.assignments.length > 0 && (
                                    <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                        {t.assignments.slice(0, 5).map(a => (
                                            <span key={a.tenantId} style={{
                                                padding: '2px 8px', background: 'rgba(99, 102, 241, 0.1)',
                                                color: '#6366f1', borderRadius: 4, fontSize: '0.72rem'
                                            }}>
                                                {a.tenant?.shopName || a.tenantId.slice(0, 6)}
                                            </span>
                                        ))}
                                        {t.assignments.length > 5 && <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>+{t.assignments.length - 5}</span>}
                                    </div>
                                )}
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button onClick={() => setAssigning(t)} style={smallBtn('var(--primary)', '#fff')}>分配商户</button>
                                <button onClick={() => setEditing(t)} style={smallBtn('var(--bg-tertiary)', 'var(--text-primary)')}>编辑</button>
                                <button onClick={() => handleDelete(t.id)} style={smallBtn('rgba(239, 68, 68, 0.1)', '#ef4444')}>删除</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showCreate && <ThemeFormModal token={token} onClose={() => setShowCreate(false)} onSaved={() => { setShowCreate(false); load() }} />}
            {editing && <ThemeFormModal token={token} theme={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load() }} />}
            {assigning && <ThemeAssignModal token={token} theme={assigning} onClose={() => setAssigning(null)} onSaved={() => { setAssigning(null); load() }} />}
        </div>
    )
}

const smallBtn = (bg, color) => ({
    flex: 1, padding: '6px 10px', background: bg, color, border: 'none',
    borderRadius: 6, cursor: 'pointer', fontSize: '0.78rem', fontFamily: 'inherit'
})

// 主题创建/编辑弹窗
function ThemeFormModal({ token, theme, onClose, onSaved }) {
    const [form, setForm] = useState({
        key: theme?.key || '',
        name: theme?.name || '',
        description: theme?.description || '',
        status: theme?.status || 'ACTIVE'
    })
    const [saving, setSaving] = useState(false)

    const handleSave = async () => {
        if (!form.key || !form.name) {
            alert('key 和名称必填')
            return
        }
        setSaving(true)
        try {
            const url = theme ? `/api/man/custom-themes/${theme.id}` : '/api/man/custom-themes'
            const method = theme ? 'PATCH' : 'POST'
            const r = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(form)
            })
            const d = await r.json()
            if (r.ok) onSaved()
            else alert(d.error || '保存失败')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div onClick={onClose} className="ep-overlay">
            <div onClick={e => e.stopPropagation()} className="ep-modal" style={{ maxWidth: 480 }}>
                <button onClick={onClose} className="ep-close">✕</button>
                <h3 style={{ margin: '0 0 18px', fontSize: '1.1rem' }}>{theme ? '编辑主题' : '新建主题'}</h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div>
                        <label style={modalLabel}>主题 Key</label>
                        <input
                            value={form.key}
                            onChange={e => setForm(f => ({ ...f, key: e.target.value.toLowerCase() }))}
                            disabled={!!theme}
                            placeholder="如 dark-luxury"
                            style={modalInput}
                        />
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
                            小写字母+数字+短横线。同时也是源代码目录名：<code>frontend/src/themes/custom/&lt;key&gt;/</code>
                        </div>
                    </div>
                    <div>
                        <label style={modalLabel}>显示名称</label>
                        <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="如 奢华黑金" style={modalInput} />
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
                            商户在外观选择里看到的名称
                        </div>
                    </div>
                    <div>
                        <label style={modalLabel}>描述</label>
                        <textarea
                            value={form.description}
                            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                            rows={2}
                            placeholder="主题特点描述（可选）"
                            style={{ ...modalInput, resize: 'vertical', fontFamily: 'inherit' }}
                        />
                    </div>
                    <div>
                        <label style={modalLabel}>状态</label>
                        <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} style={modalInput}>
                            <option value="ACTIVE">已启用（商户可使用）</option>
                            <option value="DRAFT">草稿（不可分配）</option>
                        </select>
                    </div>
                </div>

                <div style={{
                    marginTop: 16, padding: '10px 12px', background: 'rgba(245, 158, 11, 0.08)',
                    border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: 8,
                    fontSize: '0.78rem', color: '#92400e', lineHeight: 1.6
                }}>
                    💡 创建主题记录前，请先在源代码 <code>frontend/src/themes/custom/{form.key || '<key>'}/index.jsx</code> 中编写主题代码并部署。可参考示例 <code>dark-luxury</code>。
                </div>

                <div style={{ marginTop: 20, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                    <button onClick={onClose} style={{
                        padding: '10px 20px', background: 'var(--bg-tertiary)', color: 'var(--text-primary)',
                        border: '1px solid var(--border-color)', borderRadius: 8, cursor: 'pointer'
                    }}>取消</button>
                    <button onClick={handleSave} disabled={saving} style={{
                        padding: '10px 22px', background: 'var(--primary)', color: '#fff',
                        border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600
                    }}>
                        {saving ? '保存中...' : '保存'}
                    </button>
                </div>
            </div>
        </div>
    )
}

const modalLabel = { display: 'block', fontSize: '0.78rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }
const modalInput = {
    width: '100%', padding: '8px 12px', border: '1px solid var(--border-color)',
    borderRadius: 8, background: 'var(--bg-secondary)', color: 'var(--text-primary)',
    fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box'
}

// 主题分配商户弹窗
function ThemeAssignModal({ token, theme, onClose, onSaved }) {
    const [tenants, setTenants] = useState([])
    const [selected, setSelected] = useState(new Set(theme.assignments.map(a => a.tenantId)))
    const [search, setSearch] = useState('')
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        fetch('/api/man/merchants?limit=500', { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.json())
            .then(d => setTenants(d.merchants || []))
    }, [token])

    const toggle = (tenantId) => {
        const next = new Set(selected)
        if (next.has(tenantId)) next.delete(tenantId)
        else next.add(tenantId)
        setSelected(next)
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            const r = await fetch(`/api/man/custom-themes/${theme.id}/assign`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ tenantIds: Array.from(selected) })
            })
            const d = await r.json()
            if (r.ok) onSaved()
            else alert(d.error || '保存失败')
        } finally {
            setSaving(false)
        }
    }

    const filtered = tenants.filter(m => {
        if (!search.trim()) return true
        const q = search.toLowerCase()
        return [m.email, m.shopName, m.shop?.slug].filter(Boolean).some(s => String(s).toLowerCase().includes(q))
    })

    return (
        <div onClick={onClose} className="ep-overlay">
            <div onClick={e => e.stopPropagation()} className="ep-modal" style={{ maxWidth: 560, display: 'flex', flexDirection: 'column', maxHeight: '80vh' }}>
                <button onClick={onClose} className="ep-close">✕</button>
                <h3 style={{ margin: '0 0 6px', fontSize: '1.1rem' }}>分配商户</h3>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 14 }}>
                    主题：<strong>{theme.name}</strong>（custom:{theme.key}）
                </div>

                <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="🔍 搜索店铺名、邮箱或 slug"
                    style={{ ...modalInput, marginBottom: 12 }}
                />

                <div style={{ flex: 1, overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: 8, marginBottom: 14 }}>
                    {filtered.length === 0 ? (
                        <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                            无匹配商户
                        </div>
                    ) : filtered.map(m => {
                        const isSelected = selected.has(m.tenantId)
                        return (
                            <label key={m.id} style={{
                                display: 'flex', alignItems: 'center', gap: 12,
                                padding: '10px 14px', borderBottom: '1px solid var(--border-color)',
                                cursor: m.tenantId ? 'pointer' : 'not-allowed',
                                opacity: m.tenantId ? 1 : 0.4,
                                background: isSelected ? 'rgba(239, 68, 68, 0.04)' : 'transparent'
                            }}>
                                <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => m.tenantId && toggle(m.tenantId)}
                                    disabled={!m.tenantId}
                                    style={{ accentColor: 'var(--primary)' }}
                                />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{m.shopName || '(未命名)'}</div>
                                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                        {m.email} · {m.shop?.slug || '—'}
                                        {!m.tenantId && <span style={{ color: '#ef4444', marginLeft: 6 }}>未关联 tenant</span>}
                                    </div>
                                </div>
                            </label>
                        )
                    })}
                </div>

                <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>已选 {selected.size} 个商户</span>
                    <div style={{ display: 'flex', gap: 10 }}>
                        <button onClick={onClose} style={{
                            padding: '10px 20px', background: 'var(--bg-tertiary)', color: 'var(--text-primary)',
                            border: '1px solid var(--border-color)', borderRadius: 8, cursor: 'pointer'
                        }}>取消</button>
                        <button onClick={handleSave} disabled={saving} style={{
                            padding: '10px 22px', background: 'var(--primary)', color: '#fff',
                            border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600
                        }}>
                            {saving ? '保存中...' : '保存分配'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}


export default function ManDashboard() {
    const navigate = useNavigate()
    const location = useLocation()
    const { token, merchant, logout, isSuperAdmin } = useMerchantStore()

    useEffect(() => {
        if (!token || !merchant) { navigate('/Man/login'); return }
        if (!merchant.isSuperAdmin) { navigate('/login'); return }
    }, [token, merchant, navigate])

    useEffect(() => {
        const items = [
            { path: '/Man/dashboard', label: '数据概览' },
            { path: '/Man/merchants', label: '商户管理' },
            { path: '/Man/plan-config', label: '套餐管理' },
            { path: '/Man/plan-orders', label: '所有订单' },
            { path: '/Man/shop-orders', label: '商户订单' },
            { path: '/Man/risk-control', label: '风控管理' },
            { path: '/Man/custom-themes', label: '主题管理' },
            { path: '/Man/announcements', label: '公告管理' },
            { path: '/Man/support-tickets', label: '商户工单' },
            { path: '/Man/backup', label: '数据备份' },
            { path: '/Man/settings', label: '平台设置' },
        ]
        const matched = items.find(item => location.pathname.toLowerCase().startsWith(item.path.toLowerCase()))
        const subTitle = matched ? matched.label : '平台管理后台'
        document.title = `${subTitle} - Vmart 平台管理后台`
    }, [location.pathname])

    const handleLogout = () => { logout(); navigate('/Man/login') }

    if (!token || !merchant?.isSuperAdmin) return null

    return (
        <div className="man-layout">
            <Sidebar onLogout={handleLogout} />
            <main className="man-main">
                <Routes>
                    <Route path="dashboard" element={<Overview token={token} />} />
                    <Route path="merchants" element={<Merchants token={token} />} />
                    <Route path="plan-config" element={<PlanConfigPage token={token} />} />
                    <Route path="plan-orders" element={<PlanOrders token={token} />} />
                    <Route path="shop-orders" element={<ShopOrders token={token} />} />
                    <Route path="risk-control" element={<RiskControlPage token={token} />} />
                    <Route path="custom-themes" element={<CustomThemesPage token={token} />} />
                    <Route path="themes" element={<Navigate to="custom-themes" replace />} />
                    <Route path="announcements" element={<Announcements token={token} />} />
                    <Route path="support-tickets" element={<ManSupportTickets token={token} />} />
                    <Route path="backup" element={<BackupManage token={token} />} />
                    <Route path="settings" element={<PlatformSettings token={token} />} />
                    <Route path="*" element={<Overview token={token} />} />
                </Routes>
            </main>
        </div>
    )
}

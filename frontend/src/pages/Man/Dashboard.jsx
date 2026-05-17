import { useState, useEffect } from 'react'
import { useNavigate, Routes, Route, Link, useLocation } from 'react-router-dom'
import { useMerchantStore } from '../../store/merchantStore'
import './Man.css'

function Sidebar({ onLogout }) {
    const loc = useLocation()
    const items = [
        { path: '/Man/dashboard', icon: '📊', label: '数据概览' },
        { path: '/Man/merchants', icon: '🏪', label: '商户管理' },
        { path: '/Man/plan-config', icon: '📦', label: '套餐管理' },
        { path: '/Man/plan-orders', icon: '💳', label: '套餐订单' },
        { path: '/Man/themes', icon: '🎨', label: '主题管理' },
        { path: '/Man/announcements', icon: '📢', label: '公告管理' },
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
                                <div style={{ padding: 16, background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>TRC20 收款钱包地址</label>
                                    <input value={settings.usdt_wallet || ''} onChange={e => setSettings(s => ({ ...s, usdt_wallet: e.target.value }))} placeholder="T..." style={{ width: '100%', padding: '10px 14px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none', fontFamily: 'monospace' }} />
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
                                <div style={{ padding: 16, background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>BEP20 收款钱包地址</label>
                                    <input value={settings.bsc_usdt_wallet || ''} onChange={e => setSettings(s => ({ ...s, bsc_usdt_wallet: e.target.value }))} placeholder="0x..." style={{ width: '100%', padding: '10px 14px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none', fontFamily: 'monospace' }} />
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
                                { key: 'channel_alipay', name: '支付宝当面付', desc: '商户配置自己的支付宝 App ID 和密钥收款' },
                                { key: 'channel_wechat', name: '微信支付', desc: '商户配置微信支付商户号收款' },
                                { key: 'channel_usdt_trc20', name: 'USDT-TRC20', desc: '商户配置 TRC20 钱包地址收款' },
                                { key: 'channel_usdt_bep20', name: 'USDT-BEP20 (BSC)', desc: '商户配置 BEP20 钱包地址收款' },
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
                                    <label style={{ position: 'relative', width: 42, height: 24, cursor: 'pointer' }}>
                                        <input type="checkbox" checked={settings[ch.key] !== 'false'} onChange={e => setSettings(s => ({ ...s, [ch.key]: e.target.checked ? 'true' : 'false' }))} style={{ display: 'none' }} />
                                        <span style={{ position: 'absolute', inset: 0, borderRadius: 12, background: settings[ch.key] !== 'false' ? 'var(--success)' : 'var(--border-color)', transition: 'background 0.2s' }}>
                                            <span style={{ position: 'absolute', top: 3, left: settings[ch.key] !== 'false' ? 21 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                                        </span>
                                    </label>
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
    const [search, setSearch] = useState('')
    const [actionLoading, setActionLoading] = useState(null)

    const load = () => {
        setLoading(true)
        const params = new URLSearchParams()
        if (filter) params.set('status', filter)
        if (search) params.set('search', search)
        const qs = params.toString() ? `?${params.toString()}` : ''
        fetch(`/api/man/plan-orders${qs}`, { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.json())
            .then(d => { setOrders(d.orders || []); setTotal(d.total || 0) })
            .finally(() => setLoading(false))
    }

    useEffect(load, [token, filter, search])

    const handleConfirm = async (id) => {
        if (!confirm('确认该订单已收款？将自动为商户开通/续费套餐')) return
        setActionLoading(id)
        await fetch(`/api/man/plan-orders/${id}/confirm`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` }
        })
        setActionLoading(null)
        load()
    }

    const handleReject = async (id) => {
        const reason = prompt('拒绝原因（可选）')
        if (reason === null) return
        setActionLoading(id)
        await fetch(`/api/man/plan-orders/${id}/reject`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ reason })
        })
        setActionLoading(null)
        load()
    }

    const PLAN_LABELS = { FREE: '免费试用', BASIC: '基础版', STANDARD: '标准版', PRO: '专业版' }
    const STATUS_MAP = {
        PENDING: { label: '待支付', color: '#f59e0b' },
        REVIEWING: { label: '待审核', color: '#6366f1' },
        PAID: { label: '已完成', color: '#10b981' },
        REJECTED: { label: '已拒绝', color: '#ef4444' }
    }

    return (
        <div className="man-page">
            <div className="man-page-header">
                <h1 className="man-page-title">套餐订单</h1>
                <span className="man-total-badge">共 {total} 笔</span>
            </div>

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
                        {s === '' ? '全部' : STATUS_MAP[s]?.label || s}
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
                                <th>商户</th>
                                <th>套餐</th>
                                <th>时长</th>
                                <th>金额</th>
                                <th>支付方式</th>
                                <th>交易号</th>
                                <th>状态</th>
                                <th>时间</th>
                                <th>操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.map(o => (
                                <tr key={o.id}>
                                    <td>{o.merchant?.email || '—'}</td>
                                    <td><span className="plan-chip">{PLAN_LABELS[o.plan] || o.plan}</span></td>
                                    <td>{o.months} 个月</td>
                                    <td style={{ fontWeight: 700 }}>¥{parseFloat(o.amount)}</td>
                                    <td>{o.paymentMethod || '—'}</td>
                                    <td style={{ fontSize: '0.75rem', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {o.tradeNo || '—'}
                                    </td>
                                    <td>
                                        <span style={{ color: STATUS_MAP[o.paymentStatus]?.color || '#aaa', fontWeight: 600 }}>
                                            {STATUS_MAP[o.paymentStatus]?.label || o.paymentStatus}
                                        </span>
                                    </td>
                                    <td className="time-cell">{new Date(o.createdAt).toLocaleString()}</td>
                                    <td>
                                        {(o.paymentStatus === 'REVIEWING' || o.paymentStatus === 'PENDING') && (
                                            <div style={{ display: 'flex', gap: 6 }}>
                                                <button
                                                    className="man-btn-edit"
                                                    style={{ background: '#10b981', color: 'white', border: 'none' }}
                                                    onClick={() => handleConfirm(o.id)}
                                                    disabled={actionLoading === o.id}
                                                >
                                                    确认
                                                </button>
                                                <button
                                                    className="man-btn-edit"
                                                    style={{ background: '#ef4444', color: 'white', border: 'none' }}
                                                    onClick={() => handleReject(o.id)}
                                                    disabled={actionLoading === o.id}
                                                >
                                                    拒绝
                                                </button>
                                            </div>
                                        )}
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
    const [config, setConfig] = useState({ plans: [], trialHours: 48, yearlyDiscount: 20 })
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
                    <div>
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>年付折扣（%）</label>
                        <input type="number" value={config.yearlyDiscount || ''} onChange={e => setConfig(c => ({ ...c, yearlyDiscount: parseInt(e.target.value) || 20 }))} style={{ padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', width: 100 }} />
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
                                            {['classic', 'fresh', 'zen'].map(skin => {
                                                const skins = Array.isArray(plan.features?.skins) ? plan.features.skins : (plan.features?.skins === '全部' ? ['classic','fresh','zen'] : [plan.features?.skins || 'classic'])
                                                const checked = skins.includes(skin)
                                                return (
                                                    <label key={skin} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8rem', color: 'var(--text-primary)', cursor: 'pointer' }}>
                                                        <input type="checkbox" checked={checked} onChange={e => {
                                                            let newSkins = [...skins]
                                                            if (e.target.checked) { newSkins.push(skin) } else { newSkins = newSkins.filter(s => s !== skin) }
                                                            updatePlan(idx, 'features.skins', newSkins)
                                                        }} style={{ accentColor: 'var(--primary)' }} />
                                                        {skin === 'classic' ? 'Classic' : skin === 'fresh' ? 'Fresh' : 'Zen'}
                                                    </label>
                                                )
                                            })}
                                            <button type="button" onClick={() => updatePlan(idx, 'features.skins', ['classic','fresh','zen'])} style={{ fontSize: '0.7rem', padding: '2px 8px', border: '1px solid var(--border-color)', borderRadius: 4, background: 'var(--bg-tertiary)', color: 'var(--text-muted)', cursor: 'pointer' }}>全选</button>
                                        </div>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>邮件通知额度</label>
                                        <input type="number" value={plan.features?.emailNotifications || 0} onChange={e => updatePlan(idx, 'features.emailNotifications', Number(e.target.value))} style={{ width: '100%', padding: '6px 10px', border: '1px solid var(--border-color)', borderRadius: 6, background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.82rem' }} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>数据保留（天）</label>
                                        <input type="number" value={plan.features?.dataRetentionDays || 30} onChange={e => updatePlan(idx, 'features.dataRetentionDays', Number(e.target.value))} style={{ width: '100%', padding: '6px 10px', border: '1px solid var(--border-color)', borderRadius: 6, background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.82rem' }} />
                                    </div>
                                    {[
                                        { key: 'customDomain', label: '自定义域名' },
                                        { key: 'agentSystem', label: '代理商系统' },
                                        { key: 'support', label: '客服支持' },
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

export default function ManDashboard() {
    const navigate = useNavigate()
    const { token, merchant, logout, isSuperAdmin } = useMerchantStore()

    useEffect(() => {
        if (!token || !merchant) { navigate('/Man/login'); return }
        if (!merchant.isSuperAdmin) { navigate('/login'); return }
    }, [token, merchant, navigate])

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
                    <Route path="themes" element={<ThemeManage token={token} />} />
                    <Route path="announcements" element={<Announcements token={token} />} />
                    <Route path="backup" element={<BackupManage token={token} />} />
                    <Route path="settings" element={<PlatformSettings token={token} />} />
                    <Route path="*" element={<Overview token={token} />} />
                </Routes>
            </main>
        </div>
    )
}

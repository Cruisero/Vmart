import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMerchantStore } from '../../store/merchantStore'
import TrialCountdown from './TrialCountdown'
import PlanPurchase from './PlanPurchase'
import './ShopAdmin.css'

function PlatformNotices() {
    const [notices, setNotices] = useState([])
    const [dismissed, setDismissed] = useState(() => {
        try { return JSON.parse(localStorage.getItem('dismissed_notices') || '[]') } catch { return [] }
    })

    useEffect(() => {
        fetch('/api/platform/announcements')
            .then(r => r.json())
            .then(d => setNotices(d.announcements || []))
            .catch(() => {})
    }, [])

    const dismiss = (idx) => {
        const newDismissed = [...dismissed, idx]
        setDismissed(newDismissed)
        localStorage.setItem('dismissed_notices', JSON.stringify(newDismissed))
    }

    const visible = notices.filter((_, i) => !dismissed.includes(i))
    if (visible.length === 0) return null

    return (
        <div style={{ marginBottom: 12 }}>
            {visible.map((n, i) => (
                <div key={i} style={{
                    background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8,
                    padding: '10px 16px', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 10
                }}>
                    <span style={{ fontSize: '0.85rem', color: '#1e40af', flex: 1 }}>
                        📢 <strong>{n.title}</strong>{n.content ? ` — ${n.content}` : ''}
                    </span>
                    <button onClick={() => dismiss(i)} style={{
                        background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: 14
                    }}>✕</button>
                </div>
            ))}
        </div>
    )
}

const PLAN_LABELS = { FREE: '免费试用', BASIC: '基础版', STANDARD: '标准版', PRO: '专业版' }
const STATUS_LABELS = { ACTIVE: '正常', EXPIRED: '已到期', SUSPENDED: '已封禁' }
const SKIN_OPTIONS = [
    { value: 'classic', label: 'Classic（经典）' },
    { value: 'fresh', label: 'Fresh（清新）' },
    { value: 'zen', label: 'Zen（简约）' },
]

export default function ShopAdmin({ slug }) {
    const navigate = useNavigate()
    const { token, merchant, shop, setAuth, updateShop, logout } = useMerchantStore()
    const [form, setForm] = useState({ name: '', notice: '', skin: 'classic', contactEmail: '', customDomain: '', logo: '' })
    const [accountForm, setAccountForm] = useState({ shopName: '', currentPassword: '', newPassword: '' })
    const [saving, setSaving] = useState(false)
    const [savingAccount, setSavingAccount] = useState(false)
    const [msg, setMsg] = useState('')
    const [activeTab, setActiveTab] = useState('shop')

    // 验证登录 & slug 匹配
    useEffect(() => {
        if (!token || !merchant) { navigate('/login'); return }
        if (shop && shop.slug !== slug && !merchant.isSuperAdmin) {
            navigate(`/v/${shop.slug}/admin`); return
        }
    }, [token, merchant, shop, slug, navigate])

    // 初始化表单
    useEffect(() => {
        if (shop) {
            setForm({
                name: shop.name || '',
                notice: shop.notice || '',
                skin: shop.skin || 'classic',
                contactEmail: shop.contactEmail || '',
                customDomain: shop.customDomain || '',
                logo: shop.logo || ''
            })
        }
        if (merchant) {
            setAccountForm(f => ({ ...f, shopName: merchant.shopName || '' }))
        }
    }, [shop, merchant])

    const refreshMe = useCallback(async () => {
        try {
            const res = await fetch('/api/platform/me', { headers: { 'Authorization': `Bearer ${token}` } })
            const data = await res.json()
            if (res.ok) {
                setAuth(token, data.merchant, data.shop)
            }
        } catch {}
    }, [token, setAuth])

    useEffect(() => { refreshMe() }, [])

    const handleShopSave = async e => {
        e.preventDefault()
        setSaving(true); setMsg('')
        try {
            const res = await fetch('/api/platform/shop', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(form)
            })
            const data = await res.json()
            if (res.ok) { updateShop(data.shop); setMsg('✅ 保存成功') }
            else setMsg(`❌ ${data.error}`)
        } catch { setMsg('❌ 网络错误') }
        finally { setSaving(false) }
    }

    const handleAccountSave = async e => {
        e.preventDefault()
        setSavingAccount(true); setMsg('')
        try {
            const res = await fetch('/api/platform/account', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(accountForm)
            })
            const data = await res.json()
            if (res.ok) { setMsg('✅ 账号信息已更新'); setAccountForm(f => ({ ...f, currentPassword: '', newPassword: '' })) }
            else setMsg(`❌ ${data.error}`)
        } catch { setMsg('❌ 网络错误') }
        finally { setSavingAccount(false) }
    }

    if (!shop) return <div className="shop-admin-loading">加载中...</div>

    const trialExpired = shop.plan === 'FREE' && new Date() > new Date(shop.trialEndsAt)
    const planExpired = shop.planExpiresAt && new Date() > new Date(shop.planExpiresAt)
    const needUpgrade = trialExpired || planExpired

    return (
        <div className="shop-admin-layout">
            {/* 侧边栏 */}
            <aside className="shop-admin-sidebar">
                <div className="sidebar-brand">
                    <span className="sidebar-logo">V</span>
                    <span className="sidebar-name">{shop.name}</span>
                </div>
                <nav className="sidebar-nav">
                    {[
                        { key: 'shop', icon: '🏪', label: '店铺设置' },
                        { key: 'account', icon: '👤', label: '账号信息' },
                        { key: 'plan', icon: '💎', label: '套餐订阅' },
                        { key: 'export', icon: '📥', label: '数据导出' },
                        { key: 'domain', icon: '🌐', label: '独立域名' },
                    ].map(item => (
                        <button
                            key={item.key}
                            className={`sidebar-item ${activeTab === item.key ? 'active' : ''}`}
                            onClick={() => setActiveTab(item.key)}
                        >
                            <span>{item.icon}</span>
                            <span>{item.label}</span>
                        </button>
                    ))}
                </nav>
                <div className="sidebar-footer">
                    <a href={`/v/${slug}`} target="_blank" rel="noreferrer" className="sidebar-visit-btn">
                        访问商城 →
                    </a>
                    <button className="sidebar-logout" onClick={() => { logout(); navigate('/login') }}>
                        退出登录
                    </button>
                </div>
            </aside>

            {/* 主内容区 */}
            <main className="shop-admin-main">
                {/* 顶部欢迎/试用栏 */}
                <TrialCountdown shop={shop} needUpgrade={needUpgrade} onUpgrade={() => setActiveTab('plan')} />

                {/* 平台公告 */}
                <PlatformNotices />

                {msg && (
                    <div className={`shop-admin-msg ${msg.startsWith('✅') ? 'success' : 'error'}`}>
                        {msg}
                    </div>
                )}

                {/* 店铺基础信息 */}
                {activeTab === 'shop' && (
                    <section className="shop-admin-section">
                        <h2>店铺基础信息</h2>
                        <p className="section-desc">商城对外展示的基本信息</p>
                        <form onSubmit={handleShopSave} className="admin-form">
                            <div className="form-row">
                                <label>商城名称</label>
                                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="商城名称" required />
                            </div>
                            <div className="form-row">
                                <label>商城公告</label>
                                <input value={form.notice} onChange={e => setForm(f => ({ ...f, notice: e.target.value }))} placeholder="首页顶部公告（可留空）" />
                            </div>
                            <div className="form-row">
                                <label>皮肤主题</label>
                                <select value={form.skin} onChange={e => setForm(f => ({ ...f, skin: e.target.value }))}>
                                    {SKIN_OPTIONS.map(o => (
                                        <option key={o.value} value={o.value}>{o.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-row">
                                <label>联系邮箱</label>
                                <input type="email" value={form.contactEmail} onChange={e => setForm(f => ({ ...f, contactEmail: e.target.value }))} placeholder="客户联系邮箱" />
                            </div>
                            <div className="form-row">
                                <label>Logo URL</label>
                                <input value={form.logo} onChange={e => setForm(f => ({ ...f, logo: e.target.value }))} placeholder="https://..." />
                            </div>
                            <div className="form-info">
                                <span>商城地址：</span>
                                <a href={`/v/${slug}`} target="_blank" rel="noreferrer">{window.location.origin}/v/{slug}</a>
                            </div>
                            <button type="submit" className="admin-btn-primary" disabled={saving}>
                                {saving ? '保存中...' : '保存设置'}
                            </button>
                        </form>
                    </section>
                )}

                {/* 账号信息 */}
                {activeTab === 'account' && (
                    <section className="shop-admin-section">
                        <h2>超管账户信息</h2>
                        <p className="section-desc">修改登录邮箱和密码</p>
                        <form onSubmit={handleAccountSave} className="admin-form">
                            <div className="form-row">
                                <label>店铺名称</label>
                                <input value={accountForm.shopName} onChange={e => setAccountForm(f => ({ ...f, shopName: e.target.value }))} />
                            </div>
                            <div className="form-row">
                                <label>登录邮箱</label>
                                <input value={merchant?.email} disabled className="input-disabled" />
                            </div>
                            <hr className="form-divider" />
                            <p className="form-hint">修改密码（不改则留空）</p>
                            <div className="form-row">
                                <label>当前密码</label>
                                <input type="password" value={accountForm.currentPassword} onChange={e => setAccountForm(f => ({ ...f, currentPassword: e.target.value }))} placeholder="输入当前密码" />
                            </div>
                            <div className="form-row">
                                <label>新密码</label>
                                <input type="password" value={accountForm.newPassword} onChange={e => setAccountForm(f => ({ ...f, newPassword: e.target.value }))} placeholder="至少 6 位" minLength={6} />
                            </div>
                            <button type="submit" className="admin-btn-primary" disabled={savingAccount}>
                                {savingAccount ? '保存中...' : '更新账号信息'}
                            </button>
                        </form>
                    </section>
                )}

                {/* 套餐订阅 */}
                {activeTab === 'plan' && (
                    <section className="shop-admin-section">
                        <PlanPurchase />
                    </section>
                )}

                {/* 数据导出 */}
                {activeTab === 'export' && (
                    <section className="shop-admin-section">
                        <h2>数据导出</h2>
                        <p className="section-desc">导出商城数据为 CSV 文件，可用 Excel 打开</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
                            {[
                                { type: 'orders', icon: '📋', label: '导出订单数据', desc: '包含订单号、邮箱、商品、金额、状态、卡密' },
                                { type: 'products', icon: '📦', label: '导出商品数据', desc: '包含商品名、价格、库存、已售、状态' },
                                { type: 'cards', icon: '🎴', label: '导出卡密数据', desc: '包含商品名、卡密内容、状态、售出时间' },
                            ].map(item => (
                                <div key={item.type} style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '16px 20px'
                                }}>
                                    <div>
                                        <div style={{ fontWeight: 600, color: '#1e293b' }}>{item.icon} {item.label}</div>
                                        <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 4 }}>{item.desc}</div>
                                    </div>
                                    <a
                                        href={`/api/platform/export?type=${item.type}`}
                                        onClick={e => {
                                            e.preventDefault()
                                            fetch(`/api/platform/export?type=${item.type}`, {
                                                headers: { Authorization: `Bearer ${token}` }
                                            }).then(r => {
                                                if (!r.ok) throw new Error('导出失败')
                                                return r.blob()
                                            }).then(blob => {
                                                const url = URL.createObjectURL(blob)
                                                const a = document.createElement('a')
                                                a.href = url
                                                a.download = `${item.type}_export.csv`
                                                a.click()
                                                URL.revokeObjectURL(url)
                                            }).catch(() => alert('导出失败，请重试'))
                                        }}
                                        style={{
                                            padding: '8px 18px', background: '#6366f1', color: 'white',
                                            borderRadius: 8, textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600
                                        }}
                                    >
                                        下载
                                    </a>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* 独立域名 */}
                {activeTab === 'domain' && (
                    <section className="shop-admin-section">
                        <h2>独立域名配置</h2>
                        <p className="section-desc">绑定你自己的域名，让商城更专业（专业版套餐功能）</p>
                        <div className="domain-steps">
                            <div className="domain-step">
                                <span className="step-num">1</span>
                                <div>
                                    <strong>购买域名</strong>
                                    <p>在任意域名注册商购买你的域名</p>
                                </div>
                            </div>
                            <div className="domain-step">
                                <span className="step-num">2</span>
                                <div>
                                    <strong>添加 DNS 解析</strong>
                                    <p>将域名 A 记录指向 Vmart 服务器 IP</p>
                                </div>
                            </div>
                            <div className="domain-step">
                                <span className="step-num">3</span>
                                <div>
                                    <strong>填写域名并申请 SSL</strong>
                                    <p>在下方填写域名，系统自动签发证书</p>
                                </div>
                            </div>
                        </div>
                        <form onSubmit={handleShopSave} className="admin-form">
                            <div className="form-row">
                                <label>自定义域名</label>
                                <input
                                    value={form.customDomain}
                                    onChange={e => setForm(f => ({ ...f, customDomain: e.target.value }))}
                                    placeholder="例如：myshop.com"
                                />
                            </div>
                            <button type="submit" className="admin-btn-primary" disabled={saving || shop.plan !== 'PRO'}>
                                {shop.plan !== 'PRO' ? '升级专业版解锁' : (saving ? '保存中...' : '保存并验证域名')}
                            </button>
                        </form>
                    </section>
                )}
            </main>
        </div>
    )
}

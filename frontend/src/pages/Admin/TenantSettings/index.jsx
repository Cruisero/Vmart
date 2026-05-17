import { useState, useEffect } from 'react'
import { useAuthStore } from '../../../store/authStore'
import { useMerchantStore } from '../../../store/merchantStore'
import PlanPurchase from '../../ShopAdmin/PlanPurchase'
import './TenantSettings.css'

const API = import.meta.env.VITE_API_URL || '/api'

const ALL_SKIN_OPTIONS = [
    { value: 'classic', label: 'Classic', desc: '经典简约' },
    { value: 'fresh', label: 'Fresh', desc: '清新明亮' },
    { value: 'zen', label: 'Zen', desc: '深色质感' },
]

export default function TenantSettings() {
    const { token, user } = useAuthStore()
    const { token: mToken, merchant, shop, setAuth, updateShop } = useMerchantStore()
    const [tenant, setTenant] = useState(null)
    const [tenantSettings, setTenantSettings] = useState(null)
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState('basic')
    const [allowedSkins, setAllowedSkins] = useState(['classic', 'fresh', 'zen'])

    // 基本信息表单
    const [shopForm, setShopForm] = useState({ name: '', notice: '', skin: 'fresh', logo: '', favicon: '', agentEnabled: false })
    const [shopSaving, setShopSaving] = useState(false)
    const [shopMsg, setShopMsg] = useState(null)

    // 密码表单
    const [pwdForm, setPwdForm] = useState({ currentPassword: '', newPassword: '', confirm: '' })
    const [pwdSaving, setPwdSaving] = useState(false)
    const [pwdMsg, setPwdMsg] = useState(null)

    // 支付配置
    const [payForm, setPayForm] = useState({
        alipayEnabled: false, usdtEnabled: false, bscUsdtEnabled: false,
        alipayAppId: '', alipayPrivateKey: '', alipayPublicKey: '',
        usdtWallet: '', bscUsdtWallet: '', usdtExchangeRate: '7.2',
        emailMode: 'platform', smtpHost: '', smtpPort: '465', smtpUser: '', smtpPass: '',
        notifyOrderPaid: true, notifyShipRemind: true, notifyNewTicket: true, notifyNewUser: false, notifyStockAlert: true, notifyOrderCancel: false, notifyRefund: true, notifyEmail: '',
        stockMode: 'auto', orderTimeout: 15
    })
    const [paySaving, setPaySaving] = useState(false)
    const [payMsg, setPayMsg] = useState(null)

    // 域名
    const [domain, setDomain] = useState('')
    const [dnsGuide, setDnsGuide] = useState(null)
    const [dnsVerified, setDnsVerified] = useState(false)
    const [domainSaving, setDomainSaving] = useState(false)
    const [domainMsg, setDomainMsg] = useState(null)
    const [verifying, setVerifying] = useState(false)

    // Toast 自动消失（3 秒）
    useEffect(() => { if (shopMsg) { const t = setTimeout(() => setShopMsg(null), 3000); return () => clearTimeout(t) } }, [shopMsg])
    useEffect(() => { if (pwdMsg) { const t = setTimeout(() => setPwdMsg(null), 3000); return () => clearTimeout(t) } }, [pwdMsg])
    useEffect(() => { if (payMsg) { const t = setTimeout(() => setPayMsg(null), 3000); return () => clearTimeout(t) } }, [payMsg])
    useEffect(() => { if (domainMsg) { const t = setTimeout(() => setDomainMsg(null), 3000); return () => clearTimeout(t) } }, [domainMsg])

    useEffect(() => {
        if (!token) return
        Promise.all([
            fetch(`${API}/tenant/me`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
            fetch(`${API}/tenant/settings`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
            mToken ? fetch('/api/platform/plan/limits', { headers: { Authorization: `Bearer ${mToken}` } }).then(r => r.json()).catch(() => null) : Promise.resolve(null),
            mToken ? fetch('/api/platform/me', { headers: { Authorization: `Bearer ${mToken}` } }).then(r => r.json()).catch(() => null) : Promise.resolve(null),
            fetch('/api/admin/settings', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).catch(() => null)
        ]).then(([tenantData, settingsData, limitsData, platformData, adminSettingsData]) => {
            const t = tenantData.tenant
            setTenant(t)
            setTenantSettings(settingsData.settings)
            // 解析 platform shop 的 settings（含 favicon）
            let shopSettings = {}
            const platformShop = platformData?.shop
            if (platformShop?.settings) {
                try { shopSettings = JSON.parse(platformShop.settings) } catch {}
            }
            // 解析租户 systemSettings（含 agentEnabled）
            const sysSettings = adminSettingsData?.settings || {}
            // 同步到 merchantStore（保证刷新后页面其他地方也能拿到最新 shop）
            if (platformShop && updateShop) updateShop(platformShop)
            if (t) {
                setShopForm({
                    name: t.shopName || '',
                    notice: t.shopNotice || '',
                    skin: t.shopSkin || 'fresh',
                    logo: t.shopLogo || platformShop?.logo || '',
                    favicon: shopSettings.favicon || '',
                    agentEnabled: sysSettings.agentEnabled === true || sysSettings.agentEnabled === 'true'
                })
                if (t.domains?.[0]) {
                    setDomain(t.domains[0].domain)
                    setDnsVerified(t.domains[0].dnsVerified)
                }
            }
            if (settingsData.settings) {
                const s = settingsData.settings
                let payConfig = {}
                try { payConfig = JSON.parse(s.paymentConfig || '{}') } catch {}
                setPayForm({
                    alipayEnabled: s.alipayEnabled || false,
                    usdtEnabled: s.usdtEnabled || false,
                    bscUsdtEnabled: s.bscUsdtEnabled || false,
                    alipayAppId: payConfig.alipay_app_id || '',
                    alipayPrivateKey: payConfig.alipay_private_key || '',
                    alipayPublicKey: payConfig.alipay_public_key || '',
                    usdtWallet: payConfig.usdt_wallet || '',
                    bscUsdtWallet: payConfig.bsc_usdt_wallet || '',
                    usdtExchangeRate: payConfig.usdt_exchange_rate || '7.2',
                    emailMode: payConfig.email_mode || 'platform',
                    smtpHost: payConfig.smtp_host || '',
                    smtpPort: payConfig.smtp_port || '465',
                    smtpUser: payConfig.smtp_user || '',
                    smtpPass: payConfig.smtp_pass || '',
                    notifyOrderPaid: payConfig.notify_order_paid !== false,
                    notifyShipRemind: payConfig.notify_ship_remind !== false,
                    notifyNewTicket: payConfig.notify_new_ticket !== false,
                    notifyNewUser: payConfig.notify_new_user || false,
                    notifyStockAlert: payConfig.notify_stock_alert !== false,
                    notifyOrderCancel: payConfig.notify_order_cancel || false,
                    notifyRefund: payConfig.notify_refund !== false,
                    notifyEmail: payConfig.notify_email || '',
                    stockMode: payConfig.stock_mode || 'auto',
                    orderTimeout: payConfig.order_timeout || 15
                })
            }
            // 获取套餐允许的皮肤
            if (limitsData?.limits?.skins) {
                const skins = limitsData.limits.skins
                if (Array.isArray(skins)) {
                    setAllowedSkins(skins)
                } else if (skins === '全部') {
                    setAllowedSkins(['classic', 'fresh', 'zen'])
                }
            }
        }).finally(() => setLoading(false))
    }, [token, mToken])

    // 保存商城基本信息
    const handleShopSave = async e => {
        e.preventDefault()
        setShopSaving(true); setShopMsg(null)
        try {
            // 更新 tenant 信息
            const r = await fetch(`${API}/tenant/setup`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    shopName: shopForm.name,
                    shopSlug: tenant?.shopSlug,
                    shopSkin: shopForm.skin,
                    shopNotice: shopForm.notice,
                    shopLogo: shopForm.logo
                })
            })
            const d = await r.json()
            if (r.ok) {
                setTenant(d.tenant)
                setShopMsg({ type: 'success', text: '保存成功' })
                // 同步更新 platform shop
                if (mToken) {
                    const psr = await fetch('/api/platform/shop', {
                        method: 'PUT',
                        headers: { Authorization: `Bearer ${mToken}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name: shopForm.name, notice: shopForm.notice, skin: shopForm.skin, logo: shopForm.logo, settings: JSON.stringify({ favicon: shopForm.favicon }) })
                    })
                    const psData = await psr.json().catch(() => null)
                    if (psData?.shop && updateShop) updateShop(psData.shop)
                }
                // 保存 systemSettings（如代理管理开关）
                await fetch('/api/admin/settings', {
                    method: 'PUT',
                    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ agentEnabled: !!shopForm.agentEnabled })
                }).catch(() => {})
            } else {
                setShopMsg({ type: 'error', text: d.error || '保存失败' })
            }
        } catch { setShopMsg({ type: 'error', text: '网络错误' }) }
        setShopSaving(false)
    }

    // 修改密码
    const handlePwdChange = async e => {
        e.preventDefault()
        if (pwdForm.newPassword !== pwdForm.confirm) { setPwdMsg({ type: 'error', text: '两次密码不一致' }); return }
        if (pwdForm.newPassword.length < 6) { setPwdMsg({ type: 'error', text: '密码至少 6 位' }); return }
        setPwdSaving(true); setPwdMsg(null)
        try {
            const r = await fetch('/api/platform/account', {
                method: 'PATCH',
                headers: { Authorization: `Bearer ${mToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ currentPassword: pwdForm.currentPassword, newPassword: pwdForm.newPassword })
            })
            const d = await r.json()
            if (r.ok) { setPwdMsg({ type: 'success', text: '密码已更新' }); setPwdForm({ currentPassword: '', newPassword: '', confirm: '' }) }
            else setPwdMsg({ type: 'error', text: d.error || '更新失败' })
        } catch { setPwdMsg({ type: 'error', text: '网络错误' }) }
        setPwdSaving(false)
    }

    // 保存支付配置
    const handlePaySave = async (e) => {
        if (e?.preventDefault) e.preventDefault()
        // 校验：已启用的支付方式必填配置
        const errors = []
        if (payForm.alipayEnabled) {
            if (!payForm.alipayAppId.trim()) errors.push('支付宝当面付：请填写 App ID')
            if (!payForm.alipayPrivateKey.trim()) errors.push('支付宝当面付：请填写应用私钥')
            if (!payForm.alipayPublicKey.trim()) errors.push('支付宝当面付：请填写支付宝公钥')
        }
        if (payForm.usdtEnabled) {
            if (!payForm.usdtWallet.trim()) errors.push('USDT-TRC20：请填写收款钱包地址')
            else if (!/^T[A-Za-z0-9]{33}$/.test(payForm.usdtWallet.trim())) errors.push('USDT-TRC20：钱包地址格式不正确（应以 T 开头共 34 位）')
            const rate = parseFloat(payForm.usdtExchangeRate)
            if (!rate || rate <= 0) errors.push('USDT-TRC20：请填写有效的汇率')
        }
        if (payForm.bscUsdtEnabled) {
            if (!payForm.bscUsdtWallet.trim()) errors.push('USDT-BEP20：请填写收款钱包地址')
            else if (!/^0x[a-fA-F0-9]{40}$/.test(payForm.bscUsdtWallet.trim())) errors.push('USDT-BEP20：钱包地址格式不正确（应以 0x 开头共 42 位）')
        }
        if (errors.length) {
            setPayMsg({ type: 'error', text: errors[0] })
            return
        }

        setPaySaving(true); setPayMsg(null)
        try {
            const paymentConfig = JSON.stringify({
                alipay_app_id: payForm.alipayAppId,
                alipay_private_key: payForm.alipayPrivateKey,
                alipay_public_key: payForm.alipayPublicKey,
                usdt_wallet: payForm.usdtWallet,
                bsc_usdt_wallet: payForm.bscUsdtWallet,
                usdt_exchange_rate: payForm.usdtExchangeRate,
                email_mode: payForm.emailMode,
                smtp_host: payForm.smtpHost,
                smtp_port: payForm.smtpPort,
                smtp_user: payForm.smtpUser,
                smtp_pass: payForm.smtpPass,
                notify_order_paid: payForm.notifyOrderPaid,
                notify_ship_remind: payForm.notifyShipRemind,
                notify_new_ticket: payForm.notifyNewTicket,
                notify_new_user: payForm.notifyNewUser,
                notify_stock_alert: payForm.notifyStockAlert,
                notify_order_cancel: payForm.notifyOrderCancel,
                notify_refund: payForm.notifyRefund,
                notify_email: payForm.notifyEmail,
                stock_mode: payForm.stockMode,
                order_timeout: payForm.orderTimeout
            })
            const r = await fetch(`${API}/tenant/settings`, {
                method: 'PUT',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    alipayEnabled: payForm.alipayEnabled,
                    usdtEnabled: payForm.usdtEnabled,
                    bscUsdtEnabled: payForm.bscUsdtEnabled,
                    paymentConfig
                })
            })
            const d = await r.json()
            if (r.ok) setPayMsg({ type: 'success', text: '支付配置已保存' })
            else setPayMsg({ type: 'error', text: d.error || '保存失败' })
        } catch { setPayMsg({ type: 'error', text: '网络错误' }) }
        setPaySaving(false)
    }

    // 域名操作
    const addDomain = async () => {
        if (!domain.trim()) return
        setDomainSaving(true); setDomainMsg(null)
        try {
            const r = await fetch(`${API}/tenant/domain`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ domain: domain.trim().toLowerCase() })
            })
            const d = await r.json()
            if (d.dnsGuide) { setDnsGuide(d.dnsGuide); setDomainMsg({ type: 'info', text: '域名已添加，请配置 DNS' }) }
            else setDomainMsg({ type: 'error', text: d.error || '添加失败' })
        } catch { setDomainMsg({ type: 'error', text: '网络错误' }) }
        setDomainSaving(false)
    }

    const verifyDns = async () => {
        setVerifying(true); setDomainMsg(null)
        try {
            const r = await fetch(`${API}/tenant/domain/verify`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ domain: domain.trim() })
            })
            const d = await r.json()
            if (d.verified) { setDnsVerified(true); setDomainMsg({ type: 'success', text: 'DNS 验证成功！' }) }
            else setDomainMsg({ type: 'warning', text: d.message || 'DNS 尚未生效' })
        } catch { setDomainMsg({ type: 'error', text: '网络错误' }) }
        setVerifying(false)
    }

    if (loading) return <div className="ts-loading">加载中...</div>

    const displayEmail = merchant?.email || user?.email || '—'
    const displaySlug = shop?.slug || tenant?.shopSlug || '—'

    const tabs = [
        { key: 'basic', icon: '🏪', label: '基本信息' },
        { key: 'payment', icon: '💳', label: '支付配置' },
        { key: 'order', icon: '📋', label: '订单设置' },
        { key: 'email', icon: '📧', label: '邮件设置' },
        { key: 'admin', icon: '👥', label: '管理员' },
        { key: 'account', icon: '🔐', label: '账号安全' },
        { key: 'plan', icon: '💎', label: '套餐信息' },
    ]

    return (
        <div className="ts-page">
            <div className="ts-header">
                <h2>商城设置</h2>
                <p>管理商城信息、支付方式、账号安全和域名配置</p>
            </div>

            {/* Tab 导航 */}
            <div className="ts-tabs">
                {tabs.map(t => (
                    <button
                        key={t.key}
                        className={`ts-tab ${activeTab === t.key ? 'active' : ''}`}
                        onClick={() => setActiveTab(t.key)}
                    >
                        <span>{t.icon}</span>
                        <span>{t.label}</span>
                    </button>
                ))}
            </div>

            {/* 基本信息 */}
            {activeTab === 'basic' && (
                <div className="ts-section">
                    {shopMsg && <div className={`ts-msg ${shopMsg.type}`}>{shopMsg.text}</div>}
                    <form onSubmit={handleShopSave} className="ts-form">
                        <div className="ts-form-group">
                            <label>商城名称</label>
                            <input value={shopForm.name} onChange={e => setShopForm(f => ({ ...f, name: e.target.value }))} placeholder="你的商城名称" required />
                        </div>
                        <div className="ts-form-group">
                            <label>商城公告</label>
                            <input value={shopForm.notice} onChange={e => setShopForm(f => ({ ...f, notice: e.target.value }))} placeholder="首页顶部滚动公告（可留空）" />
                            <span className="ts-hint">显示在商城首页顶部，用于通知买家</span>
                        </div>
                        <div className="ts-form-group">
                            <label>Logo</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                {shopForm.logo && <img src={shopForm.logo} alt="Logo" style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover', border: '1px solid var(--border-color)' }} />}
                                <label style={{ padding: '8px 16px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontSize: '0.84rem', cursor: 'pointer' }}>
                                    {shopForm.logo ? '更换' : '上传 Logo'}
                                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={async e => {
                                        const file = e.target.files[0]
                                        if (!file) return
                                        const formData = new FormData()
                                        formData.append('images', file)
                                        try {
                                            const r = await fetch('/api/upload', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData })
                                            const d = await r.json()
                                            if (d.images?.[0]) { setShopForm(f => ({ ...f, logo: d.images[0].urls.original })); setShopMsg({ type: 'success', text: 'Logo 上传成功' }) }
                                            else setShopMsg({ type: 'error', text: d.error || '上传失败' })
                                        } catch { setShopMsg({ type: 'error', text: '上传失败' }) }
                                    }} />
                                </label>
                                {shopForm.logo && <button type="button" onClick={() => setShopForm(f => ({ ...f, logo: '' }))} style={{ background: 'none', border: 'none', color: 'var(--error)', fontSize: '0.8rem', cursor: 'pointer' }}>清除</button>}
                            </div>
                            <span className="ts-hint">建议尺寸 200×200，支持 PNG/SVG</span>
                        </div>
                        <div className="ts-form-group">
                            <label>Favicon（书签栏图标）</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                {shopForm.favicon && <img src={shopForm.favicon} alt="Favicon" style={{ width: 32, height: 32, borderRadius: 4, objectFit: 'cover', border: '1px solid var(--border-color)' }} />}
                                <label style={{ padding: '8px 16px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontSize: '0.84rem', cursor: 'pointer' }}>
                                    {shopForm.favicon ? '更换' : '上传 Favicon'}
                                    <input type="file" accept="image/*,.ico" style={{ display: 'none' }} onChange={async e => {
                                        const file = e.target.files[0]
                                        if (!file) return
                                        const formData = new FormData()
                                        formData.append('images', file)
                                        try {
                                            const r = await fetch('/api/upload', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData })
                                            const d = await r.json()
                                            if (d.images?.[0]) { setShopForm(f => ({ ...f, favicon: d.images[0].urls.original })); setShopMsg({ type: 'success', text: 'Favicon 上传成功' }) }
                                            else setShopMsg({ type: 'error', text: d.error || '上传失败' })
                                        } catch { setShopMsg({ type: 'error', text: '上传失败' }) }
                                    }} />
                                </label>
                                {shopForm.favicon && <button type="button" onClick={() => setShopForm(f => ({ ...f, favicon: '' }))} style={{ background: 'none', border: 'none', color: 'var(--error)', fontSize: '0.8rem', cursor: 'pointer' }}>清除</button>}
                            </div>
                            <span className="ts-hint">建议尺寸 32×32，ICO 或 PNG 格式</span>
                        </div>
                        <div className="ts-form-group">
                            <label>商城主题</label>
                            <div className="ts-skin-grid">
                                {ALL_SKIN_OPTIONS.filter(s => allowedSkins.includes(s.value)).map(s => (
                                    <div
                                        key={s.value}
                                        className={`ts-skin-card ${shopForm.skin === s.value ? 'active' : ''}`}
                                        onClick={() => setShopForm(f => ({ ...f, skin: s.value }))}
                                    >
                                        <div className="ts-skin-name">{s.label}</div>
                                        <div className="ts-skin-desc">{s.desc}</div>
                                    </div>
                                ))}
                            </div>
                            {allowedSkins.length < 3 && (
                                <span className="ts-hint">升级套餐可解锁更多主题</span>
                            )}
                        </div>
                        <div className="ts-form-group">
                            <label>启用代理管理</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
                                <label className="ts-switch" style={{ position: 'relative', display: 'inline-block', width: 42, height: 22 }}>
                                    <input
                                        type="checkbox"
                                        checked={!!shopForm.agentEnabled}
                                        onChange={e => setShopForm(f => ({ ...f, agentEnabled: e.target.checked }))}
                                        style={{ opacity: 0, width: 0, height: 0 }}
                                    />
                                    <span style={{
                                        position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                                        background: shopForm.agentEnabled ? 'var(--primary)' : '#ccc',
                                        borderRadius: 22, transition: '0.2s'
                                    }}>
                                        <span style={{
                                            position: 'absolute', height: 16, width: 16, left: shopForm.agentEnabled ? 23 : 3,
                                            top: 3, background: '#fff', borderRadius: '50%', transition: '0.2s'
                                        }} />
                                    </span>
                                </label>
                                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                    {shopForm.agentEnabled ? '已开启，侧边栏将显示「代理管理」' : '已关闭，隐藏代理管理功能'}
                                </span>
                            </div>
                            <span className="ts-hint">用于审核加盟代理、管理分站皮肤池、提现审核等。无需代理体系可关闭。</span>
                        </div>
                        <div className="ts-form-group">
                            <label>商城地址</label>
                            <div className="ts-readonly">
                                <a href={`/v/${displaySlug}`} target="_blank" rel="noreferrer">
                                    {window.location.origin}/v/{displaySlug}
                                </a>
                            </div>
                        </div>

                        {/* 独立域名（专业版功能） */}
                        <div className="ts-form-group">
                            <label>独立域名 <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>（专业版可用）</span></label>
                            {domainMsg && <div className={`ts-msg ${domainMsg.type}`}>{domainMsg.text}</div>}
                            <div style={{ display: 'flex', gap: 10 }}>
                                <input
                                    value={domain}
                                    onChange={e => setDomain(e.target.value.toLowerCase())}
                                    placeholder="例如：shop.yourdomain.com"
                                    disabled={dnsVerified}
                                    style={{ flex: 1 }}
                                />
                                {!dnsVerified && (
                                    <button type="button" className="ts-btn-secondary" onClick={addDomain} disabled={domainSaving || !domain}>
                                        {domainSaving ? '...' : '添加'}
                                    </button>
                                )}
                            </div>
                            {dnsGuide && !dnsVerified && (
                                <div className="ts-dns-guide" style={{ marginTop: 12 }}>
                                    <div className="ts-dns-title">📋 请添加以下 DNS 记录</div>
                                    <div className="ts-dns-table">
                                        <div><span>类型</span><code>A</code></div>
                                        <div><span>主机记录</span><code>@</code></div>
                                        <div><span>记录值</span><code>{dnsGuide.value}</code></div>
                                        <div><span>TTL</span><code>600</code></div>
                                    </div>
                                </div>
                            )}
                            {domain && !dnsVerified && (
                                <button type="button" className="ts-btn-primary" onClick={verifyDns} disabled={verifying} style={{ marginTop: 10 }}>
                                    {verifying ? '检测中...' : '🔍 验证 DNS'}
                                </button>
                            )}
                            {dnsVerified && (
                                <div className="ts-success-box" style={{ marginTop: 10 }}>✅ DNS 已验证，域名已生效</div>
                            )}
                            <span className="ts-hint">绑定自己的域名，让商城更专业（需专业版套餐）</span>
                        </div>

                        <button type="submit" className="ts-btn-primary" disabled={shopSaving}>
                            {shopSaving ? '保存中...' : '保存设置'}
                        </button>
                    </form>
                </div>
            )}

            {/* 支付配置 */}
            {activeTab === 'payment' && (
                <div className="ts-section">
                    <div className="ts-section-desc">
                        <h3>收款方式配置</h3>
                        <p>启用后买家可通过对应方式付款，资金直接进入您的账户</p>
                    </div>
                    {payMsg && <div className={`ts-msg ${payMsg.type}`}>{payMsg.text}</div>}
                    <form onSubmit={handlePaySave} className="ts-form">
                        {/* 支付宝 */}
                        <div className="ts-toggle-group">
                            <label className="ts-toggle">
                                <input type="checkbox" checked={payForm.alipayEnabled} onChange={e => setPayForm(f => ({ ...f, alipayEnabled: e.target.checked }))} />
                                <span className="ts-toggle-slider"></span>
                                <span className="ts-toggle-label">支付宝当面付</span>
                            </label>
                        </div>
                        {payForm.alipayEnabled && (
                            <div className="ts-pay-fields">
                                <div className="ts-pay-field">
                                    <label>App ID</label>
                                    <input value={payForm.alipayAppId} onChange={e => setPayForm(f => ({ ...f, alipayAppId: e.target.value }))} placeholder="支付宝应用 App ID" />
                                </div>
                                <div className="ts-pay-field">
                                    <label>应用私钥</label>
                                    <input value={payForm.alipayPrivateKey} onChange={e => setPayForm(f => ({ ...f, alipayPrivateKey: e.target.value }))} placeholder="RSA2 应用私钥" type="password" />
                                </div>
                                <div className="ts-pay-field">
                                    <label>支付宝公钥</label>
                                    <input value={payForm.alipayPublicKey} onChange={e => setPayForm(f => ({ ...f, alipayPublicKey: e.target.value }))} placeholder="支付宝公钥（用于验签）" type="password" />
                                </div>
                            </div>
                        )}

                        {/* USDT-TRC20 */}
                        <div className="ts-toggle-group">
                            <label className="ts-toggle">
                                <input type="checkbox" checked={payForm.usdtEnabled} onChange={e => setPayForm(f => ({ ...f, usdtEnabled: e.target.checked }))} />
                                <span className="ts-toggle-slider"></span>
                                <span className="ts-toggle-label">USDT-TRC20</span>
                            </label>
                        </div>
                        {payForm.usdtEnabled && (
                            <div className="ts-pay-fields">
                                <div className="ts-pay-field">
                                    <label>TRC20 收款钱包地址</label>
                                    <input value={payForm.usdtWallet} onChange={e => setPayForm(f => ({ ...f, usdtWallet: e.target.value }))} placeholder="T..." />
                                </div>
                                <div className="ts-pay-field">
                                    <label>汇率（1 USDT = ? CNY）</label>
                                    <input value={payForm.usdtExchangeRate} onChange={e => setPayForm(f => ({ ...f, usdtExchangeRate: e.target.value }))} placeholder="7.2" type="number" step="0.01" />
                                </div>
                            </div>
                        )}

                        {/* USDT-BEP20 */}
                        <div className="ts-toggle-group">
                            <label className="ts-toggle">
                                <input type="checkbox" checked={payForm.bscUsdtEnabled} onChange={e => setPayForm(f => ({ ...f, bscUsdtEnabled: e.target.checked }))} />
                                <span className="ts-toggle-slider"></span>
                                <span className="ts-toggle-label">USDT-BEP20 (BSC)</span>
                            </label>
                        </div>
                        {payForm.bscUsdtEnabled && (
                            <div className="ts-pay-fields">
                                <div className="ts-pay-field">
                                    <label>BEP20 收款钱包地址</label>
                                    <input value={payForm.bscUsdtWallet} onChange={e => setPayForm(f => ({ ...f, bscUsdtWallet: e.target.value }))} placeholder="0x..." />
                                </div>
                            </div>
                        )}

                        <button type="submit" className="ts-btn-primary" disabled={paySaving}>
                            {paySaving ? '保存中...' : '保存支付配置'}
                        </button>
                    </form>
                </div>
            )}

            {/* 管理员 */}
            {activeTab === 'admin' && (
                <AdminTab token={token} currentUserEmail={displayEmail} />
            )}

            {/* 账号安全 */}
            {activeTab === 'account' && (
                <div className="ts-section">
                    <div className="ts-info-card">
                        <div className="ts-info-row"><span>登录邮箱</span><span>{displayEmail}</span></div>
                        <div className="ts-info-row"><span>商城 Slug</span><span>{displaySlug}</span></div>
                        <div className="ts-info-row"><span>用户角色</span><span>{user?.role || '—'}</span></div>
                    </div>

                    <div className="ts-section-desc" style={{ marginTop: 24 }}>
                        <h3>修改密码</h3>
                    </div>
                    {pwdMsg && <div className={`ts-msg ${pwdMsg.type}`}>{pwdMsg.text}</div>}
                    <form onSubmit={handlePwdChange} className="ts-form">
                        <div className="ts-form-group">
                            <label>当前密码</label>
                            <input type="password" value={pwdForm.currentPassword} onChange={e => setPwdForm(f => ({ ...f, currentPassword: e.target.value }))} required />
                        </div>
                        <div className="ts-form-group">
                            <label>新密码</label>
                            <input type="password" value={pwdForm.newPassword} onChange={e => setPwdForm(f => ({ ...f, newPassword: e.target.value }))} required minLength={6} placeholder="至少 6 位" />
                        </div>
                        <div className="ts-form-group">
                            <label>确认新密码</label>
                            <input type="password" value={pwdForm.confirm} onChange={e => setPwdForm(f => ({ ...f, confirm: e.target.value }))} required />
                        </div>
                        <button type="submit" className="ts-btn-primary" disabled={pwdSaving}>
                            {pwdSaving ? '更新中...' : '更新密码'}
                        </button>
                    </form>
                </div>
            )}

            {/* 订单设置 */}
            {activeTab === 'order' && (
                <div className="ts-section">
                    <div className="ts-section-desc">
                        <h3>订单设置</h3>
                        <p>配置库存计算方式和订单超时规则</p>
                    </div>
                    <div className="ts-form">
                        <div className="ts-form-group">
                            <label>库存计算方式</label>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                <div
                                    onClick={() => setPayForm(f => ({ ...f, stockMode: 'auto' }))}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px',
                                        border: `2px solid ${(payForm.stockMode || 'auto') === 'auto' ? 'var(--primary)' : 'var(--border-color)'}`,
                                        borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                                        background: (payForm.stockMode || 'auto') === 'auto' ? 'rgba(239,68,68,0.04)' : 'transparent'
                                    }}
                                >
                                    <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${(payForm.stockMode || 'auto') === 'auto' ? 'var(--primary)' : 'var(--border-color)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {(payForm.stockMode || 'auto') === 'auto' && <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--primary)' }} />}
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>🔄 自动计算</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>库存 = 可用卡密数量，发货后自动扣减</div>
                                    </div>
                                </div>
                                <div
                                    onClick={() => setPayForm(f => ({ ...f, stockMode: 'manual' }))}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px',
                                        border: `2px solid ${payForm.stockMode === 'manual' ? 'var(--primary)' : 'var(--border-color)'}`,
                                        borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                                        background: payForm.stockMode === 'manual' ? 'rgba(239,68,68,0.04)' : 'transparent'
                                    }}
                                >
                                    <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${payForm.stockMode === 'manual' ? 'var(--primary)' : 'var(--border-color)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {payForm.stockMode === 'manual' && <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--primary)' }} />}
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>✏️ 手动设置</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>手动填写库存数量，不与卡密数量关联</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="ts-form-group">
                            <label>订单超时时间</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <input
                                    type="number"
                                    value={payForm.orderTimeout || 15}
                                    onChange={e => setPayForm(f => ({ ...f, orderTimeout: parseInt(e.target.value) || 15 }))}
                                    min={5} max={120}
                                    style={{ width: 100 }}
                                />
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>分钟</span>
                            </div>
                            <span className="ts-hint">未支付订单超时后自动取消</span>
                        </div>

                        <button type="button" className="ts-btn-primary" onClick={handlePaySave}>
                            保存订单设置
                        </button>
                    </div>
                </div>
            )}

            {/* 邮件设置 */}
            {activeTab === 'email' && (
                <div className="ts-section">
                    <div className="ts-section-desc">
                        <h3>邮件通知设置</h3>
                        <p>配置订单完成后自动发送卡密邮件给买家</p>
                    </div>
                    {payMsg && <div className={`ts-msg ${payMsg.type}`}>{payMsg.text}</div>}

                    <div className="ts-form">
                        {/* 邮件模式选择 */}
                        <div className="ts-form-group">
                            <label>发送模式</label>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                <div
                                    onClick={() => setPayForm(f => ({ ...f, emailMode: 'platform' }))}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px',
                                        border: `2px solid ${payForm.emailMode === 'platform' ? 'var(--primary)' : 'var(--border-color)'}`,
                                        borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                                        background: payForm.emailMode === 'platform' ? 'rgba(239,68,68,0.04)' : 'transparent',
                                        transition: 'all 0.15s'
                                    }}
                                >
                                    <div style={{
                                        width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                                        border: `2px solid ${payForm.emailMode === 'platform' ? 'var(--primary)' : 'var(--border-color)'}`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}>
                                        {payForm.emailMode === 'platform' && <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--primary)' }} />}
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>平台代发</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>零配置，发件人显示店铺名称，有月额度限制</div>
                                    </div>
                                </div>
                                <div
                                    onClick={() => setPayForm(f => ({ ...f, emailMode: 'custom' }))}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px',
                                        border: `2px solid ${payForm.emailMode === 'custom' ? 'var(--primary)' : 'var(--border-color)'}`,
                                        borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                                        background: payForm.emailMode === 'custom' ? 'rgba(239,68,68,0.04)' : 'transparent',
                                        transition: 'all 0.15s'
                                    }}
                                >
                                    <div style={{
                                        width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                                        border: `2px solid ${payForm.emailMode === 'custom' ? 'var(--primary)' : 'var(--border-color)'}`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}>
                                        {payForm.emailMode === 'custom' && <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--primary)' }} />}
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>自有 SMTP</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>使用自己的邮箱服务器，无额度限制</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 自有 SMTP 配置 */}
                        {payForm.emailMode === 'custom' && (
                            <div className="ts-pay-fields">
                                <div className="ts-pay-field">
                                    <label>SMTP 服务器</label>
                                    <input value={payForm.smtpHost || ''} onChange={e => setPayForm(f => ({ ...f, smtpHost: e.target.value }))} placeholder="smtp.example.com" />
                                </div>
                                <div className="ts-pay-field">
                                    <label>SMTP 端口</label>
                                    <input type="number" value={payForm.smtpPort || ''} onChange={e => setPayForm(f => ({ ...f, smtpPort: e.target.value }))} placeholder="465" />
                                </div>
                                <div className="ts-pay-field">
                                    <label>发件邮箱</label>
                                    <input value={payForm.smtpUser || ''} onChange={e => setPayForm(f => ({ ...f, smtpUser: e.target.value }))} placeholder="noreply@yourdomain.com" />
                                </div>
                                <div className="ts-pay-field">
                                    <label>邮箱密码/授权码</label>
                                    <input type="password" value={payForm.smtpPass || ''} onChange={e => setPayForm(f => ({ ...f, smtpPass: e.target.value }))} placeholder="授权码" />
                                </div>
                            </div>
                        )}

                        {payForm.emailMode === 'platform' && (
                            <div style={{ padding: '14px 16px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: '1rem' }}>💡</span>
                                <span>平台代发无需配置，系统以你的店铺名称作为发件人。额度由套餐决定。</span>
                            </div>
                        )}

                        {/* 通知开关 */}
                        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 18, marginTop: 4 }}>
                            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 14 }}>通知开关</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                                {[
                                    { key: 'notifyOrderPaid', icon: '💰', label: '订单支付成功', desc: '用户完成支付后通知管理员' },
                                    { key: 'notifyShipRemind', icon: '📦', label: '待手动发货', desc: '订单已支付但无卡密自动发放，需手动发货时通知' },
                                    { key: 'notifyNewTicket', icon: '📮', label: '新工单创建', desc: '用户提交新工单时通知管理员' },
                                    { key: 'notifyNewUser', icon: '👤', label: '新用户注册', desc: '有新用户注册时通知管理员' },
                                    { key: 'notifyStockAlert', icon: '⚠️', label: '库存不足预警', desc: '商品库存低于阈值时通知管理员' },
                                    { key: 'notifyOrderCancel', icon: '🚫', label: '订单取消', desc: '订单被取消时通知管理员' },
                                    { key: 'notifyRefund', icon: '💸', label: '退款成功通知', desc: '订单完成退款后向用户发送退款成功邮件' },
                                ].map(item => (
                                    <div key={item.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderBottom: '1px solid var(--border-color)' }}>
                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                                            <span style={{ fontSize: '1.1rem' }}>{item.icon}</span>
                                            <div>
                                                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>{item.label}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>{item.desc}</div>
                                            </div>
                                        </div>
                                        <label style={{ position: 'relative', width: 42, height: 24, cursor: 'pointer', flexShrink: 0 }}>
                                            <input type="checkbox" checked={!!payForm[item.key]} onChange={e => setPayForm(f => ({ ...f, [item.key]: e.target.checked }))} style={{ display: 'none' }} />
                                            <span style={{ position: 'absolute', inset: 0, borderRadius: 12, background: payForm[item.key] ? 'var(--primary)' : 'var(--border-color)', transition: 'background 0.2s' }}>
                                                <span style={{ position: 'absolute', top: 3, left: payForm[item.key] ? 21 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                                            </span>
                                        </label>
                                    </div>
                                ))}
                            </div>
                            <div className="ts-form-group" style={{ marginTop: 14 }}>
                                <label>管理员收信邮箱</label>
                                <input value={payForm.notifyEmail || ''} onChange={e => setPayForm(f => ({ ...f, notifyEmail: e.target.value }))} placeholder="接收通知的邮箱（默认为登录邮箱）" />
                                <span className="ts-hint">留空则使用登录邮箱接收通知</span>
                            </div>
                        </div>

                        <button type="button" className="ts-btn-primary" onClick={handlePaySave}>
                            保存邮件设置
                        </button>

                        {/* 测试通知 */}
                        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 18, marginTop: 18 }}>
                            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>测试通知</div>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 12 }}>选择一种通知类型，发送模拟通知到管理员邮箱</p>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                {[
                                    { key: 'order_paid', label: '💰 订单支付' },
                                    { key: 'pending_ship', label: '📦 待发货' },
                                    { key: 'stock_alert', label: '⚠️ 库存预警' },
                                    { key: 'new_ticket', label: '📮 新工单' },
                                    { key: 'order_cancel', label: '🚫 订单取消' },
                                ].map(t => (
                                    <button key={t.key} type="button" onClick={async () => {
                                        setPayMsg(null)
                                        try {
                                            const r = await fetch(`${API}/tenant/test-notify`, {
                                                method: 'POST',
                                                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ type: t.key })
                                            })
                                            const d = await r.json()
                                            setPayMsg(r.ok ? { type: 'success', text: `测试通知已发送：${t.label}` } : { type: 'error', text: d.error || '发送失败' })
                                        } catch { setPayMsg({ type: 'error', text: '网络错误' }) }
                                    }} style={{
                                        padding: '7px 14px', border: '1px solid var(--border-color)',
                                        borderRadius: 'var(--radius-sm)', background: 'var(--bg-tertiary)',
                                        color: 'var(--text-primary)', fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'inherit'
                                    }}>
                                        {t.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 套餐信息 */}
            {activeTab === 'plan' && (
                <div className="ts-section">
                    <PlanTab shop={shop} mToken={mToken} displaySlug={displaySlug} />
                </div>
            )}
        </div>
    )
}

// 管理员 Tab 组件
function AdminTab({ token, currentUserEmail }) {
    const [admins, setAdmins] = useState([])
    const [loading, setLoading] = useState(true)
    const [showCreate, setShowCreate] = useState(false)
    const [form, setForm] = useState({ email: '', username: '', password: '' })
    const [submitting, setSubmitting] = useState(false)
    const [msg, setMsg] = useState(null)
    const [permGroups, setPermGroups] = useState([])
    const [permDefaults, setPermDefaults] = useState({})
    const [editingAdmin, setEditingAdmin] = useState(null) // { id, username, permissions }
    const [createPermissions, setCreatePermissions] = useState({})

    useEffect(() => { if (msg) { const t = setTimeout(() => setMsg(null), 3000); return () => clearTimeout(t) } }, [msg])

    const fetchAdmins = async () => {
        try {
            const r = await fetch('/api/admin/admins', { headers: { Authorization: `Bearer ${token}` } })
            const d = await r.json()
            setAdmins(d.admins || [])
        } catch {}
        setLoading(false)
    }

    const fetchPermissionGroups = async () => {
        try {
            const r = await fetch('/api/admin/admins/permissions/groups', { headers: { Authorization: `Bearer ${token}` } })
            const d = await r.json()
            setPermGroups(d.groups || [])
            setPermDefaults(d.defaults || {})
            setCreatePermissions(d.defaults || {})
        } catch {}
    }

    useEffect(() => { if (token) { fetchAdmins(); fetchPermissionGroups() } }, [token])

    const handleCreate = async (e) => {
        e.preventDefault()
        if (!form.email.trim() || !form.password.trim()) {
            setMsg({ type: 'error', text: '邮箱和密码必填' }); return
        }
        if (form.password.length < 6) { setMsg({ type: 'error', text: '密码至少 6 位' }); return }
        setSubmitting(true)
        try {
            const r = await fetch('/api/admin/admins', {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...form, permissions: createPermissions })
            })
            const d = await r.json()
            if (r.ok) {
                setMsg({ type: 'success', text: d.message || '子管理员创建成功' })
                setForm({ email: '', username: '', password: '' })
                setCreatePermissions(permDefaults)
                setShowCreate(false)
                fetchAdmins()
            } else {
                setMsg({ type: 'error', text: d.error || '创建失败' })
            }
        } catch { setMsg({ type: 'error', text: '网络错误' }) }
        setSubmitting(false)
    }

    const handleSavePermissions = async () => {
        if (!editingAdmin) return
        try {
            const r = await fetch(`/api/admin/admins/${editingAdmin.id}`, {
                method: 'PUT',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ permissions: editingAdmin.permissions })
            })
            const d = await r.json()
            if (r.ok) {
                setMsg({ type: 'success', text: '权限已更新' })
                setEditingAdmin(null)
                fetchAdmins()
            } else {
                setMsg({ type: 'error', text: d.error || '更新失败' })
            }
        } catch { setMsg({ type: 'error', text: '网络错误' }) }
    }

    const handleRemove = async (id, email) => {
        if (!confirm(`确定要移除 ${email} 的管理员权限吗？\n（其账号会保留但降级为普通用户）`)) return
        try {
            const r = await fetch(`/api/admin/admins/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            })
            const d = await r.json()
            if (r.ok) {
                setMsg({ type: 'success', text: '已移除' })
                fetchAdmins()
            } else {
                setMsg({ type: 'error', text: d.error || '操作失败' })
            }
        } catch { setMsg({ type: 'error', text: '网络错误' }) }
    }

    // 权限分组渲染（用于创建表单 + 编辑弹窗）
    const renderPermissionGroups = (perms, onChange) => (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {permGroups.map(g => (
                <div key={g.key} style={{ padding: 14, border: '1px solid var(--border-color)', borderRadius: 10, background: 'var(--bg-card)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <div style={{ fontSize: '0.84rem', fontWeight: 600 }}>{g.label}</div>
                        <button
                            type="button"
                            onClick={() => {
                                const allOn = g.items.every(i => perms[i.key])
                                const next = { ...perms }
                                g.items.forEach(i => { next[i.key] = !allOn })
                                onChange(next)
                            }}
                            style={{ background: 'none', border: 'none', color: 'var(--primary, #ef4444)', fontSize: '0.74rem', cursor: 'pointer', padding: 0 }}
                        >
                            {g.items.every(i => perms[i.key]) ? '取消全选' : '全选'}
                        </button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {g.items.map(item => (
                            <label key={item.key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={!!perms[item.key]}
                                    onChange={e => onChange({ ...perms, [item.key]: e.target.checked })}
                                />
                                <span>{item.label}</span>
                            </label>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    )

    return (
        <div className="ts-section">
            {msg && <div className={`ts-msg ${msg.type}`}>{msg.text}</div>}

            <div className="ts-section-desc">
                <h3>管理员设置</h3>
                <p>邀请员工协助管理商城，子管理员拥有除「套餐与商城设置」外的全部权限</p>
            </div>

            {/* 当前所有者 */}
            <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>商城所有者</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--gradient-primary, linear-gradient(135deg, #ef4444, #f97316))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700 }}>
                        {(currentUserEmail || '?')[0].toUpperCase()}
                    </div>
                    <div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{currentUserEmail}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>所有者 · TENANT_ADMIN · 全部权限</div>
                    </div>
                </div>
            </div>

            {/* 子管理员列表 */}
            <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                            子管理员
                            <span style={{ fontSize: '0.78rem', fontWeight: 'normal', color: 'var(--text-muted)', marginLeft: 8 }}>共 {admins.length} 人</span>
                        </div>
                    </div>
                    {!showCreate && (
                        <button type="button" onClick={() => setShowCreate(true)} className="ts-btn-primary" style={{ padding: '7px 14px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ fontSize: '1.1em', lineHeight: 1 }}>+</span> 添加子管理员
                        </button>
                    )}
                </div>

                {showCreate && (
                    <form onSubmit={handleCreate} style={{
                        marginBottom: 16,
                        padding: 20,
                        background: 'linear-gradient(135deg, rgba(239,68,68,0.04), rgba(249,115,22,0.04))',
                        border: '1px solid var(--border-color)',
                        borderRadius: 12,
                        display: 'flex', flexDirection: 'column', gap: 14
                    }}>
                        <div style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span>👤</span> 添加新子管理员
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: 6 }}>邮箱 <span style={{ color: '#ef4444' }}>*</span></label>
                                <input
                                    type="email"
                                    placeholder="staff@example.com"
                                    value={form.email}
                                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                                    required
                                    style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border-color)', borderRadius: 8, fontSize: '0.88rem', background: 'var(--bg-card)' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: 6 }}>姓名 <span style={{ color: 'var(--text-muted)', fontWeight: 'normal' }}>选填</span></label>
                                <input
                                    type="text"
                                    placeholder="员工姓名"
                                    value={form.username}
                                    onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                                    style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border-color)', borderRadius: 8, fontSize: '0.88rem', background: 'var(--bg-card)' }}
                                />
                            </div>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: 6 }}>初始密码 <span style={{ color: '#ef4444' }}>*</span></label>
                            <input
                                type="password"
                                placeholder="至少 6 位"
                                value={form.password}
                                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                                required
                                minLength={6}
                                style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border-color)', borderRadius: 8, fontSize: '0.88rem', background: 'var(--bg-card)' }}
                            />
                            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 6 }}>员工可在登录后自行修改密码</div>
                        </div>

                        {/* 权限配置 */}
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>权限配置</label>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button type="button" onClick={() => {
                                        const all = {}; permGroups.forEach(g => g.items.forEach(i => { all[i.key] = true }))
                                        setCreatePermissions(all)
                                    }} style={{ background: 'none', border: '1px solid var(--border-color)', borderRadius: 6, padding: '3px 10px', fontSize: '0.74rem', cursor: 'pointer' }}>全开放</button>
                                    <button type="button" onClick={() => setCreatePermissions(permDefaults)} style={{ background: 'none', border: '1px solid var(--border-color)', borderRadius: 6, padding: '3px 10px', fontSize: '0.74rem', cursor: 'pointer' }}>默认</button>
                                    <button type="button" onClick={() => setCreatePermissions({})} style={{ background: 'none', border: '1px solid var(--border-color)', borderRadius: 6, padding: '3px 10px', fontSize: '0.74rem', cursor: 'pointer' }}>全关闭</button>
                                </div>
                            </div>
                            {renderPermissionGroups(createPermissions, setCreatePermissions)}
                        </div>
                        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                            <button
                                type="button"
                                onClick={() => { setShowCreate(false); setForm({ email: '', username: '', password: '' }) }}
                                style={{ padding: '8px 18px', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-secondary)', borderRadius: 8, fontSize: '0.85rem', cursor: 'pointer' }}
                            >
                                取消
                            </button>
                            <button type="submit" className="ts-btn-primary" disabled={submitting} style={{ padding: '8px 18px' }}>
                                {submitting ? '创建中...' : '创建子管理员'}
                            </button>
                        </div>
                    </form>
                )}

                {loading ? (
                    <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>加载中...</div>
                ) : admins.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '32px 20px', background: 'var(--bg-tertiary)', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)' }}>
                        <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>👥</div>
                        <div style={{ fontSize: '0.85rem' }}>暂无子管理员</div>
                        <div style={{ fontSize: '0.75rem', marginTop: 4 }}>点击右上角「+ 添加子管理员」邀请员工协助管理</div>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {admins.map(a => (
                            <div key={a.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontWeight: 600 }}>
                                        {(a.email || '?')[0].toUpperCase()}
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.88rem', fontWeight: 500 }}>{a.username || a.email}</div>
                                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{a.email}</div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button type="button" onClick={() => setEditingAdmin({ id: a.id, username: a.username, permissions: { ...a.permissions } })} style={{ background: 'none', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.78rem', cursor: 'pointer', padding: '4px 12px', borderRadius: 6 }}>
                                        编辑权限
                                    </button>
                                    <button type="button" onClick={() => handleRemove(a.id, a.email)} style={{ background: 'none', border: 'none', color: 'var(--error, #ef4444)', fontSize: '0.82rem', cursor: 'pointer', padding: '4px 10px' }}>
                                        移除权限
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* 权限说明 */}
            <div style={{ padding: '14px 16px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.7 }}>
                <div style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>权限说明</div>
                <div>• 商城所有者拥有全部权限（含商城设置、套餐管理）</div>
                <div>• 子管理员可管理：商品、订单、卡密、工单、用户</div>
                <div>• 子管理员只能访问当前商城，无法跨商城操作</div>
                <div>• 移除权限后账号会降级为普通用户，仍可登录购物</div>
            </div>

            {/* 编辑权限弹窗 */}
            {editingAdmin && (
                <div onClick={() => setEditingAdmin(null)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.45)', zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                    <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-card)', borderRadius: 14, padding: 24, maxWidth: 920, width: '100%', maxHeight: '85vh', overflow: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <h3 style={{ margin: 0, fontSize: '1rem' }}>编辑子管理员权限</h3>
                            <button onClick={() => setEditingAdmin(null)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--text-muted)' }}>×</button>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 12 }}>
                            <button type="button" onClick={() => {
                                const all = {}; permGroups.forEach(g => g.items.forEach(i => { all[i.key] = true }))
                                setEditingAdmin({ ...editingAdmin, permissions: all })
                            }} style={{ background: 'none', border: '1px solid var(--border-color)', borderRadius: 6, padding: '4px 12px', fontSize: '0.78rem', cursor: 'pointer' }}>全开放</button>
                            <button type="button" onClick={() => setEditingAdmin({ ...editingAdmin, permissions: { ...permDefaults } })} style={{ background: 'none', border: '1px solid var(--border-color)', borderRadius: 6, padding: '4px 12px', fontSize: '0.78rem', cursor: 'pointer' }}>默认</button>
                            <button type="button" onClick={() => setEditingAdmin({ ...editingAdmin, permissions: {} })} style={{ background: 'none', border: '1px solid var(--border-color)', borderRadius: 6, padding: '4px 12px', fontSize: '0.78rem', cursor: 'pointer' }}>全关闭</button>
                        </div>

                        {renderPermissionGroups(
                            editingAdmin.permissions,
                            (next) => setEditingAdmin({ ...editingAdmin, permissions: next })
                        )}

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                            <button type="button" onClick={() => setEditingAdmin(null)} style={{ padding: '8px 18px', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-secondary)', borderRadius: 8, cursor: 'pointer' }}>取消</button>
                            <button type="button" onClick={handleSavePermissions} className="ts-btn-primary" style={{ padding: '8px 18px' }}>保存权限</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

// 套餐信息 Tab 组件
function PlanTab({ shop, mToken, displaySlug }) {
    const [showPurchase, setShowPurchase] = useState(false)

    const planName = shop?.plan === 'FREE' ? '免费试用' : shop?.plan === 'BASIC' ? '基础版' : shop?.plan === 'STANDARD' ? '标准版' : shop?.plan === 'PRO' ? '专业版' : shop?.plan || '—'
    const isExpired = shop?.status === 'EXPIRED'
    const expiryDate = shop?.planExpiresAt ? new Date(shop.planExpiresAt).toLocaleDateString() : (shop?.trialEndsAt ? new Date(shop.trialEndsAt).toLocaleDateString() : null)

    return (
        <div>
            {/* 当前套餐卡片 */}
            <div style={{
                background: 'var(--gradient-card)', border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)', padding: '24px', marginBottom: 24
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: '1.5rem' }}>💎</span>
                        <div>
                            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{planName}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
                                {isExpired ? '已到期' : expiryDate ? `有效期至 ${expiryDate}` : '永久有效'}
                            </div>
                        </div>
                    </div>
                    <div style={{
                        padding: '4px 12px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600,
                        background: isExpired ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.12)',
                        color: isExpired ? 'var(--error)' : 'var(--success)'
                    }}>
                        {isExpired ? '已到期' : '正常'}
                    </div>
                </div>

                {/* 商城地址 */}
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '10px 14px', background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)',
                    fontSize: '0.84rem'
                }}>
                    <span style={{ color: 'var(--text-muted)' }}>商城地址：</span>
                    <a href={`/v/${displaySlug}`} target="_blank" rel="noreferrer" style={{ color: 'var(--primary-light)', textDecoration: 'none' }}>
                        {window.location.origin}/v/{displaySlug}
                    </a>
                </div>
            </div>

            {/* 操作按钮 */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 28, flexWrap: 'wrap' }}>
                <button
                    onClick={() => setShowPurchase(!showPurchase)}
                    className="ts-btn-primary"
                    style={{ padding: '12px 28px', fontSize: '0.9rem' }}
                >
                    {showPurchase ? '收起' : (shop?.plan === 'FREE' || isExpired ? '🚀 升级套餐' : '续费 / 升级')}
                </button>
                {!showPurchase && shop?.plan && shop.plan !== 'FREE' && !isExpired && (
                    <span style={{ alignSelf: 'center', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        已是付费套餐，可在此续费或切换到其他套餐
                    </span>
                )}
            </div>

            {/* 购买面板 — 从下方滑出 */}
            <div style={{
                maxHeight: showPurchase ? '2000px' : '0',
                overflow: 'hidden',
                transition: 'max-height 0.35s ease-in-out',
                marginBottom: showPurchase ? 28 : 0
            }}>
                <div style={{
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    padding: '24px',
                    background: 'var(--bg-secondary)'
                }}>
                    <PlanPurchase />
                </div>
            </div>
        </div>
    )
}

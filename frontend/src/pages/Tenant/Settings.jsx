import { useState, useEffect } from 'react'

const API = import.meta.env.VITE_API_URL || '/api'

export default function TenantSettings({ tenant, setTenant, token }) {
    const [settings, setSettings] = useState(null)
    const [form, setForm] = useState({})
    const [saving, setSaving] = useState(false)
    const [msg, setMsg] = useState(null)

    useEffect(() => {
        if (!tenant) return
        fetch(`${API}/tenant/settings`, { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.json()).then(d => {
                setSettings(d.settings)
                setForm(d.settings || {})
            })
    }, [tenant])

    const save = async () => {
        setSaving(true); setMsg(null)
        const r = await fetch(`${API}/tenant/settings`, {
            method: 'PUT',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(form)
        })
        const d = await r.json()
        setSaving(false)
        if (d.settings) { setSettings(d.settings); setMsg({ type: 'success', text: '设置已保存' }) }
        else setMsg({ type: 'error', text: d.error || '保存失败' })
    }

    const updateShop = async (field, value) => {
        const r = await fetch(`${API}/tenant/setup`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...tenant, [field]: value })
        })
        const d = await r.json()
        if (d.tenant) setTenant(d.tenant)
    }

    if (!tenant) return <div className="tenant-empty"><div className="tenant-empty-title">商城未创建</div></div>

    const Toggle = ({ label, field, hint }) => (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid var(--tenant-border)' }}>
            <div>
                <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>{label}</div>
                {hint && <div className="tenant-hint">{hint}</div>}
            </div>
            <div
                onClick={() => setForm(f => ({ ...f, [field]: !f[field] }))}
                style={{
                    width: 44, height: 24, borderRadius: 12, cursor: 'pointer',
                    background: form[field] ? 'var(--tenant-primary)' : 'var(--tenant-border)',
                    position: 'relative', transition: 'background 0.2s', flexShrink: 0
                }}
            >
                <div style={{
                    position: 'absolute', top: 3, width: 18, height: 18, borderRadius: '50%',
                    background: '#fff', transition: 'left 0.2s',
                    left: form[field] ? 23 : 3
                }} />
            </div>
        </div>
    )

    return (
        <div>
            <div className="tenant-page-title">🔧 店铺设置</div>

            {msg && <div className={`tenant-alert tenant-alert-${msg.type}`}>{msg.text}</div>}

            {/* 皮肤设置 */}
            <div className="tenant-card">
                <div className="tenant-card-title">🎨 店面主题</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                    {[
                        { key: 'zen', name: 'Zen', desc: '简约深色' },
                        { key: 'fresh', name: 'Fresh', desc: '清新浅色' },
                        { key: 'classic', name: 'Classic', desc: '经典风格' },
                    ].map(skin => (
                        <div key={skin.key}
                            onClick={() => updateShop('shopSkin', skin.key)}
                            style={{
                                padding: 16, borderRadius: 12, cursor: 'pointer',
                                border: `2px solid ${tenant.shopSkin === skin.key ? 'var(--tenant-primary)' : 'var(--tenant-border)'}`,
                                background: tenant.shopSkin === skin.key ? 'var(--tenant-primary-light)' : 'var(--tenant-surface2)',
                                transition: 'all 0.15s'
                            }}>
                            <div style={{ fontWeight: 700, marginBottom: 4 }}>{skin.name}</div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--tenant-muted)' }}>{skin.desc}</div>
                            {tenant.shopSkin === skin.key && <div style={{ fontSize: '0.72rem', color: 'var(--tenant-primary)', marginTop: 6 }}>✓ 当前主题</div>}
                        </div>
                    ))}
                </div>
            </div>

            {/* 通知横幅 */}
            <div className="tenant-card">
                <div className="tenant-card-title">📢 通知横幅</div>
                <Toggle label="启用通知横幅" field="notificationEnabled" hint="在商城顶部显示公告横幅" />
                {form.notificationEnabled && (
                    <>
                        <div className="tenant-form-group" style={{ marginTop: 16 }}>
                            <label className="tenant-label">通知内容</label>
                            <input className="tenant-input" value={form.notificationText || ''} onChange={e => setForm(f => ({ ...f, notificationText: e.target.value }))} placeholder="🔥 限时优惠进行中，满100减20！" />
                        </div>
                        <div className="tenant-form-group">
                            <label className="tenant-label">链接（可选）</label>
                            <input className="tenant-input" value={form.notificationLink || ''} onChange={e => setForm(f => ({ ...f, notificationLink: e.target.value }))} placeholder="https://..." />
                        </div>
                    </>
                )}
            </div>

            {/* 支付方式 */}
            <div className="tenant-card">
                <div className="tenant-card-title">💳 支付方式</div>
                <div className="tenant-alert tenant-alert-info" style={{ marginBottom: 16 }}>
                    ℹ️ 请配置您自己的支付商户账号，收款直接到您的账户。
                </div>
                <Toggle label="支付宝收款" field="alipayEnabled" hint="需要填写支付宝商户 App ID 和密钥" />
                <Toggle label="微信支付收款" field="wechatEnabled" hint="需要填写微信支付商户号和密钥" />
                <Toggle label="USDT-TRC20 收款" field="usdtEnabled" hint="填写您的 TRC20 收款地址" />
                <Toggle label="USDT-BEP20 收款" field="bscUsdtEnabled" hint="填写您的 BEP20 收款地址" />
                {(form.alipayEnabled || form.wechatEnabled || form.usdtEnabled || form.bscUsdtEnabled) && (
                    <div className="tenant-alert tenant-alert-warning" style={{ marginTop: 16 }}>
                        ⚠️ 支付密钥配置请联系平台客服进行安全配置，不建议直接在此输入。
                    </div>
                )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button className="tenant-btn tenant-btn-primary" onClick={save} disabled={saving}>
                    {saving ? '保存中…' : '💾 保存设置'}
                </button>
            </div>
        </div>
    )
}

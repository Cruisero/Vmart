import { useState } from 'react'

const API = import.meta.env.VITE_API_URL || '/api'

const STEPS = ['基本信息', '域名绑定', '提交审核']

export default function TenantSetup({ tenant, setTenant, token }) {
    const [step, setStep] = useState(0)
    const [saving, setSaving] = useState(false)
    const [msg, setMsg] = useState(null)

    // Step 1
    const [form, setForm] = useState({
        shopName: tenant?.shopName || '',
        shopSlug: tenant?.shopSlug || '',
        shopSkin: tenant?.shopSkin || 'zen',
        contactEmail: tenant?.contactEmail || '',
        contactInfo: tenant?.contactInfo || '',
        shopNotice: tenant?.shopNotice || '',
    })

    // Step 2
    const [domain, setDomain] = useState(tenant?.domains?.[0]?.domain || '')
    const [dnsGuide, setDnsGuide] = useState(null)
    const [dnsVerified, setDnsVerified] = useState(tenant?.domains?.[0]?.dnsVerified || false)
    const [verifying, setVerifying] = useState(false)

    const post = async (url, body) => {
        const r = await fetch(`${API}${url}`, {
            method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        })
        return r.json()
    }
    const put = async (url, body) => {
        const r = await fetch(`${API}${url}`, {
            method: 'PUT', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        })
        return r.json()
    }

    const saveStep1 = async () => {
        if (!form.shopName.trim() || !form.shopSlug.trim()) return setMsg({ type: 'error', text: '店铺名称和路径不能为空' })
        setSaving(true); setMsg(null)
        const d = await post('/tenant/setup', form)
        setSaving(false)
        if (d.tenant) { setTenant(d.tenant); setStep(1); setMsg({ type: 'success', text: '基本信息已保存' }) }
        else setMsg({ type: 'error', text: d.error || '保存失败' })
    }

    const addDomain = async () => {
        if (!domain.trim()) return
        setSaving(true); setMsg(null)
        const d = await post('/tenant/domain', { domain: domain.trim().toLowerCase() })
        setSaving(false)
        if (d.dnsGuide) { setDnsGuide(d.dnsGuide); setMsg({ type: 'info', text: '域名已添加，请按下方说明添加 DNS 记录' }) }
        else setMsg({ type: 'error', text: d.error || '添加失败' })
    }

    const verifyDns = async () => {
        setVerifying(true); setMsg(null)
        const d = await post('/tenant/domain/verify', { domain: domain.trim() })
        setVerifying(false)
        if (d.verified) { setDnsVerified(true); setMsg({ type: 'success', text: 'DNS 验证成功！可以继续提交审核' }) }
        else setMsg({ type: 'warning', text: d.message || 'DNS 尚未生效，请稍后再试' })
    }

    const submitReview = async () => {
        setSaving(true); setMsg(null)
        const d = await post('/tenant/submit', {})
        setSaving(false)
        if (d.message) { setMsg({ type: 'success', text: d.message }); setStep(2) }
        else setMsg({ type: 'error', text: d.error || '提交失败' })
    }

    const alertCls = { error: 'tenant-alert-error', success: 'tenant-alert-success', info: 'tenant-alert-info', warning: 'tenant-alert-warning' }

    // 已是审核中或已激活
    if (tenant?.status === 'REVIEWING' || tenant?.status === 'ACTIVE') {
        return (
            <div>
                <div className="tenant-page-title">⚙️ 开通配置</div>
                <div className={`tenant-alert ${tenant.status === 'ACTIVE' ? 'tenant-alert-success' : 'tenant-alert-info'}`}>
                    {tenant.status === 'ACTIVE' ? '✅ 您的商城已审核通过，正常运营中！' : '⏳ 审核申请已提交，请耐心等待 1-3 个工作日。'}
                </div>
            </div>
        )
    }

    return (
        <div>
            <div className="tenant-page-title">⚙️ 开通配置</div>

            {/* 步骤条 */}
            <div className="tenant-steps">
                {STEPS.map((label, i) => (
                    <div key={i} className={`tenant-step ${i < step ? 'completed' : i === step ? 'active' : ''}`}>
                        <div className="tenant-step-dot">{i < step ? '✓' : i + 1}</div>
                        <div className="tenant-step-label">{label}</div>
                        {i < STEPS.length - 1 && <div className="tenant-step-line" />}
                    </div>
                ))}
            </div>

            {msg && <div className={`tenant-alert ${alertCls[msg.type]}`}>{msg.text}</div>}

            {/* Step 1：基本信息 */}
            {step === 0 && (
                <div className="tenant-card">
                    <div className="tenant-card-title">📝 填写店铺基本信息</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
                        <div className="tenant-form-group">
                            <label className="tenant-label">店铺名称 *</label>
                            <input className="tenant-input" value={form.shopName} onChange={e => setForm(f => ({ ...f, shopName: e.target.value }))} placeholder="我的数字商城" />
                        </div>
                        <div className="tenant-form-group">
                            <label className="tenant-label">访问路径 * <span style={{ color: 'var(--tenant-muted)', fontWeight: 400 }}>（字母/数字/连字符）</span></label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ color: 'var(--tenant-muted)', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>/t/</span>
                                <input className="tenant-input" value={form.shopSlug} onChange={e => setForm(f => ({ ...f, shopSlug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))} placeholder="my-shop" />
                            </div>
                        </div>
                        <div className="tenant-form-group">
                            <label className="tenant-label">皮肤主题</label>
                            <select className="tenant-input" value={form.shopSkin} onChange={e => setForm(f => ({ ...f, shopSkin: e.target.value }))}>
                                <option value="zen">Zen（简约深色）</option>
                                <option value="fresh">Fresh（清新浅色）</option>
                                <option value="classic">Classic（经典风格）</option>
                            </select>
                        </div>
                        <div className="tenant-form-group">
                            <label className="tenant-label">联系邮箱</label>
                            <input className="tenant-input" type="email" value={form.contactEmail} onChange={e => setForm(f => ({ ...f, contactEmail: e.target.value }))} placeholder="contact@myshop.com" />
                        </div>
                    </div>
                    <div className="tenant-form-group">
                        <label className="tenant-label">店铺公告</label>
                        <textarea className="tenant-input tenant-textarea" value={form.shopNotice} onChange={e => setForm(f => ({ ...f, shopNotice: e.target.value }))} placeholder="欢迎光临，24小时自动发货…" />
                    </div>
                    <button className="tenant-btn tenant-btn-primary" onClick={saveStep1} disabled={saving}>
                        {saving ? '保存中…' : '保存并继续 →'}
                    </button>
                </div>
            )}

            {/* Step 2：域名绑定 */}
            {step === 1 && (
                <div className="tenant-card">
                    <div className="tenant-card-title">🌐 绑定自有域名</div>
                    <div className="tenant-form-group">
                        <label className="tenant-label">您的域名</label>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <input className="tenant-input" value={domain} onChange={e => setDomain(e.target.value.toLowerCase())} placeholder="myshop.com" />
                            <button className="tenant-btn tenant-btn-secondary" onClick={addDomain} disabled={saving || !domain} style={{ whiteSpace: 'nowrap' }}>
                                {saving ? '…' : '添加'}
                            </button>
                        </div>
                    </div>

                    {dnsGuide && (
                        <div style={{ borderRadius: 12, border: '1px solid var(--tenant-border)', overflow: 'hidden', marginBottom: 16 }}>
                            <div style={{ padding: '10px 16px', background: 'var(--tenant-surface2)', fontSize: '0.78rem', fontWeight: 700, color: 'var(--tenant-muted)' }}>
                                📋 DNS 配置说明
                            </div>
                            <div style={{ padding: 16 }}>
                                <p style={{ fontSize: '0.84rem', color: 'var(--tenant-muted)', marginBottom: 12 }}>请在您的 DNS 服务商（如 Cloudflare、阿里云）添加以下 A 记录：</p>
                                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 1fr', gap: '8px 16px', fontSize: '0.82rem' }}>
                                    {[['类型', 'A'], ['主机记录', '@'], ['记录值', dnsGuide.value], ['TTL', '600']].map(([k, v]) => (
                                        <>
                                            <span key={k + 'k'} style={{ color: 'var(--tenant-muted)' }}>{k}</span>
                                            <code key={k + 'v'} style={{ color: '#a5b4fc', background: 'var(--tenant-surface2)', padding: '2px 8px', borderRadius: 4 }}>{v}</code>
                                            <span key={k + 'x'} />
                                        </>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: 12 }}>
                        <button className="tenant-btn tenant-btn-secondary" onClick={() => setStep(0)}>← 上一步</button>
                        {domain && (
                            <button className="tenant-btn tenant-btn-secondary" onClick={verifyDns} disabled={verifying}>
                                {verifying ? '检测中…' : '🔍 验证 DNS'}
                            </button>
                        )}
                        {dnsVerified && (
                            <button className="tenant-btn tenant-btn-primary" onClick={() => setStep(2)}>继续 →</button>
                        )}
                    </div>
                </div>
            )}

            {/* Step 3：提交审核 */}
            {step === 2 && (
                <div className="tenant-card">
                    <div className="tenant-card-title">📬 确认提交审核</div>
                    <div className="tenant-alert tenant-alert-info" style={{ marginBottom: 20 }}>
                        ℹ️ 提交后我们将在 1-3 个工作日内完成审核，审核通过后您将收到邮件通知，商城即刻上线。
                    </div>
                    <div style={{ marginBottom: 20 }}>
                        {[['店铺名称', tenant?.shopName], ['访问域名', domain || '未绑定'], ['联系邮箱', form.contactEmail || '未填写']].map(([k, v]) => (
                            <div key={k} style={{ display: 'flex', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--tenant-border)', fontSize: '0.86rem' }}>
                                <span style={{ color: 'var(--tenant-muted)', width: 80, flexShrink: 0 }}>{k}</span>
                                <span>{v}</span>
                            </div>
                        ))}
                    </div>
                    <div style={{ display: 'flex', gap: 12 }}>
                        <button className="tenant-btn tenant-btn-secondary" onClick={() => setStep(1)}>← 上一步</button>
                        <button className="tenant-btn tenant-btn-primary" onClick={submitReview} disabled={saving}>
                            {saving ? '提交中…' : '✅ 提交审核申请'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

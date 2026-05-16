import { useState } from 'react'
import { useAuthStore } from '../../store/authStore'

const API = import.meta.env.VITE_API_URL || '/api'

const STEPS = ['套餐与基础信息', '独立域名配置', '提交建站审核']

export default function TenantSetup({ tenant, setTenant, token }) {
    const { user } = useAuthStore()
    const [step, setStep] = useState(0)
    const [saving, setSaving] = useState(false)
    const [msg, setMsg] = useState(null)

    // Step 1
    const [form, setForm] = useState({
        shopName: tenant?.shopName || '',
        shopSlug: tenant?.shopSlug || `shop-${Math.random().toString(36).substring(2, 8)}`,
        shopSkin: tenant?.shopSkin || 'zen',
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
                    {tenant.status === 'ACTIVE' ? '✅ 您的专属商城已审核通过，正式上线！' : '⏳ 审核申请已提交，系统正在为您部署专属商城，请耐心等待 1-3 个工作日。'}
                </div>

                {tenant.status === 'ACTIVE' && (
                    <div className="tenant-card" style={{ marginTop: 24, background: 'linear-gradient(145deg, rgba(99,102,241,0.05) 0%, rgba(139,92,246,0.05) 100%)', border: '1px solid rgba(99,102,241,0.2)' }}>
                        <div className="tenant-card-title" style={{ color: '#a5b4fc', fontSize: '1.2rem', marginBottom: 24 }}>🎉 您的 Vmart 商城账号信息</div>
                        
                        <div style={{ display: 'grid', gap: 16 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: 12 }}>
                                <span style={{ color: 'var(--tenant-muted)' }}>🌐 商城管理后台地址</span>
                                <a href={`https://${tenant?.domains?.[0]?.domain || form.shopSlug + '.vmart.cc'}/admin`} target="_blank" rel="noreferrer" style={{ color: '#818cf8', fontWeight: 600, textDecoration: 'none' }}>
                                    https://{tenant?.domains?.[0]?.domain || form.shopSlug + '.vmart.cc'}/admin ↗
                                </a>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: 12 }}>
                                <span style={{ color: 'var(--tenant-muted)' }}>👤 Vmart 超级管理员账号</span>
                                <span style={{ color: '#f0f0f8', fontWeight: 600 }}>{user?.email}</span>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: 12 }}>
                                <span style={{ color: 'var(--tenant-muted)' }}>🔑 登录密码</span>
                                <span style={{ color: '#f0f0f8', fontWeight: 600 }}>与您当前的 SaaS 账号密码相同</span>
                            </div>
                        </div>

                        <div style={{ marginTop: 24, fontSize: '0.85rem', color: 'var(--tenant-muted)', lineHeight: 1.6 }}>
                            💡 提示：您可以使用上述账号密码登录您的商城后台。登录后，您可以在“系统设置”中修改密码，或在“用户管理”中创建其他员工账号。
                        </div>
                    </div>
                )}
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

            {/* Step 1：套餐与基础信息 */}
            {step === 0 && (
                <div className="tenant-card">
                    <div className="tenant-card-title">📝 确认套餐与店铺名称</div>
                    
                    <div style={{ padding: '16px', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 12, marginBottom: 24 }}>
                        <div style={{ fontSize: '0.85rem', color: '#a5b4fc', marginBottom: 8 }}>当前生效套餐</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f0f0f8' }}>🚀 专业版 Pro Plan</div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--tenant-muted)' }}>包含完整商城系统与独立域名权限</div>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
                        <div className="tenant-form-group">
                            <label className="tenant-label">店铺名称 *</label>
                            <input className="tenant-input" value={form.shopName} onChange={e => setForm(f => ({ ...f, shopName: e.target.value }))} placeholder="例如：我的数字商城" />
                        </div>
                        <div className="tenant-form-group">
                            <label className="tenant-label">初始皮肤主题</label>
                            <select className="tenant-input" value={form.shopSkin} onChange={e => setForm(f => ({ ...f, shopSkin: e.target.value }))}>
                                <option value="zen">Zen（简约深色）</option>
                                <option value="fresh">Fresh（清新浅色）</option>
                                <option value="classic">Classic（经典风格）</option>
                            </select>
                        </div>
                    </div>
                    
                    <button className="tenant-btn tenant-btn-primary" onClick={saveStep1} disabled={saving} style={{ marginTop: 12 }}>
                        {saving ? '保存中…' : '保存并下一步 →'}
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
                    <div className="tenant-card-title">📬 确认并提交建站审核</div>
                    <div className="tenant-alert tenant-alert-info" style={{ marginBottom: 24 }}>
                        ℹ️ 提交后我们将在 1-3 个工作日内完成部署与审核。审核通过后，您将直接获得完整 Vmart 商城系统的超级管理员账号与密码。
                    </div>
                    
                    <div style={{ background: 'var(--tenant-surface2)', borderRadius: 12, padding: 20, marginBottom: 24 }}>
                        <div style={{ color: '#f0f0f8', fontWeight: 700, marginBottom: 16 }}>即将部署的 Vmart 账号信息：</div>
                        {[['系统类型', 'Vmart 独立完整版商城'], ['店铺名称', tenant?.shopName], ['商城独立域名', domain || '未绑定（将使用系统分配域名）'], ['Vmart 登录账号', user?.email], ['Vmart 登录密码', '与 SaaS 控制台密码一致']].map(([k, v]) => (
                            <div key={k} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.9rem' }}>
                                <span style={{ color: 'var(--tenant-muted)', width: 120, flexShrink: 0 }}>{k}</span>
                                <span style={{ color: '#a5b4fc', fontWeight: 500 }}>{v}</span>
                            </div>
                        ))}
                    </div>

                    <div style={{ display: 'flex', gap: 12 }}>
                        <button className="tenant-btn tenant-btn-secondary" onClick={() => setStep(1)}>← 返回修改</button>
                        <button className="tenant-btn tenant-btn-primary" onClick={submitReview} disabled={saving}>
                            {saving ? '提交部署中…' : '✅ 确认信息并提交审核'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

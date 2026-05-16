import { useState, useEffect } from 'react'
import { useAuthStore } from '../../../store/authStore'
import './TenantSettings.css'

const API = import.meta.env.VITE_API_URL || '/api'

export default function TenantSettings() {
    const { token, user } = useAuthStore()
    const [tenant, setTenant] = useState(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [msg, setMsg] = useState(null)

    const [domain, setDomain] = useState('')
    const [dnsGuide, setDnsGuide] = useState(null)
    const [dnsVerified, setDnsVerified] = useState(false)
    const [verifying, setVerifying] = useState(false)

    useEffect(() => {
        if (!token) return
        fetch(`${API}/tenant/me`, { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.json())
            .then(d => { 
                setTenant(d.tenant)
                if (d.tenant?.domains?.[0]) {
                    setDomain(d.tenant.domains[0].domain)
                    setDnsVerified(d.tenant.domains[0].dnsVerified)
                }
                setLoading(false) 
            })
            .catch(() => setLoading(false))
    }, [token])

    const post = async (url, body) => {
        const r = await fetch(`${API}${url}`, {
            method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        })
        return r.json()
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
        if (d.verified) { setDnsVerified(true); setMsg({ type: 'success', text: 'DNS 验证成功！' }) }
        else setMsg({ type: 'warning', text: d.message || 'DNS 尚未生效，请稍后再试' })
    }

    if (loading) return <div style={{ padding: 24, color: 'var(--text-muted)' }}>加载中...</div>

    return (
        <div className="admin-page">
            <div className="admin-page-header">
                <h2>店铺设置</h2>
                <p>管理您的商城基础配置、域名与套餐状态</p>
            </div>

            {msg && <div className={`alert alert-${msg.type}`} style={{ marginBottom: 20 }}>{msg.text}</div>}

            <div style={{ display: 'grid', gap: 24 }}>
                {/* 套餐订阅区 */}
                <div className="card">
                    <div className="card-header">
                        <h3>套餐订阅</h3>
                    </div>
                    <div className="card-body">
                        <div style={{ padding: '16px', background: 'var(--bg-body)', border: '1px solid var(--border-color)', borderRadius: 12, marginBottom: 16 }}>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 8 }}>当前生效套餐</div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                    {tenant?.plan === 'FREE' ? '未激活 (免费体验)' : '🚀 专业版 Pro Plan'}
                                </div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                    {tenant?.plan === 'FREE' ? '前台商城被锁定，外部顾客无法访问下单' : '包含完整商城系统与独立域名权限'}
                                </div>
                            </div>
                        </div>
                        {tenant?.plan === 'FREE' && (
                            <button className="btn btn-primary" style={{ width: '100%' }}>升级套餐激活商城</button>
                        )}
                    </div>
                </div>

                {/* 域名配置区 */}
                <div className="card">
                    <div className="card-header">
                        <h3>独立域名配置</h3>
                    </div>
                    <div className="card-body">
                        <div style={{ marginBottom: 16 }}>
                            <label style={{ display: 'block', marginBottom: 8, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>您的独立域名</label>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <input 
                                    className="input" 
                                    value={domain} 
                                    onChange={e => setDomain(e.target.value.toLowerCase())} 
                                    placeholder="例如：myshop.com" 
                                    disabled={dnsVerified}
                                    style={{ flex: 1 }}
                                />
                                {!dnsVerified && (
                                    <button className="btn btn-secondary" onClick={addDomain} disabled={saving || !domain} style={{ whiteSpace: 'nowrap' }}>
                                        {saving ? '处理中…' : '添加域名'}
                                    </button>
                                )}
                            </div>
                        </div>

                        {dnsGuide && !dnsVerified && (
                            <div style={{ borderRadius: 12, border: '1px solid var(--border-color)', overflow: 'hidden', marginBottom: 16 }}>
                                <div style={{ padding: '10px 16px', background: 'var(--bg-body)', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                                    📋 DNS 配置说明
                                </div>
                                <div style={{ padding: 16 }}>
                                    <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: 12 }}>请在您的 DNS 服务商（如 Cloudflare、阿里云）添加以下 A 记录：</p>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 1fr', gap: '8px 16px', fontSize: '0.82rem' }}>
                                        {[['类型', 'A'], ['主机记录', '@'], ['记录值', dnsGuide.value], ['TTL', '600']].map(([k, v]) => (
                                            <div key={k} style={{ display: 'contents' }}>
                                                <span style={{ color: 'var(--text-muted)' }}>{k}</span>
                                                <code style={{ color: 'var(--primary-color)', background: 'var(--bg-body)', padding: '2px 8px', borderRadius: 4 }}>{v}</code>
                                                <span />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {domain && !dnsVerified && (
                            <button className="btn btn-primary" onClick={verifyDns} disabled={verifying}>
                                {verifying ? '检测中…' : '🔍 验证 DNS 是否生效'}
                            </button>
                        )}
                        {dnsVerified && (
                            <div style={{ padding: 16, background: 'rgba(16,185,129,0.1)', color: '#10b981', borderRadius: 8, fontSize: '0.9rem', fontWeight: 500 }}>
                                ✅ DNS 解析已成功验证，您的专属域名已生效。
                            </div>
                        )}
                    </div>
                </div>

                {/* 基础信息区 */}
                <div className="card">
                    <div className="card-header">
                        <h3>商城基础信息</h3>
                    </div>
                    <div className="card-body">
                        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '12px 0', fontSize: '0.9rem' }}>
                            <span style={{ color: 'var(--text-muted)' }}>系统分配域名</span>
                            <span style={{ color: 'var(--text-primary)' }}>{tenant?.shopSlug}.vmart.cc</span>
                            
                            <span style={{ color: 'var(--text-muted)' }}>店铺名称</span>
                            <span style={{ color: 'var(--text-primary)' }}>{tenant?.shopName}</span>

                            <span style={{ color: 'var(--text-muted)' }}>超级管理员</span>
                            <span style={{ color: 'var(--text-primary)' }}>{user?.email}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

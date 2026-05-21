import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'

const API = import.meta.env.VITE_API_URL || '/api'

async function getTenantAdminPath(token) {
    try {
        const response = await fetch('/api/tenant/me', {
            headers: { Authorization: `Bearer ${token}` }
        })
        const data = await response.json()
        return data?.tenant?.shopSlug ? `/v/${data.tenant.shopSlug}/admin` : null
    } catch {
        return null
    }
}

export default function SaasRegister() {
    const navigate = useNavigate()
    const [params] = useSearchParams()
    const plan = params.get('plan') || 'free'
    const { login } = useAuthStore()

    const [form, setForm] = useState({ username: '', email: '', password: '', confirm: '' })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [step, setStep] = useState('form') // form | success

    const submit = async (e) => {
        e.preventDefault()
        if (form.password !== form.confirm) return setError('两次密码不一致')
        if (form.password.length < 6) return setError('密码至少 6 位')
        setLoading(true); setError('')

        try {
            const r = await fetch(`${API}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...form, isSaas: true })
            })
            const d = await r.json()

            if (r.ok) {
                // 注册成功并直接登录
                login(d.user, d.token)
                const tenantPath = await getTenantAdminPath(d.token)
                if (tenantPath) {
                    navigate(tenantPath, { replace: true })
                } else if (d.user?.role === 'SUPER_ADMIN') {
                    navigate('/Man/dashboard', { replace: true })
                } else {
                    navigate('/', { replace: true })
                }
            } else if (d.message && d.message.includes('验证')) {
                // 需要邮箱验证
                setStep('success')
            } else {
                setError(d.error || '注册失败，请重试')
            }
        } catch {
            setError('网络错误，请稍后重试')
        } finally {
            setLoading(false)
        }
    }

    const planLabels = { free: '免费体验', pro: '专业版', business: '商业版' }

    if (step === 'success') {
        return (
            <div style={styles.page}>
                <div style={styles.bg} />
                <div style={styles.card}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '3.5rem', marginBottom: 16 }}>📧</div>
                        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f0f0f8', marginBottom: 12 }}>
                            验证邮件已发送
                        </h2>
                        <p style={{ color: 'rgba(240,240,248,0.5)', fontSize: '0.9rem', lineHeight: 1.7, marginBottom: 28 }}>
                            我们已向 <strong style={{ color: '#a5b4fc' }}>{form.email}</strong> 发送了验证链接。<br />
                            点击邮件中的链接完成验证后即可登录。
                        </p>
                        <Link to="/saas/login" style={{ ...styles.submitBtn, display: 'block', textAlign: 'center', textDecoration: 'none', padding: '13px' }}>
                            前往登录 →
                        </Link>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div style={styles.page}>
            <div style={styles.bg} />

            {/* Logo */}
            <div style={styles.logo}>
                <Link to="/saas" style={{ textDecoration: 'none' }}>
                    <span style={styles.logoText}>⚡ Vmart SaaS</span>
                </Link>
            </div>

            <div style={styles.card}>
                <div style={styles.cardHeader}>
                    <div style={styles.icon}>🚀</div>
                    <h1 style={styles.title}>注册商户账号</h1>
                    <div style={styles.planBadge}>
                        当前选择：{planLabels[plan] || '免费体验'}
                    </div>
                </div>

                {error && <div style={styles.alert}>{error}</div>}

                <form onSubmit={submit}>
                    <div style={styles.formGroup}>
                        <label style={styles.label}>商户名称</label>
                        <input
                            style={styles.input}
                            type="text"
                            placeholder="您的姓名或商户名"
                            value={form.username}
                            onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                            required autoFocus
                        />
                    </div>
                    <div style={styles.formGroup}>
                        <label style={styles.label}>邮箱地址</label>
                        <input
                            style={styles.input}
                            type="email"
                            placeholder="your@email.com"
                            value={form.email}
                            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                            required
                        />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div style={styles.formGroup}>
                            <label style={styles.label}>密码</label>
                            <input
                                style={styles.input}
                                type="password"
                                placeholder="至少 6 位"
                                value={form.password}
                                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                                required
                            />
                        </div>
                        <div style={styles.formGroup}>
                            <label style={styles.label}>确认密码</label>
                            <input
                                style={styles.input}
                                type="password"
                                placeholder="再输入一次"
                                value={form.confirm}
                                onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
                                required
                            />
                        </div>
                    </div>

                    <p style={{ fontSize: '0.75rem', color: 'rgba(240,240,248,0.3)', marginBottom: 14, lineHeight: 1.6 }}>
                        注册即表示同意 <Link to="/terms" style={{ color: '#818cf8' }}>服务条款</Link>
                    </p>

                    <button type="submit" style={styles.submitBtn} disabled={loading}>
                        {loading ? '注册中...' : '立即注册并开始 →'}
                    </button>
                </form>

                <div style={styles.divider}><span>已有账号？</span></div>

                <Link to="/saas/login" style={styles.loginBtn}>
                    登录已有商户账号
                </Link>

                <div style={{ textAlign: 'center', marginTop: 20 }}>
                    <Link to="/saas" style={{ fontSize: '0.8rem', color: 'rgba(240,240,248,0.4)', textDecoration: 'none' }}>
                        ← 返回首页
                    </Link>
                </div>
            </div>
        </div>
    )
}

const styles = {
    page: {
        minHeight: '100vh', background: '#070710',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '24px', position: 'relative', overflow: 'hidden',
        fontFamily: "'Inter', -apple-system, sans-serif",
    },
    bg: {
        position: 'fixed', inset: 0, zIndex: 0,
        background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(99,102,241,0.12) 0%, transparent 60%), radial-gradient(ellipse 40% 40% at 20% 80%, rgba(6,182,212,0.06) 0%, transparent 60%)',
    },
    logo: { position: 'absolute', top: 24, left: 36, zIndex: 10 },
    logoText: {
        fontSize: '1.2rem', fontWeight: 800,
        background: 'linear-gradient(135deg, #6366f1, #a78bfa)',
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
    },
    card: {
        background: 'rgba(15,15,26,0.9)', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '24px', padding: '36px', width: '100%', maxWidth: '460px',
        position: 'relative', zIndex: 1, backdropFilter: 'blur(20px)',
        boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
    },
    cardHeader: { textAlign: 'center', marginBottom: '24px' },
    icon: { fontSize: '2.5rem', marginBottom: '12px' },
    title: { fontSize: '1.5rem', fontWeight: 800, color: '#f0f0f8', margin: '0 0 10px' },
    planBadge: {
        display: 'inline-block', padding: '4px 14px', borderRadius: '20px',
        background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)',
        color: '#a5b4fc', fontSize: '0.78rem', fontWeight: 600,
    },
    alert: {
        background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
        color: '#f87171', borderRadius: '10px', padding: '10px 14px',
        fontSize: '0.84rem', marginBottom: '16px',
    },
    formGroup: { marginBottom: '14px' },
    label: {
        display: 'block', fontSize: '0.8rem', fontWeight: 600,
        color: 'rgba(240,240,248,0.6)', marginBottom: '6px',
    },
    input: {
        width: '100%', padding: '11px 14px', borderRadius: '10px',
        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
        color: '#f0f0f8', fontSize: '0.88rem', outline: 'none',
        transition: 'border-color 0.15s', boxSizing: 'border-box',
    },
    submitBtn: {
        width: '100%', padding: '13px', borderRadius: '12px', border: 'none',
        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
        color: '#fff', fontSize: '0.95rem', fontWeight: 700,
        cursor: 'pointer', boxShadow: '0 4px 20px rgba(99,102,241,0.4)',
        transition: 'all 0.2s',
    },
    divider: {
        textAlign: 'center', color: 'rgba(240,240,248,0.3)',
        fontSize: '0.82rem', margin: '18px 0 12px',
    },
    loginBtn: {
        display: 'block', textAlign: 'center', width: '100%',
        padding: '12px', borderRadius: '12px', boxSizing: 'border-box',
        background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
        color: '#a5b4fc', fontSize: '0.9rem', fontWeight: 600,
        textDecoration: 'none',
    },
}

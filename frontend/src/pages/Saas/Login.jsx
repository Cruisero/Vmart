import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'

const API = import.meta.env.VITE_API_URL || '/api'

export default function SaasLogin() {
    const navigate = useNavigate()
    const [params] = useSearchParams()
    const plan = params.get('plan') || ''
    const { login } = useAuthStore()

    const [form, setForm] = useState({ email: '', password: '' })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const submit = async (e) => {
        e.preventDefault()
        setLoading(true); setError('')
        try {
            const r = await fetch(`${API}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            })
            const d = await r.json()
            if (d.token) {
                login(d.user, d.token)
                // 登录成功 → 直接跳商户商城后台
                navigate('/admin', { replace: true })
            } else {
                setError(d.error || '登录失败，请检查邮箱和密码')
            }
        } catch {
            setError('网络错误，请稍后重试')
        } finally {
            setLoading(false)
        }
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
                    <div style={styles.icon}>🏪</div>
                    <h1 style={styles.title}>商户登录</h1>
                    <p style={styles.subtitle}>登录后进入您的商城管理后台</p>
                </div>

                {error && (
                    <div style={styles.alert}>{error}</div>
                )}

                <form onSubmit={submit}>
                    <div style={styles.formGroup}>
                        <label style={styles.label}>邮箱地址</label>
                        <input
                            style={styles.input}
                            type="email"
                            placeholder="your@email.com"
                            value={form.email}
                            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                            required
                            autoFocus
                        />
                    </div>
                    <div style={styles.formGroup}>
                        <label style={styles.label}>
                            密码
                            <Link to="/forgot-password" style={styles.forgotLink}>忘记密码？</Link>
                        </label>
                        <input
                            style={styles.input}
                            type="password"
                            placeholder="••••••••"
                            value={form.password}
                            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                            required
                        />
                    </div>
                    <button type="submit" style={styles.submitBtn} disabled={loading}>
                        {loading ? '登录中...' : '登录商户后台 →'}
                    </button>
                </form>

                <div style={styles.divider}>
                    <span>还没有账号？</span>
                </div>

                <Link to={`/saas/register${plan ? '?plan=' + plan : ''}`} style={styles.registerBtn}>
                    注册新商户账号
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
        minHeight: '100vh',
        background: '#070710',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: "'Inter', -apple-system, sans-serif",
    },
    bg: {
        position: 'fixed', inset: 0, zIndex: 0,
        background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(99,102,241,0.12) 0%, transparent 60%), radial-gradient(ellipse 40% 40% at 80% 80%, rgba(139,92,246,0.08) 0%, transparent 60%)',
    },
    logo: {
        position: 'absolute', top: 24, left: 36, zIndex: 10,
    },
    logoText: {
        fontSize: '1.2rem', fontWeight: 800,
        background: 'linear-gradient(135deg, #6366f1, #a78bfa)',
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
    },
    card: {
        background: 'rgba(15,15,26,0.9)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '24px',
        padding: '40px',
        width: '100%',
        maxWidth: '420px',
        position: 'relative', zIndex: 1,
        backdropFilter: 'blur(20px)',
        boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
    },
    cardHeader: { textAlign: 'center', marginBottom: '28px' },
    icon: { fontSize: '2.5rem', marginBottom: '12px' },
    title: { fontSize: '1.5rem', fontWeight: 800, color: '#f0f0f8', margin: '0 0 8px' },
    subtitle: { fontSize: '0.85rem', color: 'rgba(240,240,248,0.5)', margin: 0 },
    alert: {
        background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
        color: '#f87171', borderRadius: '10px', padding: '10px 14px',
        fontSize: '0.84rem', marginBottom: '16px',
    },
    formGroup: { marginBottom: '16px' },
    label: {
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        fontSize: '0.8rem', fontWeight: 600, color: 'rgba(240,240,248,0.6)',
        marginBottom: '6px',
    },
    forgotLink: { fontSize: '0.75rem', color: '#818cf8', textDecoration: 'none' },
    input: {
        width: '100%', padding: '11px 14px', borderRadius: '10px',
        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
        color: '#f0f0f8', fontSize: '0.9rem', outline: 'none',
        transition: 'border-color 0.15s', boxSizing: 'border-box',
    },
    submitBtn: {
        width: '100%', padding: '13px', borderRadius: '12px', border: 'none',
        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
        color: '#fff', fontSize: '0.95rem', fontWeight: 700,
        cursor: 'pointer', marginTop: '8px',
        boxShadow: '0 4px 20px rgba(99,102,241,0.4)',
        transition: 'all 0.2s',
    },
    divider: {
        textAlign: 'center', color: 'rgba(240,240,248,0.3)',
        fontSize: '0.82rem', margin: '20px 0 12px',
    },
    registerBtn: {
        display: 'block', textAlign: 'center', width: '100%',
        padding: '12px', borderRadius: '12px', boxSizing: 'border-box',
        background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
        color: '#a5b4fc', fontSize: '0.9rem', fontWeight: 600,
        textDecoration: 'none', transition: 'all 0.15s',
    },
}

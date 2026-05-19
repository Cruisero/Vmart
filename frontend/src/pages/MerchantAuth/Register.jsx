import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useMerchantStore } from '../../store/merchantStore'
import { useAuthStore } from '../../store/authStore'
import './Auth.css'

export default function MerchantRegister() {
    const navigate = useNavigate()
    const setAuth = useMerchantStore(s => s.setAuth)
    const loginAdmin = useAuthStore(s => s.login)
    const [form, setForm] = useState({ email: '', password: '', shopName: '', otpCode: '' })
    const [loading, setLoading] = useState(false)
    const [sendingOtp, setSendingOtp] = useState(false)
    const [otpCooldown, setOtpCooldown] = useState(0)
    const [otpRequired, setOtpRequired] = useState(false)
    const [error, setError] = useState('')
    const [info, setInfo] = useState('')

    useEffect(() => {
        fetch('/api/settings/public/otp')
            .then(r => r.json())
            .then(d => setOtpRequired(!!d.merchantRegisterOtp))
            .catch(() => {})
    }, [])

    useEffect(() => {
        if (otpCooldown <= 0) return
        const t = setTimeout(() => setOtpCooldown(c => c - 1), 1000)
        return () => clearTimeout(t)
    }, [otpCooldown])

    const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

    const handleSendOtp = async () => {
        setError(''); setInfo('')
        if (!form.email) { setError('请先填写邮箱'); return }
        setSendingOtp(true)
        try {
            const res = await fetch('/api/platform/otp/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: form.email, scope: 'merchant_register' })
            })
            const data = await res.json()
            if (!res.ok) { setError(data.error || '发送失败'); return }
            setInfo('验证码已发送，请查收邮箱')
            setOtpCooldown(60)
        } catch (err) {
            setError('网络错误')
        } finally {
            setSendingOtp(false)
        }
    }

    const handleSubmit = async e => {
        e.preventDefault()
        setError(''); setInfo('')
        setLoading(true)
        try {
            const res = await fetch('/api/platform/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            })
            const data = await res.json()
            if (!res.ok) { setError(data.error || '注册失败'); return }
            setAuth(data.token, data.merchant, data.shop)
            if (data.adminToken && data.adminUser) {
                loginAdmin(data.adminUser, data.adminToken)
            }
            navigate(`/v/${data.shop.slug}/admin`)
        } catch (err) {
            console.error('[register error]', err)
            setError('错误：' + (err?.message || String(err)))
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="merchant-auth-page">
            <div className="merchant-auth-card">
                <div className="merchant-auth-brand">
                    <span className="brand-logo">V</span>
                    <span className="brand-name">Vmart</span>
                </div>
                <h1 className="merchant-auth-title">开启你的商城</h1>
                <p className="merchant-auth-sub">注册即免费体验，无需信用卡</p>

                {error && <div className="merchant-auth-error">{error}</div>}
                {info && <div className="merchant-auth-error" style={{ background: 'rgba(16,185,129,0.1)', color: '#059669', borderColor: 'rgba(16,185,129,0.3)' }}>{info}</div>}

                <form onSubmit={handleSubmit} className="merchant-auth-form">
                    <div className="form-group">
                        <label>店铺名称</label>
                        <input
                            name="shopName"
                            value={form.shopName}
                            onChange={handleChange}
                            placeholder="给你的商城起个名字"
                            required
                            maxLength={50}
                        />
                    </div>
                    <div className="form-group">
                        <label>邮箱</label>
                        <input
                            name="email"
                            type="email"
                            value={form.email}
                            onChange={handleChange}
                            placeholder="your@email.com"
                            required
                        />
                    </div>
                    {otpRequired && (
                        <div className="form-group">
                            <label>邮箱验证码</label>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <input
                                    name="otpCode"
                                    value={form.otpCode}
                                    onChange={handleChange}
                                    placeholder="6 位数字"
                                    maxLength={6}
                                    inputMode="numeric"
                                    style={{ flex: 1 }}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={handleSendOtp}
                                    disabled={sendingOtp || otpCooldown > 0 || !form.email}
                                    style={{
                                        padding: '10px 16px',
                                        border: '1px solid #d1d5db',
                                        background: otpCooldown > 0 ? '#f3f4f6' : '#fff',
                                        color: otpCooldown > 0 ? '#9ca3af' : '#374151',
                                        borderRadius: 8,
                                        fontSize: '0.85rem',
                                        cursor: (sendingOtp || otpCooldown > 0 || !form.email) ? 'not-allowed' : 'pointer',
                                        whiteSpace: 'nowrap'
                                    }}
                                >
                                    {sendingOtp ? '发送中...' : otpCooldown > 0 ? `${otpCooldown}s` : '获取验证码'}
                                </button>
                            </div>
                        </div>
                    )}
                    <div className="form-group">
                        <label>密码</label>
                        <input
                            name="password"
                            type="password"
                            value={form.password}
                            onChange={handleChange}
                            placeholder="至少 6 位"
                            required
                            minLength={6}
                        />
                    </div>
                    <button type="submit" className="merchant-auth-btn" disabled={loading}>
                        {loading ? '开通中...' : '免费开通商城 →'}
                    </button>
                </form>

                <p className="merchant-auth-footer">
                    已有账号？<Link to="/login">立即登录</Link>
                </p>
            </div>
        </div>
    )
}

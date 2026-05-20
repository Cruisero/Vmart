import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FiMail, FiLock, FiUser, FiEye, FiEyeOff, FiArrowRight } from 'react-icons/fi'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../../../../store/authStore'
import { useStorefront } from '../../../../store/storefrontStore'
import { getStorefrontBasePath } from '../../../../utils/agentDomain'
import { useRegisterOtp } from '../../../../hooks/useRegisterOtp'
import toast from 'react-hot-toast'
import './Auth.css'

export default function ZenRegister() {
    const { t } = useTranslation()
    const navigate = useNavigate()
    const login = useAuthStore((s) => s.login)
    const storefront = useStorefront()
    const prefix = storefront ? getStorefrontBasePath(storefront) : ''
    const [form, setForm] = useState({ username: '', email: '', password: '', confirmPassword: '' })
    const [showPw, setShowPw] = useState(false)
    const [loading, setLoading] = useState(false)
    const otp = useRegisterOtp({
        scope: 'customer_register',
        getEmail: () => form.email,
        getSlug: () => storefront?.slug || null
    })

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!form.username || !form.email || !form.password) { toast.error(t('auth.emailPlaceholder')); return }
        if (form.password !== form.confirmPassword) { toast.error(t('auth.passwordMismatch')); return }
        if (form.password.length < 6) { toast.error(t('auth.passwordMin')); return }
        if (otp.enabled && !otp.code) { toast.error(t('auth.emailPlaceholder')); return }
        setLoading(true)
        try {
            const registerBody = { email: form.email, password: form.password, username: form.username }
            const url = storefront?._tenantMode ? '/api/customer/register' : '/api/auth/register'
            if (storefront) {
                if (storefront._tenantMode) registerBody.storefrontSlug = storefront.slug
                else registerBody.agentSlug = storefront.slug
            }
            if (otp.enabled) registerBody.otpCode = otp.code
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(registerBody)
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || t('common.failed'))
            login(data.user, data.token)
            toast.success(t('auth.registerSuccess'))
            navigate(`${prefix}/`)
        } catch (err) {
            toast.error(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="za-page">
            <div className="za-card">
                <div className="za-header">
                    <div className="za-logo">
                        <FiUser size={20} />
                    </div>
                    <h1 className="za-title">{t('auth.register')}</h1>
                    <p className="za-sub">{t('auth.register')}</p>
                </div>

                <form className="za-form" onSubmit={handleSubmit}>
                    <div className="za-field">
                        <label className="za-label">{t('auth.email')}</label>
                        <div className="za-input-wrap">
                            <FiUser className="za-input-icon" size={15} />
                            <input
                                type="text"
                                className="za-input"
                                placeholder={t('auth.emailPlaceholder')}
                                value={form.username}
                                onChange={e => setForm({ ...form, username: e.target.value })}
                                autoComplete="username"
                            />
                        </div>
                    </div>

                    <div className="za-field">
                        <label className="za-label">{t('auth.email')}</label>
                        <div className="za-input-wrap">
                            <FiMail className="za-input-icon" size={15} />
                            <input
                                type="email"
                                className="za-input"
                                placeholder={t('auth.emailPlaceholder')}
                                value={form.email}
                                onChange={e => setForm({ ...form, email: e.target.value })}
                                autoComplete="email"
                            />
                        </div>
                    </div>

                    {otp.enabled && (
                        <div className="za-field">
                            <label className="za-label">OTP</label>
                            <div className="za-input-wrap" style={{ display: 'flex', gap: 8 }}>
                                <input
                                    type="text"
                                    className="za-input"
                                    placeholder="6 digits"
                                    value={otp.code}
                                    onChange={e => otp.setCode(e.target.value.replace(/\D/g, ''))}
                                    maxLength={6}
                                    inputMode="numeric"
                                    style={{ flex: 1 }}
                                />
                                <button
                                    type="button"
                                    onClick={otp.sendCode}
                                    disabled={otp.sending || otp.cooldown > 0 || !form.email}
                                    style={{
                                        padding: '0 14px', border: '1px solid #d1d5db',
                                        background: otp.cooldown > 0 ? '#f3f4f6' : '#fff',
                                        color: otp.cooldown > 0 ? '#9ca3af' : '#374151',
                                        borderRadius: 8, fontSize: '0.82rem',
                                        cursor: (otp.sending || otp.cooldown > 0 || !form.email) ? 'not-allowed' : 'pointer',
                                        whiteSpace: 'nowrap'
                                    }}
                                >
                                    {otp.sending ? '...' : otp.cooldown > 0 ? `${otp.cooldown}s` : 'Send Code'}
                                </button>
                            </div>
                            {otp.error && <div style={{ color: '#ef4444', fontSize: '0.78rem', marginTop: 4 }}>{otp.error}</div>}
                            {otp.info && <div style={{ color: '#10b981', fontSize: '0.78rem', marginTop: 4 }}>{otp.info}</div>}
                        </div>
                    )}

                    <div className="za-field">
                        <label className="za-label">{t('auth.password')}</label>
                        <div className="za-input-wrap">
                            <FiLock className="za-input-icon" size={15} />
                            <input
                                type={showPw ? 'text' : 'password'}
                                className="za-input"
                                placeholder={t('auth.passwordPlaceholder')}
                                value={form.password}
                                onChange={e => setForm({ ...form, password: e.target.value })}
                                autoComplete="new-password"
                            />
                            <button type="button" className="za-toggle-pw" onClick={() => setShowPw(!showPw)}>
                                {showPw ? <FiEyeOff size={15} /> : <FiEye size={15} />}
                            </button>
                        </div>
                    </div>

                    <div className="za-field">
                        <label className="za-label">{t('auth.confirmPassword')}</label>
                        <div className="za-input-wrap">
                            <FiLock className="za-input-icon" size={15} />
                            <input
                                type={showPw ? 'text' : 'password'}
                                className="za-input"
                                placeholder={t('auth.confirmPlaceholder')}
                                value={form.confirmPassword}
                                onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
                                autoComplete="new-password"
                            />
                        </div>
                    </div>

                    <button type="submit" className="za-submit" disabled={loading}>
                        {loading ? <span className="za-spinner" /> : <>{t('auth.registerBtn')} <FiArrowRight size={15} /></>}
                    </button>
                </form>

                <div className="za-footer">
                    {t('auth.hasAccount')}
                    <Link to={`${prefix}/login`} className="za-link">{t('auth.goLogin')}</Link>
                </div>
            </div>
        </div>
    )
}

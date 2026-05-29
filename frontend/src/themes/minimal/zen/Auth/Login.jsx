import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FiMail, FiLock, FiEye, FiEyeOff, FiArrowRight } from 'react-icons/fi'
import { useBuyerL } from '../../../../hooks/useBuyerL'
import { useAuthStore } from '../../../../store/authStore'
import { useStorefront } from '../../../../store/storefrontStore'
import { getStorefrontBasePath } from '../../../../utils/agentDomain'
import toast from 'react-hot-toast'
import './Auth.css'

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

export default function ZenLogin({ headerTitle, headerSubtitle } = {}) {
    const L = useBuyerL()
    const navigate = useNavigate()
    const login = useAuthStore((s) => s.login)
    const storefront = useStorefront()
    const prefix = storefront ? getStorefrontBasePath(storefront) : ''
    const [form, setForm] = useState({ email: '', password: '' })
    const [showPw, setShowPw] = useState(false)
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!form.email || !form.password) { toast.error(L('auth.emailPlaceholder')); return }
        setLoading(true)
        try {
            const url = storefront?._tenantMode ? '/api/customer/login' : '/api/auth/login'
            const body = { email: form.email, password: form.password }
            if (storefront?._tenantMode) body.storefrontSlug = storefront.slug
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || L('common.failed'))
            login(data.user, data.token)
            toast.success(L('auth.loginSuccess'))
            const role = data.user.role
            if (['ADMIN', 'TENANT_ADMIN', 'SUPER_ADMIN'].includes(role)) {
                if (role === 'SUPER_ADMIN' && !storefront?._tenantMode) {
                    navigate('/Man/dashboard', { replace: true })
                } else {
                    navigate(`${prefix}/admin`, { replace: true })
                }
            } else {
                navigate(`${prefix}/`)
            }
        } catch (err) {
            toast.error(err.message || L('common.failed'))
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="za-page">
            <div className="za-card">
                <div className="za-header">
                    <div className="za-eyebrow">BUYER ACCESS</div>
                    <h1 className="za-title">{headerTitle || L('user.welcome')}</h1>
                    <p className="za-sub">{headerSubtitle || L('auth.loginContinue')}</p>
                </div>

                <form className="za-form" onSubmit={handleSubmit}>
                    <div className="za-field">
                        <label className="za-label">{L('order.email')}</label>
                        <div className="za-input-wrap">
                            <FiMail className="za-input-icon" size={15} />
                            <input
                                type="email"
                                className="za-input"
                                placeholder={L('auth.emailPlaceholder')}
                                value={form.email}
                                onChange={e => setForm({ ...form, email: e.target.value })}
                                autoComplete="email"
                            />
                        </div>
                    </div>

                    <div className="za-field">
                        <label className="za-label">{L('auth.password')}</label>
                        <div className="za-input-wrap">
                            <FiLock className="za-input-icon" size={15} />
                            <input
                                type={showPw ? 'text' : 'password'}
                                className="za-input"
                                placeholder={L('auth.passwordPlaceholder')}
                                value={form.password}
                                onChange={e => setForm({ ...form, password: e.target.value })}
                                autoComplete="current-password"
                            />
                            <button type="button" className="za-toggle-pw" onClick={() => setShowPw(!showPw)}>
                                {showPw ? <FiEyeOff size={15} /> : <FiEye size={15} />}
                            </button>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 2 }}>
                            <Link to={`${prefix}/forgot-password`} className="za-forgot">{L('忘记密码？', 'Forgot Password?')}</Link>
                        </div>
                    </div>

                    <button type="submit" className="za-submit" disabled={loading}>
                        {loading ? <span className="za-spinner" /> : <>{L('nav.login')} <FiArrowRight size={15} /></>}
                    </button>
                </form>

                <div className="za-footer">
                    {L('auth.noAccount')}
                    <Link to={`${prefix}/register`} className="za-link">{L('auth.goRegister')}</Link>
                </div>

                <div className="za-divider"><span>—</span></div>

                <Link to={`${prefix}/`} className="za-guest">{L('nav.home')}</Link>
            </div>
        </div>
    )
}

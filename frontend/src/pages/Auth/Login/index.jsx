import { useState } from 'react'
import { usePageTitle } from '../../../hooks/usePageTitle'
import { Link, useNavigate } from 'react-router-dom'
import { FiMail, FiLock, FiEye, FiEyeOff } from 'react-icons/fi'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../../../store/authStore'
import { useStorefront, useStorefrontPath } from '../../../store/storefrontStore'
import toast from 'react-hot-toast'
import './Auth.css'

const API_BASE = '/api'

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

function Login({ headerTitle, headerSubtitle } = {}) {
    const { t } = useTranslation()
    usePageTitle(t('auth.login'))
    const navigate = useNavigate()
    const { withPrefix } = useStorefrontPath()
    const storefront = useStorefront()
    const login = useAuthStore((state) => state.login)
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    })
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)

    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (!formData.email || !formData.password) {
            toast.error(t('auth.emailPlaceholder'))
            return
        }

        setLoading(true)

        try {
            const url = storefront?._tenantMode ? `${API_BASE}/customer/login` : `${API_BASE}/auth/login`
            const body = { email: formData.email, password: formData.password }
            if (storefront?._tenantMode) body.storefrontSlug = storefront.slug
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || t('common.failed'))
            }

            login(data.user, data.token)
            toast.success(t('auth.loginSuccess'))

            const role = data.user.role
            if (['ADMIN', 'TENANT_ADMIN', 'SUPER_ADMIN'].includes(role)) {
                if (role === 'SUPER_ADMIN' && !storefront?._tenantMode) {
                    navigate('/Man/dashboard', { replace: true })
                } else {
                    navigate(withPrefix('/admin'), { replace: true })
                }
            } else {
                navigate(withPrefix('/'))
            }
        } catch (error) {
            toast.error(error.message || t('common.failed'))
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="auth-page">
            <div className="auth-container">
                <div className="auth-header">
                    <h1>{headerTitle || t('user.welcome')}</h1>
                    <p>{headerSubtitle || t('auth.loginContinue')}</p>
                </div>

                <form className="auth-form" onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>{t('auth.email')}</label>
                        <div className="input-wrapper">
                            <FiMail className="input-icon" />
                            <input
                                type="email"
                                name="email"
                                className="input with-icon"
                                placeholder={t('auth.emailPlaceholder')}
                                value={formData.email}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label>{t('auth.password')}</label>
                        <div className="input-wrapper">
                            <FiLock className="input-icon" />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                name="password"
                                className="input with-icon"
                                placeholder={t('auth.passwordPlaceholder')}
                                value={formData.password}
                                onChange={handleChange}
                            />
                            <button
                                type="button"
                                className="password-toggle"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? <FiEyeOff /> : <FiEye />}
                            </button>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 2 }}>
                            <Link to={withPrefix('/forgot-password')} className="forgot-password" style={{ fontSize: '0.8rem' }}>{t('忘记密码？', 'Forgot Password?')}</Link>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary btn-lg auth-btn"
                        disabled={loading}
                    >
                        {loading ? t('auth.logging') : t('auth.loginBtn')}
                    </button>
                </form>

                <div className="auth-footer">
                    <p>{t('auth.noAccount')} <Link to={withPrefix('/register')}>{t('auth.goRegister')}</Link></p>
                </div>

                <div className="auth-divider">
                    <span>—</span>
                </div>

                <div className="guest-option">
                    <Link to={withPrefix('/')} className="btn btn-secondary">
                        {t('nav.home')}
                    </Link>
                </div>

            </div>
        </div>
    )
}

export default Login

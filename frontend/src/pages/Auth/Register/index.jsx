import { useState } from 'react'
import { usePageTitle } from '../../../hooks/usePageTitle'
import { Link, useNavigate } from 'react-router-dom'
import { FiMail, FiLock, FiUser, FiEye, FiEyeOff } from 'react-icons/fi'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../../../store/authStore'
import { useStorefront, useStorefrontPath } from '../../../store/storefrontStore'
import { useRegisterOtp } from '../../../hooks/useRegisterOtp'
import toast from 'react-hot-toast'
import './Auth.css'

function Register() {
    const { t } = useTranslation()
    usePageTitle(t('auth.register'))
    const navigate = useNavigate()
    const { withPrefix } = useStorefrontPath()
    const storefront = useStorefront()
    const login = useAuthStore((state) => state.login)
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        confirmPassword: ''
    })
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const otp = useRegisterOtp({
        scope: 'customer_register',
        getEmail: () => formData.email,
        getSlug: () => storefront?.slug || null
    })

    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (!formData.username || !formData.email || !formData.password) {
            toast.error(t('auth.emailPlaceholder'))
            return
        }

        if (formData.password !== formData.confirmPassword) {
            toast.error(t('auth.passwordMismatch'))
            return
        }

        if (formData.password.length < 6) {
            toast.error(t('auth.passwordMin'))
            return
        }

        if (otp.enabled && !otp.code) {
            toast.error(t('auth.emailPlaceholder'))
            return
        }

        setLoading(true)

        try {
            const url = storefront?._tenantMode ? '/api/customer/register' : '/api/auth/register'
            const body = {
                email: formData.email,
                password: formData.password,
                username: formData.username
            }
            if (storefront?._tenantMode) body.storefrontSlug = storefront.slug
            if (otp.enabled) body.otpCode = otp.code
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || t('common.failed'))
            }

            login(data.user, data.token)
            toast.success(t('auth.registerSuccess'))
            navigate(withPrefix('/'))
        } catch (error) {
            toast.error(error.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="auth-page">
            <div className="auth-container">
                <div className="auth-header">
                    <h1>{t('auth.register')}</h1>
                    <p>{t('auth.register')}</p>
                </div>

                <form className="auth-form" onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>店铺名称</label>
                        <div className="input-wrapper">
                            <FiUser className="input-icon" />
                            <input
                                type="text"
                                name="username"
                                className="input with-icon"
                                placeholder="给你的商城起个名字"
                                value={formData.username}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

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

                    {otp.enabled && (
                        <div className="form-group">
                            <label>OTP</label>
                            <div className="otp-row">
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="6 digits"
                                    value={otp.code}
                                    onChange={(e) => otp.setCode(e.target.value.replace(/\D/g, ''))}
                                    maxLength={6}
                                    inputMode="numeric"
                                />
                                <button
                                    type="button"
                                    onClick={otp.sendCode}
                                    disabled={otp.sending || otp.cooldown > 0 || !formData.email}
                                    className="btn btn-secondary"
                                >
                                    {otp.sending ? '...' : otp.cooldown > 0 ? `${otp.cooldown}s` : 'Send Code'}
                                </button>
                            </div>
                            {otp.error && <div className="otp-feedback" style={{ color: '#ef4444' }}>{otp.error}</div>}
                            {otp.info && <div className="otp-feedback" style={{ color: '#10b981' }}>{otp.info}</div>}
                        </div>
                    )}

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
                    </div>

                    <div className="form-group">
                        <label>{t('auth.confirmPassword')}</label>
                        <div className="input-wrapper">
                            <FiLock className="input-icon" />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                name="confirmPassword"
                                className="input with-icon"
                                placeholder={t('auth.confirmPlaceholder')}
                                value={formData.confirmPassword}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary btn-lg auth-btn"
                        disabled={loading}
                    >
                        {loading ? t('auth.registering') : t('auth.registerBtn')}
                    </button>
                </form>

                <div className="auth-footer">
                    <p>{t('auth.hasAccount')} <Link to={withPrefix('/login')}>{t('auth.goLogin')}</Link></p>
                </div>
            </div>
        </div>
    )
}

export default Register

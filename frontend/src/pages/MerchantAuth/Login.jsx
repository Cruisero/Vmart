import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useMerchantStore } from '../../store/merchantStore'
import { useAuthStore } from '../../store/authStore'
import { useBuyerL } from '../../hooks/useBuyerL'
import './Auth.css'

export default function MerchantLogin() {
    const L = useBuyerL()
    const navigate = useNavigate()
    const setAuth = useMerchantStore(s => s.setAuth)
    const loginAdmin = useAuthStore(s => s.login)
    const [form, setForm] = useState({ email: '', password: '' })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    // 区分商户登录和超管登录
    const isMdPage = window.location.pathname.startsWith('/Man')
    const loginEndpoint = '/api/platform/login'

    const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

    const handleSubmit = async e => {
        e.preventDefault()
        setError('')
        setLoading(true)
        try {
            const res = await fetch(loginEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            })
            const data = await res.json()
            if (!res.ok) { setError(data.error || L('merchantAuth.loginFailed', 'Login failed')); return }
            setAuth(data.token, data.merchant, data.shop)
            if (data.adminToken && data.adminUser && !data.merchant.isSuperAdmin) {
                loginAdmin(data.adminUser, data.adminToken)
            }

            if (data.merchant.isSuperAdmin) {
                navigate('/Man/dashboard')
            } else if (data.shop) {
                navigate(`/v/${data.shop.slug}/admin`)
            } else {
                navigate('/Man/dashboard')
            }
        } catch {
            setError(L('merchantAuth.networkError'))
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="merchant-auth-page">
            <div className="merchant-auth-card">
              
                <h1 className="merchant-auth-title">
                    {isMdPage
                        ? L('merchantAuth.adminLoginTitle', 'Platform Admin Login')
                        : L('merchantAuth.loginTitle')}
                </h1>
                <p className="merchant-auth-sub">{L('merchantAuth.loginSub')}</p>

                {error && <div className="merchant-auth-error">{error}</div>}

                <form onSubmit={handleSubmit} className="merchant-auth-form">
                    <div className="form-group">
                        <label>{L('merchantAuth.email')}</label>
                        <input
                            name="email"
                            type="email"
                            value={form.email}
                            onChange={handleChange}
                            placeholder="your@email.com"
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>{L('merchantAuth.password')}</label>
                        <input
                            name="password"
                            type="password"
                            value={form.password}
                            onChange={handleChange}
                            placeholder={L('merchantAuth.passwordPlaceholder')}
                            required
                        />
                        <div className="merchant-auth-meta">
                            <Link to="/forgot-password" className="merchant-auth-forgot">
                                忘记密码
                            </Link>
                        </div>
                    </div>
                    <button type="submit" className="merchant-auth-btn" disabled={loading}>
                        {loading ? L('merchantAuth.loggingIn') : L('merchantAuth.loginBtn')}
                    </button>
                </form>

                {!isMdPage && (
                    <p className="merchant-auth-footer">
                        {L('merchantAuth.noAccount')}<Link to="/register">{L('merchantAuth.goRegister')}</Link>
                    </p>
                )}
            </div>
        </div>
    )
}

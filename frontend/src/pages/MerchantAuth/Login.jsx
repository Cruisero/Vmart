import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useMerchantStore } from '../../store/merchantStore'
import { useAuthStore } from '../../store/authStore'
import './Auth.css'

export default function MerchantLogin() {
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
            if (!res.ok) { setError(data.error || '登录失败'); return }
            setAuth(data.token, data.merchant, data.shop)
            // 同步写入 admin store（用应答里的 adminUser，确保 id 与 JWT 一致）
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
            setError('网络错误，请重试')
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
                <h1 className="merchant-auth-title">
                    {isMdPage ? '平台管理员登录' : '商户登录'}
                </h1>

                {error && <div className="merchant-auth-error">{error}</div>}

                <form onSubmit={handleSubmit} className="merchant-auth-form">
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
                    <div className="form-group">
                        <label>密码</label>
                        <input
                            name="password"
                            type="password"
                            value={form.password}
                            onChange={handleChange}
                            placeholder="请输入密码"
                            required
                        />
                    </div>
                    <button type="submit" className="merchant-auth-btn" disabled={loading}>
                        {loading ? '登录中...' : '登录'}
                    </button>
                </form>

                {!isMdPage && (
                    <p className="merchant-auth-footer">
                        还没有商城？<Link to="/register">免费开通</Link>
                    </p>
                )}
            </div>
        </div>
    )
}

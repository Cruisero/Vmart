import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useMerchantStore } from '../../store/merchantStore'
import { useAuthStore } from '../../store/authStore'
import './Auth.css'

export default function MerchantRegister() {
    const navigate = useNavigate()
    const setAuth = useMerchantStore(s => s.setAuth)
    const loginAdmin = useAuthStore(s => s.login)
    const [form, setForm] = useState({ email: '', password: '', shopName: '' })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

    const handleSubmit = async e => {
        e.preventDefault()
        setError('')
        setLoading(true)
        try {
            const res = await fetch('/api/platform/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            })
            const data = await res.json()
            if (!res.ok) { setError(data.error || '注册失败'); return }
            // 设置商户 store（平台 token）
            setAuth(data.token, data.merchant, data.shop)
            // 同时设置 admin store（用应答里的 adminUser，确保 id/role 与 JWT 一致）
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

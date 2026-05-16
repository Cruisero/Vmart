import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FiArrowRight, FiEye, FiEyeOff } from 'react-icons/fi'
import { useAuthStore } from '../../../store/authStore'
import { useStorefront } from '../../../store/storefrontStore'
import { getStorefrontBasePath } from '../../../utils/agentDomain'
import toast from 'react-hot-toast'
import './Auth.css'

export default function ZenLogin() {
    const navigate = useNavigate()
    const login = useAuthStore(s => s.login)
    const storefront = useStorefront()
    const prefix = storefront ? getStorefrontBasePath(storefront) : ''
    const [form, setForm] = useState({ email: '', password: '' })
    const [showPw, setShowPw] = useState(false)
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!form.email || !form.password) { toast.error('请填写完整信息'); return }
        setLoading(true)
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: form.email, password: form.password })
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || '登录失败')
            login(data.user, data.token)
            toast.success('登录成功')
            navigate(['ADMIN', 'SUPER_ADMIN', 'SAAS_ADMIN'].includes(data.user.role) ? '/admin' : `${prefix}/`)
        } catch (err) { toast.error(err.message) }
        finally { setLoading(false) }
    }

    return (
        <div className="za-page">
            <div className="za-card">
                <h1 className="za-title">登录</h1>
                <p className="za-sub">继续购物</p>
                <form className="za-form" onSubmit={handleSubmit}>
                    <div className="za-field">
                        <label className="za-label">邮箱</label>
                        <input type="email" className="za-input" placeholder="email@example.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} autoComplete="email" />
                    </div>
                    <div className="za-field">
                        <div className="za-label-row">
                            <label className="za-label">密码</label>
                            <Link to="/forgot-password" className="za-forgot">忘记密码？</Link>
                        </div>
                        <div className="za-input-wrap">
                            <input type={showPw ? 'text' : 'password'} className="za-input" placeholder="请输入密码" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} autoComplete="current-password" />
                            <button type="button" className="za-pw-toggle" onClick={() => setShowPw(!showPw)}>{showPw ? <FiEyeOff size={15} /> : <FiEye size={15} />}</button>
                        </div>
                    </div>
                    <button type="submit" className="za-submit" disabled={loading}>
                        {loading ? '登录中…' : <>登录 <FiArrowRight size={14} /></>}
                    </button>
                </form>
                <div className="za-footer">还没有账号？<Link to={`${prefix}/register`} className="za-link">立即注册</Link></div>
                <div className="za-divider"><span>或</span></div>
                <Link to={`${prefix}/`} className="za-guest">游客购物（无需登录）</Link>
            </div>
        </div>
    )
}

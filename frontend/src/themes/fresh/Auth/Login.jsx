import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FiMail, FiLock, FiEye, FiEyeOff, FiArrowRight } from 'react-icons/fi'
import { useAuthStore } from '../../../store/authStore'
import { useStorefront } from '../../../store/storefrontStore'
import { getStorefrontBasePath } from '../../../utils/agentDomain'
import toast from 'react-hot-toast'
import './Auth.css'

export default function FreshLogin() {
    const navigate = useNavigate()
    const login = useAuthStore((s) => s.login)
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
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: form.email, password: form.password })
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || '登录失败')
            login(data.user, data.token)
            toast.success('登录成功')
            navigate(['ADMIN', 'SUPER_ADMIN'].includes(data.user.role) ? '/admin' : `${prefix}/`)
        } catch (err) {
            toast.error(err.message || '邮箱或密码错误')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fa-page">
            <div className="fa-card">
                {/* Header */}
                <div className="fa-header">
                    <div className="fa-logo">
                        <FiLock size={20} />
                    </div>
                    <h1 className="fa-title">欢迎回来</h1>
                    <p className="fa-sub">登录以继续购物</p>
                </div>

                {/* Form */}
                <form className="fa-form" onSubmit={handleSubmit}>
                    <div className="fa-field">
                        <label className="fa-label">邮箱</label>
                        <div className="fa-input-wrap">
                            <FiMail className="fa-input-icon" size={15} />
                            <input
                                type="email"
                                className="fa-input"
                                placeholder="请输入邮箱地址"
                                value={form.email}
                                onChange={e => setForm({ ...form, email: e.target.value })}
                                autoComplete="email"
                            />
                        </div>
                    </div>

                    <div className="fa-field">
                        <div className="fa-label-row">
                            <label className="fa-label">密码</label>
                            <Link to="/forgot-password" className="fa-forgot">忘记密码？</Link>
                        </div>
                        <div className="fa-input-wrap">
                            <FiLock className="fa-input-icon" size={15} />
                            <input
                                type={showPw ? 'text' : 'password'}
                                className="fa-input"
                                placeholder="请输入密码"
                                value={form.password}
                                onChange={e => setForm({ ...form, password: e.target.value })}
                                autoComplete="current-password"
                            />
                            <button type="button" className="fa-toggle-pw" onClick={() => setShowPw(!showPw)}>
                                {showPw ? <FiEyeOff size={15} /> : <FiEye size={15} />}
                            </button>
                        </div>
                    </div>

                    <button type="submit" className="fa-submit" disabled={loading}>
                        {loading ? <span className="fa-spinner" /> : <>登录 <FiArrowRight size={15} /></>}
                    </button>
                </form>

                {/* Footer */}
                <div className="fa-footer">
                    还没有账号？
                    <Link to={`${prefix}/register`} className="fa-link">立即注册</Link>
                </div>

                <div className="fa-divider"><span>或</span></div>

                <Link to={`${prefix}/`} className="fa-guest">游客购物（无需登录）</Link>
            </div>
        </div>
    )
}

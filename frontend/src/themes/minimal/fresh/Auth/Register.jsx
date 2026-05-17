import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FiMail, FiLock, FiUser, FiEye, FiEyeOff, FiArrowRight } from 'react-icons/fi'
import { useAuthStore } from '../../../../store/authStore'
import { useStorefront } from '../../../../store/storefrontStore'
import { getStorefrontBasePath } from '../../../../utils/agentDomain'
import toast from 'react-hot-toast'
import './Auth.css'

export default function FreshRegister() {
    const navigate = useNavigate()
    const login = useAuthStore((s) => s.login)
    const storefront = useStorefront()
    const prefix = storefront ? getStorefrontBasePath(storefront) : ''
    const [form, setForm] = useState({ username: '', email: '', password: '', confirmPassword: '' })
    const [showPw, setShowPw] = useState(false)
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!form.username || !form.email || !form.password) { toast.error('请填写完整信息'); return }
        if (form.password !== form.confirmPassword) { toast.error('两次密码输入不一致'); return }
        if (form.password.length < 6) { toast.error('密码至少6位'); return }
        setLoading(true)
        try {
            const registerBody = { email: form.email, password: form.password, username: form.username }
            const url = storefront?._tenantMode ? '/api/customer/register' : '/api/auth/register'
            if (storefront) {
                if (storefront._tenantMode) registerBody.storefrontSlug = storefront.slug
                else registerBody.agentSlug = storefront.slug
            }
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(registerBody)
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || '注册失败')
            login(data.user, data.token)
            toast.success('注册成功')
            navigate(`${prefix}/`)
        } catch (err) {
            toast.error(err.message)
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
                        <FiUser size={20} />
                    </div>
                    <h1 className="fa-title">创建账号</h1>
                    <p className="fa-sub">注册即可开始购物</p>
                </div>

                {/* Form */}
                <form className="fa-form" onSubmit={handleSubmit}>
                    <div className="fa-field">
                        <label className="fa-label">用户名</label>
                        <div className="fa-input-wrap">
                            <FiUser className="fa-input-icon" size={15} />
                            <input
                                type="text"
                                className="fa-input"
                                placeholder="请输入用户名"
                                value={form.username}
                                onChange={e => setForm({ ...form, username: e.target.value })}
                                autoComplete="username"
                            />
                        </div>
                    </div>

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
                        <label className="fa-label">密码</label>
                        <div className="fa-input-wrap">
                            <FiLock className="fa-input-icon" size={15} />
                            <input
                                type={showPw ? 'text' : 'password'}
                                className="fa-input"
                                placeholder="请输入密码（至少6位）"
                                value={form.password}
                                onChange={e => setForm({ ...form, password: e.target.value })}
                                autoComplete="new-password"
                            />
                            <button type="button" className="fa-toggle-pw" onClick={() => setShowPw(!showPw)}>
                                {showPw ? <FiEyeOff size={15} /> : <FiEye size={15} />}
                            </button>
                        </div>
                    </div>

                    <div className="fa-field">
                        <label className="fa-label">确认密码</label>
                        <div className="fa-input-wrap">
                            <FiLock className="fa-input-icon" size={15} />
                            <input
                                type={showPw ? 'text' : 'password'}
                                className="fa-input"
                                placeholder="请再次输入密码"
                                value={form.confirmPassword}
                                onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
                                autoComplete="new-password"
                            />
                        </div>
                    </div>

                    <label className="fa-terms">
                        <input type="checkbox" required />
                        <span>我已阅读并同意 <a href="/terms" className="fa-link" style={{ marginLeft: 0 }}>用户协议</a></span>
                    </label>

                    <button type="submit" className="fa-submit" disabled={loading}>
                        {loading ? <span className="fa-spinner" /> : <>注册 <FiArrowRight size={15} /></>}
                    </button>
                </form>

                {/* Footer */}
                <div className="fa-footer">
                    已有账号？
                    <Link to={`${prefix}/login`} className="fa-link">立即登录</Link>
                </div>
            </div>
        </div>
    )
}

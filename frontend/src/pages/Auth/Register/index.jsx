import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FiMail, FiLock, FiUser, FiEye, FiEyeOff } from 'react-icons/fi'
import { useAuthStore } from '../../../store/authStore'
import { useStorefront, useStorefrontPath } from '../../../store/storefrontStore'
import { useRegisterOtp } from '../../../hooks/useRegisterOtp'
import toast from 'react-hot-toast'
import './Auth.css'

function Register() {
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
            toast.error('请填写完整信息')
            return
        }

        if (formData.password !== formData.confirmPassword) {
            toast.error('两次密码输入不一致')
            return
        }

        if (formData.password.length < 6) {
            toast.error('密码至少6位')
            return
        }

        if (otp.enabled && !otp.code) {
            toast.error('请输入邮箱验证码')
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
                throw new Error(data.error || '注册失败')
            }

            // 登录用户
            login(data.user, data.token)

            toast.success('注册成功')

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
                    <h1>创建账号</h1>
                    <p>注册 HaoDongXi 账号，享受更多服务</p>
                </div>

                <form className="auth-form" onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>用户名</label>
                        <div className="input-wrapper">
                            <FiUser className="input-icon" />
                            <input
                                type="text"
                                name="username"
                                className="input with-icon"
                                placeholder="请输入用户名"
                                value={formData.username}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label>邮箱</label>
                        <div className="input-wrapper">
                            <FiMail className="input-icon" />
                            <input
                                type="email"
                                name="email"
                                className="input with-icon"
                                placeholder="请输入邮箱"
                                value={formData.email}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    {otp.enabled && (
                        <div className="form-group">
                            <label>邮箱验证码</label>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="6 位数字"
                                    value={otp.code}
                                    onChange={(e) => otp.setCode(e.target.value.replace(/\D/g, ''))}
                                    maxLength={6}
                                    inputMode="numeric"
                                    style={{ flex: 1 }}
                                />
                                <button
                                    type="button"
                                    onClick={otp.sendCode}
                                    disabled={otp.sending || otp.cooldown > 0 || !formData.email}
                                    className="btn btn-secondary"
                                    style={{ whiteSpace: 'nowrap', minWidth: 110 }}
                                >
                                    {otp.sending ? '发送中...' : otp.cooldown > 0 ? `${otp.cooldown}s` : '获取验证码'}
                                </button>
                            </div>
                            {otp.error && <div style={{ color: '#ef4444', fontSize: '0.78rem', marginTop: 4 }}>{otp.error}</div>}
                            {otp.info && <div style={{ color: '#10b981', fontSize: '0.78rem', marginTop: 4 }}>{otp.info}</div>}
                        </div>
                    )}

                    <div className="form-group">
                        <label>密码</label>
                        <div className="input-wrapper">
                            <FiLock className="input-icon" />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                name="password"
                                className="input with-icon"
                                placeholder="请输入密码 (至少6位)"
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
                        <label>确认密码</label>
                        <div className="input-wrapper">
                            <FiLock className="input-icon" />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                name="confirmPassword"
                                className="input with-icon"
                                placeholder="请再次输入密码"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    <div className="form-options">
                        <label className="remember-me">
                            <input type="checkbox" required />
                            <span>我已阅读并同意 <a href="#">用户协议</a></span>
                        </label>
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary btn-lg auth-btn"
                        disabled={loading}
                    >
                        {loading ? '注册中...' : '注册'}
                    </button>
                </form>

                <div className="auth-footer">
                    <p>已有账号？ <Link to={withPrefix('/login')}>立即登录</Link></p>
                </div>
            </div>
        </div>
    )
}

export default Register

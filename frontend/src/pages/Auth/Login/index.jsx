import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FiMail, FiLock, FiEye, FiEyeOff } from 'react-icons/fi'
import { useAuthStore } from '../../../store/authStore'
import toast from 'react-hot-toast'
import './Auth.css'

const API_BASE = '/api'

function Login() {
    const navigate = useNavigate()
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
            toast.error('请填写完整信息')
            return
        }

        setLoading(true)

        try {
            const response = await fetch(`${API_BASE}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: formData.email,
                    password: formData.password
                })
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || '登录失败')
            }

            // 使用真实的 token 和用户信息
            login(data.user, data.token)
            toast.success('登录成功')

            // 根据角色跳转
            if (data.user.role === 'admin') {
                navigate('/admin')
            } else {
                navigate('/')
            }
        } catch (error) {
            toast.error(error.message || '邮箱或密码错误')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="auth-page">
            <div className="auth-container">
                <div className="auth-header">
                    <h1>欢迎回来</h1>
                    <p>登录您的 HaoDongXi 账号</p>
                </div>

                <form className="auth-form" onSubmit={handleSubmit}>
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

                    <div className="form-group">
                        <label>密码</label>
                        <div className="input-wrapper">
                            <FiLock className="input-icon" />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                name="password"
                                className="input with-icon"
                                placeholder="请输入密码"
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

                    <div className="form-options">
                        <label className="remember-me">
                            <input type="checkbox" />
                            <span>记住我</span>
                        </label>
                        <Link to="/forgot-password" className="forgot-password">忘记密码？</Link>
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary btn-lg auth-btn"
                        disabled={loading}
                    >
                        {loading ? '登录中...' : '登录'}
                    </button>
                </form>

                <div className="auth-footer">
                    <p>还没有账号？ <Link to="/register">立即注册</Link></p>
                </div>

                <div className="auth-divider">
                    <span>或</span>
                </div>

                <div className="guest-option">
                    <Link to="/products" className="btn btn-secondary">
                        游客购物（无需登录）
                    </Link>
                </div>


            </div>
        </div>
    )
}

export default Login

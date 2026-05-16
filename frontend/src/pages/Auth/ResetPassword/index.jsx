import { useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { FiLock, FiEye, FiEyeOff, FiCheck } from 'react-icons/fi'
import toast from 'react-hot-toast'
import '../Login/Auth.css'

function ResetPassword() {
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()
    const token = searchParams.get('token')

    const [formData, setFormData] = useState({
        password: '',
        confirmPassword: ''
    })
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)

    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (!formData.password || !formData.confirmPassword) {
            toast.error('请填写完整信息')
            return
        }

        if (formData.password.length < 6) {
            toast.error('密码至少6位')
            return
        }

        if (formData.password !== formData.confirmPassword) {
            toast.error('两次输入的密码不一致')
            return
        }

        setLoading(true)

        try {
            const response = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token,
                    password: formData.password
                })
            })

            const data = await response.json()

            if (response.ok) {
                setSuccess(true)
                toast.success(data.message || '密码重置成功')
            } else {
                toast.error(data.error || '重置失败')
            }
        } catch (error) {
            toast.error('网络错误，请稍后重试')
        } finally {
            setLoading(false)
        }
    }

    if (!token) {
        return (
            <div className="auth-page">
                <div className="auth-container">
                    <div className="auth-header">
                        <div className="error-icon">❌</div>
                        <h1>链接无效</h1>
                        <p>重置密码链接无效或已过期</p>
                    </div>
                    <div className="auth-footer" style={{ marginTop: '24px' }}>
                        <Link to="/forgot-password" className="btn btn-primary" style={{ width: '100%' }}>
                            重新请求重置链接
                        </Link>
                    </div>
                </div>
            </div>
        )
    }

    if (success) {
        return (
            <div className="auth-page">
                <div className="auth-container">
                    <div className="auth-header">
                        <div className="success-icon">
                            <FiCheck />
                        </div>
                        <h1>密码重置成功</h1>
                        <p>您的密码已更新，请使用新密码登录</p>
                    </div>
                    <div className="auth-footer" style={{ marginTop: '24px' }}>
                        <button
                            onClick={() => navigate('/login')}
                            className="btn btn-primary"
                            style={{ width: '100%' }}
                        >
                            前往登录
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="auth-page">
            <div className="auth-container">
                <div className="auth-header">
                    <h1>设置新密码</h1>
                    <p>请输入您的新密码</p>
                </div>

                <form className="auth-form" onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>新密码</label>
                        <div className="input-wrapper">
                            <FiLock className="input-icon" />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                name="password"
                                className="input with-icon"
                                placeholder="请输入新密码（至少6位）"
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
                                placeholder="请再次输入新密码"
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
                        {loading ? '重置中...' : '确认重置'}
                    </button>
                </form>
            </div>
        </div>
    )
}

export default ResetPassword

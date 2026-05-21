import { useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import '../../MerchantAuth/Auth.css'

function ResetPassword() {
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()
    const token = searchParams.get('token')

    const [formData, setFormData] = useState({
        password: '',
        confirmPassword: ''
    })
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
            <div className="merchant-auth-page">
                <div className="merchant-auth-card">
                    <h1 className="merchant-auth-title">链接无效</h1>
                    <p className="merchant-auth-sub">重置密码链接无效或已过期</p>
                    <div className="merchant-auth-footer">
                        <Link to="/forgot-password" className="merchant-auth-forgot">重新请求重置链接</Link>
                    </div>
                </div>
            </div>
        )
    }

    if (success) {
        return (
            <div className="merchant-auth-page">
                <div className="merchant-auth-card">
                    <h1 className="merchant-auth-title">密码重置成功</h1>
                    <p className="merchant-auth-sub">您的密码已更新，请使用新密码登录</p>
                    <button
                        onClick={() => navigate('/login')}
                        className="merchant-auth-btn"
                    >
                        前往登录
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="merchant-auth-page">
                    <div className="merchant-auth-card">
                        <h1 className="merchant-auth-title">设置新密码</h1>
                        <p className="merchant-auth-sub">请输入您的新密码</p>

                        <form className="merchant-auth-form" onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>新密码</label>
                                <input
                                    type="password"
                                    name="password"
                                    placeholder="请输入新密码（至少6位）"
                                    value={formData.password}
                                    onChange={handleChange}
                                />
                    </div>

                            <div className="form-group">
                                <label>确认密码</label>
                                <input
                                    type="password"
                                    name="confirmPassword"
                                    placeholder="请再次输入新密码"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                />
                    </div>

                    <button type="submit" className="merchant-auth-btn" disabled={loading}>
                        {loading ? '重置中...' : '确认重置'}
                    </button>
                </form>
            </div>
        </div>
    )
}

export default ResetPassword

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FiMail, FiArrowLeft, FiCheck } from 'react-icons/fi'
import toast from 'react-hot-toast'
import '../Login/Auth.css'

function ForgotPassword() {
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [submitted, setSubmitted] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (!email) {
            toast.error('请输入邮箱地址')
            return
        }

        setLoading(true)

        try {
            const response = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            })

            const data = await response.json()

            if (response.ok) {
                setSubmitted(true)
                toast.success(data.message || '重置邮件已发送')
            } else {
                toast.error(data.error || '请求失败')
            }
        } catch (error) {
            toast.error('网络错误，请稍后重试')
        } finally {
            setLoading(false)
        }
    }

    if (submitted) {
        return (
            <div className="auth-page">
                <div className="auth-container">
                    <div className="auth-header">
                        <div className="success-icon">
                            <FiCheck />
                        </div>
                        <h1>邮件已发送</h1>
                        <p>请检查您的邮箱 <strong>{email}</strong>，按照邮件中的链接重置密码</p>
                    </div>

                    <div className="auth-tips">
                        <p>• 邮件可能在垃圾邮件中，请注意查看</p>
                        <p>• 重置链接 30 分钟内有效</p>
                        <p>• 如未收到邮件，可重新提交请求</p>
                    </div>

                    <div className="auth-footer" style={{ marginTop: '24px' }}>
                        <Link to="/login" className="btn btn-secondary" style={{ width: '100%' }}>
                            返回登录
                        </Link>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="auth-page">
            <div className="auth-container">
                <div className="auth-header">
                    <h1>忘记密码</h1>
                    <p>输入您的注册邮箱，我们将发送重置链接</p>
                </div>

                <form className="auth-form" onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>邮箱地址</label>
                        <div className="input-wrapper">
                            <FiMail className="input-icon" />
                            <input
                                type="email"
                                className="input with-icon"
                                placeholder="请输入注册邮箱"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary btn-lg auth-btn"
                        disabled={loading}
                    >
                        {loading ? '发送中...' : '发送重置链接'}
                    </button>
                </form>

                <div className="auth-footer">
                    <Link to="/login" className="back-link">
                        <FiArrowLeft /> 返回登录
                    </Link>
                </div>
            </div>
        </div>
    )
}

export default ForgotPassword

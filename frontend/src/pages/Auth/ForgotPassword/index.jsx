import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FiMail, FiArrowLeft } from 'react-icons/fi'
import { useStorefront } from '../../../store/storefrontStore'
import toast from 'react-hot-toast'
import '../../MerchantAuth/Auth.css'

function ForgotPassword() {
    const storefront = useStorefront()
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [submitted, setSubmitted] = useState(false)

    const loginPath = window.location.pathname.includes('/v/')
        ? window.location.pathname.replace(/\/forgot-password.*$/, '/login')
        : '/login'

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
                body: JSON.stringify({ 
                    email,
                    storefrontSlug: storefront?.slug
                })
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
            <div className="merchant-auth-page">
                <div className="merchant-auth-card">
                    <h1 className="merchant-auth-title">邮件已发送</h1>
                    <p className="merchant-auth-sub">
                        请检查您的邮箱 <strong>{email}</strong>，按照邮件中的链接重置密码
                    </p>

                    <div className="merchant-auth-error" style={{ background: '#f8fafc', borderColor: '#e2e8f0', color: '#475569' }}>
                        <div className="merchant-auth-help">• 邮件可能在垃圾邮件中，请注意查看</div>
                        <div className="merchant-auth-help">• 重置链接 30 分钟内有效</div>
                        <div className="merchant-auth-help">• 如未收到邮件，可重新提交请求</div>
                    </div>

                    <div className="merchant-auth-footer">
                        <Link to={loginPath} className="merchant-auth-forgot">返回登录</Link>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="merchant-auth-page">
            <div className="merchant-auth-card">
                <h1 className="merchant-auth-title">忘记密码</h1>
                <p className="merchant-auth-sub">输入您的注册邮箱，我们将发送重置链接</p>

                <form onSubmit={handleSubmit} className="merchant-auth-form">
                    <div className="form-group">
                        <label>邮箱地址</label>
                        <input
                            type="email"
                            placeholder="请输入注册邮箱"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    <button type="submit" className="merchant-auth-btn" disabled={loading}>
                        {loading ? '发送中...' : '发送重置链接'}
                    </button>
                </form>

                <p className="merchant-auth-footer">
                    <Link to={loginPath} className="merchant-auth-forgot">
                        <FiArrowLeft style={{ verticalAlign: '-2px', marginRight: 4 }} />
                        返回登录
                    </Link>
                </p>
            </div>
        </div>
    )
}

export default ForgotPassword

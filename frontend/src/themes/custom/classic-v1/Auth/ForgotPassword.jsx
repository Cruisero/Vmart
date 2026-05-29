import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FiMail, FiArrowLeft } from 'react-icons/fi'
import { useBuyerL } from '../../../../hooks/useBuyerL'
import { useStorefront } from '../../../../store/storefrontStore'
import { getStorefrontBasePath } from '../../../../utils/agentDomain'
import toast from 'react-hot-toast'

export default function ClassicV1ForgotPassword() {
    const L = useBuyerL()
    const storefront = useStorefront()
    const prefix = storefront ? getStorefrontBasePath(storefront) : ''
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [submitted, setSubmitted] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (!email) {
            toast.error(L('auth.emailPlaceholder', '请输入邮箱地址'))
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
                toast.success(data.message || L('common.success', '重置邮件已发送'))
            } else {
                toast.error(data.error || L('common.failed', '请求失败'))
            }
        } catch (error) {
            toast.error(L('common.networkError', '网络错误，请稍后重试'))
        } finally {
            setLoading(false)
        }
    }

    if (submitted) {
        return (
            <div className="auth-page">
                <div className="auth-container">
                    <div className="auth-header" style={{ textAlign: 'center' }}>
                        <h1>{L('邮件已发送', 'Email Sent')}</h1>
                        <p style={{ marginTop: 8 }}>
                            {L('请检查您的邮箱', 'Please check your email')} <strong>{email}</strong> {L('按照邮件中的链接重置密码', 'and follow the instructions to reset your password')}
                        </p>
                    </div>

                    <div style={{
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        padding: '12px 14px',
                        fontSize: '0.78rem',
                        color: '#64748b',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                        marginBottom: '16px'
                    }}>
                        <div>• {L('邮件可能在垃圾邮件中，请注意查看', 'Check your spam folder if you do not receive it')}</div>
                        <div>• {L('重置链接 30 分钟内有效', 'The link is valid for 30 minutes')}</div>
                    </div>

                    <div className="guest-option">
                        <Link to={`${prefix}/login`} className="btn btn-secondary" style={{ width: '100%' }}>{L('auth.goLogin', '返回登录')}</Link>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="auth-page">
            <div className="auth-container">
                <div className="auth-header">
                    <h1>{L('忘记密码', 'Forgot Password')}</h1>
                    <p>{L('输入您的注册邮箱，我们将发送重置链接', 'Enter your email to receive a password reset link')}</p>
                </div>

                <form className="auth-form" onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>{L('order.email')}</label>
                        <div className="input-wrapper">
                            <FiMail className="input-icon" size={15} />
                            <input
                                type="email"
                                className="input with-icon"
                                placeholder={L('auth.emailPlaceholder')}
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                autoComplete="email"
                            />
                        </div>
                    </div>

                    <button type="submit" className="btn btn-primary auth-btn" disabled={loading}>
                        {loading ? L('common.loading', '发送中...') : L('发送重置链接', 'Send Reset Link')}
                    </button>
                </form>

                <div className="auth-footer" style={{ textAlign: 'center' }}>
                    <Link to={`${prefix}/login`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}>
                        <FiArrowLeft size={14} />
                        {L('auth.goLogin', '返回登录')}
                    </Link>
                </div>
            </div>
        </div>
    )
}

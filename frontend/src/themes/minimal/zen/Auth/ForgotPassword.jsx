import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FiMail, FiLock, FiArrowLeft } from 'react-icons/fi'
import { useBuyerL } from '../../../../hooks/useBuyerL'
import { useStorefront } from '../../../../store/storefrontStore'
import { getStorefrontBasePath } from '../../../../utils/agentDomain'
import toast from 'react-hot-toast'
import './Auth.css'

export default function ZenForgotPassword() {
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
            <div className="za-page">
                <div className="za-card" style={{ textAlign: 'center' }}>
                    <div className="za-header">
                        <div className="za-eyebrow">RESET LINK SENT</div>
                        <h1 className="za-title">{L('邮件已发送', 'Email Sent')}</h1>
                        <p className="za-sub" style={{ marginTop: 8 }}>
                            {L('请检查您的邮箱', 'Please check your email')} <strong>{email}</strong> {L('按照邮件中的链接重置密码', 'and follow the instructions to reset your password')}
                        </p>
                    </div>

                    <div style={{
                        background: '#faf9f6',
                        border: '1px solid #e7e1d7',
                        borderRadius: '8px',
                        padding: '12px 14px',
                        textAlign: 'left',
                        fontSize: '0.78rem',
                        color: '#6b6258',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                        marginBottom: '16px'
                    }}>
                        <div>• {L('邮件可能在垃圾邮件中，请注意查看', 'Check your spam folder if you do not receive it')}</div>
                        <div>• {L('重置链接 30 分钟内有效', 'The link is valid for 30 minutes')}</div>
                    </div>

                    <Link to={`${prefix}/login`} className="za-guest">{L('auth.goLogin', '返回登录')}</Link>
                </div>
            </div>
        )
    }

    return (
        <div className="za-page">
            <div className="za-card">
                <div className="za-header">
                    <div className="za-eyebrow">PASSWORD RESET</div>
                    <h1 className="za-title">{L('忘记密码', 'Forgot Password')}</h1>
                    <p className="za-sub">{L('输入您的注册邮箱，我们将发送重置链接', 'Enter your email to receive a password reset link')}</p>
                </div>

                <form className="za-form" onSubmit={handleSubmit}>
                    <div className="za-field">
                        <label className="za-label">{L('order.email')}</label>
                        <div className="za-input-wrap">
                            <FiMail className="za-input-icon" size={15} />
                            <input
                                type="email"
                                className="za-input"
                                placeholder={L('auth.emailPlaceholder')}
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                autoComplete="email"
                            />
                        </div>
                    </div>

                    <button type="submit" className="za-submit" disabled={loading}>
                        {loading ? <span className="za-spinner" /> : L('发送重置链接', 'Send Reset Link')}
                    </button>
                </form>

                <div className="za-footer">
                    <Link to={`${prefix}/login`} className="za-link" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <FiArrowLeft size={14} />
                        {L('auth.goLogin', '返回登录')}
                    </Link>
                </div>
            </div>
        </div>
    )
}

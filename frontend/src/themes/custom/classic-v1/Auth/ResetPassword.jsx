import { useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { FiLock, FiEye, FiEyeOff, FiArrowLeft } from 'react-icons/fi'
import { useBuyerL } from '../../../../hooks/useBuyerL'
import { useStorefront } from '../../../../store/storefrontStore'
import { getStorefrontBasePath } from '../../../../utils/agentDomain'
import toast from 'react-hot-toast'

export default function ClassicV1ResetPassword() {
    const L = useBuyerL()
    const navigate = useNavigate()
    const storefront = useStorefront()
    const prefix = storefront ? getStorefrontBasePath(storefront) : ''
    const [searchParams] = useSearchParams()
    const token = searchParams.get('token')

    const [formData, setFormData] = useState({
        password: '',
        confirmPassword: ''
    })
    const [showPw, setShowPw] = useState(false)
    const [showConfirmPw, setShowConfirmPw] = useState(false)
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)

    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (!formData.password || !formData.confirmPassword) {
            toast.error(L('common.fillAll', '请填写完整信息'))
            return
        }

        if (formData.password.length < 6) {
            toast.error(L('auth.passwordLength', '密码至少6位'))
            return
        }

        if (formData.password !== formData.confirmPassword) {
            toast.error(L('auth.passwordMismatch', '两次输入的密码不一致'))
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
                toast.success(data.message || L('common.success', '密码重置成功'))
            } else {
                toast.error(data.error || L('common.failed', '重置失败'))
            }
        } catch (error) {
            toast.error(L('common.networkError', '网络错误，请稍后重试'))
        } finally {
            setLoading(false)
        }
    }

    if (!token) {
        return (
            <div className="auth-page">
                <div className="auth-container" style={{ textAlign: 'center' }}>
                    <div className="auth-header">
                        <h1>{L('链接无效', 'Invalid Link')}</h1>
                        <p style={{ marginTop: 8 }}>{L('重置密码链接无效或已过期', 'The password reset link is invalid or has expired')}</p>
                    </div>

                    <div className="guest-option">
                        <Link to={`${prefix}/forgot-password`} className="btn btn-secondary" style={{ width: '100%' }}>{L('重新请求重置链接', 'Request Another Link')}</Link>
                    </div>
                </div>
            </div>
        )
    }

    if (success) {
        return (
            <div className="auth-page">
                <div className="auth-container" style={{ textAlign: 'center' }}>
                    <div className="auth-header">
                        <h1>{L('密码重置成功', 'Password Reset Successful')}</h1>
                        <p style={{ marginTop: 8 }}>{L('您的密码已更新，请使用新密码登录', 'Your password has been updated. Please log in with your new password.')}</p>
                    </div>

                    <button
                        onClick={() => navigate(`${prefix}/login`)}
                        className="btn btn-primary auth-btn"
                        style={{ width: '100%' }}
                    >
                        {L('auth.goLogin', '前往登录')}
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="auth-page">
            <div className="auth-container">
                <div className="auth-header">
                    <h1>{L('设置新密码', 'Set New Password')}</h1>
                    <p>{L('请输入您的新密码', 'Please enter your new password below')}</p>
                </div>

                <form className="auth-form" onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>{L('新密码', 'New Password')}</label>
                        <div className="input-wrapper">
                            <FiLock className="input-icon" size={15} />
                            <input
                                type={showPw ? 'text' : 'password'}
                                name="password"
                                className="input with-icon"
                                placeholder={L('请输入新密码（至少6位）', 'Enter new password (min 6 chars)')}
                                value={formData.password}
                                onChange={handleChange}
                                autoComplete="new-password"
                            />
                            <button type="button" className="password-toggle" onClick={() => setShowPw(!showPw)}>
                                {showPw ? <FiEyeOff size={15} /> : <FiEye size={15} />}
                            </button>
                        </div>
                    </div>

                    <div className="form-group">
                        <label>{L('确认密码', 'Confirm Password')}</label>
                        <div className="input-wrapper">
                            <FiLock className="input-icon" size={15} />
                            <input
                                type={showConfirmPw ? 'text' : 'password'}
                                name="confirmPassword"
                                className="input with-icon"
                                placeholder={L('请再次输入新密码', 'Re-enter new password')}
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                autoComplete="new-password"
                            />
                            <button type="button" className="password-toggle" onClick={() => setShowConfirmPw(!showConfirmPw)}>
                                {showConfirmPw ? <FiEyeOff size={15} /> : <FiEye size={15} />}
                            </button>
                        </div>
                    </div>

                    <button type="submit" className="btn btn-primary auth-btn" disabled={loading}>
                        {loading ? L('common.loading', '重置中...') : L('确认重置', 'Reset Password')}
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

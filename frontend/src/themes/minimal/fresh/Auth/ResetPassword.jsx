import { useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { FiLock, FiEye, FiEyeOff, FiArrowLeft } from 'react-icons/fi'
import { useBuyerL } from '../../../../hooks/useBuyerL'
import { useStorefront } from '../../../../store/storefrontStore'
import { getStorefrontBasePath } from '../../../../utils/agentDomain'
import toast from 'react-hot-toast'
import './Auth.css'

export default function FreshResetPassword() {
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
            <div className="fa-page">
                <div className="fa-card" style={{ textAlign: 'center' }}>
                    <div className="fa-header">
                        <div className="fa-logo" style={{ color: '#ef4444', background: 'rgba(239, 68, 68, 0.08)' }}>
                            <FiLock size={20} />
                        </div>
                        <h1 className="fa-title">{L('链接无效', 'Invalid Link')}</h1>
                        <p className="fa-sub" style={{ marginTop: 8 }}>{L('重置密码链接无效或已过期', 'The password reset link is invalid or has expired')}</p>
                    </div>

                    <Link to={`${prefix}/forgot-password`} className="fa-guest">{L('重新请求重置链接', 'Request Another Link')}</Link>
                </div>
            </div>
        )
    }

    if (success) {
        return (
            <div className="fa-page">
                <div className="fa-card" style={{ textAlign: 'center' }}>
                    <div className="fa-header">
                        <div className="fa-logo">
                            <FiLock size={20} />
                        </div>
                        <h1 className="fa-title">{L('密码重置成功', 'Password Reset Successful')}</h1>
                        <p className="fa-sub" style={{ marginTop: 8 }}>{L('您的密码已更新，请使用新密码登录', 'Your password has been updated. Please log in with your new password.')}</p>
                    </div>

                    <button
                        onClick={() => navigate(`${prefix}/login`)}
                        className="fa-submit"
                    >
                        {L('auth.goLogin', '前往登录')}
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="fa-page">
            <div className="fa-card">
                <div className="fa-header">
                    <div className="fa-logo">
                        <FiLock size={20} />
                    </div>
                    <h1 className="fa-title">{L('设置新密码', 'Set New Password')}</h1>
                    <p className="fa-sub">{L('请输入您的新密码', 'Please enter your new password below')}</p>
                </div>

                <form className="fa-form" onSubmit={handleSubmit}>
                    <div className="fa-field">
                        <label className="fa-label">{L('新密码', 'New Password')}</label>
                        <div className="fa-input-wrap">
                            <FiLock className="fa-input-icon" size={15} />
                            <input
                                type={showPw ? 'text' : 'password'}
                                name="password"
                                className="fa-input"
                                placeholder={L('请输入新密码（至少6位）', 'Enter new password (min 6 chars)')}
                                value={formData.password}
                                onChange={handleChange}
                                autoComplete="new-password"
                            />
                            <button type="button" className="fa-toggle-pw" onClick={() => setShowPw(!showPw)}>
                                {showPw ? <FiEyeOff size={15} /> : <FiEye size={15} />}
                            </button>
                        </div>
                    </div>

                    <div className="fa-field">
                        <label className="fa-label">{L('确认密码', 'Confirm Password')}</label>
                        <div className="fa-input-wrap">
                            <FiLock className="fa-input-icon" size={15} />
                            <input
                                type={showConfirmPw ? 'text' : 'password'}
                                name="confirmPassword"
                                className="fa-input"
                                placeholder={L('请再次输入新密码', 'Re-enter new password')}
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                autoComplete="new-password"
                            />
                            <button type="button" className="fa-toggle-pw" onClick={() => setShowConfirmPw(!showConfirmPw)}>
                                {showConfirmPw ? <FiEyeOff size={15} /> : <FiEye size={15} />}
                            </button>
                        </div>
                    </div>

                    <button type="submit" className="fa-submit" disabled={loading}>
                        {loading ? <span className="fa-spinner" /> : L('确认重置', 'Reset Password')}
                    </button>
                </form>

                <div className="fa-footer">
                    <Link to={`${prefix}/login`} className="fa-link" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <FiArrowLeft size={14} />
                        {L('auth.goLogin', '返回登录')}
                    </Link>
                </div>
            </div>
        </div>
    )
}

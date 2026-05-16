import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import './VerifyEmail.css'

function VerifyEmail() {
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()
    const { user, updateUser } = useAuthStore()
    const [status, setStatus] = useState('verifying') // verifying, success, error
    const [message, setMessage] = useState('')

    useEffect(() => {
        const token = searchParams.get('token')

        if (!token) {
            setStatus('error')
            setMessage('验证链接无效')
            return
        }

        // 验证邮箱
        fetch(`/api/auth/verify-email?token=${token}`)
            .then(res => res.json())
            .then(data => {
                if (data.error) {
                    setStatus('error')
                    setMessage(data.error)
                } else {
                    setStatus('success')
                    setMessage(data.message)
                    // 更新用户状态，标记邮箱已验证
                    if (user) {
                        updateUser({ emailVerified: true })
                    }
                }
            })
            .catch(err => {
                setStatus('error')
                setMessage('验证失败，请稍后重试')
            })
    }, [searchParams])

    return (
        <div className="verify-email-page">
            <div className="verify-email-card">
                {status === 'verifying' && (
                    <>
                        <div className="verify-icon loading">⏳</div>
                        <h1>正在验证...</h1>
                        <p>请稍候，我们正在验证您的邮箱</p>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <div className="verify-icon success">✅</div>
                        <h1>验证成功！</h1>
                        <p>{message}</p>
                        <button className="btn-primary" onClick={() => navigate('/login')}>
                            前往登录
                        </button>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <div className="verify-icon error">❌</div>
                        <h1>验证失败</h1>
                        <p>{message}</p>
                        <button className="btn-secondary" onClick={() => navigate('/')}>
                            返回首页
                        </button>
                    </>
                )}
            </div>
        </div>
    )
}

export default VerifyEmail

import { useState, useEffect } from 'react'

/**
 * 注册 OTP Hook
 * @param {object} opts
 *  - scope: 'merchant_register' | 'customer_register'
 *  - getEmail: () => string
 *  - getSlug: () => string | null  (仅 customer_register 需要)
 */
export function useRegisterOtp({ scope, getEmail, getSlug }) {
    const [enabled, setEnabled] = useState(false)
    const [code, setCode] = useState('')
    const [sending, setSending] = useState(false)
    const [cooldown, setCooldown] = useState(0)
    const [error, setError] = useState('')
    const [info, setInfo] = useState('')

    useEffect(() => {
        fetch('/api/settings/public/otp')
            .then(r => r.json())
            .then(d => {
                setEnabled(scope === 'merchant_register' ? !!d.merchantRegisterOtp : !!d.customerRegisterOtp)
            })
            .catch(() => setEnabled(false))
    }, [scope])

    useEffect(() => {
        if (cooldown <= 0) return
        const t = setTimeout(() => setCooldown(c => c - 1), 1000)
        return () => clearTimeout(t)
    }, [cooldown])

    const sendCode = async () => {
        setError(''); setInfo('')
        const email = getEmail()
        if (!email) { setError('请先填写邮箱'); return }
        setSending(true)
        try {
            const url = scope === 'merchant_register' ? '/api/platform/otp/send' : '/api/customer/otp/send'
            const body = { email }
            if (scope === 'merchant_register') body.scope = 'merchant_register'
            if (scope === 'customer_register') body.slug = getSlug?.() || null
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            })
            const data = await res.json()
            if (!res.ok) { setError(data.error || '发送失败'); return }
            setInfo('验证码已发送，请查收邮箱')
            setCooldown(60)
        } catch {
            setError('网络错误')
        } finally {
            setSending(false)
        }
    }

    return { enabled, code, setCode, sending, cooldown, error, info, sendCode }
}

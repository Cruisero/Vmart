import { useState, useEffect } from 'react'

export default function TrialCountdown({ shop, needUpgrade, onUpgrade }) {
    const [secondsLeft, setSecondsLeft] = useState(0)

    useEffect(() => {
        if (!shop) return
        const update = () => {
            const diff = Math.max(0, Math.floor((new Date(shop.trialEndsAt) - new Date()) / 1000))
            setSecondsLeft(diff)
        }
        update()
        const timer = setInterval(update, 1000)
        return () => clearInterval(timer)
    }, [shop])

    if (!shop) return null

    const fmt = (s) => {
        const h = Math.floor(s / 3600)
        const m = Math.floor((s % 3600) / 60)
        const sec = s % 60
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
    }

    if (needUpgrade) {
        return (
            <div className="trial-bar trial-expired">
                <span>⚠️ 试用已到期，商城部分功能受限</span>
                <button className="trial-upgrade-btn" onClick={onUpgrade}>立即升级套餐</button>
            </div>
        )
    }

    if (shop.plan !== 'FREE') {
        const expiry = shop.planExpiresAt ? new Date(shop.planExpiresAt).toLocaleDateString() : '永久'
        return (
            <div className="trial-bar trial-paid">
                <span>💎 {shop.plan === 'PRO' ? '专业版' : '入门版'} · 到期时间：{expiry}</span>
            </div>
        )
    }

    return (
        <div className="trial-bar trial-active">
            <div className="trial-info">
                <span className="trial-label">🎉 免费体验剩余时间</span>
                <span className="trial-timer">{fmt(secondsLeft)}</span>
            </div>
            <button className="trial-upgrade-btn" onClick={onUpgrade}>升级套餐 →</button>
        </div>
    )
}

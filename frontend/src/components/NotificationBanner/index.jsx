import { useState, useEffect } from 'react'
import './NotificationBanner.css'

export default function NotificationBanner({ skin = 'classic' }) {
    const [notification, setNotification] = useState(null)
    const [dismissed, setDismissed] = useState(false)

    useEffect(() => {
        const fetchNotification = async () => {
            try {
                const res = await fetch('/api/settings/public')
                const data = await res.json()
                const s = data.settings || {}
                if (s.notificationEnabled === 'true' && s.notificationText) {
                    // Check sessionStorage for dismissal
                    const dismissedKey = `notification_dismissed_${encodeURIComponent(s.notificationText).slice(0, 32)}`
                    if (sessionStorage.getItem(dismissedKey)) {
                        setDismissed(true)
                    }
                    setNotification({
                        text: s.notificationText,
                        link: s.notificationLink || '',
                        dismissedKey
                    })
                }
            } catch {
                // 静默失败
            }
        }
        fetchNotification()
    }, [])

    if (!notification || dismissed) return null

    const handleDismiss = (e) => {
        e.stopPropagation()
        e.preventDefault()
        sessionStorage.setItem(notification.dismissedKey, '1')
        setDismissed(true)
    }

    const content = (
        <div className={`nb-banner nb-${skin}`}>
            <div className="nb-inner">

                <div className="nb-marquee-wrap">
                    <div className="nb-marquee">
                        <span className="nb-text">{notification.text}</span>
                        <span className="nb-text nb-text-dup" aria-hidden="true">{notification.text}</span>
                    </div>
                </div>
                <button className="nb-close" onClick={handleDismiss} aria-label="关闭通知">
                    ✕
                </button>
            </div>
        </div>
    )

    if (notification.link) {
        return (
            <a href={notification.link} className="nb-link-wrap" target="_blank" rel="noopener noreferrer">
                {content}
            </a>
        )
    }

    return content
}

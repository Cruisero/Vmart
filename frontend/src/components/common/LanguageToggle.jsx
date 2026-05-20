/**
 * 语言切换按钮（中 / EN 分段控件）
 * 仅在商户店铺语言设置为「auto」时显示
 * 选择后存入 localStorage，下次访问保留
 */
import { useTranslation } from 'react-i18next'
import { useStorefront } from '../../store/storefrontStore'
import './LanguageToggle.css'

export default function LanguageToggle({ className = '', alwaysShow = false }) {
    const { i18n } = useTranslation()
    const storefront = useStorefront()

    // 只有商户设置为「auto」时显示切换按钮
    if (!alwaysShow && (!storefront || storefront.language !== 'auto')) return null

    const storageKey = storefront?.slug ? `vmart-lang-${storefront.slug}` : 'vmart-lang'
    const current = i18n.language === 'en' ? 'en' : 'zh'

    const switchTo = (lang) => {
        if (lang === current) return
        localStorage.setItem(storageKey, lang)
        i18n.changeLanguage(lang)
    }

    return (
        <div className={`vmart-lang-toggle ${className}`} role="group" aria-label="Language">
            <button
                type="button"
                className={`vlt-option ${current === 'zh' ? 'active' : ''}`}
                onClick={() => switchTo('zh')}
                aria-pressed={current === 'zh'}
                aria-label="切换到中文"
            >
                中
            </button>
            <button
                type="button"
                className={`vlt-option ${current === 'en' ? 'active' : ''}`}
                onClick={() => switchTo('en')}
                aria-pressed={current === 'en'}
                aria-label="Switch to English"
            >
                EN
            </button>
        </div>
    )
}

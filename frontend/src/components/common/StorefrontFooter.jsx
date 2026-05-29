/**
 * Shared premium storefront footer with brand, links, and contact bubbles.
 * Can be imported by any theme to render a consistent footer.
 *
 * CSS lives in Storefront/Storefront.css (classes: sf-footer-new, sf-footer-*, etc.)
 */
import { Link } from 'react-router-dom'
import { useStorefront, useStorefrontPath } from '../../store/storefrontStore'
import { useTranslation } from 'react-i18next'

const TelegramIcon = () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.11.02-1.89 1.2-5.33 3.52-.5.35-.96.52-1.37.51-.45-.01-1.32-.26-1.97-.47-.79-.26-1.42-.4-1.37-.84.03-.23.35-.46.96-.71 3.76-1.63 6.27-2.71 7.54-3.23 3.58-1.48 4.32-1.74 4.81-1.75.11 0 .35.03.5.16.13.12.17.29.19.41-.02.11-.02.26-.03.4z"/>
    </svg>
)

const WhatsappIcon = () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
        <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0012.04 2zm5.8 14.16c-.24.67-1.18 1.24-1.62 1.29-.44.05-.98.24-2.95-.54-2.52-1-4.1-3.61-4.23-3.78-.13-.17-.99-1.32-.99-2.5 0-1.18.62-1.76.84-2 .22-.24.49-.3.65-.3.16 0 .33 0 .46.01.14.01.32-.05.5.38.19.46.65 1.58.71 1.7.06.12.1.26.02.43-.08.17-.12.27-.24.42-.12.15-.26.33-.37.44-.12.12-.25.26-.11.5.14.24.63 1.04 1.35 1.68.93.82 1.71 1.08 1.95 1.2.24.12.38.1.53-.06.15-.17.65-.75.82-.99.17-.24.34-.2.58-.11.24.09 1.52.72 1.78.85.26.13.43.19.49.3.06.11.06.64-.18 1.31z"/>
    </svg>
)

const EmailIcon = () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
        <polyline points="22,6 12,13 2,6"/>
    </svg>
)

const QqIcon = () => (
    <svg viewBox="0 0 16 16" width="18" height="18" fill="currentColor">
        <path d="M6.048 3.323c.022.277-.13.523-.338.55-.21.026-.397-.176-.419-.453s.13-.523.338-.55c.21-.026.397.176.42.453Zm2.265-.24c-.603-.146-.894.256-.936.333-.027.048-.008.117.037.15.045.035.092.025.119-.003.361-.39.751-.172.829-.129l.011.007c.053.024.147.028.193-.098.023-.063.017-.11-.006-.142-.016-.023-.089-.08-.247-.118"/>
        <path d="M11.727 6.719c0-.022.01-.375.01-.557 0-3.07-1.45-6.156-5.015-6.156S1.708 3.092 1.708 6.162c0 .182.01.535.01.557l-.72 1.795a26 26 0 0 0-.534 1.508c-.68 2.187-.46 3.093-.292 3.113.36.044 1.401-1.647 1.401-1.647 0 .979.504 2.256 1.594 3.179-.408.126-.907.319-1.228.556-.29.213-.253.43-.201.518.228.386 3.92.246 4.985.126 1.065.12 4.756.26 4.984-.126.052-.088.088-.305-.2-.518-.322-.237-.822-.43-1.23-.557 1.09-.922 1.594-2.2 1.594-3.178 0 0 1.041 1.69 1.401 1.647.168-.02.388-.926-.292-3.113a26 26 0 0 0-.534-1.508l-.72-1.795ZM9.773 5.53a.1.1 0 0 1-.009.096c-.109.159-1.554.943-3.033.943h-.017c-1.48 0-2.925-.784-3.034-.943a.1.1 0 0 1-.018-.055q0-.022.01-.04c.13-.287 1.43-.606 3.042-.606h.017c1.611 0 2.912.319 3.042.605m-4.32-.989c-.483.022-.896-.529-.922-1.229s.344-1.286.828-1.308c.483-.022.896.529.922 1.23.027.7-.344 1.286-.827 1.307Zm2.538 0c-.484-.022-.854-.607-.828-1.308.027-.7.44-1.25.923-1.23.483.023.853.608.827 1.309-.026.7-.439 1.251-.922 1.23ZM2.928 8.99q.32.063.639.117v2.336s1.104.222 2.21.068V9.363q.49.027.937.023h.017c1.117.013 2.474-.136 3.786-.396.097.622.151 1.386.097 2.284-.146 2.45-1.6 3.99-3.846 4.012h-.091c-2.245-.023-3.7-1.562-3.846-4.011-.054-.9 0-1.663.097-2.285"/>
    </svg>
)

const WechatIcon = () => (
    <svg viewBox="0 0 16 16" width="18" height="18" fill="currentColor">
        <path d="M11.176 14.429c-2.665 0-4.826-1.8-4.826-4.018 0-2.22 2.159-4.02 4.824-4.02S16 8.191 16 10.411c0 1.21-.65 2.301-1.666 3.036a.32.32 0 0 0-.12.366l.218.81a.6.6 0 0 1 .029.117.166.166 0 0 1-.162.162.2.2 0 0 1-.092-.03l-1.057-.61a.5.5 0 0 0-.256-.074.5.5 0 0 0-.142.021 5.7 5.7 0 0 1-1.576.22M9.064 9.542a.647.647 0 1 0 .557-1 .645.645 0 0 0-.646.647.6.6 0 0 0 .09.353Zm3.232.001a.646.646 0 1 0 .546-1 .645.645 0 0 0-.644.644.63.63 0 0 0 .098.356"/>
        <path d="M0 6.826c0 1.455.781 2.765 2.001 3.656a.385.385 0 0 1 .143.439l-.161.6-.1.373a.5.5 0 0 0-.032.14.19.19 0 0 0 .193.193q.06 0 .111-.029l1.268-.733a.6.6 0 0 1 .308-.088q.088 0 .171.025a6.8 6.8 0 0 0 1.625.26 4.5 4.5 0 0 1-.177-1.251c0-2.936 2.785-5.02 5.824-5.02l.15.002C10.587 3.429 8.392 2 5.796 2 2.596 2 0 4.16 0 6.826m4.632-1.555a.77.77 0 1 1-1.54 0 .77.77 0 0 1 1.54 0m3.875 0a.77.77 0 1 1-1.54 0 .77.77 0 0 1 1.54 0"/>
    </svg>
)

const typeClassMap = {
    telegram: 'tg',
    whatsapp: 'wa',
    email: 'mail',
    qq: 'qq',
    wechat: 'wx'
}

const renderContactIcon = (type) => {
    switch (type) {
        case 'telegram': return <TelegramIcon />
        case 'whatsapp': return <WhatsappIcon />
        case 'email': return <EmailIcon />
        case 'qq': return <QqIcon />
        case 'wechat': return <WechatIcon />
        default: return null
    }
}

export default function StorefrontFooter() {
    const storefront = useStorefront()
    const { withPrefix } = useStorefrontPath()
    const { t } = useTranslation()

    if (!storefront) return null

    const {
        shopName,
        shopLogo,
        contactEnabled,
        contactTelegram,
        contactWhatsapp,
        contactEmail,
        contactQq,
        contactWechat,
        contactLinks
    } = storefront

    const currentYear = new Date().getFullYear()

    let parsedLinks = contactLinks
    if (typeof contactLinks === 'string') {
        try {
            parsedLinks = JSON.parse(contactLinks)
        } catch (e) {
            parsedLinks = null
        }
    }

    const hasDynamicLinks = Array.isArray(parsedLinks) && parsedLinks.length > 0

    // Determine if we should show any contact cards
    const showContacts = contactEnabled && (hasDynamicLinks || contactTelegram || contactWhatsapp || contactEmail || contactQq || contactWechat)

    // Formulate Email href
    const emailHref = contactEmail ? `mailto:${contactEmail}` : ''

    // Formulate QQ href
    const qqHref = contactQq ? (contactQq.startsWith('http') ? contactQq : `tencent://message/?uin=${contactQq}`) : ''

    // WeChat click handler
    const handleWechatClick = (e) => {
        if (!contactWechat) return
        if (contactWechat.startsWith('http')) return // Let default click open the QR code page
        e.preventDefault()
        navigator.clipboard.writeText(contactWechat)
        alert(t('auth.copied', '已复制微信号：') + contactWechat)
    }

    const rawSkin = storefront?.shopSkin || 'zen'
    const skin = rawSkin.startsWith('custom:') ? rawSkin.split(':')[1] : rawSkin

    return (
        <footer className={`sf-footer-new sf-footer-${skin}`}>
            <div className="sf-footer-inner">
                <div className="sf-footer-row">
                    {/* Left side: Brand/Logo/Name & Slogan */}
                    <div className="sf-footer-brand">
                        {shopLogo ? (
                            <img src={shopLogo} alt={shopName} className="sf-footer-brand-logo" />
                        ) : (
                            <>
                                <div className="sf-footer-brand-logo-fallback">
                                    {shopName ? shopName.slice(0, 1).toUpperCase() : 'S'}
                                </div>
                                <span className="sf-footer-brand-name">{shopName}</span>
                            </>
                        )}
                        <span className="sf-footer-brand-divider">|</span>
                        <span className="sf-footer-slogan">
                            {t('footer.slogan', '专业的在线工作室，为您提供优质的产品和服务。')}
                        </span>
                    </div>

                    {/* Right side: Quick Links & Contact Bubbles */}
                    <div className="sf-footer-actions">
                        <div className="sf-footer-links">
                            <Link to={withPrefix('/')}>{t('nav.home', '首页')}</Link>
                            <Link to={withPrefix('/order-query')}>{t('nav.orderQuery', '订单查询')}</Link>
                            <Link to={withPrefix('/refund-policy')}>{t('policy.refund', '售后政策')}</Link>
                            <Link to={withPrefix('/terms')}>{t('policy.terms', '服务条款')}</Link>
                        </div>
                        
                        {showContacts && (
                            <>
                                <span className="sf-footer-brand-divider actions-divider">|</span>
                                <div className="sf-footer-contacts">
                                    {hasDynamicLinks ? (
                                        parsedLinks.map((item) => {
                                            const typeClass = typeClassMap[item.type] || ''
                                            let href = '#'
                                            let target = '_self'

                                            if (item.type === 'email') {
                                                href = item.value.startsWith('mailto:') ? item.value : `mailto:${item.value}`
                                            } else if (item.type === 'qq') {
                                                href = item.value.startsWith('http') ? item.value : `tencent://message/?uin=${item.value}`
                                            } else if (item.type === 'wechat') {
                                                href = item.value.startsWith('http') ? item.value : '#'
                                                target = item.value.startsWith('http') ? '_blank' : '_self'
                                            } else {
                                                href = item.value
                                                target = '_blank'
                                            }

                                            const defaultTitle = item.type.charAt(0).toUpperCase() + item.type.slice(1)
                                            let tooltipTitle = item.label || defaultTitle
                                            if (!item.label && (item.type === 'qq' || item.type === 'wechat') && !item.value.startsWith('http')) {
                                                tooltipTitle = `${defaultTitle}: ${item.value}`
                                            }

                                            return (
                                                <a
                                                    key={item.id || `${item.type}-${item.value}`}
                                                    href={href}
                                                    target={target}
                                                    rel="noopener noreferrer"
                                                    onClick={(e) => {
                                                        if (item.type === 'wechat' && !item.value.startsWith('http')) {
                                                            e.preventDefault()
                                                            navigator.clipboard.writeText(item.value)
                                                            alert(t('auth.copied', '已复制微信号：') + item.value)
                                                        }
                                                    }}
                                                    className={`sf-footer-contact-bubble ${typeClass}`}
                                                    title={tooltipTitle}
                                                >
                                                    {renderContactIcon(item.type)}
                                                </a>
                                            )
                                        })
                                    ) : (
                                        <>
                                            {contactTelegram && (
                                                <a href={contactTelegram} target="_blank" rel="noopener noreferrer" className="sf-footer-contact-bubble tg" title="Telegram">
                                                    <TelegramIcon />
                                                </a>
                                            )}
                                            {contactWhatsapp && (
                                                <a href={contactWhatsapp} target="_blank" rel="noopener noreferrer" className="sf-footer-contact-bubble wa" title="WhatsApp">
                                                    <WhatsappIcon />
                                                </a>
                                            )}
                                            {contactEmail && (
                                                <a href={emailHref} className="sf-footer-contact-bubble mail" title="Email">
                                                    <EmailIcon />
                                                </a>
                                            )}
                                            {contactQq && (
                                                <a href={qqHref} target="_blank" rel="noopener noreferrer" className="sf-footer-contact-bubble qq" title={contactQq.startsWith('http') ? "QQ" : `QQ: ${contactQq}`}>
                                                    <QqIcon />
                                                </a>
                                            )}
                                            {contactWechat && (
                                                <a 
                                                    href={contactWechat.startsWith('http') ? contactWechat : '#'} 
                                                    target={contactWechat.startsWith('http') ? '_blank' : '_self'} 
                                                    rel="noopener noreferrer" 
                                                    onClick={handleWechatClick} 
                                                    className="sf-footer-contact-bubble wx"
                                                    title={contactWechat.startsWith('http') ? "WeChat" : `WeChat: ${contactWechat}`}
                                                >
                                                    <WechatIcon />
                                                </a>
                                            )}
                                        </>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>

                <div className="sf-footer-bottom-bar">
                    <span className="sf-footer-copyright">
                        © {currentYear} {shopName}. {t('footer.allRightsReserved', '保留所有权利。')} · <a href="https://vmart.cc" target="_blank" rel="noopener noreferrer">Powered by Vmart</a>
                    </span>
                </div>
            </div>
        </footer>
    )
}

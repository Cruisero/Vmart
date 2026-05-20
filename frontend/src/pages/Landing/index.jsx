import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useMerchantStore } from '../../store/merchantStore'
import { useBuyerL } from '../../hooks/useBuyerL'
import LanguageToggle from '../../components/common/LanguageToggle'
import './Landing.css'

const featureItems = [
    { icon: '⚡', key: 'instant' },
    { icon: '🎨', key: 'skins' },
    { icon: '💳', key: 'delivery' },
    { icon: '🌐', key: 'domain' },
    { icon: '📊', key: 'dashboard' },
    { icon: '🔒', key: 'secure' },
    { icon: '👥', key: 'agents' },
    { icon: '🎫', key: 'tickets' },
    { icon: '🛡️', key: 'admins' },
]

// 套餐数据从 plan-config API 动态获取
const FALLBACK_PLANS = [
    {
        nameKey: 'landing.plans.fallbackName',
        price: '¥29',
        periodKey: 'landing.plans.fallbackPeriod',
        descKey: 'landing.plans.fallbackDesc',
        featureKeys: ['landing.plans.fallbackFeatures.0', 'landing.plans.fallbackFeatures.1', 'landing.plans.fallbackFeatures.2'],
        ctaKey: 'landing.plans.cta',
        href: '/register',
        highlight: false,
    }
]

export default function Landing() {
    const L = useBuyerL()
    const { token, merchant, shop } = useMerchantStore()
    const isLoggedIn = !!token

    const [plans, setPlans] = useState(FALLBACK_PLANS)

    useEffect(() => {
        fetch('/api/platform/plans')
            .then(r => r.json())
            .then(d => {
                const apiPlans = d.plans || []
                if (apiPlans.length === 0) return

                // 收集所有可能的功能项（用于对齐显示）
                const ALL_FEATURES = [
                    { key: 'maxProducts', label: (v) => v === -1 ? L('landing.plans.unlimitedProducts') : L('landing.plans.maxProducts', { count: v }) },
                    { key: 'skins', label: (v) => Array.isArray(v) ? L('landing.plans.skinOptions', { count: v.length }) : (v === '全部' ? L('landing.plans.allSkins') : L('landing.plans.oneSkin')) },
                    { key: 'customDomain', label: () => L('landing.plans.customDomain') },
                    { key: 'agentSystem', label: () => L('landing.plans.agentSystem') },
                    { key: 'emailNotifications', label: (v) => v === -1 ? L('landing.plans.unlimitedEmails') : L('landing.plans.emailQuota', { count: (v || 0).toLocaleString() }) },
                    { key: 'maxSubAdmins', label: (v) => v === -1 ? L('landing.plans.unlimitedSubAdmins') : L('landing.plans.subAdmins', { count: v }) },
                    { key: 'support', label: () => L('landing.plans.support') },
                    { key: 'customerTickets', label: () => L('landing.plans.customerTickets') },
                ]

                const mapped = apiPlans.map((p, idx) => {
                    const f = p.features || {}
                    const featureList = []

                    ALL_FEATURES.forEach(item => {
                        const val = f[item.key]
                        // 判断是否「有」这个功能
                        let has = false
                        if (item.key === 'maxProducts') has = val && val !== 0
                        else if (item.key === 'skins') has = true // 所有套餐都有皮肤
                        else if (item.key === 'emailNotifications') has = val && val !== 0
                        else if (item.key === 'maxSubAdmins') has = val && val !== 0
                        else has = val === true

                        if (has) {
                            featureList.push({ text: item.label(val), included: true })
                        } else {
                            featureList.push({ text: item.label(val || 0), included: false })
                        }
                    })

                    // 通用功能（所有套餐都有）
                    featureList.push({ text: L('landing.plans.autoDelivery'), included: true })
                    featureList.push({ text: L('landing.plans.payments'), included: true })

                    const isLast = idx === apiPlans.length - 1
                    const isMid = idx === 1 || (apiPlans.length === 2 && idx === 1)

                    return {
                        name: p.name,
                        price: `¥${p.monthlyPrice}`,
                        period: L('landing.plans.fallbackPeriod'),
                        yearlyPrice: p.yearlyPrice ? `¥${p.yearlyPrice}` : null,
                        desc: idx === 0 ? L('landing.plans.starter') : (isLast ? L('landing.plans.brand') : L('landing.plans.growth')),
                        features: featureList,
                        cta: L('landing.plans.cta'),
                        href: '/register',
                        highlight: isMid
                    }
                })

                setPlans(mapped)
            })
            .catch(() => {})
    }, [L])
    // 登录后跳转目标：超管 → /Man/dashboard，商户 → /v/:slug/admin
    const dashboardLink = merchant?.isSuperAdmin
        ? '/Man/dashboard'
        : shop?.slug
            ? `/v/${shop.slug}/admin`
            : '/Man/dashboard'

    return (
        <div className="landing">
            {/* 导航 */}
            <nav className="landing-nav">
                <div className="nav-inner">
                    <div className="nav-brand">
                        <span className="nav-logo">V</span>
                        <span className="nav-name">Vmart</span>
                    </div>
                    <div className="nav-actions">
                        <LanguageToggle alwaysShow />
                        {isLoggedIn ? (
                            <Link to={dashboardLink} className="nav-cta">{L('landing.nav.console')}</Link>
                        ) : (
                            <Link to="/register" className="nav-cta">{L('landing.nav.freeStart')}</Link>
                        )}
                    </div>
                </div>
            </nav>

            {/* Hero */}
            <section className="landing-hero">
                <div className="hero-badge">{L('landing.hero.badge')}</div>
                <h1 className="hero-title">
                    {L('landing.hero.titleLine1')}<br />
                    <span className="hero-gradient">{L('landing.hero.titleHighlight')}</span>
                </h1>
                <p className="hero-desc">
                    {L('landing.hero.desc').split('\n').map((line, index) => (
                        <span key={line}>{line}{index === 0 && <br />}</span>
                    ))}
                </p>
                <div className="hero-actions">
                    {isLoggedIn ? (
                        <Link to={dashboardLink} className="btn-primary-lg">{L('landing.hero.enterStore')}</Link>
                    ) : (
                        <Link to="/register" className="btn-primary-lg">{L('landing.hero.openStore')}</Link>
                    )}
                    <a href="#features" className="btn-ghost-lg">{L('landing.hero.learnFeatures')}</a>
                </div>
                <div className="hero-meta">{L('landing.hero.meta')}</div>

                {/* 预览卡片 */}
                <div className="hero-preview">
                    <div className="preview-bar">
                        <span></span><span></span><span></span>
                        <div className="preview-url">vmart.cc/v/<em>yourshop</em></div>
                    </div>
                    <div className="preview-body">
                        <div className="preview-nav-mock">
                            <div className="preview-brand-mock">{L('landing.hero.previewBrand')}</div>
                            <div className="preview-actions-mock">
                                <div className="preview-pill"></div>
                                <div className="preview-pill dark"></div>
                            </div>
                        </div>
                        <div className="preview-products">
                            {[1,2,3,4].map(i => (
                                <div key={i} className="preview-product-card">
                                    <div className="preview-img"></div>
                                    <div className="preview-lines">
                                        <div className="preview-line long"></div>
                                        <div className="preview-line short red"></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* 功能特性 */}
            <section className="landing-features" id="features">
                <div className="section-inner">
                    <div className="section-label">{L('landing.features.label')}</div>
                    <h2 className="section-title">{L('landing.features.title')}</h2>
                    <div className="features-grid">
                        {featureItems.map(f => (
                            <div key={f.key} className="feature-card">
                                <div className="feature-icon">{f.icon}</div>
                                <h3 className="feature-title">{L(`landing.features.items.${f.key}.title`)}</h3>
                                <p className="feature-desc">{L(`landing.features.items.${f.key}.desc`)}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* 流程 */}
            <section className="landing-steps">
                <div className="section-inner">
                    <h2 className="section-title">{L('landing.steps.title')}</h2>
                    <div className="steps-row">
                        {[
                            { num: '01', key: 'register' },
                            { num: '02', key: 'store' },
                            { num: '03', key: 'sell' },
                        ].map((s, i) => (
                            <div key={s.num} className="step-item">
                                <div className="step-num">{s.num}</div>
                                <h3 className="step-title">{L(`landing.steps.items.${s.key}.title`)}</h3>
                                <p className="step-desc">{L(`landing.steps.items.${s.key}.desc`)}</p>
                                {i < 2 && <div className="step-arrow">→</div>}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* 套餐 */}
            <section className="landing-plans" id="plans">
                <div className="section-inner">
                    <div className="section-label">{L('landing.plans.label')}</div>
                    <h2 className="section-title">{L('landing.plans.title')}</h2>
                    <div className="plans-grid">
                        {plans.map(p => (
                            <div key={p.name || p.nameKey} className={`plan-card ${p.highlight ? 'plan-highlight' : ''}`}>
                                {p.highlight && <div className="plan-badge">{L('landing.plans.popular')}</div>}
                                <div className="plan-name">{p.name || L(p.nameKey)}</div>
                                <div className="plan-price">{p.price}<span>{p.period || L(p.periodKey)}</span></div>
                                {p.yearlyPrice && (
                                    <div className="plan-yearly">{L('landing.plans.yearly', { price: p.yearlyPrice, percent: Math.round((1 - parseInt(p.yearlyPrice.replace('¥','')) / parseInt(p.price.replace('¥',''))) * 100) })}</div>
                                )}
                                <div className="plan-desc">{p.desc || L(p.descKey)}</div>
                                <ul className="plan-features-list">
                                    {(p.features || p.featureKeys).map(f => (
                                        <li key={f.text || f} className={typeof f === 'object' && !f.included ? 'not-included' : ''}>
                                            <span className="feature-check">{typeof f === 'object' ? (f.included ? '✓' : '✗') : '✓'}</span>
                                            {typeof f === 'object' ? f.text : L(f)}
                                        </li>
                                    ))}
                                </ul>
                                <Link to={p.href} className={`plan-cta ${p.highlight ? 'cta-primary' : 'cta-ghost'}`}>
                                    {p.cta || L(p.ctaKey)}
                                </Link>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA 底部 */}
            <section className="landing-bottom-cta">
                <h2>{L('landing.cta.title')}</h2>
                <p>{L('landing.cta.desc')}</p>
                <Link to="/register" className="btn-primary-lg">{L('landing.hero.openStore')}</Link>
            </section>

            {/* Footer */}
            <footer className="landing-footer">
                <div className="footer-inner">
                    <div className="footer-brand">
                        <span className="nav-logo" style={{width:28,height:28,fontSize:14}}>V</span>
                        <span style={{fontWeight:700,color:'#1e293b'}}>Vmart</span>
                    </div>
                    <div className="footer-links">

                      
                    </div>
                    <div className="footer-copy">{L('landing.footer.copyright')}</div>
                </div>
            </footer>
        </div>
    )
}

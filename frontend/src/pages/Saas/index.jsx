import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './Saas.css'

const PLANS = [
    {
        key: 'free',
        name: '免费体验',
        desc: '适合个人测试，快速上手',
        monthlyPrice: 0,
        yearlyPrice: 0,
        color: 'rgba(99,102,241,0.5)',
        features: [
            { ok: true,  text: '1 个商城' },
            { ok: true,  text: '最多 10 款商品' },
            { ok: true,  text: '月订单上限 100 笔' },
            { ok: true,  text: '基础皮肤主题' },
            { ok: false, text: '自定义域名绑定' },
            { ok: false, text: '专属客服' },
            { ok: false, text: 'API 接口' },
        ],
        cta: '免费开始',
        featured: false,
    },
    {
        key: 'pro',
        name: '专业版',
        desc: '适合中小商家，功能完整',
        monthlyPrice: 99,
        yearlyPrice: 79,
        color: '#6366f1',
        features: [
            { ok: true, text: '1 个商城' },
            { ok: true, text: '无限商品数量' },
            { ok: true, text: '无限订单' },
            { ok: true, text: '全部皮肤主题' },
            { ok: true, text: '自定义域名绑定' },
            { ok: true, text: '优先邮件支持' },
            { ok: false, text: 'API 接口' },
        ],
        cta: '立即开通',
        featured: true,
        badge: '🔥 最受欢迎',
    },
    {
        key: 'business',
        name: '商业版',
        desc: '适合品牌卖家，全功能解锁',
        monthlyPrice: 299,
        yearlyPrice: 239,
        color: '#8b5cf6',
        features: [
            { ok: true, text: '最多 3 个商城' },
            { ok: true, text: '无限商品数量' },
            { ok: true, text: '无限订单' },
            { ok: true, text: '全部皮肤主题' },
            { ok: true, text: '自定义域名绑定' },
            { ok: true, text: '专属 1v1 客服' },
            { ok: true, text: 'API 接口接入' },
        ],
        cta: '联系我们',
        featured: false,
    },
]

const FEATURES = [
    { icon: '🚀', title: '5 分钟极速开店', desc: '填写基本信息，提交审核，最快 24 小时上线。无需服务器，无需运维。', bg: 'rgba(99,102,241,0.15)' },
    { icon: '🎨', title: '多主题皮肤', desc: '提供 Zen 深色、Fresh 浅色、Classic 经典三套精品主题，一键切换，开箱即用。', bg: 'rgba(139,92,246,0.15)' },
    { icon: '🌐', title: '自有域名绑定', desc: '将您的独立域名绑定到商城，DNS 验证后即可使用，彻底脱离平台束缚。', bg: 'rgba(6,182,212,0.15)' },
    { icon: '💳', title: '收款直达账户', desc: '配置自己的支付宝/微信商户号，买家付款直接进入您的账户，平台不参与分账。', bg: 'rgba(16,185,129,0.15)' },
    { icon: '🎴', title: '卡密自动发货', desc: '批量导入卡密库存，买家付款成功后系统自动发货，全程无需人工干预。', bg: 'rgba(245,158,11,0.15)' },
    { icon: '📊', title: '数据实时掌控', desc: '商品库存、订单状态、收入统计一目了然，随时掌握商城运营数据。', bg: 'rgba(239,68,68,0.15)' },
]

const FAQS = [
    { q: '开通之后多久能上线？', a: '提交审核后，我们将在 1-3 个工作日内完成审核。审核通过后，系统将发送邮件通知，您的商城立刻上线，无需任何操作。' },
    { q: '我需要自己准备服务器吗？', a: '不需要！我们提供完整的托管服务，服务器、数据库、SSL 证书全部由平台统一管理，您只需专注于商品销售。' },
    { q: '收款方式是怎样的？', a: '平台不代收资金。您需要在后台配置自己的支付宝/微信支付商户号，买家付款后资金直接进入您的账户，平台不收取手续费。' },
    { q: '免费版有什么限制？', a: '免费版限制每月订单 100 笔，最多 10 款商品，且不支持自定义域名。适合测试和个人小规模使用。' },
    { q: '可以绑定自己的域名吗？', a: '专业版及以上套餐支持自定义域名绑定。您只需将域名的 A 记录指向我们的服务器 IP，在后台填写域名并完成 DNS 验证即可。' },
    { q: '套餐可以随时升级吗？', a: '可以，套餐升级立即生效。如需降级，将在当前套餐到期后切换。' },
]

const STEPS = [
    { num: '1', title: '注册账号', desc: '填写邮箱注册，立即获得免费体验资格' },
    { num: '2', title: '配置商城', desc: '在租户后台填写店铺名称、选择皮肤主题' },
    { num: '3', title: '绑定域名', desc: '添加自定义域名并完成 DNS 解析验证' },
    { num: '4', title: '提交审核', desc: '提交开通申请，1-3 个工作日内完成审核' },
    { num: '5', title: '上传商品', desc: '审核通过后上传商品和卡密库存' },
    { num: '6', title: '开始销售', desc: '商城上线，买家下单自动发货赚钱 💰' },
]

export default function SaasPage() {
    const [yearly, setYearly] = useState(false)
    const [openFaq, setOpenFaq] = useState(null)
    const navigate = useNavigate()

    const handlePlanClick = (plan) => {
        if (plan.key === 'business') {
            window.open('mailto:support@vmart.cc', '_blank')
            return
        }
        navigate('/saas/register?plan=' + plan.key)
    }

    return (
        <div className="saas-page">
            {/* Navbar */}
            <nav className="saas-nav">
                <div className="saas-nav-logo">⚡ Vmart SaaS</div>
                <div className="saas-nav-links">
                    <a href="#features">功能特性</a>
                    <a href="#pricing">套餐定价</a>
                    <a href="#steps">开通流程</a>
                    <a href="#faq">常见问题</a>
                </div>
                <div className="saas-nav-cta">
                    <Link to="/saas/login" className="saas-btn saas-btn-ghost">登录</Link>
                    <Link to="/saas/register" className="saas-btn saas-btn-primary">免费开始</Link>
                </div>
            </nav>

            {/* Hero */}
            <section className="saas-hero">
                <div className="saas-hero-bg" />
                <div className="saas-hero-badge">✨ 全新 SaaS 商城平台，即刻上线</div>
                <h1 className="saas-hero-title">
                    打造你的<span className="grad">专属数字商城</span><br />
                    无需服务器，5分钟上线
                </h1>
                <p className="saas-hero-desc">
                    Vmart SaaS 为每位商家提供独立数据库的专属商城，支持自定义域名、多种主题皮肤、卡密自动发货，收款直达你的账户。
                </p>
                <div className="saas-hero-actions">
                    <Link to="/saas/register" className="saas-btn saas-btn-primary saas-btn-lg">
                        🚀 免费开始 →
                    </Link>
                    <a href="#pricing" className="saas-btn saas-btn-outline saas-btn-lg">
                        查看套餐
                    </a>
                </div>
                <div className="saas-hero-stats">
                    {[['500+', '入驻商家'], ['99.9%', '服务可用性'], ['24h', '最快上线时间'], ['0%', '平台抽佣']].map(([val, label]) => (
                        <div key={label} style={{ textAlign: 'center' }}>
                            <div className="saas-hero-stat-val">{val}</div>
                            <div className="saas-hero-stat-label">{label}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* 功能特性 */}
            <section className="saas-section" id="features">
                <div className="saas-section-badge">核心功能</div>
                <h2 className="saas-section-title">为独立卖家量身打造</h2>
                <p className="saas-section-desc">从建站到收款，一站式解决你的所有需求</p>
                <div className="saas-features-grid">
                    {FEATURES.map(f => (
                        <div key={f.title} className="saas-feature-card">
                            <div className="saas-feature-icon" style={{ background: f.bg }}>{f.icon}</div>
                            <div className="saas-feature-title">{f.title}</div>
                            <div className="saas-feature-desc">{f.desc}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* 套餐定价 */}
            <section className="saas-section" id="pricing" style={{ textAlign: 'center' }}>
                <div className="saas-section-badge">套餐定价</div>
                <h2 className="saas-section-title">简单透明，按需选择</h2>
                <p className="saas-section-desc" style={{ margin: '0 auto 32px' }}>所有套餐均包含 SSL 证书、数据备份、技术支持</p>

                {/* 月/年切换 */}
                <div className="saas-pricing-toggle">
                    <span style={{ color: yearly ? 'var(--saas-muted)' : 'var(--saas-text)' }}>按月</span>
                    <div className={`saas-pricing-toggle-switch ${yearly ? 'yearly' : ''}`} onClick={() => setYearly(y => !y)}>
                        <div className="saas-pricing-toggle-knob" />
                    </div>
                    <span style={{ color: yearly ? 'var(--saas-text)' : 'var(--saas-muted)' }}>按年</span>
                    {yearly && <span className="saas-pricing-save">省 20%</span>}
                </div>

                <div className="saas-pricing-grid">
                    {PLANS.map(plan => (
                        <div key={plan.key} className={`saas-plan-card ${plan.featured ? 'featured' : ''}`}>
                            {plan.badge && <div className="saas-plan-badge">{plan.badge}</div>}
                            <div className="saas-plan-name">{plan.name}</div>
                            <div className="saas-plan-desc">{plan.desc}</div>
                            <div className="saas-plan-price">
                                {plan.monthlyPrice === 0 ? (
                                    <div className="saas-plan-price-val">免费</div>
                                ) : (
                                    <>
                                        {yearly && <span className="saas-plan-price-orig">¥{plan.monthlyPrice}/月</span>}
                                        <div className="saas-plan-price-val">
                                            <span style={{ fontSize: '1.4rem', fontWeight: 500, verticalAlign: 'middle' }}>¥</span>
                                            {yearly ? plan.yearlyPrice : plan.monthlyPrice}
                                        </div>
                                    </>
                                )}
                                <div className="saas-plan-price-unit">
                                    {plan.monthlyPrice === 0 ? '永久免费' : yearly ? '元/月，按年付' : '元/月'}
                                </div>
                            </div>
                            <ul className="saas-plan-features">
                                {plan.features.map(f => (
                                    <li key={f.text}>
                                        <span className={f.ok ? 'check' : 'cross'}>{f.ok ? '✓' : '—'}</span>
                                        <span className={f.ok ? '' : 'dim'}>{f.text}</span>
                                    </li>
                                ))}
                            </ul>
                            <button
                                onClick={() => handlePlanClick(plan)}
                                className={`saas-btn ${plan.featured ? 'saas-btn-primary' : 'saas-btn-outline'}`}
                                style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
                            >
                                {plan.cta}
                            </button>
                        </div>
                    ))}
                </div>
            </section>

            {/* 开通流程 */}
            <section className="saas-section" id="steps">
                <div className="saas-section-badge">开通流程</div>
                <h2 className="saas-section-title">6 步即可开始赚钱</h2>
                <div className="saas-steps">
                    {STEPS.map(s => (
                        <div key={s.num} className="saas-step">
                            <div className="saas-step-num">{s.num}</div>
                            <div className="saas-step-title">{s.title}</div>
                            <div className="saas-step-desc">{s.desc}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* FAQ */}
            <section className="saas-section" id="faq">
                <div className="saas-section-badge">常见问题</div>
                <h2 className="saas-section-title">你可能想知道的</h2>
                <div className="saas-faq-list">
                    {FAQS.map((item, i) => (
                        <div key={i} className={`saas-faq-item ${openFaq === i ? 'open' : ''}`}
                            onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                            <div className="saas-faq-q">
                                {item.q}
                                <span className="saas-faq-chevron">▼</span>
                            </div>
                            <div className="saas-faq-a">{item.a}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* CTA */}
            <section className="saas-cta">
                <div className="saas-cta-card">
                    <div style={{ fontSize: '3rem', marginBottom: 16 }}>🚀</div>
                    <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: 16 }}>
                        准备好开始了吗？
                    </h2>
                    <p style={{ color: 'var(--saas-muted)', marginBottom: 32, fontSize: '1rem', lineHeight: 1.7 }}>
                        现在注册，即可免费体验完整功能。<br />无需信用卡，随时取消。
                    </p>
                    <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
                        <Link to="/saas/register" className="saas-btn saas-btn-primary saas-btn-lg">
                            立即免费开始 →
                        </Link>
                        <Link to="/tenant" className="saas-btn saas-btn-outline saas-btn-lg">
                            进入我的商城
                        </Link>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="saas-footer">
                <div style={{ fontWeight: 700, color: 'var(--saas-text)' }}>⚡ Vmart SaaS</div>
                <div>© {new Date().getFullYear()} Vmart. All rights reserved.</div>
                <div style={{ display: 'flex', gap: 20 }}>
                    <Link to="/terms" style={{ color: 'var(--saas-muted)', textDecoration: 'none' }}>服务条款</Link>
                    <Link to="/refund-policy" style={{ color: 'var(--saas-muted)', textDecoration: 'none' }}>隐私政策</Link>
                </div>
            </footer>
        </div>
    )
}

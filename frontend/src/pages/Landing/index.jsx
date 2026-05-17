import { Link } from 'react-router-dom'
import './Landing.css'

const features = [
    { icon: '⚡', title: '注册即开店', desc: '填写店名、邮箱，30秒自动生成专属商城，立即可用' },
    { icon: '🎨', title: '多套皮肤', desc: 'Classic / Fresh / Zen 三套主题，随时切换，无需代码' },
    { icon: '💳', title: '卡密发货', desc: '支持虚拟商品自动发货，订单完成后即时推送卡密' },
    { icon: '🌐', title: '独立域名', desc: '绑定自己的域名，一键申请 SSL，完全属于你的品牌' },
    { icon: '📊', title: '数据仪表盘', desc: '订单、收入、访问量实时统计，掌握商城全局' },
    { icon: '🔒', title: '安全可靠', desc: '数据独立存储，支持支付宝 / USDT 多种收款方式' },
]

const plans = [
    {
        name: '免费试用',
        price: '¥0',
        period: '24小时',
        desc: '无需信用卡，立即体验',
        features: ['完整功能体验', 'Classic 皮肤', '商品 / 订单管理', '卡密自动发货'],
        cta: '免费开始',
        href: '/register',
        highlight: false,
    },
    {
        name: '入门版',
        price: '¥99',
        period: '/月',
        desc: '个人卖家首选',
        features: ['商品数量不限', '3 套皮肤全解锁', '邮件通知', '数据导出', '优先客服'],
        cta: '立即升级',
        href: '/register',
        highlight: true,
    },
    {
        name: '专业版',
        price: '¥299',
        period: '/月',
        desc: '品牌独立商城',
        features: ['入门版全部功能', '自定义独立域名', 'SSL 证书一键申请', '代理商分销系统', '专属技术支持'],
        cta: '联系我们',
        href: '/register',
        highlight: false,
    },
]

export default function Landing() {
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
                        <Link to="/login" className="nav-login">登录</Link>
                        <Link to="/register" className="nav-cta">免费开始</Link>
                    </div>
                </div>
            </nav>

            {/* Hero */}
            <section className="landing-hero">
                <div className="hero-badge">🚀 注册即建店，24小时免费体验</div>
                <h1 className="hero-title">
                    打造你的<br />
                    <span className="hero-gradient">专属数字商城</span>
                </h1>
                <p className="hero-desc">
                    面向虚拟商品卖家的一站式商城平台，支持卡密自动发货、多皮肤、独立域名。<br />
                    像 Shopify 一样简单，专为中文市场设计。
                </p>
                <div className="hero-actions">
                    <Link to="/register" className="btn-primary-lg">免费开通商城 →</Link>
                    <a href="#features" className="btn-ghost-lg">了解功能</a>
                </div>
                <div className="hero-meta">无需信用卡 · 30秒开通 · 随时取消</div>

                {/* 预览卡片 */}
                <div className="hero-preview">
                    <div className="preview-bar">
                        <span></span><span></span><span></span>
                        <div className="preview-url">vmart.cc/v/<em>yourshop</em></div>
                    </div>
                    <div className="preview-body">
                        <div className="preview-nav-mock">
                            <div className="preview-brand-mock">你的商城</div>
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
                    <div className="section-label">功能特性</div>
                    <h2 className="section-title">你需要的，我们都有</h2>
                    <div className="features-grid">
                        {features.map(f => (
                            <div key={f.title} className="feature-card">
                                <div className="feature-icon">{f.icon}</div>
                                <h3 className="feature-title">{f.title}</h3>
                                <p className="feature-desc">{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* 流程 */}
            <section className="landing-steps">
                <div className="section-inner">
                    <h2 className="section-title">三步开启你的商城</h2>
                    <div className="steps-row">
                        {[
                            { num: '01', title: '填写注册信息', desc: '邮箱 + 密码 + 店铺名，30秒完成' },
                            { num: '02', title: '获得专属商城', desc: '系统自动生成 vmart.cc/v/你的slug' },
                            { num: '03', title: '上架商品开卖', desc: '添加商品、配置支付，立即接受订单' },
                        ].map((s, i) => (
                            <div key={s.num} className="step-item">
                                <div className="step-num">{s.num}</div>
                                <h3 className="step-title">{s.title}</h3>
                                <p className="step-desc">{s.desc}</p>
                                {i < 2 && <div className="step-arrow">→</div>}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* 套餐 */}
            <section className="landing-plans" id="plans">
                <div className="section-inner">
                    <div className="section-label">价格套餐</div>
                    <h2 className="section-title">透明定价，按需选择</h2>
                    <div className="plans-grid">
                        {plans.map(p => (
                            <div key={p.name} className={`plan-card ${p.highlight ? 'plan-highlight' : ''}`}>
                                {p.highlight && <div className="plan-badge">最受欢迎</div>}
                                <div className="plan-name">{p.name}</div>
                                <div className="plan-price">{p.price}<span>{p.period}</span></div>
                                <div className="plan-desc">{p.desc}</div>
                                <ul className="plan-features-list">
                                    {p.features.map(f => <li key={f}>✓ {f}</li>)}
                                </ul>
                                <Link to={p.href} className={`plan-cta ${p.highlight ? 'cta-primary' : 'cta-ghost'}`}>
                                    {p.cta}
                                </Link>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA 底部 */}
            <section className="landing-bottom-cta">
                <h2>现在开始，免费体验 24 小时</h2>
                <p>不需要信用卡，30秒注册，立即拥有属于你的商城</p>
                <Link to="/register" className="btn-primary-lg">免费开通商城 →</Link>
            </section>

            {/* Footer */}
            <footer className="landing-footer">
                <div className="footer-inner">
                    <div className="footer-brand">
                        <span className="nav-logo" style={{width:28,height:28,fontSize:14}}>V</span>
                        <span style={{fontWeight:700,color:'#1e293b'}}>Vmart</span>
                    </div>
                    <div className="footer-links">
                        <Link to="/Man/login">平台管理</Link>
                        <span>·</span>
                        <a href="mailto:support@vmart.cc">联系我们</a>
                    </div>
                    <div className="footer-copy">© 2026 Vmart. All rights reserved.</div>
                </div>
            </footer>
        </div>
    )
}

import { Link } from 'react-router-dom'
import { FiArrowRight, FiShield, FiZap, FiClock } from 'react-icons/fi'
import './Home.css'

function Home() {
    const features = [
        {
            icon: <FiZap />,
            title: '即时发货',
            description: '支付成功后系统自动发放卡密，无需等待'
        },
        {
            icon: <FiShield />,
            title: '安全保障',
            description: '全程加密传输，保障交易安全'
        },
        {
            icon: <FiClock />,
            title: '24小时服务',
            description: '自动化服务，全天候不间断运行'
        }
    ]

    return (
        <div className="home">
            {/* Hero 区域 */}
            <section className="hero">
                <div className="hero-content">
                    <h1 className="hero-title">
                        <span className="title-highlight">虚拟物品</span>
                        <br />
                        自动发卡平台
                    </h1>
                    <p className="hero-description">
                        安全、快速、便捷的虚拟商品交易服务
                        <br />
                        支持多种支付方式，付款后自动发放卡密
                    </p>
                    <div className="hero-actions">
                        <Link to="/products" className="btn btn-primary btn-lg">
                            浏览商品
                            <FiArrowRight />
                        </Link>
                        <Link to="/order/query" className="btn btn-secondary btn-lg">
                            订单查询
                        </Link>
                    </div>
                </div>

                <div className="hero-visual">
                    <div className="hero-card">
                        <div className="card-glow"></div>
                        <div className="card-content">
                            <span className="card-icon">💎</span>
                            <span className="card-text">Vmart</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* 特性区域 */}
            <section className="features">
                <h2 className="section-title">为什么选择我们</h2>
                <div className="features-grid">
                    {features.map((feature, index) => (
                        <div key={index} className="feature-card card">
                            <div className="feature-icon">{feature.icon}</div>
                            <h3 className="feature-title">{feature.title}</h3>
                            <p className="feature-desc">{feature.description}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* CTA 区域 */}
            <section className="cta">
                <div className="cta-content">
                    <h2>立即开始购物</h2>
                    <p>海量虚拟商品等你选购，支付即得卡密</p>
                    <Link to="/products" className="btn btn-primary btn-lg">
                        进入商城
                        <FiArrowRight />
                    </Link>
                </div>
            </section>
        </div>
    )
}

export default Home

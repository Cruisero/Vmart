/**
 * 示例定制主题：Dark Luxury
 *
 * 接收的 props：
 *   - shop: 商城基本信息（shopName / shopLogo / shopNotice / featureCard ...）
 *   - slug: 商城 slug
 *   - routes: 商城内的所有路由（已经是 <Routes>，直接渲染即可）
 *
 * 主题就是一个完整的「壳」组件：负责整体布局、导航栏、页脚，
 * 中间内容由 routes 自动按当前 URL 渲染。
 */
import { Link, useLocation } from 'react-router-dom'
import './styles.css'

export default function DarkLuxuryTheme({ shop, slug, routes }) {
    const location = useLocation()
    const isHome = location.pathname.replace(/\/+$/, '') === `/v/${slug}`

    return (
        <div className="dl-root">
            <header className="dl-header">
                <div className="dl-container dl-header-inner">
                    <Link to={`/v/${slug}`} className="dl-brand">
                        {shop.shopLogo
                            ? <img src={shop.shopLogo} alt={shop.shopName} />
                            : <span>{shop.shopName}</span>}
                    </Link>
                    <nav className="dl-nav">
                        <Link to={`/v/${slug}`}>首页</Link>
                        <Link to={`/v/${slug}/order-query`}>订单查询</Link>
                        <Link to={`/v/${slug}/user`}>个人中心</Link>
                        <Link to={`/v/${slug}/cart`} className="dl-cart">购物车</Link>
                    </nav>
                </div>
            </header>

            {isHome && shop.shopNotice && (
                <div className="dl-notice">{shop.shopNotice}</div>
            )}

            <main className="dl-main dl-container">
                {routes}
            </main>

            <footer className="dl-footer">
                <div className="dl-container">
                    <span>{shop.shopName}</span>
                    <span style={{ opacity: 0.5 }}>· <a href="https://vmart.cc" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>Powered by Vmart</a></span>
                </div>
            </footer>
        </div>
    )
}

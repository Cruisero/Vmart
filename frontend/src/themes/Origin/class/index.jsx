/**
 * Origin / origin 皮肤
 * Vmart 第二代经典主题，基于 classic-v1 的二次创作
 *
 * 路径：themes/Origin/class
 * Skin key：class
 *
 * 设计目标：
 *  - 保留 classic 的全功能性（搜索 / 购物车 / 工单 / 用户中心）
 *  - 现代化视觉：浅色 hero、玻璃质感导航、卡片化商品网格
 *  - 后续可逐步替换内嵌组件以达到完全独立
 */
import { Routes, Route, useLocation } from 'react-router-dom'

import OriginNavbar from './Navbar'

// 复用现有页面组件（先快速跑通，后续可逐个 override 到 themes/Origin/class/Pages/* 实现完全独立）
import Products from '../../../pages/Products'
import ProductDetail from '../../../pages/ProductDetail'
import Cart from '../../../pages/Cart'
import Checkout from '../../../pages/Checkout'
import OrderResult from '../../../pages/OrderResult'
import OrderQuery from '../../../pages/OrderQuery'
import Login from '../../../pages/Auth/Login'
import Register from '../../../pages/Auth/Register'
import UserCenter from '../../../pages/User'
import Search from '../../../pages/Search'
import TicketNew from '../../../pages/TicketNew'
import TicketDetail from '../../../pages/TicketDetail'
import { TermsPage, RefundPolicyPage } from '../../../pages/PolicyPage'

import './styles.css'

function NoticeBanner({ text, slug }) {
    const location = useLocation()
    if (!text) return null
    const path = location.pathname.replace(/\/+$/, '')
    if (path !== `/v/${slug}`) return null
    return (
        <div className="og-notice">
            <span>{text}</span>
        </div>
    )
}

function Footer({ shopName }) {
    return (
        <footer className="og-footer">
            <div className="og-footer-inner">
                <span className="og-footer-brand">{shopName}</span>
                <span className="og-footer-divider">·</span>
                <a href="https://vmart.cc" target="_blank" rel="noopener noreferrer" className="og-footer-meta">Powered by Vmart</a>
            </div>
        </footer>
    )
}

export default function OriginTheme({ shop, slug }) {
    const routes = (
        <Routes>
            <Route index element={<Products />} />
            <Route path="products/:id" element={<ProductDetail />} />
            <Route path="checkout" element={<Checkout />} />
            <Route path="cart" element={<Cart />} />
            <Route path="order/:orderNo" element={<OrderResult />} />
            <Route path="order-query" element={<OrderQuery />} />
            <Route path="login" element={<Login />} />
            <Route path="register" element={<Register />} />
            <Route path="search" element={<Search />} />
            <Route path="tickets/new" element={<TicketNew />} />
            <Route path="tickets/:id" element={<TicketDetail />} />
            <Route path="terms" element={<TermsPage />} />
            <Route path="refund-policy" element={<RefundPolicyPage />} />
            <Route path="user/*" element={<UserCenter />} />
        </Routes>
    )

    return (
        <div className="og-root">
            <OriginNavbar shop={shop} slug={slug} />
            <NoticeBanner text={shop.shopNotice} slug={slug} />
            <main className="og-main">{routes}</main>
            <Footer shopName={shop.shopName} />
        </div>
    )
}

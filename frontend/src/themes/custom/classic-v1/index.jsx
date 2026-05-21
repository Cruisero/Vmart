/**
 * 定制主题：Classic V1（仅授权商户可用）
 *
 * 这是 Vmart 第一版公共主题的私有版本，已从公共主题列表移除，
 * 仅通过「定制主题分配」机制授权给特定商户使用。
 *
 * 不要修改本文件以保持商户体验稳定。如需新版本，请新建 classic-v2/。
 */
import { Routes, Route, useLocation } from 'react-router-dom'

import Navbar from '../../../components/common/Navbar'
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
        <div className="sf-notice-bar">
            <span>{text}</span>
        </div>
    )
}

export default function ClassicV1Theme({ shop, slug }) {
    const LoginHeader = () => <Login headerTitle="欢迎回来" headerSubtitle="登录账号，继续购物" />
    const RegisterHeader = () => <Register headerTitle="创建账号" headerSubtitle="注册账号，享受更多服务" />

    const routes = (
        <Routes>
            <Route index element={<Products />} />
            <Route path="products/:id" element={<ProductDetail />} />
            <Route path="checkout" element={<Checkout />} />
            <Route path="cart" element={<Cart />} />
            <Route path="order/:orderNo" element={<OrderResult />} />
            <Route path="order-query" element={<OrderQuery />} />
            <Route path="login" element={<LoginHeader />} />
            <Route path="register" element={<RegisterHeader />} />
            <Route path="search" element={<Search />} />
            <Route path="tickets/new" element={<TicketNew />} />
            <Route path="tickets/:id" element={<TicketDetail />} />
            <Route path="terms" element={<TermsPage />} />
            <Route path="refund-policy" element={<RefundPolicyPage />} />
            <Route path="user/*" element={<UserCenter />} />
        </Routes>
    )

    return (
        <div className="sf-root class-v1-theme">
            <Navbar />
            <NoticeBanner text={shop.shopNotice} slug={slug} />
            <main className="main-content">{routes}</main>
        </div>
    )
}

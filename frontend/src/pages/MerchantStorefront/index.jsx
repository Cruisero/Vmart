/**
 * MerchantStorefront — SaaS 商户店面
 * 路由：/v/:slug/*
 * 与代理分站 Storefront 的区别：
 *   - 调用 /api/v/:slug（Tenant.shopSlug 查找）而非 /api/s/:slug（Agent 查找）
 *   - StorefrontContext 中注入 apiBase: '/api/v' 供主题组件使用
 */
import { useState, useEffect, lazy, Suspense } from 'react'
import { useParams, Link, useLocation } from 'react-router-dom'
import { Routes, Route } from 'react-router-dom'
import { StorefrontContext } from '../../store/storefrontStore'

// 主题组件（复用现有）
import ZenNavbar from '../../themes/minimal/zen/Navbar'
import ZenProducts from '../../themes/minimal/zen/Products'
import ZenProductDetail from '../../themes/minimal/zen/ProductDetail'
import ZenCheckout from '../../themes/minimal/zen/Checkout'
import ZenOrderResult from '../../themes/minimal/zen/OrderResult'
import ZenOrderQuery from '../../themes/minimal/zen/OrderQuery'
import ZenLogin from '../../themes/minimal/zen/Auth/Login'
import ZenRegister from '../../themes/minimal/zen/Auth/Register'
import ZenUserCenter from '../../themes/minimal/zen/UserCenter'

import FreshNavbar from '../../themes/minimal/fresh/Navbar'
import FreshProducts from '../../themes/minimal/fresh/Products'
import FreshProductDetail from '../../themes/minimal/fresh/ProductDetail'
import FreshCheckout from '../../themes/minimal/fresh/Checkout'
import FreshOrderResult from '../../themes/minimal/fresh/OrderResult'
import FreshOrderQuery from '../../themes/minimal/fresh/OrderQuery'
import FreshLogin from '../../themes/minimal/fresh/Auth/Login'
import FreshRegister from '../../themes/minimal/fresh/Auth/Register'
import FreshUserCenter from '../../themes/minimal/fresh/UserCenter'

import Navbar from '../../components/common/Navbar'
import Products from '../../pages/Products'
import ProductDetail from '../../pages/ProductDetail'
import Cart from '../../pages/Cart'
import Checkout from '../../pages/Checkout'
import OrderResult from '../../pages/OrderResult'
import OrderQuery from '../../pages/OrderQuery'
import Login from '../../pages/Auth/Login'
import Register from '../../pages/Auth/Register'
import UserCenter from '../../pages/User'
import Search from '../../pages/Search'
import TicketNew from '../../pages/TicketNew'
import TicketDetail from '../../pages/TicketDetail'

import './MerchantStorefront.css'

// 定制主题动态加载（vite glob 收集 src/themes/custom/<key>/index.jsx 作为完整主题入口）
const customThemeModules = import.meta.glob('../../themes/custom/*/index.jsx')
function loadCustomTheme(key) {
    const path = `../../themes/custom/${key}/index.jsx`
    const loader = customThemeModules[path]
    if (!loader) return null
    return lazy(() => loader())
}

function NoticeBanner({ text, slug }) {
    const location = useLocation()
    if (!text) return null
    // 仅首页显示（/v/:slug 或 /v/:slug/）
    const path = location.pathname.replace(/\/+$/, '')
    if (path !== `/v/${slug}`) return null
    return (
        <div className="sf-notice-bar">
            <span>{text}</span>
        </div>
    )
}

function Footer({ shopName }) {
    return (
        <footer className="sf-footer">
            <span>{shopName} · Powered by Vmart</span>
        </footer>
    )
}

export default function MerchantStorefront() {
    const { slug } = useParams()
    const [shop, setShop] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        setLoading(true)
        fetch(`/api/v/${slug}`)
            .then(r => {
                if (!r.ok) throw new Error('商城不存在')
                return r.json()
            })
            .then(data => setShop(data.storefront))
            .catch(err => setError(err.message))
            .finally(() => setLoading(false))
    }, [slug])

    // 设置商户的 favicon 和标题
    useEffect(() => {
        if (!shop) return
        if (shop.shopName) document.title = shop.shopName
        if (shop.shopFavicon) {
            let link = document.querySelector("link[rel~='icon']")
            if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link) }
            link.href = shop.shopFavicon
        }
    }, [shop])

    // 进入店面时给 html 加 class，离开时移除（用于隐藏全局滚动条）
    useEffect(() => {
        document.documentElement.classList.add('sf-no-scrollbar')
        return () => document.documentElement.classList.remove('sf-no-scrollbar')
    }, [])

    if (loading) return <div className="sf-loading"><div className="sf-spinner" /></div>

    if (error || !shop) {
        return (
            <div className="sf-error">
                <h2>😔 {error || '商城不存在'}</h2>
                <Link to="/">返回首页</Link>
            </div>
        )
    }

    const skin = shop.shopSkin || 'fresh'

    // StorefrontContext：slug + apiBase 让主题组件知道去哪里取数据
    const ctx = {
        slug,
        shopName: shop.shopName,
        shopLogo: shop.shopLogo,
        shopSkin: skin,
        shopNotice: shop.shopNotice,
        featureCard: shop.featureCard || null,
        // 主题组件里凡是用 /api/s/${slug} 的，改为读 apiBase
        apiBase: `/api/v`,
        _tenantMode: true,
        tenantId: shop.tenantId,
    }

    const routes = (
        <Routes>
            <Route index element={skin === 'fresh' ? <FreshProducts /> : skin === 'classic' ? <Products /> : <ZenProducts />} />
            <Route path="products/:id" element={skin === 'fresh' ? <FreshProductDetail /> : skin === 'classic' ? <ProductDetail /> : <ZenProductDetail />} />
            <Route path="checkout" element={skin === 'fresh' ? <FreshCheckout /> : skin === 'classic' ? <Checkout /> : <ZenCheckout />} />
            <Route path="cart" element={<Cart />} />
            <Route path="order/:orderNo" element={skin === 'fresh' ? <FreshOrderResult /> : skin === 'classic' ? <OrderResult /> : <ZenOrderResult />} />
            <Route path="order-query" element={skin === 'fresh' ? <FreshOrderQuery /> : skin === 'classic' ? <OrderQuery /> : <ZenOrderQuery />} />
            <Route path="login" element={skin === 'fresh' ? <FreshLogin /> : skin === 'classic' ? <Login /> : <ZenLogin />} />
            <Route path="register" element={skin === 'fresh' ? <FreshRegister /> : skin === 'classic' ? <Register /> : <ZenRegister />} />
            <Route path="search" element={<Search />} />
            <Route path="tickets/new" element={<TicketNew />} />
            <Route path="tickets/:id" element={<TicketDetail />} />
            <Route path="user/*" element={skin === 'fresh' ? <FreshUserCenter /> : skin === 'classic' ? <UserCenter /> : <ZenUserCenter />} />
        </Routes>
    )

    return (
        <StorefrontContext.Provider value={ctx}>
            {skin?.startsWith?.('custom:') ? (() => {
                const key = skin.split(':')[1]
                const CustomTheme = loadCustomTheme(key)
                if (!CustomTheme) {
                    return (
                        <div className="sf-error">
                            <h2>定制主题 "{key}" 加载失败</h2>
                            <p style={{ color: '#64748b' }}>主题代码可能尚未部署。请联系平台管理员。</p>
                            <Link to="/">返回首页</Link>
                        </div>
                    )
                }
                return (
                    <Suspense fallback={<div className="sf-loading"><div className="sf-spinner" /></div>}>
                        <CustomTheme shop={shop} slug={slug} routes={routes} />
                    </Suspense>
                )
            })() : (
                <>
                    {skin === 'fresh' && (
                        <div className="sf-root" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#F3F4F6' }}>
                            <FreshNavbar />
                            <NoticeBanner text={shop.shopNotice} slug={slug} />
                            <main className="fresh-main-content" style={{ flex: 1 }}>{routes}</main>
                            <Footer shopName={shop.shopName} />
                        </div>
                    )}
                    {skin === 'classic' && (
                        <div className="sf-root">
                            <Navbar />
                            <NoticeBanner text={shop.shopNotice} slug={slug} />
                            <main className="main-content">{routes}</main>
                            <Footer shopName={shop.shopName} />
                        </div>
                    )}
                    {skin !== 'fresh' && skin !== 'classic' && !skin?.startsWith?.('custom:') && (
                        <div className="sf-root" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#FAFAF8' }}>
                            <ZenNavbar />
                            <NoticeBanner text={shop.shopNotice} slug={slug} />
                            <main style={{ flex: 1 }}>{routes}</main>
                            <Footer shopName={shop.shopName} />
                        </div>
                    )}
                </>
            )}
        </StorefrontContext.Provider>
    )
}

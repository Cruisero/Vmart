import { useState, useEffect } from 'react'
import { useParams, Link, Outlet } from 'react-router-dom'
import { StorefrontContext } from '../../store/storefrontStore'

// Theme layout shells
import ZenNavbar from '../../themes/minimal/zen/Navbar'
import ZenProducts from '../../themes/minimal/zen/Products'
import ZenProductDetail from '../../themes/minimal/zen/ProductDetail'
import ZenCheckout from '../../themes/minimal/zen/Checkout'
import ZenOrderResult from '../../themes/minimal/zen/OrderResult'
import ZenOrderQuery from '../../themes/minimal/zen/OrderQuery'
import ZenLogin from '../../themes/minimal/zen/Auth/Login'
import ZenRegister from '../../themes/minimal/zen/Auth/Register'

import FreshNavbar from '../../themes/minimal/fresh/Navbar'
import FreshProducts from '../../themes/minimal/fresh/Products'
import FreshProductDetail from '../../themes/minimal/fresh/ProductDetail'
import FreshCheckout from '../../themes/minimal/fresh/Checkout'
import FreshOrderResult from '../../themes/minimal/fresh/OrderResult'
import FreshOrderQuery from '../../themes/minimal/fresh/OrderQuery'
import FreshLogin from '../../themes/minimal/fresh/Auth/Login'
import FreshRegister from '../../themes/minimal/fresh/Auth/Register'

import Navbar from '../../components/common/Navbar'
import Products from '../../pages/Products'
import ProductDetail from '../../pages/ProductDetail'
import Checkout from '../../pages/Checkout'
import OrderResult from '../../pages/OrderResult'
import OrderQuery from '../../pages/OrderQuery'
import Login from '../../pages/Auth/Login'
import Register from '../../pages/Auth/Register'


import { Routes, Route, Navigate } from 'react-router-dom'
import './Storefront.css'

function Storefront({ forcedSlug, isSubdomain = false }) {
    const params = useParams()
    const slug = forcedSlug || params.slug
    const [shop, setShop] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        setLoading(true)
        fetch(`/api/s/${slug}`)
            .then(r => {
                if (!r.ok) throw new Error('分站不存在')
                return r.json()
            })
            .then(data => setShop(data.storefront))
            .catch(err => setError(err.message))
            .finally(() => setLoading(false))
    }, [slug])

    if (loading) {
        return (
            <div className="sf-loading"><div className="sf-spinner" /></div>
        )
    }

    if (error || !shop) {
        return (
            <div className="sf-error">
                <h2>😔 {error || '分站不存在'}</h2>
                <Link to="/">返回首页</Link>
            </div>
        )
    }

    const skin = shop.shopSkin || 'zen'

    // Provide storefront context so theme components know to fetch from agent API
    const contextValue = {
        slug,
        isSubdomain,
        shopName: shop.shopName,
        shopLogo: shop.shopLogo,
        shopSkin: skin,
        shopNotice: shop.shopNotice,
    }

    // Render the real theme layout based on agent's chosen skin
    if (skin === 'fresh') {
        return (
            <StorefrontContext.Provider value={contextValue}>
                <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#F3F4F6' }}>
                    <FreshNavbar />
                    {shop.shopNotice && <AgentNoticeBanner text={shop.shopNotice} />}
                    <main className="fresh-main-content" style={{ flex: 1 }}>
                        <Routes>
                            <Route index element={<FreshProducts />} />
                            <Route path="products/:id" element={<FreshProductDetail />} />
                            <Route path="checkout" element={<FreshCheckout />} />
                            <Route path="order/:orderNo" element={<FreshOrderResult />} />
                            <Route path="order-query" element={<FreshOrderQuery />} />
                            <Route path="login" element={<FreshLogin />} />
                            <Route path="register" element={<FreshRegister />} />
                        </Routes>
                    </main>
                    <StorefrontFooter shopName={shop.shopName} />
                </div>
            </StorefrontContext.Provider>
        )
    }

    if (skin === 'classic') {
        return (
            <StorefrontContext.Provider value={contextValue}>
                <div>
                    <Navbar />
                    {shop.shopNotice && <AgentNoticeBanner text={shop.shopNotice} />}
                    <main className="main-content">
                        <Routes>
                            <Route index element={<Products />} />
                            <Route path="products/:id" element={<ProductDetail />} />
                            <Route path="checkout" element={<Checkout />} />
                            <Route path="order/:orderNo" element={<OrderResult />} />
                            <Route path="order-query" element={<OrderQuery />} />
                            <Route path="login" element={<Login />} />
                            <Route path="register" element={<Register />} />
                        </Routes>
                    </main>
                    <StorefrontFooter shopName={shop.shopName} />
                </div>
            </StorefrontContext.Provider>
        )
    }

    // Default: zen
    return (
        <StorefrontContext.Provider value={contextValue}>
            <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#FAFAF8' }}>
                <ZenNavbar />
                {shop.shopNotice && <AgentNoticeBanner text={shop.shopNotice} />}
                <main style={{ flex: 1 }}>
                    <Routes>
                        <Route index element={<ZenProducts />} />
                        <Route path="products/:id" element={<ZenProductDetail />} />
                        <Route path="checkout" element={<ZenCheckout />} />
                        <Route path="order/:orderNo" element={<ZenOrderResult />} />
                        <Route path="order-query" element={<ZenOrderQuery />} />
                        <Route path="login" element={<ZenLogin />} />
                        <Route path="register" element={<ZenRegister />} />
                    </Routes>
                </main>
                <StorefrontFooter shopName={shop.shopName} />
            </div>
        </StorefrontContext.Provider>
    )
}

function AgentNoticeBanner({ text }) {
    const [dismissed, setDismissed] = useState(false)
    if (dismissed) return null
    return (
        <div style={{
            background: 'linear-gradient(90deg, #4F46E5, #7C3AED)',
            color: '#fff',
            padding: '8px 16px',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            overflow: 'hidden',
            position: 'relative'
        }}>
            <div style={{
                flex: 1,
                overflow: 'hidden',
                whiteSpace: 'nowrap',
            }}>
                <span style={{
                    display: 'inline-block',
                    animation: text.length > 30 ? 'sf-marquee 15s linear infinite' : 'none',
                    paddingLeft: text.length > 30 ? '100%' : 0,
                }}>
                    📢 {text}
                </span>
            </div>
            <button
                onClick={() => setDismissed(true)}
                style={{
                    background: 'none', border: 'none', color: '#fff',
                    cursor: 'pointer', fontSize: '16px', opacity: 0.7,
                    flexShrink: 0
                }}
            >✕</button>
            <style>{`@keyframes sf-marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-200%); } }`}</style>
        </div>
    )
}

function StorefrontFooter({ shopName }) {
    return (
        <footer className="sf-footer">
            <span>{shopName} · <a href="https://vmart.cc" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>Powered by VMart</a></span>
        </footer>
    )
}

export default Storefront

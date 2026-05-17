import { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, useParams } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import toast from 'react-hot-toast'
import Navbar from './components/common/Navbar'
import Home from './pages/Home'
import Products from './pages/Products'
import ProductDetail from './pages/ProductDetail'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'
import OrderResult from './pages/OrderResult'
import Login from './pages/Auth/Login'
import Register from './pages/Auth/Register'
import UserCenter from './pages/User'
import AdminDashboard from './pages/Admin/Dashboard'
import Search from './pages/Search'
import VerifyEmail from './pages/VerifyEmail'
import ForgotPassword from './pages/Auth/ForgotPassword'
import ResetPassword from './pages/Auth/ResetPassword'
import NotFound from './pages/NotFound'
import TicketNew from './pages/TicketNew'
import TicketDetail from './pages/TicketDetail'
import Terms from './pages/Terms'
import RefundPolicy from './pages/RefundPolicy'
import OrderQuery from './pages/OrderQuery'
import { useThemeStore } from './store/themeStore'
import { useAuthStore } from './store/authStore'
import { useSkinStore } from './store/skinStore'
import FreshNavbar from './themes/minimal/fresh/Navbar'
import FreshProducts from './themes/minimal/fresh/Products'
import FreshProductDetail from './themes/minimal/fresh/ProductDetail'
import FreshCheckout from './themes/minimal/fresh/Checkout'
import FreshOrderResult from './themes/minimal/fresh/OrderResult'
import FreshUserCenter from './themes/minimal/fresh/UserCenter'
import FreshOrderQuery from './themes/minimal/fresh/OrderQuery'
import FreshLogin from './themes/minimal/fresh/Auth/Login'
import FreshRegister from './themes/minimal/fresh/Auth/Register'
import FreshNotFound from './themes/minimal/fresh/NotFound'
import ZenNavbar from './themes/minimal/zen/Navbar'
import ZenProducts from './themes/minimal/zen/Products'
import ZenProductDetail from './themes/minimal/zen/ProductDetail'
import ZenCheckout from './themes/minimal/zen/Checkout'
import ZenOrderResult from './themes/minimal/zen/OrderResult'
import ZenUserCenter from './themes/minimal/zen/UserCenter'
import ZenOrderQuery from './themes/minimal/zen/OrderQuery'
import ZenLogin from './themes/minimal/zen/Auth/Login'
import ZenRegister from './themes/minimal/zen/Auth/Register'
import ZenNotFound from './themes/minimal/zen/NotFound'
import NotificationBanner from './components/NotificationBanner'
import AgentDashboard from './pages/Agent/Dashboard'
import AgentApply from './pages/AgentApply'
import Storefront from './pages/Storefront'
import SaasPage from './pages/Saas'
import SaasLogin from './pages/Saas/Login'
import SaasRegister from './pages/Saas/Register'
// ── SaaS 平台新增页面 ────────────────────────────────────
import MerchantRegister from './pages/MerchantAuth/Register'
import MerchantLogin from './pages/MerchantAuth/Login'
import ManDashboard from './pages/Man/Dashboard'
import Landing from './pages/Landing'
import AdminDashboardWithProvider from './pages/Admin/Dashboard'
import MerchantStorefront from './pages/MerchantStorefront'

// 邮箱验证提示组件
function EmailVerificationBanner() {
    const { user, isAuthenticated, token } = useAuthStore()
    const { skin } = useSkinStore()
    const [dismissed, setDismissed] = useState(false)
    const [resending, setResending] = useState(false)

    if (skin === 'fresh' || !isAuthenticated || user?.emailVerified || dismissed || ['ADMIN', 'SUPER_ADMIN'].includes(user?.role)) {
        return null
    }

    const handleResend = async () => {
        setResending(true)
        try {
            const res = await fetch('/api/auth/resend-verification', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            })
            const data = await res.json()
            if (res.ok) {
                toast.success(data.message)
            } else {
                toast.error(data.error)
            }
        } catch (error) {
            toast.error('发送失败，请稍后重试')
        } finally {
            setResending(false)
        }
    }

    return (
        <div style={{
            background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
            color: '#1e293b',
            padding: '12px 20px',
            textAlign: 'center',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            flexWrap: 'wrap'
        }}>
            <span>⚠️ 您的邮箱尚未验证，请查收验证邮件完成验证</span>
            <button
                onClick={handleResend}
                disabled={resending}
                style={{
                    background: 'rgba(255,255,255,0.9)',
                    border: 'none',
                    padding: '6px 16px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '13px'
                }}
            >
                {resending ? '发送中...' : '重新发送'}
            </button>
            <button
                onClick={() => setDismissed(true)}
                style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '18px',
                    opacity: 0.7
                }}
            >
                ✕
            </button>
        </div>
    )
}

// ---- Fresh 皮肤布局 Shell ----
function FreshLayoutShell() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#F3F4F6' }}>
            <FreshNavbar />
            <NotificationBanner skin="fresh" />
            <main className="fresh-main-content" style={{ flex: 1 }}>
                <Outlet />
            </main>
        </div>
    )
}

// ---- Zen 皮肤布局 Shell ----
function ZenLayoutShell() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#FAFAF8' }}>
            <ZenNavbar />
            <NotificationBanner skin="zen" />
            <main style={{ flex: 1 }}>
                <Outlet />
            </main>
        </div>
    )
}

// ---- Classic 皮肤布局 Shell ----
function ClassicLayoutShell() {
    return (
        <>
            <Navbar />
            <NotificationBanner skin="classic" />
            <main className="main-content">
                <Outlet />
            </main>
        </>
    )
}

function App() {
    const initTheme = useThemeStore((state) => state.initTheme)
    const { isAuthenticated, token, user, updateUser, logout } = useAuthStore()
    const { skin, fetchSkin, skinReady, siteName, siteFavicon } = useSkinStore()

    useEffect(() => { initTheme() }, [initTheme])
    useEffect(() => { fetchSkin() }, [])

    // 动态设置页面标题
    useEffect(() => {
        if (siteName) {
            document.title = siteName
        }
    }, [siteName])

    // 动态设置 favicon
    useEffect(() => {
        if (siteFavicon) {
            let link = document.querySelector("link[rel~='icon']")
            if (!link) {
                link = document.createElement('link')
                link.rel = 'icon'
                document.head.appendChild(link)
            }
            link.href = siteFavicon
        }
    }, [siteFavicon])

    // 记录客访量
    useEffect(() => {
        const recordVisit = async () => {
            try {
                const lastVisit = localStorage.getItem('last_site_visit')
                const today = new Date().toDateString()
                if (lastVisit !== today) {
                    await fetch('/api/stats/visit', { method: 'POST' })
                    localStorage.setItem('last_site_visit', today)
                }
            } catch (error) {
                // 忽略错误
            }
        }
        recordVisit()
    }, [])

    // 刷新用户信息（确保 emailVerified 等状态是最新的）
    useEffect(() => {
        if (isAuthenticated && token) {
            // 顾客 token 走 customer API；其他角色走 auth API
            const url = user?.role === 'CUSTOMER' ? '/api/customer/me' : '/api/auth/me'
            fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
                .then(res => res.json())
                .then(data => {
                    if (data.user) {
                        updateUser(data.user)
                    } else if (data.error) {
                        // Token 过期或无效，退出登录
                        logout()
                    }
                })
                .catch(() => {
                    // 网络错误，不做处理
                })
        }
    }, [isAuthenticated, token, user?.role])

    if (!skinReady) return null

    return (
        <Router>
            <div className="app">
                <EmailVerificationBanner />
                <Routes>
                    {/* Admin 路由：仅平台超管可访问 /admin */}
                    <Route path="/admin/*" element={
                        ['ADMIN', 'SUPER_ADMIN'].includes(useAuthStore.getState().user?.role)
                            ? <AdminDashboard />
                            : <NotFound />
                    } />

                    {/* 代理商后台 */}
                    <Route path="/agent/*" element={
                        useAuthStore.getState().user?.role === 'AGENT'
                            ? <AgentDashboard />
                            : <NotFound />
                    } />

                    {/* 代理分站 /s/:slug */}
                    <Route path="/s/:slug/*" element={<Storefront />} />

                    {/* SaaS 商户店面 /v/:slug （必须在 /v/:slug/admin 之前） */}
                    <Route path="/v/:slug/admin/*" element={<ShopAdminWrapper />} />
                    <Route path="/v/:slug/*" element={<MerchantStorefront />} />

                    {/* 商户注册（公开） */}
                    <Route path="/register" element={<MerchantRegister />} />

                    {/* 商户登录（公开） */}
                    <Route path="/login" element={<MerchantLogin />} />

                    {/* 平台超管后台 /Man */}
                    <Route path="/Man/login" element={<MerchantLogin />} />
                    <Route path="/Man/*" element={<ManDashboard />} />

                    {/* SaaS 商户首页 + 独立登录/注册 */}
                    <Route path="/saas" element={<SaasPage />} />
                    <Route path="/merchant" element={<SaasPage />} />
                    <Route path="/saas/login" element={<SaasLogin />} />
                    <Route path="/saas/register" element={<SaasRegister />} />

                    {/* 代理申请 */}
                    <Route path="/agent-apply" element={<AgentApply />} />

                    {/* 主页 = 招商落地页 */}
                    <Route path="/" element={<Landing />} />

                    {/* 皮肤路由（原主站商城，现在通过 /store 访问）*/}
                    {skin === 'zen' ? (
                        <Route element={<ZenLayoutShell />}>
                            <Route path="/" element={<ZenProducts />} />
                            <Route path="/products" element={<Navigate to="/" replace />} />
                            <Route path="/products/:id" element={<ZenProductDetail />} />
                            <Route path="/checkout" element={<ZenCheckout />} />
                            <Route path="/order-query" element={<ZenOrderQuery />} />
                            <Route path="/order/:orderNo" element={<ZenOrderResult />} />
                            <Route path="/login" element={<ZenLogin />} />
                            <Route path="/register" element={<ZenRegister />} />
                            <Route path="/forgot-password" element={<ForgotPassword />} />
                            <Route path="/reset-password" element={<ResetPassword />} />
                            <Route path="/user/*" element={<ZenUserCenter />} />
                            <Route path="/verify-email" element={<VerifyEmail />} />
                            <Route path="/tickets/new" element={<TicketNew />} />
                            <Route path="/tickets/:id" element={<TicketDetail />} />
                            <Route path="/terms" element={<Terms />} />
                            <Route path="/refund-policy" element={<RefundPolicy />} />
                            <Route path="*" element={<ZenNotFound />} />
                        </Route>
                    ) : skin === 'fresh' ? (
                        <Route element={<FreshLayoutShell />}>
                            <Route path="/" element={<FreshProducts />} />
                            <Route path="/products" element={<Navigate to="/" replace />} />
                            <Route path="/products/:id" element={<FreshProductDetail />} />
                            <Route path="/checkout" element={<FreshCheckout />} />
                            <Route path="/order-query" element={<FreshOrderQuery />} />
                            <Route path="/order/:orderNo" element={<FreshOrderResult />} />
                            <Route path="/login" element={<FreshLogin />} />
                            <Route path="/register" element={<FreshRegister />} />
                            <Route path="/forgot-password" element={<ForgotPassword />} />
                            <Route path="/reset-password" element={<ResetPassword />} />
                            <Route path="/user/*" element={<FreshUserCenter />} />
                            <Route path="/verify-email" element={<VerifyEmail />} />
                            <Route path="/tickets/new" element={<TicketNew />} />
                            <Route path="/tickets/:id" element={<TicketDetail />} />
                            <Route path="/terms" element={<Terms />} />
                            <Route path="/refund-policy" element={<RefundPolicy />} />
                            <Route path="*" element={<FreshNotFound />} />
                        </Route>
                    ) : (
                        /* Classic 皮肤 */
                        <Route element={<ClassicLayoutShell />}>
                            <Route path="/" element={<Products />} />
                            <Route path="/products" element={<Navigate to="/" replace />} />
                            <Route path="/about" element={<Home />} />
                            <Route path="/products/:id" element={<ProductDetail />} />
                            <Route path="/cart" element={<Cart />} />
                            <Route path="/checkout" element={<Checkout />} />
                            <Route path="/order/:orderNo" element={<OrderResult />} />
                            <Route path="/login" element={<Login />} />
                            <Route path="/register" element={<Register />} />
                            <Route path="/verify-email" element={<VerifyEmail />} />
                            <Route path="/forgot-password" element={<ForgotPassword />} />
                            <Route path="/reset-password" element={<ResetPassword />} />
                            <Route path="/user/*" element={<UserCenter />} />
                            <Route path="/search" element={<Search />} />
                            <Route path="/tickets/new" element={<TicketNew />} />
                            <Route path="/tickets/:id" element={<TicketDetail />} />
                            <Route path="/terms" element={<Terms />} />
                            <Route path="/refund-policy" element={<RefundPolicy />} />
                            <Route path="/order-query" element={<OrderQuery />} />
                            <Route path="*" element={<NotFound />} />
                        </Route>
                    )}
                </Routes>
                <Toaster position="top-center" />
            </div>
        </Router>
    )
}

// ShopAdmin 路由包装器（商户后台，需要 TENANT_ADMIN 角色）
function ShopAdminWrapper() {
    const { slug } = useParams()
    const role = useAuthStore((s) => s.user?.role)
    if (!['TENANT_ADMIN', 'SUPER_ADMIN', 'ADMIN'].includes(role)) {
        return <NotFound />
    }
    return <AdminDashboardWithProvider basePath={`/v/${slug}/admin`} />
}

export default App

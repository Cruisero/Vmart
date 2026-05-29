import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, useParams, useLocation, useNavigationType } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import ForgotPassword from './pages/Auth/ForgotPassword'
import ResetPassword from './pages/Auth/ResetPassword'
import NotFound from './pages/NotFound'
import { useThemeStore } from './store/themeStore'
import { useAuthStore } from './store/authStore'
import { useSkinStore } from './store/skinStore'
import AgentDashboard from './pages/Agent/Dashboard'
import AgentApply from './pages/AgentApply'
import Storefront from './pages/Storefront'
import SaasPage from './pages/Saas'
import SaasLogin from './pages/Saas/Login'
import SaasRegister from './pages/Saas/Register'
// ── SaaS 平台页面 ────────────────────────────────────
import MerchantRegister from './pages/MerchantAuth/Register'
import MerchantLogin from './pages/MerchantAuth/Login'
import ManDashboard from './pages/Man/Dashboard'
import Landing from './pages/Landing'
import AdminDashboardWithProvider from './pages/Admin/Dashboard'
import MerchantStorefront from './pages/MerchantStorefront'

const isCustomDomain = () => {
    const host = window.location.hostname
    const mainDomains = ['localhost', '127.0.0.1', 'vmart.cc', 'www.vmart.cc', 'fallback.vmart.cc']
    return !mainDomains.includes(host)
}

function ScrollToTop() {
    const { pathname } = useLocation()
    const navigationType = useNavigationType()

    useEffect(() => {
        if (navigationType === 'PUSH' || navigationType === 'REPLACE') {
            window.scrollTo({ top: 0, behavior: 'instant' })
        }
    }, [pathname, navigationType])

    return null
}

function App() {
    const [resolvedSlug, setResolvedSlug] = useState(null)
    const [resolvingDomain, setResolvingDomain] = useState(isCustomDomain())
    const [domainError, setDomainError] = useState(null)
    const initTheme = useThemeStore((state) => state.initTheme)
    const { isAuthenticated, token, user, updateUser, logout } = useAuthStore()
    const { fetchSkin, skinReady, siteName, siteFavicon } = useSkinStore()

    useEffect(() => { initTheme() }, [initTheme])
    useEffect(() => { fetchSkin() }, [])

    // 动态设置页面标题（仅在非店面、管理后台、代理后台与招商落地页）
    useEffect(() => {
        const path = window.location.pathname
        if (siteName && !/^\/(v|s|Man|man|agent|admin)\b/.test(path) && path !== '/') {
            document.title = siteName
        }
    }, [siteName])

    // 动态设置 favicon（仅在非店面页面）
    useEffect(() => {
        if (siteFavicon && !/^\/v\//.test(window.location.pathname)) {
            let link = document.querySelector("link[rel~='icon']")
            if (!link) {
                link = document.createElement('link')
                link.rel = 'icon'
                document.head.appendChild(link)
            }
            link.href = siteFavicon
        }
    }, [siteFavicon])

    // 记录访问量
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

    // 刷新用户信息
    useEffect(() => {
        if (isAuthenticated && token) {
            const url = user?.role === 'CUSTOMER' ? '/api/customer/me' : '/api/auth/me'
            fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
                .then(res => res.json())
                .then(data => {
                    if (data.user) {
                        updateUser(data.user)
                    } else if (data.error) {
                        logout()
                    }
                })
                .catch(() => { })
        }
    }, [isAuthenticated, token, user?.role])

    // 解析自定义域名所关联的租户店面
    useEffect(() => {
        if (isCustomDomain()) {
            setResolvingDomain(true)
            fetch(`/api/tenant/resolve-by-domain?domain=${window.location.hostname}`)
                .then(r => {
                    if (!r.ok) throw new Error('自定义域名未绑定、未激活，或者解析配置尚未完成')
                    return r.json()
                })
               .then(data => {
                    if (data.slug) {
                        setResolvedSlug(data.slug)
                    } else {
                        throw new Error('自定义域名未关联有效店铺')
                    }
                })
                .catch(err => {
                    setDomainError(err.message)
                })
                .finally(() => {
                    setResolvingDomain(false)
                })
        }
    }, [])

    if (resolvingDomain) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#F3F4F6' }}>
                <div style={{ width: '40px', height: '40px', border: '3px solid #E5E7EB', borderTopColor: '#3B82F6', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        )
    }

    if (domainError) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#F9FAFB', fontFamily: 'system-ui, -apple-system, sans-serif', padding: 24, textAlign: 'center' }}>
                <div style={{ fontSize: '4rem', marginBottom: 16 }}>🌐</div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#111827', marginBottom: 8 }}>域名未生效或配置错误</h2>
                <p style={{ color: '#6B7280', maxWidth: '380px', lineHeight: '1.5', marginBottom: 24 }}>{domainError}</p>
                <a href="https://vmart.cc" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '10px 20px', background: '#2563EB', color: '#FFF', fontWeight: '500', borderRadius: '8px', textDecoration: 'none', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                    访问平台主站
                </a>
            </div>
        )
    }

    if (!skinReady) return null

    if (resolvedSlug) {
        return (
            <Router>
                <ScrollToTop />
                <div className="app">
                    <Routes>
                        {/* 自定义域名下的商户后台入口 www.custom.com/admin */}
                        <Route path="/admin/*" element={<ShopAdminWrapper resolvedSlug={resolvedSlug} />} />

                        {/* 自定义域名下的独立店铺主页与其它商品页 www.custom.com/ */}
                        <Route path="/*" element={<MerchantStorefront propSlug={resolvedSlug} />} />
                    </Routes>
                    <Toaster position="top-center" />
                </div>
            </Router>
        )
    }

    return (
        <Router>
            <ScrollToTop />
            <div className="app">
                <Routes>
                    {/* 商户后台 /v/:slug/admin —— 必须在 /v/:slug 之前 */}
                    <Route path="/v/:slug/admin/*" element={<ShopAdminWrapper />} />

                    {/* 商户店面 /v/:slug */}
                    <Route path="/v/:slug/*" element={<MerchantStorefront />} />

                    {/* 代理分站 /s/:slug */}
                    <Route path="/s/:slug/*" element={<Storefront />} />

                    {/* 代理商后台 */}
                    <Route path="/agent/*" element={
                        useAuthStore.getState().user?.role === 'AGENT'
                            ? <AgentDashboard />
                            : <NotFound />
                    } />

                    {/* 平台超管后台 /Man */}
                    <Route path="/Man/login" element={<MerchantLogin />} />
                    <Route path="/Man/*" element={<ManDashboard />} />

                    {/* SaaS 商户注册/登录入口 */}
                    <Route path="/register" element={<MerchantRegister />} />
                    <Route path="/login" element={<MerchantLogin />} />

                    {/* SaaS 介绍页 */}
                    <Route path="/saas" element={<SaasPage />} />
                    <Route path="/merchant" element={<SaasPage />} />
                    <Route path="/saas/login" element={<SaasLogin />} />
                    <Route path="/saas/register" element={<SaasRegister />} />

                    {/* 代理申请 */}
                    <Route path="/agent-apply" element={<AgentApply />} />

                    {/* 公共邮箱/密码相关 */}
                    <Route path="/forgot-password" element={<ForgotPassword />} />
                    <Route path="/reset-password" element={<ResetPassword />} />

                    {/* 主页 = 招商落地页 */}
                    <Route path="/" element={<Landing />} />

                    {/* 其他全部 → 404 */}
                    <Route path="*" element={<NotFound />} />
                </Routes>
                <Toaster position="top-center" />
            </div>
        </Router>
    )
}

// ShopAdmin 路由包装器（商户后台，需要 TENANT_ADMIN/ADMIN 角色）
function ShopAdminWrapper({ resolvedSlug }) {
    const { slug: paramSlug } = useParams()
    const slug = resolvedSlug || paramSlug
    const role = useAuthStore((s) => s.user?.role)
    if (!['TENANT_ADMIN', 'SUPER_ADMIN', 'ADMIN'].includes(role)) {
        return <NotFound />
    }
    return <AdminDashboardWithProvider basePath={resolvedSlug ? '/admin' : `/v/${slug}/admin`} />
}

export default App

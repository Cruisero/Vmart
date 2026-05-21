import { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, useParams } from 'react-router-dom'
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

function App() {
    const initTheme = useThemeStore((state) => state.initTheme)
    const { isAuthenticated, token, user, updateUser, logout } = useAuthStore()
    const { fetchSkin, skinReady, siteName, siteFavicon } = useSkinStore()

    useEffect(() => { initTheme() }, [initTheme])
    useEffect(() => { fetchSkin() }, [])

    // 动态设置页面标题（仅在非店面页面，店面会自己覆盖）
    useEffect(() => {
        if (siteName && !/^\/v\//.test(window.location.pathname)) {
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

    if (!skinReady) return null

    return (
        <Router>
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
function ShopAdminWrapper() {
    const { slug } = useParams()
    const role = useAuthStore((s) => s.user?.role)
    if (!['TENANT_ADMIN', 'SUPER_ADMIN', 'ADMIN'].includes(role)) {
        return <NotFound />
    }
    return <AdminDashboardWithProvider basePath={`/v/${slug}/admin`} />
}

export default App

import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
    FiShoppingCart, FiSearch, FiUser, FiMenu, FiX,
    FiPackage, FiMessageSquare, FiLogOut, FiSettings
} from 'react-icons/fi'
import { useBuyerL } from '../../../../hooks/useBuyerL'
import { useCartStore } from '../../../../store/cartStore'
import { useAuthStore } from '../../../../store/authStore'
import { useSkinStore } from '../../../../store/skinStore'
import { useStorefront, useStorefrontPath } from '../../../../store/storefrontStore'
import './Sidebar.css'

function SidebarContent({ categories, activeCategory, onCategoryClick, onClose }) {
    const L = useBuyerL()
    const location = useLocation()
    const { user, isAuthenticated, logout } = useAuthStore()
    const { siteName, siteLogo } = useSkinStore()
    const storefront = useStorefront()
    const displayLogo = storefront ? storefront.shopLogo : siteLogo
    const displayName = storefront ? storefront.shopName : siteName
    const { withPrefix } = useStorefrontPath()
    const cartItems = useCartStore(s => s.items)
    const cartCount = cartItems.reduce((sum, i) => sum + i.quantity, 0)
    const navigate = useNavigate()
    const homePath = withPrefix('/')
    const searchPath = withPrefix('/search')
    const cartPath = withPrefix('/cart')
    const orderQueryPath = withPrefix('/order-query')
    const ticketPath = withPrefix('/tickets/new')
    const userPath = withPrefix('/user')
    const adminPath = storefront?._tenantMode ? withPrefix('/admin') : '/Man/dashboard'

    const isActive = (path) => location.pathname === path

    const handleLogout = () => {
        logout()
        navigate(homePath)
        onClose?.()
    }

    return (
        <>
            {/* Logo */}
            <Link to={homePath} className="fs-logo" onClick={onClose}>
                {displayLogo ? (
                    <img src={displayLogo} alt={displayName || 'Logo'} className="fs-logo-img" />
                ) : (
                    <>
                        <svg className="fs-logo-icon" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <defs>
                                <linearGradient id="fs-g" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
                                    <stop offset="0%" stopColor="#EF4444"/>
                                    <stop offset="100%" stopColor="#F43F5E"/>
                                </linearGradient>
                            </defs>
                            <path d="M13 16c0-2.761 2.239-5 5-5s5 2.239 5 5" stroke="url(#fs-g)" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
                            <rect x="9" y="16" width="18" height="13" rx="3" fill="url(#fs-g)"/>
                            <circle cx="15" cy="22.5" r="1.3" fill="white"/>
                            <circle cx="21" cy="22.5" r="1.3" fill="white"/>
                        </svg>
                        <span className="fs-logo-text">{displayName ? displayName : <>V<span className="fs-logo-accent">mart</span></>}</span>
                    </>
                )}
            </Link>

            <div className="fs-section">
                <button
                    className="fs-nav-item"
                    onClick={() => { navigate(searchPath); onClose?.() }}
                >
                    <FiSearch className="fs-nav-icon" />
                    {L('search.title')}
                </button>
            </div>

            <div className="fs-divider" />

            <div className="fs-section">
                <div className="fs-section-label">{L('products.category')}</div>
                {categories.map(cat => (
                    <button
                        key={cat.id}
                        className={`fs-nav-item${activeCategory === cat.id ? ' active' : ''}`}
                        onClick={() => { onCategoryClick(cat.id); onClose?.() }}
                    >
                        <span className="fs-nav-icon">{cat.icon}</span>
                        {cat.name}
                    </button>
                ))}
            </div>

            <div className="fs-divider" />

            <div className="fs-section">
                <div className="fs-section-label">{L('nav.home')}</div>
                <Link to={cartPath} className={`fs-nav-item${isActive(cartPath) ? ' active' : ''}`} onClick={onClose}>
                    <FiShoppingCart className="fs-nav-icon" />
                    {L('cart.title')}
                    {cartCount > 0 && <span className="fs-nav-badge">{cartCount}</span>}
                </Link>
                <Link to={orderQueryPath} className={`fs-nav-item${isActive(orderQueryPath) ? ' active' : ''}`} onClick={onClose}>
                    <FiPackage className="fs-nav-icon" />
                    {L('nav.orderQuery')}
                </Link>
                <Link to={ticketPath} className={`fs-nav-item${isActive(ticketPath) ? ' active' : ''}`} onClick={onClose}>
                    <FiMessageSquare className="fs-nav-icon" />
                    {L('ticket.title')}
                </Link>
                {['ADMIN', 'TENANT_ADMIN', 'SUPER_ADMIN'].includes(user?.role) && (
                    <Link to={adminPath} className={`fs-nav-item${location.pathname.startsWith(adminPath) ? ' active' : ''}`} onClick={onClose}>
                        <FiSettings className="fs-nav-icon" />
                        {L('nav.dashboard')}
                    </Link>
                )}
            </div>

            <div className="fs-user-section">
                {isAuthenticated ? (
                    <>
                        <Link to={userPath} className="fs-user-card" onClick={onClose}>
                            <div className="fs-avatar">
                                {user?.avatar
                                    ? <img src={user.avatar} alt="" />
                                    : (user?.username?.[0] || user?.email?.[0] || 'U').toUpperCase()
                                }
                            </div>
                            <div className="fs-user-info">
                                <div className="fs-user-name">{user?.username || user?.email}</div>
                                <div className="fs-user-role">{user?.role}</div>
                            </div>
                        </Link>
                        <button
                            className="fs-nav-item"
                            style={{ marginTop: 4, color: '#EF4444' }}
                            onClick={handleLogout}
                        >
                            <FiLogOut className="fs-nav-icon" />
                            {L('nav.logout')}
                        </button>
                    </>
                ) : (
                    <Link to={withPrefix('/login')} className="fs-login-btn" onClick={onClose}>
                        {L('nav.login')} / {L('nav.register')}
                    </Link>
                )}
            </div>
        </>
    )
}

export default function FreshSidebar({ categories, activeCategory, onCategoryClick }) {
    const [drawerOpen, setDrawerOpen] = useState(false)
    const location = useLocation()
    const storefront = useStorefront()
    const { withPrefix } = useStorefrontPath()
    const topbarHomePath = withPrefix('/')
    const topbarCartPath = withPrefix('/cart')
    const topbarTitle = storefront?.shopName || useSkinStore.getState().siteName || 'Vmart'

    // 路由变化时关闭 drawer
    useEffect(() => { setDrawerOpen(false) }, [location.pathname])

    const cartItems = useCartStore(s => s.items)
    const cartCount = cartItems.reduce((sum, i) => sum + i.quantity, 0)

    return (
        <>
            {/* 桌面侧边栏 */}
            <aside className="fresh-sidebar">
                <SidebarContent
                    categories={categories}
                    activeCategory={activeCategory}
                    onCategoryClick={onCategoryClick}
                />
            </aside>

            {/* 移动端顶部栏 */}
            <header className="fresh-topbar">
                <Link to={topbarHomePath} className="fresh-topbar-logo">
                    <span>🛍</span> {topbarTitle}
                </Link>
                <div className="fresh-topbar-actions">
                    <Link to={topbarCartPath} className="fresh-topbar-btn">
                        <FiShoppingCart />
                        {cartCount > 0 && <span className="fresh-topbar-badge" />}
                    </Link>
                    <button className="fresh-topbar-btn" onClick={() => setDrawerOpen(true)}>
                        <FiMenu />
                    </button>
                </div>
            </header>

            {/* 移动端抽屉 */}
            {drawerOpen && (
                <div className="fresh-drawer-overlay open" onClick={() => setDrawerOpen(false)}>
                    <div className="fresh-drawer" onClick={e => e.stopPropagation()}>
                        <SidebarContent
                            categories={categories}
                            activeCategory={activeCategory}
                            onCategoryClick={onCategoryClick}
                            onClose={() => setDrawerOpen(false)}
                        />
                    </div>
                </div>
            )}
        </>
    )
}

import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
    FiShoppingCart, FiSearch, FiUser, FiMenu, FiX,
    FiPackage, FiMessageSquare, FiLogOut, FiSettings
} from 'react-icons/fi'
import { useCartStore } from '../../../store/cartStore'
import { useAuthStore } from '../../../store/authStore'
import { useSkinStore } from '../../../store/skinStore'
import './Sidebar.css'

function SidebarContent({ categories, activeCategory, onCategoryClick, onClose }) {
    const location = useLocation()
    const { user, isAuthenticated, logout } = useAuthStore()
    const { siteName, siteLogo } = useSkinStore()
    const cartItems = useCartStore(s => s.items)
    const cartCount = cartItems.reduce((sum, i) => sum + i.quantity, 0)
    const navigate = useNavigate()

    const isActive = (path) => location.pathname === path

    const handleLogout = () => {
        logout()
        navigate('/')
        onClose?.()
    }

    return (
        <>
            {/* Logo */}
            <Link to="/" className="fs-logo" onClick={onClose}>
                {siteLogo ? (
                    <img src={siteLogo} alt={siteName || 'Logo'} className="fs-logo-img" />
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
                        <span className="fs-logo-text">{siteName ? siteName : <>V<span className="fs-logo-accent">mart</span></>}</span>
                    </>
                )}
            </Link>

            {/* 搜索入口 */}
            <div className="fs-section">
                <button
                    className="fs-nav-item"
                    onClick={() => { navigate('/search'); onClose?.() }}
                >
                    <FiSearch className="fs-nav-icon" />
                    搜索商品
                </button>
            </div>

            <div className="fs-divider" />

            {/* 分类 */}
            <div className="fs-section">
                <div className="fs-section-label">分类</div>
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

            {/* 导航 */}
            <div className="fs-section">
                <div className="fs-section-label">导航</div>
                <Link to="/cart" className={`fs-nav-item${isActive('/cart') ? ' active' : ''}`} onClick={onClose}>
                    <FiShoppingCart className="fs-nav-icon" />
                    购物车
                    {cartCount > 0 && <span className="fs-nav-badge">{cartCount}</span>}
                </Link>
                <Link to="/order-query" className={`fs-nav-item${isActive('/order-query') ? ' active' : ''}`} onClick={onClose}>
                    <FiPackage className="fs-nav-icon" />
                    查询订单
                </Link>
                <Link to="/tickets/new" className={`fs-nav-item${isActive('/tickets/new') ? ' active' : ''}`} onClick={onClose}>
                    <FiMessageSquare className="fs-nav-icon" />
                    提交工单
                </Link>
                {['ADMIN', 'SUPER_ADMIN', 'SAAS_ADMIN'].includes(user?.role) && (
                    <Link to="/admin" className={`fs-nav-item${location.pathname.startsWith('/admin') ? ' active' : ''}`} onClick={onClose}>
                        <FiSettings className="fs-nav-icon" />
                        管理后台
                    </Link>
                )}
            </div>

            {/* 用户区域 */}
            <div className="fs-user-section">
                {isAuthenticated ? (
                    <>
                        <Link to="/user" className="fs-user-card" onClick={onClose}>
                            <div className="fs-avatar">
                                {user?.avatar
                                    ? <img src={user.avatar} alt="" />
                                    : (user?.username?.[0] || user?.email?.[0] || 'U').toUpperCase()
                                }
                            </div>
                            <div className="fs-user-info">
                                <div className="fs-user-name">{user?.username || user?.email}</div>
                                <div className="fs-user-role">{['ADMIN', 'SUPER_ADMIN', 'SAAS_ADMIN'].includes(user?.role) ? '管理员' : '普通用户'}</div>
                            </div>
                        </Link>
                        <button
                            className="fs-nav-item"
                            style={{ marginTop: 4, color: '#EF4444' }}
                            onClick={handleLogout}
                        >
                            <FiLogOut className="fs-nav-icon" />
                            退出登录
                        </button>
                    </>
                ) : (
                    <Link to="/login" className="fs-login-btn" onClick={onClose}>
                        登录 / 注册
                    </Link>
                )}
            </div>
        </>
    )
}

export default function FreshSidebar({ categories, activeCategory, onCategoryClick }) {
    const [drawerOpen, setDrawerOpen] = useState(false)
    const location = useLocation()

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
                <Link to="/" className="fresh-topbar-logo">
                    <span>🛍</span> {useSkinStore.getState().siteName || 'Vmart'}
                </Link>
                <div className="fresh-topbar-actions">
                    <Link to="/cart" className="fresh-topbar-btn">
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

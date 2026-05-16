import { Link, useNavigate } from 'react-router-dom'
import { FiPackage, FiLogOut } from 'react-icons/fi'
import { useAuthStore } from '../../../store/authStore'
import { useSkinStore } from '../../../store/skinStore'
import { useStorefront } from '../../../store/storefrontStore'
import { getStorefrontBasePath } from '../../../utils/agentDomain'
import './Navbar.css'

export default function FreshNavbar() {
    const { user, isAuthenticated, logout } = useAuthStore()
    const { siteName, siteLogo } = useSkinStore()
    const storefront = useStorefront()
    const navigate = useNavigate()

    const displayName = storefront ? storefront.shopName : siteName
    const displayLogo = storefront ? storefront.shopLogo : siteLogo
    const prefix = storefront ? getStorefrontBasePath(storefront) : ''

    const handleLogout = () => {
        logout()
        navigate('/')
    }

    return (
        <header className="fn-bar">
        <div className="fn-bar-inner">
            <Link to={`${prefix}/`} className="fn-logo">
                {displayLogo ? (
                    <img src={displayLogo} alt={displayName || 'Logo'} className="fn-logo-img" />
                ) : (
                    <>
                        <svg className="fn-logo-icon" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <defs>
                                <linearGradient id="fn-g" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
                                    <stop offset="0%" stopColor="#EF4444"/>
                                    <stop offset="100%" stopColor="#F43F5E"/>
                                </linearGradient>
                            </defs>
                            <path d="M13 16c0-2.761 2.239-5 5-5s5 2.239 5 5" stroke="url(#fn-g)" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
                            <rect x="9" y="16" width="18" height="13" rx="3" fill="url(#fn-g)"/>
                            <circle cx="15" cy="22.5" r="1.3" fill="white"/>
                            <circle cx="21" cy="22.5" r="1.3" fill="white"/>
                        </svg>
                        <span className="fn-logo-text">{displayName ? displayName : <>V<span className="fn-logo-accent">mart</span></>}</span>
                    </>
                )}
            </Link>

            <div className="fn-actions">
                <Link to={`${prefix}/order-query`} className="fn-link">
                    <FiPackage size={15} />
                    <span>查询订单</span>
                </Link>

                <div className="fn-divider" />

                {isAuthenticated ? (
                    <>
                        {!storefront && user?.role === 'AGENT' && (
                            <Link to="/agent" className="fn-link" style={{ color: '#10B981', fontWeight: 600 }}>代理后台</Link>
                        )}
                        <Link to={storefront ? `${prefix}/` : '/user'} className="fn-avatar">
                            {user?.avatar
                                ? <img src={user.avatar} alt="" />
                                : (user?.username?.[0] || user?.email?.[0] || 'U').toUpperCase()
                            }
                        </Link>
                        <button
                            className="fn-link"
                            style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#EF4444' }}
                            onClick={handleLogout}
                        >
                            <FiLogOut size={15} />
                        </button>
                    </>
                ) : (
                    <Link to={`${prefix}/login`} className="fn-login-btn">
                        登录 / 注册
                    </Link>
                )}
            </div>
        </div>
        </header>
    )
}

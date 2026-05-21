import { Link, useNavigate } from 'react-router-dom'
import { FiPackage, FiLogOut } from 'react-icons/fi'
import { useBuyerL } from '../../../../hooks/useBuyerL'
import { useAuthStore } from '../../../../store/authStore'
import { useSkinStore } from '../../../../store/skinStore'
import { useStorefront } from '../../../../store/storefrontStore'
import { getStorefrontBasePath } from '../../../../utils/agentDomain'
import LanguageToggle from '../../../../components/common/LanguageToggle'
import './Navbar.css'

export default function FreshNavbar() {
    const L = useBuyerL()
    const { user, isAuthenticated, logout } = useAuthStore()
    const { siteName, siteLogo } = useSkinStore()
    const storefront = useStorefront()
    const navigate = useNavigate()

    const displayName = storefront ? storefront.shopName : siteName
    const displayLogo = storefront ? storefront.shopLogo : siteLogo
    const prefix = storefront ? getStorefrontBasePath(storefront) : ''
    const homePath = `${prefix}/`

    const handleLogout = () => {
        logout()
        navigate(homePath)
    }

    return (
        <header className="fn-bar">
        <div className="fn-bar-inner">
            <Link to={homePath} className="fn-logo">
                {displayLogo ? (
                    <img src={displayLogo} alt={displayName || 'Logo'} className="fn-logo-img" />
                ) : (
                    <span className="fn-logo-text">{displayName ? displayName : <>V<span className="fn-logo-accent">mart</span></>}</span>
                )}
            </Link>

            <div className="fn-actions">
                <Link to={`${prefix}/order-query`} className="fn-link">
                    <FiPackage size={15} />
                    <span>{L('nav.orderQuery')}</span>
                </Link>

                <LanguageToggle />

                <div className="fn-divider" />

                {isAuthenticated ? (
                    <>
                        {!storefront && user?.role === 'AGENT' && (
                            <Link to="/agent" className="fn-link" style={{ color: '#10B981', fontWeight: 600 }}>Agent</Link>
                        )}
                        <Link to={storefront ? `${prefix}/user` : '/user'} className="fn-avatar">
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
                        {L('nav.login')} / {L('nav.register')}
                    </Link>
                )}
            </div>
        </div>
        </header>
    )
}

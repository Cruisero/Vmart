import { Link, useNavigate } from 'react-router-dom'
import { FiPackage, FiLogOut } from 'react-icons/fi'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../../../../store/authStore'
import { useSkinStore } from '../../../../store/skinStore'
import { useStorefront } from '../../../../store/storefrontStore'
import { getStorefrontBasePath } from '../../../../utils/agentDomain'
import LanguageToggle from '../../../../components/common/LanguageToggle'
import './Navbar.css'

export default function ZenNavbar() {
    const { t } = useTranslation()
    const { user, isAuthenticated, logout } = useAuthStore()
    const { siteName, siteLogo } = useSkinStore()
    const storefront = useStorefront()
    const navigate = useNavigate()

    const handleLogout = () => { logout(); navigate('/') }

    const displayName = storefront ? storefront.shopName : (siteName || 'VMART')
    const displayLogo = storefront ? storefront.shopLogo : siteLogo
    const prefix = storefront ? getStorefrontBasePath(storefront) : ''

    return (
        <header className="zn-bar">
            <div className="zn-bar-inner">
                <Link to={`${prefix}/`} className="zn-logo">
                    {displayLogo
                        ? <img src={displayLogo} alt={displayName} className="zn-logo-img" />
                        : displayName
                    }
                </Link>
                <nav className="zn-actions">
                    <Link to={`${prefix}/order-query`} className="zn-link"><FiPackage size={14} /><span>{t('nav.orderQuery')}</span></Link>
                    <LanguageToggle />
                    {isAuthenticated ? (
                        <>
                            {!storefront && user?.role === 'AGENT' && (
                                <Link to="/agent" className="zn-link" style={{ color: '#10B981', fontWeight: 600 }}>Agent</Link>
                            )}
                            <Link to={storefront ? `${prefix}/user` : '/user'} className="zn-link">{user?.username || t('nav.user')}</Link>
                            <button className="zn-link zn-logout" onClick={handleLogout}><FiLogOut size={14} /></button>
                        </>
                    ) : (
                        <Link to={`${prefix}/login`} className="zn-login-btn">{t('nav.login')}</Link>
                    )}
                </nav>
            </div>
        </header>
    )
}

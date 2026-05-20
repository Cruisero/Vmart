import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { FiSearch, FiShoppingCart, FiUser, FiMenu, FiX, FiTrendingUp, FiHeart, FiSun, FiMoon } from 'react-icons/fi'
import { useTranslation } from 'react-i18next'
import { useCartStore } from '../../../store/cartStore'
import { useAuthStore } from '../../../store/authStore'
import { useStorefront } from '../../../store/storefrontStore'
import { useThemeStore } from '../../../store/themeStore'
import LanguageToggle from '../../../components/common/LanguageToggle'

export default function OriginNavbar({ shop, slug, onSearchFocus }) {
    const { t } = useTranslation()
    const navigate = useNavigate()
    const location = useLocation()
    const storefront = useStorefront()
    const cartItems = useCartStore(s => s.items)
    const { isAuthenticated } = useAuthStore()
    const { theme, toggleTheme } = useThemeStore()

    const [searchQuery, setSearchQuery] = useState('')
    const [showDropdown, setShowDropdown] = useState(false)
    const [mobileOpen, setMobileOpen] = useState(false)
    const [scrolled, setScrolled] = useState(false)
    const [suggestions, setSuggestions] = useState([])
    const [recommendedProducts, setRecommendedProducts] = useState([])
    const [hotSearches, setHotSearches] = useState([])
    const [searchLoading, setSearchLoading] = useState(false)
    const searchRef = useRef(null)
    const debounceRef = useRef(null)

    const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0)
    const prefix = `/v/${slug}`

    const apiProductsUrl = storefront?._tenantMode && storefront?.slug
        ? `/api/v/${storefront.slug}/products`
        : storefront?.slug ? `/api/s/${storefront.slug}/products` : null
    const hotSearchUrl = storefront?._tenantMode && storefront?.slug
        ? `/api/v/${storefront.slug}/hot-searches?limit=8` : null
    const logSearchUrl = storefront?._tenantMode && storefront?.slug
        ? `/api/v/${storefront.slug}/search-log` : null

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 16)
        window.addEventListener('scroll', onScroll)
        return () => window.removeEventListener('scroll', onScroll)
    }, [])

    useEffect(() => { setMobileOpen(false); setShowDropdown(false) }, [location.pathname])

    useEffect(() => {
        const handler = (e) => {
            if (searchRef.current && !searchRef.current.contains(e.target)) {
                setShowDropdown(false)
            }
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    useEffect(() => {
        if (!apiProductsUrl) return
        fetch(`${apiProductsUrl}?limit=6`).then(r => r.json())
            .then(d => setRecommendedProducts(d.products || []))
            .catch(() => {})
        if (hotSearchUrl) {
            fetch(hotSearchUrl).then(r => r.json())
                .then(d => setHotSearches(d.keywords || []))
                .catch(() => {})
        }
    }, [apiProductsUrl, hotSearchUrl])

    useEffect(() => {
        if (!searchQuery.trim() || !apiProductsUrl) { setSuggestions([]); return }
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(async () => {
            setSearchLoading(true)
            try {
                const res = await fetch(`${apiProductsUrl}?search=${encodeURIComponent(searchQuery.trim())}&limit=6`)
                const data = await res.json()
                setSuggestions((data.products || []).slice(0, 6))
            } catch { setSuggestions([]) }
            finally { setSearchLoading(false) }
        }, 300)
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
    }, [searchQuery])

    const handleSearch = (query) => {
        const q = (query || searchQuery).trim()
        if (!q) return
        setShowDropdown(false)
        setSearchQuery('')
        if (logSearchUrl) {
            fetch(logSearchUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ keyword: q }) }).catch(() => {})
        }
        navigate(`${prefix}/search?q=${encodeURIComponent(q)}`)
    }

    const navLinks = [
        { to: `${prefix}`, label: t('nav.home'), exact: true },
        { to: `${prefix}/order-query`, label: t('nav.orderQuery') },
        { to: `${prefix}/tickets/new`, label: t('ticket.title') }
    ]

    return (
        <div ref={searchRef} className="og-navbar-wrap">
            <header className={`og-navbar ${scrolled ? 'scrolled' : ''}`}>
                <div className="og-navbar-inner">
                    <nav className="og-nav">
                        {navLinks.map(l => (
                            <Link
                                key={l.to}
                                to={l.to}
                                className={`og-nav-link ${
                                    (l.exact ? location.pathname.replace(/\/+$/, '') === l.to : location.pathname.startsWith(l.to))
                                        ? 'active' : ''
                                }`}
                            >
                                {l.label}
                            </Link>
                        ))}
                    </nav>

                    <div className="og-search">
                        <FiSearch className="og-search-icon" />
                        <input
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            onFocus={() => setShowDropdown(true)}
                            onBlur={() => {
                                // 延迟关闭，让点击事件先触发
                                setTimeout(() => setShowDropdown(false), 200)
                            }}
                            onKeyDown={e => { if (e.key === 'Enter') handleSearch(); if (e.key === 'Escape') setShowDropdown(false) }}
                            placeholder={t('nav.search')}
                        />
                        <button type="button" className="og-search-btn" onClick={() => handleSearch()}>{t('search.title')}</button>
                    </div>

                    <div className="og-actions">
                        <Link to={prefix} className="og-brand">
                            {shop.shopLogo
                                ? <img src={shop.shopLogo} alt={shop.shopName} />
                                : <span className="og-brand-text">{shop.shopName}</span>}
                        </Link>
                        <button className="og-icon-btn" onClick={toggleTheme} aria-label="切换主题">
                            {theme === 'dark' ? <FiSun /> : <FiMoon />}
                        </button>
                        <LanguageToggle />
                        <Link to={`${prefix}/cart`} className="og-icon-btn" aria-label="购物车">
                            <FiShoppingCart />
                            {cartCount > 0 && <span className="og-cart-badge">{cartCount > 99 ? '99+' : cartCount}</span>}
                        </Link>
                        <Link to={isAuthenticated ? `${prefix}/user` : `${prefix}/login`} className="og-icon-btn" aria-label="账号">
                            <FiUser />
                        </Link>
                        <button className="og-icon-btn og-mobile-toggle" onClick={() => setMobileOpen(o => !o)} aria-label="菜单">
                            {mobileOpen ? <FiX /> : <FiMenu />}
                        </button>
                    </div>
                </div>
            </header>

            {/* 搜索下拉：全屏覆盖 */}
            {showDropdown && (
                <div className="og-search-dropdown" onClick={(e) => {
                    // 点击空白区域关闭
                    if (e.target === e.currentTarget) setShowDropdown(false)
                }}>
                    <button
                        type="button"
                        className="og-dd-close"
                        onClick={() => setShowDropdown(false)}
                        aria-label="关闭搜索"
                    >✕ 关闭</button>
                    {searchQuery.trim() && suggestions.length > 0 && (
                        <div className="og-dd-section">
                            <div className="og-dd-header"><FiSearch size={14} /> 搜索建议</div>
                            {suggestions.map(p => (
                                <div key={p.id} className="og-dd-item" onClick={() => handleSearch(p.name)}>
                                    <span dangerouslySetInnerHTML={{
                                        __html: p.name.replace(new RegExp(`(${searchQuery})`, 'gi'), '<mark>$1</mark>')
                                    }} />
                                </div>
                            ))}
                        </div>
                    )}

                    {searchQuery.trim() && suggestions.length > 0 && (
                        <div className="og-dd-section">
                            <div className="og-dd-header"><FiHeart size={14} /> 猜你想要</div>
                            <div className="og-dd-products">
                                {suggestions.map(p => (
                                    <Link key={p.id} to={`${prefix}/products/${p.id}`} className="og-dd-product" onClick={() => setShowDropdown(false)}>
                                        <img src={p.image || '/placeholder.png'} alt={p.name} onError={e => { e.target.src = '/placeholder.png' }} />
                                        <div className="og-dd-product-name">{p.name}</div>
                                        <div className="og-dd-product-price">¥{p.price?.toFixed(2)}</div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}

                    {!searchQuery.trim() && hotSearches.length > 0 && (
                        <div className="og-dd-section">
                            <div className="og-dd-header"><FiTrendingUp size={14} /> 热门搜索</div>
                            <div className="og-dd-tags">
                                {hotSearches.map((kw, i) => (
                                    <span key={i} className="og-dd-tag" onClick={() => handleSearch(kw)}>{kw}</span>
                                ))}
                            </div>
                        </div>
                    )}

                    {!searchQuery.trim() && recommendedProducts.length > 0 && (
                        <div className="og-dd-section">
                            <div className="og-dd-header"><FiHeart size={14} /> 猜你喜欢</div>
                            <div className="og-dd-products">
                                {recommendedProducts.map(p => (
                                    <Link key={p.id} to={`${prefix}/products/${p.id}`} className="og-dd-product" onClick={() => setShowDropdown(false)}>
                                        <img src={p.image || '/placeholder.png'} alt={p.name} onError={e => { e.target.src = '/placeholder.png' }} />
                                        <div className="og-dd-product-name">{p.name}</div>
                                        <div className="og-dd-product-price">¥{p.price?.toFixed(2)}</div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}

                    {searchQuery.trim() && suggestions.length === 0 && !searchLoading && (
                        <div className="og-dd-empty">{t('search.noResults')}</div>
                    )}
                </div>
            )}

            {mobileOpen && (
                <div className="og-mobile-menu">
                    <form className="og-mobile-search" onSubmit={e => { e.preventDefault(); handleSearch() }}>
                        <FiSearch />
                        <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="搜索商品..." />
                    </form>
                    {navLinks.map(l => (
                        <Link key={l.to} to={l.to} className="og-mobile-link">{l.label}</Link>
                    ))}
                </div>
            )}
        </div>
    )
}

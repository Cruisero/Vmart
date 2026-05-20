import { useState, useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { FiShoppingCart, FiSearch, FiUser, FiSun, FiMoon, FiTrendingUp, FiX, FiHeart } from 'react-icons/fi'
import { useTranslation } from 'react-i18next'
import { useCartStore } from '../../../store/cartStore'
import { useAuthStore } from '../../../store/authStore'
import { useThemeStore } from '../../../store/themeStore'
import { useSkinStore } from '../../../store/skinStore'
import { useStorefront } from '../../../store/storefrontStore'
import { getStorefrontBasePath } from '../../../utils/agentDomain'
import LanguageToggle from '../LanguageToggle'
import logoImg from '../../../assets/logo.png'
import logoDarkImg from '../../../assets/logo-dark.png'
import './Navbar.css'

function Navbar() {
    const { t } = useTranslation()
    const location = useLocation()
    const navigate = useNavigate()
    const cartItems = useCartStore((state) => state.items)
    const { user, isAuthenticated } = useAuthStore()
    const { theme, toggleTheme } = useThemeStore()
    const { siteLogo } = useSkinStore()
    const storefront = useStorefront()
    const prefix = storefront ? getStorefrontBasePath(storefront) : ''

    const [searchQuery, setSearchQuery] = useState('')
    const [showDropdown, setShowDropdown] = useState(false)
    const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
    const [suggestions, setSuggestions] = useState([])
    const [searchLoading, setSearchLoading] = useState(false)
    const [recommendedProducts, setRecommendedProducts] = useState([])
    const [matchedProducts, setMatchedProducts] = useState([])
    const [hotSearches, setHotSearches] = useState([])
    const searchRef = useRef(null)
    const mobileSearchInputRef = useRef(null)
    const debounceRef = useRef(null)

    const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0)

    // 点击外部关闭下拉框
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (searchRef.current && !searchRef.current.contains(e.target)) {
                setShowDropdown(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // 计算 API 基础路径：店面模式走 /api/v/:slug，否则不加载（已无主站）
    const apiProductsUrl = (() => {
        if (storefront?._tenantMode && storefront?.slug) {
            return `/api/v/${storefront.slug}/products`
        }
        if (storefront?.slug) {
            // 代理分站
            return `/api/s/${storefront.slug}/products`
        }
        return null
    })()
    // 真实热门搜索 / 上报接口（仅 SaaS 店面有，分站暂不支持）
    const hotSearchUrl = storefront?._tenantMode && storefront?.slug ? `/api/v/${storefront.slug}/hot-searches?limit=8` : null
    const logSearchUrl = storefront?._tenantMode && storefront?.slug ? `/api/v/${storefront.slug}/search-log` : null

    // 加载推荐商品 + 真实热门搜索
    useEffect(() => {
        if (!apiProductsUrl) {
            setRecommendedProducts([])
            setHotSearches([])
            return
        }
        const fetchRecommended = async () => {
            try {
                const res = await fetch(`${apiProductsUrl}?limit=6`)
                const data = await res.json()
                setRecommendedProducts(data.products || [])
            } catch (error) {
                console.error('推荐商品加载失败:', error)
            }
        }
        const fetchHotSearches = async () => {
            if (!hotSearchUrl) {
                setHotSearches([])
                return
            }
            try {
                const res = await fetch(hotSearchUrl)
                const data = await res.json()
                setHotSearches(data.keywords || [])
            } catch (error) {
                setHotSearches([])
            }
        }
        fetchRecommended()
        fetchHotSearches()
    }, [apiProductsUrl, hotSearchUrl])

    // 实时搜索建议 - 从API获取
    useEffect(() => {
        if (!searchQuery.trim()) {
            setSuggestions([])
            setMatchedProducts([])
            return
        }
        if (!apiProductsUrl) {
            setSuggestions([])
            setMatchedProducts([])
            return
        }

        // 防抖处理
        if (debounceRef.current) {
            clearTimeout(debounceRef.current)
        }

        debounceRef.current = setTimeout(async () => {
            setSearchLoading(true)
            try {
                const res = await fetch(`${apiProductsUrl}?search=${encodeURIComponent(searchQuery.trim())}&limit=6`)
                const data = await res.json()
                const products = (data.products || data || []).slice(0, 6)
                setMatchedProducts(products)
                setSuggestions(products.map(p => ({
                    id: p.id,
                    name: p.name
                })))
            } catch (error) {
                console.error('搜索建议获取失败:', error)
                setSuggestions([])
                setMatchedProducts([])
            } finally {
                setSearchLoading(false)
            }
        }, 300)

        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current)
            }
        }
    }, [searchQuery])

    // 执行搜索
    const handleSearch = (query) => {
        const searchTerm = query || searchQuery
        if (searchTerm.trim()) {
            const trimmed = searchTerm.trim()
            setShowDropdown(false)
            setMobileSearchOpen(false)
            setSearchQuery('')
            // 上报搜索关键词（不阻塞）
            if (logSearchUrl) {
                fetch(logSearchUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ keyword: trimmed })
                }).catch(() => { })
            }
            navigate(`${prefix}/search?q=${encodeURIComponent(trimmed)}`)
        }
    }

    // 打开移动端搜索
    const openMobileSearch = () => {
        setMobileSearchOpen(true)
        setTimeout(() => {
            mobileSearchInputRef.current?.focus()
        }, 100)
    }

    // 关闭移动端搜索
    const closeMobileSearch = () => {
        setMobileSearchOpen(false)
        setSearchQuery('')
        setSuggestions([])
        setMatchedProducts([])
    }

    const handleSubmit = (e) => {
        e.preventDefault()
        handleSearch()
    }

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleSearch()
        } else if (e.key === 'Escape') {
            setShowDropdown(false)
        }
    }

    // 点击建议项
    const handleSuggestionClick = (name) => {
        handleSearch(name)
    }

    // 点击热门关键词
    const handleKeywordClick = (keyword) => {
        handleSearch(keyword)
    }

    return (
        <nav className="navbar">
            <div className="navbar-container">
                {/* Logo */}
                <Link to={`${prefix}/`} className="navbar-logo">
                    <img
                        src={siteLogo || (theme === 'dark' ? logoDarkImg : logoImg)}
                        alt="Logo"
                        className="logo-image"
                    />
                </Link>

                {/* 搜索栏 */}
                <div className="navbar-search" ref={searchRef}>
                    <div className={`search-input-wrapper ${showDropdown ? 'focused' : ''}`}>
                        <FiSearch className="search-icon" />
                        <input
                            type="text"
                            className="search-input"
                            placeholder={t('nav.search')}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onFocus={() => setShowDropdown(true)}
                            onKeyDown={handleKeyDown}
                        />
                        <button
                            className="search-btn"
                            onClick={handleSubmit}
                        >
                            {t('search.title')}
                        </button>
                    </div>

                    {/* 搜索下拉框 */}
                    {showDropdown && (
                        <div className="search-dropdown">
                            {/* 实时搜索建议 */}
                            {searchQuery.trim() && suggestions.length > 0 && (
                                <div className="dropdown-section">
                                    <div className="dropdown-header">
                                        <FiSearch className="dropdown-icon" />
                                        <span>{t('search.results')}</span>
                                    </div>
                                    <div className="suggestion-list">
                                        {suggestions.map((item) => (
                                            <div
                                                key={item.id}
                                                className="suggestion-item"
                                                onClick={() => handleSuggestionClick(item.name)}
                                            >
                                                <FiSearch className="suggestion-icon" />
                                                <span dangerouslySetInnerHTML={{
                                                    __html: item.name.replace(
                                                        new RegExp(`(${searchQuery})`, 'gi'),
                                                        '<mark>$1</mark>'
                                                    )
                                                }} />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {searchQuery.trim() && matchedProducts.length > 0 && (
                                <div className="dropdown-section recommend-section">
                                    <div className="dropdown-header">
                                        <FiHeart className="dropdown-icon recommend" />
                                        <span>{t('search.results')}</span>
                                    </div>
                                    <div className="recommend-products-grid search-products-grid">
                                        {matchedProducts.map((product) => (
                                            <Link
                                                key={product.id}
                                                to={`${prefix}/products/${product.id}`}
                                                className="recommend-product-card"
                                                onClick={() => setShowDropdown(false)}
                                            >
                                                <div className="recommend-product-image">
                                                    <img
                                                        src={product.image || '/placeholder.png'}
                                                        alt={product.name}
                                                        onError={(e) => { e.target.src = '/placeholder.png' }}
                                                    />
                                                </div>
                                                <div className="recommend-product-info">
                                                    <div className="recommend-product-name">{product.name}</div>
                                                    <div className="recommend-product-price">¥{product.price?.toFixed(2)}</div>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* 无输入时显示热门搜索 */}
                            {!searchQuery.trim() && hotSearches.length > 0 && (
                                <div className="dropdown-section">
                                    <div className="dropdown-header">
                                        <FiTrendingUp className="dropdown-icon hot" />
                                        <span>{t('search.title')}</span>
                                    </div>
                                    <div className="keyword-tags">
                                        {hotSearches.map((item, index) => (
                                            <div
                                                key={index}
                                                className="keyword-tag hot-tag"
                                                onClick={() => handleKeywordClick(item)}
                                            >
                                                {item}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* 猜你喜欢推荐商品 */}
                            {!searchQuery.trim() && recommendedProducts.length > 0 && (
                                <div className="dropdown-section recommend-section">
                                    <div className="dropdown-header">
                                        <FiHeart className="dropdown-icon recommend" />
                                        <span>{t('products.title')}</span>
                                    </div>
                                    <div className="recommend-products-grid">
                                        {recommendedProducts.map((product) => (
                                            <Link
                                                key={product.id}
                                                to={`${prefix}/products/${product.id}`}
                                                className="recommend-product-card"
                                                onClick={() => setShowDropdown(false)}
                                            >
                                                <div className="recommend-product-image">
                                                    <img
                                                        src={product.image || '/placeholder.png'}
                                                        alt={product.name}
                                                        onError={(e) => { e.target.src = '/placeholder.png' }}
                                                    />
                                                </div>
                                                <div className="recommend-product-info">
                                                    <div className="recommend-product-name">{product.name}</div>
                                                    <div className="recommend-product-price">¥{product.price?.toFixed(2)}</div>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* 无搜索结果提示 */}
                            {searchQuery.trim() && suggestions.length === 0 && matchedProducts.length === 0 && !searchLoading && (
                                <div className="no-suggestions">
                                    <FiSearch />
                                    <span>{t('search.noResults')}</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* 右侧操作 */}
                <div className="navbar-actions">
                    {/* 导航链接 */}
                    <div className="navbar-links">
                        <Link
                            to={`${prefix}/`}
                            className={`nav-link ${location.pathname === (prefix || '/') || location.pathname === `${prefix}/` ? 'active' : ''}`}
                        >
                            {t('nav.products')}
                        </Link>
                        <Link
                            to={`${prefix}/order-query`}
                            className={`nav-link ${location.pathname === `${prefix}/order-query` ? 'active' : ''}`}
                        >
                            {t('nav.orderQuery')}
                        </Link>
                        <Link
                            to={`${prefix}/tickets/new`}
                            className={`nav-link ${location.pathname === `${prefix}/tickets/new` ? 'active' : ''}`}
                        >
                            {t('nav.tickets')}
                        </Link>
                    </div>

                    {/* 移动端搜索图标 */}
                    <button
                        className="nav-icon-btn mobile-search-btn"
                        onClick={openMobileSearch}
                        title={t('search.title')}
                    >
                        <FiSearch />
                    </button>

                    {/* 语言切换 */}
                    <LanguageToggle />

                    {/* 主题切换 */}
                    <button
                        className="nav-icon-btn theme-toggle-btn"
                        onClick={toggleTheme}
                        title={theme === 'dark' ? t('nav.switchToLight') : t('nav.switchToDark')}
                    >
                        {theme === 'dark' ? <FiSun /> : <FiMoon />}
                    </button>

                    {/* 购物车 */}
                    <Link to={`${prefix}/cart`} className="nav-icon-btn cart-btn" title={t('nav.cart')}>
                        <FiShoppingCart />
                        {cartCount > 0 && (
                            <span className="cart-badge">{cartCount}</span>
                        )}
                    </Link>

                    {/* 用户 */}
                    {isAuthenticated ? (
                        <>
                            {user?.role === 'AGENT' && (
                                <Link to="/agent" className="nav-link" style={{ color: '#10B981', fontWeight: 600 }}>{t('nav.agentDashboard')}</Link>
                            )}
                            <Link to={`${prefix}/user`} className="nav-user">
                                <div className="user-avatar">
                                    {user?.avatar ? (
                                        <img src={user.avatar} alt={user.username} />
                                    ) : (
                                        <FiUser />
                                    )}
                                </div>
                                <span className="user-name">{user?.username || t('nav.user')}</span>
                            </Link>
                        </>
                    ) : (
                        <Link to={`${prefix}/login`} className="btn btn-primary nav-login-btn">
                            {t('nav.login')}
                        </Link>
                    )}
                </div>
            </div>

            {/* 移动端搜索覆盖层 */}
            {mobileSearchOpen && (
                <div className="mobile-search-overlay">
                    <div className="mobile-search-header">
                        <div className="mobile-search-input-wrapper">
                            <FiSearch className="search-icon" />
                            <input
                                ref={mobileSearchInputRef}
                                type="text"
                                className="mobile-search-input"
                                placeholder={t('nav.search')}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={handleKeyDown}
                            />
                            {searchQuery && (
                                <button
                                    className="mobile-search-clear"
                                    onClick={() => setSearchQuery('')}
                                >
                                    <FiX />
                                </button>
                            )}
                        </div>
                        <button className="mobile-search-cancel" onClick={closeMobileSearch}>
                            {t('common.cancel')}
                        </button>
                    </div>

                    <div className="mobile-search-content">
                        {/* 搜索建议 */}
                        {searchQuery.trim() && suggestions.length > 0 && (
                            <div className="mobile-suggestion-list">
                                {suggestions.map((item) => (
                                    <div
                                        key={item.id}
                                        className="mobile-suggestion-item"
                                        onClick={() => handleSuggestionClick(item.name)}
                                    >
                                        <FiSearch />
                                        <span>{item.name}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* 热门搜索 */}
                        {!searchQuery.trim() && hotSearches.length > 0 && (
                            <div className="mobile-hot-searches">
                                <div className="mobile-section-title">
                                    <FiTrendingUp />
                                    <span>{t('search.title')}</span>
                                </div>
                                <div className="mobile-keyword-tags">
                                    {hotSearches.map((item, index) => (
                                        <div
                                            key={index}
                                            className="mobile-keyword-tag"
                                            onClick={() => handleKeywordClick(item)}
                                        >
                                            {item}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </nav>
    )
}

export default Navbar

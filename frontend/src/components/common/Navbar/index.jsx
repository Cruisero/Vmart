import { useState, useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { FiShoppingCart, FiSearch, FiUser, FiSun, FiMoon, FiTrendingUp, FiX, FiHeart } from 'react-icons/fi'
import { useCartStore } from '../../../store/cartStore'
import { useAuthStore } from '../../../store/authStore'
import { useThemeStore } from '../../../store/themeStore'
import { useSkinStore } from '../../../store/skinStore'
import { useStorefront } from '../../../store/storefrontStore'
import { getStorefrontBasePath } from '../../../utils/agentDomain'
import logoImg from '../../../assets/logo.png'
import logoDarkImg from '../../../assets/logo-dark.png'
import './Navbar.css'

// 热门搜索关键词
const hotSearches = ['Netflix', 'ChatGPT', 'Spotify', '游戏账号', 'Adobe', '网盘会员', 'YouTube', 'Office']

function Navbar() {
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

    // 加载推荐商品
    useEffect(() => {
        const fetchRecommended = async () => {
            try {
                const res = await fetch('/api/products/hot?limit=6')
                const data = await res.json()
                setRecommendedProducts(data.products || [])
            } catch (error) {
                console.error('推荐商品加载失败:', error)
            }
        }
        fetchRecommended()
    }, [])

    // 实时搜索建议 - 从API获取
    useEffect(() => {
        if (!searchQuery.trim()) {
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
                const res = await fetch(`/api/products?search=${encodeURIComponent(searchQuery.trim())}&limit=6`)
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
            setShowDropdown(false)
            setMobileSearchOpen(false)
            setSearchQuery('')
            navigate(`${prefix}/search?q=${encodeURIComponent(searchTerm.trim())}`)
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
                            placeholder="搜索商品..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onFocus={() => setShowDropdown(true)}
                            onKeyDown={handleKeyDown}
                        />
                        <button
                            className="search-btn"
                            onClick={handleSubmit}
                        >
                            搜索
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
                                        <span>搜索建议</span>
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
                                        <span>猜你想要</span>
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
                            {!searchQuery.trim() && (
                                <div className="dropdown-section">
                                    <div className="dropdown-header">
                                        <FiTrendingUp className="dropdown-icon hot" />
                                        <span>热门搜索</span>
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
                                        <span>猜你喜欢</span>
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
                                    <span>未找到相关商品，按回车搜索</span>
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
                            商品
                        </Link>
                        <Link
                            to={`${prefix}/order-query`}
                            className={`nav-link ${location.pathname === `${prefix}/order-query` ? 'active' : ''}`}
                        >
                            订单查询
                        </Link>
                        <Link
                            to={`${prefix}/tickets/new`}
                            className={`nav-link ${location.pathname === `${prefix}/tickets/new` ? 'active' : ''}`}
                        >
                            工单
                        </Link>
                    </div>

                    {/* 移动端搜索图标 */}
                    <button
                        className="nav-icon-btn mobile-search-btn"
                        onClick={openMobileSearch}
                        title="搜索"
                    >
                        <FiSearch />
                    </button>

                    {/* 主题切换 */}
                    <button
                        className="nav-icon-btn theme-toggle-btn"
                        onClick={toggleTheme}
                        title={theme === 'dark' ? '切换到浅色模式' : '切换到暗黑模式'}
                    >
                        {theme === 'dark' ? <FiSun /> : <FiMoon />}
                    </button>

                    {/* 购物车 */}
                    <Link to={`${prefix}/cart`} className="nav-icon-btn cart-btn" title="购物车">
                        <FiShoppingCart />
                        {cartCount > 0 && (
                            <span className="cart-badge">{cartCount}</span>
                        )}
                    </Link>

                    {/* 用户 */}
                    {isAuthenticated ? (
                        <>
                            {user?.role === 'AGENT' && (
                                <Link to="/agent" className="nav-link" style={{ color: '#10B981', fontWeight: 600 }}>代理后台</Link>
                            )}
                            <Link to={`${prefix}/user`} className="nav-user">
                                <div className="user-avatar">
                                    {user?.avatar ? (
                                        <img src={user.avatar} alt={user.username} />
                                    ) : (
                                        <FiUser />
                                    )}
                                </div>
                                <span className="user-name">{user?.username || '用户'}</span>
                            </Link>
                        </>
                    ) : (
                        <Link to={`${prefix}/login`} className="btn btn-primary nav-login-btn">
                            登录
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
                                placeholder="搜索商品..."
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
                            取消
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
                        {!searchQuery.trim() && (
                            <div className="mobile-hot-searches">
                                <div className="mobile-section-title">
                                    <FiTrendingUp />
                                    <span>热门搜索</span>
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

import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { FiTag, FiBox } from 'react-icons/fi'
import { useStorefront } from '../../store/storefrontStore'
import { getStorefrontBasePath } from '../../utils/agentDomain'
import './Products.css'

const API_BASE = '/api'

// 处理图片 URL，支持不同尺寸
const getImageUrl = (url, size = 'large') => {
    if (!url) return '/placeholder.png'
    if (url.startsWith('http')) return url
    // 替换尺寸路径
    if (url.includes('/uploads/products/')) {
        const newUrl = url.replace(/\/(large|medium|original)\//, `/${size}/`)
        return `${newUrl}`
    }
    return `${url}`
}

// 检测是否为移动端
const isMobile = () => window.innerWidth < 768

// 分类数据 (从后端获取或使用默认)
const defaultCategories = [
    { id: 'all', name: '全部商品', icon: '🏠' },
    { id: 'video', name: '视频会员', icon: '📺' },
    { id: 'music', name: '音乐会员', icon: '🎵' },
    { id: 'game', name: '游戏账号', icon: '🎮' },
    { id: 'software', name: '软件激活', icon: '💿' },
    { id: 'social', name: '社交账号', icon: '💬' },
    { id: 'cloud', name: '网盘会员', icon: '☁️' },
]

function Products() {
    const [activeCategory, setActiveCategory] = useState('all')
    const [sortBy, setSortBy] = useState('default')
    const [products, setProducts] = useState([])
    const [categories, setCategories] = useState([{ id: 'all', name: '全部商品', icon: '🏠' }])
    const [categoriesLoaded, setCategoriesLoaded] = useState(false)
    const [loading, setLoading] = useState(true)
    const storefront = useStorefront()
    const linkPrefix = storefront ? getStorefrontBasePath(storefront) : ''

    // 商品/分类 API URL（店面下走 /api/v/:slug；主站走 /api）
    const productsBase = storefront
        ? `${storefront.apiBase || `${API_BASE}/v`}/${storefront.slug}/products`
        : `${API_BASE}/products`
    const categoriesUrl = storefront
        ? `${storefront.apiBase || `${API_BASE}/v`}/${storefront.slug}/categories`
        : `${API_BASE}/categories`


    // 获取分类
    useEffect(() => {
        fetch(categoriesUrl)
            .then(res => res.json())
            .then(data => {
                const categoryList = data.categories || data || []
                if (categoryList.length > 0) {
                    const cats = [
                        { id: 'all', name: '全部商品', icon: '🏠' },
                        ...categoryList
                            .filter(c => c.productCount > 0)
                            .map(c => ({
                                id: c.id,
                                name: c.name,
                                icon: c.icon || '📦'
                            }))
                    ]
                    setCategories(cats)
                }
            })
            .catch(err => console.log('获取分类失败:', err))
            .finally(() => setCategoriesLoaded(true))
    }, [categoriesUrl])

    // 获取商品列表
    useEffect(() => {
        setLoading(true)
        const url = activeCategory === 'all'
            ? productsBase
            : `${productsBase}?categoryId=${encodeURIComponent(activeCategory)}`

        fetch(url)
            .then(res => res.json())
            .then(data => {
                // 转换数据格式以匹配前端
                const formattedProducts = (data.products || data || []).map(p => ({
                    id: p.id,
                    name: p.name,
                    description: p.description,
                    price: parseFloat(p.price),
                    originalPrice: p.originalPrice ? parseFloat(p.originalPrice) : null,
                    category: p.categoryId,
                    stock: p.stock,
                    sold: p.soldCount || 0,
                    image: p.image || 'https://via.placeholder.com/400x300?text=No+Image',
                }))
                setProducts(formattedProducts)
                setLoading(false)
            })
            .catch(err => {
                console.error('获取商品失败:', err)
                setLoading(false)
            })
    }, [activeCategory, productsBase])

    // 排序商品
    const filteredProducts = useMemo(() => {
        let result = [...products]

        switch (sortBy) {
            case 'price-asc':
                return result.sort((a, b) => a.price - b.price)
            case 'price-desc':
                return result.sort((a, b) => b.price - a.price)
            case 'sales':
                return result.sort((a, b) => b.sold - a.sold)
            default:
                return result
        }
    }, [products, sortBy])



    return (
        <div className="products-page">
            {/* 分类导航 */}
            <div className={`category-nav${categoriesLoaded ? ' loaded' : ''}`}>
                {categoriesLoaded ? categories.map((cat) => (
                    <button
                        key={cat.id}
                        className={`category-btn ${activeCategory === cat.id ? 'active' : ''}`}
                        onClick={() => setActiveCategory(cat.id)}
                    >
                        <span className="category-icon">{cat.icon}</span>
                        <span className="category-name">{cat.name}</span>
                    </button>
                )) : (
                    Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="category-btn skeleton" />
                    ))
                )}
            </div>

            {/* 筛选栏 */}
            <div className="products-toolbar">
                <div className="products-count">
                    <FiBox />
                    <span>共 {filteredProducts.length} 件商品</span>
                </div>
                <div className="sort-options">
                    <span className="sort-label">排序：</span>
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="sort-select"
                    >
                        <option value="default">默认</option>
                        <option value="sales">销量优先</option>
                        <option value="price-asc">价格从低到高</option>
                        <option value="price-desc">价格从高到低</option>
                    </select>
                </div>
            </div>

            {/* 加载状态 */}
            {loading ? (
                <div className="loading">
                    <div className="spinner"></div>
                </div>
            ) : filteredProducts.length === 0 ? (
                <div className="no-products">
                    <FiBox size={48} />
                    <p>暂无商品</p>
                </div>
            ) : (
                /* 商品列表 */
                <div className="products-grid">
                    {filteredProducts.map((product) => {
                        const discount = product.originalPrice
                            ? Math.round((1 - product.price / product.originalPrice) * 100)
                            : 0

                        return (
                            <Link
                                to={`${linkPrefix}/products/${product.id}`}
                                key={product.id}
                                className={`product-card${product.stock <= 0 ? ' product-card-oos' : ''}`}
                            >
                                <div className="product-image">
                                    <picture>
                                        <source media="(min-width: 768px)" srcSet={getImageUrl(product.image, 'large')} />
                                        <source media="(max-width: 767px)" srcSet={getImageUrl(product.image, 'medium')} />
                                        <img src={getImageUrl(product.image, 'large')} alt={product.name} />
                                    </picture>
                                    {discount > 0 && (
                                        <span className="discount-label">-{discount}%</span>
                                    )}
                                    {product.stock <= 0 && (
                                        <div className="product-oos-overlay"><span>已售罄</span></div>
                                    )}
                                </div>
                                <div className="product-info">
                                    <h3 className="product-name">{product.name}</h3>
                                    <p className="product-desc">{product.description}</p>
                                    <div className="product-meta">
                                        <span className="product-sales">
                                            <FiTag /> 已售 {product.sold}
                                        </span>
                                        <span className="product-stock">
                                            库存 {product.stock}
                                        </span>
                                    </div>
                                    <div className="product-footer">
                                        <div className="product-price">
                                            <span className="price-current">¥{product.price.toFixed(2)}</span>
                                            {product.originalPrice && (
                                                <span className="price-original">
                                                    ¥{product.originalPrice.toFixed(2)}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

export default Products

import { useState, useEffect, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { FiShoppingCart, FiSearch, FiBox } from 'react-icons/fi'
import { useCartStore } from '../../store/cartStore'
import toast from 'react-hot-toast'
import './Search.css'

const API_BASE = '/api'

// 处理图片 URL，支持不同尺寸
const getImageUrl = (url, size = 'large') => {
    if (!url) return '/placeholder.png'
    if (url.startsWith('http')) return url
    if (url.includes('/uploads/products/')) {
        const newUrl = url.replace(/\/(large|medium|original)\//, `/${size}/`)
        return `${newUrl}`
    }
    return `${url}`
}

function Search() {
    const [searchParams] = useSearchParams()
    const query = searchParams.get('q') || ''
    const [sortBy, setSortBy] = useState('default')
    const [products, setProducts] = useState([])
    const [loading, setLoading] = useState(false)
    const addItem = useCartStore((state) => state.addItem)

    // 从 API 搜索商品
    useEffect(() => {
        if (!query.trim()) {
            setProducts([])
            return
        }

        setLoading(true)
        fetch(`${API_BASE}/products?search=${encodeURIComponent(query)}`)
            .then(res => res.json())
            .then(data => {
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
                    tags: p.tags || [],
                }))
                setProducts(formattedProducts)
                setLoading(false)
            })
            .catch(err => {
                console.error('搜索失败:', err)
                setLoading(false)
            })
    }, [query])

    // 排序结果
    const searchResults = useMemo(() => {
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

    const handleAddToCart = (product, e) => {
        e.preventDefault()
        e.stopPropagation()
        addItem(product, 1)
        toast.success(`已添加 ${product.name} 到购物车`)
    }

    return (
        <div className="search-page">
            {/* 搜索结果头部 */}
            <div className="search-header">
                <div className="search-info">
                    <FiSearch className="search-info-icon" />
                    <h1>
                        搜索结果：<span className="search-keyword">"{query}"</span>
                    </h1>
                </div>
            </div>

            {loading ? (
                <div className="loading">
                    <div className="spinner"></div>
                </div>
            ) : searchResults.length > 0 ? (
                <>
                    {/* 筛选栏 */}
                    <div className="search-toolbar">
                        <div className="results-count">
                            <FiBox />
                            <span>共 {searchResults.length} 件商品</span>
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

                    {/* 商品网格 */}
                    <div className="search-results-grid">
                        {searchResults.map((product) => (
                            <Link
                                to={`/products/${product.id}`}
                                key={product.id}
                                className="product-card"
                            >
                                {/* 商品图片 */}
                                <div className="product-image">
                                    <picture>
                                        <source media="(min-width: 768px)" srcSet={getImageUrl(product.image, 'large')} />
                                        <source media="(max-width: 767px)" srcSet={getImageUrl(product.image, 'medium')} />
                                        <img src={getImageUrl(product.image, 'large')} alt={product.name} />
                                    </picture>
                                    {product.tags && product.tags.length > 0 && (
                                        <div className="product-tags">
                                            {product.tags.map((tag, index) => (
                                                <span key={index} className="product-tag">{tag}</span>
                                            ))}
                                        </div>
                                    )}
                                    {product.stock < 50 && (
                                        <div className="stock-warning">库存紧张</div>
                                    )}
                                </div>

                                {/* 商品信息 */}
                                <div className="product-info">
                                    <h3 className="product-name">{product.name}</h3>
                                    <p className="product-desc">{product.description}</p>

                                    <div className="product-meta">
                                        <span className="product-sold">已售 {product.sold}</span>
                                        <span className="product-stock">库存 {product.stock}</span>
                                    </div>

                                    <div className="product-footer">
                                        <div className="product-price">
                                            <span className="price-current">¥{product.price.toFixed(2)}</span>
                                            {product.originalPrice && product.originalPrice > product.price && (
                                                <span className="price-original">¥{product.originalPrice.toFixed(2)}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </>
            ) : (
                /* 空状态 */
                <div className="empty-state">
                    <div className="empty-icon">
                        <FiSearch />
                    </div>
                    <h2>未找到相关商品</h2>
                    <p>换个关键词试试吧～</p>
                    <Link to="/" className="btn btn-primary">
                        浏览全部商品
                    </Link>
                </div>
            )}
        </div>
    )
}

export default Search

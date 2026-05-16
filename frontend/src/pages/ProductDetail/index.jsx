import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { FiShoppingCart, FiMinus, FiPlus, FiCheck, FiShield, FiZap, FiArrowLeft } from 'react-icons/fi'
import { useCartStore } from '../../store/cartStore'
import toast from 'react-hot-toast'
import './ProductDetail.css'

// 处理图片 URL，支持不同尺寸 (large, medium, original)
const getImageUrl = (url, size = 'original') => {
    if (!url) return '/placeholder.png'
    if (url.startsWith('http')) return url
    // 如果是上传的图片，替换尺寸路径
    if (url.includes('/uploads/products/')) {
        const newUrl = url.replace(/\/(large|medium|original)\//, `/${size}/`)
        return `${newUrl}`
    }
    return `${url}`
}

function ProductDetail() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [quantity, setQuantity] = useState(1)
    const [product, setProduct] = useState(null)
    const [loading, setLoading] = useState(true)
    const [activeImageIndex, setActiveImageIndex] = useState(0)
    const [selectedVariant, setSelectedVariant] = useState(null) // 选中的规格
    const [selectedType, setSelectedType] = useState('') // 选中的规格类型
    const addItem = useCartStore((state) => state.addItem)

    useEffect(() => {
        // 从 API 获取商品详情
        setLoading(true)
        fetch(`/api/products/${id}`)
            .then(res => res.json())
            .then(data => {
                if (data && data.id) {
                    // 转换数据格式
                    const formattedProduct = {
                        id: data.id,
                        name: data.name,
                        description: data.description,
                        fullDescription: data.fullDescription || data.description,
                        price: parseFloat(data.price),
                        originalPrice: data.originalPrice ? parseFloat(data.originalPrice) : null,
                        category: data.categoryId,
                        stock: data.stock,
                        sold: data.soldCount || 0,
                        image: data.image || 'https://via.placeholder.com/800x600?text=No+Image',
                        images: data.images || (data.image ? [data.image] : []),
                        tags: data.tags || [],
                        variants: data.variants || [],
                    }
                    setProduct(formattedProduct)

                    // 设置默认选中的类型和规格
                    const variants = formattedProduct.variants
                    if (variants && variants.length > 0) {
                        const hasTypes = variants.some(v => v.type && v.type.trim() !== '')
                        if (hasTypes) {
                            // 有类型分组，选择第一个类型和该类型下的第一个规格
                            const types = [...new Set(variants.map(v => v.type || '').filter(Boolean))]
                            const firstType = types[0] || ''
                            setSelectedType(firstType)
                            const firstVariant = variants.find(v => v.type === firstType)
                            setSelectedVariant(firstVariant || null)
                        } else {
                            // 无类型分组，直接选择第一个规格
                            setSelectedVariant(variants[0])
                        }
                    }
                } else {
                    setProduct(null)
                }
                setLoading(false)
            })
            .catch(err => {
                console.error('获取商品详情失败:', err)
                setProduct(null)
                setLoading(false)
            })
    }, [id])

    // 获取当前选中规格的库存
    const currentStock = selectedVariant?.stock ?? product?.stock ?? 0

    const handleQuantityChange = (delta) => {
        const newQty = quantity + delta
        if (newQty >= 1 && newQty <= currentStock) {
            setQuantity(newQty)
        }
    }

    const handleAddToCart = () => {
        if (product) {
            addItem(product, quantity, selectedVariant)
            const variantInfo = selectedVariant ? ` (${selectedVariant.name})` : ''
            toast.success(`已添加 ${quantity} 件商品${variantInfo}到购物车`)
        }
    }

    const handleBuyNow = () => {
        if (product && currentStock > 0) {
            addItem(product, quantity, selectedVariant)
            navigate('/cart')
        }
    }

    // 库存不足检查
    const isOutOfStock = currentStock === 0

    if (loading) {
        return (
            <div className="loading">
                <div className="spinner"></div>
            </div>
        )
    }

    if (!product) {
        return (
            <div className="product-not-found">
                <h2>商品不存在</h2>
                <p>您访问的商品可能已下架或不存在</p>
                <Link to="/products" className="btn btn-primary">
                    返回商品列表
                </Link>
            </div>
        )
    }

    const discount = Math.round((1 - product.price / product.originalPrice) * 100)

    return (
        <div className="product-detail-page">
            {/* 返回按钮 */}
            <button className="back-btn" onClick={() => navigate(-1)}>
                <FiArrowLeft />
                返回
            </button>

            <div className="product-detail-container">
                {/* 左侧图片画廊 */}
                <div className="product-gallery">
                    {/* 主图区域 */}
                    <div className="main-image">
                        <img
                            src={getImageUrl((product.images && product.images.length > 0)
                                ? product.images[activeImageIndex]
                                : product.image)}
                            alt={product.name}
                        />
                        {product.tags.length > 0 && (
                            <div className="detail-tags">
                                {product.tags.map((tag, index) => (
                                    <span key={index} className="detail-tag">{tag}</span>
                                ))}
                            </div>
                        )}
                        {/* 左右切换按钮 */}
                        {product.images && product.images.length > 1 && (
                            <>
                                <button
                                    className="slider-nav prev"
                                    onClick={() => setActiveImageIndex(prev =>
                                        prev === 0 ? product.images.length - 1 : prev - 1
                                    )}
                                >
                                    ‹
                                </button>
                                <button
                                    className="slider-nav next"
                                    onClick={() => setActiveImageIndex(prev =>
                                        prev === product.images.length - 1 ? 0 : prev + 1
                                    )}
                                >
                                    ›
                                </button>
                            </>
                        )}
                    </div>

                    {/* 缩略图导航 */}
                    {product.images && product.images.length > 1 && (
                        <div className="thumbnail-nav">
                            {product.images.map((img, index) => (
                                <button
                                    key={index}
                                    className={`thumbnail-item ${activeImageIndex === index ? 'active' : ''}`}
                                    onClick={() => setActiveImageIndex(index)}
                                >
                                    <img src={getImageUrl(img, 'medium')} alt={`缩略图 ${index + 1}`} />
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* 右侧信息 */}
                <div className="product-main-info">
                    <h1 className="detail-title">{product.name}</h1>
                    <p className="detail-desc">{product.description}</p>

                    {/* 规格选择 */}
                    {product.variants && product.variants.length > 0 && (() => {
                        // 检查是否有类型分组
                        const hasTypes = product.variants.some(v => v.type && v.type.trim() !== '')

                        if (hasTypes) {
                            // 按类型分组显示
                            const types = [...new Set(product.variants.map(v => v.type || '').filter(Boolean))]
                            // 如果没有选中类型，默认选第一个
                            const currentType = selectedType || types[0] || ''
                            const typeVariants = product.variants.filter(v => v.type === currentType)

                            return (
                                <div className="variant-selector">
                                    {/* 类型选择 */}
                                    <div className="variant-row">
                                        <span className="variant-label">类型</span>
                                        <div className="variant-options">
                                            {types.map((type) => (
                                                <button
                                                    key={type}
                                                    className={`variant-option ${currentType === type ? 'active' : ''}`}
                                                    onClick={() => {
                                                        setSelectedType(type)
                                                        // 自动选中该类型的第一个规格
                                                        const firstVariant = product.variants.find(v => v.type === type)
                                                        setSelectedVariant(firstVariant || null)
                                                    }}
                                                >
                                                    {type}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* 规格选择 */}
                                    <div className="variant-row">
                                        <span className="variant-label">规格</span>
                                        <div className="variant-options">
                                            {typeVariants.map((variant) => (
                                                <button
                                                    key={variant.id}
                                                    className={`variant-option ${selectedVariant?.id === variant.id ? 'active' : ''}`}
                                                    onClick={() => setSelectedVariant(variant)}
                                                >
                                                    {variant.name}
                                                    <span className="variant-price">¥{parseFloat(variant.price).toFixed(2)}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )
                        } else {
                            // 无类型分组，直接显示规格
                            return (
                                <div className="variant-selector">
                                    <span className="variant-label">规格</span>
                                    <div className="variant-options">
                                        {product.variants.map((variant) => (
                                            <button
                                                key={variant.id}
                                                className={`variant-option ${selectedVariant?.id === variant.id ? 'active' : ''}`}
                                                onClick={() => setSelectedVariant(variant)}
                                            >
                                                {variant.name}
                                                <span className="variant-price">¥{parseFloat(variant.price).toFixed(2)}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )
                        }
                    })()}

                    {/* 价格区域 */}
                    <div className="price-section">
                        <div className="price-row">
                            <span className="price-label">价格</span>
                            <span className="price-value">
                                ¥{(selectedVariant?.price || product.price).toFixed(2)}
                            </span>
                            {(selectedVariant?.originalPrice || product.originalPrice) > (selectedVariant?.price || product.price) && (
                                <>
                                    <span className="price-original">
                                        ¥{(selectedVariant?.originalPrice || product.originalPrice).toFixed(2)}
                                    </span>
                                    <span className="discount-badge">-{discount}%</span>
                                </>
                            )}
                        </div>
                        <div className="sales-row">
                            <span>已售 {product.sold}</span>
                            <span className={currentStock === 0 ? 'out-of-stock' : ''}>
                                {currentStock > 0 ? `库存 ${currentStock}` : '暂无库存'}
                            </span>
                        </div>
                    </div>

                    {/* 数量选择 */}
                    <div className="quantity-section">
                        <span className="quantity-label">数量</span>
                        <div className="quantity-control">
                            <button
                                className="qty-btn"
                                onClick={() => handleQuantityChange(-1)}
                                disabled={quantity <= 1}
                            >
                                <FiMinus />
                            </button>
                            <span className="qty-value">{quantity}</span>
                            <button
                                className="qty-btn"
                                onClick={() => handleQuantityChange(1)}
                                disabled={quantity >= currentStock || isOutOfStock}
                            >
                                <FiPlus />
                            </button>
                        </div>
                        <span className="qty-total">
                            小计: <strong>¥{((selectedVariant?.price || product.price) * quantity).toFixed(2)}</strong>
                        </span>
                    </div>

                    {/* 购买按钮 */}
                    <div className="action-buttons">
                        <button
                            className="btn btn-secondary btn-lg"
                            onClick={handleAddToCart}
                            disabled={isOutOfStock}
                        >
                            <FiShoppingCart />
                            {isOutOfStock ? '暂无库存' : '加入购物车'}
                        </button>
                        <button
                            className="btn btn-primary btn-lg"
                            onClick={handleBuyNow}
                            disabled={isOutOfStock}
                        >
                            {isOutOfStock ? '补货中' : '立即购买'}
                        </button>
                    </div>

                    {/* 服务保障 */}
                    <div className="service-guarantee">
                        <div className="guarantee-item">
                            <FiZap />
                            <span>即时发货</span>
                        </div>
                        <div className="guarantee-item">
                            <FiShield />
                            <span>安全保障</span>
                        </div>
                        <div className="guarantee-item">
                            <FiCheck />
                            <span>正品保证</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* 商品详情 */}
            <div className="product-description-section">
                <h2 className="section-subtitle">商品详情</h2>
                <div className="description-content">
                    <pre>{product.fullDescription}</pre>
                </div>
            </div>
        </div>
    )
}

export default ProductDetail

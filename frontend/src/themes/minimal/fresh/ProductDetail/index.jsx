import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { FiMinus, FiPlus } from 'react-icons/fi'
import { useBuyerL } from '../../../../hooks/useBuyerL'
import { useStorefront } from '../../../../store/storefrontStore'
import { getStorefrontBasePath } from '../../../../utils/agentDomain'
import { formatPrice } from '../../../../utils/currencyFormat'
import { formatStock } from '../../../../utils/stockFormat'
import './ProductDetail.css'

function resolveWholesalePrice(basePrice, wholesalePrices, qty) {
    if (!wholesalePrices?.length) return basePrice
    const tiers = wholesalePrices
        .filter(t => t.minQty <= qty)
        .sort((a, b) => b.minQty - a.minQty)
    return tiers.length > 0 ? parseFloat(tiers[0].price) : basePrice
}

const getImageUrl = (url, size = 'original') => {
    if (!url) return null
    if (url.startsWith('http')) return url
    if (url.includes('/uploads/products/'))
        return url.replace(/\/(large|medium|original)\//, `/${size}/`)
    return url
}

export default function FreshProductDetail() {
    const L = useBuyerL()
    const { id } = useParams()
    const navigate = useNavigate()
    const storefront = useStorefront()
    const currency = storefront?.currency || 'CNY'
    const [product, setProduct] = useState(null)
    const [loading, setLoading] = useState(true)
    const [imgError, setImgError] = useState(false)
    const [selectedVariant, setSelectedVariant] = useState(null)
    const [selectedType, setSelectedType] = useState('')
    const [quantity, setQuantity] = useState(1)

    const apiUrl = storefront
        ? `${storefront.apiBase || '/api/s'}/${storefront.slug}/products/${id}`
        : `/api/products/${id}`
    const prefix = storefront ? getStorefrontBasePath(storefront) : ''

    useEffect(() => {
        setLoading(true)
        fetch(apiUrl)
            .then(r => r.json())
            .then(raw => {
                const data = raw?.product || raw
                if (!data?.id) { setProduct(null); return }
                const p = {
                    id: data.id,
                    name: data.name,
                    description: data.description,
                    fullDescription: data.fullDescription || data.description,
                    price: parseFloat(data.price),
                    originalPrice: data.originalPrice ? parseFloat(data.originalPrice) : null,
                    stock: data.stock,
                    sold: data.soldCount || 0,
                    image: data.image || null,
                    variants: data.variants || [],
                    wholesalePrices: (data.wholesalePrices || []).sort((a, b) => a.minQty - b.minQty),
                }
                setProduct(p)
                if (p.variants.length > 0) {
                    const inStock = (v) => (v?.stock ?? 0) > 0
                    const hasTypes = p.variants.some(v => v.type?.trim())
                    if (hasTypes) {
                        const types = [...new Set(p.variants.map(v => v.type || '').filter(Boolean))]
                        // 优先有货类型
                        const firstStockType = types.find(t => p.variants.some(v => v.type === t && inStock(v)))
                        const firstType = firstStockType || types[0]
                        setSelectedType(firstType)
                        const inType = p.variants.filter(v => v.type === firstType)
                        setSelectedVariant(inType.find(inStock) || inType[0] || null)
                    } else {
                        setSelectedVariant(p.variants.find(inStock) || p.variants[0])
                    }
                }
            })
            .catch(() => setProduct(null))
            .finally(() => setLoading(false))
    }, [apiUrl])

    const basePrice = parseFloat(selectedVariant?.price ?? product?.price ?? 0)
    const currentOrigPrice = parseFloat(selectedVariant?.originalPrice ?? product?.originalPrice ?? 0)
    const currentStock = selectedVariant?.stock ?? product?.stock ?? 0
    const isOutOfStock = currentStock === 0

    // 批发价：variant 优先使用自己的 wholesalePrices，否则用 product 的
    const activeWholesalePrices = (selectedVariant?.wholesalePrices?.length
        ? selectedVariant.wholesalePrices
        : product?.wholesalePrices) || []
    const currentPrice = resolveWholesalePrice(basePrice, activeWholesalePrices, quantity)

    const changeQty = (delta) => {
        const next = quantity + delta
        if (next >= 1 && next <= currentStock) setQuantity(next)
    }

    const handleBuyNow = () => {
        if (!product || isOutOfStock) return
        const checkoutState = {
            item: {
                id: product.id,
                name: product.name,
                image: product.image,
                price: currentPrice,
                basePrice: basePrice,
                originalPrice: currentOrigPrice || null,
                quantity,
                variant: selectedVariant || null,
            }
        }
        if (storefront) checkoutState.agentSlug = storefront.slug
        navigate(`${prefix}/checkout`, { state: checkoutState })
    }

    if (loading) return (
        <div className="fd-page">
            <div className="fd-loading"><div className="fd-spinner" /></div>
        </div>
    )

    if (!product) return (
        <div className="fd-page">
            <div className="fd-not-found">
                <h2>{L('products.notFound')}</h2>
                <p>{L('products.removed')}</p>
                <Link to={`${prefix}/`} style={{ marginTop: 16, display: 'inline-flex', color: '#DC2626', fontSize: '0.85rem' }}>
                    {L('products.backHome')}
                </Link>
            </div>
        </div>
    )

    const discount = currentOrigPrice > currentPrice
        ? Math.round((1 - currentPrice / currentOrigPrice) * 100) : 0

    const imgSrc = getImageUrl(product.image, 'original')

    const hasTypes = product.variants.some(v => v.type?.trim())
    const types = hasTypes ? [...new Set(product.variants.map(v => v.type || '').filter(Boolean))] : []
    const typeVariants = hasTypes
        ? product.variants.filter(v => v.type === (selectedType || types[0]))
        : product.variants

    return (
        <div className="fd-page">
            <div className="fd-body">
                {/* 图片卡片 */}
                <div className="fd-image-wrap">
                    {imgSrc && !imgError
                        ? <img src={imgSrc} alt={product.name} onError={() => setImgError(true)} />
                        : <div className="fd-image-placeholder">📦</div>
                    }
                </div>

                {/* 信息卡片 */}
                <div className="fd-info">
                    <h1 className="fd-name">{product.name}</h1>
                    {product.description && (
                        <p className="fd-short-desc">{product.description}</p>
                    )}

                    <div className="fd-divider" />

                    {/* 价格 */}
                    <div className="fd-price-row">
                        <span className="fd-price">{formatPrice(currentPrice, currency)}</span>
                        {currentOrigPrice > currentPrice && <>
                            <span className="fd-price-orig">{formatPrice(currentOrigPrice, currency)}</span>
                            <span className="fd-discount">{L('products.save')} {discount}%</span>
                        </>}
                        {currentPrice < basePrice && (
                            <span className="fd-wholesale-badge">{L('products.wholesalePrice')}</span>
                        )}
                    </div>
                    <div className="fd-meta-row" style={{ marginBottom: 0 }}>
                        {storefront?.showSalesCount !== false && (
                            storefront?.fuzzyStockEnabled ? (
                                <span className="stock-badge stock-badge-indigo">
                                    <span className="stock-dot" />
                                    <span>{L('products.sales')} {product.sold}</span>
                                </span>
                            ) : (
                                <span>{L('products.sales')} {product.sold}</span>
                            )
                        )}
                        <span style={{ color: isOutOfStock ? '#EF4444' : '#9CA3AF' }}>
                            {formatStock(currentStock, storefront?.fuzzyStockEnabled, storefront?.fuzzyStockThreshold, L)}
                        </span>
                    </div>


                    {/* 规格 */}
                    {(hasTypes || typeVariants.length > 0) && <>
                        <div className="fd-divider" />
                        {hasTypes && <>
                            <div className="fd-section-label">{L('products.type')}</div>
                            <div className="fd-variants" style={{ marginBottom: 16 }}>
                                {types.map(type => (
                                    <button
                                        key={type}
                                        className={`fd-variant-btn${selectedType === type ? ' active' : ''}`}
                                        onClick={() => {
                                            setSelectedType(type)
                                            const inType = product.variants.filter(v => v.type === type)
                                            setSelectedVariant(inType.find(v => (v.stock ?? 0) > 0) || inType[0] || null)
                                        }}
                                    >{type}</button>
                                ))}
                            </div>
                        </>}
                        {typeVariants.length > 0 && <>
                            <div className="fd-section-label">{L('products.variant')}</div>
                            <div className="fd-variants">
                                {typeVariants.map(v => (
                                    <button
                                        key={v.id}
                                        className={`fd-variant-btn${selectedVariant?.id === v.id ? ' active' : ''}`}
                                        onClick={() => setSelectedVariant(v)}
                                    >
                                        {v.name}
                                        <span className="fd-variant-price">{formatPrice(v.price, currency)}</span>
                                    </button>
                                ))}
                            </div>
                        </>}
                    </>}

                    <div className="fd-divider" />

                    {/* 数量 */}
                    <div className="fd-qty-row" style={{ marginBottom: 20 }}>
                        <div className="fd-qty-ctrl">
                            <button className="fd-qty-btn" onClick={() => changeQty(-1)} disabled={quantity <= 1}>
                                <FiMinus size={12} />
                            </button>
                            <input
                                className="fd-qty-val"
                                type="number"
                                min="1"
                                max={currentStock}
                                value={quantity}
                                onChange={e => {
                                    const v = parseInt(e.target.value)
                                    if (!isNaN(v) && v >= 1 && v <= currentStock) setQuantity(v)
                                    else if (e.target.value === '') setQuantity('')
                                }}
                                onBlur={e => {
                                    const v = parseInt(e.target.value)
                                    setQuantity(!isNaN(v) && v >= 1 ? Math.min(v, currentStock) : 1)
                                }}
                            />
                            <button className="fd-qty-btn" onClick={() => changeQty(1)} disabled={quantity >= currentStock || isOutOfStock}>
                                <FiPlus size={12} />
                            </button>
                        </div>
                        <span className="fd-subtotal">
                            {L('products.subtotal')} <strong>{formatPrice(currentPrice * quantity, currency)}</strong>
                            {currentPrice < basePrice && (
                                <span style={{ fontSize: '0.75rem', color: '#10B981', marginLeft: 6 }}>
                                    {L('products.wholesaleEnjoyed')}
                                </span>
                            )}
                        </span>
                    </div>

                    {/* 按钮 */}
                    <button className="fd-buy-btn" onClick={handleBuyNow} disabled={isOutOfStock}>
                        {isOutOfStock ? L('products.outOfStock') : L('products.placeOrder')}
                    </button>

                    {/* 批量优惠 */}
                    {activeWholesalePrices.length > 0 && <div className="fd-divider" />}
                    {activeWholesalePrices.length > 0 && (
                        <div className="fd-guarantees">
                            <div className="fd-wholesale-label">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
                                {L('products.bulkDiscount')}
                            </div>
                            {activeWholesalePrices.map((tier, i) => {
                                const saving = Math.round((1 - parseFloat(tier.price) / basePrice) * 100)
                                const isActive = quantity >= tier.minQty &&
                                    (i === activeWholesalePrices.length - 1 || quantity < activeWholesalePrices[i + 1].minQty)
                                return (
                                    <div key={i} className={`fd-wholesale-card ${isActive ? 'active' : ''}`}>
                                        <span className="fd-wc-qty">{L('products.min')}{tier.minQty}{L('products.pieces')}</span>
                                        <span className="fd-wc-price">{formatPrice(tier.price, currency)}</span>
                                        {saving > 0 && <span className="fd-wc-saving">{L('products.save')}{saving}%</span>}
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* 商品详情 */}
            {product.fullDescription && (
                <div className="fd-desc-section">
                    <div className="fd-desc-title">{L('products.description')}</div>
                    <div className="fd-desc-content">{product.fullDescription}</div>
                </div>
            )}
        </div>
    )
}

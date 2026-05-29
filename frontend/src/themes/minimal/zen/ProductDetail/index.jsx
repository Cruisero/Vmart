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
    const tiers = wholesalePrices.filter(t => t.minQty <= qty).sort((a, b) => b.minQty - a.minQty)
    return tiers.length > 0 ? parseFloat(tiers[0].price) : basePrice
}
const getImageUrl = (url, size = 'original') => {
    if (!url) return null
    if (url.startsWith('http')) return url
    if (url.includes('/uploads/products/')) return url.replace(/\/(large|medium|original)\//, `/${size}/`)
    return url
}

export default function ZenProductDetail() {
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
                    id: data.id, name: data.name, description: data.description,
                    fullDescription: data.fullDescription || data.description,
                    price: parseFloat(data.price),
                    originalPrice: data.originalPrice ? parseFloat(data.originalPrice) : null,
                    stock: data.stock, sold: data.soldCount || 0, image: data.image || null,
                    variants: data.variants || [],
                    wholesalePrices: (data.wholesalePrices || []).sort((a, b) => a.minQty - b.minQty),
                }
                setProduct(p)
                if (p.variants.length > 0) {
                    const inStock = (v) => (v?.stock ?? 0) > 0
                    const hasTypes = p.variants.some(v => v.type?.trim())
                    if (hasTypes) {
                        const types = [...new Set(p.variants.map(v => v.type || '').filter(Boolean))]
                        const firstStockType = types.find(tt => p.variants.some(v => v.type === tt && inStock(v)))
                        const firstType = firstStockType || types[0]
                        setSelectedType(firstType)
                        const inType = p.variants.filter(v => v.type === firstType)
                        setSelectedVariant(inType.find(inStock) || inType[0] || null)
                    } else { setSelectedVariant(p.variants.find(inStock) || p.variants[0]) }
                }
            })
            .catch(() => setProduct(null))
            .finally(() => setLoading(false))
    }, [id])

    const basePrice = parseFloat(selectedVariant?.price ?? product?.price ?? 0)
    const currentOrigPrice = parseFloat(selectedVariant?.originalPrice ?? product?.originalPrice ?? 0)
    const currentStock = selectedVariant?.stock ?? product?.stock ?? 0
    const isOutOfStock = currentStock === 0
    const activeWholesalePrices = (selectedVariant?.wholesalePrices?.length ? selectedVariant.wholesalePrices : product?.wholesalePrices) || []
    const currentPrice = resolveWholesalePrice(basePrice, activeWholesalePrices, quantity)
    const changeQty = (d) => { const n = quantity + d; if (n >= 1 && n <= currentStock) setQuantity(n) }

    const handleBuyNow = () => {
        if (!product || isOutOfStock) return
        const checkoutState = { item: { id: product.id, name: product.name, image: product.image, price: currentPrice, basePrice, originalPrice: currentOrigPrice || null, quantity, variant: selectedVariant || null } }
        if (storefront) checkoutState.agentSlug = storefront.slug
        navigate(`${prefix}/checkout`, { state: checkoutState })
    }

    if (loading) return <div className="zd-page"><div className="zd-loading">{L('common.loading')}</div></div>
    if (!product) return (
        <div className="zd-page"><div className="zd-empty"><h2>{L('products.notFound')}</h2><Link to={`${prefix}/`} className="zd-back">← {L('products.backHome')}</Link></div></div>
    )

    const discount = currentOrigPrice > currentPrice ? Math.round((1 - currentPrice / currentOrigPrice) * 100) : 0
    const imgSrc = getImageUrl(product.image, 'original')
    const hasTypes = product.variants.some(v => v.type?.trim())
    const types = hasTypes ? [...new Set(product.variants.map(v => v.type || '').filter(Boolean))] : []
    const typeVariants = hasTypes ? product.variants.filter(v => v.type === (selectedType || types[0])) : product.variants

    return (
        <div className="zd-page">
            <div className="zd-layout">
                <div className="zd-image">
                    {imgSrc && !imgError
                        ? <img src={imgSrc} alt={product.name} onError={() => setImgError(true)} />
                        : <div className="zd-image-ph">📦</div>
                    }
                </div>
                <div className="zd-info">
                    <h1 className="zd-name">{product.name}</h1>
                    {product.description && <p className="zd-desc">{product.description}</p>}

                    <div className="zd-price-block">
                        <span className="zd-price">{formatPrice(currentPrice, currency)}</span>
                        {currentOrigPrice > currentPrice && <span className="zd-price-orig">{formatPrice(currentOrigPrice, currency)}</span>}
                        {discount > 0 && <span className="zd-discount">-{discount}%</span>}
                        {currentPrice < basePrice && <span className="zd-ws-badge">{L('products.wholesalePrice')}</span>}
                    </div>

                    <div className="zd-meta">
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
                        <span style={{ color: isOutOfStock ? '#C45D3E' : '#bbb' }}>{formatStock(currentStock, storefront?.fuzzyStockEnabled, storefront?.fuzzyStockThreshold, L)}</span>
                    </div>

                    {(hasTypes || typeVariants.length > 0) && <>
                        <div className="zd-sep" />
                        {hasTypes && <>
                            <div className="zd-label">{L('products.type')}</div>
                            <div className="zd-tags">{types.map(tt => (
                                <button key={tt} className={`zd-tag${selectedType === tt ? ' active' : ''}`} onClick={() => { setSelectedType(tt); const inType = product.variants.filter(v => v.type === tt); setSelectedVariant(inType.find(v => (v.stock ?? 0) > 0) || inType[0] || null) }}>{tt}</button>
                            ))}</div>
                        </>}
                        {typeVariants.length > 0 && <>
                            <div className="zd-label">{L('products.variant')}</div>
                            <div className="zd-tags">{typeVariants.map(v => (
                                <button key={v.id} className={`zd-tag${selectedVariant?.id === v.id ? ' active' : ''}`} onClick={() => setSelectedVariant(v)}>
                                    {v.name}<span className="zd-tag-price">{formatPrice(v.price, currency)}</span>
                                </button>
                            ))}</div>
                        </>}
                    </>}

                    <div className="zd-sep" />

                    <div className="zd-qty-row">
                        <div className="zd-qty-ctrl">
                            <button className="zd-qty-btn" onClick={() => changeQty(-1)} disabled={quantity <= 1}><FiMinus size={12} /></button>
                            <input className="zd-qty-val" type="number" min="1" max={currentStock} value={quantity}
                                onChange={e => { const v = parseInt(e.target.value); if (!isNaN(v) && v >= 1 && v <= currentStock) setQuantity(v); else if (e.target.value === '') setQuantity('') }}
                                onBlur={e => { const v = parseInt(e.target.value); setQuantity(!isNaN(v) && v >= 1 ? Math.min(v, currentStock) : 1) }}
                            />
                            <button className="zd-qty-btn" onClick={() => changeQty(1)} disabled={quantity >= currentStock || isOutOfStock}><FiPlus size={12} /></button>
                        </div>
                        <span className="zd-subtotal">{formatPrice(currentPrice * quantity, currency)}</span>
                    </div>

                    <button className="zd-buy-btn" onClick={handleBuyNow} disabled={isOutOfStock}>
                        {isOutOfStock ? L('products.outOfStock') : L('products.placeOrder')}
                    </button>

                    {activeWholesalePrices.length > 0 && <>
                        <div className="zd-sep" />
                        <div className="zd-label">{L('products.bulkDiscount')}</div>
                        <div className="zd-ws-list">
                            {activeWholesalePrices.map((tier, i) => {
                                const saving = Math.round((1 - parseFloat(tier.price) / basePrice) * 100)
                                const isActive = quantity >= tier.minQty && (i === activeWholesalePrices.length - 1 || quantity < activeWholesalePrices[i + 1].minQty)
                                return (
                                    <div key={i} className={`zd-ws-item${isActive ? ' active' : ''}`}>
                                        <span>{L('products.min')}{tier.minQty}{L('products.pieces')}</span>
                                        <span className="zd-ws-price">{formatPrice(tier.price, currency)}</span>
                                        {saving > 0 && <span className="zd-ws-saving">-{saving}%</span>}
                                    </div>
                                )
                            })}
                        </div>
                    </>}
                </div>
            </div>

            {product.fullDescription && (
                <div className="zd-full-desc">
                    <div className="zd-label">{L('products.description')}</div>
                    <div className="zd-full-desc-body">{product.fullDescription}</div>
                </div>
            )}
        </div>
    )
}

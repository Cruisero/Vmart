import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useStorefront } from '../../../store/storefrontStore'
import { getStorefrontBasePath } from '../../../utils/agentDomain'
import './Products.css'

const API_BASE = '/api'
const getImageUrl = (url, size = 'large') => {
    if (!url) return null
    if (url.startsWith('http')) return url
    if (url.includes('/uploads/products/')) return url.replace(/\/(large|medium|original)\//, `/${size}/`)
    return url
}

function ProductCard({ product, linkPrefix }) {
    const [imgError, setImgError] = useState(false)
    const imgSrc = getImageUrl(product.image, 'large')
    const outOfStock = product.stock <= 0
    return (
        <Link to={`${linkPrefix}/products/${product.id}`} className={`zp-card${outOfStock ? ' zp-card-oos' : ''}`}>
            <div className="zp-card-img">
                {imgSrc && !imgError
                    ? <img src={imgSrc} alt={product.name} onError={() => setImgError(true)} />
                    : <div className="zp-card-ph">📦</div>
                }
                {outOfStock && <div className="zp-oos-overlay"><span>已售罄</span></div>}
            </div>
            <div className="zp-card-body">
                <div className="zp-card-name">{product.name}</div>
                <div className="zp-card-bottom">
                    <span className="zp-price">¥{product.price.toFixed(2)}</span>
                    {product.originalPrice && <span className="zp-price-orig">¥{product.originalPrice.toFixed(2)}</span>}
                </div>
            </div>
        </Link>
    )
}

export default function ZenProducts() {
    const [products, setProducts] = useState([])
    const [loading, setLoading] = useState(true)
    const storefront = useStorefront()

    // Determine API endpoint and link prefix
    const apiUrl = storefront ? `${API_BASE}/s/${storefront.slug}/products` : `${API_BASE}/products`
    const linkPrefix = storefront ? getStorefrontBasePath(storefront) : ''

    useEffect(() => {
        setLoading(true)
        fetch(apiUrl)
            .then(r => r.json())
            .then(data => {
                setProducts((data.products || data || []).map(p => ({
                    id: p.id, name: p.name, description: p.description,
                    price: parseFloat(p.price),
                    originalPrice: p.originalPrice ? parseFloat(p.originalPrice) : null,
                    stock: p.stock, sold: p.soldCount || 0, image: p.image || null,
                })))
            })
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [apiUrl])

    return (
        <div className="zp-page">
            <div className="zp-hero">
                <p className="zp-subtitle">
                    {storefront ? `${storefront.shopName} · 精选好物` : '虚拟商品 · 即买即用'}
                </p>
            </div>
            <div className="zp-grid">
                {loading
                    ? Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="zp-skeleton"><div className="zp-sk-img" /><div className="zp-sk-body"><div className="zp-sk-line" /><div className="zp-sk-line short" /></div></div>
                    ))
                    : products.length === 0
                        ? <div className="zp-empty">暂无商品</div>
                        : products.map(p => <ProductCard key={p.id} product={p} linkPrefix={linkPrefix} />)
                }
            </div>
        </div>
    )
}

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { FiShoppingBag } from 'react-icons/fi'
import { useStorefront } from '../../../../store/storefrontStore'
import { getStorefrontBasePath } from '../../../../utils/agentDomain'
import './Products.css'

const API_BASE = '/api'

const getImageUrl = (url, size = 'large') => {
    if (!url) return null
    if (url.startsWith('http')) return url
    if (url.includes('/uploads/products/')) {
        return url.replace(/\/(large|medium|original)\//, `/${size}/`)
    }
    return url
}

function SkeletonCard() {
    return (
        <div className="fp-skeleton-card">
            <div className="fp-skeleton-img" />
            <div className="fp-skeleton-body">
                <div className="fp-skeleton-line" />
                <div className="fp-skeleton-line short" />
            </div>
        </div>
    )
}

function ProductCard({ product, linkPrefix }) {
    const [imgError, setImgError] = useState(false)
    const imgSrc = getImageUrl(product.image, 'large')
    const outOfStock = product.stock <= 0

    return (
        <Link to={`${linkPrefix}/products/${product.id}`} className={`fp-card${outOfStock ? ' fp-card-oos' : ''}`}>
            <div className="fp-card-image">
                {imgSrc && !imgError ? (
                    <img src={imgSrc} alt={product.name} onError={() => setImgError(true)} />
                ) : (
                    <div className="fp-card-image-placeholder">
                        <span>📦</span>
                        <span>{product.name}</span>
                    </div>
                )}
                {outOfStock && <div className="fp-oos-overlay"><span>已售罄</span></div>}
            </div>
            <div className="fp-card-body">
                <div className="fp-card-name">{product.name}</div>
                {product.description && (
                    <div className="fp-card-desc">{product.description}</div>
                )}
                <div className="fp-card-footer">
                    <div className="fp-price-wrap">
                        <span className="fp-price">¥{product.price.toFixed(2)}</span>
                        {product.originalPrice && (
                            <span className="fp-price-orig">¥{product.originalPrice.toFixed(2)}</span>
                        )}
                    </div>
                    <span className="fp-meta">已售 {product.sold}</span>
                </div>
            </div>
        </Link>
    )
}

export default function FreshProducts() {
    const [products, setProducts] = useState([])
    const [loading, setLoading] = useState(true)
    const storefront = useStorefront()

    const apiUrl = storefront
        ? `${storefront.apiBase || `${API_BASE}/s`}/${storefront.slug}/products`
        : `${API_BASE}/products`
    const linkPrefix = storefront ? getStorefrontBasePath(storefront) : ''

    useEffect(() => {
        setLoading(true)
        fetch(apiUrl)
            .then(r => r.json())
            .then(data => {
                setProducts((data.products || data || []).map(p => ({
                    id: p.id,
                    name: p.name,
                    description: p.description,
                    price: parseFloat(p.price),
                    originalPrice: p.originalPrice ? parseFloat(p.originalPrice) : null,
                    stock: p.stock,
                    sold: p.soldCount || 0,
                    image: p.image || null,
                })))
            })
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [apiUrl])

    return (
        <div className="fp-page">
            <div className="fp-header">
                <h1 className="fp-title">{storefront ? storefront.shopName : '全部商品'}</h1>
                <p className="fp-subtitle">{storefront ? '精选好物，品质保障' : '精选正版虚拟商品，即买即用'}</p>
            </div>

            <div className="fp-grid">
                {loading ? (
                    Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
                ) : products.length === 0 ? (
                    <div className="fp-empty">
                        <div className="fp-empty-icon"><FiShoppingBag size={48} /></div>
                        <div className="fp-empty-title">暂无商品</div>
                        <div className="fp-empty-desc">敬请期待更多商品上架</div>
                    </div>
                ) : (
                    products.map(p => <ProductCard key={p.id} product={p} linkPrefix={linkPrefix} />)
                )}
            </div>
        </div>
    )
}

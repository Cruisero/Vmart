import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { FiShoppingBag } from 'react-icons/fi'
import { useTranslation } from 'react-i18next'
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

// 将文本中的 URL 转为超链接
function linkifyText(text) {
    if (!text) return null
    const urlRegex = /(https?:\/\/[^\s<]+)/g
    const parts = text.split(urlRegex)
    return parts.map((part, i) => {
        if (urlRegex.test(part)) {
            return <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="fp-feature-link-inline">{part}</a>
        }
        // 重置 lastIndex（split 后 regex 状态可能残留）
        urlRegex.lastIndex = 0
        return <span key={i}>{part}</span>
    })
}

function FeatureCard({ data }) {
    if (!data || !data.description) return null
    const [open, setOpen] = useState(!data.collapsed)
    return (
        <div className="fp-feature-card">
            {data.title && (
                <div className="fp-feature-header" onClick={() => setOpen(o => !o)} style={{ cursor: 'pointer' }}>
                    <h2 className="fp-feature-title">{data.title}</h2>
                    <span style={{ fontSize: '1rem', color: '#9CA3AF', transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none' }}>▾</span>
                </div>
            )}
            {(open || !data.title) && (
                <div className="fp-feature-body">
                    <p className="fp-feature-desc">{linkifyText(data.description)}</p>
                </div>
            )}
        </div>
    )
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
    const { t } = useTranslation()
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
                {outOfStock && <div className="fp-oos-overlay"><span>{t('products.soldOut')}</span></div>}
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
                    <span className="fp-meta">{t('products.sales')} {product.sold}</span>
                </div>
            </div>
        </Link>
    )
}

export default function FreshProducts() {
    const { t } = useTranslation()
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
            <FeatureCard data={storefront?.featureCard} />

            <div className="fp-grid">
                {loading ? (
                    Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
                ) : products.length === 0 ? (
                    <div className="fp-empty">
                        <div className="fp-empty-icon"><FiShoppingBag size={48} /></div>
                        <div className="fp-empty-title">{t('products.noProducts')}</div>
                        <div className="fp-empty-desc"></div>
                    </div>
                ) : (
                    products.map(p => <ProductCard key={p.id} product={p} linkPrefix={linkPrefix} />)
                )}
            </div>
        </div>
    )
}

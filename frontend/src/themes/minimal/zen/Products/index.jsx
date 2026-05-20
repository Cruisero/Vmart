import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useStorefront } from '../../../../store/storefrontStore'
import { getStorefrontBasePath } from '../../../../utils/agentDomain'
import './Products.css'

const API_BASE = '/api'
const getImageUrl = (url, size = 'large') => {
    if (!url) return null
    if (url.startsWith('http')) return url
    if (url.includes('/uploads/products/')) return url.replace(/\/(large|medium|original)\//, `/${size}/`)
    return url
}

// 将文本中的 URL 转为超链接
function linkifyText(text) {
    if (!text) return null
    const urlRegex = /(https?:\/\/[^\s<]+)/g
    const parts = text.split(urlRegex)
    return parts.map((part, i) => {
        if (urlRegex.test(part)) {
            return <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="zp-feature-link-inline">{part}</a>
        }
        urlRegex.lastIndex = 0
        return <span key={i}>{part}</span>
    })
}

function FeatureCard({ data }) {
    if (!data || !data.description) return null
    const [open, setOpen] = useState(!data.collapsed)
    return (
        <div className="zp-feature-card">
            {data.title && (
                <div className="zp-feature-header" onClick={() => setOpen(o => !o)} style={{ cursor: 'pointer' }}>
                    <h2 className="zp-feature-title">{data.title}</h2>
                    <span style={{ fontSize: '1rem', color: '#9CA3AF', transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none' }}>▾</span>
                </div>
            )}
            {(open || !data.title) && (
                <div className="zp-feature-body">
                    <p className="zp-feature-desc">{linkifyText(data.description)}</p>
                </div>
            )}
        </div>
    )
}

function ProductCard({ product, linkPrefix }) {
    const { t } = useTranslation()
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
                {outOfStock && <div className="zp-oos-overlay"><span>{t('products.soldOut')}</span></div>}
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
    const { t } = useTranslation()
    const [products, setProducts] = useState([])
    const [loading, setLoading] = useState(true)
    const storefront = useStorefront()

    // Determine API endpoint and link prefix
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
            <FeatureCard data={storefront?.featureCard} />
            <div className="zp-grid">
                {loading
                    ? Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="zp-skeleton"><div className="zp-sk-img" /><div className="zp-sk-body"><div className="zp-sk-line" /><div className="zp-sk-line short" /></div></div>
                    ))
                    : products.length === 0
                        ? <div className="zp-empty">{t('products.noProducts')}</div>
                        : products.map(p => <ProductCard key={p.id} product={p} linkPrefix={linkPrefix} />)
                }
            </div>
        </div>
    )
}

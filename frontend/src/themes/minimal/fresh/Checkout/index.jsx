import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { FiMail, FiCreditCard, FiShield, FiZap, FiCheck, FiLock } from 'react-icons/fi'
import { useBuyerL } from '../../../../hooks/useBuyerL'
import { useAuthStore } from '../../../../store/authStore'
import { useStorefront } from '../../../../store/storefrontStore'
import { getStorefrontBasePath } from '../../../../utils/agentDomain'
import { formatPrice } from '../../../../utils/currencyFormat'
import toast from 'react-hot-toast'
import './Checkout.css'

const paymentIcons = { alipay: '💳', wechat: '💚', usdt: '💰', bsc_usdt: '🟡', yipay: '⚡' }
const paymentColors = { alipay: '#1677ff', wechat: '#07c160', usdt: '#26a17b', bsc_usdt: '#f3ba2f', yipay: '#1890ff' }

export default function FreshCheckout() {
    const L = useBuyerL()
    const navigate = useNavigate()
    const location = useLocation()
    const { user, isAuthenticated } = useAuthStore()
    const storefront = useStorefront()
    const prefix = storefront ? getStorefrontBasePath(storefront) : ''
    const currency = storefront?.currency || 'CNY'

    // 从商品详情页传来的单件商品
    const item = location.state?.item

    const [email, setEmail] = useState(user?.email || '')
    const [queryPassword, setQueryPassword] = useState('')
    const [showEmailEdit, setShowEmailEdit] = useState(false)
    const [paymentMethod, setPaymentMethod] = useState('alipay')
    const [paymentMethods, setPaymentMethods] = useState([])
    const [loading, setLoading] = useState(false)
    const [agreed, setAgreed] = useState(true)

    // 协议数据
    const agreements = storefront?.agreements || null
    const hasAgreements = !!(agreements?.purchasePolicy || agreements?.refundPolicy)

    const totalPrice = item ? item.price * item.quantity : 0
    const itemCount = item?.quantity ?? 0
    const isWholesale = item?.basePrice && item.price < item.basePrice
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())

    useEffect(() => {
        const url = storefront?.slug ? `/api/payment/methods?slug=${storefront.slug}` : '/api/payment/methods'
        fetch(url)
            .then(r => r.json())
            .then(data => {
                if (data.methods) {
                    const methods = data.methods.map(m => ({
                        ...m,
                        icon: paymentIcons[m.id] || '💳',
                        color: paymentColors[m.id] || '#666',
                    }))
                    setPaymentMethods(methods)
                    const first = methods.find(m => m.enabled)
                    if (first) setPaymentMethod(first.id)
                }
            })
            .catch(() => {
                setPaymentMethods([])
            })
    }, [])

    if (!item) return (
        <div className="fc-page">
            <div className="fc-empty">
                <h2>{L('checkout.cartEmpty')}</h2>
                <p>{L('checkout.cartEmptyDesc')}</p>
                <Link to={`${prefix}/`} className="fc-empty-link">{L('checkout.goShop')}</Link>
            </div>
        </div>
    )

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!isAuthenticated) {
            if (!email.trim()) { toast.error(L('checkout.emailRequired')); return }
            if (!emailValid) { toast.error(L('checkout.emailError')); return }
            if (!queryPassword.trim() || queryPassword.trim().length < 4) { toast.error(L('checkout.queryPasswordError')); return }
        } else if (showEmailEdit) {
            if (!email.trim() || !emailValid) { toast.error(L('checkout.emailError')); return }
        }
        if (hasAgreements && !agreed) { toast.error(L('checkout.agreeError')); return }
        setLoading(true)
        try {
            const res = await fetch('/api/orders', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(isAuthenticated && { 'Authorization': `Bearer ${useAuthStore.getState().token}` })
                },
                body: JSON.stringify({
                    productId: item.id,
                    variantId: item.variant?.id || null,
                    quantity: item.quantity,
                    email: email.trim() || user?.email || '',
                    paymentMethod,
                    remark: null,
                    queryPassword: isAuthenticated ? null : (queryPassword.trim() || null),
                    agentSlug: location.state?.agentSlug || storefront?.slug || null
                })
            })
            const result = await res.json()

            if (result.error) { toast.error(result.error || L('checkout.orderFailed')); setLoading(false); return }

            toast.success(L('checkout.orderSuccess'))
            navigate(`${prefix}/order/${result.order.orderNo}`)
        } catch {
            toast.error(L('checkout.orderFailed'))
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fc-page">
            <h1 className="fc-title">{L('checkout.title')}</h1>

            <form className="fc-layout" onSubmit={handleSubmit}>
                {/* ── 左侧 ── */}
                <div>
                    {/* 商品列表 */}
                    <div className="fc-card">
                        <div className="fc-card-title">{L('checkout.productList')}</div>
                        <div className="fc-items">
                            <div className="fc-item">
                                {item.image
                                    ? <img className="fc-item-img" src={item.image} alt={item.name} />
                                    : <div className="fc-item-img" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>📦</div>
                                }
                                <div className="fc-item-info">
                                    <div className="fc-item-name">{item.name}</div>
                                    <div className="fc-item-qty">
                                        {item.variant ? `${item.variant.name} · ` : ''}×{item.quantity}
                                    </div>
                                </div>
                                <div className="fc-item-price">{formatPrice(item.price * item.quantity, currency)}</div>
                            </div>
                        </div>
                    </div>

                    {/* 邮箱 + 查询密码（仅游客） */}
                    {!isAuthenticated && (
                        <div className="fc-card">
                            <div className="fc-card-title"><FiMail />{L('checkout.email')}</div>
                            <div className="fc-inline-fields">
                                <div className="fc-inline-field">
                                    <div className="fc-input-wrap">
                                        <FiMail className="fc-input-icon" />
                                        <input
                                            type="email"
                                            className="fc-input"
                                            placeholder={L('checkout.emailPlaceholder')}
                                            value={email}
                                            onChange={e => setEmail(e.target.value)}
                                        />
                                    </div>
                                    {email && !emailValid
                                        ? <div className="fc-input-error">{L('checkout.emailError')}</div>
                                        : <div className="fc-input-hint">{L('checkout.emailDesc')}</div>
                                    }
                                </div>
                                <div className="fc-inline-field">
                                    <div className="fc-input-wrap">
                                        <FiLock className="fc-input-icon" />
                                        <input
                                            type="password"
                                            className="fc-input"
                                            placeholder={L('checkout.queryPasswordPlaceholder')}
                                            value={queryPassword}
                                            onChange={e => setQueryPassword(e.target.value)}
                                            maxLength={20}
                                        />
                                    </div>
                                    <div className="fc-input-hint">{L('checkout.queryPasswordDesc')}</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 已登录：折叠的「使用其它邮箱接收」 */}
                    {isAuthenticated && (
                        <div className="fc-card">
                            <div className="fc-card-title"><FiMail />{L('checkout.email')}</div>
                            {!showEmailEdit ? (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, fontSize: '0.88rem' }}>
                                    <div style={{ color: '#374151' }}>{L('checkout.emailSentTo')} <strong>{email || user?.email}</strong></div>
                                    <button
                                        type="button"
                                        onClick={() => setShowEmailEdit(true)}
                                        style={{ background: 'none', border: 'none', color: '#EF4444', fontSize: '0.85rem', cursor: 'pointer', padding: 0 }}
                                    >
                                        {L('checkout.useOtherEmail')}
                                    </button>
                                </div>
                            ) : (
                                <div className="fc-inline-field">
                                    <div className="fc-input-wrap">
                                        <FiMail className="fc-input-icon" />
                                        <input
                                            type="email"
                                            className="fc-input"
                                            placeholder={L('checkout.emailPlaceholder')}
                                            value={email}
                                            onChange={e => setEmail(e.target.value)}
                                            autoFocus
                                        />
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                                        {email && !emailValid
                                            ? <div className="fc-input-error">{L('checkout.emailError')}</div>
                                            : <div className="fc-input-hint">{L('checkout.emailDesc')}</div>
                                        }
                                        <button
                                            type="button"
                                            onClick={() => { setEmail(user?.email || ''); setShowEmailEdit(false) }}
                                            style={{ background: 'none', border: 'none', color: '#9CA3AF', fontSize: '0.8rem', cursor: 'pointer', padding: 0 }}
                                        >
                                            {L('common.cancel')}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* 支付方式 */}
                    <div className="fc-card">
                        <div className="fc-card-title"><FiCreditCard />{L('checkout.payment')}</div>
                        <div className="fc-payment-grid">
                            {paymentMethods.filter(m => m.enabled).map(m => (
                                <button
                                    key={m.id}
                                    type="button"
                                    className={`fc-pay-btn${paymentMethod === m.id ? ' active' : ''}`}
                                    onClick={() => setPaymentMethod(m.id)}
                                >
                                    <span className="fc-pay-icon">{m.icon}</span>
                                    {m.name}
                                    {paymentMethod === m.id && <FiCheck size={13} />}
                                </button>
                            ))}
                        </div>
                    </div>

                </div>

                {/* ── 右侧 sidebar ── */}
                <div className="fc-sidebar">
                    <div className="fc-card">
                        <div className="fc-card-title">{L('checkout.summary')}</div>

                        <div className="fc-summary-rows">
                            <div className="fc-summary-row">
                                <span>{L('checkout.itemCount')}</span>
                                <span>{itemCount} {L('checkout.itemUnit')}</span>
                            </div>
                            <div className="fc-summary-row">
                                <span>{L('checkout.unitPrice')}</span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    {formatPrice(item.price, currency)}
                                    {isWholesale && (
                                        <span style={{
                                            fontSize: '0.7rem', background: '#FEF2F2',
                                            color: '#DC2626', borderRadius: 10, padding: '1px 6px', fontWeight: 600
                                        }}>{L('products.wholesalePrice')}</span>
                                    )}
                                </span>
                            </div>
                            {isWholesale && (
                                <div className="fc-summary-row" style={{ color: '#10B981', fontSize: '0.82rem' }}>
                                    <span>{L('products.bulkDiscount')}</span>
                                    <span>-{formatPrice((item.basePrice - item.price) * item.quantity, currency)}</span>
                                </div>
                            )}
                        </div>

                        <div className="fc-summary-divider" />

                        <div className="fc-total-row">
                            <span className="fc-total-label">{L('checkout.totalDue')}</span>
                            <span className="fc-total-price">{formatPrice(totalPrice, currency)}</span>
                        </div>

                        <button type="submit" className="fc-pay-submit" disabled={loading || (hasAgreements && !agreed)}>
                            {loading ? L('checkout.submitting') : `${L('checkout.submit')} ${formatPrice(totalPrice, currency)}`}
                        </button>

                        {hasAgreements && (
                            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem', color: 'var(--text-muted)', cursor: 'pointer', marginTop: -4, marginBottom: 8 }}>
                                <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} style={{ accentColor: 'var(--primary)' }} />
                                <span>{L('checkout.agree')}
                                    {agreements.purchasePolicy && <Link to={`${prefix}/terms`} target="_blank" style={{ color: 'var(--primary)' }}> {L('checkout.purchasePolicy')}</Link>}
                                    {agreements.purchasePolicy && agreements.refundPolicy && ` ${L('checkout.and')}`}
                                    {agreements.refundPolicy && <Link to={`${prefix}/refund-policy`} target="_blank" style={{ color: 'var(--primary)' }}> {L('checkout.refundPolicy')}</Link>}
                                </span>
                            </label>
                        )}

                        <div className="fc-tips">
                            <div className="fc-tip"><FiShield size={12} /><span>{L('checkout.securePayment')}</span></div>
                            <div className="fc-tip"><FiZap size={12} /><span>{L('checkout.autoDelivery')}</span></div>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    )
}

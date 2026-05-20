import { useState, useEffect } from 'react'
import { usePageTitle } from '../../hooks/usePageTitle'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { FiCreditCard, FiMail, FiArrowLeft, FiCheck, FiEdit3 } from 'react-icons/fi'
import { useTranslation } from 'react-i18next'
import { useCartStore } from '../../store/cartStore'
import { useAuthStore } from '../../store/authStore'
import { useStorefront, useStorefrontPath } from '../../store/storefrontStore'
import toast from 'react-hot-toast'
import './Checkout.css'

// 支付方式图标映射
const paymentIcons = {
    alipay: '💳',
    wechat: '💚',
    usdt: '💰',
    bsc_usdt: '🟡'
}

const paymentColors = {
    alipay: '#1677ff',
    wechat: '#07c160',
    usdt: '#26a17b',
    bsc_usdt: '#f3ba2f'
}

function Checkout() {
    const { t } = useTranslation()
    usePageTitle(t('checkout.title'))
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const agentSlug = searchParams.get('agent')
    const agentProductId = searchParams.get('product')

    const { items: cartItems, getTotalPrice, clearCart } = useCartStore()
    const { user, isAuthenticated } = useAuthStore()
    const storefront = useStorefront()
    const { withPrefix } = useStorefrontPath()

    const [email, setEmail] = useState(user?.email || '')
    const [queryPassword, setQueryPassword] = useState('')
    const [paymentMethod, setPaymentMethod] = useState('alipay')
    const [loading, setLoading] = useState(false)
    const [agreed, setAgreed] = useState(true) // 默认勾选
    const [paymentMethods, setPaymentMethods] = useState([])
    const [remark, setRemark] = useState('')

    // 协议数据从 StorefrontContext 读取
    const agreements = storefront?.agreements || null
    const hasAgreements = !!(agreements?.purchasePolicy || agreements?.refundPolicy)

    // 代理分站下单：单独的商品数据
    const [agentProduct, setAgentProduct] = useState(null)
    const [agentQty, setAgentQty] = useState(1)
    const [selectedVariant, setSelectedVariant] = useState(null)

    // 判断是否来自代理分站
    const isAgentCheckout = !!(agentSlug && agentProductId)

    // 当前使用的商品列表
    const items = isAgentCheckout
        ? (agentProduct ? [{ id: agentProduct.id, name: agentProduct.name, image: agentProduct.image, price: selectedVariant ? selectedVariant.price : agentProduct.price, quantity: agentQty, variant: selectedVariant }] : [])
        : cartItems

    const totalPrice = isAgentCheckout
        ? (selectedVariant ? selectedVariant.price : (agentProduct?.price || 0)) * agentQty
        : getTotalPrice()
    const itemCount = isAgentCheckout ? agentQty : cartItems.reduce((sum, item) => sum + item.quantity, 0)

    // 获取代理分站商品信息
    useEffect(() => {
        if (isAgentCheckout) {
            fetch(`/api/s/${agentSlug}/products/${agentProductId}`)
                .then(r => r.json())
                .then(data => {
                    if (data.product) {
                        setAgentProduct(data.product)
                    }
                })
                .catch(() => toast.error(t('common.networkError')))
        }
    }, [agentSlug, agentProductId])

    // 从API获取支付方式
    useEffect(() => {
        const fetchPaymentMethods = async () => {
            try {
                const url = storefront?.slug ? `/api/payment/methods?slug=${storefront.slug}` : '/api/payment/methods'
                const res = await fetch(url)
                const data = await res.json()
                if (data.methods) {
                    const methods = data.methods.map(m => ({
                        ...m,
                        icon: paymentIcons[m.id] || '💳',
                        color: paymentColors[m.id] || '#666',
                        disabled: !m.enabled
                    }))
                    setPaymentMethods(methods)

                    const firstEnabled = methods.find(m => !m.disabled)
                    if (firstEnabled) {
                        setPaymentMethod(firstEnabled.id)
                    }
                }
            } catch (error) {
                console.error('获取支付方式失败:', error)
                setPaymentMethods([])
            }
        }
        fetchPaymentMethods()
    }, [storefront?.slug])

    if (!isAgentCheckout && cartItems.length === 0) {
        return (
            <div className="checkout-page">
                <div className="checkout-empty">
                    <h2>{t('checkout.cartEmpty')}</h2>
                    <p>{t('checkout.cartEmptyDesc')}</p>
                    <Link to="/products" className="btn btn-primary">
                        {t('checkout.goShop')}
                    </Link>
                </div>
            </div>
        )
    }

    if (isAgentCheckout && !agentProduct) {
        return (
            <div className="checkout-page">
                <div className="checkout-empty">
                    <p>{t('checkout.loading')}</p>
                </div>
            </div>
        )
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (!email || !email.trim()) {
            toast.error(t('checkout.emailRequired'))
            return
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(email.trim())) {
            toast.error(t('checkout.emailError'))
            return
        }

        if (!isAuthenticated) {
            if (!queryPassword.trim() || queryPassword.trim().length < 4) {
                toast.error(t('checkout.queryPasswordError'))
                return
            }
        }

        if (hasAgreements && !agreed) {
            toast.error(t('checkout.agreeError'))
            return
        }

        setLoading(true)

        try {
            if (isAgentCheckout) {
                const res = await fetch('/api/orders', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(isAuthenticated && { 'Authorization': `Bearer ${useAuthStore.getState().token}` })
                    },
                    body: JSON.stringify({
                        productId: agentProduct.id,
                        variantId: selectedVariant?.id || null,
                        quantity: agentQty,
                        email: email,
                        paymentMethod: paymentMethod,
                        remark: remark.trim() || null,
                        queryPassword: isAuthenticated ? null : queryPassword.trim(),
                        agentSlug: agentSlug
                    })
                })
                const result = await res.json()
                if (result.error) {
                    toast.error(result.error)
                    setLoading(false)
                    return
                }
                toast.success(t('checkout.orderSuccess'))
                navigate(withPrefix(`/order/${result.order.orderNo}`))
            } else {
                const orderPromises = cartItems.map(item =>
                    fetch('/api/orders', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            ...(isAuthenticated && { 'Authorization': `Bearer ${useAuthStore.getState().token}` })
                        },
                        body: JSON.stringify({
                            productId: item.id,
                            variantId: item.variant?.id || null,
                            quantity: item.quantity,
                            email: email,
                            paymentMethod: paymentMethod,
                            remark: remark.trim() || null,
                            queryPassword: isAuthenticated ? null : queryPassword.trim()
                        })
                    }).then(res => res.json())
                )

                const results = await Promise.all(orderPromises)
                const errors = results.filter(r => r.error)
                if (errors.length > 0) {
                    toast.error(errors[0].error || t('checkout.orderFailed'))
                    setLoading(false)
                    return
                }

                const firstOrder = results[0]
                clearCart()
                toast.success(t('checkout.orderSuccess'))
                navigate(withPrefix(`/order/${firstOrder.order.orderNo}`))
            }
        } catch (error) {
            console.error('创建订单失败:', error)
            toast.error(t('checkout.orderFailed'))
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="checkout-page">
            <button className="back-btn" onClick={() => navigate(-1)}>
                <FiArrowLeft />
                {isAgentCheckout ? t('checkout.backToProduct') : t('checkout.backToCart')}
            </button>

            <h1 className="section-title">{t('checkout.title')}</h1>

            <form className="checkout-container" onSubmit={handleSubmit}>
                {/* 左侧 - 订单信息 */}
                <div className="checkout-main">
                    {/* 商品列表 */}
                    <div className="checkout-section">
                        <h3>{t('checkout.productInfo')}</h3>
                        <div className="checkout-items">
                            {items.map((item) => (
                                <div key={item.id} className="checkout-item">
                                    <img src={item.image} alt={item.name} />
                                    <div className="item-details">
                                        <h4>{item.name}{item.variant ? ` (${item.variant.name})` : ''}</h4>
                                        <p>{t('checkout.quantity')}: {item.quantity}</p>
                                    </div>
                                    <div className="item-price">
                                        ¥{(item.price * item.quantity).toFixed(2)}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* 代理分站：数量选择和规格选择 */}
                        {isAgentCheckout && (
                            <div style={{ marginTop: 16, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                                {agentProduct.variants?.length > 0 && (
                                    <div>
                                        <label style={{ fontSize: '0.85rem', fontWeight: 600, marginRight: 8 }}>{t('checkout.variant')}：</label>
                                        <select
                                            value={selectedVariant?.id || ''}
                                            onChange={e => {
                                                const v = agentProduct.variants.find(v => v.id === e.target.value)
                                                setSelectedVariant(v || null)
                                            }}
                                            style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #E5E7EB' }}
                                        >
                                            <option value="">{t('checkout.default')}</option>
                                            {agentProduct.variants.map(v => (
                                                <option key={v.id} value={v.id}>{v.name} - ¥{v.price.toFixed(2)}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                                <div>
                                    <label style={{ fontSize: '0.85rem', fontWeight: 600, marginRight: 8 }}>{t('checkout.quantity')}：</label>
                                    <input
                                        type="number" min={1} max={agentProduct.stock}
                                        value={agentQty}
                                        onChange={e => setAgentQty(Math.max(1, parseInt(e.target.value) || 1))}
                                        style={{ width: 70, padding: '6px 12px', borderRadius: 8, border: '1px solid #E5E7EB', textAlign: 'center' }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 订单邮箱 */}
                    <div className="checkout-section">
                        <h3>
                            <FiMail />
                            {t('checkout.email')}
                        </h3>
                        <p className="section-desc">{t('checkout.emailDesc')}</p>
                        <input
                            type="email"
                            className="input"
                            placeholder={t('checkout.emailPlaceholder')}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                        {email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && (
                            <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '6px' }}>{t('checkout.emailError')}</p>
                        )}
                        {!isAuthenticated && (
                            <>
                                <p className="section-desc" style={{ marginTop: 12 }}>{t('checkout.queryPasswordDesc')}</p>
                                <input
                                    type="password"
                                    className="input"
                                    placeholder={t('checkout.queryPasswordPlaceholder')}
                                    value={queryPassword}
                                    onChange={(e) => setQueryPassword(e.target.value)}
                                    minLength={4}
                                    maxLength={20}
                                    required
                                />
                            </>
                        )}
                    </div>

                    {/* 支付方式 */}
                    <div className="checkout-section">
                        <h3>
                            <FiCreditCard />
                            {t('checkout.payment')}
                        </h3>
                        <div className="payment-methods">
                            {paymentMethods.filter(m => !m.disabled).map((method) => (
                                <label
                                    key={method.id}
                                    className={`payment-option ${paymentMethod === method.id ? 'active' : ''}`}
                                >
                                    <input
                                        type="radio"
                                        name="paymentMethod"
                                        value={method.id}
                                        checked={paymentMethod === method.id}
                                        onChange={() => setPaymentMethod(method.id)}
                                    />
                                    <span className="payment-icon">{method.icon}</span>
                                    <span className="payment-name">{method.name}</span>
                                    {paymentMethod === method.id && <FiCheck className="check-icon" />}
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* 订单备注 */}
                    <div className="checkout-section">
                        <h3>
                            <FiEdit3 />
                            {t('checkout.remark')}
                        </h3>
                        <p className="section-desc">{t('checkout.remarkDesc')}</p>
                        <textarea
                            className="input remark-input"
                            placeholder={t('checkout.remarkPlaceholder')}
                            value={remark}
                            onChange={(e) => setRemark(e.target.value)}
                            maxLength={500}
                            rows={3}
                        />
                        <div className="remark-count">{remark.length}/500</div>
                    </div>
                </div>

                {/* 右侧 - 订单摘要 */}
                <div className="checkout-sidebar">
                    <div className="order-summary">
                        <h3>{t('checkout.summary')}</h3>

                        <div className="summary-rows">
                            <div className="summary-row">
                                <span>{t('checkout.itemCount')}</span>
                                <span>{itemCount} {t('checkout.itemUnit')}</span>
                            </div>
                            <div className="summary-row">
                                <span>{t('checkout.subtotal')}</span>
                                <span>¥{totalPrice.toFixed(2)}</span>
                            </div>
                            <div className="summary-row">
                                <span>{t('checkout.discount')}</span>
                                <span className="discount">-¥0.00</span>
                            </div>
                        </div>

                        <div className="summary-total">
                            <span>{t('checkout.totalDue')}</span>
                            <span className="total-price">¥{totalPrice.toFixed(2)}</span>
                        </div>

                        {hasAgreements && (
                            <label className="agree-terms">
                                <input
                                    type="checkbox"
                                    checked={agreed}
                                    onChange={(e) => setAgreed(e.target.checked)}
                                />
                                <span>{t('checkout.agree')}
                                    {agreements.purchasePolicy && <Link to={withPrefix('/terms')} target="_blank">{t('checkout.purchasePolicy')}</Link>}
                                    {agreements.purchasePolicy && agreements.refundPolicy && ` ${t('checkout.and')} `}
                                    {agreements.refundPolicy && <Link to={withPrefix('/refund-policy')} target="_blank">{t('checkout.refundPolicy')}</Link>}
                                </span>
                            </label>
                        )}

                        <button
                            type="submit"
                            className="btn btn-primary btn-lg submit-order-btn"
                            disabled={loading || (hasAgreements && !agreed)}
                        >
                            {loading ? t('checkout.submitting') : `${t('checkout.submit')} ¥${totalPrice.toFixed(2)}`}
                        </button>

                       
                    </div>
                </div>
            </form>
        </div>
    )
}

export default Checkout

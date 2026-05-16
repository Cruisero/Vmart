import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { FiCreditCard, FiMail, FiArrowLeft, FiCheck, FiEdit3 } from 'react-icons/fi'
import { useCartStore } from '../../store/cartStore'
import { useAuthStore } from '../../store/authStore'
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
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const agentSlug = searchParams.get('agent')
    const agentProductId = searchParams.get('product')

    const { items: cartItems, getTotalPrice, clearCart } = useCartStore()
    const { user, isAuthenticated } = useAuthStore()

    const [email, setEmail] = useState(user?.email || '')
    const [paymentMethod, setPaymentMethod] = useState('alipay')
    const [loading, setLoading] = useState(false)
    const [agreed, setAgreed] = useState(false)
    const [paymentMethods, setPaymentMethods] = useState([])
    const [remark, setRemark] = useState('')

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
                .catch(() => toast.error('获取商品信息失败'))
        }
    }, [agentSlug, agentProductId])

    // 从API获取支付方式
    useEffect(() => {
        const fetchPaymentMethods = async () => {
            try {
                const res = await fetch('/api/payment/methods')
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
                setPaymentMethods([
                    { id: 'alipay', name: '支付宝', icon: '💳', color: '#1677ff', disabled: false }
                ])
            }
        }
        fetchPaymentMethods()
    }, [])

    if (!isAgentCheckout && cartItems.length === 0) {
        return (
            <div className="checkout-page">
                <div className="checkout-empty">
                    <h2>购物车为空</h2>
                    <p>请先添加商品到购物车</p>
                    <Link to="/products" className="btn btn-primary">
                        去购物
                    </Link>
                </div>
            </div>
        )
    }

    if (isAgentCheckout && !agentProduct) {
        return (
            <div className="checkout-page">
                <div className="checkout-empty">
                    <p>加载商品信息...</p>
                </div>
            </div>
        )
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (!email || !email.trim()) {
            toast.error('请输入接收卡密的邮箱')
            return
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(email.trim())) {
            toast.error('请输入正确的邮箱格式')
            return
        }

        if (!agreed) {
            toast.error('请同意用户协议')
            return
        }

        setLoading(true)

        try {
            if (isAgentCheckout) {
                // 代理分站下单：单个商品
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
                        agentSlug: agentSlug
                    })
                })
                const result = await res.json()
                if (result.error) {
                    toast.error(result.error)
                    setLoading(false)
                    return
                }
                toast.success('订单创建成功')
                navigate(`/order/${result.order.orderNo}`)
            } else {
                // 普通结账流程
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
                            remark: remark.trim() || null
                        })
                    }).then(res => res.json())
                )

                const results = await Promise.all(orderPromises)
                const errors = results.filter(r => r.error)
                if (errors.length > 0) {
                    toast.error(errors[0].error || '订单创建失败')
                    setLoading(false)
                    return
                }

                const firstOrder = results[0]
                clearCart()
                toast.success('订单创建成功')
                navigate(`/order/${firstOrder.order.orderNo}`)
            }
        } catch (error) {
            console.error('创建订单失败:', error)
            toast.error('创建订单失败，请稍后重试')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="checkout-page">
            <button className="back-btn" onClick={() => navigate(-1)}>
                <FiArrowLeft />
                {isAgentCheckout ? '返回商品' : '返回购物车'}
            </button>

            <h1 className="section-title">确认订单</h1>

            <form className="checkout-container" onSubmit={handleSubmit}>
                {/* 左侧 - 订单信息 */}
                <div className="checkout-main">
                    {/* 商品列表 */}
                    <div className="checkout-section">
                        <h3>商品信息</h3>
                        <div className="checkout-items">
                            {items.map((item) => (
                                <div key={item.id} className="checkout-item">
                                    <img src={item.image} alt={item.name} />
                                    <div className="item-details">
                                        <h4>{item.name}{item.variant ? ` (${item.variant.name})` : ''}</h4>
                                        <p>数量: {item.quantity}</p>
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
                                        <label style={{ fontSize: '0.85rem', fontWeight: 600, marginRight: 8 }}>规格：</label>
                                        <select
                                            value={selectedVariant?.id || ''}
                                            onChange={e => {
                                                const v = agentProduct.variants.find(v => v.id === e.target.value)
                                                setSelectedVariant(v || null)
                                            }}
                                            style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #E5E7EB' }}
                                        >
                                            <option value="">默认</option>
                                            {agentProduct.variants.map(v => (
                                                <option key={v.id} value={v.id}>{v.name} - ¥{v.price.toFixed(2)}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                                <div>
                                    <label style={{ fontSize: '0.85rem', fontWeight: 600, marginRight: 8 }}>数量：</label>
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

                    {/* 接收邮箱 */}
                    <div className="checkout-section">
                        <h3>
                            <FiMail />
                            接收邮箱
                        </h3>
                        <p className="section-desc">卡密将发送到此邮箱，请确保填写正确</p>
                        <input
                            type="email"
                            className="input"
                            placeholder="请输入邮箱地址"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                        {email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && (
                            <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '6px' }}>请输入正确的邮箱格式</p>
                        )}
                    </div>

                    {/* 支付方式 */}
                    <div className="checkout-section">
                        <h3>
                            <FiCreditCard />
                            支付方式
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
                            订单备注
                        </h3>
                        <p className="section-desc">如有特殊要求，请在此备注（选填）</p>
                        <textarea
                            className="input remark-input"
                            placeholder="例如：请发送到备用邮箱 xxx@example.com"
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
                        <h3>订单摘要</h3>

                        <div className="summary-rows">
                            <div className="summary-row">
                                <span>商品数量</span>
                                <span>{itemCount} 件</span>
                            </div>
                            <div className="summary-row">
                                <span>商品金额</span>
                                <span>¥{totalPrice.toFixed(2)}</span>
                            </div>
                            <div className="summary-row">
                                <span>优惠</span>
                                <span className="discount">-¥0.00</span>
                            </div>
                        </div>

                        <div className="summary-total">
                            <span>应付金额</span>
                            <span className="total-price">¥{totalPrice.toFixed(2)}</span>
                        </div>

                        <label className="agree-terms">
                            <input
                                type="checkbox"
                                checked={agreed}
                                onChange={(e) => setAgreed(e.target.checked)}
                            />
                            <span>我已阅读并同意 <a href="/terms" target="_blank" rel="noopener noreferrer">购买协议</a> 和 <a href="/refund-policy" target="_blank" rel="noopener noreferrer">退款政策</a></span>
                        </label>

                        <button
                            type="submit"
                            className="btn btn-primary btn-lg submit-order-btn"
                            disabled={loading || !agreed}
                        >
                            {loading ? '提交中...' : `立即支付 ¥${totalPrice.toFixed(2)}`}
                        </button>

                        <div className="security-tips">
                            <p>🔒 安全支付，隐私保护</p>
                            <p>⚡ 支付成功后自动发放卡密</p>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    )
}

export default Checkout

import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { FiMail, FiCreditCard, FiShield, FiZap, FiCheck, FiLock } from 'react-icons/fi'
import { useAuthStore } from '../../../../store/authStore'
import { useStorefront } from '../../../../store/storefrontStore'
import { getStorefrontBasePath } from '../../../../utils/agentDomain'
import toast from 'react-hot-toast'
import './Checkout.css'

const paymentIcons = { alipay: '💳', wechat: '💚', usdt: '💰', bsc_usdt: '🟡' }
const paymentColors = { alipay: '#1677ff', wechat: '#07c160', usdt: '#26a17b', bsc_usdt: '#f3ba2f' }

export default function ZenCheckout() {
    const navigate = useNavigate()
    const location = useLocation()
    const { user, isAuthenticated } = useAuthStore()
    const storefront = useStorefront()
    const prefix = storefront ? getStorefrontBasePath(storefront) : ''

    // 从商品详情页传来的单件商品
    const item = location.state?.item

    const [email, setEmail] = useState(user?.email || '')
    const [queryPassword, setQueryPassword] = useState('')
    const [paymentMethod, setPaymentMethod] = useState('alipay')
    const [paymentMethods, setPaymentMethods] = useState([])
    const [loading, setLoading] = useState(false)

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
                <h2>暂无待结算商品</h2>
                <p>请先选择想要购买的商品</p>
                <Link to={`${prefix}/`} className="fc-empty-link">去选购</Link>
            </div>
        </div>
    )

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!isAuthenticated) {
            if (!email.trim()) { toast.error('请输入邮箱'); return }
            if (!emailValid) { toast.error('请输入正确的邮箱格式'); return }
            if (!queryPassword.trim() || queryPassword.trim().length < 4) { toast.error('请设置至少4位的查询密码'); return }
        }
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
                    email: isAuthenticated ? (user?.email || '') : email.trim(),
                    paymentMethod,
                    remark: null,
                    queryPassword: isAuthenticated ? null : (queryPassword.trim() || null),
                    agentSlug: location.state?.agentSlug || storefront?.slug || null
                })
            })
            const result = await res.json()

            if (result.error) { toast.error(result.error || '订单创建失败'); setLoading(false); return }

            toast.success('订单创建成功')
            navigate(`${prefix}/order/${result.order.orderNo}`)
        } catch {
            toast.error('创建订单失败，请稍后重试')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fc-page">
            <h1 className="fc-title">确认订单</h1>

            <form className="fc-layout" onSubmit={handleSubmit}>
                {/* ── 左侧 ── */}
                <div>
                    {/* 商品列表 */}
                    <div className="fc-card">
                        <div className="fc-card-title">商品清单</div>
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
                                <div className="fc-item-price">¥{(item.price * item.quantity).toFixed(2)}</div>
                            </div>
                        </div>
                    </div>

                    {/* 邮箱 + 查询密码（仅游客） */}
                    {!isAuthenticated && (
                        <div className="fc-card">
                            <div className="fc-card-title"><FiMail />订单查询信息</div>
                            <div className="fc-inline-fields">
                                <div className="fc-inline-field">
                                    <div className="fc-input-wrap">
                                        <FiMail className="fc-input-icon" />
                                        <input
                                            type="email"
                                            className="fc-input"
                                            placeholder="邮箱地址"
                                            value={email}
                                            onChange={e => setEmail(e.target.value)}
                                        />
                                    </div>
                                    {email && !emailValid
                                        ? <div className="fc-input-error">邮箱格式有误</div>
                                        : <div className="fc-input-hint">用于接收或查询订单信息</div>
                                    }
                                </div>
                                <div className="fc-inline-field">
                                    <div className="fc-input-wrap">
                                        <FiLock className="fc-input-icon" />
                                        <input
                                            type="password"
                                            className="fc-input"
                                            placeholder="查询密码（至少4位）"
                                            value={queryPassword}
                                            onChange={e => setQueryPassword(e.target.value)}
                                            maxLength={20}
                                        />
                                    </div>
                                    <div className="fc-input-hint">下单后凭此密码查询订单</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 支付方式 */}
                    <div className="fc-card">
                        <div className="fc-card-title"><FiCreditCard />支付方式</div>
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
                        <div className="fc-card-title">订单摘要</div>

                        <div className="fc-summary-rows">
                            <div className="fc-summary-row">
                                <span>商品数量</span>
                                <span>{itemCount} 件</span>
                            </div>
                            <div className="fc-summary-row">
                                <span>单价</span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    ¥{item.price.toFixed(2)}
                                    {isWholesale && (
                                        <span style={{
                                            fontSize: '0.7rem', background: '#FFF5F2',
                                            color: '#C45D3E', borderRadius: 10, padding: '1px 6px', fontWeight: 600
                                        }}>批发价</span>
                                    )}
                                </span>
                            </div>
                            {isWholesale && (
                                <div className="fc-summary-row" style={{ color: '#10B981', fontSize: '0.82rem' }}>
                                    <span>批发优惠</span>
                                    <span>-¥{((item.basePrice - item.price) * item.quantity).toFixed(2)}</span>
                                </div>
                            )}
                        </div>

                        <div className="fc-summary-divider" />

                        <div className="fc-total-row">
                            <span className="fc-total-label">应付金额</span>
                            <span className="fc-total-price">¥{totalPrice.toFixed(2)}</span>
                        </div>

                        <button type="submit" className="fc-pay-submit" disabled={loading}>
                            {loading ? '提交中…' : `立即支付 ¥${totalPrice.toFixed(2)}`}
                        </button>

                        <div className="fc-tips">
                            <div className="fc-tip"><FiShield size={12} /><span>安全支付，隐私保护</span></div>
                            <div className="fc-tip"><FiZap size={12} /><span>支付成功后自动发放卡密</span></div>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    )
}

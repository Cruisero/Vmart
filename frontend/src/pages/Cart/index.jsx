import { Link, useNavigate } from 'react-router-dom'
import { FiTrash2, FiMinus, FiPlus, FiShoppingBag, FiArrowRight } from 'react-icons/fi'
import { useCartStore } from '../../store/cartStore'
import { useStorefront } from '../../store/storefrontStore'
import { getStorefrontBasePath } from '../../utils/agentDomain'
import toast from 'react-hot-toast'
import './Cart.css'

function Cart() {
    const navigate = useNavigate()
    const storefront = useStorefront()
    const prefix = storefront ? getStorefrontBasePath(storefront) : ''
    const { items, updateQuantity, removeItem, clearCart, getTotalPrice } = useCartStore()

    const totalPrice = getTotalPrice()
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)

    const handleQuantityChange = (item, delta) => {
        const newQty = item.quantity + delta
        if (newQty < 1) return
        // 减少数量永远允许；增加时受 stock 限制（stock 未定义则不限制）
        if (delta > 0 && typeof item.stock === 'number' && newQty > item.stock) {
            toast.error(`库存仅剩 ${item.stock} 件`)
            return
        }
        updateQuantity(item.cartItemId, newQty)
    }

    const handleRemove = (item) => {
        removeItem(item.cartItemId)
        toast.success('已从购物车移除')
    }

    const handleClearCart = () => {
        if (window.confirm('确定要清空购物车吗？')) {
            clearCart()
            toast.success('购物车已清空')
        }
    }

    const handleCheckout = () => {
        // 跳转到结算页
        navigate(`${prefix}/checkout`)
    }

    if (items.length === 0) {
        return (
            <div className="cart-page">
                <div className="cart-empty">
                    <FiShoppingBag className="empty-icon" />
                    <h2>购物车是空的</h2>
                    <p>快去挑选心仪的商品吧~</p>
                    <Link to={`${prefix}/`} className="btn btn-primary">
                        去购物
                        <FiArrowRight />
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="cart-page">
            <div className="cart-header">
                <h1 className="section-title">购物车</h1>
                <button className="clear-cart-btn" onClick={handleClearCart}>
                    <FiTrash2 />
                    清空购物车
                </button>
            </div>

            <div className="cart-container">
                {/* 购物车列表 */}
                <div className="cart-items">
                    {items.map((item) => (
                        <div key={item.cartItemId} className="cart-item">
                            {/* 商品图片 */}
                            <Link to={`/products/${item.id}`} className="item-image">
                                <img src={item.image} alt={item.name} />
                            </Link>

                            {/* 商品信息 */}
                            <div className="item-info">
                                <Link to={`/products/${item.id}`} className="item-name">
                                    {item.name}
                                </Link>
                                {item.variantName && (
                                    <span className="item-variant">规格: {item.variantName}</span>
                                )}
                                <p className="item-desc">{item.description}</p>
                                <div className="item-tags">
                                    {item.tags?.map((tag, index) => (
                                        <span key={index} className="item-tag">{tag}</span>
                                    ))}
                                </div>
                            </div>

                            {/* 单价 */}
                            <div className="item-price">
                                <span className="price-label">单价</span>
                                <span className="price-value">¥{item.price.toFixed(2)}</span>
                            </div>

                            {/* 数量控制 */}
                            <div className="item-quantity">
                                <span className="price-label">数量</span>
                                <div className="quantity-control">
                                    <button
                                        className="qty-btn"
                                        onClick={() => handleQuantityChange(item, -1)}
                                        disabled={item.quantity <= 1}
                                    >
                                        <FiMinus />
                                    </button>
                                    <span className="qty-value">{item.quantity}</span>
                                    <button
                                        className="qty-btn"
                                        onClick={() => handleQuantityChange(item, 1)}
                                        disabled={item.quantity >= item.stock}
                                    >
                                        <FiPlus />
                                    </button>
                                </div>
                            </div>

                            {/* 小计 */}
                            <div className="item-subtotal">
                                <span className="price-label">小计</span>
                                <span className="subtotal-value">
                                    ¥{(item.price * item.quantity).toFixed(2)}
                                </span>
                            </div>

                            {/* 删除按钮 */}
                            <button
                                className="remove-btn"
                                onClick={() => handleRemove(item)}
                                title="移除"
                            >
                                <FiTrash2 />
                            </button>
                        </div>
                    ))}
                </div>

                {/* 结算栏 */}
                <div className="cart-summary">
                    <div className="summary-card">
                        <h3>订单摘要</h3>

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

                        <div className="summary-divider"></div>

                        <div className="summary-total">
                            <span>应付金额</span>
                            <span className="total-price">¥{totalPrice.toFixed(2)}</span>
                        </div>

                        <button className="checkout-btn" onClick={handleCheckout}>
                            去结算
                            <FiArrowRight />
                        </button>

                        <div className="summary-tip">
                            <p>💡 支持支付宝、微信支付</p>
                            <p>🚀 支付成功后自动发放卡密</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Cart

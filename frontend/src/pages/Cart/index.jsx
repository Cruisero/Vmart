import { Link, useNavigate } from 'react-router-dom'
import { FiTrash2, FiMinus, FiPlus, FiShoppingBag, FiArrowRight } from 'react-icons/fi'
import { useTranslation } from 'react-i18next'
import { useCartStore } from '../../store/cartStore'
import { useStorefront } from '../../store/storefrontStore'
import { getStorefrontBasePath } from '../../utils/agentDomain'
import { formatPrice } from '../../utils/currencyFormat'
import { usePageTitle } from '../../hooks/usePageTitle'
import toast from 'react-hot-toast'
import './Cart.css'

function Cart() {
    const { t } = useTranslation()
    usePageTitle(t('cart.title'))
    const navigate = useNavigate()
    const storefront = useStorefront()
    const currency = storefront?.currency || 'CNY'
    const prefix = storefront ? getStorefrontBasePath(storefront) : ''
    const { items, updateQuantity, removeItem, clearCart, getTotalPrice } = useCartStore()

    const totalPrice = getTotalPrice()
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)

    const handleQuantityChange = (item, delta) => {
        const newQty = item.quantity + delta
        if (newQty < 1) return
        if (delta > 0 && typeof item.stock === 'number' && newQty > item.stock) {
            toast.error(`${t('products.stock')} ${item.stock} ${t('products.pieces')}`)
            return
        }
        updateQuantity(item.cartItemId, newQty)
    }

    const handleRemove = (item) => {
        removeItem(item.cartItemId)
        toast.success(t('cart.remove'))
    }

    const handleClearCart = () => {
        if (window.confirm(t('cart.clear') + '?')) {
            clearCart()
            toast.success(t('cart.clear'))
        }
    }

    const handleCheckout = () => {
        navigate(`${prefix}/checkout`)
    }

    if (items.length === 0) {
        return (
            <div className="cart-page">
                <div className="cart-empty">
                    <FiShoppingBag className="empty-icon" />
                    <h2>{t('cart.empty')}</h2>
                    <p>{t('cart.goShopping')}</p>
                    <Link to={`${prefix}/`} className="btn btn-primary">
                        {t('cart.goShopping')}
                        <FiArrowRight />
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="cart-page">
            <div className="cart-header">
                <h1 className="section-title">{t('cart.title')}</h1>
                <button className="clear-cart-btn" onClick={handleClearCart}>
                    <FiTrash2 />
                    {t('cart.clear')}
                </button>
            </div>

            <div className="cart-container">
                {/* 购物车列表 */}
                <div className="cart-items">
                    {items.map((item) => (
                        <div key={item.cartItemId} className="cart-item">
                            <Link to={`/products/${item.id}`} className="item-image">
                                <img src={item.image} alt={item.name} />
                            </Link>

                            <div className="item-info">
                                <Link to={`/products/${item.id}`} className="item-name">
                                    {item.name}
                                </Link>
                                {item.variantName && (
                                    <span className="item-variant">{t('checkout.variant')}: {item.variantName}</span>
                                )}
                                <p className="item-desc">{item.description}</p>
                                <div className="item-tags">
                                    {item.tags?.map((tag, index) => (
                                        <span key={index} className="item-tag">{tag}</span>
                                    ))}
                                </div>
                            </div>

                            <div className="item-price">
                                <span className="price-label">{t('products.price')}</span>
                                <span className="price-value">{formatPrice(item.price, currency)}</span>
                            </div>

                            <div className="item-quantity">
                                <span className="price-label">{t('products.quantity')}</span>
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

                            <div className="item-subtotal">
                                <span className="price-label">{t('checkout.subtotal')}</span>
                                <span className="subtotal-value">
                                    {formatPrice(item.price * item.quantity, currency)}
                                </span>
                            </div>

                            <button
                                className="remove-btn"
                                onClick={() => handleRemove(item)}
                                title={t('cart.remove')}
                            >
                                <FiTrash2 />
                            </button>
                        </div>
                    ))}
                </div>

                {/* 结算栏 */}
                <div className="cart-summary">
                    <div className="summary-card">
                        <h3>{t('checkout.summary')}</h3>

                        <div className="summary-row">
                            <span>{t('checkout.itemCount')}</span>
                            <span>{itemCount} {t('checkout.itemUnit')}</span>
                        </div>

                        <div className="summary-row">
                            <span>{t('checkout.subtotal')}</span>
                            <span>{formatPrice(totalPrice, currency)}</span>
                        </div>

                        <div className="summary-row">
                            <span>{t('checkout.discount')}</span>
                            <span className="discount">-{formatPrice(0, currency)}</span>
                        </div>

                        <div className="summary-divider"></div>

                        <div className="summary-total">
                            <span>{t('checkout.totalDue')}</span>
                            <span className="total-price">{formatPrice(totalPrice, currency)}</span>
                        </div>

                        <button className="checkout-btn" onClick={handleCheckout}>
                            {t('cart.checkout')}
                            <FiArrowRight />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Cart

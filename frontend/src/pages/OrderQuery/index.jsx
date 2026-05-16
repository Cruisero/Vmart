import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { FiSearch, FiPackage, FiClock, FiCheckCircle, FiXCircle, FiAlertCircle } from 'react-icons/fi'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../store/authStore'
import './OrderQuery.css'

const statusMap = {
    pending: { label: '待支付', icon: <FiClock />, color: '#f59e0b' },
    paid: { label: '已支付', icon: <FiCheckCircle />, color: '#3b82f6' },
    completed: { label: '已完成', icon: <FiCheckCircle />, color: '#10b981' },
    cancelled: { label: '已取消', icon: <FiXCircle />, color: '#94a3b8' },
    refunding: { label: '退款中', icon: <FiAlertCircle />, color: '#f97316' },
    expired: { label: '已过期', icon: <FiAlertCircle />, color: '#ef4444' },
    refunded: { label: '已退款', icon: <FiAlertCircle />, color: '#7c3aed' }
}

function OrderQuery() {
    const navigate = useNavigate()
    const { isAuthenticated } = useAuthStore()
    const [query, setQuery] = useState('')
    const [loading, setLoading] = useState(false)
    const [orders, setOrders] = useState(null)

    const isEmail = (str) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str)

    const handleSubmit = async (e) => {
        e.preventDefault()

        const input = query.trim()
        if (!input) {
            toast.error('请输入订单号或邮箱')
            return
        }

        // 如果是订单号，直接跳转订单详情
        if (!isEmail(input)) {
            navigate(`/order/${input}`)
            return
        }

        // 如果是邮箱，查询该邮箱下的所有订单
        setLoading(true)
        setOrders(null)

        try {
            const res = await fetch(`/api/orders/query?email=${encodeURIComponent(input)}`)
            const data = await res.json()

            if (data.error) {
                toast.error(data.error)
                return
            }

            if (data.order) {
                navigate(`/order/${data.order.orderNo}`)
                return
            }

            if (data.orders) {
                setOrders(data.orders)
            }
        } catch (error) {
            toast.error('查询失败，请稍后重试')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="order-query-page">
            <div className="query-container">
                <div className="query-icon">
                    <FiPackage />
                </div>

                <h1>订单查询</h1>
                <p className="query-desc">
                    输入订单号或下单邮箱，查询订单状态和卡密信息
                </p>
                {!isAuthenticated && (
                    <p className="query-desc" style={{ color: '#ef4444', fontWeight: 600 }}>
                        未登录用户只显示最近三个订单
                    </p>
                )}

                <form className="query-form" onSubmit={handleSubmit}>
                    <div className="form-group">
                        <input
                            type="text"
                            className="input query-input"
                            placeholder="请输入订单号或邮箱地址"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                        />
                        {query.trim() && (
                            <span className="input-hint">
                                {isEmail(query.trim()) ? '📧 将按邮箱查询最近 3 个订单' : '📋 将按订单号查询'}
                            </span>
                        )}
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary btn-lg query-btn"
                        disabled={loading}
                    >
                        {loading ? (
                            <span className="loading-text">
                                <span className="spinner-small"></span>
                                查询中...
                            </span>
                        ) : (
                            <>
                                <FiSearch />
                                查询订单
                            </>
                        )}
                    </button>
                </form>

                {/* 订单列表结果 */}
                {orders && (
                    <div className="order-results">
                        <h3 className="results-title">
                            查询到 {orders.length} 个订单
                        </h3>
                        <div className="order-list">
                            {orders.map(order => {
                                const status = statusMap[order.status] || statusMap.pending
                                return (
                                    <Link
                                        key={order.id}
                                        to={`/order/${order.orderNo}`}
                                        className="order-list-item"
                                    >
                                        <div className="order-item-left">
                                            <div className="order-item-product">
                                                {order.product?.image && (
                                                    <img src={order.product.image} alt="" className="order-item-img" />
                                                )}
                                                <div>
                                                    <div className="order-item-name">{order.product?.name || '商品'}</div>
                                                    <div className="order-item-no">{order.orderNo}</div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="order-item-right">
                                            <div className="order-item-price">¥{order.totalAmount}</div>
                                            <div className="order-item-status" style={{ color: status.color }}>
                                                {status.icon}
                                                <span>{status.label}</span>
                                            </div>
                                        </div>
                                    </Link>
                                )
                            })}
                        </div>
                    </div>
                )}

                {!orders && (
                    <div className="query-tips">
                        <h3>📌 温馨提示</h3>
                        <ul>
                            <li>订单号可在支付成功页面或邮件中找到</li>
                            <li>通过邮箱最多查询最近 3 个订单</li>
                            <li>卡密信息将在支付成功后自动发放</li>
                            <li>如有问题请通过工单联系客服</li>
                        </ul>
                    </div>
                )}
            </div>
        </div>
    )
}

export default OrderQuery

import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { FiArrowLeft, FiSend, FiPackage, FiChevronDown, FiCheck, FiAlertTriangle } from 'react-icons/fi'
import { useAuthStore } from '../../store/authStore'
import toast from 'react-hot-toast'
import './TicketNew.css'

const ticketTypes = [
    { value: 'ORDER_ISSUE', label: '订单问题', desc: '订单状态、支付问题等' },
    { value: 'CARD_ISSUE', label: '卡密问题', desc: '卡密无效、已使用等' },
    { value: 'REFUND', label: '退款申请', desc: '申请订单退款' },
    { value: 'OTHER', label: '其他', desc: '其他问题咨询' }
]

function TicketNew() {
    const navigate = useNavigate()
    const { isAuthenticated, token } = useAuthStore()

    const [type, setType] = useState('')
    const [subject, setSubject] = useState('')
    const [content, setContent] = useState('')
    const [orderId, setOrderId] = useState('')
    const [orders, setOrders] = useState([])
    const [loading, setLoading] = useState(false)
    const [dropdownOpen, setDropdownOpen] = useState(false)
    const [openTickets, setOpenTickets] = useState([])
    const dropdownRef = useRef(null)

    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/login?redirect=/user/tickets')
            return
        }
        fetchOrders()
        fetchOpenTickets()
    }, [isAuthenticated])

    // 点击外部关闭下拉
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setDropdownOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const fetchOpenTickets = async () => {
        try {
            const res = await fetch('/api/tickets?status=OPEN', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            const data = await res.json()
            // 合并未关闭且仍在处理链路中的状态
            const res2 = await fetch('/api/tickets?status=IN_PROGRESS', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            const data2 = await res2.json()
            const all = [...(data.tickets || []), ...(data2.tickets || [])]
            setOpenTickets(all)
        } catch {
            // 静默失败，不影响主流程
        }
    }

    const fetchOrders = async () => {
        try {
            const res = await fetch('/api/tickets/orders', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            const data = await res.json()
            setOrders(data.orders || [])
        } catch (error) {
            console.error('获取订单失败:', error)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (!type) {
            toast.error('请选择问题类型')
            return
        }
        if (!subject.trim()) {
            toast.error('请输入工单标题')
            return
        }
        if (!content.trim()) {
            toast.error('请描述您的问题')
            return
        }

        setLoading(true)
        try {
            const res = await fetch('/api/tickets', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    type,
                    subject: subject.trim(),
                    content: content.trim(),
                    orderId: orderId || null
                })
            })

            const data = await res.json()

            if (res.ok) {
                toast.success('工单提交成功')
                navigate(`/tickets/${data.ticket.id}`)
            } else if (res.status === 409 && data.existingTicket) {
                toast.error(data.error)
                navigate(`/tickets/${data.existingTicket.id}`)
            } else {
                toast.error(data.error || '提交失败')
            }
        } catch (error) {
            console.error('提交工单失败:', error)
            toast.error('提交失败，请稍后重试')
        } finally {
            setLoading(false)
        }
    }

    const handleSelectOrder = (id) => {
        setOrderId(id)
        setDropdownOpen(false)
    }

    const getSelectedOrderText = () => {
        if (!orderId) return '不关联订单'
        const order = orders.find(o => o.id === orderId)
        if (!order) return '不关联订单'
        return `${order.productName} · ¥${parseFloat(order.totalAmount).toFixed(2)}`
    }

    // 只显示最新5个订单
    const displayOrders = orders.slice(0, 5)

    return (
        <div className="ticket-new-page">
            <button className="back-btn" onClick={() => navigate('/user/tickets')}>
                <FiArrowLeft />
                返回工单列表
            </button>

            <div className="ticket-new-container">
                <div className="ticket-new-header">
                    <h1>提交新工单</h1>
                    <p>请详细描述您的问题，我们会尽快回复</p>
                </div>

                {openTickets.length > 0 && (
                    <div className="open-tickets-warning">
                        <div className="warning-title">
                            <FiAlertTriangle />
                            您有 {openTickets.length} 个未关闭的工单，请先确认是否已提交过相关问题：
                        </div>
                        <ul className="warning-ticket-list">
                            {openTickets.map(t => (
                                <li key={t.id}>
                                    <Link to={`/tickets/${t.id}`} className="warning-ticket-link">
                                        <span className="warning-ticket-no">{t.ticketNo}</span>
                                        <span className="warning-ticket-subject">{t.subject}</span>
                                        <span className={`warning-ticket-status ${t.status === 'OPEN' ? 'open' : 'in-progress'}`}>
                                            {t.status === 'OPEN' ? '待处理' : '处理中'}
                                        </span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="ticket-form">
                    {/* 问题类型 */}
                    <div className="form-group">
                        <label>问题类型 *</label>
                        <div className="type-options">
                            {ticketTypes.map(t => (
                                <label
                                    key={t.value}
                                    className={`type-option ${type === t.value ? 'active' : ''}`}
                                >
                                    <input
                                        type="radio"
                                        name="type"
                                        value={t.value}
                                        checked={type === t.value}
                                        onChange={(e) => setType(e.target.value)}
                                    />
                                    <span className="type-label">{t.label}</span>
                                    <span className="type-desc">{t.desc}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* 关联订单 - 自定义下拉 */}
                    {orders.length > 0 && (
                        <div className="form-group">
                            <label>
                                <FiPackage />
                                关联订单（可选）
                            </label>
                            <div className="custom-dropdown" ref={dropdownRef}>
                                <button
                                    type="button"
                                    className={`dropdown-trigger ${dropdownOpen ? 'open' : ''}`}
                                    onClick={() => setDropdownOpen(!dropdownOpen)}
                                >
                                    <span className="dropdown-value">{getSelectedOrderText()}</span>
                                    <FiChevronDown className="dropdown-arrow" />
                                </button>
                                {dropdownOpen && (
                                    <div className="dropdown-menu">
                                        <div
                                            className={`dropdown-item ${orderId === '' ? 'selected' : ''}`}
                                            onClick={() => handleSelectOrder('')}
                                        >
                                            <span className="item-text">不关联订单</span>
                                            {orderId === '' && <FiCheck className="item-check" />}
                                        </div>
                                        <div className="dropdown-divider" />
                                        {displayOrders.map(order => (
                                            <div
                                                key={order.id}
                                                className={`dropdown-item ${orderId === order.id ? 'selected' : ''}`}
                                                onClick={() => handleSelectOrder(order.id)}
                                            >
                                                <div className="item-content">
                                                    <span className="item-product">{order.productName}</span>
                                                    <div className="item-meta">
                                                        <span className="item-order-no">{order.orderNo}</span>
                                                        <span className="item-amount">¥{parseFloat(order.totalAmount).toFixed(2)}</span>
                                                    </div>
                                                </div>
                                                {orderId === order.id && <FiCheck className="item-check" />}
                                            </div>
                                        ))}
                                        {orders.length > 5 && (
                                            <div className="dropdown-hint">仅显示最近 5 个订单,如没有显示订单号,请在问题描述中填写</div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* 标题 */}
                    <div className="form-group">
                        <label>工单标题 *</label>
                        <input
                            type="text"
                            className="input"
                            placeholder="简要描述您的问题"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            maxLength={100}
                        />
                    </div>

                    {/* 问题描述 */}
                    <div className="form-group">
                        <label>问题描述 *</label>
                        <textarea
                            className="input textarea"
                            placeholder="请详细描述您遇到的问题，包括相关的订单号、卡密信息等..."
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            rows={6}
                            maxLength={2000}
                        />
                        <div className="char-count">{content.length}/2000</div>
                    </div>

                    {/* 提交按钮 */}
                    <div className="form-actions">
                        <button
                            type="submit"
                            className="btn btn-primary btn-lg"
                            disabled={loading}
                        >
                            <FiSend />
                            {loading ? '提交中...' : '提交工单'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default TicketNew

import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FiPlus, FiMessageCircle, FiClock, FiCheck, FiAlertCircle, FiCheckCircle } from 'react-icons/fi'
import { useAuthStore } from '../../store/authStore'
import './Tickets.css'

const statusMap = {
    OPEN: { label: '待处理', class: 'open', icon: <FiAlertCircle /> },
    IN_PROGRESS: { label: '处理中', class: 'in-progress', icon: <FiClock /> },
    COMPLETED: { label: '已完成', class: 'completed', icon: <FiCheckCircle /> },
    CLOSED: { label: '已关闭', class: 'closed', icon: <FiCheck /> }
}

const typeMap = {
    ORDER_ISSUE: '订单问题',
    CARD_ISSUE: '卡密问题',
    REFUND: '退款申请',
    OTHER: '其他'
}

function Tickets() {
    const navigate = useNavigate()
    const { isAuthenticated, token } = useAuthStore()
    const [tickets, setTickets] = useState([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState('all')

    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/login?redirect=/tickets')
            return
        }
        fetchTickets()

        const handleFocus = () => fetchTickets()
        const intervalId = window.setInterval(fetchTickets, 30000)
        window.addEventListener('focus', handleFocus)

        return () => {
            window.clearInterval(intervalId)
            window.removeEventListener('focus', handleFocus)
        }
    }, [isAuthenticated, filter, token])

    const fetchTickets = async () => {
        try {
            const url = filter === 'all'
                ? '/api/tickets'
                : `/api/tickets?status=${filter}`

            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            const data = await res.json()
            setTickets(data.tickets || [])
        } catch (error) {
            console.error('获取工单失败:', error)
        } finally {
            setLoading(false)
        }
    }

    const formatTime = (dateStr) => {
        const date = new Date(dateStr)
        const now = new Date()
        const diff = now - date

        if (diff < 60000) return '刚刚'
        if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`
        if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`
        if (diff < 604800000) return `${Math.floor(diff / 86400000)} 天前`

        return date.toLocaleDateString('zh-CN')
    }

    const unreadCount = tickets.reduce((sum, ticket) => sum + (ticket.userUnreadCount || 0), 0)

    if (loading) {
        return (
            <div className="tickets-page">
                <div className="loading-state">加载中...</div>
            </div>
        )
    }

    return (
        <div className="tickets-page">
            <div className="tickets-header">
                <div className="header-left">
                    <h1>我的工单</h1>
                    <p>{unreadCount > 0 ? `当前有 ${unreadCount} 条新消息待查看` : '查看和管理您的客服工单'}</p>
                </div>
                <Link to="/tickets/new" className="btn btn-primary">
                    <FiPlus />
                    提交新工单
                </Link>
            </div>

            {/* 筛选 */}
            <div className="tickets-filters">
                <button
                    className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
                    onClick={() => setFilter('all')}
                >
                    全部
                </button>
                <button
                    className={`filter-btn ${filter === 'OPEN' ? 'active' : ''}`}
                    onClick={() => setFilter('OPEN')}
                >
                    待处理
                </button>
                <button
                    className={`filter-btn ${filter === 'IN_PROGRESS' ? 'active' : ''}`}
                    onClick={() => setFilter('IN_PROGRESS')}
                >
                    处理中
                </button>
                <button
                    className={`filter-btn ${filter === 'COMPLETED' ? 'active' : ''}`}
                    onClick={() => setFilter('COMPLETED')}
                >
                    已完成
                </button>
                <button
                    className={`filter-btn ${filter === 'CLOSED' ? 'active' : ''}`}
                    onClick={() => setFilter('CLOSED')}
                >
                    已关闭
                </button>
            </div>

            {/* 工单列表 */}
            {tickets.length === 0 ? (
                <div className="tickets-empty">
                    <FiMessageCircle className="empty-icon" />
                    <h3>暂无工单</h3>
                    <p>如有问题，欢迎提交工单咨询</p>
                    <Link to="/tickets/new" className="btn btn-primary">
                        提交新工单
                    </Link>
                </div>
            ) : (
                <div className="tickets-list">
                    {tickets.map(ticket => (
                        <Link
                            to={`/tickets/${ticket.id}`}
                            key={ticket.id}
                            className="ticket-card"
                        >
                            <div className="ticket-header">
                                <span className="ticket-no">{ticket.ticketNo}</span>
                                <div className="ticket-badges">
                                    {ticket.userUnreadCount > 0 && (
                                        <span className="ticket-unread-badge">
                                            {ticket.userUnreadCount > 99 ? '99+' : ticket.userUnreadCount} 条新消息
                                        </span>
                                    )}
                                    <span className={`ticket-status ${statusMap[ticket.status]?.class}`}>
                                        {statusMap[ticket.status]?.icon}
                                        {statusMap[ticket.status]?.label}
                                    </span>
                                </div>
                            </div>
                            <h3 className="ticket-subject">{ticket.subject}</h3>
                            <div className="ticket-meta">
                                <span className="ticket-type">{typeMap[ticket.type]}</span>
                                {ticket.orderNo && (
                                    <span className="ticket-order">关联订单: {ticket.orderNo}</span>
                                )}
                            </div>
                            <div className="ticket-footer">
                                <span className="ticket-time">
                                    <FiClock />
                                    {formatTime(ticket.updatedAt)}
                                </span>
                                <span className="ticket-messages">
                                    <FiMessageCircle />
                                    {ticket.userUnreadCount > 0
                                        ? `${ticket._count?.messages || 0} 条消息 / ${ticket.userUnreadCount} 条未读`
                                        : `${ticket._count?.messages || 0} 条消息`}
                                </span>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    )
}

export default Tickets

const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../frontend/src/pages/Admin/Dashboard/index.jsx');
let content = fs.readFileSync(file, 'utf8');

const startTag = 'function TicketsManage() {';
const startIdx = content.indexOf(startTag);
if (startIdx === -1) {
    console.error('TicketsManage start not found');
    process.exit(1);
}

const endTag = 'function CardsManage() {';
const endIdx = content.indexOf(endTag, startIdx);
if (endIdx === -1) {
    console.error('CardsManage start not found');
    process.exit(1);
}

console.log('Replacing TicketsManage from', startIdx, 'to', endIdx);

const prefix = content.slice(0, startIdx);
const suffix = content.slice(endIdx);

const translatedTickets = `function TicketsManage() {
    const L = useAdminL()
    const { showToast } = useToast()
    const { token } = useAuthStore()
    const location = useLocation()
    const [tickets, setTickets] = useState([])
    const [globalStats, setGlobalStats] = useState({ total: 0, open: 0, inProgress: 0, pendingSuperAdmin: 0, completed: 0, closed: 0, unread: 0, noReply: 0 })
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [totalCount, setTotalCount] = useState(0)
    const [loading, setLoading] = useState(true)
    const [statusFilter, setStatusFilter] = useState('all')
    const [unreadFilter, setUnreadFilter] = useState(false)
    const [noReplyFilter, setNoReplyFilter] = useState(false)
    const [selectedTicket, setSelectedTicket] = useState(null)
    const [showHistoryModal, setShowHistoryModal] = useState(false)
    const [historyTickets, setHistoryTickets] = useState([])
    const [historyLoading, setHistoryLoading] = useState(false)
    const [replyContent, setReplyContent] = useState('')
    const [replyImages, setReplyImages] = useState([])
    const [uploadingImg, setUploadingImg] = useState(false)
    const [replying, setReplying] = useState(false)

    const statusMap = {
        OPEN: { label: L('等待处理', 'Pending'), class: 'pending', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' },
        IN_PROGRESS: { label: L('处理中', 'In Progress'), class: 'processing', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)' },
        PENDING_SUPER_ADMIN: { label: L('升级到超管', 'Escalated'), class: 'super-admin', color: '#7c3aed', bg: 'rgba(124, 58, 237, 0.1)' },
        CLOSED: { label: L('已关闭', 'Closed'), class: 'completed', color: '#64748b', bg: 'rgba(100, 116, 139, 0.1)' }
    }

    const typeMap = {
        ORDER_ISSUE: { label: L('订单问题', 'Order Issue'), color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' },
        CARD_ISSUE: { label: L('卡密问题', 'Card Key Issue'), color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.1)' },
        REFUND: { label: L('退款申请', 'Refund Request'), color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' },
        OTHER: { label: L('其他', 'Other'), color: '#64748b', bg: 'rgba(100, 116, 139, 0.1)' }
    }

    useEffect(() => {
        fetchTickets()
        const handleFocus = () => fetchTickets()
        const intervalId = window.setInterval(fetchTickets, 30000)
        window.addEventListener('focus', handleFocus)

        return () => {
            window.clearInterval(intervalId)
            window.removeEventListener('focus', handleFocus)
        }
    }, [statusFilter, noReplyFilter, unreadFilter, page, token])

    const fetchTickets = async () => {
        try {
            const headers = { 'Authorization': \`Bearer \${token}\` }
            let listUrl
            if (noReplyFilter) {
                listUrl = \`/api/tickets/admin/all?noReply=true&limit=40&page=\${page}\`
            } else if (statusFilter === 'all') {
                listUrl = \`/api/tickets/admin/all?limit=40&page=\${page}\`
            } else {
                listUrl = \`/api/tickets/admin/all?status=\${statusFilter}&limit=40&page=\${page}\`
            }

            // 列表（分页）和全量统计并行请求
            const [listRes, statsRes] = await Promise.all([
                fetch(listUrl, { headers }),
                fetch('/api/tickets/admin/all?limit=9999', { headers })
            ])
            const [listData, statsData] = await Promise.all([listRes.json(), statsRes.json()])

            setTickets(listData.tickets || [])
            setTotalPages(listData.pagination?.pages || 1)
            setTotalCount(listData.pagination?.total || 0)

            const allTickets = statsData.tickets || []
            setGlobalStats({
                total: allTickets.length,
                open: allTickets.filter(t => t.status === 'OPEN').length,
                inProgress: allTickets.filter(t => t.status === 'IN_PROGRESS').length,
                pendingSuperAdmin: allTickets.filter(t => t.status === 'PENDING_SUPER_ADMIN').length,
                closed: allTickets.filter(t => t.status === 'CLOSED').length,
                unread: allTickets.reduce((sum, t) => sum + (t.adminUnreadCount || 0), 0),
                noReply: allTickets.filter(t => t.status !== 'CLOSED' && t.messages?.[0]?.isAdmin === false).length
            })
        } catch (error) {
            showToast(L('加载工单列表失败', 'Failed to load tickets'), 'error')
        } finally {
            setLoading(false)
        }
    }

    const handleViewTicket = async (ticket) => {
        try {
            const res = await fetch(\`/api/tickets/admin/\${ticket.id}\`, {
                headers: { 'Authorization': \`Bearer \${token}\` }
            })
            const data = await res.json()
            setSelectedTicket(data.ticket)
            setReplyContent('')
        } catch (error) {
            showToast(L('加载工单详情失败', 'Failed to load ticket details'), 'error')
        }
    }

    const handleReply = async () => {
        if (!replyContent.trim()) {
            showToast(L('请输入回复内容', 'Please enter reply content'), 'warning')
            return
        }

        setReplying(true)
        try {
            const res = await fetch(\`/api/tickets/admin/\${selectedTicket.id}/reply\`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': \`Bearer \${token}\`
                },
                body: JSON.stringify({ content: replyContent.trim(), images: replyImages.length ? replyImages : null })
            })

            if (res.ok) {
                showToast(L('回复已发送，已通过邮件通知用户', 'Reply sent, user notified by email'), 'success')
                setReplyContent('')
                setReplyImages([])
                handleViewTicket(selectedTicket)
                fetchTickets()
            } else {
                const data = await res.json()
                showToast(data.error || L('回复失败', 'Reply failed'), 'error')
            }
        } catch (error) {
            showToast(L('回复失败', 'Reply failed'), 'error')
        } finally {
            setReplying(false)
        }
    }

    const handleTicketImgUpload = async (e) => {
        const file = e.target.files?.[0]
        if (!file) return
        setUploadingImg(true)
        try {
            const fd = new FormData()
            fd.append('images', file)
            const r = await fetch('/api/upload', { method: 'POST', headers: { Authorization: \`Bearer \${token}\` }, body: fd })
            const d = await r.json()
            if (d.success && d.images?.[0]?.urls?.original) {
                setReplyImages(imgs => [...imgs, d.images[0].urls.original])
                showToast(L('图片已上传', 'Image uploaded'), 'success')
            } else {
                showToast(L('上传失败', 'UploadFailed'), 'error')
            }
        } catch { showToast(L('上传失败', 'UploadFailed'), 'error') }
        finally { setUploadingImg(false); e.target.value = '' }
    }

    const fetchHistoryTickets = async () => {
        if (!selectedTicket) return
        const userId = selectedTicket.user?.id
        const customerId = selectedTicket.customer?.id
        const params = new URLSearchParams()
        if (userId) params.set('userId', userId)
        if (customerId) params.set('customerId', customerId)
        if (!userId && !customerId) {
            const email = selectedTicket.user?.email || selectedTicket.customer?.email
            if (email) params.set('email', email)
        }
        setHistoryLoading(true)
        try {
            const res = await fetch(\`/api/tickets/admin/user-history?\${params.toString()}\`, {
                headers: { 'Authorization': \`Bearer \${token}\` }
            })
            const data = await res.json()
            setHistoryTickets(data.tickets || [])
        } catch {
            setHistoryTickets([])
        } finally {
            setHistoryLoading(false)
        }
    }

    useEffect(() => {
        if (showHistoryModal) fetchHistoryTickets()
    }, [showHistoryModal])

    const handleUpdateStatus = async (status) => {        try {
            const res = await fetch(\`/api/tickets/admin/\${selectedTicket.id}/status\`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': \`Bearer \${token}\`
                },
                body: JSON.stringify({ status })
            })

            if (res.ok) {
                showToast(L('状态更新成功', 'Status updated'), 'success')
                handleViewTicket({ id: selectedTicket.id })
                fetchTickets()
            }
        } catch (error) {
            showToast(L('状态更新失败', 'Status update failed'), 'error')
        }
    }

    const handleSubmitToSuperAdmin = async () => {
        if (!selectedTicket || selectedTicket.status === 'PENDING_SUPER_ADMIN') return

        await handleUpdateStatus('PENDING_SUPER_ADMIN')
    }

    const handleOpenUserOrders = () => {
        // 兼容 user 和 customer
        const userId = selectedTicket?.user?.id || selectedTicket?.customer?.id
        const email = selectedTicket?.user?.email || selectedTicket?.customer?.email
        if (!userId && !email) {
            showToast(L('未找到用户信息', 'User info not found'), 'warning')
            return
        }
        // CUSTOMER 用 email 查（admin 订单管理也支持按 email 过滤）
        const param = selectedTicket?.user?.id
            ? \`userId=\${encodeURIComponent(selectedTicket.user.id)}\`
            : \`email=\${encodeURIComponent(email)}\`
        const ordersPath = location.pathname.includes('/v/')
            ? location.pathname.replace(/\\/admin.*$/, '/admin/orders')
            : '/admin/orders'
        window.open(\`\${ordersPath}?\${param}\`, '_blank', 'noopener,noreferrer')
    }

    const handleOpenRelatedOrder = () => {
        const orderNo = selectedTicket?.orderNo
        if (!orderNo) {
            showToast(L('未找到关联订单', 'Associated order not found'), 'warning')
            return
        }
        window.open(\`\${storefrontPrefix}/order/\${encodeURIComponent(orderNo)}\`, '_blank', 'noopener,noreferrer')
    }

    const formatTime = (dateStr) => {
        const date = new Date(dateStr)
        return date.toLocaleString('zh-CN', {
            month: 'numeric',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    const displayTickets = unreadFilter
        ? tickets.filter(t => t.adminUnreadCount > 0)
        : tickets

    const handleStatusFilterChange = (value) => {
        setStatusFilter(value)
        setUnreadFilter(false)
        setNoReplyFilter(false)
        setPage(1)
    }

    return (
        <div className="admin-section">
            {/* 统计卡片 */}
            <div className="ticket-stats">
                <div className={\`ticket-stat-card \${!unreadFilter && statusFilter === 'all' ? 'active' : ''}\`} onClick={() => handleStatusFilterChange('all')}>
                    <div className="stat-icon total"><FiMessageCircle /></div>
                    <div className="stat-info">
                        <span className="stat-value">{globalStats.total}</span>
                        <span className="stat-label">{L('admin.tickets.stats.total')}</span>
                    </div>
                </div>
                <div className={\`ticket-stat-card \${!unreadFilter && statusFilter === 'OPEN' ? 'active' : ''}\`} onClick={() => handleStatusFilterChange('OPEN')}>
                    <div className="stat-icon pending"><FiAlertCircle /></div>
                    <div className="stat-info">
                        <span className="stat-value">{globalStats.open}</span>
                        <span className="stat-label">{L('admin.tickets.stats.pending')}</span>
                    </div>
                </div>
                <div className={\`ticket-stat-card \${!unreadFilter && statusFilter === 'IN_PROGRESS' ? 'active' : ''}\`} onClick={() => handleStatusFilterChange('IN_PROGRESS')}>
                    <div className="stat-icon processing"><FiActivity /></div>
                    <div className="stat-info">
                        <span className="stat-value">{globalStats.inProgress}</span>
                        <span className="stat-label">{L('admin.tickets.stats.inProgress')}</span>
                    </div>
                </div>
                <div className={\`ticket-stat-card \${!unreadFilter && statusFilter === 'PENDING_SUPER_ADMIN' ? 'active' : ''}\`} onClick={() => handleStatusFilterChange('PENDING_SUPER_ADMIN')}>
                    <div className="stat-icon super-admin"><FiShield /></div>
                    <div className="stat-info">
                        <span className="stat-value">{globalStats.pendingSuperAdmin}</span>
                        <span className="stat-label">{L('admin.tickets.stats.pendingSuperAdmin')}</span>
                    </div>
                </div>
                <div className={\`ticket-stat-card \${!unreadFilter && statusFilter === 'CLOSED' ? 'active' : ''}\`} onClick={() => handleStatusFilterChange('CLOSED')}>
                    <div className="stat-icon" style={{ background: 'rgba(100,116,139,0.1)', color: '#64748b' }}><FiCheck /></div>
                    <div className="stat-info">
                        <span className="stat-value">{globalStats.closed}</span>
                        <span className="stat-label">{L('admin.tickets.stats.closed')}</span>
                    </div>
                </div>
                <div className={\`ticket-stat-card unread-card \${globalStats.unread > 0 ? 'has-unread' : ''} \${unreadFilter ? 'active' : ''}\`}
                    onClick={() => { setUnreadFilter(f => !f); setNoReplyFilter(false); setStatusFilter('all'); setPage(1) }}>
                    <div className="stat-icon unread"><FiMessageCircle /></div>
                    <div className="stat-info">
                        <span className="stat-value">
                            {globalStats.unread > 99 ? '99+' : globalStats.unread}
                        </span>
                        <span className="stat-label">{L('admin.tickets.stats.userUnread')}</span>
                    </div>
                </div>
                <div className={\`ticket-stat-card no-reply-card \${globalStats.noReply > 0 ? 'has-no-reply' : ''} \${noReplyFilter ? 'active' : ''}\`}
                    onClick={() => { setNoReplyFilter(f => !f); setUnreadFilter(false); setStatusFilter('all'); setPage(1) }}>
                    <div className="stat-icon no-reply"><FiClock /></div>
                    <div className="stat-info">
                        <span className="stat-value">
                            {globalStats.noReply > 99 ? '99+' : globalStats.noReply}
                        </span>
                        <span className="stat-label">{L('admin.tickets.stats.pendingReply')}</span>
                    </div>
                </div>
            </div>

            <div className="section-header">
                <h2>{L('admin.tickets.list')}</h2>
                <div className="header-info">
                    {globalStats.unread > 0 && (
                        <span className="ticket-unread-summary">
                            {L(\`\${globalStats.unread > 99 ? '99+' : globalStats.unread} 条新用户消息待处理\`, \`\${globalStats.unread > 99 ? '99+' : globalStats.unread} new user message(s) pending\`)}
                        </span>
                    )}
                    <span className="total-count">{L(\`共 \${totalCount} 个工单\`, \`Total \${totalCount} ticket(s)\`)}</span>
                    <select
                        className="filter-select"
                        value={statusFilter}
                        onChange={(e) => handleStatusFilterChange(e.target.value)}
                    >
                        <option value="all">{L('admin.orders.allStatus')}</option>
                        <option value="OPEN">{L('admin.tickets.stats.pending')}</option>
                        <option value="IN_PROGRESS">{L('admin.tickets.stats.inProgress')}</option>
                        <option value="PENDING_SUPER_ADMIN">{L('admin.tickets.stats.pendingSuperAdmin')}</option>
                        <option value="COMPLETED">{L('已完成', 'Completed')}</option>
                        <option value="CLOSED">{L('admin.tickets.stats.closed')}</option>
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="loading-state">
                    <div className="loading-spinner"></div>
                    <span>{L('加载中...', 'Loading...')}</span>
                </div>
            ) : displayTickets.length === 0 ? (
                <div className="empty-state">
                    <FiMessageCircle className="empty-icon" />
                    <h3>{L('无工单', 'No tickets')}</h3>
                    <p>{unreadFilter ? L('无未读工单', 'No unread tickets') : noReplyFilter ? L('无待回复工单', 'No tickets pending reply') : L(\`无 \${statusFilter !== 'all' ? statusMap[statusFilter]?.label : ''}工单\`, \`No \${statusFilter !== 'all' ? statusMap[statusFilter]?.label : ''} tickets\`)}</p>
                </div>
            ) : (
                <div className="ticket-list">
                    {displayTickets.map(ticket => (
                        <div key={ticket.id} className="ticket-card" onClick={() => handleViewTicket(ticket)}>
                            <div className="ticket-header">
                                <span className="ticket-no">{ticket.ticketNo}</span>
                                <div className="ticket-header-right">
                                    {ticket.adminUnreadCount > 0 && (
                                        <span className="ticket-unread-pill">
                                            {L(\`\${ticket.adminUnreadCount > 99 ? '99+' : ticket.adminUnreadCount} 条新消息\`, \`\${ticket.adminUnreadCount > 99 ? '99+' : ticket.adminUnreadCount} new message(s)\`)}
                                        </span>
                                    )}
                                    <span
                                        className="ticket-type"
                                        style={{
                                            color: typeMap[ticket.type]?.color,
                                            background: typeMap[ticket.type]?.bg
                                        }}
                                    >
                                        {typeMap[ticket.type]?.label}
                                    </span>
                                </div>
                            </div>
                            <div className="ticket-subject">{ticket.subject}</div>
                            <div className="ticket-meta">
                                <span className="ticket-user">
                                    <FiUsers style={{ marginRight: '4px' }} />
                                    {ticket.user?.email || ticket.customer?.email || '-'}
                                </span>
                                <span className="ticket-time">{formatTime(ticket.createdAt)}</span>
                            </div>
                            <div className="ticket-footer">
                                <span
                                    className="ticket-status"
                                    style={{
                                        color: statusMap[ticket.status]?.color,
                                        background: statusMap[ticket.status]?.bg
                                    }}
                                >
                                    {statusMap[ticket.status]?.label}
                                </span>
                                <button className="action-btn view">{L('查看详情', 'View Details')}</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* 分页 */}
            {!loading && totalPages > 1 && (
                <div className="ticket-pagination">
                    <button
                        className="page-btn"
                        onClick={() => setPage(1)}
                        disabled={page === 1}
                    >«</button>
                    <button
                        className="page-btn"
                        onClick={() => setPage(p => p - 1)}
                        disabled={page === 1}
                    >‹ {L('上一页', 'Prev')}</button>
                    <span className="page-info">{L(\`页码 \${page} / \${totalPages}\`, \`Page \${page} / \${totalPages}\`)} </span>
                    <button
                        className="page-btn"
                        onClick={() => setPage(p => p + 1)}
                        disabled={page === totalPages}
                    >{L('下一页', 'Next')} ›</button>
                    <button
                        className="page-btn"
                        onClick={() => setPage(totalPages)}
                        disabled={page === totalPages}
                    >»</button>
                </div>
            )}

            {/* Ticket Details弹窗 */}
            {selectedTicket && (
                <div className="ship-modal-overlay" onClick={() => setSelectedTicket(null)}>
                    <div className="ship-modal ticket-detail-modal" onClick={e => e.stopPropagation()}>
                        <div className="ship-modal-header">
                            <div className="ship-modal-icon">
                                <FiMessageCircle />
                            </div>
                            <h3>{L('工单详情', 'Ticket Details')}</h3>
                            <p className="ship-modal-subtitle">{selectedTicket.ticketNo}</p>
                            <button className="ship-modal-close" onClick={() => setSelectedTicket(null)}>
                                <FiX />
                            </button>
                        </div>

                        <div className="ship-modal-body" style={{ maxHeight: '500px', overflow: 'auto' }}>
                            {/* tickets信息 */}
                            <div className="ticket-info-grid">
                                <div className="info-item">
                                    <label>{L('用户邮箱', 'User Email')}</label>
                                    {(selectedTicket.user?.email || selectedTicket.customer?.email) ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <button
                                                type="button"
                                                className="ticket-link-button"
                                                onClick={handleOpenUserOrders}
                                            >
                                                {selectedTicket.user?.email || selectedTicket.customer?.email}
                                            </button>
                                            <button
                                                type="button"
                                                className="ticket-link-button"
                                                style={{ fontSize: '0.78rem', padding: '4px 10px' }}
                                                onClick={() => setShowHistoryModal(true)}
                                                title={L('查看历史工单', 'View ticket history')}
                                            >
                                                📋 {L('历史工单', 'History')}
                                            </button>
                                        </div>
                                    ) : (
                                        <span>-</span>
                                    )}
                                </div>
                                <div className="info-item">
                                    <label>{L('问题类型', 'Issue Type')}</label>
                                    <span
                                        className="type-tag"
                                        style={{
                                            color: typeMap[selectedTicket.type]?.color,
                                            background: typeMap[selectedTicket.type]?.bg
                                        }}
                                    >
                                        {typeMap[selectedTicket.type]?.label}
                                    </span>
                                </div>
                                <div className="info-item full-width">
                                    <label>{L('工单主题', 'Ticket Subject')}</label>
                                    <span>{selectedTicket.subject}</span>
                                </div>
                                {selectedTicket.orderNo && (
                                    <div className="info-item">
                                        <label>{L('关联订单', 'Related Order')}</label>
                                        <button
                                            type="button"
                                            className="ticket-link-button order-link"
                                            onClick={handleOpenRelatedOrder}
                                        >
                                            {selectedTicket.orderNo}
                                        </button>
                                    </div>
                                )}
                                <div className="info-item">
                                    <label>{L('当前状态', 'Current Status')}</label>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                                        <span
                                            className="type-tag"
                                            style={{
                                                color: statusMap[selectedTicket.status]?.color,
                                                background: statusMap[selectedTicket.status]?.bg,
                                                display: 'inline-block',
                                                padding: '6px 14px',
                                                borderRadius: 16,
                                                fontWeight: 600
                                            }}
                                        >
                                            {statusMap[selectedTicket.status]?.label || selectedTicket.status}
                                        </span>
                                        {selectedTicket.status !== 'CLOSED' && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (confirm(L('确定要关闭此工单吗？用户可在24小时内重新开启。', 'Close this ticket? User can reopen within 24 hours.'))) {
                                                        handleUpdateStatus('CLOSED')
                                                    }
                                                }}
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: 4,
                                                    padding: '5px 12px',
                                                    background: 'rgba(239, 68, 68, 0.08)',
                                                    color: '#ef4444',
                                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                                    borderRadius: 8,
                                                    fontSize: '0.78rem',
                                                    fontWeight: 600,
                                                    cursor: 'pointer',
                                                    fontFamily: 'inherit',
                                                    transition: 'all 0.15s'
                                                }}
                                                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)' }}
                                                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)' }}
                                            >
                                                <FiX size={12} />
                                                {L('关闭工单', 'Close Ticket')}
                                            </button>
                                        )}
                                    </div>
                                </div>
                                {selectedTicket.status !== 'CLOSED' && selectedTicket.status !== 'PENDING_SUPER_ADMIN' && (
                                    <div className="info-item">
                                        <label>{L('工单升级', 'Escalate')}</label>
                                        <button
                                            type="button"
                                            className="ticket-super-admin-button"
                                            onClick={handleSubmitToSuperAdmin}
                                        >
                                            <FiShield />
                                            {L('升级给超级管理员', 'Escalate to Super Admin')}
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* 消息列表 */}
                            <div className="ticket-messages">
                                <h4>{L('沟通记录', 'Conversation')}</h4>
                                <div className="messages-container">
                                    {selectedTicket.messages?.map(msg => (
                                        <div
                                            key={msg.id}
                                            className={\`message-item \${msg.isAdmin ? 'admin' : 'user'}\`}
                                        >
                                            <div className="message-header">
                                                <span className="message-sender">
                                                    {msg.isAdmin ? L('客服', 'Support') : L('用户', 'User')}
                                                </span>
                                                <span className="message-time">
                                                    {formatTime(msg.createdAt)}
                                                </span>
                                            </div>
                                            <p className="message-content">{msg.content}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* 回复框 */}
                            {selectedTicket.status !== 'CLOSED' && (
                                <div className="ticket-reply">
                                    <h4>{L('回复工单', 'Reply')}</h4>
                                    <textarea
                                        value={replyContent}
                                        onChange={(e) => setReplyContent(e.target.value)}
                                        placeholder={L('输入回复内容...', 'Type your reply...')}
                                        className="reply-textarea"
                                    />
                                    <div className="reply-actions">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                                            <label style={{ cursor: 'pointer', padding: '6px 12px', border: '1px solid var(--border-color)', borderRadius: 6, fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <FiImage size={14} />
                                                {uploadingImg ? L('上传中...', 'Uploading...') : L('添加图片', 'Add Image')}
                                                <input type="file" accept="image/*" onChange={handleTicketImgUpload} style={{ display: 'none' }} />
                                            </label>
                                            {replyImages.map((url, i) => (
                                                <div key={i} style={{ position: 'relative' }}>
                                                    <img src={url} alt="" style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 4 }} />
                                                    <button type="button" onClick={() => setReplyImages(imgs => imgs.filter((_, j) => j !== i))} style={{ position: 'absolute', top: -6, right: -6, width: 14, height: 14, borderRadius: '50%', background: '#ef4444', color: '#fff', border: 'none', fontSize: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                                                </div>
                                            ))}
                                        </div>
                                        <button
                                            className="btn btn-primary"
                                            onClick={handleReply}
                                            disabled={replying}
                                        >
                                            {replying ? L('发送中...', 'Sending...') : L('发送回复', 'Send Reply')}
                                        </button>
                                    </div>
                                </div>
                            )}
                            {selectedTicket.status === 'CLOSED' && (() => {
                                const closedAt = selectedTicket.closedAt ? new Date(selectedTicket.closedAt) : null
                                const canReopen = closedAt && (Date.now() - closedAt.getTime() < 24 * 60 * 60 * 1000)
                                const hoursLeft = closedAt ? Math.max(0, Math.ceil((closedAt.getTime() + 24 * 60 * 60 * 1000 - Date.now()) / 3600000)) : 0
                                return (
                                    <div style={{ marginTop: 16, padding: '14px 18px', background: 'var(--bg-secondary)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                            {canReopen ? L(\`工单已关闭（剩余 \${hoursLeft} 小时内可重新开启）\`, \`Ticket closed (\${hoursLeft}h, can reopen)\`) : L('工单已关闭超过 24 小时', 'Ticket closed for over 24 hours')}
                                        </span>
                                        {canReopen && (
                                            <button className="btn btn-secondary" onClick={() => handleUpdateStatus('OPEN')}>
                                                {L('重新开启', 'Reopen')}
                                            </button>
                                        )}
                                    </div>
                                )
                            })()}
                        </div>
                    </div>
                </div>
            )}

            {/* 历史tickets弹窗 */}
            {showHistoryModal && (
                <div className="ship-modal-overlay" onClick={() => setShowHistoryModal(false)}>
                    <div className="ship-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 800 }}>
                        <div className="ship-modal-header">
                            <div className="ship-modal-icon"><FiClock /></div>
                            <h3>{L('用户历史工单', 'User Ticket History')}</h3>
                            <button className="ship-modal-close" onClick={() => setShowHistoryModal(false)}><FiX /></button>
                        </div>
                        <div className="ship-modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                            {historyLoading ? (
                                <p style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>{L('加载中...', 'Loading...')}</p>
                            ) : historyTickets.length === 0 ? (
                                <p style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>{L('该用户暂无历史工单', 'No ticket history for this user')}</p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    {historyTickets.map(t => {
                                        const s = statusMap[t.status] || statusMap.OPEN
                                        const lastMsg = t.messages?.[0]
                                        const isCurrent = t.id === selectedTicket?.id
                                        return (
                                            <div
                                                key={t.id}
                                                onClick={() => {
                                                    if (isCurrent) return
                                                    handleViewTicket({ id: t.id })
                                                    setShowHistoryModal(false)
                                                }}
                                                style={{
                                                    padding: '14px 18px',
                                                    border: \`1px solid \${isCurrent ? 'var(--primary)' : 'var(--border-color)'}\`,
                                                    borderRadius: 10,
                                                    cursor: isCurrent ? 'default' : 'pointer',
                                                    background: isCurrent ? 'rgba(239, 68, 68, 0.04)' : 'var(--bg-card)',
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    gap: 12
                                                }}
                                            >
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                                        <span style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-primary)' }}>{t.subject}</span>
                                                        {isCurrent && <span style={{ fontSize: '0.7rem', padding: '2px 8px', background: 'var(--primary)', color: '#fff', borderRadius: 10 }}>{L('当前', 'Current')}</span>}
                                                    </div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                        {t.ticketNo} · {lastMsg?.content?.slice(0, 40) || L('无消息', 'No messages')}
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                                                    <span style={{ fontSize: '0.72rem', padding: '3px 10px', borderRadius: 12, background: s.bg, color: s.color, fontWeight: 600 }}>{s.label}</span>
                                                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{new Date(t.updatedAt).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
`;

const newContent = prefix + translatedTickets + suffix;
fs.writeFileSync(file, newContent, 'utf8');
console.log('Successfully translated TicketsManage!');

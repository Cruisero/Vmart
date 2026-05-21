const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../frontend/src/pages/Admin/Dashboard/index.jsx');
let content = fs.readFileSync(file, 'utf8');

const startTag = 'function OrdersManage() {';
const startIdx = content.indexOf(startTag);
if (startIdx === -1) {
    console.error('OrdersManage start not found');
    process.exit(1);
}

const endTag = 'function TicketsManage() {';
const endIdx = content.indexOf(endTag, startIdx);
if (endIdx === -1) {
    console.error('TicketsManage start not found');
    process.exit(1);
}

console.log('Replacing OrdersManage from', startIdx, 'to', endIdx);

const prefix = content.slice(0, startIdx);
const suffix = content.slice(endIdx);

const translatedOrders = `function OrdersManage() {
    const L = useAdminL()
    const location = useLocation()
    const basePath = location.pathname.replace(/\\/orders.*$/, '') || '/admin'
    // 商户店面下用 /v/:slug 前缀；Main Site直接用 /order/...
    const storefrontPrefix = basePath.startsWith('/v/')
        ? basePath.replace(/\\/admin$/, '')
        : ''
    const queryParams = new URLSearchParams(location.search)
    const userIdFilter = queryParams.get('userId')
    const urlStatusFilter = queryParams.get('status')
    const token = useAuthStore(state => state.token)
    const currentUser = useAuthStore(state => state.user)
    const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN'
    const { showToast, showConfirm } = useToast()
    const [orders, setOrders] = useState([])
    const [loading, setLoading] = useState(true)
    const [statusFilter, setStatusFilter] = useState(urlStatusFilter || 'all')
    const [shipping, setShipping] = useState(null) // 正在Ship的订单ID
    const [currentPage, setCurrentPage] = useState(1)
    const [totalOrders, setTotalOrders] = useState(0)
    const [totalPages, setTotalPages] = useState(1)
    const pageSize = 20
    const [searchInput, setSearchInput] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')
    const searchTimer = useRef(null)
    const [searching, setSearching] = useState(false)

    // Search防抖：输入后 500ms 才触发查询
    useEffect(() => {
        if (searchTimer.current) clearTimeout(searchTimer.current)
        if (searchInput !== debouncedSearch) {
            setSearching(true)
            searchTimer.current = setTimeout(() => {
                setDebouncedSearch(searchInput)
            }, 500)
        }
        return () => { if (searchTimer.current) clearTimeout(searchTimer.current) }
    }, [searchInput])

    // 卡密输入弹窗Status
    const [showCardInputModal, setShowCardInputModal] = useState(false)
    const [cardInputOrder, setCardInputOrder] = useState(null)
    const [cardInputContent, setCardInputContent] = useState('')
    const [isResendMode, setIsResendMode] = useState(false) // Resend模式

    useEffect(() => {
        setCurrentPage(1)
    }, [statusFilter, userIdFilter, debouncedSearch])

    useEffect(() => {
        fetchOrders()
    }, [statusFilter, currentPage, userIdFilter, debouncedSearch])

    const fetchOrders = async () => {
        // 初次加载显示loading，Search时不显示全页loading
        if (!orders.length) setLoading(true)
        try {
            const params = new URLSearchParams({ page: currentPage, pageSize })
            if (statusFilter !== 'all') params.append('status', statusFilter)
            if (userIdFilter) params.append('userId', userIdFilter)
            if (debouncedSearch.trim()) params.append('search', debouncedSearch.trim())
            const res = await fetch(\`/api/admin/orders?\${params}\`, {
                headers: { 'Authorization': \`Bearer \${token}\` }
            })
            const data = await res.json()
            setOrders(data.orders || [])
            setTotalOrders(data.total || 0)
            setTotalPages(Math.ceil((data.total || 0) / pageSize))
        } catch (error) {
            console.error('获取订单Failed:', error)
        } finally {
            setLoading(false)
            setSearching(false)
        }
    }

    // 执行Ship请求
    const doShip = async (orderId, cardContent = null) => {
        setShipping(orderId)
        try {
            const body = cardContent ? { cardContent } : {}
            const res = await fetch(\`/api/admin/orders/\${orderId}/ship\`, {
                method: 'POST',
                headers: {
                    'Authorization': \`Bearer \${token}\`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            })
            const data = await res.json()

            if (res.ok) {
                showToast(data.emailSent ? L('发货成功，邮件已发送', 'Shipped, email sent') : L('已发货，但邮件发送失败', 'Shipped, email failed'), data.emailSent ? 'success' : 'warning')
                setShowCardInputModal(false)
                setCardInputOrder(null)
                setCardInputContent('')
                fetchOrders()
            } else if (data.needCardContent) {
                // 需要输入卡密，显示弹窗
                const order = orders.find(o => o.id === orderId)
                setCardInputOrder(order)
                setShowCardInputModal(true)
            } else {
                showToast(data.error || L('发货失败', 'ShipFailed'), 'error')
            }
        } catch (error) {
            showToast(L('发货失败', 'ShipFailed'), 'error')
        } finally {
            setShipping(null)
        }
    }

    // 点击Ship按钮，直接弹出Ship弹窗
    const handleShip = (order) => {
        setCardInputOrder(order)
        setCardInputContent('')
        setIsResendMode(false)
        setShowCardInputModal(true)
    }

    // 提交Ship
    const handleSubmitShip = async () => {
        await doShip(cardInputOrder.id, cardInputContent || null)
    }

    // 点击Resend按钮
    const handleResend = (order) => {
        setCardInputOrder(order)
        setCardInputContent('')
        setIsResendMode(true)
        setShowCardInputModal(true)
    }

    // 提交Resend
    const handleSubmitResend = async () => {
        setShipping(cardInputOrder.id)
        try {
            const res = await fetch(\`/api/admin/orders/\${cardInputOrder.id}/resend\`, {
                method: 'POST',
                headers: {
                    'Authorization': \`Bearer \${token}\`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ cardContent: cardInputContent })
            })
            const data = await res.json()
            if (res.ok) {
                showToast(data.emailSent ? L(\`已重发 (\${data.totalCards} 张卡密)，邮件已发送\`, \`Resent (\${data.totalCards} keys), email sent\`) : L('卡密已重发，但邮件发送失败', 'Resent, but email failed'), data.emailSent ? 'success' : 'warning')
                setShowCardInputModal(false)
                setCardInputOrder(null)
                setCardInputContent('')
                setIsResendMode(false)
                fetchOrders()
            } else {
                showToast(data.error || L('重发失败', 'Resend failed'), 'error')
            }
        } catch (error) {
            showToast(L('重发失败', 'Resend failed'), 'error')
        } finally {
            setShipping(null)
        }
    }

    const formatTime = (dateStr) => {
        if (!dateStr) return '-'
        return new Date(dateStr).toLocaleString()
    }

    // RefundActions
    const handleRefund = (order) => {
        showConfirm(
            L('退款确认', 'RefundConfirm'),
            L(\`确定要将订单 \${order.orderNo} 标记为退款中吗？确认后会进入待退款状态，点击“已退款”后才会最终释放卡密回库存。\`, \`Are you sure you want to mark order \${order.orderNo} as refunding? After confirmation, it will enter pending refund status, and the associated card keys will only be released back to stock after clicking "Refunded".\`),
            async () => {
                try {
                    const res = await fetch(\`/api/admin/orders/\${order.id}/refund\`, {
                        method: 'POST',
                        headers: { 'Authorization': \`Bearer \${token}\` }
                    })
                    const data = await res.json()
                    if (res.ok) {
                        showToast(data.message || L('订单已标记为退款中', 'Order marked as refunding'), 'success')
                        fetchOrders()
                    } else {
                        showToast(data.error || L('退款失败', 'RefundFailed'), 'error')
                    }
                } catch (error) {
                    showToast(L('退款失败', 'RefundFailed'), 'error')
                }
            },
            L('确认退款中', 'ConfirmRefunding')
        )
    }

    const handleCompleteRefund = (order) => {
        showConfirm(
            L('完成退款', 'Complete Refund'),
            L(\`确定要将订单 \${order.orderNo} 标记为已退款吗？关联的卡密将会被释放。\`, \`Are you sure you want to mark order \${order.orderNo} as refunded? Associated keys will be released.\`),
            async () => {
                try {
                    const res = await fetch(\`/api/admin/orders/\${order.id}/refund/complete\`, {
                        method: 'POST',
                        headers: { 'Authorization': \`Bearer \${token}\` }
                    })
                    const data = await res.json()
                    if (res.ok) {
                        showToast(data.message || L('退款成功，卡密已释放', 'Order refunded, keys released'), 'success')
                        fetchOrders()
                    } else {
                        showToast(data.error || L('完成退款失败', 'Complete RefundFailed'), 'error')
                    }
                } catch (error) {
                    showToast(L('完成退款失败', 'Complete RefundFailed'), 'error')
                }
            },
            L('确认已退款', 'ConfirmRefunded')
        )
    }

    // Delete Order
    const handleDeleteOrder = (order) => {
        showConfirm(
            L('删除订单', 'Delete Order'),
            L(\`确定要删除订单 \${order.orderNo} 吗？此操作无法撤销。关联的卡密将被释放。\`, \`Are you sure you want to delete order \${order.orderNo}? This cannot be undone. Associated keys will be released.\`),
            async () => {
                try {
                    const res = await fetch(\`/api/admin/orders/\${order.id}\`, {
                        method: 'DELETE',
                        headers: { 'Authorization': \`Bearer \${token}\` }
                    })
                    const data = await res.json()
                    if (res.ok) {
                        showToast(L('订单已删除', 'Order deleted'), 'success')
                        fetchOrders()
                    } else {
                        showToast(data.error || L('删除失败', 'DeleteFailed'), 'error')
                    }
                } catch (error) {
                    showToast(L('删除失败', 'DeleteFailed'), 'error')
                }
            },
            L('确认删除', 'ConfirmDelete')
        )
    }

    const statusMap = {
        PENDING: { label: L('等待支付', 'Pending'), class: 'pending' },
        PAID: { label: L('已支付', 'Paid'), class: 'paid' },
        COMPLETED: { label: L('已完成', 'Completed'), class: 'completed' },
        CANCELLED: { label: L('已取消', 'Cancelled'), class: 'cancelled' },
        REFUNDING: { label: L('退款中', 'Refunding'), class: 'refunding' },
        REFUNDED: { label: L('已退款', 'Refunded'), class: 'refunded' }
    }

    if (loading) {
        return <div className="manage-page"><p>{L('加载中...', 'Loading...')}</p></div>
    }

    return (
        <div className="manage-page">
            <div className="page-header">
                <div className="page-header-left">
                    <h2>{L('admin.orders.title')}</h2>
                    <div className="header-stats">
                        <span className="stat-item">{L(\`共 \${totalOrders} 条订单\`, \`\${totalOrders} orders total\`)}</span>
                    </div>
                </div>
                <div className="filters">
                    <div className="search-box">
                        <input
                            type="text"
                            className="search-input"
                            placeholder={L('admin.orders.search')}
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                        />
                        {searching && <span className="search-spinner" />}
                        {searchInput && !searching && (
                            <button className="search-clear" onClick={() => { setSearchInput(''); setDebouncedSearch('') }}>
                                <FiX />
                            </button>
                        )}
                    </div>
                    <select
                        className="filter-select"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="all">{L('admin.orders.allStatus')}</option>
                        <option value="PENDING">{L('admin.dashboard.orderStatus.pending')}</option>
                        <option value="PAID">{L('admin.dashboard.orderStatus.paid')}</option>
                        <option value="COMPLETED">{L('admin.dashboard.orderStatus.completed')}</option>
                        <option value="CANCELLED">{L('admin.dashboard.orderStatus.cancelled')}</option>
                        <option value="REFUNDING">{L('admin.dashboard.orderStatus.refunding')}</option>
                        <option value="REFUNDED">{L('admin.dashboard.orderStatus.refunded')}</option>
                    </select>
                </div>
            </div>
            <table className="admin-table">
                <thead>
                    <tr>
                        <th>{L('admin.orders.table.orderNo')}</th>
                        <th>{L('admin.cards.table.product')}</th>
                        <th>{L('admin.orders.table.amount')}</th>
                        <th>{L('admin.users.table.email')}</th>
                        <th>{L('admin.orders.table.remark')}</th>
                        <th>{L('admin.common.status')}</th>
                        <th>{L('admin.common.time')}</th>
                        <th>{L('admin.common.actions')}</th>
                    </tr>
                </thead>
                <tbody>
                    {orders.map(order => (
                        <tr key={order.id || order.orderNo}>
                            <td className="order-no">{order.orderNo}</td>
                            <td>{order.productName}</td>
                            <td>{formatMoney(order.totalAmount)}</td>
                            <td>{order.email}</td>
                            <td className="remark-cell">
                                {order.remark ? (
                                    <span className="remark-text" title={order.remark}>
                                        {order.remark.length > 20 ? order.remark.slice(0, 20) + '...' : order.remark}
                                    </span>
                                ) : (
                                    <span className="no-remark">-</span>
                                )}
                            </td>
                            <td>
                                <span className={\`status-badge \${statusMap[order.status?.toUpperCase()]?.class || order.status?.toLowerCase()}\`}>
                                    {statusMap[order.status?.toUpperCase()]?.label || order.status}
                                </span>
                            </td>
                            <td className="time">{formatTime(order.createdAt)}</td>
                            <td className="actions">
                                {order.status?.toUpperCase() === 'PAID' && (
                                    <button
                                        className="action-btn ship"
                                        onClick={() => handleShip(order)}
                                        disabled={shipping === order.id}
                                    >
                                        {shipping === order.id ? L('发货中...', 'Shipping...') : L('发货', 'Ship')}
                                    </button>
                                )}
                                {order.status?.toUpperCase() === 'COMPLETED' && (
                                    <button
                                        className="action-btn ship"
                                        onClick={() => handleResend(order)}
                                    >
                                        {L('重发卡密', 'Resend')}
                                    </button>
                                )}
                                {isSuperAdmin && (order.status?.toUpperCase() === 'PAID' || order.status?.toUpperCase() === 'COMPLETED') && (
                                    <button
                                        className="action-btn refund"
                                        onClick={() => handleRefund(order)}
                                    >
                                        {L('退款', 'Refund')}
                                    </button>
                                )}
                                {isSuperAdmin && order.status?.toUpperCase() === 'REFUNDING' && (
                                    <button
                                        className="action-btn refund-complete"
                                        onClick={() => handleCompleteRefund(order)}
                                    >
                                        {L('已退款', 'Refunded')}
                                    </button>
                                )}
                                <button className="action-btn view" onClick={() => window.open(\`\${storefrontPrefix}/order/\${order.orderNo}\`, '_blank')}>{L('admin.orders.view')}</button>
                                {isSuperAdmin && <button className="action-btn delete" onClick={() => handleDeleteOrder(order)}>{L('删除', 'Delete')}</button>}
                            </td>
                        </tr>
                    ))}
                    {orders.length === 0 && (
                        <tr><td colSpan="8" style={{ textAlign: 'center' }}>{L('暂无订单', 'No orders')}</td></tr>
                    )}
                </tbody>
            </table>

            {totalPages > 1 && (
                <div className="pagination">
                    <button
                        disabled={currentPage <= 1}
                        onClick={() => setCurrentPage(p => p - 1)}
                    >
                        ← {L('上一页', 'Prev')}
                    </button>
                    {(() => {
                        const pages = []
                        let start = Math.max(1, currentPage - 2)
                        let end = Math.min(totalPages, currentPage + 2)
                        if (start > 1) {
                            pages.push(<button key={1} onClick={() => setCurrentPage(1)} style={1 === currentPage ? { background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: 'white', borderColor: 'transparent' } : {}}>1</button>)
                            if (start > 2) pages.push(<span key="ls">...</span>)
                        }
                        for (let i = start; i <= end; i++) {
                            pages.push(
                                <button key={i} onClick={() => setCurrentPage(i)}
                                    style={i === currentPage ? { background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: 'white', borderColor: 'transparent' } : {}}
                                >{i}</button>
                            )
                        }
                        if (end < totalPages) {
                            if (end < totalPages - 1) pages.push(<span key="rs">...</span>)
                            pages.push(<button key={totalPages} onClick={() => setCurrentPage(totalPages)} style={totalPages === currentPage ? { background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: 'white', borderColor: 'transparent' } : {}}>{totalPages}</button>)
                        }
                        return pages
                    })()}
                    <button
                        disabled={currentPage >= totalPages}
                        onClick={() => setCurrentPage(p => p + 1)}
                    >
                        {L('下一页', 'Next')} →
                    </button>
                    <span style={{ marginLeft: '8px', fontSize: '0.85rem', color: '#94a3b8' }}>
                        {L(\`页码 \${currentPage}/\${totalPages}\`, \`Page \${currentPage}/\${totalPages}\`)} 
                    </span>
                </div>
            )}

            {/* Ship弹窗 - 优化UI */}
            {showCardInputModal && cardInputOrder && (
                <div className="ship-modal-overlay" onClick={() => setShowCardInputModal(false)}>
                    <div className="ship-modal" onClick={e => e.stopPropagation()}>
                        <div className="ship-modal-header">
                            <div className="ship-modal-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M20 12v6a2 2 0 01-2 2H6a2 2 0 01-2-2v-6M12 3v12M8 7l4-4 4 4" />
                                </svg>
                            </div>
                            <h3>{isResendMode ? L('重发卡密', 'Resend Keys') : L('手动发货', 'Manual Ship')}</h3>
                            <p className="ship-modal-subtitle">{L('订单号', 'Order')} {cardInputOrder.orderNo}</p>
                            <button className="ship-modal-close" onClick={() => setShowCardInputModal(false)}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M18 6L6 18M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="ship-modal-body">
                            <div className="order-info-card">
                                <div className="order-info-row">
                                    <span className="order-info-label">{L('商品名称', 'Product Name')}</span>
                                    <span className="order-info-value">{cardInputOrder.productName}</span>
                                </div>
                                <div className="order-info-row">
                                    <span className="order-info-label">{L('购买数量', 'Quantity')}</span>
                                    <span className="order-info-value highlight">{L(\`\${cardInputOrder.quantity} 件\`, \`\${cardInputOrder.quantity} pcs\`)}</span>
                                </div>
                                <div className="order-info-row">
                                    <span className="order-info-label">{L('顾客邮箱', 'Customer Email')}</span>
                                    <span className="order-info-value">{cardInputOrder.email}</span>
                                </div>
                                {cardInputOrder.remark && (
                                    <div className="order-info-row">
                                        <span className="order-info-label">{L('订单备注', 'Order Note')}</span>
                                        <span className="order-info-value remark-value">{cardInputOrder.remark}</span>
                                    </div>
                                )}
                            </div>

                            <div className="card-input-section">
                                <label className="card-input-label">
                                    <span className="card-icon">🎫</span>
                                    {isResendMode ? L('重发卡密内容', 'Resend Key Content') : L('卡密内容', 'Card Key Content')}
                                    <span className="card-hint">{isResendMode ? L('多张卡密请用 --- 分隔', 'Separate multiple keys with ---') : (cardInputOrder.quantity === 1 ? L('支持多行卡密内容', 'Supports multi-line content') : L(\`请用 --- 分隔，最多输入 \${cardInputOrder.quantity} 个卡密\`, \`Separate with ---, max \${cardInputOrder.quantity} items\`))}</span>
                                </label>
                                <textarea
                                    className="card-input-textarea"
                                    value={cardInputContent}
                                    onChange={(e) => setCardInputContent(e.target.value)}
                                    placeholder={cardInputOrder.quantity === 1 ? L('请输入卡密内容（支持多行）...', 'Enter card key content (multi-line supported)...') : L(\`请输入卡密内容...\n请用 --- 分隔。例如:\n卡密1内容\n---\n卡密2内容\`, \`Enter card key content...\nSeparate with ---. Example:\nkey1 content\n---\nkey2 content\`)}
                                    rows={6}
                                    autoFocus
                                />
                            </div>

                            <div className="ship-notice">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10" />
                                    <path d="M12 16v-4M12 8h.01" />
                                </svg>
                                <span>{isResendMode ? L('重发卡密后，系统将自动发邮件通知顾客', 'After resend, customer will be notified by email with all keys') : L('确认发货后，系统将自动发邮件通知顾客', 'After shipping, customer will be notified by email with key info')}</span>
                            </div>
                        </div>

                        <div className="ship-modal-footer">
                            <button
                                className="ship-btn ship-btn-cancel"
                                onClick={() => setShowCardInputModal(false)}
                            >
                                {L('取消', 'Cancel')}
                            </button>
                            <button
                                className="ship-btn ship-btn-confirm"
                                onClick={isResendMode ? handleSubmitResend : handleSubmitShip}
                                disabled={shipping === cardInputOrder.id || !cardInputContent.trim()}
                            >
                                {shipping === cardInputOrder.id ? (
                                    <>
                                        <span className="loading-spinner"></span>
                                        {L('发货中...', 'Shipping...')}
                                    </>
                                ) : (
                                    <>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                                        </svg>
                                        {isResendMode ? L('确认重发', 'Confirm Resend') : L('确认发货', 'Confirm Ship')}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
`;

const newContent = prefix + translatedOrders + suffix;
fs.writeFileSync(file, newContent, 'utf8');
console.log('Successfully translated OrdersManage!');

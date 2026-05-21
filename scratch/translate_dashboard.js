const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../frontend/src/pages/Admin/Dashboard/index.jsx');
let content = fs.readFileSync(file, 'utf8');

const startTag = 'function PlatformNotices() {';
const startIdx = content.indexOf(startTag);
if (startIdx === -1) {
    console.error('PlatformNotices start not found');
    process.exit(1);
}

const endTag = 'function ProductsManage() {';
const endIdx = content.indexOf(endTag, startIdx);
if (endIdx === -1) {
    console.error('ProductsManage start not found');
    process.exit(1);
}

console.log('Replacing PlatformNotices to DashboardHome from', startIdx, 'to', endIdx);

const prefix = content.slice(0, startIdx);
const suffix = content.slice(endIdx);

const translatedDashboardHome = `// 平台公告组件（显示在商户后台仪表盘顶部）
function PlatformNotices() {
    const L = useAdminL()
    const [notices, setNotices] = useState([])
    const [dismissed, setDismissed] = useState(() => {
        try { return JSON.parse(localStorage.getItem('dismissed_platform_notices') || '[]') } catch { return [] }
    })

    useEffect(() => {
        fetch('/api/platform/announcements')
            .then(r => r.json())
            .then(d => setNotices(d.announcements || []))
            .catch(() => {})
    }, [])

    const dismiss = (id) => {
        const newDismissed = [...dismissed, id]
        setDismissed(newDismissed)
        localStorage.setItem('dismissed_platform_notices', JSON.stringify(newDismissed))
    }

    const visible = notices.filter(n => !dismissed.includes(n.id))
    if (visible.length === 0) return null

    return (
        <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {visible.map(n => (
                <div key={n.id} style={{
                    background: 'linear-gradient(135deg, #eff6ff, #f0f9ff)',
                    border: '1px solid #bfdbfe',
                    borderRadius: 10,
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10
                }}>
                    <span style={{ fontSize: '1rem', flexShrink: 0 }}>📢</span>
                    <div style={{ flex: 1, fontSize: '0.85rem', color: '#1e40af', lineHeight: 1.5 }}>
                        <span style={{ color: '#64748b', fontSize: '0.78rem', marginRight: 8 }}>{L('来自 Vmart', 'From Vmart')}</span>
                        <strong>{n.title}</strong>
                        {n.content && <span style={{ color: '#3b82f6', marginLeft: 6 }}>{n.content}</span>}
                    </div>
                    <button onClick={() => dismiss(n.id)} style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: '#94a3b8', fontSize: 16, padding: 0, lineHeight: 1
                    }}>✕</button>
                </div>
            ))}
        </div>
    )
}

// 免费试用横幅
function TrialBanner() {
    const L = useAdminL()
    const [plan, setPlan] = useState(null)
    const token = useAuthStore(state => state.token)

    useEffect(() => {
        if (!token) return
        fetch('/api/admin/plan-limits', { headers: { Authorization: \`Bearer \${token}\` } })
            .then(r => r.json())
            .then(d => setPlan(d.plan))
            .catch(() => {})
    }, [token])

    if (plan !== 'FREE') return null

    const basePath = window.location.pathname.replace(/\\/?$/, '') || '/admin'
    const settingsPath = basePath.replace(/\\/[^/]*$/, '/settings') || '/admin/settings'

    return (
        <div style={{
            padding: '14px 20px',
            marginBottom: 16,
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(139, 92, 246, 0.08))',
            border: '1px solid rgba(99, 102, 241, 0.25)',
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap'
        }}>
            <div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#4f46e5' }}>
                    {L('🎉 免费试用激活中', '🎉 Free Trial Active')}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#6366f1', marginTop: 3 }}>
                    {L('所有功能已开放。升级以开始接收商业订单。', 'All features available. Upgrade to start accepting orders.')}
                </div>
            </div>
            <a
                href={settingsPath}
                style={{
                    padding: '8px 20px',
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    color: '#fff',
                    borderRadius: 8,
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    textDecoration: 'none',
                    flexShrink: 0,
                    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.25)'
                }}
            >
                {L('立即升级 →', 'Upgrade →')}
            </a>
        </div>
    )
}

// 仪表盘首页
function DashboardHome() {
    const location = useLocation()
    const basePath = location.pathname.replace(/\\/?$/, '') || '/admin'
    const navigate = useNavigate()
    const token = useAuthStore(state => state.token)
    const user = useAuthStore(state => state.user)
    const L = useAdminL()
    const isSuperAdmin = ['SUPER_ADMIN', 'TENANT_ADMIN'].includes(user?.role)
    const [stats, setStats] = useState({
        totalOrders: 0,
        totalRevenue: 0,
        totalProducts: 0,
        totalUsers: 0,
        totalVisits: 0,
        todayOrders: 0,
        todayRevenue: 0,
        todayVisits: 0,
        pendingTickets: 0,
        unpaidOrders: 0,
        stockAlertProducts: [],
        paymentMethodSummary: {},
        pendingPayments: [],
        paidOrders: 0,
        refundingOrders: 0
    })
    const [dashboardPermissions, setDashboardPermissions] = useState({
        viewStatsGrid: true,
        viewTodayStats: true
    })
    const [recentOrders, setRecentOrders] = useState([])
    const [loading, setLoading] = useState(true)

    const [trendData, setTrendData] = useState({})
    const [trendDays, setTrendDays] = useState(7)
    const [expandedCard, setExpandedCard] = useState(null)

    useEffect(() => {
        const fetchTrend = async () => {
            if (trendData[trendDays]) return

            try {
                const res = await fetch(\`/api/admin/dashboard/trend?days=\${trendDays}\`, {
                    headers: { 'Authorization': \`Bearer \${token}\` }
                })
                const data = await res.json()
                if (data.trend) {
                    setTrendData(prev => ({ ...prev, [trendDays]: data.trend }))
                }
            } catch (error) {
                console.error('获取趋势数据Failed:', error)
            }
        }
        if (token && expandedCard && dashboardPermissions.viewStatsGrid) {
            fetchTrend()
        }
    }, [token, expandedCard, trendDays, trendData, dashboardPermissions.viewStatsGrid])

    const renderFullExpandedPanel = () => {
        if (!expandedCard) return null;

        const config = {
            orders: { label: L('订单趋势', 'Order Trend'), color: '#ef4444', fillId: 'colorOrders' },
            revenue: { label: L('收入趋势', 'Revenue Trend'), color: '#10b981', fillId: 'colorRevenue' },
            products: { label: L('商品趋势', 'Product Trend'), color: '#f59e0b', fillId: 'colorProducts' },
            users: { label: L('用户增长趋势', 'User Growth'), color: '#3b82f6', fillId: 'colorUsers' },
            visits: { label: L('访问量趋势', 'Visit Trend'), color: '#8b5cf6', fillId: 'colorVisits' }
        };

        const { label, color, fillId } = config[expandedCard];

        return (
            <div className="full-trend-panel">
                <div className="full-trend-header">
                    <div className="full-trend-title">{label}</div>
                    <div className="trend-tabs" style={{ marginBottom: 0 }}>
                        <span className={\`trend-tab \${trendDays === 7 ? 'active' : ''}\`} onClick={() => setTrendDays(7)}>7d</span>
                        <span className={\`trend-tab \${trendDays === 30 ? 'active' : ''}\`} onClick={() => setTrendDays(30)}>30d</span>
                    </div>
                </div>
                {!trendData[trendDays] ? (
                    <div style={{ padding: '20px', color: 'var(--text-muted)' }}>{L('加载中...', 'Loading...')}</div>
                ) : (
                    <div className="trend-chart-mini">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={trendData[trendDays] || []} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor={color} stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="date" hide />
                                <Tooltip 
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                    labelStyle={{ color: '#64748b', marginBottom: '4px' }}
                                />
                                <Area type="monotone" dataKey={expandedCard} stroke={color} fillOpacity={1} fill={\`url(#\${fillId})\`} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>
        )
    }

    useEffect(() => {
        const fetchDashboard = async () => {
            try {
                const res = await fetch('/api/admin/dashboard', {
                    headers: { 'Authorization': \`Bearer \${token}\` }
                })
                const data = await res.json()
                const permissions = data.permissions?.dashboard
                setDashboardPermissions({
                    viewStatsGrid: isSuperAdmin || permissions?.viewStatsGrid !== false,
                    viewTodayStats: isSuperAdmin || permissions?.viewTodayStats !== false
                })
                setStats({
                    totalOrders: data.totalOrders || 0,
                    totalRevenue: data.totalRevenue || 0,
                    totalProducts: data.totalProducts || 0,
                    totalUsers: data.totalUsers || 0,
                    totalVisits: data.totalVisits || 0,
                    todayOrders: data.todayOrders || 0,
                    todayRevenue: data.todayRevenue || 0,
                    todayVisits: data.todayVisits || 0,
                    pendingTickets: data.pendingTickets || 0,
                    unpaidOrders: data.unpaidOrders || 0,
                    stockAlertProducts: data.stockAlertProducts || [],
                    paymentMethodSummary: data.paymentMethodSummary || {},
                    pendingPayments: data.pendingPayments || [],
                    paidOrders: data.paidOrders || 0,
                    refundingOrders: data.refundingOrders || 0
                })
                setRecentOrders(data.recentOrders || [])
            } catch (error) {
                console.error('获取仪表盘数据Failed:', error)
            } finally {
                setLoading(false)
            }
        }
        if (token) fetchDashboard()
    }, [token, isSuperAdmin])

    const formatTime = (dateStr) => {
        if (!dateStr) return '-'
        const date = new Date(dateStr)
        const now = new Date()
        const diffMs = now - date
        const diffMins = Math.floor(diffMs / 60000)
        if (diffMins < 60) return L(\`\${diffMins} 分钟前\`, \`\${diffMins}m ago\`)
        const diffHours = Math.floor(diffMins / 60)
        if (diffHours < 24) return L(\`\${diffHours} 小时前\`, \`\${diffHours}h ago\`)
        return date.toLocaleDateString()
    }

    const paymentMethodLabels = {
        'alipay': L('支付宝', 'Alipay'),
        'usdt_trc20': L('USDT (TRC20)', 'USDT (TRC20)'),
        'bsc_usdt': L('USDT (BSC)', 'USDT (BSC)'),
        'wechat': L('微信支付', 'WeChat Pay')
    }

    if (loading) {
        return <div className="dashboard-home"><p>{L('加载中...', 'Loading...')}</p></div>
    }

    return (
        <div className="dashboard-home">
            {/* 免费试用横幅 */}
            <TrialBanner />
            {/* 平台公告 */}
            <PlatformNotices />
            {/* 顶部警报栏 */}
            {(stats.pendingTickets > 0 || stats.unpaidOrders > 0 || stats.paidOrders > 0 || stats.refundingOrders > 0 || stats.stockAlertProducts.length > 0) && (
                <div className="dashboard-alerts">
                    {stats.stockAlertProducts.length > 0 && (
                        <div
                            className="alert-item alert-danger alert-stock"
                            onClick={() => {
                                const firstId = stats.stockAlertProducts[0]?.id
                                if (firstId) {
                                    navigate(\`\${basePath}/cards?productId=\${firstId}\`)
                                } else {
                                    navigate(\`\${basePath}/cards\`)
                                }
                            }}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault()
                                    const firstId = stats.stockAlertProducts[0]?.id
                                    if (firstId) {
                                        navigate(\`\${basePath}/cards?productId=\${firstId}\`)
                                    } else {
                                        navigate(\`\${basePath}/cards\`)
                                    }
                                }
                            }}
                        >
                            <FiAlertTriangle />
                            <span className="alert-stock-text">
                                🔴 {L(\`\${stats.stockAlertProducts.length} 个商品缺货:\`, \`\${stats.stockAlertProducts.length} product(s) out of stock:\`)}
                            </span>
                            <span className="alert-stock-links">
                                {stats.stockAlertProducts.map((p) => (
                                    <Link
                                        key={p.id}
                                        to={\`\${basePath}/cards?productId=\${p.id}\`}
                                        className="alert-stock-link"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        {p.name}({p.stock})
                                    </Link>
                                ))}
                            </span>
                            <FiTrendingUp className="alert-arrow" />
                        </div>
                    )}
                    {stats.pendingTickets > 0 && (
                        <Link to={\`\${basePath}/tickets\`} className="alert-item alert-warning">
                            <FiMessageCircle />
                            <span>{L(\`\${stats.pendingTickets} 个未读工单\`, \`\${stats.pendingTickets} unread ticket(s)\`)}</span>
                            <FiTrendingUp className="alert-arrow" />
                        </Link>
                    )}
                    {stats.paidOrders > 0 && (
                        <Link to={\`\${basePath}/orders?status=PAID\`} className="alert-item alert-shipping">
                            <FiSend />
                            <span>{L(\`\${stats.paidOrders} 个待发货订单\`, \`\${stats.paidOrders} order(s) to ship\`)}</span>
                            <FiTrendingUp className="alert-arrow" />
                        </Link>
                    )}
                    {stats.refundingOrders > 0 && (
                        <Link to={\`\${basePath}/orders?status=REFUNDING\`} className="alert-item alert-refund">
                            <FiAlertCircle />
                            <span>{L(\`\${stats.refundingOrders} 个待退款订单\`, \`\${stats.refundingOrders} order(s) pending refund\`)}</span>
                            <FiTrendingUp className="alert-arrow" />
                        </Link>
                    )}
                    {stats.unpaidOrders > 0 && (
                        <div className="alert-item alert-info">
                            <FiClock />
                            <span>{L(\`\${stats.unpaidOrders} 个待支付订单\`, \`\${stats.unpaidOrders} unpaid order(s)\`)}</span>
                        </div>
                    )}
                </div>
            )}

            
                        {/* 统计卡片 */}
            {dashboardPermissions.viewStatsGrid && (
                <div className="stats-grid">
                    <div className={\`stat-card accent-orders \${expandedCard === 'orders' ? 'expanded' : ''}\`} onClick={() => setExpandedCard(expandedCard === 'orders' ? null : 'orders')}>
                        <div className="stat-card-header">
                            <div className="stat-card-top">
                                <div className="stat-icon orders"><FiShoppingBag /></div>
                                {dashboardPermissions.viewTodayStats && (
                                    <div className="stat-trend up"><FiTrendingUp />&nbsp;+{stats.todayOrders} {L('admin.dashboard.stats.todaySuffix')}</div>
                                )}
                            </div>
                            <span className="stat-value">{stats.totalOrders.toLocaleString()}</span>
                            <span className="stat-label">{L('admin.dashboard.stats.totalOrders')}</span>
                        </div>
                    </div>

                    <div className={\`stat-card accent-revenue \${expandedCard === 'revenue' ? 'expanded' : ''}\`} onClick={() => setExpandedCard(expandedCard === 'revenue' ? null : 'revenue')}>
                        <div className="stat-card-header">
                            <div className="stat-card-top">
                                <div className="stat-icon revenue"><FiDollarSign /></div>
                                {dashboardPermissions.viewTodayStats && (
                                    <div className="stat-trend up"><FiTrendingUp />&nbsp;+{formatMoney(stats.todayRevenue)}</div>
                                )}
                            </div>
                            <span className="stat-value">{formatMoney(stats.totalRevenue)}</span>
                            <span className="stat-label">{L('admin.dashboard.stats.totalRevenue')}</span>
                        </div>
                    </div>

                    <div className={\`stat-card accent-products \${expandedCard === 'products' ? 'expanded' : ''}\`} onClick={() => setExpandedCard(expandedCard === 'products' ? null : 'products')}>
                        <div className="stat-card-header">
                            <div className="stat-card-top">
                                <div className="stat-icon products"><FiBox /></div>
                            </div>
                            <span className="stat-value">{stats.totalProducts.toLocaleString()}</span>
                            <span className="stat-label">{L('admin.dashboard.stats.totalProducts')}</span>
                        </div>
                    </div>

                    <div className={\`stat-card accent-users \${expandedCard === 'users' ? 'expanded' : ''}\`} onClick={() => setExpandedCard(expandedCard === 'users' ? null : 'users')}>
                        <div className="stat-card-header">
                            <div className="stat-card-top">
                                <div className="stat-icon users"><FiUsers /></div>
                            </div>
                            <span className="stat-value">{stats.totalUsers.toLocaleString()}</span>
                            <span className="stat-label">{L('admin.dashboard.stats.totalUsers')}</span>
                        </div>
                    </div>

                    <div className={\`stat-card accent-visits \${expandedCard === 'visits' ? 'expanded' : ''}\`} onClick={() => setExpandedCard(expandedCard === 'visits' ? null : 'visits')}>
                        <div className="stat-card-header">
                            <div className="stat-card-top">
                                <div className="stat-icon clock"><FiActivity /></div>
                                {dashboardPermissions.viewTodayStats && (
                                    <div className="stat-trend up"><FiTrendingUp />&nbsp;+{stats.todayVisits} {L('admin.dashboard.stats.todaySuffix')}</div>
                                )}
                            </div>
                            <span className="stat-value">{stats.totalVisits.toLocaleString()}</span>
                            <span className="stat-label">{L('admin.dashboard.stats.totalVisits')}</span>
                        </div>
                    </div>
                </div>
            )}

            {dashboardPermissions.viewStatsGrid && renderFullExpandedPanel()}

            {/* 今日数据 */}
            {dashboardPermissions.viewTodayStats && (
                <div className="today-stats">
                    <div className="today-card">
                        <FiActivity />
                        <div>
                            <span className="today-value">{stats.todayOrders}</span>
                            <span className="today-label">{L('admin.dashboard.stats.todayOrders')}</span>
                        </div>
                    </div>
                    <div className="today-card">
                        <FiDollarSign />
                        <div>
                            <span className="today-value">{formatMoney(stats.todayRevenue)}</span>
                            <span className="today-label">{L('admin.dashboard.stats.todayRevenue')}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* 支付监控面板 */}
            {stats.unpaidOrders > 0 && (
                <div className="payment-monitor">
                    <div className="payment-monitor-header">
                        <h3><FiCreditCard style={{ marginRight: 8, verticalAlign: 'middle' }} />{L('admin.dashboard.paymentMonitor.title')}</h3>
                        <span className="payment-count">{L(\`\${stats.unpaidOrders} 笔待确认\`, \`\${stats.unpaidOrders} pending\`)}</span>
                    </div>
                    <div className="payment-summary-grid">
                        {Object.entries(stats.paymentMethodSummary).map(([method, data]) => (
                            <div key={method} className={\`payment-summary-item \${method}\`}>
                                <span className="payment-method-name">{paymentMethodLabels[method] || method}</span>
                                <span className="payment-method-count">{data.count} {L('admin.dashboard.paymentMonitor.countUnit')}</span>
                                <span className="payment-method-amount">{formatMoney(data.amount)}</span>
                            </div>
                        ))}
                    </div>
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>{L('admin.orders.table.orderNo')}</th>
                                <th>{L('admin.cards.table.product')}</th>
                                <th>{L('admin.dashboard.paymentMonitor.table.method')}</th>
                                <th>{L('admin.orders.table.amount')}</th>
                                <th>{L('admin.common.time')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats.pendingPayments.slice(0, 5).map(p => (
                                <tr key={p.orderNo}>
                                    <td className="order-no">{p.orderNo}</td>
                                    <td>{p.productName}</td>
                                    <td>
                                        <span className={\`payment-badge \${p.paymentMethod}\`}>
                                            {paymentMethodLabels[p.paymentMethod] || p.paymentMethod || L('admin.dashboard.paymentMonitor.noMethod')}
                                        </span>
                                    </td>
                                    <td>
                                        {formatMoney(p.amount)}
                                        {p.usdtAmount && <span className="crypto-amount"> / {p.usdtAmount} USDT</span>}
                                        {p.bscUsdtAmount && <span className="crypto-amount"> / {p.bscUsdtAmount} USDT</span>}
                                    </td>
                                    <td className="time">{formatTime(p.createdAt)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* 最近Order */}
            <div className="recent-orders">
                <h3>{L('admin.dashboard.recentOrders.title')}</h3>
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>{L('admin.orders.table.orderNo')}</th>
                            <th>{L('admin.cards.table.product')}</th>
                            <th>{L('admin.orders.table.amount')}</th>
                            <th>{L('admin.common.status')}</th>
                            <th>{L('admin.common.time')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {recentOrders.map(order => (
                            <tr key={order.orderNo}>
                                <td className="order-no">{order.orderNo}</td>
                                <td>{order.productName}</td>
                                <td>{formatMoney(order.amount || order.totalAmount || 0)}</td>
                                <td>
                                    <span className={\`status-badge \${order.status?.toLowerCase()}\`}>
                                        {({pending: L('admin.dashboard.orderStatus.pending'), paid: L('admin.dashboard.orderStatus.paid'), completed: L('admin.dashboard.orderStatus.completed'), cancelled: L('admin.dashboard.orderStatus.cancelled'), refunding: L('admin.dashboard.orderStatus.refunding'), refunded: L('admin.dashboard.orderStatus.refunded')}[order.status?.toLowerCase()] || order.status)}
                                    </span>
                                </td>
                                <td className="time">{formatTime(order.createdAt)}</td>
                            </tr>
                        ))}
                        {recentOrders.length === 0 && (
                            <tr><td colSpan="5" style={{ textAlign: 'center' }}>{L('admin.dashboard.recentOrders.noData')}</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}


`;

const newContent = prefix + translatedDashboardHome + suffix;
fs.writeFileSync(file, newContent, 'utf8');
console.log('Successfully translated DashboardHome!');

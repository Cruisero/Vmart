import { useState, useEffect, createContext, useContext, useRef, Fragment } from 'react'
import { Routes, Route, Link, useLocation, useNavigate, Navigate } from 'react-router-dom'
import {
    FiHome, FiPackage, FiShoppingBag, FiCreditCard,
    FiUsers, FiSettings, FiLogOut, FiMenu, FiX,
    FiTrendingUp, FiDollarSign, FiBox, FiActivity, FiFlag,
    FiCheckCircle, FiAlertCircle, FiInfo, FiAlertTriangle,
    FiChevronDown, FiCheck, FiImage, FiMessageCircle,
    FiClock, FiBell, FiBellOff, FiSend,
    FiShield, FiUser, FiSearch, FiShare2
} from 'react-icons/fi'
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { useAuthStore } from '../../../store/authStore'
import { useSkinStore } from '../../../store/skinStore'
import './Dashboard.css'
import TenantSettings from '../TenantSettings'

// ==================== Toast & Dialog Context ====================
const ToastContext = createContext(null)

function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([])
    const [confirmDialog, setConfirmDialog] = useState(null)

    const showToast = (message, type = 'success', duration = 3000) => {
        const id = Date.now()
        setToasts(prev => [...prev, { id, message, type }])
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id))
        }, duration)
    }

    const showConfirm = (title, message, onConfirm, confirmText = '确认') => {
        setConfirmDialog({ title, message, onConfirm, confirmText })
    }

    const closeConfirm = () => setConfirmDialog(null)

    const handleConfirm = () => {
        if (confirmDialog?.onConfirm) {
            confirmDialog.onConfirm()
        }
        closeConfirm()
    }

    return (
        <ToastContext.Provider value={{ showToast, showConfirm }}>
            {children}

            {/* Toast 容器 */}
            <div className="toast-container">
                {toasts.map(toast => (
                    <div key={toast.id} className={`toast toast-${toast.type}`}>
                        <span className="toast-icon">
                            {toast.type === 'success' && <FiCheckCircle />}
                            {toast.type === 'error' && <FiAlertCircle />}
                            {toast.type === 'warning' && <FiAlertTriangle />}
                            {toast.type === 'info' && <FiInfo />}
                        </span>
                        <span className="toast-message">{toast.message}</span>
                    </div>
                ))}
            </div>

            {/* 确认弹窗 */}
            {confirmDialog && (
                <div className="confirm-overlay" onClick={closeConfirm}>
                    <div className="confirm-dialog" onClick={e => e.stopPropagation()}>
                        <div className="confirm-icon">
                            <FiAlertTriangle />
                        </div>
                        <h3 className="confirm-title">{confirmDialog.title}</h3>
                        <p className="confirm-message">{confirmDialog.message}</p>
                        <div className="confirm-actions">
                            <button className="btn btn-cancel" onClick={closeConfirm}>
                                取消
                            </button>
                            <button className="btn btn-primary" onClick={handleConfirm}>
                                {confirmDialog.confirmText || '确认'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </ToastContext.Provider>
    )
}

function useToast() {
    return useContext(ToastContext)
}

// ==================== 自定义 Select 组件 ====================
function CustomSelect({ value, onChange, options, placeholder, name, required }) {
    const [isOpen, setIsOpen] = useState(false)
    const [selectedLabel, setSelectedLabel] = useState('')
    const selectRef = useRef(null)

    // 获取选中项的标签
    useEffect(() => {
        const option = options.find(opt => opt.value === value)
        setSelectedLabel(option ? option.label : '')
    }, [value, options])

    // 点击外部关闭
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (selectRef.current && !selectRef.current.contains(e.target)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleSelect = (optionValue) => {
        onChange({ target: { name, value: optionValue } })
        setIsOpen(false)
    }

    return (
        <div className={`custom-select ${isOpen ? 'open' : ''}`} ref={selectRef}>
            <div
                className="custom-select-trigger"
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className={`custom-select-value ${!value ? 'placeholder' : ''}`}>
                    {selectedLabel || placeholder}
                </span>
                <FiChevronDown className="custom-select-arrow" />
            </div>
            {isOpen && (
                <div className="custom-select-dropdown">
                    {placeholder && (
                        <div
                            className={`custom-select-option ${!value ? 'selected' : ''}`}
                            onClick={() => handleSelect('')}
                        >
                            <span>{placeholder}</span>
                        </div>
                    )}
                    {options.map(option => (
                        <div
                            key={option.value}
                            className={`custom-select-option ${value === option.value ? 'selected' : ''}`}
                            onClick={() => handleSelect(option.value)}
                        >
                            <span>{option.label}</span>
                            {value === option.value && <FiCheck className="option-check" />}
                        </div>
                    ))}
                </div>
            )}
            {/* 隐藏的原生 select 用于表单验证 */}
            {required && (
                <select
                    name={name}
                    value={value}
                    onChange={() => { }}
                    required
                    style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', height: 0 }}
                >
                    <option value=""></option>
                    {options.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
            )}
        </div>
    )
}


// 侧边栏菜单
const menuItems = [
    { path: '/admin/setup', icon: FiFlag, label: '新手起航', tenantOnly: true },
    { path: '/admin/settings', icon: FiSettings, label: '店铺设置', tenantOnly: true },
    { path: '/admin', icon: FiHome, label: '仪表盘', exact: true },
    { path: '/admin/products', icon: FiPackage, label: '商品管理' },
    { path: '/admin/orders', icon: FiShoppingBag, label: '订单管理' },
    { path: '/admin/tickets', icon: FiMessageCircle, label: '工单管理' },
    { path: '/admin/cards', icon: FiCreditCard, label: '卡密管理' },
    { path: '/admin/users', icon: FiUsers, label: '用户管理', superOnly: true },
    { path: '/admin/agents', icon: FiShare2, label: '代理管理', superOnly: true },
    { path: '/admin/tenants', icon: FiUsers, label: '租户商城', superOnly: true },
    { path: '/admin/settings', icon: FiSettings, label: '系统设置', superOnly: true },
]

// 仪表盘首页
function DashboardHome() {
    const navigate = useNavigate()
    const token = useAuthStore(state => state.token)
    const user = useAuthStore(state => state.user)
    const isSuperAdmin = user?.role === 'SUPER_ADMIN'
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
                const res = await fetch(`/api/admin/dashboard/trend?days=${trendDays}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
                const data = await res.json()
                if (data.trend) {
                    setTrendData(prev => ({ ...prev, [trendDays]: data.trend }))
                }
            } catch (error) {
                console.error('获取趋势数据失败:', error)
            }
        }
        if (token && expandedCard && dashboardPermissions.viewStatsGrid) {
            fetchTrend()
        }
    }, [token, expandedCard, trendDays, trendData, dashboardPermissions.viewStatsGrid])

    const renderFullExpandedPanel = () => {
        if (!expandedCard) return null;

        const config = {
            orders: { label: '订单趋势', color: '#ef4444', fillId: 'colorOrders' },
            revenue: { label: '收入趋势', color: '#10b981', fillId: 'colorRevenue' },
            products: { label: '商品新增趋势', color: '#f59e0b', fillId: 'colorProducts' },
            users: { label: '用户新增趋势', color: '#3b82f6', fillId: 'colorUsers' },
            visits: { label: '访问量趋势', color: '#8b5cf6', fillId: 'colorVisits' }
        };

        const { label, color, fillId } = config[expandedCard];

        return (
            <div className="full-trend-panel">
                <div className="full-trend-header">
                    <div className="full-trend-title">{label}</div>
                    <div className="trend-tabs" style={{ marginBottom: 0 }}>
                        <span className={`trend-tab ${trendDays === 7 ? 'active' : ''}`} onClick={() => setTrendDays(7)}>7天</span>
                        <span className={`trend-tab ${trendDays === 30 ? 'active' : ''}`} onClick={() => setTrendDays(30)}>30天</span>
                    </div>
                </div>
                {!trendData[trendDays] ? (
                    <div style={{ padding: '20px', color: 'var(--text-muted)' }}>加载中...</div>
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
                                <Area type="monotone" dataKey={expandedCard} stroke={color} fillOpacity={1} fill={`url(#${fillId})`} />
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
                    headers: { 'Authorization': `Bearer ${token}` }
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
                console.error('获取仪表盘数据失败:', error)
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
        if (diffMins < 60) return `${diffMins}分钟前`
        const diffHours = Math.floor(diffMins / 60)
        if (diffHours < 24) return `${diffHours}小时前`
        return date.toLocaleDateString()
    }

    const paymentMethodLabels = {
        'alipay': '支付宝',
        'usdt_trc20': 'USDT (TRC20)',
        'bsc_usdt': 'USDT (BSC)',
        'wechat': '微信支付'
    }

    if (loading) {
        return <div className="dashboard-home"><p>加载中...</p></div>
    }

    return (
        <div className="dashboard-home">
            {/* 顶部警报栏 */}
            {(stats.pendingTickets > 0 || stats.unpaidOrders > 0 || stats.paidOrders > 0 || stats.refundingOrders > 0 || stats.stockAlertProducts.length > 0) && (
                <div className="dashboard-alerts">
                    {stats.stockAlertProducts.length > 0 && (
                        <div
                            className="alert-item alert-danger alert-stock"
                            onClick={() => {
                                const firstId = stats.stockAlertProducts[0]?.id
                                if (firstId) {
                                    navigate(`/admin/cards?productId=${firstId}`)
                                } else {
                                    navigate('/admin/cards')
                                }
                            }}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault()
                                    const firstId = stats.stockAlertProducts[0]?.id
                                    if (firstId) {
                                        navigate(`/admin/cards?productId=${firstId}`)
                                    } else {
                                        navigate('/admin/cards')
                                    }
                                }
                            }}
                        >
                            <FiAlertTriangle />
                            <span className="alert-stock-text">
                                🔴 {stats.stockAlertProducts.length} 个商品库存为0：
                            </span>
                            <span className="alert-stock-links">
                                {stats.stockAlertProducts.map((p) => (
                                    <Link
                                        key={p.id}
                                        to={`/admin/cards?productId=${p.id}`}
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
                        <Link to="/admin/tickets" className="alert-item alert-warning">
                            <FiMessageCircle />
                            <span>{stats.pendingTickets} 个未读工单</span>
                            <FiTrendingUp className="alert-arrow" />
                        </Link>
                    )}
                    {stats.paidOrders > 0 && (
                        <Link to="/admin/orders?status=PAID" className="alert-item alert-shipping">
                            <FiSend />
                            <span>{stats.paidOrders} 个待发货订单</span>
                            <FiTrendingUp className="alert-arrow" />
                        </Link>
                    )}
                    {stats.refundingOrders > 0 && (
                        <Link to="/admin/orders?status=REFUNDING" className="alert-item alert-refund">
                            <FiAlertCircle />
                            <span>{stats.refundingOrders} 个待退款订单</span>
                            <FiTrendingUp className="alert-arrow" />
                        </Link>
                    )}
                    {stats.unpaidOrders > 0 && (
                        <div className="alert-item alert-info">
                            <FiClock />
                            <span>{stats.unpaidOrders} 个待支付订单</span>
                        </div>
                    )}
                </div>
            )}

            
                        {/* 统计卡片 */}
            {dashboardPermissions.viewStatsGrid && (
                <div className="stats-grid">
                    <div className={`stat-card accent-orders ${expandedCard === 'orders' ? 'expanded' : ''}`} onClick={() => setExpandedCard(expandedCard === 'orders' ? null : 'orders')}>
                        <div className="stat-card-header">
                            <div className="stat-card-top">
                                <div className="stat-icon orders"><FiShoppingBag /></div>
                                {dashboardPermissions.viewTodayStats && (
                                    <div className="stat-trend up"><FiTrendingUp />&nbsp;+{stats.todayOrders} 今日</div>
                                )}
                            </div>
                            <span className="stat-value">{stats.totalOrders.toLocaleString()}</span>
                            <span className="stat-label">总订单</span>
                        </div>
                    </div>

                    <div className={`stat-card accent-revenue ${expandedCard === 'revenue' ? 'expanded' : ''}`} onClick={() => setExpandedCard(expandedCard === 'revenue' ? null : 'revenue')}>
                        <div className="stat-card-header">
                            <div className="stat-card-top">
                                <div className="stat-icon revenue"><FiDollarSign /></div>
                                {dashboardPermissions.viewTodayStats && (
                                    <div className="stat-trend up"><FiTrendingUp />&nbsp;+¥{stats.todayRevenue.toFixed(2)}</div>
                                )}
                            </div>
                            <span className="stat-value">¥{stats.totalRevenue.toFixed(2)}</span>
                            <span className="stat-label">总收入</span>
                        </div>
                    </div>

                    <div className={`stat-card accent-products ${expandedCard === 'products' ? 'expanded' : ''}`} onClick={() => setExpandedCard(expandedCard === 'products' ? null : 'products')}>
                        <div className="stat-card-header">
                            <div className="stat-card-top">
                                <div className="stat-icon products"><FiBox /></div>
                            </div>
                            <span className="stat-value">{stats.totalProducts.toLocaleString()}</span>
                            <span className="stat-label">商品数</span>
                        </div>
                    </div>

                    <div className={`stat-card accent-users ${expandedCard === 'users' ? 'expanded' : ''}`} onClick={() => setExpandedCard(expandedCard === 'users' ? null : 'users')}>
                        <div className="stat-card-header">
                            <div className="stat-card-top">
                                <div className="stat-icon users"><FiUsers /></div>
                            </div>
                            <span className="stat-value">{stats.totalUsers.toLocaleString()}</span>
                            <span className="stat-label">用户数</span>
                        </div>
                    </div>

                    <div className={`stat-card accent-visits ${expandedCard === 'visits' ? 'expanded' : ''}`} onClick={() => setExpandedCard(expandedCard === 'visits' ? null : 'visits')}>
                        <div className="stat-card-header">
                            <div className="stat-card-top">
                                <div className="stat-icon clock"><FiActivity /></div>
                                {dashboardPermissions.viewTodayStats && (
                                    <div className="stat-trend up"><FiTrendingUp />&nbsp;+{stats.todayVisits} 今日</div>
                                )}
                            </div>
                            <span className="stat-value">{stats.totalVisits.toLocaleString()}</span>
                            <span className="stat-label">总访问量</span>
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
                            <span className="today-label">今日订单</span>
                        </div>
                    </div>
                    <div className="today-card">
                        <FiDollarSign />
                        <div>
                            <span className="today-value">¥{stats.todayRevenue.toFixed(2)}</span>
                            <span className="today-label">今日收入</span>
                        </div>
                    </div>
                </div>
            )}

            {/* 支付监控面板 */}
            {stats.unpaidOrders > 0 && (
                <div className="payment-monitor">
                    <div className="payment-monitor-header">
                        <h3><FiCreditCard style={{ marginRight: 8, verticalAlign: 'middle' }} />支付监控</h3>
                        <span className="payment-count">{stats.unpaidOrders} 笔待确认</span>
                    </div>
                    <div className="payment-summary-grid">
                        {Object.entries(stats.paymentMethodSummary).map(([method, data]) => (
                            <div key={method} className={`payment-summary-item ${method}`}>
                                <span className="payment-method-name">{paymentMethodLabels[method] || method}</span>
                                <span className="payment-method-count">{data.count} 笔</span>
                                <span className="payment-method-amount">¥{data.amount.toFixed(2)}</span>
                            </div>
                        ))}
                    </div>
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>订单号</th>
                                <th>商品</th>
                                <th>支付方式</th>
                                <th>金额</th>
                                <th>时间</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats.pendingPayments.slice(0, 5).map(p => (
                                <tr key={p.orderNo}>
                                    <td className="order-no">{p.orderNo}</td>
                                    <td>{p.productName}</td>
                                    <td>
                                        <span className={`payment-badge ${p.paymentMethod}`}>
                                            {paymentMethodLabels[p.paymentMethod] || p.paymentMethod || '未选择'}
                                        </span>
                                    </td>
                                    <td>
                                        ¥{p.amount.toFixed(2)}
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

            {/* 最近订单 */}
            <div className="recent-orders">
                <h3>最近订单</h3>
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>订单号</th>
                            <th>商品</th>
                            <th>金额</th>
                            <th>状态</th>
                            <th>时间</th>
                        </tr>
                    </thead>
                    <tbody>
                        {recentOrders.map(order => (
                            <tr key={order.orderNo}>
                                <td className="order-no">{order.orderNo}</td>
                                <td>{order.productName}</td>
                                <td>¥{parseFloat(order.amount || order.totalAmount || 0).toFixed(2)}</td>
                                <td>
                                    <span className={`status-badge ${order.status?.toLowerCase()}`}>
                                        {order.status === 'completed' ? '已完成' :
                                         order.status === 'pending' ? '待支付' :
                                         order.status === 'paid' ? '已支付' :
                                         order.status === 'cancelled' ? '已取消' :
                                         order.status === 'refunding' ? '退款中' :
                                         order.status === 'refunded' ? '已退款' : order.status}
                                    </span>
                                </td>
                                <td className="time">{formatTime(order.createdAt)}</td>
                            </tr>
                        ))}
                        {recentOrders.length === 0 && (
                            <tr><td colSpan="5" style={{ textAlign: 'center' }}>暂无订单</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}



// 商品管理
function ProductsManage() {
    const { showToast, showConfirm } = useToast()
    const token = useAuthStore(state => state.token)
    const navigate = useNavigate()
    const [showModal, setShowModal] = useState(false)
    const [showCategoryModal, setShowCategoryModal] = useState(false)
    const [editingProduct, setEditingProduct] = useState(null)
    const [pendingImages, setPendingImages] = useState([]) // 待上传的图片
    const [uploadProgress, setUploadProgress] = useState(0)
    const [isUploading, setIsUploading] = useState(false)
    const [products, setProducts] = useState([]) // 从 API 获取的商品
    const [categories, setCategories] = useState([]) // 分类列表
    const [loading, setLoading] = useState(true)
    const [stockMode, setStockMode] = useState('auto') // 'auto' = 库存=卡密数量, 'manual' = 手动设置
    const [newCategory, setNewCategory] = useState({ name: '', icon: '📦', description: '' })
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        fullDescription: '',
        price: '',
        originalPrice: '',
        agentBasePrice: '',
        stock: '',
        categoryId: '',
        images: [],
        tags: '',
        weight: 0,
        variants: [], // 商品规格
        wholesalePrices: [], // 批发价阶梯（无规格时用）
        wholesaleTiers: [], // 扁平批发价列表（有规格时用）
        status: 'active'
    })

    // 从 API 获取商品列表和设置
    const [stockAlertIds, setStockAlertIds] = useState([])

    useEffect(() => {
        fetchProducts()
        fetchStockMode()
        fetchStockAlertIds()
    }, [])

    const fetchStockAlertIds = async () => {
        try {
            const res = await fetch('/api/admin/stock-alert/products', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            const data = await res.json()
            setStockAlertIds(data.productIds || [])
        } catch (e) {
            console.error('获取库存警报设置失败:', e)
        }
    }

    const toggleStockAlert = async (productId) => {
        const isEnabled = stockAlertIds.includes(productId)
        const newIds = isEnabled
            ? stockAlertIds.filter(id => id !== productId)
            : [...stockAlertIds, productId]
        try {
            await fetch('/api/admin/stock-alert/products', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ productIds: newIds })
            })
            setStockAlertIds(newIds)
            showToast(isEnabled ? '已关闭库存警报' : '已开启库存警报', 'success')
        } catch (e) {
            showToast('设置失败', 'error')
        }
    }

    const fetchStockMode = async () => {
        try {
            const res = await fetch('/api/admin/settings', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            const data = await res.json()
            if (data.settings?.stockMode) {
                setStockMode(data.settings.stockMode)
            }
        } catch (error) {
            console.error('获取设置失败:', error)
        }
    }

    const fetchProducts = async () => {
        try {
            setLoading(true)
            const response = await fetch('/api/admin/products', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })
            const data = await response.json()
            setProducts(data.products || [])
        } catch (error) {
            console.error('获取商品列表失败:', error)
        } finally {
            setLoading(false)
        }
    }

    // 获取分类列表
    const fetchCategories = async () => {
        try {
            const response = await fetch('/api/admin/categories', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })
            const data = await response.json()
            setCategories(data.categories || [])
        } catch (error) {
            console.error('获取分类失败:', error)
        }
    }

    // 添加分类
    const handleAddCategory = async () => {
        if (!newCategory.name.trim()) {
            showToast('请输入分类名称', 'error')
            return
        }
        try {
            const response = await fetch('/api/admin/categories', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(newCategory)
            })
            if (!response.ok) throw new Error('添加失败')
            showToast('分类添加成功', 'success')
            setNewCategory({ name: '', icon: '📦', description: '' })
            fetchCategories()
        } catch (error) {
            showToast('添加分类失败', 'error')
        }
    }

    // 删除分类
    const handleDeleteCategory = async (categoryId, categoryName) => {
        showConfirm('删除分类', `确定要删除分类「${categoryName}」吗？`, async () => {
            try {
                const response = await fetch(`/api/admin/categories/${categoryId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                })
                if (!response.ok) throw new Error('删除失败')
                showToast('分类已删除', 'success')
                fetchCategories()
            } catch (error) {
                showToast('删除分类失败', 'error')
            }
        })
    }

    // 打开分类管理弹窗
    const openCategoryModal = () => {
        fetchCategories()
        setShowCategoryModal(true)
    }

    const handleAdd = () => {
        setEditingProduct(null)
        setPendingImages([])
        setUploadProgress(0)
        setFormData({
            name: '',
            description: '',
            fullDescription: '',
            price: '',
            originalPrice: '',
            stock: '',
            categoryId: '',
            images: [],
            tags: '',
            weight: 0,
            variants: [],
            wholesalePrices: [],
            wholesaleTiers: [],
            status: 'active',
            deliveryNote: ''
        })
        fetchCategories()
        setShowModal(true)
    }

    const handleEdit = (product) => {
        setEditingProduct(product)
        setPendingImages([])
        setUploadProgress(0)
        setFormData({
            name: product.name,
            description: product.description || '',
            fullDescription: product.fullDescription || '',
            price: product.price.toString(),
            originalPrice: product.originalPrice?.toString() || '',
            agentBasePrice: product.agentBasePrice?.toString() || '',
            stock: product.stock?.toString() || '',
            categoryId: product.categoryId || '',
            images: product.images || [],
            tags: (product.tags || []).join(', '),
            weight: product.weight || 0,
            variants: (product.variants || []).map(v => ({
                type: v.type || '',
                name: v.name,
                price: v.price.toString(),
                originalPrice: v.originalPrice?.toString() || '',
                stock: v.stock?.toString() || '0',
                wholesalePrices: []
            })),
            wholesalePrices: (product.wholesalePrices || []).map(t => ({
                _key: Math.random().toString(36).slice(2),
                minQty: t.minQty?.toString() || '',
                price: t.price?.toString() || ''
            })),
            wholesaleTiers: (product.variants || []).flatMap(v =>
                (v.wholesalePrices || []).map(t => ({
                    _key: Math.random().toString(36).slice(2),
                    variantName: v.name,
                    minQty: t.minQty?.toString() || '',
                    price: t.price?.toString() || ''
                }))
            ),
            // 自动检测是否启用规格类型分组（如果有任何规格带 type 则启用）
            enableVariantTypes: (product.variants || []).some(v => v.type && v.type.trim() !== ''),
            status: product.status?.toLowerCase() || 'active',
            deliveryNote: product.deliveryNote || ''
        })
        fetchCategories()
        setShowModal(true)
    }

    const handleDelete = (product) => {
        showConfirm(
            '删除商品',
            `确定要删除商品「${product.name}」吗？此操作不可撤销。`,
            async () => {
                try {
                    const response = await fetch(`/api/admin/products/${product.id}`, {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    })
                    if (!response.ok) {
                        throw new Error('删除失败')
                    }
                    showToast('商品已成功删除', 'success')
                    fetchProducts()
                } catch (error) {
                    showToast('删除失败: ' + error.message, 'error')
                }
            }
        )
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        // 准备商品数据
        // 提取图片路径数组
        const imagePaths = formData.images.map(img => {
            if (typeof img === 'string') return img
            return img.urls?.medium || img.urls?.original || img
        })

        const productData = {
            name: formData.name,
            description: formData.description,
            fullDescription: formData.fullDescription,
            price: parseFloat(formData.price),
            originalPrice: formData.originalPrice ? parseFloat(formData.originalPrice) : null,
            agentBasePrice: formData.agentBasePrice ? parseFloat(formData.agentBasePrice) : null,
            stock: formData.stock ? parseInt(formData.stock) : 0,
            image: imagePaths[0] || null,
            images: imagePaths,
            tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(t => t) : [],
            weight: parseInt(formData.weight) || 0,
            variants: formData.variants.filter(v => v.name && v.price).map(v => ({
                ...v,
                wholesalePrices: formData.wholesaleTiers
                    .filter(t => t.variantName === v.name && t.minQty && t.price)
                    .map(t => ({ minQty: parseInt(t.minQty), price: parseFloat(t.price) }))
            })),
            wholesalePrices: formData.wholesalePrices
                .filter(t => t.minQty && t.price)
                .map(t => ({ minQty: parseInt(t.minQty), price: parseFloat(t.price) })),
            status: formData.status?.toUpperCase() || 'ACTIVE',
            deliveryNote: formData.deliveryNote || ''
        }

        // 只有选择了分类才包含 categoryId
        if (formData.categoryId && formData.categoryId !== '') {
            productData.categoryId = formData.categoryId
        }

        try {
            const url = editingProduct
                ? `/api/admin/products/${editingProduct.id}`
                : '/api/admin/products'

            const response = await fetch(url, {
                method: editingProduct ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(productData)
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || '操作失败')
            }

            if (editingProduct) {
                showToast('商品更新成功', 'success')
            } else {
                showToast('商品添加成功', 'success')
            }
            setShowModal(false)
            // 刷新页面以显示新商品（临时方案）
            fetchProducts()
        } catch (error) {
            showToast('操作失败: ' + error.message, 'error')
        }
    }

    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    // 处理图片选择
    const handleImageSelect = async (e) => {
        const files = Array.from(e.target.files)
        if (files.length === 0) return

        // 验证并生成预览
        const newPending = []
        for (const file of files) {
            if (!file.type.startsWith('image/')) {
                showToast(`${file.name} 不是图片文件`, 'warning')
                continue
            }
            if (file.size > 5 * 1024 * 1024) {
                showToast(`${file.name} 超过 5MB`, 'warning')
                continue
            }
            // 生成预览
            const preview = await new Promise((resolve) => {
                const reader = new FileReader()
                reader.onload = (ev) => resolve(ev.target.result)
                reader.readAsDataURL(file)
            })
            newPending.push({ file, preview, name: file.name })
        }
        setPendingImages(prev => [...prev, ...newPending])
        e.target.value = '' // 重置 input
    }

    // 上传待上传图片
    const handleUploadImages = async () => {
        if (pendingImages.length === 0) {
            showToast('请先选择图片', 'warning')
            return
        }

        setIsUploading(true)
        setUploadProgress(0)

        try {
            const formDataUpload = new FormData()
            pendingImages.forEach(item => {
                formDataUpload.append('images', item.file)
            })

            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formDataUpload
            })

            if (!response.ok) {
                throw new Error('上传失败')
            }

            const result = await response.json()

            // 添加到已上传列表
            const newImages = result.images.map(img => ({
                fileName: img.fileName,
                urls: img.urls
            }))

            setFormData(prev => ({
                ...prev,
                images: [...prev.images, ...newImages]
            }))

            setPendingImages([])
            setUploadProgress(100)
            showToast(`成功上传 ${result.images.length} 张图片`, 'success')
        } catch (error) {
            showToast('图片上传失败: ' + error.message, 'error')
        } finally {
            setIsUploading(false)
        }
    }

    // 删除待上传图片
    const removePendingImage = (index) => {
        setPendingImages(prev => prev.filter((_, i) => i !== index))
    }

    // 删除已上传图片
    const removeUploadedImage = async (index) => {
        const image = formData.images[index]
        try {
            await fetch(`/api/upload/${image.fileName}`, {
                method: 'DELETE'
            })
            setFormData(prev => ({
                ...prev,
                images: prev.images.filter((_, i) => i !== index)
            }))
            showToast('图片已删除', 'success')
        } catch (error) {
            showToast('删除失败', 'error')
        }
    }

    return (
        <div className="manage-page">
            <div className="page-header">
                <h2>商品管理</h2>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button className="btn btn-secondary" onClick={openCategoryModal}>📁 分类管理</button>
                    <button className="btn btn-primary" onClick={handleAdd}>+ 添加商品</button>
                </div>
            </div>
            <div className="products-table-wrapper">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>商品名称</th>
                            <th>价格</th>
                            <th>库存</th>
                            <th>已售</th>
                            <th>权重</th>
                            <th>评分</th>
                            <th>状态</th>
                            <th>操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="8" style={{ textAlign: 'center', padding: '40px' }}>加载中...</td></tr>
                        ) : products.length === 0 ? (
                            <tr><td colSpan="8" style={{ textAlign: 'center', padding: '40px' }}>暂无商品</td></tr>
                        ) : products.map(product => (
                            <tr key={product.id}>
                                <td>{product.name}</td>
                                <td>¥{parseFloat(product.price).toFixed(2)}</td>
                                <td>{product.stock}</td>
                                <td>{product.soldCount || 0}</td>
                                <td>
                                    <span style={{
                                        display: 'inline-block',
                                        padding: '2px 8px',
                                        borderRadius: '10px',
                                        fontSize: '0.8rem',
                                        fontWeight: 500,
                                        background: product.weight > 50 ? 'rgba(255,107,53,0.12)' : product.weight > 0 ? 'rgba(59,130,246,0.1)' : 'rgba(148,163,184,0.1)',
                                        color: product.weight > 50 ? '#ff6b35' : product.weight > 0 ? '#3b82f6' : '#94a3b8'
                                    }}>{product.weight || 0}</span>
                                </td>
                                <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <div style={{
                                            width: '40px', height: '4px', borderRadius: '2px',
                                            background: 'rgba(148,163,184,0.2)', overflow: 'hidden'
                                        }}>
                                            <div style={{
                                                width: `${Math.min(100, (product.sortScore || 0))}%`,
                                                height: '100%', borderRadius: '2px',
                                                background: (product.sortScore || 0) > 50 ? '#22c55e' : (product.sortScore || 0) > 20 ? '#f59e0b' : '#94a3b8'
                                            }} />
                                        </div>
                                        <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{(product.sortScore || 0).toFixed(1)}</span>
                                    </div>
                                </td>
                                <td>
                                    <span className={`status-badge ${product.status?.toLowerCase()}`}>
                                        {product.status === 'ACTIVE' ? '上架' : '下架'}
                                    </span>
                                </td>
                                <td className="actions">
                                    <button className="action-btn edit" onClick={() => handleEdit(product)}>编辑</button>
                                    <button className="action-btn cards" onClick={() => navigate(`/admin/cards?productId=${product.id}`)}>卡密</button>
                                    <button
                                        className={`action-btn ${stockAlertIds.includes(product.id) ? 'alert-on' : 'alert-off'}`}
                                        onClick={(e) => { e.stopPropagation(); toggleStockAlert(product.id) }}
                                        title={stockAlertIds.includes(product.id) ? '关闭库存警报' : '开启库存警报'}
                                    >
                                        {stockAlertIds.includes(product.id) ? <FiBell /> : <FiBellOff />}
                                    </button>
                                    <button className="action-btn delete" onClick={() => handleDelete(product)}>删除</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* 添加/编辑商品弹窗 */}
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>{editingProduct ? '编辑商品' : '添加商品'}</h3>
                            <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
                        </div>
                        <form onSubmit={handleSubmit} className="modal-form">
                            <div className="form-group">
                                <label>商品名称 *</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    placeholder="请输入商品名称"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>简短描述 <span style={{ color: '#999', fontWeight: 'normal' }}>(显示在商品卡片和标题下方)</span></label>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    placeholder="一句话描述商品特点"
                                    rows={2}
                                />
                            </div>
                            <div className="form-group">
                                <label>详细描述 <span style={{ color: '#999', fontWeight: 'normal' }}>(显示在商品详情页底部)</span></label>
                                <textarea
                                    name="fullDescription"
                                    value={formData.fullDescription}
                                    onChange={handleChange}
                                    placeholder="【商品说明】&#10;• 商品内容1&#10;• 商品内容2&#10;&#10;【使用方法】&#10;1. 步骤一&#10;2. 步骤二"
                                    rows={6}
                                />
                            </div>

                            {/* 商品规格 - 放在价格上方 */}
                            <div className="form-group variants-section">
                                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <span>
                                        商品规格
                                        <span style={{ color: '#999', fontWeight: 'normal', marginLeft: 8 }}>
                                            (可选，如：月卡、季卡、年卡)
                                        </span>
                                    </span>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 'normal', fontSize: '0.9rem', cursor: 'pointer' }}>
                                        <input
                                            type="checkbox"
                                            checked={formData.enableVariantTypes || false}
                                            onChange={(e) => {
                                                setFormData({ ...formData, enableVariantTypes: e.target.checked })
                                            }}
                                            style={{ width: 16, height: 16 }}
                                        />
                                        启用规格类型分组
                                    </label>
                                </label>

                                {formData.enableVariantTypes ? (
                                    /* 带类型分组的规格 */
                                    <>
                                        {(() => {
                                            // 按类型分组规格
                                            const types = [...new Set(formData.variants.map(v => v.type || '默认').filter(Boolean))]
                                            if (types.length === 0) types.push('默认')

                                            return types.map((typeName, typeIndex) => (
                                                <div key={typeIndex} className="variant-type-group" style={{
                                                    border: '1px solid var(--border-color)',
                                                    borderRadius: 8,
                                                    padding: 16,
                                                    marginBottom: 12,
                                                    background: 'var(--card-bg)'
                                                }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                                                        <span style={{ fontWeight: 500 }}>类型:</span>
                                                        <input
                                                            type="text"
                                                            value={typeName === '默认' ? '' : typeName}
                                                            placeholder="输入类型名称，如：共享、独享"
                                                            onChange={(e) => {
                                                                const oldType = typeName
                                                                const newType = e.target.value || '默认'
                                                                const newVariants = formData.variants.map(v =>
                                                                    (v.type || '默认') === oldType ? { ...v, type: newType === '默认' ? '' : newType } : v
                                                                )
                                                                setFormData({ ...formData, variants: newVariants })
                                                            }}
                                                            style={{ flex: 1 }}
                                                        />
                                                        {types.length > 1 && (
                                                            <button
                                                                type="button"
                                                                className="remove-variant-btn"
                                                                onClick={() => {
                                                                    const newVariants = formData.variants.filter(v => (v.type || '默认') !== typeName)
                                                                    setFormData({ ...formData, variants: newVariants })
                                                                }}
                                                                title="删除此类型"
                                                            >
                                                                ✕
                                                            </button>
                                                        )}
                                                    </div>

                                                    {/* 该类型下的规格列表 */}
                                                    {formData.variants
                                                        .map((v, i) => ({ ...v, originalIndex: i }))
                                                        .filter(v => (v.type || '默认') === typeName)
                                                        .map((variant) => (
                                                            <div key={variant.originalIndex} className="variant-row">
                                                                <button
                                                                    type="button"
                                                                    className="move-variant-btn"
                                                                    disabled={variant.originalIndex === 0 || (formData.variants[variant.originalIndex - 1]?.type || '') !== (variant.type || '')}
                                                                    title="上移"
                                                                    onClick={() => {
                                                                        const newVariants = [...formData.variants]
                                                                        const i = variant.originalIndex
                                                                        ;[newVariants[i - 1], newVariants[i]] = [newVariants[i], newVariants[i - 1]]
                                                                        setFormData({ ...formData, variants: newVariants })
                                                                    }}
                                                                >
                                                                    ↑
                                                                </button>
                                                                <input
                                                                    type="text"
                                                                    placeholder="规格名称"
                                                                    value={variant.name}
                                                                    onChange={(e) => {
                                                                        const newVariants = [...formData.variants]
                                                                        newVariants[variant.originalIndex].name = e.target.value
                                                                        setFormData({ ...formData, variants: newVariants })
                                                                    }}
                                                                    style={{ flex: 2 }}
                                                                />
                                                                <input
                                                                    type="number"
                                                                    placeholder="价格"
                                                                    value={variant.price}
                                                                    onChange={(e) => {
                                                                        const newVariants = [...formData.variants]
                                                                        newVariants[variant.originalIndex].price = e.target.value
                                                                        setFormData({ ...formData, variants: newVariants })
                                                                    }}
                                                                    step="0.01"
                                                                    style={{ flex: 1 }}
                                                                />
                                                                <input
                                                                    type="number"
                                                                    placeholder="原价"
                                                                    value={variant.originalPrice}
                                                                    onChange={(e) => {
                                                                        const newVariants = [...formData.variants]
                                                                        newVariants[variant.originalIndex].originalPrice = e.target.value
                                                                        setFormData({ ...formData, variants: newVariants })
                                                                    }}
                                                                    step="0.01"
                                                                    style={{ flex: 1 }}
                                                                />
                                                                <input
                                                                    type="number"
                                                                    placeholder="库存"
                                                                    value={variant.stock}
                                                                    onChange={(e) => {
                                                                        const newVariants = [...formData.variants]
                                                                        newVariants[variant.originalIndex].stock = e.target.value
                                                                        setFormData({ ...formData, variants: newVariants })
                                                                    }}
                                                                    style={{ flex: 1 }}
                                                                />
                                                                <button
                                                                    type="button"
                                                                    className="remove-variant-btn"
                                                                    onClick={() => {
                                                                        const newVariants = formData.variants.filter((_, i) => i !== variant.originalIndex)
                                                                        setFormData({ ...formData, variants: newVariants })
                                                                    }}
                                                                >
                                                                    ✕
                                                                </button>
                                                            </div>
                                                        ))}

                                                    <button
                                                        type="button"
                                                        className="add-variant-btn"
                                                        style={{ marginTop: 8 }}
                                                        onClick={() => {
                                                            setFormData({
                                                                ...formData,
                                                                variants: [...formData.variants, {
                                                                    type: typeName === '默认' ? '' : typeName,
                                                                    name: '',
                                                                    price: '',
                                                                    originalPrice: '',
                                                                    stock: '0'
                                                                }]
                                                            })
                                                        }}
                                                    >
                                                        + 添加规格
                                                    </button>
                                                </div>
                                            ))
                                        })()}

                                        <button
                                            type="button"
                                            className="add-variant-btn"
                                            style={{ background: 'transparent', border: '2px dashed var(--border-color)', color: 'var(--primary-color)' }}
                                            onClick={() => {
                                                const existingTypes = [...new Set(formData.variants.map(v => v.type || '默认'))]
                                                const newTypeName = `类型${existingTypes.length + 1}`
                                                setFormData({
                                                    ...formData,
                                                    variants: [...formData.variants, {
                                                        type: newTypeName,
                                                        name: '',
                                                        price: '',
                                                        originalPrice: '',
                                                        stock: '0'
                                                    }]
                                                })
                                            }}
                                        >
                                            + 添加类型
                                        </button>
                                    </>
                                ) : (
                                    /* 无类型分组的简单规格 */
                                    <>
                                        {formData.variants.map((variant, index) => (
                                            <div key={index} className="variant-row">
                                                <button
                                                    type="button"
                                                    className="move-variant-btn"
                                                    disabled={index === 0}
                                                    title="上移"
                                                    onClick={() => {
                                                        const newVariants = [...formData.variants]
                                                        ;[newVariants[index - 1], newVariants[index]] = [newVariants[index], newVariants[index - 1]]
                                                        setFormData({ ...formData, variants: newVariants })
                                                    }}
                                                >
                                                    ↑
                                                </button>
                                                <input
                                                    type="text"
                                                    placeholder="规格名称"
                                                    value={variant.name}
                                                    onChange={(e) => {
                                                        const newVariants = [...formData.variants]
                                                        newVariants[index].name = e.target.value
                                                        setFormData({ ...formData, variants: newVariants })
                                                    }}
                                                    style={{ flex: 2 }}
                                                />
                                                <input
                                                    type="number"
                                                    placeholder="价格"
                                                    value={variant.price}
                                                    onChange={(e) => {
                                                        const newVariants = [...formData.variants]
                                                        newVariants[index].price = e.target.value
                                                        setFormData({ ...formData, variants: newVariants })
                                                    }}
                                                    step="0.01"
                                                    style={{ flex: 1 }}
                                                />
                                                <input
                                                    type="number"
                                                    placeholder="原价"
                                                    value={variant.originalPrice}
                                                    onChange={(e) => {
                                                        const newVariants = [...formData.variants]
                                                        newVariants[index].originalPrice = e.target.value
                                                        setFormData({ ...formData, variants: newVariants })
                                                    }}
                                                    step="0.01"
                                                    style={{ flex: 1 }}
                                                />
                                                <input
                                                    type="number"
                                                    placeholder="库存"
                                                    value={variant.stock}
                                                    onChange={(e) => {
                                                        const newVariants = [...formData.variants]
                                                        newVariants[index].stock = e.target.value
                                                        setFormData({ ...formData, variants: newVariants })
                                                    }}
                                                    style={{ flex: 1 }}
                                                />
                                                <button
                                                    type="button"
                                                    className="remove-variant-btn"
                                                    onClick={() => {
                                                        const newVariants = formData.variants.filter((_, i) => i !== index)
                                                        setFormData({ ...formData, variants: newVariants })
                                                    }}
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        ))}

                                        <button
                                            type="button"
                                            className="add-variant-btn"
                                            onClick={() => {
                                                setFormData({
                                                    ...formData,
                                                    variants: [...formData.variants, { name: '', price: '', originalPrice: '', stock: '0' }]
                                                })
                                            }}
                                        >
                                            + 添加规格
                                        </button>
                                    </>
                                )}
                            </div>

                            {/* 无规格时显示价格和库存输入 */}
                            {!(formData.variants.length > 0 && formData.variants.some(v => v.name)) && (
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>售价 *</label>
                                        <input
                                            type="number"
                                            name="price"
                                            value={formData.price}
                                            onChange={handleChange}
                                            placeholder="0.00"
                                            step="0.01"
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>原价</label>
                                        <input
                                            type="number"
                                            name="originalPrice"
                                            value={formData.originalPrice}
                                            onChange={handleChange}
                                            placeholder="0.00"
                                            step="0.01"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>代理底价</label>
                                        <input
                                            type="number"
                                            name="agentBasePrice"
                                            value={formData.agentBasePrice}
                                            onChange={handleChange}
                                            placeholder="留空则使用售价"
                                            step="0.01"
                                        />
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>代理商的进货底价，留空则使用商品售价</span>
                                    </div>
                                    {stockMode === 'manual' && (
                                        <div className="form-group">
                                            <label>库存 *</label>
                                            <input
                                                type="number"
                                                name="stock"
                                                value={formData.stock}
                                                onChange={handleChange}
                                                placeholder="0"
                                                min="0"
                                                required
                                            />
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* 批发价设置 —— 独立区块，有规格时通过下拉绑定规格名称 */}
                            <div className="form-group wholesale-section">
                                <label>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle', marginRight: 6 }}>
                                        <polyline points="7 13 12 18 17 13" />
                                        <polyline points="7 6 12 11 17 6" />
                                    </svg>
                                    批发价设置
                                    <span style={{ color: '#999', fontWeight: 'normal', fontSize: '0.85rem', marginLeft: 8 }}>
                                        达到最低数量时自动应用对应单价
                                    </span>
                                </label>
                                <div className="wholesale-editor wholesale-editor--standalone wholesale-editor--open">
                                    <div className="wholesale-editor__body">
                                        {(() => {
                                            const hasVariants = formData.variants.length > 0 && formData.variants.some(v => v.name)
                                            const variantNames = hasVariants
                                                ? formData.variants.filter(v => v.name).map(v => v.name)
                                                : []

                                            const allTiers = hasVariants
                                                ? formData.wholesaleTiers
                                                : formData.wholesalePrices

                                            const updateTier = (key, field, value) => {
                                                if (hasVariants) {
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        wholesaleTiers: prev.wholesaleTiers.map(t =>
                                                            t._key === key ? { ...t, [field]: value } : t
                                                        )
                                                    }))
                                                } else {
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        wholesalePrices: prev.wholesalePrices.map(t =>
                                                            t._key === key ? { ...t, [field]: value } : t
                                                        )
                                                    }))
                                                }
                                            }

                                            const removeTier = (key) => {
                                                if (hasVariants) {
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        wholesaleTiers: prev.wholesaleTiers.filter(t => t._key !== key)
                                                    }))
                                                } else {
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        wholesalePrices: prev.wholesalePrices.filter(t => t._key !== key)
                                                    }))
                                                }
                                            }

                                            const changeVariantBinding = (key, newVariantName) => {
                                                if (!hasVariants) return
                                                setFormData(prev => ({
                                                    ...prev,
                                                    wholesaleTiers: prev.wholesaleTiers.map(t =>
                                                        t._key === key ? { ...t, variantName: newVariantName } : t
                                                    )
                                                }))
                                            }

                                            const addTier = () => {
                                                const firstVariantName = variantNames[0] || ''
                                                const newTier = {
                                                    _key: Math.random().toString(36).slice(2),
                                                    ...(hasVariants ? { variantName: firstVariantName } : {}),
                                                    minQty: '',
                                                    price: ''
                                                }
                                                if (hasVariants) {
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        wholesaleTiers: [...prev.wholesaleTiers, newTier]
                                                    }))
                                                } else {
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        wholesalePrices: [...prev.wholesalePrices, newTier]
                                                    }))
                                                }
                                            }

                                            return (
                                                <>
                                                    {allTiers.length > 0 && (
                                                        <div className={`wholesale-editor__header-row ${hasVariants ? 'wholesale-editor__header-row--with-variant' : ''}`}>
                                                            {hasVariants && (
                                                                <span className="wholesale-editor__col-label">规格</span>
                                                            )}
                                                            <span className="wholesale-editor__col-label">最少数量</span>
                                                            <span className="wholesale-editor__col-label">单价 (¥)</span>
                                                            <span />
                                                        </div>
                                                    )}
                                                    {allTiers.map((tier, idx) => (
                                                        <div key={tier._key} className={`wholesale-editor__tier-row ${hasVariants ? 'wholesale-editor__tier-row--with-variant' : ''}`}>
                                                            <span className="wholesale-editor__tier-index">{idx + 1}</span>
                                                            {hasVariants && (
                                                                <div className="wholesale-editor__input-wrap">
                                                                    <select
                                                                        className="wholesale-editor__select"
                                                                        value={tier.variantName}
                                                                        onChange={(e) => changeVariantBinding(tier._key, e.target.value)}
                                                                    >
                                                                        {variantNames.map(name => (
                                                                            <option key={name} value={name}>{name}</option>
                                                                        ))}
                                                                    </select>
                                                                </div>
                                                            )}
                                                            <div className="wholesale-editor__input-wrap">
                                                                <input
                                                                    type="number"
                                                                    className="wholesale-editor__input"
                                                                    placeholder="如：10"
                                                                    min="1"
                                                                    value={tier.minQty}
                                                                    onChange={(e) => updateTier(tier._key, 'minQty', e.target.value)}
                                                                />
                                                            </div>
                                                            <div className="wholesale-editor__input-wrap">
                                                                <input
                                                                    type="number"
                                                                    className="wholesale-editor__input"
                                                                    placeholder="如：9.90"
                                                                    min="0"
                                                                    step="0.01"
                                                                    value={tier.price}
                                                                    onChange={(e) => updateTier(tier._key, 'price', e.target.value)}
                                                                />
                                                            </div>
                                                            <button
                                                                type="button"
                                                                className="wholesale-editor__remove-btn"
                                                                onClick={() => removeTier(tier._key)}
                                                                title="删除此档位"
                                                            >
                                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                    <polyline points="3 6 5 6 21 6" />
                                                                    <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                                                                </svg>
                                                            </button>
                                                        </div>
                                                    ))}
                                                    <button
                                                        type="button"
                                                        className="wholesale-editor__add-btn"
                                                        onClick={addTier}
                                                    >
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                            <line x1="12" y1="5" x2="12" y2="19" />
                                                            <line x1="5" y1="12" x2="19" y2="12" />
                                                        </svg>
                                                        添加批发阶梯
                                                    </button>
                                                </>
                                            )
                                        })()}
                                    </div>
                                </div>
                            </div>

                            <div className="form-group">
                                <label>商品类别 *</label>
                                <CustomSelect
                                    name="categoryId"
                                    value={formData.categoryId}
                                    onChange={handleChange}
                                    placeholder="请选择类别"
                                    options={categories.map(cat => ({
                                        value: cat.id,
                                        label: `${cat.icon} ${cat.name}`
                                    }))}
                                />
                            </div>
                            <div className="form-group">
                                <label>商品标签 <span style={{ color: '#999', fontWeight: 'normal' }}>(多个标签用逗号分隔，如：热销, 推荐, 限时)</span></label>
                                <input
                                    type="text"
                                    name="tags"
                                    value={formData.tags}
                                    onChange={handleChange}
                                    placeholder="热销, 推荐, 限时优惠"
                                />
                            </div>
                            <div className="form-group">
                                <label>商品权重 <span style={{ color: '#999', fontWeight: 'normal' }}>(0-100，越高排名越靠前，默认为0)</span></label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <input
                                        type="range"
                                        name="weight"
                                        min="0"
                                        max="100"
                                        value={formData.weight}
                                        onChange={handleChange}
                                        style={{ flex: 1, cursor: 'pointer' }}
                                    />
                                    <input
                                        type="number"
                                        name="weight"
                                        min="0"
                                        max="100"
                                        value={formData.weight}
                                        onChange={handleChange}
                                        style={{ width: '80px', textAlign: 'center', padding: '6px 8px' }}
                                    />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>商品图片 <span className="upload-count">({formData.images.length} 已上传, {pendingImages.length} 待上传)</span></label>
                                <div className="image-upload-area multi">
                                    {/* 已上传的图片 */}
                                    {formData.images.map((img, index) => {
                                        // 处理不同格式的图片数据
                                        const imgUrl = typeof img === 'string'
                                            ? `${img}`
                                            : img.urls?.medium
                                                ? `${img.urls.medium}`
                                                : `${img.urls?.original || img}`
                                        return (
                                            <div key={`uploaded-${index}`} className="image-preview uploaded">
                                                <img src={imgUrl} alt={`已上传 ${index + 1}`} />
                                                <button
                                                    type="button"
                                                    className="remove-image-btn"
                                                    onClick={() => removeUploadedImage(index)}
                                                >
                                                    ×
                                                </button>
                                                <span className="image-status done">✓</span>
                                            </div>
                                        )
                                    })}

                                    {/* 待上传的图片 */}
                                    {pendingImages.map((img, index) => (
                                        <div key={`pending-${index}`} className="image-preview pending">
                                            <img src={img.preview} alt={img.name} />
                                            <button
                                                type="button"
                                                className="remove-image-btn"
                                                onClick={() => removePendingImage(index)}
                                            >
                                                ×
                                            </button>
                                            <span className="image-status pending">待传</span>
                                        </div>
                                    ))}

                                    {/* 添加图片按钮 */}
                                    <label className="upload-add-btn">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            multiple
                                            onChange={handleImageSelect}
                                            style={{ display: 'none' }}
                                        />
                                        <div className="upload-add-content">
                                            <FiImage className="upload-icon" />
                                            <span>添加图片</span>
                                        </div>
                                    </label>
                                </div>

                                {/* 上传按钮和进度 */}
                                {pendingImages.length > 0 && (
                                    <div className="upload-actions">
                                        <button
                                            type="button"
                                            className="btn btn-primary upload-btn"
                                            onClick={handleUploadImages}
                                            disabled={isUploading}
                                        >
                                            {isUploading ? `上传中...` : `上传 ${pendingImages.length} 张图片`}
                                        </button>
                                        {isUploading && (
                                            <div className="upload-progress-bar">
                                                <div className="upload-progress-fill" style={{ width: `${uploadProgress}%` }} />
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div className="form-group">
                                <label>发货备注 <span style={{ color: '#999', fontWeight: 'normal' }}>(发货后显示在订单页面，留空则不显示)</span></label>
                                <textarea
                                    name="deliveryNote"
                                    value={formData.deliveryNote}
                                    onChange={handleChange}
                                    placeholder="例如：请在浏览器无痕模式下登录，首次使用请修改密码..."
                                    rows={3}
                                    style={{ resize: 'vertical' }}
                                />
                            </div>
                            <div className="form-group">
                                <label>状态</label>
                                <select name="status" value={formData.status} onChange={handleChange}>
                                    <option value="active">上架</option>
                                    <option value="inactive">下架</option>
                                </select>
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                                    取消
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    {editingProduct ? '保存修改' : '添加商品'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* 分类管理弹窗 */}
            {showCategoryModal && (
                <div className="modal-overlay" onClick={() => setShowCategoryModal(false)}>
                    <div className="modal-content" style={{ maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>📁 分类管理</h3>
                            <button className="modal-close" onClick={() => setShowCategoryModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            {/* 添加新分类 */}
                            <div style={{ marginBottom: '20px', padding: '16px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                                <h4 style={{ marginBottom: '12px', fontSize: '14px', color: 'var(--text-secondary)' }}>添加新分类</h4>
                                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                                    <input
                                        type="text"
                                        placeholder="图标 (emoji)"
                                        value={newCategory.icon}
                                        onChange={e => setNewCategory(prev => ({ ...prev, icon: e.target.value }))}
                                        className="input"
                                        style={{ width: '80px', textAlign: 'center', fontSize: '20px' }}
                                    />
                                    <input
                                        type="text"
                                        placeholder="分类名称"
                                        value={newCategory.name}
                                        onChange={e => setNewCategory(prev => ({ ...prev, name: e.target.value }))}
                                        className="input"
                                        style={{ flex: 1 }}
                                    />
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <input
                                        type="text"
                                        placeholder="分类描述 (可选)"
                                        value={newCategory.description}
                                        onChange={e => setNewCategory(prev => ({ ...prev, description: e.target.value }))}
                                        className="input"
                                        style={{ flex: 1 }}
                                    />
                                    <button className="btn btn-primary" onClick={handleAddCategory}>添加</button>
                                </div>
                            </div>

                            {/* 分类列表 */}
                            <div>
                                <h4 style={{ marginBottom: '12px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                                    现有分类 ({categories.length})
                                </h4>
                                {categories.length === 0 ? (
                                    <p style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '20px' }}>暂无分类</p>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {categories.map(cat => (
                                            <div key={cat.id} style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                padding: '12px 16px',
                                                background: 'var(--bg-secondary)',
                                                borderRadius: '8px',
                                                border: '1px solid var(--border-color)'
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <span style={{ fontSize: '24px' }}>{cat.icon}</span>
                                                    <div>
                                                        <div style={{ fontWeight: '500' }}>{cat.name}</div>
                                                        <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                                                            {cat.productCount || 0} 个商品
                                                        </div>
                                                    </div>
                                                </div>
                                                <button
                                                    className="action-btn delete"
                                                    onClick={() => handleDeleteCategory(cat.id, cat.name)}
                                                    style={{ padding: '6px 12px' }}
                                                >
                                                    删除
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

// 订单管理
function OrdersManage() {
    const location = useLocation()
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
    const [shipping, setShipping] = useState(null) // 正在发货的订单ID
    const [currentPage, setCurrentPage] = useState(1)
    const [totalOrders, setTotalOrders] = useState(0)
    const [totalPages, setTotalPages] = useState(1)
    const pageSize = 20
    const [searchInput, setSearchInput] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')
    const searchTimer = useRef(null)
    const [searching, setSearching] = useState(false)

    // 搜索防抖：输入后 500ms 才触发查询
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

    // 卡密输入弹窗状态
    const [showCardInputModal, setShowCardInputModal] = useState(false)
    const [cardInputOrder, setCardInputOrder] = useState(null)
    const [cardInputContent, setCardInputContent] = useState('')
    const [isResendMode, setIsResendMode] = useState(false) // 补发模式

    useEffect(() => {
        setCurrentPage(1)
    }, [statusFilter, userIdFilter, debouncedSearch])

    useEffect(() => {
        fetchOrders()
    }, [statusFilter, currentPage, userIdFilter, debouncedSearch])

    const fetchOrders = async () => {
        // 初次加载显示loading，搜索时不显示全页loading
        if (!orders.length) setLoading(true)
        try {
            const params = new URLSearchParams({ page: currentPage, pageSize })
            if (statusFilter !== 'all') params.append('status', statusFilter)
            if (userIdFilter) params.append('userId', userIdFilter)
            if (debouncedSearch.trim()) params.append('search', debouncedSearch.trim())
            const res = await fetch(`/api/admin/orders?${params}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            const data = await res.json()
            setOrders(data.orders || [])
            setTotalOrders(data.total || 0)
            setTotalPages(Math.ceil((data.total || 0) / pageSize))
        } catch (error) {
            console.error('获取订单失败:', error)
        } finally {
            setLoading(false)
            setSearching(false)
        }
    }

    // 执行发货请求
    const doShip = async (orderId, cardContent = null) => {
        setShipping(orderId)
        try {
            const body = cardContent ? { cardContent } : {}
            const res = await fetch(`/api/admin/orders/${orderId}/ship`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            })
            const data = await res.json()

            if (res.ok) {
                showToast(data.emailSent ? '发货成功，邮件已发送' : '发货成功，邮件发送失败', data.emailSent ? 'success' : 'warning')
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
                showToast(data.error || '发货失败', 'error')
            }
        } catch (error) {
            showToast('发货失败', 'error')
        } finally {
            setShipping(null)
        }
    }

    // 点击发货按钮，直接弹出发货弹窗
    const handleShip = (order) => {
        setCardInputOrder(order)
        setCardInputContent('')
        setIsResendMode(false)
        setShowCardInputModal(true)
    }

    // 提交发货
    const handleSubmitShip = async () => {
        await doShip(cardInputOrder.id, cardInputContent || null)
    }

    // 点击补发按钮
    const handleResend = (order) => {
        setCardInputOrder(order)
        setCardInputContent('')
        setIsResendMode(true)
        setShowCardInputModal(true)
    }

    // 提交补发
    const handleSubmitResend = async () => {
        setShipping(cardInputOrder.id)
        try {
            const res = await fetch(`/api/admin/orders/${cardInputOrder.id}/resend`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ cardContent: cardInputContent })
            })
            const data = await res.json()
            if (res.ok) {
                showToast(data.emailSent ? `补发成功（共${data.totalCards}个卡密），邮件已发送` : '补发成功，但邮件发送失败', data.emailSent ? 'success' : 'warning')
                setShowCardInputModal(false)
                setCardInputOrder(null)
                setCardInputContent('')
                setIsResendMode(false)
                fetchOrders()
            } else {
                showToast(data.error || '补发失败', 'error')
            }
        } catch (error) {
            showToast('补发失败', 'error')
        } finally {
            setShipping(null)
        }
    }

    const formatTime = (dateStr) => {
        if (!dateStr) return '-'
        return new Date(dateStr).toLocaleString()
    }

    // 退款操作
    const handleRefund = (order) => {
        showConfirm(
            '退款确认',
            `确定将订单「${order.orderNo}」标记为退款中吗？确认后会进入待退款状态，点击“已退款”后才会最终释放卡密回库存。`,
            async () => {
                try {
                    const res = await fetch(`/api/admin/orders/${order.id}/refund`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}` }
                    })
                    const data = await res.json()
                    if (res.ok) {
                        showToast(data.message || '订单已标记为退款中', 'success')
                        fetchOrders()
                    } else {
                        showToast(data.error || '退款失败', 'error')
                    }
                } catch (error) {
                    showToast('退款失败', 'error')
                }
            },
            '确认退款中'
        )
    }

    const handleCompleteRefund = (order) => {
        showConfirm(
            '完成退款',
            `确定将订单「${order.orderNo}」标记为已退款吗？完成后会释放关联卡密回库存。`,
            async () => {
                try {
                    const res = await fetch(`/api/admin/orders/${order.id}/refund/complete`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}` }
                    })
                    const data = await res.json()
                    if (res.ok) {
                        showToast(data.message || '订单已退款，卡密已释放', 'success')
                        fetchOrders()
                    } else {
                        showToast(data.error || '完成退款失败', 'error')
                    }
                } catch (error) {
                    showToast('完成退款失败', 'error')
                }
            },
            '确认已退款'
        )
    }

    // 删除订单
    const handleDeleteOrder = (order) => {
        showConfirm(
            '删除订单',
            `确定要删除订单「${order.orderNo}」吗？此操作不可撤销，关联的卡密将被释放。`,
            async () => {
                try {
                    const res = await fetch(`/api/admin/orders/${order.id}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${token}` }
                    })
                    const data = await res.json()
                    if (res.ok) {
                        showToast('订单已删除', 'success')
                        fetchOrders()
                    } else {
                        showToast(data.error || '删除失败', 'error')
                    }
                } catch (error) {
                    showToast('删除失败', 'error')
                }
            },
            '确认删除'
        )
    }

    const statusMap = {
        PENDING: { label: '待支付', class: 'pending' },
        PAID: { label: '已支付', class: 'paid' },
        COMPLETED: { label: '已完成', class: 'completed' },
        CANCELLED: { label: '已取消', class: 'cancelled' },
        REFUNDING: { label: '退款中', class: 'refunding' },
        REFUNDED: { label: '已退款', class: 'refunded' }
    }

    if (loading) {
        return <div className="manage-page"><p>加载中...</p></div>
    }

    return (
        <div className="manage-page">
            <div className="page-header">
                <div className="page-header-left">
                    <h2>订单管理</h2>
                    <div className="header-stats">
                        <span className="stat-item">共 {totalOrders} 条订单</span>
                    </div>
                </div>
                <div className="filters">
                    <div className="search-box">
                        <input
                            type="text"
                            className="search-input"
                            placeholder="搜索订单号 / 邮箱 / 商品名"
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
                        <option value="all">全部状态</option>
                        <option value="PENDING">待支付</option>
                        <option value="PAID">待发货</option>
                        <option value="COMPLETED">已完成</option>
                        <option value="CANCELLED">已取消</option>
                        <option value="REFUNDING">退款中</option>
                        <option value="REFUNDED">已退款</option>
                    </select>
                </div>
            </div>
            <table className="admin-table">
                <thead>
                    <tr>
                        <th>订单号</th>
                        <th>商品</th>
                        <th>金额</th>
                        <th>邮箱</th>
                        <th>备注</th>
                        <th>状态</th>
                        <th>时间</th>
                        <th>操作</th>
                    </tr>
                </thead>
                <tbody>
                    {orders.map(order => (
                        <tr key={order.id || order.orderNo}>
                            <td className="order-no">{order.orderNo}</td>
                            <td>{order.productName}</td>
                            <td>¥{parseFloat(order.totalAmount).toFixed(2)}</td>
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
                                <span className={`status-badge ${statusMap[order.status?.toUpperCase()]?.class || order.status?.toLowerCase()}`}>
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
                                        {shipping === order.id ? '发货中...' : '发货'}
                                    </button>
                                )}
                                {order.status?.toUpperCase() === 'COMPLETED' && (
                                    <button
                                        className="action-btn ship"
                                        onClick={() => handleResend(order)}
                                    >
                                        补发
                                    </button>
                                )}
                                {isSuperAdmin && (order.status?.toUpperCase() === 'PAID' || order.status?.toUpperCase() === 'COMPLETED') && (
                                    <button
                                        className="action-btn refund"
                                        onClick={() => handleRefund(order)}
                                    >
                                        退款
                                    </button>
                                )}
                                {isSuperAdmin && order.status?.toUpperCase() === 'REFUNDING' && (
                                    <button
                                        className="action-btn refund-complete"
                                        onClick={() => handleCompleteRefund(order)}
                                    >
                                        已退款
                                    </button>
                                )}
                                <button className="action-btn view" onClick={() => window.open(`/order/${order.orderNo}`, '_blank')}>查看</button>
                                {isSuperAdmin && <button className="action-btn delete" onClick={() => handleDeleteOrder(order)}>删除</button>}
                            </td>
                        </tr>
                    ))}
                    {orders.length === 0 && (
                        <tr><td colSpan="8" style={{ textAlign: 'center' }}>暂无订单</td></tr>
                    )}
                </tbody>
            </table>

            {totalPages > 1 && (
                <div className="pagination">
                    <button
                        disabled={currentPage <= 1}
                        onClick={() => setCurrentPage(p => p - 1)}
                    >
                        ← 上一页
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
                        下一页 →
                    </button>
                    <span style={{ marginLeft: '8px', fontSize: '0.85rem', color: '#94a3b8' }}>
                        第 {currentPage}/{totalPages} 页
                    </span>
                </div>
            )}

            {/* 发货弹窗 - 优化UI */}
            {showCardInputModal && cardInputOrder && (
                <div className="ship-modal-overlay" onClick={() => setShowCardInputModal(false)}>
                    <div className="ship-modal" onClick={e => e.stopPropagation()}>
                        <div className="ship-modal-header">
                            <div className="ship-modal-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M20 12v6a2 2 0 01-2 2H6a2 2 0 01-2-2v-6M12 3v12M8 7l4-4 4 4" />
                                </svg>
                            </div>
                            <h3>{isResendMode ? '补发卡密' : '手动发货'}</h3>
                            <p className="ship-modal-subtitle">订单 {cardInputOrder.orderNo}</p>
                            <button className="ship-modal-close" onClick={() => setShowCardInputModal(false)}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M18 6L6 18M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="ship-modal-body">
                            <div className="order-info-card">
                                <div className="order-info-row">
                                    <span className="order-info-label">商品名称</span>
                                    <span className="order-info-value">{cardInputOrder.productName}</span>
                                </div>
                                <div className="order-info-row">
                                    <span className="order-info-label">购买数量</span>
                                    <span className="order-info-value highlight">{cardInputOrder.quantity} 件</span>
                                </div>
                                <div className="order-info-row">
                                    <span className="order-info-label">客户邮箱</span>
                                    <span className="order-info-value">{cardInputOrder.email}</span>
                                </div>
                                {cardInputOrder.remark && (
                                    <div className="order-info-row">
                                        <span className="order-info-label">订单备注</span>
                                        <span className="order-info-value remark-value">{cardInputOrder.remark}</span>
                                    </div>
                                )}
                            </div>

                            <div className="card-input-section">
                                <label className="card-input-label">
                                    <span className="card-icon">🎫</span>
                                    {isResendMode ? '补发卡密内容' : '卡密内容'}
                                    <span className="card-hint">{isResendMode ? '多个卡密用 --- 分隔' : (cardInputOrder.quantity === 1 ? '支持多行内容' : `用 --- 分隔多个卡密，最多 ${cardInputOrder.quantity} 个`)}</span>
                                </label>
                                <textarea
                                    className="card-input-textarea"
                                    value={cardInputContent}
                                    onChange={(e) => setCardInputContent(e.target.value)}
                                    placeholder={cardInputOrder.quantity === 1 ? '请输入卡密内容（支持多行）...' : `请输入卡密内容...\n多个卡密用 --- 分隔，例如：\n卡密1内容\n---\n卡密2内容`}
                                    rows={6}
                                    autoFocus
                                />
                            </div>

                            <div className="ship-notice">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10" />
                                    <path d="M12 16v-4M12 8h.01" />
                                </svg>
                                <span>{isResendMode ? '补发后将重新发送邮件通知客户，包含所有卡密' : '发货后将自动发送邮件通知客户，邮件中包含卡密信息'}</span>
                            </div>
                        </div>

                        <div className="ship-modal-footer">
                            <button
                                className="ship-btn ship-btn-cancel"
                                onClick={() => setShowCardInputModal(false)}
                            >
                                取消
                            </button>
                            <button
                                className="ship-btn ship-btn-confirm"
                                onClick={isResendMode ? handleSubmitResend : handleSubmitShip}
                                disabled={shipping === cardInputOrder.id || !cardInputContent.trim()}
                            >
                                {shipping === cardInputOrder.id ? (
                                    <>
                                        <span className="loading-spinner"></span>
                                        发货中...
                                    </>
                                ) : (
                                    <>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                                        </svg>
                                        {isResendMode ? '确认补发' : '确认发货'}
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

// 工单管理
function TicketsManage() {
    const { showToast } = useToast()
    const { token } = useAuthStore()
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
    const [replyContent, setReplyContent] = useState('')
    const [replying, setReplying] = useState(false)

    const statusMap = {
        OPEN: { label: '待处理', class: 'pending', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' },
        IN_PROGRESS: { label: '处理中', class: 'processing', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)' },
        PENDING_SUPER_ADMIN: { label: '待超管处理', class: 'super-admin', color: '#7c3aed', bg: 'rgba(124, 58, 237, 0.1)' },
        COMPLETED: { label: '已完成', class: 'done', color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' },
        CLOSED: { label: '已关闭', class: 'completed', color: '#64748b', bg: 'rgba(100, 116, 139, 0.1)' }
    }

    const typeMap = {
        ORDER_ISSUE: { label: '订单问题', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' },
        CARD_ISSUE: { label: '卡密问题', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.1)' },
        REFUND: { label: '退款申请', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' },
        OTHER: { label: '其他', color: '#64748b', bg: 'rgba(100, 116, 139, 0.1)' }
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
            const headers = { 'Authorization': `Bearer ${token}` }
            let listUrl
            if (noReplyFilter) {
                listUrl = `/api/tickets/admin/all?noReply=true&limit=40&page=${page}`
            } else if (statusFilter === 'all') {
                listUrl = `/api/tickets/admin/all?limit=40&page=${page}`
            } else {
                listUrl = `/api/tickets/admin/all?status=${statusFilter}&limit=40&page=${page}`
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
                completed: allTickets.filter(t => t.status === 'COMPLETED').length,
                closed: allTickets.filter(t => t.status === 'CLOSED').length,
                unread: allTickets.reduce((sum, t) => sum + (t.adminUnreadCount || 0), 0),
                noReply: allTickets.filter(t => t.status !== 'CLOSED' && t.messages?.[0]?.isAdmin === false).length
            })
        } catch (error) {
            showToast('获取工单失败', 'error')
        } finally {
            setLoading(false)
        }
    }

    const handleViewTicket = async (ticket) => {
        try {
            const res = await fetch(`/api/tickets/admin/${ticket.id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            const data = await res.json()
            setSelectedTicket(data.ticket)
            setReplyContent('')
        } catch (error) {
            showToast('获取工单详情失败', 'error')
        }
    }

    const handleReply = async () => {
        if (!replyContent.trim()) {
            showToast('请输入回复内容', 'warning')
            return
        }

        setReplying(true)
        try {
            const res = await fetch(`/api/tickets/admin/${selectedTicket.id}/reply`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ content: replyContent.trim() })
            })

            if (res.ok) {
                showToast('回复成功，已发送邮件通知用户', 'success')
                setReplyContent('')
                handleViewTicket(selectedTicket)
                fetchTickets()
            } else {
                const data = await res.json()
                showToast(data.error || '回复失败', 'error')
            }
        } catch (error) {
            showToast('回复失败', 'error')
        } finally {
            setReplying(false)
        }
    }

    const handleUpdateStatus = async (status) => {
        try {
            const res = await fetch(`/api/tickets/admin/${selectedTicket.id}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status })
            })

            if (res.ok) {
                showToast('状态更新成功', 'success')
                handleViewTicket({ id: selectedTicket.id })
                fetchTickets()
            }
        } catch (error) {
            showToast('更新状态失败', 'error')
        }
    }

    const handleSubmitToSuperAdmin = async () => {
        if (!selectedTicket || selectedTicket.status === 'PENDING_SUPER_ADMIN') return

        await handleUpdateStatus('PENDING_SUPER_ADMIN')
    }

    const handleOpenUserOrders = () => {
        const userId = selectedTicket?.user?.id
        if (!userId) {
            showToast('未找到用户信息', 'warning')
            return
        }
        window.open(`/admin/orders?userId=${encodeURIComponent(userId)}`, '_blank', 'noopener,noreferrer')
    }

    const handleOpenRelatedOrder = () => {
        const orderNo = selectedTicket?.orderNo
        if (!orderNo) {
            showToast('未找到关联订单', 'warning')
            return
        }
        window.open(`/order/${encodeURIComponent(orderNo)}`, '_blank', 'noopener,noreferrer')
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
                <div className={`ticket-stat-card ${!unreadFilter && statusFilter === 'all' ? 'active' : ''}`} onClick={() => handleStatusFilterChange('all')}>
                    <div className="stat-icon total"><FiMessageCircle /></div>
                    <div className="stat-info">
                        <span className="stat-value">{globalStats.total}</span>
                        <span className="stat-label">全部工单</span>
                    </div>
                </div>
                <div className={`ticket-stat-card ${!unreadFilter && statusFilter === 'OPEN' ? 'active' : ''}`} onClick={() => handleStatusFilterChange('OPEN')}>
                    <div className="stat-icon pending"><FiAlertCircle /></div>
                    <div className="stat-info">
                        <span className="stat-value">{globalStats.open}</span>
                        <span className="stat-label">待处理</span>
                    </div>
                </div>
                <div className={`ticket-stat-card ${!unreadFilter && statusFilter === 'IN_PROGRESS' ? 'active' : ''}`} onClick={() => handleStatusFilterChange('IN_PROGRESS')}>
                    <div className="stat-icon processing"><FiActivity /></div>
                    <div className="stat-info">
                        <span className="stat-value">{globalStats.inProgress}</span>
                        <span className="stat-label">处理中</span>
                    </div>
                </div>
                <div className={`ticket-stat-card ${!unreadFilter && statusFilter === 'PENDING_SUPER_ADMIN' ? 'active' : ''}`} onClick={() => handleStatusFilterChange('PENDING_SUPER_ADMIN')}>
                    <div className="stat-icon super-admin"><FiShield /></div>
                    <div className="stat-info">
                        <span className="stat-value">{globalStats.pendingSuperAdmin}</span>
                        <span className="stat-label">待超管处理</span>
                    </div>
                </div>
                <div className={`ticket-stat-card ${!unreadFilter && statusFilter === 'COMPLETED' ? 'active' : ''}`} onClick={() => handleStatusFilterChange('COMPLETED')}>
                    <div className="stat-icon completed"><FiCheckCircle /></div>
                    <div className="stat-info">
                        <span className="stat-value">{globalStats.completed}</span>
                        <span className="stat-label">已完成</span>
                    </div>
                </div>
                <div className={`ticket-stat-card ${!unreadFilter && statusFilter === 'CLOSED' ? 'active' : ''}`} onClick={() => handleStatusFilterChange('CLOSED')}>
                    <div className="stat-icon" style={{ background: 'rgba(100,116,139,0.1)', color: '#64748b' }}><FiCheck /></div>
                    <div className="stat-info">
                        <span className="stat-value">{globalStats.closed}</span>
                        <span className="stat-label">已关闭</span>
                    </div>
                </div>
                <div className={`ticket-stat-card unread-card ${globalStats.unread > 0 ? 'has-unread' : ''} ${unreadFilter ? 'active' : ''}`}
                    onClick={() => { setUnreadFilter(f => !f); setNoReplyFilter(false); setStatusFilter('all'); setPage(1) }}>
                    <div className="stat-icon unread"><FiMessageCircle /></div>
                    <div className="stat-info">
                        <span className="stat-value">
                            {globalStats.unread > 99 ? '99+' : globalStats.unread}
                        </span>
                        <span className="stat-label">用户未读</span>
                    </div>
                </div>
                <div className={`ticket-stat-card no-reply-card ${globalStats.noReply > 0 ? 'has-no-reply' : ''} ${noReplyFilter ? 'active' : ''}`}
                    onClick={() => { setNoReplyFilter(f => !f); setUnreadFilter(false); setStatusFilter('all'); setPage(1) }}>
                    <div className="stat-icon no-reply"><FiClock /></div>
                    <div className="stat-info">
                        <span className="stat-value">
                            {globalStats.noReply > 99 ? '99+' : globalStats.noReply}
                        </span>
                        <span className="stat-label">待回复</span>
                    </div>
                </div>
            </div>

            <div className="section-header">
                <h2>工单列表</h2>
                <div className="header-info">
                    {globalStats.unread > 0 && (
                        <span className="ticket-unread-summary">
                            {globalStats.unread > 99 ? '99+' : globalStats.unread} 条用户新消息待处理
                        </span>
                    )}
                    <span className="total-count">共 {totalCount} 条工单</span>
                    <select
                        className="filter-select"
                        value={statusFilter}
                        onChange={(e) => handleStatusFilterChange(e.target.value)}
                    >
                        <option value="all">全部状态</option>
                        <option value="OPEN">待处理</option>
                        <option value="IN_PROGRESS">处理中</option>
                        <option value="PENDING_SUPER_ADMIN">待超管处理</option>
                        <option value="COMPLETED">已完成</option>
                        <option value="CLOSED">已关闭</option>
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="loading-state">
                    <div className="loading-spinner"></div>
                    <span>加载中...</span>
                </div>
            ) : displayTickets.length === 0 ? (
                <div className="empty-state">
                    <FiMessageCircle className="empty-icon" />
                    <h3>暂无工单</h3>
                    <p>{unreadFilter ? '没有用户未读的工单' : noReplyFilter ? '没有待回复的工单' : `当前没有${statusFilter !== 'all' ? statusMap[statusFilter]?.label : ''}工单`}</p>
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
                                            {ticket.adminUnreadCount > 99 ? '99+' : ticket.adminUnreadCount} 条新消息
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
                                    {ticket.user?.email || '-'}
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
                                <button className="action-btn view">查看详情</button>
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
                    >‹ 上一页</button>
                    <span className="page-info">第 {page} / {totalPages} 页</span>
                    <button
                        className="page-btn"
                        onClick={() => setPage(p => p + 1)}
                        disabled={page === totalPages}
                    >下一页 ›</button>
                    <button
                        className="page-btn"
                        onClick={() => setPage(totalPages)}
                        disabled={page === totalPages}
                    >»</button>
                </div>
            )}

            {/* 工单详情弹窗 */}
            {selectedTicket && (
                <div className="ship-modal-overlay" onClick={() => setSelectedTicket(null)}>
                    <div className="ship-modal ticket-detail-modal" onClick={e => e.stopPropagation()}>
                        <div className="ship-modal-header">
                            <div className="ship-modal-icon">
                                <FiMessageCircle />
                            </div>
                            <h3>工单详情</h3>
                            <p className="ship-modal-subtitle">{selectedTicket.ticketNo}</p>
                            <button className="ship-modal-close" onClick={() => setSelectedTicket(null)}>
                                <FiX />
                            </button>
                        </div>

                        <div className="ship-modal-body" style={{ maxHeight: '500px', overflow: 'auto' }}>
                            {/* 工单信息 */}
                            <div className="ticket-info-grid">
                                <div className="info-item">
                                    <label>用户邮箱</label>
                                    {selectedTicket.user?.email ? (
                                        <button
                                            type="button"
                                            className="ticket-link-button"
                                            onClick={handleOpenUserOrders}
                                        >
                                            {selectedTicket.user.email}
                                        </button>
                                    ) : (
                                        <span>-</span>
                                    )}
                                </div>
                                <div className="info-item">
                                    <label>问题类型</label>
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
                                    <label>工单标题</label>
                                    <span>{selectedTicket.subject}</span>
                                </div>
                                {selectedTicket.orderNo && (
                                    <div className="info-item">
                                        <label>关联订单</label>
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
                                    <label>当前状态</label>
                                    <select
                                        value={selectedTicket.status}
                                        onChange={(e) => handleUpdateStatus(e.target.value)}
                                        className="status-select"
                                        style={{
                                            color: statusMap[selectedTicket.status]?.color,
                                            borderColor: statusMap[selectedTicket.status]?.color
                                        }}
                                    >
                                        <option value="OPEN">待处理</option>
                                        <option value="IN_PROGRESS">处理中</option>
                                        <option value="PENDING_SUPER_ADMIN">待超管处理</option>
                                        <option value="COMPLETED">已完成</option>
                                        <option value="CLOSED">已关闭</option>
                                    </select>
                                </div>
                                {selectedTicket.status !== 'CLOSED' && selectedTicket.status !== 'PENDING_SUPER_ADMIN' && (
                                    <div className="info-item">
                                        <label>超管协助</label>
                                        <button
                                            type="button"
                                            className="ticket-super-admin-button"
                                            onClick={handleSubmitToSuperAdmin}
                                        >
                                            <FiShield />
                                            提交超管处理
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* 消息列表 */}
                            <div className="ticket-messages">
                                <h4>对话记录</h4>
                                <div className="messages-container">
                                    {selectedTicket.messages?.map(msg => (
                                        <div
                                            key={msg.id}
                                            className={`message-item ${msg.isAdmin ? 'admin' : 'user'}`}
                                        >
                                            <div className="message-header">
                                                <span className="message-sender">
                                                    {msg.isAdmin ? '客服' : '用户'}
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
                                    <h4>回复工单</h4>
                                    <textarea
                                        value={replyContent}
                                        onChange={(e) => setReplyContent(e.target.value)}
                                        placeholder="输入回复内容..."
                                        className="reply-textarea"
                                    />
                                    <div className="reply-actions">
                                        <button
                                            className="btn btn-primary"
                                            onClick={handleReply}
                                            disabled={replying}
                                        >
                                            {replying ? '发送中...' : '发送回复'}
                                        </button>
                                        <span className="reply-hint">
                                            回复后将发送邮件通知用户
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

// 卡密管理
function CardsManage() {
    const { showToast } = useToast()
    const { token, user: currentUser } = useAuthStore()
    const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN'
    const location = useLocation()

    // 从URL获取初始productId
    const params = new URLSearchParams(location.search)
    const initialProductId = params.get('productId') || ''

    const [cards, setCards] = useState([])
    const [products, setProducts] = useState([])
    const [selectedProductId, setSelectedProductId] = useState(initialProductId)
    const [selectedVariantFilter, setSelectedVariantFilter] = useState('')
    const [statusFilter, setStatusFilter] = useState('')
    const [keyword, setKeyword] = useState('')
    const [keywordInput, setKeywordInput] = useState('')
    const keywordTimer = useRef(null)
    const [loading, setLoading] = useState(false)
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [total, setTotal] = useState(0)
    const [cardStats, setCardStats] = useState({
        total: 0,
        available: 0,
        sold: 0,
        expired: 0
    })
    const [showImportModal, setShowImportModal] = useState(false)
    const [importText, setImportText] = useState('')
    const [importMode, setImportMode] = useState('batch')
    const [selectedVariantId, setSelectedVariantId] = useState('')
    const [selectedCards, setSelectedCards] = useState([])
    const [editingCard, setEditingCard] = useState(null)
    const [editContent, setEditContent] = useState('')

    // 获取商品列表
    useEffect(() => {
        if (!token) return
        const fetchProducts = async () => {
            try {
                const response = await fetch('/api/admin/products?pageSize=100', {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
                const data = await response.json()
                if (response.ok && data.products) {
                    setProducts(data.products)
                }
            } catch (error) {
                console.error('获取商品列表失败:', error)
            }
        }
        fetchProducts()
    }, [token])

    // 获取卡密列表
    const fetchCards = async () => {
        if (!token) return
        setLoading(true)
        try {
            const params = new URLSearchParams({ page, pageSize: 20 })
            if (selectedProductId) params.append('productId', selectedProductId)
            if (selectedVariantFilter) params.append('variantId', selectedVariantFilter)
            if (statusFilter) params.append('status', statusFilter)
            if (keyword) params.append('keyword', keyword)

            const response = await fetch(`/api/admin/cards?${params}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            const data = await response.json()
            if (data.cards) {
                setCards(data.cards)
                setTotalPages(data.totalPages)
                setTotal(data.total)
                if (data.stats) {
                    setCardStats({
                        total: data.stats.total || 0,
                        available: data.stats.available || 0,
                        sold: data.stats.sold || 0,
                        expired: data.stats.expired || 0
                    })
                } else {
                    setCardStats({
                        total: data.total || 0,
                        available: data.cards.filter(c => c.status === 'AVAILABLE').length,
                        sold: data.cards.filter(c => c.status === 'SOLD').length,
                        expired: data.cards.filter(c => c.status === 'EXPIRED').length
                    })
                }
            }
        } catch (error) {
            showToast('获取卡密列表失败', 'error')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchCards()
    }, [selectedProductId, selectedVariantFilter, statusFilter, keyword, page, token])

    // 批量导入卡密
    const handleImport = async () => {
        if (!selectedProductId) {
            showToast('请先选择商品', 'error')
            return
        }
        // 检查商品是否有规格，有则必须选择
        const selectedProduct = products.find(p => p.id === selectedProductId)
        if (selectedProduct?.variants?.length > 0 && !selectedVariantId) {
            showToast('请选择规格', 'error')
            return
        }
        if (!importText.trim()) {
            showToast('请输入卡密内容', 'error')
            return
        }

        const cardsArray = importMode === 'single'
            ? [importText.trim()]
            : importText.split('\n').map(c => c.trim()).filter(c => c)
        if (cardsArray.length === 0) {
            showToast('没有有效的卡密', 'error')
            return
        }

        try {

            const response = await fetch('/api/admin/cards/import', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    productId: selectedProductId,
                    variantId: selectedVariantId === 'default' ? null : selectedVariantId,
                    cards: cardsArray
                })
            })
            const data = await response.json()
            if (response.ok) {
                showToast(data.message, 'success')
                setShowImportModal(false)
                setImportText('')
                fetchCards()
            } else {
                showToast(data.error, 'error')
            }
        } catch (error) {
            showToast('导入失败', 'error')
        }
    }

    // 删除单个卡密
    const handleDelete = async (id) => {
        if (!confirm('确定删除此卡密？')) return

        try {

            const response = await fetch(`/api/admin/cards/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            })
            const data = await response.json()
            if (response.ok) {
                showToast(data.message, 'success')
                fetchCards()
            } else {
                showToast(data.error, 'error')
            }
        } catch (error) {
            showToast('删除失败', 'error')
        }
    }

    // 编辑卡密
    const handleEdit = (card) => {
        setEditingCard(card)
        setEditContent(card.content)
    }

    // 保存编辑
    const handleSaveEdit = async () => {
        if (!editContent.trim()) {
            showToast('卡密内容不能为空', 'error')
            return
        }

        try {
            const response = await fetch(`/api/admin/cards/${editingCard.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ content: editContent.trim() })
            })
            const data = await response.json()
            if (response.ok) {
                showToast(data.message, 'success')
                setEditingCard(null)
                setEditContent('')
                fetchCards()
            } else {
                showToast(data.error, 'error')
            }
        } catch (error) {
            showToast('保存失败', 'error')
        }
    }

    // 批量删除
    const handleBatchDelete = async () => {
        if (selectedCards.length === 0) {
            showToast('请选择要删除的卡密', 'error')
            return
        }
        if (!confirm(`确定删除选中的 ${selectedCards.length} 个卡密？`)) return

        try {

            const response = await fetch('/api/admin/cards/batch-delete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ ids: selectedCards, productId: selectedProductId })
            })
            const data = await response.json()
            if (response.ok) {
                showToast(data.message, 'success')
                setSelectedCards([])
                fetchCards()
            } else {
                showToast(data.error, 'error')
            }
        } catch (error) {
            showToast('删除失败', 'error')
        }
    }

    // 选择/取消选择卡密
    const toggleCardSelection = (id) => {
        setSelectedCards(prev =>
            prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
        )
    }

    // 全选/取消全选
    const toggleSelectAll = () => {
        const availableCards = cards.filter(c => c.status === 'AVAILABLE')
        if (selectedCards.length === availableCards.length) {
            setSelectedCards([])
        } else {
            setSelectedCards(availableCards.map(c => c.id))
        }
    }

    const getStatusBadge = (status) => {
        switch (status) {
            case 'AVAILABLE': return <span className="badge badge-success">可用</span>
            case 'SOLD': return <span className="badge badge-warning">已售</span>
            case 'EXPIRED': return <span className="badge badge-danger">过期</span>
            default: return <span className="badge">{status}</span>
        }
    }

    const selectedProduct = products.find(p => p.id === selectedProductId)
    const productVariants = selectedProduct?.variants || []

    return (
        <div className="manage-page">
            <div className="page-header">
                <h2>卡密管理</h2>
                <div className="header-actions">
                    {isSuperAdmin && selectedCards.length > 0 && (
                        <button className="btn btn-danger" onClick={handleBatchDelete}>
                            删除选中 ({selectedCards.length})
                        </button>
                    )}
                    <button
                        className="btn btn-primary"
                        onClick={() => { setShowImportModal(true); setImportText(''); setImportMode('batch') }}
                    >
                        + 导入卡密
                    </button>
                </div>
            </div>

            <div className="cards-stats-grid">
                <div className="cards-stat-card total">
                    <div className="cards-stat-label">卡密总数</div>
                    <div className="cards-stat-value">{cardStats.total}</div>
                </div>
                <div className="cards-stat-card available">
                    <div className="cards-stat-label">可用剩余</div>
                    <div className="cards-stat-value">{cardStats.available}</div>
                </div>
                <div className="cards-stat-card sold">
                    <div className="cards-stat-label">已使用</div>
                    <div className="cards-stat-value">{cardStats.sold}</div>
                </div>
                <div className="cards-stat-card expired">
                    <div className="cards-stat-label">已过期</div>
                    <div className="cards-stat-value">{cardStats.expired}</div>
                </div>
            </div>

            {/* 筛选栏 */}
            <div className="filter-bar">
                <div className="filter-group">
                    <label>选择商品</label>
                    <select
                        value={selectedProductId}
                        onChange={(e) => {
                            setSelectedProductId(e.target.value)
                            setSelectedVariantFilter('')
                            setPage(1)
                            setSelectedCards([])
                        }}
                    >
                        <option value="">全部商品</option>
                        {products.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                </div>
                <div className="filter-group">
                    <label>规格</label>
                    <select
                        value={selectedVariantFilter}
                        onChange={(e) => { setSelectedVariantFilter(e.target.value); setPage(1); }}
                        disabled={!selectedProductId}
                    >
                        <option value="">全部规格</option>
                        <option value="default">默认规格</option>
                        {productVariants.map(v => (
                            <option key={v.id} value={v.id}>{v.name}</option>
                        ))}
                    </select>
                </div>
                <div className="filter-group">
                    <label>状态</label>
                    <select
                        value={statusFilter}
                        onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                    >
                        <option value="">全部状态</option>
                        <option value="AVAILABLE">可用</option>
                        <option value="SOLD">已售</option>
                        <option value="EXPIRED">过期</option>
                    </select>
                </div>
                <div className="filter-group">
                    <label>搜索</label>
                    <input
                        type="text"
                        className="filter-search-input"
                        placeholder="卡密内容 / 订单号"
                        value={keywordInput}
                        onChange={(e) => {
                            setKeywordInput(e.target.value)
                            clearTimeout(keywordTimer.current)
                            keywordTimer.current = setTimeout(() => {
                                setKeyword(e.target.value)
                                setPage(1)
                            }, 400)
                        }}
                    />
                </div>
                <div className="filter-info">
                    共 {total} 条记录
                </div>
            </div>

            {/* 卡密列表 */}
            {loading ? (
                <div className="loading-state">加载中...</div>
            ) : cards.length === 0 ? (
                <div className="placeholder-content">
                    <FiCreditCard />
                    <p>{selectedProductId ? '该商品暂无卡密' : '选择商品后可管理对应卡密'}</p>
                </div>
            ) : (
                <>
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th style={{ width: '40px' }}>
                                        <input
                                            type="checkbox"
                                            checked={selectedCards.length > 0 && selectedCards.length === cards.filter(c => c.status === 'AVAILABLE').length}
                                            onChange={toggleSelectAll}
                                        />
                                    </th>
                                    <th>卡密内容</th>
                                    <th>商品</th>
                                    <th>规格</th>
                                    <th>状态</th>
                                    <th>订单号</th>
                                    <th>创建时间</th>
                                    <th>操作</th>
                                </tr>
                            </thead>
                            <tbody>
                                {cards.map(card => (
                                    <tr key={card.id}>
                                        <td>
                                            {card.status === 'AVAILABLE' && (
                                                <input
                                                    type="checkbox"
                                                    checked={selectedCards.includes(card.id)}
                                                    onChange={() => toggleCardSelection(card.id)}
                                                />
                                            )}
                                        </td>
                                        <td>
                                            <code className="card-content">{card.content.length > 50 ? card.content.substring(0, 50) + '...' : card.content}</code>
                                        </td>
                                        <td>{card.product?.name || '-'}</td>
                                        <td>{card.variant?.name || '-'}</td>
                                        <td>{getStatusBadge(card.status)}</td>
                                        <td>{card.order?.orderNo || '-'}</td>
                                        <td>{new Date(card.createdAt).toLocaleString('zh-CN')}</td>
                                        <td>
                                            {card.status === 'AVAILABLE' && (
                                                <div className="actions">
                                                    <button
                                                        className="btn btn-sm btn-secondary"
                                                        onClick={() => handleEdit(card)}
                                                    >
                                                        编辑
                                                    </button>
                                                    {isSuperAdmin && (
                                                        <button
                                                            className="btn btn-sm btn-danger"
                                                            onClick={() => handleDelete(card.id)}
                                                        >
                                                            删除
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* 分页 */}
                    {totalPages > 1 && (
                        <div className="pagination">
                            <button
                                disabled={page === 1}
                                onClick={() => setPage(p => p - 1)}
                            >
                                上一页
                            </button>
                            <span>第 {page} / {totalPages} 页</span>
                            <button
                                disabled={page === totalPages}
                                onClick={() => setPage(p => p + 1)}
                            >
                                下一页
                            </button>
                        </div>
                    )}
                </>
            )}

            {/* 导入弹窗 */}
            {showImportModal && (
                <div className="modal-overlay" onClick={() => setShowImportModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>{importMode === 'single' ? '添加卡密' : '批量导入卡密'}</h3>
                            <button className="modal-close" onClick={() => setShowImportModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            {/* 输入模式切换 */}
                            <div className="import-mode-toggle">
                                <button
                                    className={`mode-btn ${importMode === 'single' ? 'active' : ''}`}
                                    onClick={() => { setImportMode('single'); setImportText('') }}
                                >
                                    单个输入
                                </button>
                                <button
                                    className={`mode-btn ${importMode === 'batch' ? 'active' : ''}`}
                                    onClick={() => { setImportMode('batch'); setImportText('') }}
                                >
                                    批量输入
                                </button>
                            </div>
                            <div className="form-group">
                                <label>目标商品</label>
                                <select
                                    value={selectedProductId}
                                    onChange={(e) => {
                                        setSelectedProductId(e.target.value)
                                        setSelectedVariantId('')
                                    }}
                                >
                                    <option value="">请选择商品</option>
                                    {products.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>
                            {/* 规格选择 - 当商品有规格时必须选择 */}
                            {selectedProductId && products.find(p => p.id === selectedProductId)?.variants?.length > 0 && (
                                <div className="form-group">
                                    <label>目标规格 <span className="required">*</span></label>
                                    <select
                                        value={selectedVariantId}
                                        onChange={(e) => setSelectedVariantId(e.target.value)}
                                    >
                                        <option value="">请选择规格</option>
                                        <option value="default">默认 (¥{products.find(p => p.id === selectedProductId)?.price})</option>
                                        {products.find(p => p.id === selectedProductId)?.variants?.map(v => (
                                            <option key={v.id} value={v.id}>{v.name} (¥{v.price})</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            <div className="form-group">
                                <>
                                    <label>
                                        卡密内容{' '}
                                        <span className="hint">
                                            {importMode === 'single' ? '(换行不影响，整体为一个卡密)' : '(每行一个卡密)'}
                                        </span>
                                    </label>
                                    <textarea
                                        className="card-import-textarea"
                                        value={importText}
                                        onChange={(e) => setImportText(e.target.value)}
                                        placeholder={importMode === 'single'
                                            ? '请输入卡密内容，支持多行...'
                                            : '请输入卡密，每行一个\n例如：\nABC123-DEF456\nXYZ789-GHI012'
                                        }
                                    />
                                </>
                            </div>
                            <div className="import-preview">
                                {importMode === 'single'
                                    ? (importText.trim() ? '将导入：1 个卡密' : '将导入：0 个卡密')
                                    : `预计导入：${importText.split('\n').filter(c => c.trim()).length} 个卡密`
                                }
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowImportModal(false)}>取消</button>
                            <button className="btn btn-primary" onClick={handleImport}>确认导入</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 编辑弹窗 */}
            {editingCard && (
                <div className="modal-overlay" onClick={() => setEditingCard(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>编辑卡密</h3>
                            <button className="modal-close" onClick={() => setEditingCard(null)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label>卡密内容</label>
                                <textarea
                                    value={editContent}
                                    onChange={(e) => setEditContent(e.target.value)}
                                    rows={5}
                                    placeholder="请输入卡密内容"
                                />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setEditingCard(null)}>取消</button>
                            <button className="btn btn-primary" onClick={handleSaveEdit}>保存</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

// 用户管理
function UsersManage() {
    const navigate = useNavigate()
    const { showToast, showConfirm } = useToast()
    const token = useAuthStore(state => state.token)
    const currentUser = useAuthStore(state => state.user)
    const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN'
    const [users, setUsers] = useState([])
    const [initialLoading, setInitialLoading] = useState(true)
    const [searching, setSearching] = useState(false)
    const [searchInput, setSearchInput] = useState('')
    const [searchTerm, setSearchTerm] = useState('')
    const [roleFilter, setRoleFilter] = useState('all')
    const [currentPage, setCurrentPage] = useState(1)
    const [totalUsers, setTotalUsers] = useState(0)
    const [adminCount, setAdminCount] = useState(0)
    const [totalPages, setTotalPages] = useState(1)
    const pageSize = 20
    const searchTimerRef = useRef(null)
    const [showCreateAdmin, setShowCreateAdmin] = useState(false)
    const [newAdmin, setNewAdmin] = useState({ email: '', password: '', username: '' })
    const [creating, setCreating] = useState(false)

    // 统一用 ref 追踪最新值，避免闭包陷阱
    const searchTermRef = useRef(searchTerm)
    const roleFilterRef = useRef(roleFilter)
    const currentPageRef = useRef(currentPage)
    searchTermRef.current = searchTerm
    roleFilterRef.current = roleFilter
    currentPageRef.current = currentPage

    const doFetch = async (page, search, role, isFirstLoad = false) => {
        if (isFirstLoad) setInitialLoading(true)
        else setSearching(true)
        try {
            const params = new URLSearchParams({ page, pageSize, search, role })
            const res = await fetch(`/api/admin/users?${params}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            const data = await res.json()
            setUsers(data.users || [])
            setTotalUsers(data.total || 0)
            setAdminCount((data.users || []).filter(u => u.role === 'ADMIN' || u.role === 'SUPER_ADMIN').length)
            setTotalPages(Math.ceil((data.total || 0) / pageSize))
        } catch (error) {
            showToast('获取用户列表失败', 'error')
        } finally {
            setInitialLoading(false)
            setSearching(false)
        }
    }

    // 首次加载
    useEffect(() => {
        doFetch(1, '', 'all', true)
    }, [token])

    // 翻页 / 角色筛选
    useEffect(() => {
        if (initialLoading) return
        doFetch(currentPage, searchTermRef.current, roleFilter)
    }, [currentPage, roleFilter])

    // 搜索防抖
    useEffect(() => {
        clearTimeout(searchTimerRef.current)
        searchTimerRef.current = setTimeout(() => {
            setSearchTerm(searchInput)
            if (currentPageRef.current !== 1) {
                setCurrentPage(1)
            } else {
                doFetch(1, searchInput, roleFilterRef.current)
            }
        }, 400)
        return () => clearTimeout(searchTimerRef.current)
    }, [searchInput])

    const handleChangeRole = async (userId, newRole) => {
        try {
            const res = await fetch(`/api/admin/users/${userId}/role`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: newRole })
            })
            if (res.ok) {
                showToast('角色更新成功', 'success')
                doFetch(currentPageRef.current, searchTermRef.current, roleFilterRef.current)
            } else {
                const data = await res.json()
                showToast(data.error || '角色更新失败', 'error')
            }
        } catch {
            showToast('操作失败', 'error')
        }
    }

    const handleCreateAdmin = async (e) => {
        e.preventDefault()
        if (!newAdmin.email || !newAdmin.password) {
            showToast('请填写邮箱和密码', 'error')
            return
        }
        setCreating(true)
        try {
            const res = await fetch('/api/admin/admins', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(newAdmin)
            })
            const data = await res.json()
            if (res.ok) {
                showToast('子管理员创建成功', 'success')
                setShowCreateAdmin(false)
                setNewAdmin({ email: '', password: '', username: '' })
                doFetch(currentPageRef.current, searchTermRef.current, roleFilterRef.current)
            } else {
                showToast(data.error || '创建失败', 'error')
            }
        } catch {
            showToast('创建失败', 'error')
        } finally {
            setCreating(false)
        }
    }

    const handleDeleteAdmin = (userId, username) => {
        showConfirm('移除管理员', `确定要将「${username}」从管理员中移除吗？该账号将降级为普通用户。`, async () => {
            try {
                const res = await fetch(`/api/admin/admins/${userId}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                })
                const data = await res.json()
                if (res.ok) {
                    showToast('管理员已移除', 'success')
                    doFetch(currentPageRef.current, searchTermRef.current, roleFilterRef.current)
                } else {
                    showToast(data.error || '操作失败', 'error')
                }
            } catch {
                showToast('操作失败', 'error')
            }
        })
    }

    const getRoleLabel = (role) => {
        switch (role) {
            case 'SUPER_ADMIN': return '超级管理员'
            case 'ADMIN': return '管理员'
            default: return '普通用户'
        }
    }

    if (initialLoading) {
        return (
            <div className="manage-page">
                <div className="users-skeleton">
                    <div className="users-skeleton-header" />
                    <div className="users-skeleton-toolbar" />
                    {[...Array(6)].map((_, i) => <div key={i} className="users-skeleton-row" />)}
                </div>
            </div>
        )
    }

    return (
        <div className="manage-page">
            {/* 顶部统计卡片 */}
            <div className="users-header-cards">
                <div className="users-header-card">
                    <div className="users-header-card-icon total">
                        <FiUsers size={20} />
                    </div>
                    <div>
                        <div className="users-header-card-value">{totalUsers}</div>
                        <div className="users-header-card-label">总用户数</div>
                    </div>
                </div>
                <div className="users-header-card">
                    <div className="users-header-card-icon admin">
                        <FiShield size={20} />
                    </div>
                    <div>
                        <div className="users-header-card-value">{adminCount}</div>
                        <div className="users-header-card-label">管理员</div>
                    </div>
                </div>
                <div className="users-header-card">
                    <div className="users-header-card-icon normal">
                        <FiUser size={20} />
                    </div>
                    <div>
                        <div className="users-header-card-value">{totalUsers - adminCount}</div>
                        <div className="users-header-card-label">普通用户</div>
                    </div>
                </div>
                {isSuperAdmin && (
                    <div className="users-header-card users-header-card-action" onClick={() => setShowCreateAdmin(true)}>
                        <div className="users-header-card-icon add">
                            <FiShield size={20} />
                        </div>
                        <div>
                            <div className="users-header-card-value" style={{ fontSize: '0.95rem' }}>+ 新增</div>
                            <div className="users-header-card-label">子管理员</div>
                        </div>
                    </div>
                )}
            </div>

            {/* 新增子管理员弹窗 */}
            {showCreateAdmin && (
                <div className="confirm-overlay" onClick={() => setShowCreateAdmin(false)}>
                    <div className="confirm-dialog" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
                        <h3 className="confirm-title" style={{ marginTop: 0 }}>新增子管理员</h3>
                        <form onSubmit={handleCreateAdmin}>
                            <div className="form-group">
                                <label>邮箱 *</label>
                                <input type="email" className="form-input" required value={newAdmin.email} onChange={e => setNewAdmin(p => ({ ...p, email: e.target.value }))} placeholder="admin@example.com" />
                            </div>
                            <div className="form-group">
                                <label>密码 *</label>
                                <input type="password" className="form-input" required minLength={6} value={newAdmin.password} onChange={e => setNewAdmin(p => ({ ...p, password: e.target.value }))} placeholder="至少6位" />
                            </div>
                            <div className="form-group">
                                <label>用户名</label>
                                <input type="text" className="form-input" value={newAdmin.username} onChange={e => setNewAdmin(p => ({ ...p, username: e.target.value }))} placeholder="可选" />
                            </div>
                            <div className="confirm-actions">
                                <button type="button" className="btn btn-cancel" onClick={() => setShowCreateAdmin(false)}>取消</button>
                                <button type="submit" className="btn btn-primary" disabled={creating}>{creating ? '创建中...' : '创建'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* 搜索栏 */}
            <div className="users-search-bar">
                <div className="users-search-input-wrap">
                    <FiSearch className="users-search-icon" size={16} />
                    <input
                        type="text"
                        className="users-search-input"
                        placeholder="搜索邮箱或用户名..."
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                    />
                    {searching && <span className="users-search-spinner" />}
                    {searchInput && !searching && (
                        <button className="users-search-clear" onClick={() => setSearchInput('')}>×</button>
                    )}
                </div>
                <div className="users-role-tabs">
                    {[['all', '全部'], ['USER', '普通用户'], ['ADMIN', '管理员']].map(([val, label]) => (
                        <button
                            key={val}
                            className={`users-role-tab${roleFilter === val ? ' active' : ''}`}
                            onClick={() => { setRoleFilter(val); setCurrentPage(1) }}
                        >
                            {label}
                        </button>
                    ))}
                </div>
                <div className="users-result-count">
                    {searchInput ? `找到 ${totalUsers} 个结果` : `共 ${totalUsers} 位用户`}
                </div>
            </div>

            {/* 用户列表 */}
            <div className={`users-table-wrapper${searching ? ' users-table-searching' : ''}`}>
                {users.length === 0 ? (
                    <div className="users-empty">
                        <FiUsers size={40} />
                        <p>{searchInput ? `未找到与「${searchInput}」匹配的用户` : '暂无用户'}</p>
                        {searchInput && (
                            <button className="btn btn-secondary btn-sm" onClick={() => setSearchInput('')}>清除搜索</button>
                        )}
                    </div>
                ) : (
                    <table className="admin-table users-table">
                        <thead>
                            <tr>
                                <th>用户</th>
                                <th>角色</th>
                                <th>来源</th>
                                <th>订单数</th>
                                <th>注册时间</th>
                                <th>操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(user => (
                                <tr key={user.id}>
                                    <td>
                                        <div className="user-cell">
                                            <div className="user-avatar-sm">
                                                {(user.username || user.email || 'U').charAt(0).toUpperCase()}
                                            </div>
                                            <div className="user-info-cell">
                                                <span className="user-name-cell">{user.username || '未设置'}</span>
                                                <span className="user-email-cell">{user.email}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        {isSuperAdmin && user.role !== 'SUPER_ADMIN' ? (
                                            <select
                                                className={`role-select ${(user.role || '').toLowerCase()}`}
                                                value={user.role}
                                                onChange={(e) => handleChangeRole(user.id, e.target.value)}
                                            >
                                                <option value="USER">普通用户</option>
                                                <option value="ADMIN">管理员</option>
                                            </select>
                                        ) : (
                                            <span className={`role-badge ${(user.role || '').toLowerCase()}`}>
                                                {getRoleLabel(user.role)}
                                            </span>
                                        )}
                                    </td>
                                    <td>
                                        {user.referralAgent ? (
                                            <span style={{ fontSize: '0.78rem', padding: '2px 8px', borderRadius: 6, background: '#EEF2FF', color: '#4F46E5' }}>
                                                {user.referralAgent.shopName}
                                            </span>
                                        ) : (
                                            <span style={{ fontSize: '0.78rem', color: '#D1D5DB' }}>主站</span>
                                        )}
                                    </td>
                                    <td>{user._count?.orders || 0}</td>
                                    <td className="time">{new Date(user.createdAt).toLocaleDateString('zh-CN')}</td>
                                    <td className="actions">
                                        <button className="action-btn edit" onClick={() => navigate(`/admin/orders?userId=${user.id}`)}>查看订单</button>
                                        {isSuperAdmin && user.role === 'ADMIN' && (
                                            <button className="action-btn delete" onClick={() => handleDeleteAdmin(user.id, user.username || user.email)}>移除管理</button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* 分页 */}
            {totalPages > 1 && (
                <div className="pagination">
                    <button disabled={currentPage <= 1} onClick={() => setCurrentPage(p => p - 1)}>← 上一页</button>
                    {(() => {
                        const pages = []
                        const start = Math.max(1, currentPage - 2)
                        const end = Math.min(totalPages, currentPage + 2)
                        if (start > 1) {
                            pages.push(<button key={1} onClick={() => setCurrentPage(1)} style={1 === currentPage ? { background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: 'white', borderColor: 'transparent' } : {}}>1</button>)
                            if (start > 2) pages.push(<span key="ls">...</span>)
                        }
                        for (let i = start; i <= end; i++) {
                            pages.push(<button key={i} onClick={() => setCurrentPage(i)} style={i === currentPage ? { background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: 'white', borderColor: 'transparent' } : {}}>{i}</button>)
                        }
                        if (end < totalPages) {
                            if (end < totalPages - 1) pages.push(<span key="rs">...</span>)
                            pages.push(<button key={totalPages} onClick={() => setCurrentPage(totalPages)} style={totalPages === currentPage ? { background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: 'white', borderColor: 'transparent' } : {}}>{totalPages}</button>)
                        }
                        return pages
                    })()}
                    <button disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)}>下一页 →</button>
                    <span style={{ marginLeft: '8px', fontSize: '0.85rem', color: '#94a3b8' }}>第 {currentPage}/{totalPages} 页</span>
                </div>
            )}
        </div>
    )
}

// 系统设置
// 系统设置
// 数据库备份设置子组件
function BackupSettings({ token, settings, handleChange, showToast }) {
    const [backupStatus, setBackupStatus] = useState(null)
    const [running, setRunning] = useState(false)

    useEffect(() => {
        loadBackupStatus()
    }, [])

    const loadBackupStatus = async () => {
        try {
            const res = await fetch('/api/admin/backup/status', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (res.ok) {
                const data = await res.json()
                setBackupStatus(data)
            }
        } catch (e) {
            console.error('获取备份状态失败:', e)
        }
    }

    const handleManualBackup = async () => {
        setRunning(true)
        try {
            const res = await fetch('/api/admin/backup/run', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            })
            const data = await res.json()
            if (data.success) {
                showToast(`备份完成: ${data.filename} (${data.sizeMB} MB)`, 'success')
                loadBackupStatus()
            } else {
                showToast(`备份失败: ${data.error}`, 'error')
            }
        } catch (e) {
            showToast('备份请求失败', 'error')
        } finally {
            setRunning(false)
        }
    }

    const handleRestartSchedule = async () => {
        try {
            const res = await fetch('/api/admin/backup/restart-schedule', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (res.ok) {
                showToast('备份计划已更新', 'success')
                loadBackupStatus()
            }
        } catch (e) {
            showToast('更新备份计划失败', 'error')
        }
    }

    const formatSize = (bytes) => {
        if (!bytes) return '0 B'
        if (bytes < 1024) return bytes + ' B'
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
        return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
    }

    const handleDownloadBackup = async (filename) => {
        try {
            const res = await fetch(`/api/admin/backup/download/${encodeURIComponent(filename)}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (!res.ok) {
                const data = await res.json().catch(() => ({}))
                showToast(data.error || '下载失败', 'error')
                return
            }
            const blob = await res.blob()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = filename
            document.body.appendChild(a)
            a.click()
            a.remove()
            window.URL.revokeObjectURL(url)
            showToast('备份文件下载已开始', 'success')
        } catch (e) {
            showToast('下载请求失败', 'error')
        }
    }

    return (
        <div className="settings-section">
            <h3>数据库备份</h3>



            {/* 配置与操作区 - 双栏布局 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                {/* 左栏：备份配置 */}
                <div style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.95), rgba(248,250,252,0.95))', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
                    <h4 style={{ margin: '0 0 24px', fontSize: '1rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ width: '34px', height: '34px', background: 'linear-gradient(135deg, #059669, #10b981)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>⚙️</span>
                        备份配置
                    </h4>

                    {/* 启用开关 */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 18px', background: settings.backupEnabled ? 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(5,150,105,0.04))' : 'rgba(248,250,252,0.8)', borderRadius: '14px', border: `1px solid ${settings.backupEnabled ? 'rgba(16,185,129,0.25)' : '#e2e8f0'}`, marginBottom: '16px', transition: 'all 0.2s' }}>
                        <div>
                            <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#1e293b' }}>💾 启用自动备份</div>
                            <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '3px' }}>定时自动备份 MySQL 数据库</div>
                        </div>
                        <label className="toggle-switch">
                            <input type="checkbox" checked={settings.backupEnabled} onChange={(e) => handleChange('backupEnabled', e.target.checked)} />
                            <span className="toggle-slider"></span>
                        </label>
                    </div>

                    {settings.backupEnabled && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            {/* 频率 */}
                            <div style={{ padding: '14px 18px', background: 'rgba(248,250,252,0.8)', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                                <div style={{ fontWeight: 600, fontSize: '0.82rem', color: '#475569', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>🕐 备份频率</div>
                                <select
                                    value={settings.backupFrequency}
                                    onChange={(e) => handleChange('backupFrequency', parseInt(e.target.value))}
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', background: 'white', fontSize: '0.88rem', color: '#334155', outline: 'none', cursor: 'pointer', appearance: 'auto' }}
                                >
                                    <option value={1}>每天 1 次（凌晨3点）</option>
                                    <option value={2}>每天 2 次（每12小时）</option>
                                    <option value={4}>每天 4 次（每6小时）</option>
                                    <option value={6}>每天 6 次（每4小时）</option>
                                    <option value={12}>每天 12 次（每2小时）</option>
                                    <option value={24}>每天 24 次（每小时）</option>
                                </select>
                            </div>

                            {/* 保留天数 */}
                            <div style={{ padding: '14px 18px', background: 'rgba(248,250,252,0.8)', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                                <div style={{ fontWeight: 600, fontSize: '0.82rem', color: '#475569', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>📅 备份保留天数</div>
                                <select
                                    value={settings.backupRetentionDays}
                                    onChange={(e) => handleChange('backupRetentionDays', parseInt(e.target.value))}
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', background: 'white', fontSize: '0.88rem', color: '#334155', outline: 'none', cursor: 'pointer', appearance: 'auto' }}
                                >
                                    <option value={3}>3 天</option>
                                    <option value={7}>7 天</option>
                                    <option value={14}>14 天</option>
                                    <option value={30}>30 天</option>
                                    <option value={60}>60 天</option>
                                    <option value={90}>90 天</option>
                                </select>
                                <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '6px' }}>超过保留天数的备份将自动清理</div>
                            </div>

                            {/* 邮件推送 */}
                            <div style={{ padding: '14px 18px', background: settings.backupEmailEnabled ? 'linear-gradient(135deg, rgba(59,130,246,0.06), rgba(37,99,235,0.03))' : 'rgba(248,250,252,0.8)', borderRadius: '14px', border: `1px solid ${settings.backupEmailEnabled ? 'rgba(59,130,246,0.2)' : '#e2e8f0'}`, transition: 'all 0.2s' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: '0.82rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>📧 邮件推送</div>
                                        <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>备份完成后发送通知（附带SQL文件）</div>
                                    </div>
                                    <label className="toggle-switch">
                                        <input type="checkbox" checked={settings.backupEmailEnabled} onChange={(e) => handleChange('backupEmailEnabled', e.target.checked)} />
                                        <span className="toggle-slider"></span>
                                    </label>
                                </div>

                                {settings.backupEmailEnabled && (
                                    <div style={{ marginTop: '12px' }}>
                                        <div style={{ fontWeight: 500, fontSize: '0.78rem', color: '#64748b', marginBottom: '6px' }}>接收邮箱</div>
                                        <input
                                            type="email"
                                            value={settings.backupEmail}
                                            onChange={(e) => handleChange('backupEmail', e.target.value)}
                                            placeholder="admin@example.com"
                                            style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', background: 'white', fontSize: '0.88rem', color: '#334155', outline: 'none', boxSizing: 'border-box' }}
                                        />
                                        <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '5px' }}>≤25MB 以附件发送，超过则仅通知</div>
                                    </div>
                                )}
                            </div>

                            {/* 应用按钮 */}
                            <button
                                onClick={handleRestartSchedule}
                                style={{ marginTop: '4px', width: '100%', padding: '13px', borderRadius: '12px', fontSize: '0.9rem', background: 'linear-gradient(135deg, #059669, #10b981)', border: 'none', cursor: 'pointer', color: 'white', fontWeight: 600, boxShadow: '0 4px 12px rgba(16,185,129,0.3)', transition: 'all 0.2s', letterSpacing: '0.3px' }}
                            >
                                🔄 保存并应用备份计划
                            </button>
                        </div>
                    )}
                </div>

                {/* 右栏：备份状态与文件 */}
                <div style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.95), rgba(248,250,252,0.95))', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column' }}>
                    <h4 style={{ margin: '0 0 20px', fontSize: '1rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ width: '32px', height: '32px', background: 'linear-gradient(135deg, #2563eb, #3b82f6)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>📋</span>
                        备份记录
                    </h4>

                    {backupStatus ? (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                            {/* 最近备份信息 */}
                            {backupStatus.lastBackup?.time && (
                                <div style={{ background: backupStatus.lastBackup.status === 'success' ? 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(5,150,105,0.05))' : 'linear-gradient(135deg, rgba(239,68,68,0.08), rgba(220,38,38,0.05))', borderRadius: '12px', padding: '14px 16px', marginBottom: '16px', border: `1px solid ${backupStatus.lastBackup.status === 'success' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}` }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: backupStatus.lastBackup.status === 'success' ? '#059669' : '#dc2626' }}>
                                            {backupStatus.lastBackup.status === 'success' ? '✅ 最近一次备份成功' : '❌ 最近一次备份失败'}
                                        </span>
                                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                            {new Date(backupStatus.lastBackup.time).toLocaleString('zh-CN')}
                                        </span>
                                    </div>
                                    {backupStatus.lastBackup.filename && (
                                        <div style={{ marginTop: '6px', fontFamily: "'SF Mono', Monaco, monospace", fontSize: '0.75rem', color: '#475569' }}>
                                            {backupStatus.lastBackup.filename}
                                        </div>
                                    )}
                                    {backupStatus.lastBackup.error && (
                                        <div style={{ marginTop: '8px', fontSize: '0.78rem', color: '#dc2626', padding: '8px 10px', background: 'rgba(239,68,68,0.08)', borderRadius: '8px' }}>
                                            {backupStatus.lastBackup.error}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* 文件列表 */}
                            {backupStatus.backups?.length > 0 ? (
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
                                        历史备份文件
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        {backupStatus.backups.slice(0, 6).map((b, i) => (
                                            <div key={b.filename} style={{
                                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                padding: '10px 14px', borderRadius: '10px',
                                                background: i % 2 === 0 ? 'rgba(248,250,252,0.8)' : 'rgba(241,245,249,0.5)',
                                                border: '1px solid rgba(226,232,240,0.6)',
                                                transition: 'all 0.15s ease'
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <span style={{ fontSize: '1.1rem' }}>💾</span>
                                                    <div>
                                                        <div style={{ fontFamily: "'SF Mono', Monaco, monospace", fontSize: '0.78rem', color: '#334155', fontWeight: 500 }}>
                                                            {b.filename}
                                                        </div>
                                                        <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '2px' }}>
                                                            {new Date(b.createdAt).toLocaleString('zh-CN')}
                                                        </div>
                                                    </div>
                                                </div>
                                                <span
                                                    onClick={() => handleDownloadBackup(b.filename)}
                                                    title="点击下载备份文件"
                                                    style={{
                                                        padding: '4px 10px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 600,
                                                        background: 'linear-gradient(135deg, rgba(59,130,246,0.1), rgba(37,99,235,0.1))',
                                                        color: '#2563eb', border: '1px solid rgba(59,130,246,0.2)',
                                                        cursor: 'pointer', transition: 'all 0.2s ease',
                                                        userSelect: 'none'
                                                    }}
                                                    onMouseEnter={e => { e.target.style.background = 'linear-gradient(135deg, #2563eb, #3b82f6)'; e.target.style.color = 'white'; e.target.style.boxShadow = '0 2px 8px rgba(37,99,235,0.3)' }}
                                                    onMouseLeave={e => { e.target.style.background = 'linear-gradient(135deg, rgba(59,130,246,0.1), rgba(37,99,235,0.1))'; e.target.style.color = '#2563eb'; e.target.style.boxShadow = 'none' }}
                                                >
                                                    ⬇ {formatSize(b.size)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', color: '#94a3b8' }}>
                                    <div style={{ fontSize: '3rem', marginBottom: '12px', opacity: 0.5 }}>📂</div>
                                    <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>暂无备份文件</div>
                                    <div style={{ fontSize: '0.8rem', marginTop: '4px' }}>启用自动备份或手动执行一次备份</div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>
                            加载中...
                        </div>
                    )}

                    {/* 手动备份按钮 */}
                    <button
                        onClick={handleManualBackup}
                        disabled={running}
                        style={{
                            marginTop: '16px', width: '100%', padding: '14px', borderRadius: '12px',
                            fontSize: '0.9rem', fontWeight: 600, cursor: running ? 'not-allowed' : 'pointer',
                            background: running ? '#94a3b8' : 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
                            color: 'white', border: 'none',
                            boxShadow: running ? 'none' : '0 4px 15px rgba(37,99,235,0.3)',
                            transition: 'all 0.2s ease',
                            opacity: running ? 0.7 : 1
                        }}
                    >
                        {running ? '⏳ 正在备份数据库...' : '🚀 立即执行备份'}
                    </button>
                </div>
            </div>
        </div>
    )
}

// ==================== 代理管理 ====================
function AgentsManage() {
    const { token } = useAuthStore()
    const { showToast, showConfirm } = useToast()
    const [agents, setAgents] = useState([])
    const [withdrawals, setWithdrawals] = useState([])
    const [loading, setLoading] = useState(true)
    const [tab, setTab] = useState('agents') // agents | withdrawals | skinPool
    const [skinPool, setSkinPool] = useState([])
    const [expandedAgent, setExpandedAgent] = useState(null)

    useEffect(() => {
        if (tab === 'agents') fetchAgents()
        else if (tab === 'withdrawals') fetchWithdrawals()
        else if (tab === 'skinPool') fetchSkinPool()
    }, [tab])

    const fetchAgents = async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/admin/agents', { headers: { 'Authorization': `Bearer ${token}` } })
            const data = await res.json()
            setAgents(data.agents || [])
        } catch { showToast('加载失败', 'error') }
        setLoading(false)
    }

    const fetchWithdrawals = async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/admin/withdrawals', { headers: { 'Authorization': `Bearer ${token}` } })
            const data = await res.json()
            setWithdrawals(data.withdrawals || [])
        } catch { showToast('加载失败', 'error') }
        setLoading(false)
    }

    const fetchSkinPool = async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/admin/settings', { headers: { 'Authorization': `Bearer ${token}` } })
            const data = await res.json()
            const pool = data.settings?.agentSkinPool
            setSkinPool(pool ? JSON.parse(pool) : ['zen'])
        } catch { setSkinPool(['zen']) }
        setLoading(false)
    }

    const updateAgentStatus = async (id, status) => {
        const label = { ACTIVE: '通过', SUSPENDED: '暂停', REJECTED: '拒绝' }[status]
        showConfirm('确认操作', `确定要${label}该代理吗？`, async () => {
            try {
                await fetch(`/api/admin/agents/${id}/status`, {
                    method: 'PUT',
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status })
                })
                showToast(`代理已${label}`, 'success')
                fetchAgents()
            } catch { showToast('操作失败', 'error') }
        })
    }

    const processWithdrawal = async (id, status) => {
        const label = status === 'APPROVED' ? '通过' : '拒绝'
        showConfirm('确认操作', `确定要${label}该提现申请吗？`, async () => {
            try {
                await fetch(`/api/admin/withdrawals/${id}`, {
                    method: 'PUT',
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status })
                })
                showToast(`提现已${label}`, 'success')
                fetchWithdrawals()
            } catch { showToast('操作失败', 'error') }
        })
    }

    const saveSkinPool = async () => {
        try {
            await fetch('/api/admin/settings', {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ agentSkinPool: JSON.stringify(skinPool) })
            })
            showToast('皮肤库池已保存', 'success')
        } catch { showToast('保存失败', 'error') }
    }

    const allSkins = [
        { id: 'zen', name: 'Zen 极简', desc: '极简风格，适合单品展示' },
        { id: 'fresh', name: 'Fresh 清新', desc: '侧边栏布局，适合多品类' },
        { id: 'classic', name: '经典风格', desc: '传统导航栏，功能齐全' }
    ]

    const statusLabel = { PENDING: '待审核', ACTIVE: '已激活', SUSPENDED: '已暂停', REJECTED: '已拒绝' }
    const statusColor = { PENDING: '#F59E0B', ACTIVE: '#10B981', SUSPENDED: '#EF4444', REJECTED: '#6B7280' }
    const wStatusLabel = { PENDING: '待处理', APPROVED: '已通过', REJECTED: '已拒绝' }
    const wStatusColor = { PENDING: '#F59E0B', APPROVED: '#10B981', REJECTED: '#EF4444' }

    return (
        <div className="admin-page">
            <div className="page-header">
                <h2>代理管理</h2>
            </div>

            <div className="settings-tabs" style={{ marginBottom: 20 }}>
                <button className={`tab-btn ${tab === 'agents' ? 'active' : ''}`} onClick={() => setTab('agents')}>代理列表</button>
                <button className={`tab-btn ${tab === 'withdrawals' ? 'active' : ''}`} onClick={() => setTab('withdrawals')}>提现审核</button>
                <button className={`tab-btn ${tab === 'skinPool' ? 'active' : ''}`} onClick={() => setTab('skinPool')}>皮肤库池</button>
            </div>

            {tab === 'agents' && (
                <div className="data-table-wrapper">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>店铺名称</th>
                                <th>分站路径</th>
                                <th>用户</th>
                                <th>商品数</th>
                                <th>订单数</th>
                                <th>余额</th>
                                <th>累计收益</th>
                                <th>状态</th>
                                <th>申请时间</th>
                                <th>操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={10} style={{ textAlign: 'center', padding: 40 }}>加载中...</td></tr>
                            ) : agents.length === 0 ? (
                                <tr><td colSpan={10} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>暂无代理</td></tr>
                            ) : agents.map(a => (
                                <Fragment key={a.id}>
                                <tr onClick={() => setExpandedAgent(expandedAgent === a.id ? null : a.id)} style={{ cursor: 'pointer' }}>
                                    <td style={{ fontWeight: 600 }}>{a.shopName}</td>
                                    <td><code>/s/{a.shopSlug}</code></td>
                                    <td>{a.user?.username || a.user?.email}</td>
                                    <td>{a.productCount}</td>
                                    <td>{a.orderCount}</td>
                                    <td>¥{a.balance.toFixed(2)}</td>
                                    <td>¥{a.totalEarnings.toFixed(2)}</td>
                                    <td>
                                        <span style={{
                                            padding: '2px 8px', borderRadius: 4, fontSize: '0.78rem', fontWeight: 600,
                                            background: statusColor[a.status] + '20', color: statusColor[a.status]
                                        }}>
                                            {statusLabel[a.status]}
                                        </span>
                                    </td>
                                    <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                                        {new Date(a.createdAt).toLocaleDateString()}
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                                            {a.status === 'PENDING' && (
                                                <>
                                                    <button className="btn-sm btn-primary" onClick={() => updateAgentStatus(a.id, 'ACTIVE')}>通过</button>
                                                    <button className="btn-sm btn-danger" onClick={() => updateAgentStatus(a.id, 'REJECTED')}>拒绝</button>
                                                </>
                                            )}
                                            {a.status === 'ACTIVE' && (
                                                <button className="btn-sm btn-warning" onClick={() => updateAgentStatus(a.id, 'SUSPENDED')}>暂停</button>
                                            )}
                                            {a.status === 'SUSPENDED' && (
                                                <button className="btn-sm btn-primary" onClick={() => updateAgentStatus(a.id, 'ACTIVE')}>恢复</button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                                {expandedAgent === a.id && (
                                    <tr>
                                        <td colSpan={10} style={{ background: 'var(--bg-secondary)', padding: '16px 20px' }}>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
                                                <div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 2 }}>通知邮箱</div>
                                                    <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>{a.contactEmail || '未填写'}</div>
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 2 }}>联系方式</div>
                                                    <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>{a.contactInfo || '未填写'}</div>
                                                </div>
                                                <div style={{ gridColumn: '1 / -1' }}>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 2 }}>申请描述</div>
                                                    <div style={{ fontSize: '0.86rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{a.applyDescription || '无'}</div>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                                </Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {tab === 'withdrawals' && (
                <div className="data-table-wrapper">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>代理</th>
                                <th>金额</th>
                                <th>方式</th>
                                <th>收款账号</th>
                                <th>状态</th>
                                <th>申请时间</th>
                                <th>操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40 }}>加载中...</td></tr>
                            ) : withdrawals.length === 0 ? (
                                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>暂无提现申请</td></tr>
                            ) : withdrawals.map(w => (
                                <tr key={w.id}>
                                    <td style={{ fontWeight: 600 }}>{w.agentName}</td>
                                    <td style={{ fontWeight: 700, color: '#EF4444' }}>¥{w.amount.toFixed(2)}</td>
                                    <td>{w.method === 'alipay' ? '支付宝' : w.method === 'wechat' ? '微信' : '银行卡'}</td>
                                    <td style={{ fontSize: '0.82rem' }}>{w.account}</td>
                                    <td>
                                        <span style={{
                                            padding: '2px 8px', borderRadius: 4, fontSize: '0.78rem', fontWeight: 600,
                                            background: wStatusColor[w.status] + '20', color: wStatusColor[w.status]
                                        }}>
                                            {wStatusLabel[w.status]}
                                        </span>
                                    </td>
                                    <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                                        {new Date(w.createdAt).toLocaleDateString()}
                                    </td>
                                    <td>
                                        {w.status === 'PENDING' && (
                                            <div style={{ display: 'flex', gap: 6 }}>
                                                <button className="btn-sm btn-primary" onClick={() => processWithdrawal(w.id, 'APPROVED')}>通过</button>
                                                <button className="btn-sm btn-danger" onClick={() => processWithdrawal(w.id, 'REJECTED')}>拒绝</button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {tab === 'skinPool' && (
                <div className="settings-section">
                    <p style={{ marginBottom: 16, color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                        勾选允许代理商使用的皮肤，代理商可从已勾选的皮肤中自由选择
                    </p>
                    {allSkins.map(skin => (
                        <label key={skin.id} style={{
                            display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                            borderRadius: 10, border: `2px solid ${skinPool.includes(skin.id) ? '#4F46E5' : 'var(--border-color)'}`,
                            marginBottom: 10, cursor: 'pointer', transition: 'border-color 0.2s',
                            background: skinPool.includes(skin.id) ? '#4F46E510' : 'transparent'
                        }}>
                            <input
                                type="checkbox"
                                checked={skinPool.includes(skin.id)}
                                onChange={() => {
                                    if (skinPool.includes(skin.id)) {
                                        if (skinPool.length <= 1) return showToast('至少保留一个皮肤', 'error')
                                        setSkinPool(skinPool.filter(s => s !== skin.id))
                                    } else {
                                        setSkinPool([...skinPool, skin.id])
                                    }
                                }}
                                style={{ width: 18, height: 18 }}
                            />
                            <div>
                                <div style={{ fontWeight: 600 }}>{skin.name}</div>
                                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{skin.desc}</div>
                            </div>
                        </label>
                    ))}
                    <button onClick={saveSkinPool} style={{
                        marginTop: 16, padding: '10px 32px', borderRadius: 8, border: 'none',
                        background: '#ef4444', color: '#fff', fontSize: '0.88rem', fontWeight: 600,
                        cursor: 'pointer', width: 'auto', display: 'inline-block'
                    }} onMouseEnter={e => e.target.style.background = '#dc2626'}
                       onMouseLeave={e => e.target.style.background = '#ef4444'}>
                        保存皮肤库池
                    </button>
                </div>
            )}
        </div>
    )
}

// ==================== SSL 泛域名证书申请 ====================
function SslApplyButton({ domain, token }) {
    const [open, setOpen] = useState(false)
    const [step, setStep] = useState('idle')
    const [records, setRecords] = useState([])
    const [logs, setLogs] = useState([])
    const [certStatus, setCertStatus] = useState(null)
    const logsEndRef = useRef(null)

    const checkStatus = async () => {
        try {
            const res = await fetch(`/api/admin/ssl/status?domain=${encodeURIComponent(domain)}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            const data = await res.json()
            setCertStatus(data)
        } catch {}
    }

    const handleOpen = () => { setOpen(true); setStep('idle'); setLogs([]); setRecords([]); checkStatus() }
    const handleClose = () => { setOpen(false); setStep('idle'); setLogs([]) }

    const handleStep1 = async () => {
        setStep('step1-loading'); setLogs([])
        try {
            const res = await fetch('/api/admin/ssl/apply-step1', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ domain })
            })
            const data = await res.json()
            if (!res.ok || !data.success) { setLogs([data.error || '申请失败']); setStep('error'); return }
            setRecords(data.records || []); setStep('step1-done')
        } catch (e) { setLogs([e.message]); setStep('error') }
    }

    const handleStep2 = () => {
        setStep('step2-loading'); setLogs([])
        fetch('/api/admin/ssl/apply-step2', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ domain })
        }).then(async res => {
            const reader = res.body.getReader()
            const decoder = new TextDecoder()
            let buffer = ''
            while (true) {
                const { done, value } = await reader.read()
                if (done) break
                buffer += decoder.decode(value, { stream: true })
                const lines = buffer.split('\n'); buffer = lines.pop()
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const evt = JSON.parse(line.slice(6))
                            setLogs(prev => [...prev, evt.msg])
                            if (evt.type === 'done') setStep('step2-done')
                            if (evt.type === 'error') setStep('error')
                        } catch {}
                    }
                }
            }
        }).catch(e => { setLogs(prev => [...prev, '连接错误：' + e.message]); setStep('error') })
    }

    useEffect(() => { logsEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [logs])

    const hasCert = certStatus?.hasCert

    return (
        <>
            <button type="button" onClick={handleOpen} style={{
                flexShrink: 0, padding: '8px 14px', borderRadius: 8,
                border: hasCert ? '1px solid #10B981' : '1px solid #4F46E5',
                background: hasCert ? 'rgba(16,185,129,0.08)' : 'rgba(79,70,229,0.08)',
                color: hasCert ? '#10B981' : '#4F46E5',
                fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap'
            }}>
                {hasCert ? '🔒 续签证书' : '🔐 申请泛域名证书'}
            </button>

            {open && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 9999,
                    background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
                }} onClick={e => { if (e.target === e.currentTarget) handleClose() }}>
                    <div style={{
                        background: 'var(--bg-primary)', borderRadius: 16, width: '100%', maxWidth: 600,
                        boxShadow: '0 24px 80px rgba(0,0,0,0.3)', overflow: 'hidden'
                    }}>
                        {/* 标题 */}
                        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: '1rem' }}>🔐 申请泛域名 SSL 证书</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
                                    域名：<code style={{ color: '#4F46E5' }}>*.{domain}</code>
                                    {certStatus?.expireDate && <span style={{ marginLeft: 8, color: '#10B981' }}>· 现有证书到期：{certStatus.expireDate}</span>}
                                </div>
                            </div>
                            <button onClick={handleClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
                        </div>

                        {/* 内容 */}
                        <div style={{ padding: 24, overflowY: 'auto', maxHeight: '70vh' }}>
                            {step === 'idle' && (
                                <div>
                                    {!certStatus?.acmeInstalled && (
                                        <div style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 16, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', color: '#D97706', fontSize: '0.82rem' }}>
                                            ⚠️ 服务器未检测到 acme.sh，将在申请时自动安装。
                                        </div>
                                    )}
                                    <div style={{ fontSize: '0.88rem', lineHeight: 1.8, color: 'var(--text-secondary)' }}>
                                        <p>本向导将使用 <strong>Let's Encrypt</strong> 为 <code>*.{domain}</code> 申请免费 SSL 证书：</p>
                                        <ol style={{ paddingLeft: 20, marginTop: 8 }}>
                                            <li>点击"开始申请"，系统生成 <strong>DNS TXT 验证记录</strong></li>
                                            <li>在 DNS 面板（如 Cloudflare）添加该 TXT 记录</li>
                                            <li>等待 DNS 生效（约 5 分钟），点击"验证并颁发"</li>
                                            <li>证书自动安装到 <code>/etc/nginx/ssl/fullchain.pem</code></li>
                                        </ol>
                                        <div style={{ marginTop: 12, padding: '8px 12px', borderRadius: 6, background: 'rgba(79,70,229,0.08)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                            💡 申请前请确保 <code>*.{domain}</code> 和 <code>{domain}</code> 的 DNS A 记录已指向本服务器
                                        </div>
                                    </div>
                                    <button onClick={handleStep1} style={{ marginTop: 20, width: '100%', padding: '12px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', color: '#fff', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}>
                                        🚀 开始申请
                                    </button>
                                </div>
                            )}

                            {step === 'step1-loading' && (
                                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                                    <div style={{ fontSize: '2rem', marginBottom: 12 }}>⏳</div>
                                    <div>正在生成 DNS 验证记录...</div>
                                </div>
                            )}

                            {step === 'step1-done' && records.length > 0 && (
                                <div>
                                    <div style={{ padding: '12px 16px', borderRadius: 10, marginBottom: 20, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', color: '#10B981', fontSize: '0.85rem', fontWeight: 600 }}>
                                        ✅ 第一步完成！请在 DNS 面板添加以下 TXT 记录，然后点击下方按钮继续
                                    </div>
                                    {records.map((r, i) => (
                                        <div key={i} style={{ borderRadius: 10, border: '1px solid var(--border-color)', overflow: 'hidden', marginBottom: 12 }}>
                                            <div style={{ padding: '8px 14px', background: 'var(--bg-secondary)', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)' }}>TXT 记录 #{i + 1}</div>
                                            <div style={{ padding: '12px 14px' }}>
                                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 3 }}>主机记录（Host）</div>
                                                <code style={{ display: 'block', padding: '6px 10px', borderRadius: 6, background: 'var(--bg-secondary)', fontSize: '0.82rem', wordBreak: 'break-all', marginBottom: 10 }}>{r.host}</code>
                                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 3 }}>TXT 值</div>
                                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                                    <code style={{ flex: 1, display: 'block', padding: '6px 10px', borderRadius: 6, background: 'var(--bg-secondary)', fontSize: '0.82rem', wordBreak: 'break-all' }}>{r.value}</code>
                                                    <button onClick={() => navigator.clipboard.writeText(r.value)} style={{ flexShrink: 0, padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', cursor: 'pointer', fontSize: '0.78rem', color: 'var(--text-muted)' }}>复制</button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    <div style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 16, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', color: '#D97706', fontSize: '0.8rem' }}>
                                        ⏱️ 添加完 DNS 记录后请等待 5~10 分钟让其生效，再点击下方按钮
                                    </div>
                                    <button onClick={handleStep2} style={{ width: '100%', padding: '12px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #10B981, #059669)', color: '#fff', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}>
                                        ✅ 我已添加 TXT 记录，开始验证并颁发证书
                                    </button>
                                </div>
                            )}

                            {(step === 'step2-loading' || step === 'step2-done' || step === 'error') && (
                                <div>
                                    <div style={{ background: '#0f0f0f', borderRadius: 10, padding: 16, fontFamily: 'monospace', fontSize: '0.78rem', lineHeight: 1.6, color: '#d4d4d4', minHeight: 200, maxHeight: 360, overflowY: 'auto' }}>
                                        {logs.map((log, i) => (
                                            <div key={i} style={{ color: log.startsWith('✅') || log.startsWith('🎉') ? '#4ade80' : log.includes('失败') || log.includes('error') ? '#f87171' : '#d4d4d4' }}>{log}</div>
                                        ))}
                                        {step === 'step2-loading' && <div style={{ color: '#60a5fa' }}>▋ 处理中...</div>}
                                        <div ref={logsEndRef} />
                                    </div>
                                    {step === 'step2-done' && (
                                        <div style={{ marginTop: 16, padding: '12px 16px', borderRadius: 10, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', color: '#10B981', fontSize: '0.88rem', fontWeight: 600, textAlign: 'center' }}>
                                            🎉 泛域名证书申请成功！nginx 已自动重载。
                                        </div>
                                    )}
                                    {step === 'error' && (
                                        <button onClick={() => { setStep('idle'); setLogs([]) }} style={{ marginTop: 12, width: '100%', padding: '10px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'transparent', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>↩ 重新开始</button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}

// ==================== 租户商城管理 ====================
function TenantsManage() {
    const token = useAuthStore(state => state.token)
    const [tenants, setTenants] = useState([])
    const [total, setTotal] = useState(0)
    const [page, setPage] = useState(1)
    const [status, setStatus] = useState('')
    const [loading, setLoading] = useState(false)
    const [selected, setSelected] = useState(null)
    const [rejectReason, setRejectReason] = useState('')
    const [actionLoading, setActionLoading] = useState(false)
    const { showToast, showConfirm } = useToast()

    const fetchTenants = async () => {
        setLoading(true)
        const params = new URLSearchParams({ page, limit: 20 })
        if (status) params.set('status', status)
        const r = await fetch(`/api/admin/tenants?${params}`, { headers: { Authorization: `Bearer ${token}` } })
        const d = await r.json()
        setTenants(d.tenants || []); setTotal(d.total || 0)
        setLoading(false)
    }

    useEffect(() => { fetchTenants() }, [page, status])

    const doAction = async (id, action, body = {}) => {
        setActionLoading(true)
        const r = await fetch(`/api/admin/tenants/${id}/${action}`, {
            method: 'PUT', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        })
        const d = await r.json(); setActionLoading(false)
        if (d.message) { showToast(d.message, 'success'); fetchTenants(); setSelected(null) }
        else showToast(d.error || '操作失败', 'error')
    }

    const statusLabel = { PENDING: '待配置', REVIEWING: '审核中', ACTIVE: '运营中', SUSPENDED: '已暂停', REJECTED: '已拒绝' }
    const statusColor = { PENDING: '#F59E0B', REVIEWING: '#60A5FA', ACTIVE: '#10B981', SUSPENDED: '#EF4444', REJECTED: '#EF4444' }

    return (
        <div className="admin-section">
            <div className="section-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
                <h2>🏪 租户商城管理</h2>
                <div style={{ display:'flex', gap:8 }}>
                    {[['','全部'],['REVIEWING','审核中'],['ACTIVE','运营中'],['PENDING','待配置'],['SUSPENDED','已暂停']].map(([v,l]) => (
                        <button key={v} onClick={()=>{setStatus(v);setPage(1)}}
                            className={`tab-btn ${status===v?'active':''}`}>{l}</button>
                    ))}
                </div>
            </div>

            {selected && (
                <div style={{position:'fixed',inset:0,zIndex:1000,background:'rgba(0,0,0,0.65)',display:'flex',alignItems:'center',justifyContent:'center',padding:20}}
                    onClick={e=>e.target===e.currentTarget&&setSelected(null)}>
                    <div style={{background:'var(--bg-secondary)',borderRadius:16,width:'100%',maxWidth:560,padding:28,maxHeight:'90vh',overflowY:'auto'}}>
                        <div style={{fontSize:'1.1rem',fontWeight:700,marginBottom:20}}>🏪 {selected.shopName}</div>
                        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px 20px',marginBottom:20}}>
                            {[
                                ['店铺名称', selected.shopName],
                                ['访问路径', `/t/${selected.shopSlug}`],
                                ['用户邮箱', selected.user?.email],
                                ['绑定域名', selected.domains?.[0]?.domain || '未绑定'],
                                ['DNS验证', selected.domains?.[0]?.dnsVerified ? '✅ 已验证' : '❌ 未验证'],
                                ['商品/订单', `${selected._count?.products||0} / ${selected._count?.orders||0}`],
                                ['申请时间', new Date(selected.createdAt).toLocaleString()],
                                ['当前状态', statusLabel[selected.status]]
                            ].map(([k,v]) => (
                                <div key={k}>
                                    <div style={{fontSize:'0.72rem',color:'var(--text-muted)',marginBottom:2}}>{k}</div>
                                    <div style={{fontSize:'0.86rem'}}>{v}</div>
                                </div>
                            ))}
                        </div>
                        <div style={{display:'flex',gap:10,flexWrap:'wrap',alignItems:'center'}}>
                            {selected.status === 'REVIEWING' && (<>
                                <button className="btn btn-success" disabled={actionLoading}
                                    onClick={()=>showConfirm('批准商城',`确定批准 ${selected.shopName}？商城将即刻上线。`,()=>doAction(selected.id,'approve'))}>
                                    ✅ 批准开通
                                </button>
                                <input style={{flex:1,padding:'8px 12px',borderRadius:8,border:'1px solid var(--border-color)',background:'var(--bg-primary)',color:'var(--text-primary)',fontSize:'0.84rem'}}
                                    value={rejectReason} onChange={e=>setRejectReason(e.target.value)} placeholder="拒绝原因（可选）" />
                                <button className="btn btn-danger" disabled={actionLoading}
                                    onClick={()=>doAction(selected.id,'reject',{reason:rejectReason})}>
                                    ❌ 拒绝
                                </button>
                            </>)}
                            {selected.status === 'ACTIVE' && (
                                <button className="btn btn-warning" disabled={actionLoading}
                                    onClick={()=>showConfirm('暂停商城',`确定暂停 ${selected.shopName}？`,()=>doAction(selected.id,'suspend'))}>
                                    ⏸ 暂停运营
                                </button>
                            )}
                            {selected.status === 'SUSPENDED' && (
                                <button className="btn btn-success" disabled={actionLoading}
                                    onClick={()=>doAction(selected.id,'reactivate')}>
                                    ▶ 恢复运营
                                </button>
                            )}
                            <button className="btn" onClick={()=>setSelected(null)} style={{marginLeft:'auto'}}>关闭</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="table-container">
                {loading ? (
                    <div style={{textAlign:'center',padding:60,color:'var(--text-muted)'}}>加载中…</div>
                ) : (
                    <table className="admin-table">
                        <thead><tr>
                            <th>店铺名称</th><th>用户</th><th>绑定域名</th>
                            <th>DNS</th><th>商品/订单</th><th>状态</th><th>申请时间</th><th>操作</th>
                        </tr></thead>
                        <tbody>
                            {tenants.length === 0 ? (
                                <tr><td colSpan={8} style={{textAlign:'center',padding:40,color:'var(--text-muted)'}}>暂无租户</td></tr>
                            ) : tenants.map(t => (
                                <tr key={t.id}>
                                    <td>
                                        <div style={{fontWeight:600}}>{t.shopName}</div>
                                        <div style={{fontSize:'0.75rem',color:'var(--text-muted)'}}>/t/{t.shopSlug}</div>
                                    </td>
                                    <td style={{fontSize:'0.82rem'}}>{t.user?.email}</td>
                                    <td style={{fontSize:'0.82rem'}}>{t.domains?.[0]?.domain || <span style={{color:'var(--text-muted)'}}>未绑定</span>}</td>
                                    <td>{t.domains?.[0]?.dnsVerified ? <span style={{color:'#10B981'}}>✅</span> : <span style={{color:'var(--text-muted)'}}>—</span>}</td>
                                    <td style={{fontSize:'0.82rem'}}>{t._count?.products||0} / {t._count?.orders||0}</td>
                                    <td>
                                        <span style={{padding:'3px 10px',borderRadius:20,fontSize:'0.75rem',fontWeight:600,
                                            background:statusColor[t.status]+'22',color:statusColor[t.status]}}>
                                            {statusLabel[t.status]}
                                        </span>
                                    </td>
                                    <td style={{fontSize:'0.78rem',color:'var(--text-muted)'}}>{new Date(t.createdAt).toLocaleDateString()}</td>
                                    <td>
                                        <button className="btn btn-sm" onClick={()=>{setSelected(t);setRejectReason('')}}>
                                            详情/审核
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {total > 20 && (
                <div style={{display:'flex',gap:8,justifyContent:'center',marginTop:16}}>
                    <button className="btn" onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}>上一页</button>
                    <span style={{padding:'8px 14px',color:'var(--text-muted)',fontSize:'0.84rem'}}>{page} / {Math.ceil(total/20)}</span>
                    <button className="btn" onClick={()=>setPage(p=>p+1)} disabled={page>=Math.ceil(total/20)}>下一页</button>
                </div>
            )}
        </div>
    )
}


function SettingsPage() {
    const { token } = useAuthStore()
    const { showToast } = useToast()
    const { fetchSkin } = useSkinStore()

    // 默认设置
    const [settings, setSettings] = useState({
        // 基本设置
        siteName: 'HaoDongXi',
        siteDescription: '虚拟物品自动发卡平台',
        contactEmail: 'support@kashop.com',
        frontend_skin: 'classic',
        siteLogo: '',
        siteFavicon: '',
        agentSubdomainRoot: '',
        // 通知栏设置
        notificationEnabled: false,
        notificationText: '',
        notificationLink: '',
        // 支付设置
        alipayEnabled: true,
        wechatEnabled: true,
        usdtEnabled: false,
        bscUsdtEnabled: false,
        // USDT配置
        usdtWalletAddress: '',
        usdtExchangeRate: 7,
        bscUsdtWalletAddress: '',
        bscUsdtExchangeRate: 7,
        bscUsdtApiKey: '',
        // 订单设置
        orderTimeout: 30,
        autoCancel: true,
        stockMode: 'auto', // 'auto' = 库存=卡密数量, 'manual' = 手动设置库存
        // 邮件设置
        smtpHost: '',
        smtpPort: 465,
        smtpUser: '',
        smtpPass: '',
        emailNotify: true,
        // 管理员通知设置
        adminNotifyEmail: '',
        notifyOrderPaid: true,
        notifyPendingShip: true,
        notifyNewTicket: true,
        notifyNewUser: false,
        notifyLowStock: true,
        notifyOrderCancelled: false,
        notifyOrderRefunded: true,
        // 安全策略设置
        securityEnabled: true,
        securityEnableIpBlock: true,
        securityBlockedIps: '',
        securityEnableEmailSuffixBlock: true,
        securityBlockedEmailSuffixes: '',
        securityRequireVerifiedForTicket: true,
        securityRegisterLimitMax: 5,
        securityRegisterLimitWindowMinutes: 10,
        securityOrderQueryLimitMax: 20,
        securityOrderQueryLimitWindowMinutes: 10,
        securityTicketCreateLimitMax: 3,
        securityTicketCreateLimitWindowMinutes: 10,
        // 数据库备份设置
        backupEnabled: false,
        backupFrequency: 1,
        backupRetentionDays: 7,
        backupEmailEnabled: false,
        backupEmail: '',
        // 管理员权限设置
        adminPermissionViewStatsGrid: true,
        adminPermissionViewTodayStats: true,
        adminEmailNotificationConfigs: []
    })

    const [activeTab, setActiveTab] = useState('basic')
    const [saving, setSaving] = useState(false)
    const [loading, setLoading] = useState(true)

    // 从后端加载设置
    useEffect(() => {
        const loadSettings = async () => {
            try {
                const res = await fetch('/api/admin/settings', {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
                if (res.ok) {
                    const data = await res.json()
                    if (data.settings) {
                        setSettings(prev => ({
                            ...prev,
                            ...Object.fromEntries(
                                Object.entries(data.settings).map(([key, value]) => {
                                    // 转换布尔值
                                    if (key === 'adminEmailNotificationConfigs') {
                                        try {
                                            const parsed = JSON.parse(value || '[]')
                                            return [key, Array.isArray(parsed) ? parsed : []]
                                        } catch {
                                            return [key, []]
                                        }
                                    }
                                    if (value === 'true') return [key, true]
                                    if (value === 'false') return [key, false]
                                    // 转换数字（排除0x开头的地址等非十进制字符串）
                                    if (value !== '' && /^-?\d+(\.\d+)?$/.test(value)) return [key, Number(value)]
                                    return [key, value]
                                })
                            )
                        }))
                    }
                }
            } catch (error) {
                console.error('加载设置失败:', error)
            } finally {
                setLoading(false)
            }
        }
        if (token) loadSettings()
    }, [token])

    const handleChange = (key, value) => {
        setSettings(prev => ({ ...prev, [key]: value }))
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            // 将设置值转换为字符串
            const settingsToSave = Object.fromEntries(
                Object.entries(settings).map(([key, value]) => [
                    key,
                    key === 'adminEmailNotificationConfigs' ? JSON.stringify(value) : String(value)
                ])
            )

            // 保存设置到后端
            const res = await fetch('/api/admin/settings', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(settingsToSave)
            })

            if (!res.ok) {
                throw new Error('保存失败')
            }

            showToast('设置保存成功！', 'success')
            // 重新拉取皮肤，立即生效
            fetchSkin()

        } catch (err) {
            console.error(err)
            showToast('保存设置失败', 'error')
        } finally {
            setSaving(false)
        }
    }

    const handleRebuildStock = async () => {
        try {
            const res = await fetch('/api/admin/stock/rebuild', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({})
            })
            const data = await res.json()
            if (!res.ok) {
                throw new Error(data.error || '库存重建失败')
            }
            showToast(`库存重建完成：商品 ${data.updatedProducts} 条，规格 ${data.updatedVariants} 条`, 'success')
        } catch (error) {
            showToast(error.message || '库存重建失败', 'error')
        }
    }

    const adminNotifyEventOptions = [
        { key: 'notifyOrderPaid', label: '支付成功' },
        { key: 'notifyPendingShip', label: '待发货' },
        { key: 'notifyNewTicket', label: '工单提醒' },
        { key: 'notifyNewUser', label: '新用户' },
        { key: 'notifyLowStock', label: '库存预警' },
        { key: 'notifyOrderCancelled', label: '订单取消' }
    ]

    const updateAdminEmailConfig = (userId, updater) => {
        setSettings(prev => ({
            ...prev,
            adminEmailNotificationConfigs: (prev.adminEmailNotificationConfigs || []).map(config => (
                config.userId === userId ? { ...config, ...updater(config) } : config
            ))
        }))
    }

    const toggleAdminEmailEvent = (userId, eventKey) => {
        updateAdminEmailConfig(userId, (config) => {
            const currentEvents = Array.isArray(config.events) ? config.events : []
            const events = currentEvents.includes(eventKey)
                ? currentEvents.filter(key => key !== eventKey)
                : [...currentEvents, eventKey]
            return { events }
        })
    }

    const tabs = [
        { id: 'basic', label: '基本设置' },
        { id: 'payment', label: '支付设置' },
        { id: 'order', label: '订单设置' },
        { id: 'email', label: '邮件设置' },
        { id: 'notify', label: '通知设置' },
        { id: 'admin', label: '管理员设置' },
        { id: 'security', label: '安全策略' },
        { id: 'backup', label: '数据库备份' }
    ]

    return (
        <div className="settings-page">
            <div className="page-header">
                <h2>系统设置</h2>
                <button
                    className="btn btn-primary"
                    onClick={handleSave}
                    disabled={saving}
                >
                    {saving ? '保存中...' : '保存设置'}
                </button>
            </div>

            {/* 标签页 */}
            <div className="settings-tabs">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="settings-content">
                {/* 基本设置 */}
                {activeTab === 'basic' && (
                    <>
                    <div className="settings-section">
                        <div className="setting-item">
                            <label>网站名称</label>
                            <input
                                type="text"
                                value={settings.siteName}
                                onChange={(e) => handleChange('siteName', e.target.value)}
                                placeholder="网站名称"
                            />
                        </div>
                        <div className="setting-item">
                            <label>网站描述</label>
                            <textarea
                                value={settings.siteDescription}
                                onChange={(e) => handleChange('siteDescription', e.target.value)}
                                placeholder="网站描述"
                                rows={3}
                            />
                        </div>
                        <div className="setting-item">
                            <label>联系邮箱</label>
                            <input
                                type="email"
                                value={settings.contactEmail}
                                onChange={(e) => handleChange('contactEmail', e.target.value)}
                                placeholder="客服邮箱"
                            />
                        </div>

                        {/* 分站主域名 */}
                        <div className="setting-item">
                            <label>分站主域名</label>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <input
                                    type="text"
                                    value={settings.agentSubdomainRoot || ''}
                                    onChange={(e) => handleChange('agentSubdomainRoot', e.target.value.trim().replace(/^https?:\/\//i, '').replace(/\/.*$/, ''))}
                                    placeholder="例如：vshop.cc（留空则代理分站用 /s/slug 路径）"
                                    style={{ flex: 1 }}
                                />
                                {settings.agentSubdomainRoot && (
                                    <SslApplyButton domain={settings.agentSubdomainRoot} token={token} />
                                )}
                            </div>
                            <span className="setting-hint">
                                仅用于 SSL 证书管理，当前分站访问一律使用路径模式（vmart.cc/s/slug）。
                            </span>
                        </div>

                        {/* 站点 Logo */}
                        <div className="setting-item">
                            <label>站点 Logo</label>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 8 }}>建议尺寸：高度 60px 以内的透明 PNG，将显示在导航栏</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                {settings.siteLogo && (
                                    <div style={{
                                        padding: '8px 16px', background: 'var(--bg-secondary)',
                                        borderRadius: 8, border: '1px solid var(--border-color)'
                                    }}>
                                        <img src={settings.siteLogo} alt="Logo" style={{ height: 36, width: 'auto', display: 'block' }} />
                                    </div>
                                )}
                                <label style={{
                                    padding: '8px 16px', borderRadius: 8,
                                    background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                                    cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500,
                                    color: 'var(--text-primary)', transition: 'all 0.15s'
                                }}>
                                    {settings.siteLogo ? '更换' : '上传 Logo'}
                                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={async (e) => {
                                        const file = e.target.files?.[0]
                                        if (!file) return
                                        const fd = new FormData()
                                        fd.append('logo', file)
                                        try {
                                            const res = await fetch('/api/upload/branding', {
                                                method: 'POST',
                                                headers: { 'Authorization': `Bearer ${token}` },
                                                body: fd
                                            })
                                            const data = await res.json()
                                            if (data.success && data.urls?.logo) {
                                                handleChange('siteLogo', data.urls.logo)
                                                showToast('Logo 上传成功', 'success')
                                            }
                                        } catch { showToast('上传失败', 'error') }
                                        e.target.value = ''
                                    }} />
                                </label>
                                {settings.siteLogo && (
                                    <button
                                        style={{
                                            padding: '8px 14px', borderRadius: 8,
                                            background: 'transparent', border: '1px solid #EF4444',
                                            color: '#EF4444', fontSize: '0.85rem', cursor: 'pointer'
                                        }}
                                        onClick={() => handleChange('siteLogo', '')}
                                    >清除</button>
                                )}
                            </div>
                        </div>

                        {/* 书签栏图标 Favicon */}
                        <div className="setting-item">
                            <label>书签栏图标（Favicon）</label>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 8 }}>推荐 64×64 PNG，将显示在浏览器标签页和书签栏</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                {settings.siteFavicon && (
                                    <div style={{
                                        padding: 8, background: 'var(--bg-secondary)',
                                        borderRadius: 8, border: '1px solid var(--border-color)'
                                    }}>
                                        <img src={settings.siteFavicon} alt="Favicon" style={{ height: 32, width: 32, display: 'block', objectFit: 'contain' }} />
                                    </div>
                                )}
                                <label style={{
                                    padding: '8px 16px', borderRadius: 8,
                                    background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                                    cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500,
                                    color: 'var(--text-primary)', transition: 'all 0.15s'
                                }}>
                                    {settings.siteFavicon ? '更换' : '上传图标'}
                                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={async (e) => {
                                        const file = e.target.files?.[0]
                                        if (!file) return
                                        const fd = new FormData()
                                        fd.append('favicon', file)
                                        try {
                                            const res = await fetch('/api/upload/branding', {
                                                method: 'POST',
                                                headers: { 'Authorization': `Bearer ${token}` },
                                                body: fd
                                            })
                                            const data = await res.json()
                                            if (data.success && data.urls?.favicon) {
                                                handleChange('siteFavicon', data.urls.favicon)
                                                showToast('图标上传成功', 'success')
                                            }
                                        } catch { showToast('上传失败', 'error') }
                                        e.target.value = ''
                                    }} />
                                </label>
                                {settings.siteFavicon && (
                                    <button
                                        style={{
                                            padding: '8px 14px', borderRadius: 8,
                                            background: 'transparent', border: '1px solid #EF4444',
                                            color: '#EF4444', fontSize: '0.85rem', cursor: 'pointer'
                                        }}
                                        onClick={() => handleChange('siteFavicon', '')}
                                    >清除</button>
                                )}
                            </div>
                        </div>

                        <div className="setting-item">
                            <label>前台界面主题</label>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 8 }}>
                                {/* 原生主题 */}
                                <div style={{
                                    borderRadius: 12,
                                    border: `2px solid ${settings.frontend_skin === 'classic' ? '#4F46E5' : 'var(--border-color)'}`,
                                    overflow: 'hidden',
                                    transition: 'border-color 0.2s',
                                }}>
                                    <div style={{
                                        padding: '10px 16px',
                                        background: 'var(--bg-secondary)',
                                        borderBottom: '1px solid var(--border-color)',
                                        display: 'flex', alignItems: 'center', gap: 8,
                                    }}>
                                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>原生主题</span>
                                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', background: 'rgba(16,185,129,0.1)', padding: '2px 8px', borderRadius: 4, fontWeight: 500 }}>功能完整</span>
                                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>搜索 · 购物车 · 工单 · 完整用户中心</span>
                                    </div>
                                    <label style={{
                                        display: 'flex', alignItems: 'center', gap: 10,
                                        padding: '12px 16px', cursor: 'pointer',
                                        background: settings.frontend_skin === 'classic' ? 'rgba(79,70,229,0.06)' : 'transparent',
                                        transition: 'background 0.15s',
                                    }}>
                                        <input type="radio" name="frontend_skin" value="classic"
                                            checked={settings.frontend_skin === 'classic'}
                                            onChange={() => handleChange('frontend_skin', 'classic')}
                                            style={{ accentColor: '#4F46E5' }}
                                        />
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: '0.88rem', color: settings.frontend_skin === 'classic' ? '#4F46E5' : 'var(--text-primary)' }}>经典风格</div>
                                            <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: 1 }}>深色顶部导航栏</div>
                                        </div>
                                    </label>
                                </div>

                                {/* 简约主题 */}
                                <div style={{
                                    borderRadius: 12,
                                    border: `2px solid ${['fresh','zen'].includes(settings.frontend_skin) ? '#4F46E5' : 'var(--border-color)'}`,
                                    overflow: 'hidden',
                                    transition: 'border-color 0.2s',
                                }}>
                                    <div style={{
                                        padding: '10px 16px',
                                        background: 'var(--bg-secondary)',
                                        borderBottom: '1px solid var(--border-color)',
                                        display: 'flex', alignItems: 'center', gap: 8,
                                    }}>
                                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>简约主题</span>
                                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', background: 'rgba(59,130,246,0.1)', padding: '2px 8px', borderRadius: 4, fontWeight: 500 }}>精简轻量</span>
                                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>快速下单 · 订单查询</span>
                                    </div>
                                    {[
                                        { value: 'fresh', label: 'Fresh 清新', desc: '白色左侧边栏布局' },
                                        { value: 'zen',   label: 'Zen 极简',   desc: '日式极简留白设计' },
                                    ].map((opt, i) => (
                                        <label key={opt.value} style={{
                                            display: 'flex', alignItems: 'center', gap: 10,
                                            padding: '12px 16px', cursor: 'pointer',
                                            background: settings.frontend_skin === opt.value ? 'rgba(79,70,229,0.06)' : 'transparent',
                                            borderTop: i > 0 ? '1px solid var(--border-color)' : 'none',
                                            transition: 'background 0.15s',
                                        }}>
                                            <input type="radio" name="frontend_skin" value={opt.value}
                                                checked={settings.frontend_skin === opt.value}
                                                onChange={() => handleChange('frontend_skin', opt.value)}
                                                style={{ accentColor: '#4F46E5' }}
                                            />
                                            <div>
                                                <div style={{ fontWeight: 600, fontSize: '0.88rem', color: settings.frontend_skin === opt.value ? '#4F46E5' : 'var(--text-primary)' }}>{opt.label}</div>
                                                <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: 1 }}>{opt.desc}</div>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 通知栏设置 */}
                    <div className="settings-section" style={{ marginTop: 24 }}>
                        <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 16, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                            📢 首页通知栏
                        </h3>
                        <div className="setting-item toggle-item">
                            <div className="toggle-info">
                                <span className="toggle-label">启用通知栏</span>
                                <span className="toggle-desc">开启后，前台页面导航栏下方将显示滚动通知</span>
                            </div>
                            <label className="toggle-switch">
                                <input
                                    type="checkbox"
                                    checked={settings.notificationEnabled}
                                    onChange={(e) => handleChange('notificationEnabled', e.target.checked)}
                                />
                                <span className="toggle-slider"></span>
                            </label>
                        </div>
                        {settings.notificationEnabled && (
                            <>
                                <div className="setting-item">
                                    <label>通知内容</label>
                                    <input
                                        type="text"
                                        value={settings.notificationText}
                                        onChange={(e) => handleChange('notificationText', e.target.value)}
                                        placeholder="例如：全场商品限时8折，欢迎选购！"
                                    />
                                    <span className="setting-hint">支持纯文本内容，会在通知栏中滚动展示</span>
                                </div>
                                <div className="setting-item">
                                    <label>跳转链接（可选）</label>
                                    <input
                                        type="url"
                                        value={settings.notificationLink}
                                        onChange={(e) => handleChange('notificationLink', e.target.value)}
                                        placeholder="https://example.com（留空则通知栏不可点击）"
                                    />
                                </div>
                            </>
                        )}
                    </div>
                    </>
                )}

                {/* 支付设置 */}
                {activeTab === 'payment' && (
                    <div className="settings-section">
                        <div className="setting-item toggle-item">
                            <div className="toggle-info">
                                <label>支付宝</label>
                                <span className="toggle-desc">启用支付宝支付</span>
                            </div>
                            <label className="toggle-switch">
                                <input
                                    type="checkbox"
                                    checked={settings.alipayEnabled}
                                    onChange={(e) => handleChange('alipayEnabled', e.target.checked)}
                                />
                                <span className="toggle-slider"></span>
                            </label>
                        </div>
                        <div className="setting-item toggle-item">
                            <div className="toggle-info">
                                <label>微信支付</label>
                                <span className="toggle-desc">启用微信支付</span>
                            </div>
                            <label className="toggle-switch">
                                <input
                                    type="checkbox"
                                    checked={settings.wechatEnabled}
                                    onChange={(e) => handleChange('wechatEnabled', e.target.checked)}
                                />
                                <span className="toggle-slider"></span>
                            </label>
                        </div>
                        <div className="setting-item toggle-item">
                            <div className="toggle-info">
                                <label>USDT-TRC20</label>
                                <span className="toggle-desc">启用USDT支付</span>
                            </div>
                            <label className="toggle-switch">
                                <input
                                    type="checkbox"
                                    checked={settings.usdtEnabled}
                                    onChange={(e) => handleChange('usdtEnabled', e.target.checked)}
                                />
                                <span className="toggle-slider"></span>
                            </label>
                        </div>

                        {settings.usdtEnabled && (
                            <>
                                <div className="setting-item">
                                    <label>USDT 收款地址 (TRC20)</label>
                                    <input
                                        type="text"
                                        value={settings.usdtWalletAddress}
                                        onChange={(e) => handleChange('usdtWalletAddress', e.target.value)}
                                        placeholder="T开头的TRC20地址"
                                    />
                                    <span className="setting-hint">请确保地址正确，否则无法收款</span>
                                </div>
                                <div className="setting-item">
                                    <label>USDT 汇率 (1 USDT = ? CNY)</label>
                                    <input
                                        type="number"
                                        value={settings.usdtExchangeRate}
                                        onChange={(e) => handleChange('usdtExchangeRate', parseFloat(e.target.value))}
                                        min={1}
                                        max={20}
                                        step={0.1}
                                    />
                                    <span className="setting-hint">当前汇率：1 USDT = ¥{settings.usdtExchangeRate}</span>
                                </div>
                            </>
                        )}

                        <div className="setting-item toggle-item">
                            <div className="toggle-info">
                                <label>USDT-BEP20</label>
                                <span className="toggle-desc">启用BSC/BNB智能链USDT支付</span>
                            </div>
                            <label className="toggle-switch">
                                <input
                                    type="checkbox"
                                    checked={settings.bscUsdtEnabled}
                                    onChange={(e) => handleChange('bscUsdtEnabled', e.target.checked)}
                                />
                                <span className="toggle-slider"></span>
                            </label>
                        </div>

                        {settings.bscUsdtEnabled && (
                            <>
                                <div className="setting-item">
                                    <label>USDT 收款地址 (BEP20)</label>
                                    <input
                                        type="text"
                                        value={settings.bscUsdtWalletAddress}
                                        onChange={(e) => handleChange('bscUsdtWalletAddress', e.target.value)}
                                        placeholder="0x开头的BEP20地址"
                                    />
                                    <span className="setting-hint">请确保地址正确，否则无法收款</span>
                                </div>
                                <div className="setting-item">
                                    <label>USDT 汇率 (1 USDT = ? CNY)</label>
                                    <input
                                        type="number"
                                        value={settings.bscUsdtExchangeRate}
                                        onChange={(e) => handleChange('bscUsdtExchangeRate', parseFloat(e.target.value))}
                                        min={1}
                                        max={20}
                                        step={0.1}
                                    />
                                    <span className="setting-hint">当前汇率：1 USDT = ¥{settings.bscUsdtExchangeRate}</span>
                                </div>
                                <div className="setting-item">
                                    <label>BscScan API Key (选填推荐)</label>
                                    <input
                                        type="text"
                                        value={settings.bscUsdtApiKey}
                                        onChange={(e) => handleChange('bscUsdtApiKey', e.target.value)}
                                        placeholder="用于加速查询防限流（免费申请）"
                                    />
                                    <span className="setting-hint">前往 bscscan.com/apis 免费获取</span>
                                </div>
                            </>
                        )}

                        <div className="setting-notice">
                            💡 USDT支付每30秒自动检测钱包转入，到账后自动发货
                        </div>
                    </div>
                )}

                {/* 订单设置 */}
                {activeTab === 'order' && (
                    <div className="settings-section">
                        {/* 库存计算方式 - 现代卡片选择 */}
                        <div className="setting-item stock-mode-section">
                            <label className="stock-mode-label">库存计算方式</label>
                            <div className="stock-mode-selector">
                                <div
                                    className={`stock-mode-option ${settings.stockMode === 'auto' ? 'selected' : ''}`}
                                    onClick={() => handleChange('stockMode', 'auto')}
                                    role="button"
                                    tabIndex={0}
                                >
                                    <div className="stock-mode-radio">
                                        <div className="radio-outer">
                                            <div className="radio-inner"></div>
                                        </div>
                                    </div>
                                    <div className="stock-mode-info">
                                        <div className="stock-mode-header">
                                            <span className="stock-mode-emoji">🤖</span>
                                            <span className="stock-mode-name">自动计算库存</span>
                                            <span className="stock-mode-tag recommended">推荐</span>
                                        </div>
                                        <div className="stock-mode-description">
                                            系统自动统计可用卡密数量作为库存，确保库存实时准确
                                        </div>
                                    </div>
                                </div>
                                <div
                                    className={`stock-mode-option ${settings.stockMode === 'manual' ? 'selected' : ''}`}
                                    onClick={() => handleChange('stockMode', 'manual')}
                                    role="button"
                                    tabIndex={0}
                                >
                                    <div className="stock-mode-radio">
                                        <div className="radio-outer">
                                            <div className="radio-inner"></div>
                                        </div>
                                    </div>
                                    <div className="stock-mode-info">
                                        <div className="stock-mode-header">
                                            <span className="stock-mode-emoji">✏️</span>
                                            <span className="stock-mode-name">手动设置库存</span>
                                        </div>
                                        <div className="stock-mode-description">
                                            可在商品管理中手动设置库存，适用于库存充足但卡密未导入的情况
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div style={{ marginTop: '10px' }}>
                                <button
                                    className="btn btn-secondary"
                                    onClick={handleRebuildStock}
                                    type="button"
                                >
                                    重建库存（按可用卡密）
                                </button>
                            </div>
                        </div>

                        {/* 订单超时 */}
                        <div className="setting-item">
                            <label>订单超时时间</label>
                            <div className="input-with-suffix">
                                <input
                                    type="number"
                                    value={settings.orderTimeout}
                                    onChange={(e) => handleChange('orderTimeout', parseInt(e.target.value))}
                                    min={5}
                                    max={120}
                                    style={{ width: '120px' }}
                                />
                                <span className="input-suffix">分钟</span>
                            </div>
                            <span className="setting-hint">未支付订单超时后自动取消</span>
                        </div>

                        {/* 自动取消 */}
                        <div className="setting-item toggle-item">
                            <div className="toggle-info">
                                <label>自动取消</label>
                                <span className="toggle-desc">超时订单自动取消</span>
                            </div>
                            <label className="toggle-switch">
                                <input
                                    type="checkbox"
                                    checked={settings.autoCancel}
                                    onChange={(e) => handleChange('autoCancel', e.target.checked)}
                                />
                                <span className="toggle-slider"></span>
                            </label>
                        </div>
                    </div>
                )}

                {/* 邮件设置 */}
                {activeTab === 'email' && (
                    <div className="settings-section">
                        <div className="setting-item toggle-item">
                            <div className="toggle-info">
                                <label>邮件通知</label>
                                <span className="toggle-desc">订单完成后发送卡密到邮箱</span>
                            </div>
                            <label className="toggle-switch">
                                <input
                                    type="checkbox"
                                    checked={settings.emailNotify}
                                    onChange={(e) => handleChange('emailNotify', e.target.checked)}
                                />
                                <span className="toggle-slider"></span>
                            </label>
                        </div>
                        <div className="setting-item">
                            <label>SMTP 服务器</label>
                            <input
                                type="text"
                                value={settings.smtpHost}
                                onChange={(e) => handleChange('smtpHost', e.target.value)}
                                placeholder="smtp.example.com"
                            />
                        </div>
                        <div className="setting-item">
                            <label>SMTP 端口</label>
                            <input
                                type="number"
                                value={settings.smtpPort}
                                onChange={(e) => handleChange('smtpPort', parseInt(e.target.value))}
                                placeholder="465"
                            />
                        </div>
                        <div className="setting-item">
                            <label>发件邮箱</label>
                            <input
                                type="email"
                                value={settings.smtpUser}
                                onChange={(e) => handleChange('smtpUser', e.target.value)}
                                placeholder="noreply@example.com"
                            />
                        </div>
                        <div className="setting-item">
                            <label>邮箱密码/授权码</label>
                            <input
                                type="password"
                                value={settings.smtpPass}
                                onChange={(e) => handleChange('smtpPass', e.target.value)}
                                placeholder="邮箱密码或授权码"
                            />
                        </div>
                        <div className="setting-item">
                            <button
                                className="btn btn-secondary"
                                onClick={async () => {
                                    try {
                                        const res = await fetch('/api/admin/settings/test-email', {
                                            method: 'POST',
                                            headers: { 'Authorization': `Bearer ${token}` }
                                        })
                                        const data = await res.json()
                                        if (res.ok) {
                                            alert('✅ ' + data.message)
                                        } else {
                                            alert('❌ 测试失败: ' + data.error)
                                        }
                                    } catch (error) {
                                        alert('❌ 测试失败: ' + error.message)
                                    }
                                }}
                            >
                                测试邮件连接
                            </button>
                            <span className="setting-hint">先保存设置，再测试连接</span>
                        </div>
                    </div>
                )}

                {/* 通知设置 */}
                {activeTab === 'notify' && (
                    <div className="settings-section">
                        <div className="setting-item">
                            <label>管理员收信邮箱</label>
                            <input
                                type="email"
                                value={settings.adminNotifyEmail}
                                onChange={(e) => handleChange('adminNotifyEmail', e.target.value)}
                                placeholder="admin@example.com"
                            />
                            <span className="setting-hint">事件通知将发送到此邮箱，留空则不发送</span>
                        </div>

                        <div style={{ marginTop: '8px' }}>
                            <label style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '16px' }}>通知开关</label>
                        </div>

                        <div className="setting-item toggle-item">
                            <div className="toggle-info">
                                <label>💰 订单支付成功</label>
                                <span className="toggle-desc">用户完成支付后通知管理员</span>
                            </div>
                            <label className="toggle-switch">
                                <input
                                    type="checkbox"
                                    checked={settings.notifyOrderPaid}
                                    onChange={(e) => handleChange('notifyOrderPaid', e.target.checked)}
                                />
                                <span className="toggle-slider"></span>
                            </label>
                        </div>

                        <div className="setting-item toggle-item">
                            <div className="toggle-info">
                                <label>📦 待手动发货</label>
                                <span className="toggle-desc">订单已支付但无卡密自动发放，需手动发货时通知</span>
                            </div>
                            <label className="toggle-switch">
                                <input
                                    type="checkbox"
                                    checked={settings.notifyPendingShip}
                                    onChange={(e) => handleChange('notifyPendingShip', e.target.checked)}
                                />
                                <span className="toggle-slider"></span>
                            </label>
                        </div>

                        <div className="setting-item toggle-item">
                            <div className="toggle-info">
                                <label>🎫 新工单创建</label>
                                <span className="toggle-desc">用户提交新工单时通知管理员</span>
                            </div>
                            <label className="toggle-switch">
                                <input
                                    type="checkbox"
                                    checked={settings.notifyNewTicket}
                                    onChange={(e) => handleChange('notifyNewTicket', e.target.checked)}
                                />
                                <span className="toggle-slider"></span>
                            </label>
                        </div>

                        <div className="setting-item toggle-item">
                            <div className="toggle-info">
                                <label>👤 新用户注册</label>
                                <span className="toggle-desc">有新用户注册时通知管理员</span>
                            </div>
                            <label className="toggle-switch">
                                <input
                                    type="checkbox"
                                    checked={settings.notifyNewUser}
                                    onChange={(e) => handleChange('notifyNewUser', e.target.checked)}
                                />
                                <span className="toggle-slider"></span>
                            </label>
                        </div>

                        <div className="setting-item toggle-item">
                            <div className="toggle-info">
                                <label>⚠️ 库存不足预警</label>
                                <span className="toggle-desc">商品库存低于阈值时通知管理员</span>
                            </div>
                            <label className="toggle-switch">
                                <input
                                    type="checkbox"
                                    checked={settings.notifyLowStock}
                                    onChange={(e) => handleChange('notifyLowStock', e.target.checked)}
                                />
                                <span className="toggle-slider"></span>
                            </label>
                        </div>

                        <div className="setting-item toggle-item">
                            <div className="toggle-info">
                                <label>📦 订单取消</label>
                                <span className="toggle-desc">订单被取消时通知管理员</span>
                            </div>
                            <label className="toggle-switch">
                                <input
                                    type="checkbox"
                                    checked={settings.notifyOrderCancelled}
                                    onChange={(e) => handleChange('notifyOrderCancelled', e.target.checked)}
                                />
                                <span className="toggle-slider"></span>
                            </label>
                        </div>

                        <div className="setting-item toggle-item">
                            <div className="toggle-info">
                                <label>💸 退款成功通知</label>
                                <span className="toggle-desc">订单完成退款后向用户发送退款成功邮件</span>
                            </div>
                            <label className="toggle-switch">
                                <input
                                    type="checkbox"
                                    checked={settings.notifyOrderRefunded}
                                    onChange={(e) => handleChange('notifyOrderRefunded', e.target.checked)}
                                />
                                <span className="toggle-slider"></span>
                            </label>
                        </div>
                    </div>
                )}

                {activeTab === 'security' && (
                    <div className="settings-section">
                        <div className="setting-item toggle-item">
                            <div className="toggle-info">
                                <label>启用安全策略</label>
                                <span className="toggle-desc">总开关，关闭后将跳过黑名单与专项限流</span>
                            </div>
                            <label className="toggle-switch">
                                <input
                                    type="checkbox"
                                    checked={settings.securityEnabled}
                                    onChange={(e) => handleChange('securityEnabled', e.target.checked)}
                                />
                                <span className="toggle-slider"></span>
                            </label>
                        </div>

                        <div className="setting-item toggle-item">
                            <div className="toggle-info">
                                <label>IP 黑名单拦截</label>
                                <span className="toggle-desc">支持单 IP 和 CIDR 网段，命中后直接拒绝请求</span>
                            </div>
                            <label className="toggle-switch">
                                <input
                                    type="checkbox"
                                    checked={settings.securityEnableIpBlock}
                                    onChange={(e) => handleChange('securityEnableIpBlock', e.target.checked)}
                                />
                                <span className="toggle-slider"></span>
                            </label>
                        </div>

                        <div className="setting-item">
                            <label>IP 黑名单（每行或逗号分隔）</label>
                            <textarea
                                value={settings.securityBlockedIps}
                                onChange={(e) => handleChange('securityBlockedIps', e.target.value)}
                                placeholder={'示例:\n1.2.3.4\n45.67.0.0/16'}
                                rows={4}
                            />
                            <span className="setting-hint">将作用于注册、订单查询、工单创建等关键接口</span>
                        </div>

                        <div className="setting-item toggle-item">
                            <div className="toggle-info">
                                <label>邮箱后缀黑名单</label>
                                <span className="toggle-desc">拦截指定邮箱域名的注册、订单查询、工单创建</span>
                            </div>
                            <label className="toggle-switch">
                                <input
                                    type="checkbox"
                                    checked={settings.securityEnableEmailSuffixBlock}
                                    onChange={(e) => handleChange('securityEnableEmailSuffixBlock', e.target.checked)}
                                />
                                <span className="toggle-slider"></span>
                            </label>
                        </div>

                        <div className="setting-item">
                            <label>邮箱后缀黑名单（每行或逗号分隔）</label>
                            <textarea
                                value={settings.securityBlockedEmailSuffixes}
                                onChange={(e) => handleChange('securityBlockedEmailSuffixes', e.target.value)}
                                placeholder={'示例:\nsharebot.net\nmailinator.com'}
                                rows={4}
                            />
                            <span className="setting-hint">只写域名后缀即可，不需要带 @</span>
                        </div>

                        <div className="setting-item toggle-item">
                            <div className="toggle-info">
                                <label>工单要求已验证邮箱</label>
                                <span className="toggle-desc">未验证邮箱账号无法提交新工单</span>
                            </div>
                            <label className="toggle-switch">
                                <input
                                    type="checkbox"
                                    checked={settings.securityRequireVerifiedForTicket}
                                    onChange={(e) => handleChange('securityRequireVerifiedForTicket', e.target.checked)}
                                />
                                <span className="toggle-slider"></span>
                            </label>
                        </div>

                        <div className="setting-item">
                            <label>注册限流（次数 / 窗口分钟）</label>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                <input
                                    type="number"
                                    min={1}
                                    max={500}
                                    value={settings.securityRegisterLimitMax}
                                    onChange={(e) => handleChange('securityRegisterLimitMax', parseInt(e.target.value) || 1)}
                                    style={{ width: '120px' }}
                                />
                                <span>/</span>
                                <input
                                    type="number"
                                    min={1}
                                    max={1440}
                                    value={settings.securityRegisterLimitWindowMinutes}
                                    onChange={(e) => handleChange('securityRegisterLimitWindowMinutes', parseInt(e.target.value) || 1)}
                                    style={{ width: '120px' }}
                                />
                                <span>分钟</span>
                            </div>
                        </div>

                        <div className="setting-item">
                            <label>订单查询限流（次数 / 窗口分钟）</label>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                <input
                                    type="number"
                                    min={1}
                                    max={1000}
                                    value={settings.securityOrderQueryLimitMax}
                                    onChange={(e) => handleChange('securityOrderQueryLimitMax', parseInt(e.target.value) || 1)}
                                    style={{ width: '120px' }}
                                />
                                <span>/</span>
                                <input
                                    type="number"
                                    min={1}
                                    max={1440}
                                    value={settings.securityOrderQueryLimitWindowMinutes}
                                    onChange={(e) => handleChange('securityOrderQueryLimitWindowMinutes', parseInt(e.target.value) || 1)}
                                    style={{ width: '120px' }}
                                />
                                <span>分钟</span>
                            </div>
                        </div>

                        <div className="setting-item">
                            <label>工单创建限流（次数 / 窗口分钟）</label>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                <input
                                    type="number"
                                    min={1}
                                    max={200}
                                    value={settings.securityTicketCreateLimitMax}
                                    onChange={(e) => handleChange('securityTicketCreateLimitMax', parseInt(e.target.value) || 1)}
                                    style={{ width: '120px' }}
                                />
                                <span>/</span>
                                <input
                                    type="number"
                                    min={1}
                                    max={1440}
                                    value={settings.securityTicketCreateLimitWindowMinutes}
                                    onChange={(e) => handleChange('securityTicketCreateLimitWindowMinutes', parseInt(e.target.value) || 1)}
                                    style={{ width: '120px' }}
                                />
                                <span>分钟</span>
                            </div>
                            <span className="setting-hint">按“用户ID+IP”联合维度计数，更适合拦截机器人轰炸</span>
                        </div>
                    </div>
                )}

                {activeTab === 'admin' && (
                    <div className="settings-section">
                        <div className="setting-item toggle-item">
                            <div className="toggle-info">
                                <label>仪表盘总览统计</label>
                                <span className="toggle-desc">允许普通管理员查看仪表盘顶部的 stats-grid 统计卡和趋势数据</span>
                            </div>
                            <label className="toggle-switch">
                                <input
                                    type="checkbox"
                                    checked={settings.adminPermissionViewStatsGrid}
                                    onChange={(e) => handleChange('adminPermissionViewStatsGrid', e.target.checked)}
                                />
                                <span className="toggle-slider"></span>
                            </label>
                        </div>

                        <div className="setting-item toggle-item">
                            <div className="toggle-info">
                                <label>仪表盘今日数据</label>
                                <span className="toggle-desc">允许普通管理员查看仪表盘中的 today-stats 今日订单和今日收入</span>
                            </div>
                            <label className="toggle-switch">
                                <input
                                    type="checkbox"
                                    checked={settings.adminPermissionViewTodayStats}
                                    onChange={(e) => handleChange('adminPermissionViewTodayStats', e.target.checked)}
                                />
                                <span className="toggle-slider"></span>
                            </label>
                        </div>

                        <div className="admin-email-settings">
                            <div className="admin-email-settings-header">
                                <label>管理员邮箱通知</label>
                                <span>为每个管理员配置是否接收邮件，以及接收哪些类型的通知</span>
                            </div>

                            {(settings.adminEmailNotificationConfigs || []).length === 0 ? (
                                <div className="admin-email-empty">暂无管理员账号</div>
                            ) : (
                                <div className="admin-email-list">
                                    {(settings.adminEmailNotificationConfigs || []).map(config => (
                                        <div key={config.userId} className="admin-email-card">
                                            <div className="admin-email-card-main">
                                                <div>
                                                    <div className="admin-email-name">
                                                        {config.username || '未设置用户名'}
                                                        <span>{config.role === 'SUPER_ADMIN' ? '超级管理员' : '管理员'}</span>
                                                    </div>
                                                    <div className="admin-email-address">{config.email}</div>
                                                </div>
                                                <label className="toggle-switch">
                                                    <input
                                                        type="checkbox"
                                                        checked={config.enabled}
                                                        onChange={(e) => updateAdminEmailConfig(config.userId, () => ({ enabled: e.target.checked }))}
                                                    />
                                                    <span className="toggle-slider"></span>
                                                </label>
                                            </div>

                                            <div className={`admin-email-events ${config.enabled ? '' : 'disabled'}`}>
                                                {adminNotifyEventOptions.map(option => (
                                                    <label key={option.key} className="admin-email-event">
                                                        <input
                                                            type="checkbox"
                                                            checked={(config.events || []).includes(option.key)}
                                                            disabled={!config.enabled}
                                                            onChange={() => toggleAdminEmailEvent(config.userId, option.key)}
                                                        />
                                                        <span>{option.label}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'backup' && (
                    <BackupSettings token={token} settings={settings} handleChange={handleChange} showToast={showToast} />
                )}
            </div>
        </div>
    )
}

// 管理后台主组件
function AdminDashboard() {
    const location = useLocation()
    const navigate = useNavigate()
    const { logout, user } = useAuthStore()
    const [sidebarOpen, setSidebarOpen] = useState(true)
    const isSuperAdmin = user?.role === 'SUPER_ADMIN'

    const handleLogout = () => {
        logout()
        navigate('/')
    }

    // 根据角色过滤菜单项
    const isTenantAdmin = user?.role === 'TENANT_ADMIN';
    const visibleMenuItems = menuItems.filter(item => {
        if (item.superOnly && !isSuperAdmin) return false;
        if (item.tenantOnly && !isTenantAdmin) return false;
        return true;
    })

    return (
        <div className={`admin-layout ${sidebarOpen ? '' : 'sidebar-collapsed'}`}>
            {/* 侧边栏 */}
            <aside className="admin-sidebar">
                <div className="sidebar-header">
                    <span className="sidebar-title">管理后台</span>
                    <button className="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
                        {sidebarOpen ? <FiX /> : <FiMenu />}
                    </button>
                </div>

                <nav className="sidebar-nav">
                    {visibleMenuItems.map(item => {
                        const isActive = item.exact
                            ? location.pathname === item.path
                            : location.pathname.startsWith(item.path)
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`nav-item ${isActive ? 'active' : ''}`}
                            >
                                <item.icon />
                                <span>{item.label}</span>
                            </Link>
                        )
                    })}
                </nav>

                <div className="sidebar-footer">
                    <div className="user-info">
                        <div className="user-avatar">👤</div>
                        <div className="user-details">
                            <span className="user-name">{user?.username || 'Admin'}</span>
                            <span className="user-role">{isSuperAdmin ? '超级管理员' : '管理员'}</span>
                        </div>
                    </div>
                    <button className="logout-btn" onClick={handleLogout}>
                        <FiLogOut />
                        <span>退出</span>
                    </button>
                </div>
            </aside>

            {/* 主内容区 */}
            <main className="admin-main">
                <Routes>
                    <Route index element={<DashboardHome />} />
                    <Route path="products" element={<ProductsManage />} />
                    <Route path="orders" element={<OrdersManage />} />
                    <Route path="tickets" element={<TicketsManage />} />
                    <Route path="cards" element={<CardsManage />} />
                    <Route path="users" element={<UsersManage />} />
                    <Route path="agents" element={<AgentsManage />} />
                    <Route path="tenants" element={<TenantsManage />} />
                    <Route path="setup" element={<SetupGuidePage />} />
                    <Route path="settings" element={isSuperAdmin ? <SettingsPage /> : <TenantSettings />} />
                </Routes>
            </main>
        </div>
    )
}


// 新手起航页面
function SetupGuidePage() {
    const [stats, setStats] = useState({ totalProducts: 0 });
    const token = useAuthStore(state => state.token);

    useEffect(() => {
        if (token) {
            fetch('/api/admin/dashboard', { headers: { 'Authorization': `Bearer ${token}` } })
                .then(r => r.json())
                .then(data => {
                    if(data.stats) setStats(data.stats);
                })
                .catch(e => console.error(e));
        }
    }, [token]);

    return (
        <div className="dashboard-content">
            <h2 className="page-title">新手向导</h2>
            <div className="setup-guide-card" style={{ background: 'var(--bg-card)', borderRadius: '12px', padding: '24px', border: '1px solid var(--border-color)', maxWidth: '800px', margin: '0 auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                    <div style={{ background: 'rgba(99,102,241,0.1)', color: '#818cf8', padding: '12px', borderRadius: '12px' }}><FiPackage size={24} /></div>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-primary)' }}>开启您的数字商城营业之旅</h3>
                        <p style={{ margin: '6px 0 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>完成以下基础设置，即可正式营业并接收订单</p>
                    </div>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'var(--bg-body)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <div style={{ color: stats.totalProducts > 0 ? '#10b981' : 'var(--text-muted)' }}>
                                {stats.totalProducts > 0 ? <FiCheckCircle size={24} /> : <div style={{ width: 22, height: 22, borderRadius: '50%', border: '2px solid var(--border-color)' }} />}
                            </div>
                            <span style={{ fontSize: '1.05rem', color: stats.totalProducts > 0 ? 'var(--text-secondary)' : 'var(--text-primary)', textDecoration: stats.totalProducts > 0 ? 'line-through' : 'none' }}>发布第一款商品</span>
                        </div>
                        <Link to="/admin/products" className="btn btn-secondary" style={{ padding: '8px 16px' }}>去上架</Link>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'var(--bg-body)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <div style={{ color: 'var(--text-muted)' }}>
                                <div style={{ width: 22, height: 22, borderRadius: '50%', border: '2px solid var(--border-color)' }} />
                            </div>
                            <span style={{ fontSize: '1.05rem', color: 'var(--text-primary)' }}>绑定专属独立域名</span>
                        </div>
                        <Link to="/admin/settings" className="btn btn-secondary" style={{ padding: '8px 16px' }}>去配置</Link>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'var(--bg-body)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <div style={{ color: 'var(--text-muted)' }}>
                                <div style={{ width: 22, height: 22, borderRadius: '50%', border: '2px solid var(--border-color)' }} />
                            </div>
                            <span style={{ fontSize: '1.05rem', color: 'var(--text-primary)' }}>订阅高级套餐 <span style={{ fontSize: '0.8rem', background: 'rgba(239,68,68,0.1)', color: '#ef4444', padding: '4px 8px', borderRadius: '4px', marginLeft: '12px' }}>未订阅无法前台交易</span></span>
                        </div>
                        <Link to="/admin/settings" className="btn btn-primary" style={{ padding: '8px 16px' }}>选择套餐</Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

// 包装导出
function AdminDashboardWithProvider() {
    return (
        <ToastProvider>
            <AdminDashboard />
        </ToastProvider>
    )
}

export default AdminDashboardWithProvider

import { useState, useEffect, createContext, useContext, useRef, Fragment } from 'react'
import { Routes, Route, Link, useLocation, useNavigate, Navigate } from 'react-router-dom'
import {
    FiHome, FiPackage, FiShoppingBag, FiCreditCard,
    FiUsers, FiSettings, FiLogOut, FiMenu, FiX,
    FiTrendingUp, FiDollarSign, FiBox, FiActivity, FiFlag,
    FiCheckCircle, FiAlertCircle, FiInfo, FiAlertTriangle,
    FiChevronDown, FiCheck, FiImage, FiMessageCircle,
    FiClock, FiBell, FiBellOff, FiSend,
    FiShield, FiUser, FiSearch, FiShare2, FiMonitor
} from 'react-icons/fi'
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../../../store/authStore'
import { useSkinStore } from '../../../store/skinStore'
import { useMerchantStore } from '../../../store/merchantStore'
import { useAdminPrefsStore } from '../../../store/adminPrefsStore'
import { useAdminL } from '../../../hooks/useAdminL'
import { formatMoney, getCurrencySymbol } from '../../../utils/adminFormat'
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

    const showConfirm = (title, message, onConfirm, confirmText = 'Confirm') => {
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

            {/* Confirm弹窗 */}
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
                                Cancel
                            </button>
                            <button className="btn btn-primary" onClick={handleConfirm}>
                                {confirmDialog.confirmText || L('admin.common.confirm')}
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

    // 点击外部Close
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
    { path: '/admin', icon: FiHome, labelZh: '仪表盘', labelEn: 'Dashboard', exact: true, permission: 'dashboard.view' },
    { path: '/admin/products', icon: FiPackage, labelZh: '商品管理', labelEn: 'Products', permission: 'products.view' },
    { path: '/admin/orders', icon: FiShoppingBag, labelZh: '订单管理', labelEn: 'Orders', permission: 'orders.view' },
    { path: '/admin/tickets', icon: FiMessageCircle, labelZh: '工单管理', labelEn: 'Tickets', permission: 'tickets.view' },
    { path: '/admin/cards', icon: FiCreditCard, labelZh: '卡密管理', labelEn: 'Card Keys', permission: 'cards.view' },
    { path: '/admin/users', icon: FiUsers, labelZh: '用户管理', labelEn: 'Customers', permission: 'customers.view' },
    { path: '/admin/agents', icon: FiShare2, labelZh: '代理管理', labelEn: 'Agents', permission: 'agents.review' },
    { path: '/admin/support', icon: FiSend, labelZh: '联系客服', labelEn: 'Support', ownerOnly: true },
    { path: '/admin/settings', icon: FiSettings, labelZh: '商城设置', labelEn: 'Settings', ownerOnly: true },
    { path: '/admin/setup', icon: FiFlag, labelZh: '新手起航', labelEn: 'Get Started', tenantOnly: true },
]

// 商户联系客服（tickets）页面
function MerchantSupportPage() {
    const L = useAdminL()
    const { token } = useAuthStore()
    const mToken = useMerchantStore(state => state.token)
    const authToken = mToken || token
    const { showToast } = useToast()
    const [tickets, setTickets] = useState([])
    const [loading, setLoading] = useState(true)
    const [view, setView] = useState('list') // list | detail | create
    const [selectedTicket, setSelectedTicket] = useState(null)
    const [form, setForm] = useState({ subject: '', content: '', images: [] })
    const [replyContent, setReplyContent] = useState('')
    const [replyImages, setReplyImages] = useState([])
    const [submitting, setSubmitting] = useState(false)
    const [uploading, setUploading] = useState(false)

    const fetchTickets = async () => {
        try {
            const r = await fetch('/api/platform/tickets', { headers: { Authorization: `Bearer ${authToken}` } })
            const d = await r.json()
            setTickets(d.tickets || [])
        } catch {}
        setLoading(false)
    }

    useEffect(() => { fetchTickets() }, [])

    const handleCreate = async (e) => {
        e.preventDefault()
        if (!form.subject || !form.content) { showToast(L('请填写主题和内容', 'Please fill in subject and content'), 'error'); return }
        setSubmitting(true)
        try {
            const r = await fetch('/api/platform/tickets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
                body: JSON.stringify({ subject: form.subject, content: form.content, images: form.images.length ? form.images : null })
            })
            const d = await r.json()
            if (!r.ok) { showToast(d.error || L('提交失败', 'Submission failed'), 'error'); return }
            showToast(L('工单已提交', 'Ticket submitted'), 'success')
            setForm({ subject: '', content: '', images: [] })
            setView('list')
            fetchTickets()
        } catch { showToast(L('网络错误', 'Network error'), 'error') }
        finally { setSubmitting(false) }
    }

    const handleReply = async () => {
        if (!replyContent.trim()) { showToast(L('请输入回复内容', 'Please enter content'), 'error'); return }
        setSubmitting(true)
        try {
            const r = await fetch(`/api/platform/tickets/${selectedTicket.id}/reply`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
                body: JSON.stringify({ content: replyContent, images: replyImages.length ? replyImages : null })
            })
            if (!r.ok) { const d = await r.json(); showToast(d.error || L('发送失败', 'Send failed'), 'error'); return }
            setReplyContent('')
            setReplyImages([])
            // Refresh详情
            const dr = await fetch(`/api/platform/tickets/${selectedTicket.id}`, { headers: { Authorization: `Bearer ${authToken}` } })
            const dd = await dr.json()
            setSelectedTicket(dd.ticket)
        } catch { showToast(L('网络错误', 'Network error'), 'error') }
        finally { setSubmitting(false) }
    }

    const handleUpload = async (e, target) => {
        const file = e.target.files?.[0]
        if (!file) return
        setUploading(true)
        try {
            const fd = new FormData()
            fd.append('images', file)
            const r = await fetch('/api/upload', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd })
            const d = await r.json()
            if (d.success && d.images?.[0]?.urls?.original) {
                const url = d.images[0].urls.original
                if (target === 'create') setForm(f => ({ ...f, images: [...f.images, url] }))
                else setReplyImages(imgs => [...imgs, url])
                showToast(L('图片已上传', 'Image uploaded'), 'success')
            } else {
                showToast(d.error || L('上传失败', 'Upload failed'), 'error')
            }
        } catch {
            showToast(L('上传失败', 'Upload failed'), 'error')
        } finally {
            setUploading(false)
            e.target.value = ''
        }
    }

    const statusMap = { 
        OPEN: { label: L('待处理', 'Pending'), color: '#F59E0B' }, 
        IN_PROGRESS: { label: L('处理中', 'In Progress'), color: '#3B82F6' }, 
        CLOSED: { label: L('已关闭', 'Closed'), color: '#6B7280' } 
    }

    if (view === 'create') {
        return (
            <div className="admin-page">
                <div className="page-header">
                    <h2>{L('提交工单', 'Submit Ticket')}</h2>
                    <button className="btn btn-secondary" onClick={() => setView('list')}>{L('返回列表', 'Back to List')}</button>
                </div>
                <form onSubmit={handleCreate} style={{ maxWidth: 600, display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>{L('主题', 'Subject')}</label>
                        <input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder={L('简短描述', 'Brief description')} required style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--border-color)', borderRadius: 8, background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.9rem' }} />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>{L('问题描述', 'Description')}</label>
                        <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} placeholder={L('详细描述您遇到的问题...', 'Describe your issue in detail...')} required rows={6} style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--border-color)', borderRadius: 8, background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.9rem', fontFamily: 'inherit', resize: 'vertical' }} />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>{L('附件图片', 'Attachments')}</label>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                            {form.images.map((url, i) => (
                                <div key={i} style={{ position: 'relative' }}>
                                    <img src={url} alt="" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--border-color)' }} />
                                    <button type="button" onClick={() => setForm(f => ({ ...f, images: f.images.filter((_, j) => j !== i) }))} style={{ position: 'absolute', top: -6, right: -6, width: 18, height: 18, borderRadius: '50%', background: '#ef4444', color: '#fff', border: 'none', fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                                </div>
                            ))}
                            <label style={{ width: 64, height: 64, border: '2px dashed var(--border-color)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1.2rem' }}>
                                {uploading ? '...' : '+'}
                                <input type="file" accept="image/*" onChange={e => handleUpload(e, 'create')} style={{ display: 'none' }} />
                            </label>
                        </div>
                    </div>
                    <button type="submit" className="btn btn-primary" disabled={submitting} style={{ alignSelf: 'flex-start' }}>
                        {submitting ? L('提交中...', 'Submitting...') : L('提交工单', 'Submit Ticket')}
                    </button>
                </form>
            </div>
        )
    }

    if (view === 'detail' && selectedTicket) {
        const s = statusMap[selectedTicket.status] || statusMap.OPEN
        return (
            <div className="admin-page" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 48px)', minHeight: 0 }}>
                <div className="page-header" style={{ flexShrink: 0 }}>
                    <h2 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {selectedTicket.subject}
                        <span style={{ fontSize: '0.75rem', padding: '3px 10px', borderRadius: 12, background: `${s.color}20`, color: s.color, fontWeight: 600 }}>{s.label}</span>
                        {selectedTicket.status !== 'CLOSED' && (
                            <button
                                onClick={async () => {
                                    if (!confirm(L('确定关闭该工单吗？您可以在 24 小时内重新开启。', 'Close this ticket? You can reopen within 24 hours.'))) return
                                    const r = await fetch(`/api/platform/tickets/${selectedTicket.id}/close`, {
                                        method: 'POST', headers: { Authorization: `Bearer ${authToken}` }
                                    })
                                    if (r.ok) {
                                        showToast(L('工单已关闭', 'Ticket closed'), 'success')
                                        const dr = await fetch(`/api/platform/tickets/${selectedTicket.id}`, { headers: { Authorization: `Bearer ${authToken}` } })
                                        const dd = await dr.json()
                                        setSelectedTicket(dd.ticket)
                                    } else {
                                        const d = await r.json()
                                        showToast(d.error || L('关闭失败', 'Close failed'), 'error')
                                    }
                                }}
                                style={{
                                    fontSize: '0.78rem', padding: '4px 12px', borderRadius: 8,
                                    background: 'transparent', border: '1px solid rgba(239, 68, 68, 0.4)',
                                    color: '#ef4444', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4
                                }}
                            >
                                <FiX size={13} />
                                {L('关闭工单', 'Close Ticket')}
                            </button>
                        )}
                    </h2>
                    <button className="btn btn-secondary" onClick={() => { setView('list'); setSelectedTicket(null) }}>{L('返回列表', 'Back to List')}</button>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16, paddingRight: 4, minHeight: 0 }}>
                    {selectedTicket.messages?.map(msg => (
                        <div key={msg.id} style={{
                            padding: '14px 18px', borderRadius: 12,
                            background: msg.senderType === 'MERCHANT' ? 'var(--bg-secondary)' : 'rgba(99, 102, 241, 0.08)',
                            border: `1px solid ${msg.senderType === 'MERCHANT' ? 'var(--border-color)' : 'rgba(99, 102, 241, 0.2)'}`,
                            alignSelf: msg.senderType === 'MERCHANT' ? 'flex-end' : 'flex-start',
                            maxWidth: '85%'
                        }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 6 }}>
                                {msg.senderType === 'MERCHANT' ? L('我', 'Me') : L('平台客服', 'Support')} · {new Date(msg.createdAt).toLocaleString()}
                            </div>
                            <div style={{ fontSize: '0.88rem', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{msg.content}</div>
                            {msg.images && Array.isArray(msg.images) && msg.images.length > 0 && (
                                <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                                    {msg.images.map((url, i) => (
                                        <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                                            <img src={url} alt="" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--border-color)' }} />
                                        </a>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
                {selectedTicket.status !== 'CLOSED' && (
                    <div style={{ flexShrink: 0, paddingTop: 12, borderTop: '1px solid var(--border-color)', marginTop: 12 }}>
                        <textarea value={replyContent} onChange={e => setReplyContent(e.target.value)} placeholder={L('输入回复内容...', 'Type your reply...')} rows={3} style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--border-color)', borderRadius: 8, background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.9rem', fontFamily: 'inherit', resize: 'vertical' }} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
                            <label style={{ cursor: 'pointer', padding: '6px 12px', border: '1px solid var(--border-color)', borderRadius: 6, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                                <FiImage size={14} style={{ verticalAlign: '-2px', marginRight: 4 }} />
                                {uploading ? L('上传中...', 'Uploading...') : L('添加图片', 'Add Image')}
                                <input type="file" accept="image/*" onChange={e => handleUpload(e, 'reply')} style={{ display: 'none' }} />
                            </label>
                            {replyImages.map((url, i) => (
                                <img key={i} src={url} alt="" style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 4 }} />
                            ))}
                            <button className="btn btn-primary" onClick={handleReply} disabled={submitting} style={{ marginLeft: 'auto' }}>
                                {submitting ? L('发送中...', 'Sending...') : L('发送', 'Send')}
                            </button>
                        </div>
                    </div>
                )}
                {selectedTicket.status === 'CLOSED' && (() => {
                    const closedAt = selectedTicket.closedAt ? new Date(selectedTicket.closedAt) : null
                    const canReopen = closedAt && (Date.now() - closedAt.getTime() < 24 * 60 * 60 * 1000)
                    const hoursLeft = closedAt ? Math.max(0, Math.ceil((closedAt.getTime() + 24 * 60 * 60 * 1000 - Date.now()) / 3600000)) : 0
                    return (
                        <div style={{ flexShrink: 0, marginTop: 12, padding: '14px 18px', background: 'var(--bg-secondary)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                {canReopen
                                    ? L(`工单已关闭 (可在 ${hoursLeft} 小时内重新开启)`, `Ticket closed (can reopen within ${hoursLeft} hours)`)
                                    : L('工单已关闭超过 24 小时，请提交新工单。', 'Ticket closed for over 24 hours. Please submit a new ticket.')}
                            </span>
                            {canReopen && (
                                <button className="btn btn-secondary" onClick={async () => {
                                    const r = await fetch(`/api/platform/tickets/${selectedTicket.id}/reopen`, {
                                        method: 'POST', headers: { Authorization: `Bearer ${authToken}` }
                                    })
                                    if (r.ok) {
                                        showToast(L('工单已重新开启', 'Ticket reopened'), 'success')
                                        const dr = await fetch(`/api/platform/tickets/${selectedTicket.id}`, { headers: { Authorization: `Bearer ${authToken}` } })
                                        const dd = await dr.json()
                                        setSelectedTicket(dd.ticket)
                                    } else {
                                        const d = await r.json()
                                        showToast(d.error || L('操作失败', 'Operation failed'), 'error')
                                    }
                                }}>{L('重新开启', 'Reopen')}</button>
                            )}
                        </div>
                    )
                })()}
            </div>
        )
    }

    return (
        <div className="admin-page">
            <div className="page-header">
                <h2>{L('联系平台客服', 'Contact Support')}</h2>
                <button className="btn btn-primary" onClick={() => setView('create')}>{L('+ 提交新工单', '+ New Ticket')}</button>
            </div>
            {loading ? <p>{L('加载中...', 'Loading...')}</p> : tickets.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                    <FiSend size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
                    <p>{L('暂无工单。如果您需要帮助，请提交工单。', 'No tickets yet. Submit a ticket if you need help.')}</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {tickets.map(t => {
                        const s = statusMap[t.status] || statusMap.OPEN
                        const lastMsg = t.messages?.[0]
                        return (
                            <div key={t.id} onClick={() => { setSelectedTicket(null); setView('detail'); fetch(`/api/platform/tickets/${t.id}`, { headers: { Authorization: `Bearer ${authToken}` } }).then(r => r.json()).then(d => setSelectedTicket(d.ticket)) }} style={{
                                padding: '16px 20px', border: '1px solid var(--border-color)',
                                borderRadius: 10, cursor: 'pointer', background: 'var(--bg-card)',
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                transition: 'border-color 0.15s'
                            }}>
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{t.subject}</div>
                                    {lastMsg && <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>{lastMsg.senderType === 'ADMIN' ? L('客服: ', 'Support: ') : ''}{lastMsg.content?.slice(0, 50)}</div>}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <span style={{ fontSize: '0.75rem', padding: '3px 10px', borderRadius: 12, background: `${s.color}20`, color: s.color, fontWeight: 600 }}>{s.label}</span>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(t.updatedAt).toLocaleDateString()}</span>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
// 平台公告组件（显示在商户后台仪表盘顶部）
// 平台公告组件（显示在商户后台仪表盘顶部）
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
        fetch('/api/admin/plan-limits', { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.json())
            .then(d => setPlan(d.plan))
            .catch(() => {})
    }, [token])

    if (plan !== 'FREE') return null

    const basePath = window.location.pathname.replace(/\/?$/, '') || '/admin'
    const settingsPath = basePath.replace(/\/[^/]*$/, '/settings') || '/admin/settings'

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
    const basePath = location.pathname.replace(/\/?$/, '') || '/admin'
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
                const res = await fetch(`/api/admin/dashboard/trend?days=${trendDays}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
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
                        <span className={`trend-tab ${trendDays === 7 ? 'active' : ''}`} onClick={() => setTrendDays(7)}>7d</span>
                        <span className={`trend-tab ${trendDays === 30 ? 'active' : ''}`} onClick={() => setTrendDays(30)}>30d</span>
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
        if (diffMins < 60) return L(`${diffMins} 分钟前`, `${diffMins}m ago`)
        const diffHours = Math.floor(diffMins / 60)
        if (diffHours < 24) return L(`${diffHours} 小时前`, `${diffHours}h ago`)
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
                                    navigate(`${basePath}/cards?productId=${firstId}`)
                                } else {
                                    navigate(`${basePath}/cards`)
                                }
                            }}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault()
                                    const firstId = stats.stockAlertProducts[0]?.id
                                    if (firstId) {
                                        navigate(`${basePath}/cards?productId=${firstId}`)
                                    } else {
                                        navigate(`${basePath}/cards`)
                                    }
                                }
                            }}
                        >
                            <FiAlertTriangle />
                            <span className="alert-stock-text">
                                🔴 {L(`${stats.stockAlertProducts.length} 个商品缺货:`, `${stats.stockAlertProducts.length} product(s) out of stock:`)}
                            </span>
                            <span className="alert-stock-links">
                                {stats.stockAlertProducts.map((p) => (
                                    <Link
                                        key={p.id}
                                        to={`${basePath}/cards?productId=${p.id}`}
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
                        <Link to={`${basePath}/tickets`} className="alert-item alert-warning">
                            <FiMessageCircle />
                            <span>{L(`${stats.pendingTickets} 个未读工单`, `${stats.pendingTickets} unread ticket(s)`)}</span>
                            <FiTrendingUp className="alert-arrow" />
                        </Link>
                    )}
                    {stats.paidOrders > 0 && (
                        <Link to={`${basePath}/orders?status=PAID`} className="alert-item alert-shipping">
                            <FiSend />
                            <span>{L(`${stats.paidOrders} 个待发货订单`, `${stats.paidOrders} order(s) to ship`)}</span>
                            <FiTrendingUp className="alert-arrow" />
                        </Link>
                    )}
                    {stats.refundingOrders > 0 && (
                        <Link to={`${basePath}/orders?status=REFUNDING`} className="alert-item alert-refund">
                            <FiAlertCircle />
                            <span>{L(`${stats.refundingOrders} 个待退款订单`, `${stats.refundingOrders} order(s) pending refund`)}</span>
                            <FiTrendingUp className="alert-arrow" />
                        </Link>
                    )}
                    {stats.unpaidOrders > 0 && (
                        <div className="alert-item alert-info">
                            <FiClock />
                            <span>{L(`${stats.unpaidOrders} 个待支付订单`, `${stats.unpaidOrders} unpaid order(s)`)}</span>
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
                                    <div className="stat-trend up"><FiTrendingUp />&nbsp;+{stats.todayOrders} {L('admin.dashboard.stats.todaySuffix')}</div>
                                )}
                            </div>
                            <span className="stat-value">{stats.totalOrders.toLocaleString()}</span>
                            <span className="stat-label">{L('admin.dashboard.stats.totalOrders')}</span>
                        </div>
                    </div>

                    <div className={`stat-card accent-revenue ${expandedCard === 'revenue' ? 'expanded' : ''}`} onClick={() => setExpandedCard(expandedCard === 'revenue' ? null : 'revenue')}>
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

                    <div className={`stat-card accent-products ${expandedCard === 'products' ? 'expanded' : ''}`} onClick={() => setExpandedCard(expandedCard === 'products' ? null : 'products')}>
                        <div className="stat-card-header">
                            <div className="stat-card-top">
                                <div className="stat-icon products"><FiBox /></div>
                            </div>
                            <span className="stat-value">{stats.totalProducts.toLocaleString()}</span>
                            <span className="stat-label">{L('admin.dashboard.stats.totalProducts')}</span>
                        </div>
                    </div>

                    <div className={`stat-card accent-users ${expandedCard === 'users' ? 'expanded' : ''}`} onClick={() => setExpandedCard(expandedCard === 'users' ? null : 'users')}>
                        <div className="stat-card-header">
                            <div className="stat-card-top">
                                <div className="stat-icon users"><FiUsers /></div>
                            </div>
                            <span className="stat-value">{stats.totalUsers.toLocaleString()}</span>
                            <span className="stat-label">{L('admin.dashboard.stats.totalUsers')}</span>
                        </div>
                    </div>

                    <div className={`stat-card accent-visits ${expandedCard === 'visits' ? 'expanded' : ''}`} onClick={() => setExpandedCard(expandedCard === 'visits' ? null : 'visits')}>
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
                        <span className="payment-count">{L(`${stats.unpaidOrders} 笔待确认`, `${stats.unpaidOrders} pending`)}</span>
                    </div>
                    <div className="payment-summary-grid">
                        {Object.entries(stats.paymentMethodSummary).map(([method, data]) => (
                            <div key={method} className={`payment-summary-item ${method}`}>
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
                                        <span className={`payment-badge ${p.paymentMethod}`}>
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
                                    <span className={`status-badge ${order.status?.toLowerCase()}`}>
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


function ProductsManage() {
    const L = useAdminL()
    const location = useLocation()
    // 推导 basePath：从Current路径反向计算（admin 路径是 .../admin/products）
    const basePath = location.pathname.replace(/\/products.*$/, '') || '/admin'
    const { showToast, showConfirm } = useToast()
    const token = useAuthStore(state => state.token)
    const navigate = useNavigate()
    const [showModal, setShowModal] = useState(false)
    const [showCategoryModal, setShowCategoryModal] = useState(false)
    const [editingProduct, setEditingProduct] = useState(null)
    const [pendingImages, setPendingImages] = useState([]) // pending的图片
    const [uploadProgress, setUploadProgress] = useState(0)
    const [isUploading, setIsUploading] = useState(false)
    const [products, setProducts] = useState([]) // 从 API 获取的Product
    const [categories, setCategories] = useState([]) // 分类列表
    const [loading, setLoading] = useState(true)
    const [stockMode, setStockMode] = useState('auto') // 'auto' = 库存=卡密数量, 'manual' = 手动设置
    const [newCategory, setNewCategory] = useState({ name: '', icon: '📦' })
    const [editingCategory, setEditingCategory] = useState(null) // { id, name, icon }
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        fullDescription: '',
        price: '',
        stock: '',
        categoryId: '',
        images: [],
        weight: 0,
        variants: [], // Variants
        wholesalePrices: [], // 批发价阶梯（无Variant时用）
        wholesaleTiers: [], // 扁平批发价列表（有Variant时用）
        status: 'active'
    })

    // 从 API 获取Product列表和设置
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
            console.error('获取库存警报设置Failed:', e)
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
            showToast(isEnabled ? L('已关闭库存警报', 'Stock alert disabled') : L('已开启库存警报', 'Stock alert enabled'), 'success')
        } catch (e) {
            showToast(L('设置失败', 'Setting failed'), 'error')
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
            console.error('获取设置Failed:', error)
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
            console.error('获取Product列表Failed:', error)
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
            console.error('获取分类Failed:', error)
        }
    }

    // Add Category
    const handleAddCategory = async () => {
        if (!newCategory.name.trim()) {
            showToast(L('请输入分类名称', 'Enter category name'), 'error')
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
            if (!response.ok) throw new Error('Failed to add')
            showToast(L('分类添加成功', 'Category added'), 'success')
            setNewCategory({ name: '', icon: '📦' })
            fetchCategories()
        } catch (error) {
            showToast(L('分类添加失败', 'Failed to add category'), 'error')
        }
    }

    // Delete分类
    const handleDeleteCategory = async (categoryId, categoryName) => {
        showConfirm(L('删除分类', 'Delete Category'), L(`确定要删除分类 "${categoryName}" 吗？`, `Delete category "${categoryName}"?`), async () => {
            try {
                const response = await fetch(`/api/admin/categories/${categoryId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                })
                if (!response.ok) throw new Error('Delete failed')
                showToast(L('分类已删除', 'Category deleted'), 'success')
                fetchCategories()
            } catch (error) {
                showToast(L('分类删除失败', 'Failed to delete category'), 'error')
            }
        })
    }

    // 更新分类
    const handleUpdateCategory = async () => {
        if (!editingCategory) return
        if (!editingCategory.name.trim()) {
            showToast(L('请输入分类名称', 'Enter category name'), 'error')
            return
        }
        try {
            const response = await fetch(`/api/admin/categories/${editingCategory.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: editingCategory.name,
                    icon: editingCategory.icon
                })
            })
            if (!response.ok) throw new Error('Update failed')
            showToast(L('分类已更新', 'Category updated'), 'success')
            setEditingCategory(null)
            fetchCategories()
        } catch (error) {
            showToast(L('分类更新失败', 'Failed to update category'), 'error')
        }
    }

    // 打开Categories弹窗
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
            stock: '',
            categoryId: '',
            images: [],
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
            stock: product.stock?.toString() || '',
            categoryId: product.categoryId || '',
            images: product.images || [],
            weight: product.weight || 0,
            variants: (product.variants || []).map(v => ({
                type: v.type || '',
                name: v.name,
                price: v.price.toString(),
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
            // 自动检测是否EnableVariant类型分组（如果有任何Variant带 type 则Enable）
            enableVariantTypes: (product.variants || []).some(v => v.type && v.type.trim() !== ''),
            status: product.status?.toLowerCase() || 'active',
            deliveryNote: product.deliveryNote || ''
        })
        fetchCategories()
        setShowModal(true)
    }

    const handleDelete = (product) => {
        showConfirm(
            L('删除商品', 'Delete Product'),
            L(`确定要删除商品 "${product.name}" 吗？此操作无法撤销。`, `Delete product "${product.name}"? This cannot be undone.`),
            async () => {
                try {
                    const response = await fetch(`/api/admin/products/${product.id}`, {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    })
                    if (!response.ok) {
                        throw new Error('Delete failed')
                    }
                    showToast(L('商品已删除', 'Product deleted'), 'success')
                    fetchProducts()
                } catch (error) {
                    showToast(L('删除失败: ', 'Delete failed: ') + error.message, 'error')
                }
            }
        )
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        // 校验：必须有Variant价格 或 顶层售价
        const validVariants = formData.variants.filter(v => v.name && v.price)
        const topPrice = parseFloat(formData.price)
        if (validVariants.length === 0 && (!topPrice || topPrice <= 0)) {
            showToast(L('请添加商品规格，或在“售价”字段中输入价格', 'Please add product variants, or enter a price in the "Price" field'), 'error')
            return
        }

        // 准备Products据
        // 提取图片路径数组
        const imagePaths = formData.images.map(img => {
            if (typeof img === 'string') return img
            return img.urls?.medium || img.urls?.original || img
        })

        // 价格：有Variant则后端自动取最低；没Variant用顶层售价
        const productData = {
            name: formData.name,
            description: formData.description,
            fullDescription: formData.fullDescription,
            price: validVariants.length > 0 ? 0 : (parseFloat(formData.price) || 0),
            stock: formData.stock ? parseInt(formData.stock) : 0,
            image: imagePaths[0] || null,
            images: imagePaths,
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
                throw new Error(error.error || 'Operation failed')
            }

            if (editingProduct) {
                showToast(L('商品已更新', 'Product updated'), 'success')
            } else {
                showToast(L('商品添加成功', 'Product added'), 'success')
            }
            setShowModal(false)
            // Refresh页面以显示新Product（临时方案）
            fetchProducts()
        } catch (error) {
            showToast(L('操作失败: ', 'Operation failed: ') + error.message, 'error')
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
                showToast(L(`${file.name} 不是图片文件`, `${file.name} is not an image file`), 'warning')
                continue
            }
            if (file.size > 5 * 1024 * 1024) {
                showToast(L(`${file.name} 超过了 5MB限制`, `${file.name} exceeds 5MB`), 'warning')
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

    // Upload待Upload图片
    const handleUploadImages = async () => {
        if (pendingImages.length === 0) {
            showToast(L('请先选择图片', 'Please select images first'), 'warning')
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
                throw new Error('Upload failed')
            }

            const result = await response.json()

            // Add到Uploaded列表
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
            showToast(L(`成功上传 ${result.images.length} 张图片`, `Successfully uploaded ${result.images.length} images`), 'success')
        } catch (error) {
            showToast(L('图片上传失败: ', 'Image upload failed: ') + error.message, 'error')
        } finally {
            setIsUploading(false)
        }
    }

    // Delete待Upload图片
    const removePendingImage = (index) => {
        setPendingImages(prev => prev.filter((_, i) => i !== index))
    }

    // DeleteUploaded图片
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
            showToast(L('图片已删除', 'Image deleted'), 'success')
        } catch (error) {
            showToast(L('删除失败', 'Delete failed'), 'error')
        }
    }

    return (
        <div className="manage-page">
            <div className="page-header">
                <h2>{L('admin.products.title')}</h2>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button className="btn btn-secondary" onClick={openCategoryModal}>{L('admin.products.categories')}</button>
                    <button className="btn btn-primary" onClick={handleAdd}>{L('admin.products.add')}</button>
                </div>
            </div>
            <div className="products-table-wrapper">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>{L('admin.products.table.name')}</th>
                            <th>{L('admin.products.table.price')}</th>
                            <th>{L('admin.products.table.stock')}</th>
                            <th>{L('admin.cards.sold')}</th>
                            <th>{L('admin.products.table.weight')}</th>
                            <th>{L('admin.common.status')}</th>
                            <th>{L('admin.common.actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="8" style={{ textAlign: 'center', padding: '40px' }}>{L('admin.common.loading')}</td></tr>
                        ) : products.length === 0 ? (
                            <tr><td colSpan="8" style={{ textAlign: 'center', padding: '40px' }}>{L('inline.no.products.e7dfa4b')}</td></tr>
                        ) : products.map(product => (
                            <tr key={product.id}>
                                <td>{product.name}</td>
                                <td>{formatMoney(product.price)}</td>
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
                                    <span className={`status-badge ${product.status?.toLowerCase()}`}>
                                        {product.status === 'ACTIVE' ? L('admin.products.active') : L('admin.products.inactive')}
                                    </span>
                                </td>
                                <td className="actions">
                                    <button className="action-btn edit" onClick={() => handleEdit(product)}>{L('admin.common.edit')}</button>
                                    <button className="action-btn cards" onClick={() => navigate(`${basePath}/cards?productId=${product.id}`)}>{L('admin.products.cards')}</button>
                                    <button
                                        className={`action-btn ${stockAlertIds.includes(product.id) ? 'alert-on' : 'alert-off'}`}
                                        onClick={(e) => { e.stopPropagation(); toggleStockAlert(product.id) }}
                                        title={stockAlertIds.includes(product.id) ? L('禁用库存警报', 'Disable stock alert') : L('启用库存警报', 'Enable stock alert')}
                                    >
                                        {stockAlertIds.includes(product.id) ? <FiBell /> : <FiBellOff />}
                                    </button>
                                    <button className="action-btn delete" onClick={() => handleDelete(product)}>{L('admin.common.delete')}</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Add/Edit Product弹窗 */}
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>{editingProduct ? L('inline.edit.product.f161576') : L('admin.products.add')}</h3>
                            <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
                        </div>
                        <form onSubmit={handleSubmit} className="modal-form">
                            <div className="form-group">
                                <label>{L('admin.products.table.name')} *</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    placeholder={L('admin.products.table.name')}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>{L('简短描述', 'Short Description')} <span style={{ color: '#999', fontWeight: 'normal' }}>{L('（展示在商品卡片及标题下方）', '(shown on product card and below title)')}</span></label>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    placeholder={L('商品亮点一句话介绍', 'One-line product highlight')}
                                    rows={2}
                                />
                            </div>
                            <div className="form-group">
                                <label>{L('详细描述', 'Full Description')} <span style={{ color: '#999', fontWeight: 'normal' }}>{L('（展示在商品详情页底部）', '(shown at bottom of product detail page)')}</span></label>
                                <textarea
                                    name="fullDescription"
                                    value={formData.fullDescription}
                                    onChange={handleChange}
                                    placeholder={L('【商品详情】\\n• 介绍详情1\\n• 介绍详情2\\n\\n【使用说明】\\n1. 第一步\\n2. 第二步', '【Product Info】\\n• Item detail 1\\n• Item detail 2\\n\\n【How to Use】\\n1. Step one\\n2. Step two')}
                                    rows={6}
                                />
                            </div>

                            {/* Variants - 放在价格上方 */}
                            <div className="form-group variants-section">
                                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <span>
                                        {L('规格变体', 'Variants')}
                                        <span style={{ color: '#999', fontWeight: 'normal', marginLeft: 8 }}>
                                            {L('（可选，例如：月付、季付、年付）', '(optional, e.g.: Monthly, Quarterly, Annual)')}
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
                                        {L('启用规格分组', 'Enable variant type grouping')}
                                    </label>
                                </label>

                                {formData.enableVariantTypes ? (
                                    /* 带类型分组的Variant */
                                    <>
                                        {(() => {
                                            // 按类型分组Variant
                                            const types = [...new Set(formData.variants.map(v => v.type || 'Default').filter(Boolean))]
                                            if (types.length === 0) types.push('Default')

                                            return types.map((typeName, typeIndex) => (
                                                <div key={typeIndex} className="variant-type-group" style={{
                                                    border: '1px solid var(--border-color)',
                                                    borderRadius: 8,
                                                    padding: 16,
                                                    marginBottom: 12,
                                                    background: 'var(--card-bg)'
                                                }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                                                        <span style={{ fontWeight: 500 }}>{L('类型:', 'Type:')}</span>
                                                        <input
                                                            type="text"
                                                            value={typeName === 'Default' ? '' : typeName}
                                                            placeholder={L('输入规格类型名称，如：共享型、独享型', 'Enter type name, e.g.: Shared, Dedicated')}
                                                            onChange={(e) => {
                                                                const oldType = typeName
                                                                const newType = e.target.value || 'Default'
                                                                const newVariants = formData.variants.map(v =>
                                                                    (v.type || 'Default') === oldType ? { ...v, type: newType === 'Default' ? '' : newType } : v
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
                                                                    const newVariants = formData.variants.filter(v => (v.type || 'Default') !== typeName)
                                                                    setFormData({ ...formData, variants: newVariants })
                                                                }}
                                                                title={L('删除此类型', 'Delete this type')}
                                                            >
                                                                ✕
                                                            </button>
                                                        )}
                                                    </div>

                                                    {/* 该类型下的Variant列表 */}
                                                    {formData.variants
                                                        .map((v, i) => ({ ...v, originalIndex: i }))
                                                        .filter(v => (v.type || 'Default') === typeName)
                                                        .map((variant) => (
                                                            <div key={variant.originalIndex} className="variant-row">
                                                                <button
                                                                    type="button"
                                                                    className="move-variant-btn"
                                                                    disabled={variant.originalIndex === 0 || (formData.variants[variant.originalIndex - 1]?.type || '') !== (variant.type || '')}
                                                                    title={L('上移', 'Move up')}
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
                                                                    placeholder={L('规格名称', 'Variant name')}
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
                                                                    placeholder={L('售价', 'Price')}
                                                                    value={variant.price}
                                                                    onChange={(e) => {
                                                                        const newVariants = [...formData.variants]
                                                                        newVariants[variant.originalIndex].price = e.target.value
                                                                        setFormData({ ...formData, variants: newVariants })
                                                                    }}
                                                                    step="0.01"
                                                                    style={{ flex: 1 }}
                                                                />
                                                                {stockMode === 'manual' && (
                                                                <input
                                                                    type="number"
                                                                    placeholder={L('库存', 'Stock')}
                                                                    value={variant.stock}
                                                                    onChange={(e) => {
                                                                        const newVariants = [...formData.variants]
                                                                        newVariants[variant.originalIndex].stock = e.target.value
                                                                        setFormData({ ...formData, variants: newVariants })
                                                                    }}
                                                                    style={{ flex: 1 }}
                                                                />
                                                                )}
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
                                                                    type: typeName === 'Default' ? '' : typeName,
                                                                    name: '',
                                                                    price: '',
                                                                    
                                                                    stock: '0'
                                                                }]
                                                            })
                                                        }}
                                                    >
                                                        + {L('添加规格', 'Add Variant')}
                                                    </button>
                                                </div>
                                            ))
                                        })()}

                                        <button
                                            type="button"
                                            className="add-variant-btn"
                                            style={{ background: 'transparent', border: '2px dashed var(--border-color)', color: 'var(--primary-color)' }}
                                            onClick={() => {
                                                const existingTypes = [...new Set(formData.variants.map(v => v.type || 'Default'))]
                                                const newTypeName = `Type${existingTypes.length + 1}`
                                                setFormData({
                                                    ...formData,
                                                    variants: [...formData.variants, {
                                                        type: newTypeName,
                                                        name: '',
                                                        price: '',
                                                        
                                                        stock: '0'
                                                    }]
                                                })
                                            }}
                                        >
                                            + {L('添加规格类型', 'Add Type')}
                                        </button>
                                    </>
                                ) : (
                                    /*None类型分组的简单Variant */
                                    <>
                                        {formData.variants.map((variant, index) => (
                                            <div key={index} className="variant-row">
                                                <button
                                                    type="button"
                                                    className="move-variant-btn"
                                                    disabled={index === 0}
                                                    title={L('上移', 'Move up')}
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
                                                    placeholder={L('规格名称', 'Variant name')}
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
                                                    placeholder={L('售价', 'Price')}
                                                    value={variant.price}
                                                    onChange={(e) => {
                                                        const newVariants = [...formData.variants]
                                                        newVariants[index].price = e.target.value
                                                        setFormData({ ...formData, variants: newVariants })
                                                    }}
                                                    step="0.01"
                                                    style={{ flex: 1 }}
                                                />
                                                {stockMode === 'manual' && (
                                                <input
                                                    type="number"
                                                    placeholder={L('库存', 'Stock')}
                                                    value={variant.stock}
                                                    onChange={(e) => {
                                                        const newVariants = [...formData.variants]
                                                        newVariants[index].stock = e.target.value
                                                        setFormData({ ...formData, variants: newVariants })
                                                    }}
                                                    style={{ flex: 1 }}
                                                />
                                                )}
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
                                                    variants: [...formData.variants, { name: '', price: '',  stock: '0' }]
                                                })
                                            }}
                                        >
                                            + {L('添加规格', 'Add Variant')}
                                        </button>
                                    </>
                                )}
                            </div>

                            {/* 售价 + 库存（始终显示售价；手动Stock Mode +NoneVariant才显示库存） */}
                            <div className="form-row">
                                <div className="form-group">
                                    <label>{L('商品售价', 'Price')} ({getCurrencySymbol()}) *</label>
                                    <input
                                        type="number"
                                        name="price"
                                        value={formData.price}
                                        onChange={handleChange}
                                        placeholder="0.00"
                                        step="0.01"
                                        required={!(formData.variants.length > 0 && formData.variants.some(v => v.name))}
                                    />
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                        {L('添加规格变体后，商品售价将以规格定价为准', 'When variants are added, price follows variant pricing')}
                                    </span>
                                </div>
                                {!(formData.variants.length > 0 && formData.variants.some(v => v.name)) && stockMode === 'manual' && (
                                    <div className="form-group">
                                        <label>{L('库存 *', 'Stock *')}</label>
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

                            {/* Wholesale Pricing —— 独立区块，有Variant时Approve下拉绑定Variant Name */}
                            <div className="form-group wholesale-section">
                                <label>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle', marginRight: 6 }}>
                                        <polyline points="7 13 12 18 17 13" />
                                        <polyline points="7 6 12 11 17 6" />
                                    </svg>
                                    {L('批发价格阶梯 (起批价)', 'Wholesale Pricing')}
                                    <span style={{ color: '#999', fontWeight: 'normal', fontSize: '0.85rem', marginLeft: 8 }}>
                                        {L('当购买达到指定数量时自动适用此价格', 'Auto-applied when minimum quantity is reached')}
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
                                                                <span className="wholesale-editor__col-label">{L('绑定规格', 'Variant')}</span>
                                                            )}
                                                            <span className="wholesale-editor__col-label">{L('起购数量', 'Min Qty')}</span>
                                                            <span className="wholesale-editor__col-label">{L('批发单价', 'Unit Price')} ({getCurrencySymbol()})</span>
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
                                                                    placeholder={L('如: 10', 'e.g. 10')}
                                                                    min="1"
                                                                    value={tier.minQty}
                                                                    onChange={(e) => updateTier(tier._key, 'minQty', e.target.value)}
                                                                />
                                                            </div>
                                                            <div className="wholesale-editor__input-wrap">
                                                                <input
                                                                    type="number"
                                                                    className="wholesale-editor__input"
                                                                    placeholder={L('如: 9.90', 'e.g. 9.90')}
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
                                                                title={L('删除此阶梯', 'Delete this tier')}
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
                                                        {L('添加批发价阶梯', 'Add wholesale tier')}
                                                    </button>
                                                </>
                                            )
                                        })()}
                                    </div>
                                </div>
                            </div>

                            <div className="form-group">
                                <label>{L('所属分类', 'Category')}</label>
                                <CustomSelect
                                    name="categoryId"
                                    value={formData.categoryId}
                                    onChange={handleChange}
                                    placeholder={L('选择分类', 'Select category')}
                                    options={categories.map(cat => ({
                                        value: cat.id,
                                        label: `${cat.icon} ${cat.name}`
                                    }))}
                                />
                            </div>
                            <div className="form-group">
                                <label>{L('商品排序权重', 'Product Weight')} <span style={{ color: '#999', fontWeight: 'normal' }}>{L('（0-100，数值越大排序越靠前，默认 0）', '(0-100，Higher = higher priority, default 0)')}</span></label>
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
                                <label>{L('商品图片', 'Product Images')} <span className="upload-count">{L(`（已上传 ${formData.images.length} 张，${pendingImages.length} 张待上传）`, `(${formData.images.length} uploaded, ${pendingImages.length} pending)`)}</span></label>
                                <div className="image-upload-area multi">
                                    {/* Uploaded images */}
                                    {formData.images.map((img, index) => {
                                        // 处理不同格式 of 图片数据
                                        const imgUrl = typeof img === 'string'
                                            ? `${img}`
                                            : img.urls?.medium
                                                ? `${img.urls.medium}`
                                                : `${img.urls?.original || img}`
                                        return (
                                            <div key={`uploaded-${index}`} className="image-preview uploaded">
                                                <img src={imgUrl} alt={`Uploaded ${index + 1}`} />
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

                                    {/* pending的图片 */}
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
                                            <span className="image-status pending">{L('待上传', 'pending')}</span>
                                        </div>
                                    ))}

                                    {/* Add Image按钮 */}
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
                                            <span>{L('添加图片', 'Add Image')}</span>
                                        </div>
                                    </label>
                                </div>

                                {/* Upload按钮和进度 */}
                                {pendingImages.length > 0 && (
                                    <div className="upload-actions">
                                        <button
                                            type="button"
                                            className="btn btn-primary upload-btn"
                                            onClick={handleUploadImages}
                                            disabled={isUploading}
                                        >
                                            {isUploading ? L('上传中...', 'Uploading...') : L(`上传 ${pendingImages.length} 张图片`, `Upload ${pendingImages.length} image(s)`)}
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
                                <label>{L('发货附言 (提货说明)', 'Delivery Note')} <span style={{ color: '#999', fontWeight: 'normal' }}>{L('（发货后展示在订单提货页面，不填则隐藏）', '(Shown on order page after shipping. Leave empty to hide.)')}</span></label>
                                <textarea
                                    name="deliveryNote"
                                    value={formData.deliveryNote}
                                    onChange={handleChange}
                                    placeholder={L('例如：请使用浏览器无痕模式登录...', 'e.g. Please login in incognito mode...')}
                                    rows={3}
                                    style={{ resize: 'vertical' }}
                                />
                            </div>
                            <div className="form-group">
                                <label>{L('状态', 'Status')}</label>
                                <select name="status" value={formData.status} onChange={handleChange}>
                                    <option value="active">{L('上架销售', 'Active')}</option>
                                    <option value="inactive">{L('下架仓库', 'Inactive')}</option>
                                </select>
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                                    {L('取消', 'Cancel')}
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    {editingProduct ? L('保存修改', 'Save Changes') : L('admin.products.add')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Categories弹窗 */}
            {showCategoryModal && (
                <div className="modal-overlay" onClick={() => setShowCategoryModal(false)}>
                    <div className="modal-content" style={{ maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>📁 {L('分类管理', 'Categories')}</h3>
                            <button className="modal-close" onClick={() => setShowCategoryModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            {/* Add New Category */}
                            <div style={{ marginBottom: '20px', padding: '16px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                                <h4 style={{ marginBottom: '12px', fontSize: '14px', color: 'var(--text-secondary)' }}>{L('添加新分类', 'Add New Category')}</h4>
                                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                                    <input
                                        type="text"
                                        placeholder={L('图标 (表情)', 'Icon (emoji)')}
                                        value={newCategory.icon}
                                        onChange={e => setNewCategory(prev => ({ ...prev, icon: e.target.value }))}
                                        className="input"
                                        style={{ width: '80px', textAlign: 'center', fontSize: '20px' }}
                                    />
                                    <input
                                        type="text"
                                        placeholder={L('分类名称', 'Category Name')}
                                        value={newCategory.name}
                                        onChange={e => setNewCategory(prev => ({ ...prev, name: e.target.value }))}
                                        className="input"
                                        style={{ flex: 1 }}
                                    />
                                    <button className="btn btn-primary" onClick={handleAddCategory}>{L('添加', 'Add')}</button>
                                </div>
                            </div>

                            {/* 分类列表 */}
                            <div>
                                <h4 style={{ marginBottom: '12px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                                    {L(`已有分类 (${categories.length})`, `Existing Categories (${categories.length})`)}
                                </h4>
                                {categories.length === 0 ? (
                                    <p style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '20px' }}>{L('暂无分类', 'No categories')}</p>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {categories.map(cat => (
                                            editingCategory?.id === cat.id ? (
                                                <div key={cat.id} style={{
                                                    padding: '12px 16px',
                                                    background: 'var(--bg-secondary)',
                                                    borderRadius: '8px',
                                                    border: '1px solid var(--primary, #ff6b35)',
                                                    display: 'flex', flexDirection: 'column', gap: 8
                                                }}>
                                                    <div style={{ display: 'flex', gap: 8 }}>
                                                        <input
                                                            type="text"
                                                            value={editingCategory.icon}
                                                            onChange={e => setEditingCategory(prev => ({ ...prev, icon: e.target.value }))}
                                                            className="input"
                                                            style={{ width: 70, textAlign: 'center', fontSize: 18 }}
                                                            placeholder={L('图标', 'Icon')}
                                                        />
                                                        <input
                                                            type="text"
                                                            value={editingCategory.name}
                                                            onChange={e => setEditingCategory(prev => ({ ...prev, name: e.target.value }))}
                                                            className="input"
                                                            style={{ flex: 1 }}
                                                            placeholder={L('分类名称', 'Category Name')}
                                                        />
                                                    </div>
                                                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                                        <button
                                                            className="btn btn-secondary"
                                                            onClick={() => setEditingCategory(null)}
                                                            style={{ padding: '6px 14px', fontSize: '0.85rem' }}
                                                        >{L('admin.common.cancel')}</button>
                                                        <button
                                                            className="btn btn-primary"
                                                            onClick={handleUpdateCategory}
                                                            style={{ padding: '6px 14px', fontSize: '0.85rem' }}
                                                        >{L('保存', 'Save')}</button>
                                                    </div>
                                                </div>
                                            ) : (
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
                                                                {L(`${cat.productCount || 0} 个商品`, `${cat.productCount || 0} product(s)`)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div style={{ display: 'flex', gap: 8 }}>
                                                        <button
                                                            className="action-btn edit"
                                                            onClick={() => setEditingCategory({ id: cat.id, name: cat.name, icon: cat.icon || '📦' })}
                                                            style={{ padding: '6px 12px' }}
                                                        >{L('编辑', 'Edit')}</button>
                                                        <button
                                                            className="action-btn delete"
                                                            onClick={() => handleDeleteCategory(cat.id, cat.name)}
                                                            style={{ padding: '6px 12px' }}
                                                        >{L('删除', 'Delete')}</button>
                                                    </div>
                                                </div>
                                            )
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
function OrdersManage() {
    const L = useAdminL()
    const location = useLocation()
    const basePath = location.pathname.replace(/\/orders.*$/, '') || '/admin'
    // 商户店面下用 /v/:slug 前缀；Main Site直接用 /order/...
    const storefrontPrefix = basePath.startsWith('/v/')
        ? basePath.replace(/\/admin$/, '')
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
            const res = await fetch(`/api/admin/orders?${params}`, {
                headers: { 'Authorization': `Bearer ${token}` }
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
                showToast(data.emailSent ? L(`已重发 (${data.totalCards} 张卡密)，邮件已发送`, `Resent (${data.totalCards} keys), email sent`) : L('卡密已重发，但邮件发送失败', 'Resent, but email failed'), data.emailSent ? 'success' : 'warning')
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
            L(`确定要将订单 ${order.orderNo} 标记为退款中吗？确认后会进入待退款状态，点击“已退款”后才会最终释放卡密回库存。`, `Are you sure you want to mark order ${order.orderNo} as refunding? After confirmation, it will enter pending refund status, and the associated card keys will only be released back to stock after clicking "Refunded".`),
            async () => {
                try {
                    const res = await fetch(`/api/admin/orders/${order.id}/refund`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}` }
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
            L(`确定要将订单 ${order.orderNo} 标记为已退款吗？关联的卡密将会被释放。`, `Are you sure you want to mark order ${order.orderNo} as refunded? Associated keys will be released.`),
            async () => {
                try {
                    const res = await fetch(`/api/admin/orders/${order.id}/refund/complete`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}` }
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
            L(`确定要删除订单 ${order.orderNo} 吗？此操作无法撤销。关联的卡密将被释放。`, `Are you sure you want to delete order ${order.orderNo}? This cannot be undone. Associated keys will be released.`),
            async () => {
                try {
                    const res = await fetch(`/api/admin/orders/${order.id}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${token}` }
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
                        <span className="stat-item">{L(`共 ${totalOrders} 条订单`, `${totalOrders} orders total`)}</span>
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
                                <button className="action-btn view" onClick={() => window.open(`${storefrontPrefix}/order/${order.orderNo}`, '_blank')}>{L('admin.orders.view')}</button>
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
                        {L(`页码 ${currentPage}/${totalPages}`, `Page ${currentPage}/${totalPages}`)} 
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
                                    <span className="order-info-value highlight">{L(`${cardInputOrder.quantity} 件`, `${cardInputOrder.quantity} pcs`)}</span>
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
                                    <span className="card-hint">{isResendMode ? L('多张卡密请用 --- 分隔', 'Separate multiple keys with ---') : (cardInputOrder.quantity === 1 ? L('支持多行卡密内容', 'Supports multi-line content') : L(`请用 --- 分隔，最多输入 ${cardInputOrder.quantity} 个卡密`, `Separate with ---, max ${cardInputOrder.quantity} items`))}</span>
                                </label>
                                <textarea
                                    className="card-input-textarea"
                                    value={cardInputContent}
                                    onChange={(e) => setCardInputContent(e.target.value)}
                                    placeholder={cardInputOrder.quantity === 1 ? L('请输入卡密内容（支持多行）...', 'Enter card key content (multi-line supported)...') : L(`请输入卡密内容...
请用 --- 分隔。例如:
卡密1内容
---
卡密2内容`, `Enter card key content...
Separate with ---. Example:
key1 content
---
key2 content`)}
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
function TicketsManage() {
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
            const res = await fetch(`/api/tickets/admin/${ticket.id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
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
            const res = await fetch(`/api/tickets/admin/${selectedTicket.id}/reply`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
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
            const r = await fetch('/api/upload', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd })
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
            const res = await fetch(`/api/tickets/admin/user-history?${params.toString()}`, {
                headers: { 'Authorization': `Bearer ${token}` }
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
            const res = await fetch(`/api/tickets/admin/${selectedTicket.id}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
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
            ? `userId=${encodeURIComponent(selectedTicket.user.id)}`
            : `email=${encodeURIComponent(email)}`
        const ordersPath = location.pathname.includes('/v/')
            ? location.pathname.replace(/\/admin.*$/, '/admin/orders')
            : '/admin/orders'
        window.open(`${ordersPath}?${param}`, '_blank', 'noopener,noreferrer')
    }

    const handleOpenRelatedOrder = () => {
        const orderNo = selectedTicket?.orderNo
        if (!orderNo) {
            showToast(L('未找到关联订单', 'Associated order not found'), 'warning')
            return
        }
        window.open(`${storefrontPrefix}/order/${encodeURIComponent(orderNo)}`, '_blank', 'noopener,noreferrer')
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
                        <span className="stat-label">{L('admin.tickets.stats.total')}</span>
                    </div>
                </div>
                <div className={`ticket-stat-card ${!unreadFilter && statusFilter === 'OPEN' ? 'active' : ''}`} onClick={() => handleStatusFilterChange('OPEN')}>
                    <div className="stat-icon pending"><FiAlertCircle /></div>
                    <div className="stat-info">
                        <span className="stat-value">{globalStats.open}</span>
                        <span className="stat-label">{L('admin.tickets.stats.pending')}</span>
                    </div>
                </div>
                <div className={`ticket-stat-card ${!unreadFilter && statusFilter === 'IN_PROGRESS' ? 'active' : ''}`} onClick={() => handleStatusFilterChange('IN_PROGRESS')}>
                    <div className="stat-icon processing"><FiActivity /></div>
                    <div className="stat-info">
                        <span className="stat-value">{globalStats.inProgress}</span>
                        <span className="stat-label">{L('admin.tickets.stats.inProgress')}</span>
                    </div>
                </div>
                <div className={`ticket-stat-card ${!unreadFilter && statusFilter === 'PENDING_SUPER_ADMIN' ? 'active' : ''}`} onClick={() => handleStatusFilterChange('PENDING_SUPER_ADMIN')}>
                    <div className="stat-icon super-admin"><FiShield /></div>
                    <div className="stat-info">
                        <span className="stat-value">{globalStats.pendingSuperAdmin}</span>
                        <span className="stat-label">{L('admin.tickets.stats.pendingSuperAdmin')}</span>
                    </div>
                </div>
                <div className={`ticket-stat-card ${!unreadFilter && statusFilter === 'CLOSED' ? 'active' : ''}`} onClick={() => handleStatusFilterChange('CLOSED')}>
                    <div className="stat-icon" style={{ background: 'rgba(100,116,139,0.1)', color: '#64748b' }}><FiCheck /></div>
                    <div className="stat-info">
                        <span className="stat-value">{globalStats.closed}</span>
                        <span className="stat-label">{L('admin.tickets.stats.closed')}</span>
                    </div>
                </div>
                <div className={`ticket-stat-card unread-card ${globalStats.unread > 0 ? 'has-unread' : ''} ${unreadFilter ? 'active' : ''}`}
                    onClick={() => { setUnreadFilter(f => !f); setNoReplyFilter(false); setStatusFilter('all'); setPage(1) }}>
                    <div className="stat-icon unread"><FiMessageCircle /></div>
                    <div className="stat-info">
                        <span className="stat-value">
                            {globalStats.unread > 99 ? '99+' : globalStats.unread}
                        </span>
                        <span className="stat-label">{L('admin.tickets.stats.userUnread')}</span>
                    </div>
                </div>
                <div className={`ticket-stat-card no-reply-card ${globalStats.noReply > 0 ? 'has-no-reply' : ''} ${noReplyFilter ? 'active' : ''}`}
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
                            {L(`${globalStats.unread > 99 ? '99+' : globalStats.unread} 条新用户消息待处理`, `${globalStats.unread > 99 ? '99+' : globalStats.unread} new user message(s) pending`)}
                        </span>
                    )}
                    <span className="total-count">{L(`共 ${totalCount} 个工单`, `Total ${totalCount} ticket(s)`)}</span>
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
                    <p>{unreadFilter ? L('无未读工单', 'No unread tickets') : noReplyFilter ? L('无待回复工单', 'No tickets pending reply') : L(`无 ${statusFilter !== 'all' ? statusMap[statusFilter]?.label : ''}工单`, `No ${statusFilter !== 'all' ? statusMap[statusFilter]?.label : ''} tickets`)}</p>
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
                                            {L(`${ticket.adminUnreadCount > 99 ? '99+' : ticket.adminUnreadCount} 条新消息`, `${ticket.adminUnreadCount > 99 ? '99+' : ticket.adminUnreadCount} new message(s)`)}
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
                    <span className="page-info">{L(`页码 ${page} / ${totalPages}`, `Page ${page} / ${totalPages}`)} </span>
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
                                            className={`message-item ${msg.isAdmin ? 'admin' : 'user'}`}
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
                                            {canReopen ? L(`工单已关闭（剩余 ${hoursLeft} 小时内可重新开启）`, `Ticket closed (${hoursLeft}h, can reopen)`) : L('工单已关闭超过 24 小时', 'Ticket closed for over 24 hours')}
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
                                                    border: `1px solid ${isCurrent ? 'var(--primary)' : 'var(--border-color)'}`,
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
function CardsManage() {
    const L = useAdminL()
    const { showToast } = useToast()
    const { token, user: currentUser } = useAuthStore()
    const isSuperAdmin = ['SUPER_ADMIN', 'TENANT_ADMIN'].includes(currentUser?.role) ||
        (currentUser?.role === 'ADMIN' && currentUser?.permissions?.['cards.delete'])
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

    // 获取Product列表
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
                console.error('获取Product列表Failed:', error)
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
            showToast(L('加载卡密列表失败', 'Failed to load keys'), 'error')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchCards()
    }, [selectedProductId, selectedVariantFilter, statusFilter, keyword, page, token])

    // Batch Import Keys
    const handleImport = async () => {
        if (!selectedProductId) {
            showToast(L('请先选择一个商品', 'Please select a product first'), 'error')
            return
        }
        // 检查Product是否有Variant，有则必须选择
        const selectedProduct = products.find(p => p.id === selectedProductId)
        if (selectedProduct?.variants?.length > 0 && !selectedVariantId) {
            showToast(L('请选择商品规格', 'Select variant'), 'error')
            return
        }
        if (!importText.trim()) {
            showToast(L('请输入卡密内容', 'Enter card key content'), 'error')
            return
        }

        const cardsArray = importMode === 'single'
            ? [importText.trim()]
            : importText.split('\n').map(c => c.trim()).filter(c => c)
        if (cardsArray.length === 0) {
            showToast(L('未找到有效的卡密内容', 'No valid keys'), 'error')
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
                showToast(data.message || L('卡密导入成功', 'Keys imported successfully'), 'success')
                setShowImportModal(false)
                setImportText('')
                fetchCards()
            } else {
                showToast(data.error, 'error')
            }
        } catch (error) {
            showToast(L('导入失败', 'Import failed'), 'error')
        }
    }

    // Delete单个卡密
    const handleDelete = async (id) => {
        if (!confirm(L('确定要删除该卡密吗？', 'Delete this key?'))) return

        try {

            const response = await fetch(`/api/admin/cards/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            })
            const data = await response.json()
            if (response.ok) {
                showToast(data.message || L('删除成功', 'Deleted successfully'), 'success')
                fetchCards()
            } else {
                showToast(data.error, 'error')
            }
        } catch (error) {
            showToast(L('删除失败', 'DeleteFailed'), 'error')
        }
    }

    // Edit Key
    const handleEdit = (card) => {
        setEditingCard(card)
        setEditContent(card.content)
    }

    // SaveEdit
    const handleSaveEdit = async () => {
        if (!editContent.trim()) {
            showToast(L('卡密内容不能为空', 'Key content cannot be empty'), 'error')
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
                showToast(data.message || L('保存成功', 'Saved successfully'), 'success')
                setEditingCard(null)
                setEditContent('')
                fetchCards()
            } else {
                showToast(data.error, 'error')
            }
        } catch (error) {
            showToast(L('保存失败', 'SaveFailed'), 'error')
        }
    }

    // 批量Delete
    const handleBatchDelete = async () => {
        if (selectedCards.length === 0) {
            showToast(L('请选择要删除的卡密', 'Please select keys to delete'), 'error')
            return
        }
        if (!confirm(L(`确定要删除选中的 ${selectedCards.length} 张卡密吗？`, `Delete selected ${selectedCards.length} key(s)?`))) return

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
                showToast(data.message || L('批量删除成功', 'Batch delete success'), 'success')
                setSelectedCards([])
                fetchCards()
            } else {
                showToast(data.error, 'error')
            }
        } catch (error) {
            showToast(L('删除失败', 'DeleteFailed'), 'error')
        }
    }

    // 选择/Cancel选择卡密
    const toggleCardSelection = (id) => {
        setSelectedCards(prev =>
            prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
        )
    }

    // 全选/Cancel全选
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
            case 'AVAILABLE': return <span className="badge badge-success">{L('可用', 'Available')}</span>
            case 'SOLD': return <span className="badge badge-warning">{L('已售出', 'Sold')}</span>
            case 'EXPIRED': return <span className="badge badge-danger">{L('已过期', 'Expired')}</span>
            default: return <span className="badge">{status}</span>
        }
    }

    const selectedProduct = products.find(p => p.id === selectedProductId)
    const productVariants = selectedProduct?.variants || []

    return (
        <div className="manage-page">
            <div className="page-header">
                <h2>{L('admin.cards.title')}</h2>
                <div className="header-actions">
                    {isSuperAdmin && selectedCards.length > 0 && (
                        <button className="btn btn-danger" onClick={handleBatchDelete}>
                            {L('删除选中', 'Delete Selected')} ({selectedCards.length})
                        </button>
                    )}
                    <button
                        className="btn btn-primary"
                        onClick={() => { setShowImportModal(true); setImportText(''); setImportMode('batch') }}
                    >
                        {L('+ 导入卡密', '+ Import Keys')}
                    </button>
                </div>
            </div>

            <div className="cards-stats-grid">
                <div className="cards-stat-card total">
                    <div className="cards-stat-label">{L('总卡密数', 'Total Keys')}</div>
                    <div className="cards-stat-value">{cardStats.total}</div>
                </div>
                <div className="cards-stat-card available">
                    <div className="cards-stat-label">{L('未售出', 'Available')}</div>
                    <div className="cards-stat-value">{cardStats.available}</div>
                </div>
                <div className="cards-stat-card sold">
                    <div className="cards-stat-label">{L('已售出', 'Used')}</div>
                    <div className="cards-stat-value">{cardStats.sold}</div>
                </div>
                <div className="cards-stat-card expired">
                    <div className="cards-stat-label">{L('已过期', 'Expired')}</div>
                    <div className="cards-stat-value">{cardStats.expired}</div>
                </div>
            </div>

            {/* 筛选栏 */}
            <div className="filter-bar">
                <div className="filter-group">
                    <label>{L('选择商品', 'Select Product')}</label>
                    <select
                        value={selectedProductId}
                        onChange={(e) => {
                            setSelectedProductId(e.target.value)
                            setSelectedVariantFilter('')
                            setPage(1)
                            setSelectedCards([])
                        }}
                    >
                        <option value="">{L('全部商品', 'All Products')}</option>
                        {products.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                </div>
                <div className="filter-group">
                    <label>{L('商品规格', 'Variant')}</label>
                    <select
                        value={selectedVariantFilter}
                        onChange={(e) => { setSelectedVariantFilter(e.target.value); setPage(1); }}
                        disabled={!selectedProductId}
                    >
                        <option value="">{L('全部规格', 'All Variants')}</option>
                        <option value="default">{L('默认规格', 'Default Variant')}</option>
                        {productVariants.map(v => (
                            <option key={v.id} value={v.id}>{v.name}</option>
                        ))}
                    </select>
                </div>
                <div className="filter-group">
                    <label>{L('卡密状态', 'Status')}</label>
                    <select
                        value={statusFilter}
                        onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                    >
                        <option value="">{L('全部状态', 'All Status')}</option>
                        <option value="AVAILABLE">{L('可用', 'Available')}</option>
                        <option value="SOLD">{L('已售', 'Sold')}</option>
                        <option value="EXPIRED">{L('已过期', 'Expired')}</option>
                    </select>
                </div>
                <div className="filter-group">
                    <label>{L('搜索', 'Search')}</label>
                    <input
                        type="text"
                        className="filter-search-input"
                        placeholder={L('卡密内容 / 订单号', 'Card Key Content / Order No.')}
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
                    {L(`共 ${total} 条记录`, `Total ${total} records`)}
                </div>
            </div>

            {/* 卡密列表 */}
            {loading ? (
                <div className="loading-state">{L('加载中...', 'Loading...')}</div>
            ) : cards.length === 0 ? (
                <div className="placeholder-content">
                    <FiCreditCard />
                    <p>{selectedProductId ? L('该商品暂无卡密', 'No keys for this product') : L('请选择商品来管理其卡密', 'Select a product to manage its keys')}</p>
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
                                    <th>{L('卡密内容', 'Card Key Content')}</th>
                                    <th>{L('所属商品', 'Product')}</th>
                                    <th>{L('规格', 'Variant')}</th>
                                    <th>{L('状态', 'Status')}</th>
                                    <th>{L('关联订单号', 'Order No.')}</th>
                                    <th>{L('导入时间', 'Created')}</th>
                                    <th>{L('操作', 'Actions')}</th>
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
                                                        {L('编辑', 'Edit')}
                                                    </button>
                                                    {isSuperAdmin && (
                                                        <button
                                                            className="btn btn-sm btn-danger"
                                                            onClick={() => handleDelete(card.id)}
                                                        >
                                                            {L('删除', 'Delete')}
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
                                {L('上一页', 'Prev')}
                            </button>
                            <span>{L(`页码 ${page} / ${totalPages}`, `Page ${page} / ${totalPages}`)}</span>
                            <button
                                disabled={page === totalPages}
                                onClick={() => setPage(p => p + 1)}
                            >
                                {L('下一页', 'Next')}
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
                            <h3>{importMode === 'single' ? L('添加单条卡密', 'Add Key') : L('批量导入卡密', 'Batch Import Keys')}</h3>
                            <button className="modal-close" onClick={() => setShowImportModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            {/* 输入模式切换 */}
                            <div className="import-mode-toggle">
                                <button
                                    className={`mode-btn ${importMode === 'single' ? 'active' : ''}`}
                                    onClick={() => { setImportMode('single'); setImportText('') }}
                                >
                                    {L('单条导入', 'Single')}
                                </button>
                                <button
                                    className={`mode-btn ${importMode === 'batch' ? 'active' : ''}`}
                                    onClick={() => { setImportMode('batch'); setImportText('') }}
                                >
                                    {L('批量导入', 'Batch')}
                                </button>
                            </div>
                            <div className="form-group">
                                <label>{L('目标商品', 'Target Product')}</label>
                                <select
                                    value={selectedProductId}
                                    onChange={(e) => {
                                        setSelectedProductId(e.target.value)
                                        setSelectedVariantId('')
                                    }}
                                >
                                    <option value="">{L('选择商品', 'Select product')}</option>
                                    {products.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>
                            {/* Variant选择 - 当Product有Variant时必须选择 */}
                            {selectedProductId && products.find(p => p.id === selectedProductId)?.variants?.length > 0 && (
                                <div className="form-group">
                                    <label>{L('目标规格', 'Target Variant')} <span className="required">*</span></label>
                                    <select
                                        value={selectedVariantId}
                                        onChange={(e) => setSelectedVariantId(e.target.value)}
                                    >
                                        <option value="">{L('选择规格', 'Select variant')}</option>
                                        <option value="default">{L('默认规格', 'Default')} ({formatMoney(products.find(p => p.id === selectedProductId)?.price)})</option>
                                        {products.find(p => p.id === selectedProductId)?.variants?.map(v => (
                                            <option key={v.id} value={v.id}>{v.name} ({formatMoney(v.price)})</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            <div className="form-group">
                                <>
                                    <label>
                                        {L('卡密内容', 'Card Key Content')}{' '}
                                        <span className="hint">
                                            {importMode === 'single' ? L('（换行会被视为同一张卡密的内容）', '(line breaks are part of one key)') : L('（一行一条卡密）', '(One key per line)')}
                                        </span>
                                    </label>
                                    <textarea
                                        className="card-import-textarea"
                                        value={importText}
                                        onChange={(e) => setImportText(e.target.value)}
                                        placeholder={importMode === 'single'
                                            ? L('输入卡密内容（支持多行）...', 'Enter card key content (multi-line)..')
                                            : L('请输入卡密，一行一条\n例如:\nABC123-DEF456\nXYZ789-GHI012', 'Enter keys, one per line\ne.g.\nABC123-DEF456\nXYZ789-GHI012')
                                        }
                                    />
                                </>
                            </div>
                            <div className="import-preview">
                                {importMode === 'single'
                                    ? (importText.trim() ? L('将导入：1 张卡密', 'Will import: 1 key') : L('将导入：0 张卡密', 'Will import: 0 keys'))
                                    : L(`将导入：${importText.split('\n').filter(c => c.trim()).length} 张卡密`, `Will import: ${importText.split('\n').filter(c => c.trim()).length} key(s)`)
                                }
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowImportModal(false)}>{L('取消', 'Cancel')}</button>
                            <button className="btn btn-primary" onClick={handleImport}>{L('确认导入', 'Confirm Import')}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit弹窗 */}
            {editingCard && (
                <div className="modal-overlay" onClick={() => setEditingCard(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>{L('编辑卡密', 'Edit Key')}</h3>
                            <button className="modal-close" onClick={() => setEditingCard(null)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label>{L('卡密内容', 'Card Key Content')}</label>
                                <textarea
                                    value={editContent}
                                    onChange={(e) => setEditContent(e.target.value)}
                                    rows={5}
                                    placeholder={L('请输入卡密内容', 'Enter card key content')}
                                />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setEditingCard(null)}>{L('取消', 'Cancel')}</button>
                            <button className="btn btn-primary" onClick={handleSaveEdit}>{L('保存', 'Save')}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
function UsersManage() {
    const location = useLocation()
    const L = useAdminL()
    const basePath = location.pathname.replace(/\/users.*$/, '') || '/admin'
    const [agentEnabled, setAgentEnabled] = useState(true) // 默认显示，待配置加载
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

    // 拉取Agent开关Status
    useEffect(() => {
        if (!token) return
        fetch('/api/admin/settings', { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.json())
            .then(d => {
                const v = d?.settings?.agentEnabled
                setAgentEnabled(v === true || v === 'true')
            })
            .catch(() => {})
    }, [token])
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
            showToast(L('加载用户列表失败', 'Failed to load users'), 'error')
        } finally {
            setInitialLoading(false)
            setSearching(false)
        }
    }

    // 首次加载
    useEffect(() => {
        doFetch(1, '', 'all', true)
    }, [token])

    // 翻页 / Role筛选
    useEffect(() => {
        if (initialLoading) return
        doFetch(currentPage, searchTermRef.current, roleFilter)
    }, [currentPage, roleFilter])

    // Search防抖
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
                showToast(L('用户角色更新成功', 'Role updated'), 'success')
                doFetch(currentPageRef.current, searchTermRef.current, roleFilterRef.current)
            } else {
                const data = await res.json()
                showToast(data.error || L('更新用户角色失败', 'Role update failed'), 'error')
            }
        } catch {
            showToast(L('操作失败', 'Operation failed'), 'error')
        }
    }

    const handleCreateAdmin = async (e) => {
        e.preventDefault()
        if (!newAdmin.email || !newAdmin.password) {
            showToast(L('请输入邮箱和密码', 'Please enter email and password'), 'error')
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
                showToast(L('子管理员创建成功', 'Sub-admin created'), 'success')
                setShowCreateAdmin(false)
                setNewAdmin({ email: '', password: '', username: '', role: 'ADMIN' })
                doFetch(currentPageRef.current, searchTermRef.current, roleFilterRef.current)
            } else {
                showToast(data.error || L('创建子管理员失败', 'Creation failed'), 'error')
            }
        } catch {
            showToast(L('创建失败', 'Creation failed'), 'error')
        } finally {
            setCreating(false)
        }
    }

    const handleDeleteAdmin = (userId, username) => {
        showConfirm(
            L('移除管理员权限', 'Remove Admin'), 
            L(`确定要移除管理员“${username}”的管理员权限吗？该账号将被降级为普通用户。`, `Are you sure you want to remove ${username} from admin? The account will be downgraded to regular user.`), 
            async () => {
                try {
                    const res = await fetch(`/api/admin/admins/${userId}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${token}` }
                    })
                    const data = await res.json()
                    if (res.ok) {
                        showToast(L('管理员移除成功', 'Admin removed'), 'success')
                        doFetch(currentPageRef.current, searchTermRef.current, roleFilterRef.current)
                    } else {
                        showToast(data.error || L('操作失败', 'Operation failed'), 'error')
                    }
                } catch {
                    showToast(L('操作失败', 'Operation failed'), 'error')
                }
            }
        )
    }

    const getRoleLabel = (role) => {
        switch (role) {
            case 'SUPER_ADMIN': return L('超级管理员', 'Super Admin')
            case 'TENANT_ADMIN': return L('店主', 'Store Owner')
            case 'ADMIN': return L('管理员', 'Admin')
            case 'AGENT': return L('代理分站', 'Agent')
            case 'CUSTOMER': return L('普通用户', 'Customer')
            default: return L('用户', 'User')
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
                        <div className="users-header-card-label">{L('总用户数', 'Total Users')}</div>
                    </div>
                </div>
                <div className="users-header-card">
                    <div className="users-header-card-icon admin">
                        <FiShield size={20} />
                    </div>
                    <div>
                        <div className="users-header-card-value">{adminCount}</div>
                        <div className="users-header-card-label">{L('管理员', 'Admins')}</div>
                    </div>
                </div>
                <div className="users-header-card">
                    <div className="users-header-card-icon normal">
                        <FiUser size={20} />
                    </div>
                    <div>
                        <div className="users-header-card-value">{totalUsers - adminCount}</div>
                        <div className="users-header-card-label">{L('普通用户', 'Users')}</div>
                    </div>
                </div>
                {isSuperAdmin && (
                    <div className="users-header-card users-header-card-action" onClick={() => setShowCreateAdmin(true)}>
                        <div className="users-header-card-icon add">
                            <FiShield size={20} />
                        </div>
                        <div>
                            <div className="users-header-card-value" style={{ fontSize: '0.95rem' }}>{L('+ 新增', '+ Add')}</div>
                            <div className="users-header-card-label">{L('子管理员', 'Sub-Admins')}</div>
                        </div>
                    </div>
                )}
            </div>

            {/* Add Sub-Admin弹窗 */}
            {showCreateAdmin && (
                <div className="confirm-overlay" onClick={() => setShowCreateAdmin(false)}>
                    <div className="confirm-dialog" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
                        <h3 className="confirm-title" style={{ marginTop: 0 }}>{L('新增子管理员', 'Add Sub-Admin')}</h3>
                        <form onSubmit={handleCreateAdmin}>
                            <div className="form-group">
                                <label>{L('邮箱 *', 'Email *')}</label>
                                <input type="email" className="form-input" required value={newAdmin.email} onChange={e => setNewAdmin(p => ({ ...p, email: e.target.value }))} placeholder="admin@example.com" />
                            </div>
                            <div className="form-group">
                                <label>{L('密码 *', 'Password *')}</label>
                                <input type="password" className="form-input" required minLength={6} value={newAdmin.password} onChange={e => setNewAdmin(p => ({ ...p, password: e.target.value }))} placeholder={L('最少 6 位字符', 'Min 6 chars')} />
                            </div>
                            <div className="form-group">
                                <label>{L('用户名', 'Username')}</label>
                                <input type="text" className="form-input" value={newAdmin.username} onChange={e => setNewAdmin(p => ({ ...p, username: e.target.value }))} placeholder={L('可选', 'Optional')} />
                            </div>
                            <div className="confirm-actions">
                                <button type="button" className="btn btn-cancel" onClick={() => setShowCreateAdmin(false)}>{L('取消', 'Cancel')}</button>
                                <button type="submit" className="btn btn-primary" disabled={creating}>{creating ? L('创建中...', 'Creating...') : L('创建', 'Create')}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Search栏 */}
            <div className="users-search-bar">
                <div className="users-search-input-wrap">
                    <FiSearch className="users-search-icon" size={16} />
                    <input
                        type="text"
                        className="users-search-input"
                        placeholder={L('搜索邮箱或用户名...', 'Search email or username...')}
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                    />
                    {searching && <span className="users-search-spinner" />}
                    {searchInput && !searching && (
                        <button className="users-search-clear" onClick={() => setSearchInput('')}>×</button>
                    )}
                </div>
                <div className="users-role-tabs">
                    {[['all', L('全部', 'All')], ['CUSTOMER', L('普通用户', 'Customer')], ['ADMIN', L('子管理员', 'Admin')], ['TENANT_ADMIN', L('店主', 'Owner')]].map(([val, label]) => (
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
                    {searchInput 
                        ? L(`找到 ${totalUsers} 个匹配的用户`, `Found ${totalUsers} results`) 
                        : L(`总共 ${totalUsers} 个用户`, `Total ${totalUsers} users`)}
                </div>
            </div>

            {/* User列表 */}
            <div className={`users-table-wrapper${searching ? ' users-table-searching' : ''}`}>
                {users.length === 0 ? (
                    <div className="users-empty">
                        <FiUsers size={40} />
                        <p>{searchInput ? L(`未找到匹配 “${searchInput}” 的用户`, `No results for "${searchInput}" matching users`) : L('暂无客户用户', 'No customers')}</p>
                        {searchInput && (
                            <button className="btn btn-secondary btn-sm" onClick={() => setSearchInput('')}>{L('清空搜索', 'Clear Search')}</button>
                        )}
                    </div>
                ) : (
                    <table className="admin-table users-table">
                        <thead>
                            <tr>
                                <th>{L('用户', 'User')}</th>
                                <th>{L('角色', 'Role')}</th>
                                {agentEnabled && <th>{L('来源', 'Source')}</th>}
                                <th>{L('订单量', 'Orders')}</th>
                                <th>{L('注册时间', 'Registered')}</th>
                                <th>{L('操作', 'Actions')}</th>
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
                                                <span className="user-name-cell">{user.username || L('未设置', 'Not set')}</span>
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
                                                <option value="USER">{L('普通用户', 'Users')}</option>
                                                <option value="ADMIN">{L('子管理员', 'Admins')}</option>
                                            </select>
                                        ) : (
                                            <span className={`role-badge ${(user.role || '').toLowerCase()}`}>
                                                {getRoleLabel(user.role)}
                                            </span>
                                        )}
                                    </td>
                                    {agentEnabled && (
                                        <td>
                                            {user.referralAgent ? (
                                                <span style={{ fontSize: '0.78rem', padding: '2px 8px', borderRadius: 6, background: '#EEF2FF', color: '#4F46E5' }}>
                                                    {user.referralAgent.shopName}
                                                </span>
                                            ) : (
                                                <span style={{ fontSize: '0.78rem', color: '#D1D5DB' }}>{L('主站', 'Main Site')}</span>
                                            )}
                                        </td>
                                    )}
                                    <td>{user._count?.orders || 0}</td>
                                    <td className="time">{new Date(user.createdAt).toLocaleDateString('zh-CN')}</td>
                                    <td className="actions">
                                        <button className="action-btn edit" onClick={() => navigate(`${basePath}/orders?userId=${user.id}`)}>{L('查看订单', 'View Orders')}</button>
                                        {isSuperAdmin && user.role === 'ADMIN' && (
                                            <button className="action-btn delete" onClick={() => handleDeleteAdmin(user.id, user.username || user.email)}>{L('移除管理', 'Remove Admin')}</button>
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
                    <button disabled={currentPage <= 1} onClick={() => setCurrentPage(p => p - 1)}>{L('← 上一页', '← Prev')}</button>
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
                    <button disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)}>{L('下一页 →', 'Next →')}</button>
                    <span style={{ marginLeft: '8px', fontSize: '0.85rem', color: '#94a3b8' }}>{L(`页码 ${currentPage}/${totalPages}`, `Page ${currentPage}/${totalPages}`)}</span>
                </div>
            )}
        </div>
    )
}
function BackupSettings({ token, settings, handleChange, showToast }) {
    const L = useAdminL()
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
            console.error('获取备份StatusFailed:', e)
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
                showToast(L(`备份完成: ${data.filename} (${data.sizeMB} MB)`, `Backup complete: ${data.filename} (${data.sizeMB} MB)`), 'success')
                loadBackupStatus()
            } else {
                showToast(L(`备份失败: ${data.error}`, `Backup failed: ${data.error}`), 'error')
            }
        } catch (e) {
            showToast(L('备份请求失败', 'Backup request failed'), 'error')
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
                showToast(L('备份计划已更新', 'Backup plan updated'), 'success')
                loadBackupStatus()
            }
        } catch (e) {
            showToast(L('更新备份计划失败', 'Update backup plan failed'), 'error')
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
                showToast(data.error || L('下载失败', 'DownloadFailed'), 'error')
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
            showToast(L('已开始下载备份', 'Backup download started'), 'success')
        } catch (e) {
            showToast(L('下载请求失败', 'Download request failed'), 'error')
        }
    }

    return (
        <div className="settings-section">
            <h3>{L('数据库备份', 'Database Backup')}</h3>

            {/* 配置与Actions区 - 双栏布局 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                {/* 左栏：Backup Config */}
                <div style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.95), rgba(248,250,252,0.95))', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
                    <h4 style={{ margin: '0 0 24px', fontSize: '1rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ width: '34px', height: '34px', background: 'linear-gradient(135deg, #059669, #10b981)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>⚙️</span>
                        {L('备份配置', 'Backup Config')}
                    </h4>

                    {/* Enable开关 */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 18px', background: settings.backupEnabled ? 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(5,150,105,0.04))' : 'rgba(248,250,252,0.8)', borderRadius: '14px', border: `1px solid ${settings.backupEnabled ? 'rgba(16,185,129,0.25)' : '#e2e8f0'}`, marginBottom: '16px', transition: 'all 0.2s' }}>
                        <div>
                            <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#1e293b' }}>{L('💾 启用自动备份', '💾 Enable Auto Backup')}</div>
                            <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '3px' }}>{L('自动定时备份 MySQL 数据库', 'Scheduled automatic MySQL database backup')}</div>
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
                                <div style={{ fontWeight: 600, fontSize: '0.82rem', color: '#475569', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>{L('🕐 备份频率', '🕐 Backup Frequency')}</div>
                                <select
                                    value={settings.backupFrequency}
                                    onChange={(e) => handleChange('backupFrequency', parseInt(e.target.value))}
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', background: 'white', fontSize: '0.88rem', color: '#334155', outline: 'none', cursor: 'pointer', appearance: 'auto' }}
                                >
                                    <option value={1}>{L('每天一次 (凌晨 3 点)', 'Once daily (3 AM)')}</option>
                                    <option value={2}>{L('每天两次 (每 12 小时)', 'Twice daily (every 12h)')}</option>
                                    <option value={4}>{L('每天 4 次 (每 6 小时)', '4 times daily (every 6h)')}</option>
                                    <option value={6}>{L('每天 6 次 (每 4 小时)', '6 times daily (every 4h)')}</option>
                                    <option value={12}>{L('每天 12 次 (每 2 小时)', '12 times daily (every 2h)')}</option>
                                    <option value={24}>{L('每天 24 次 (每小时)', '24 times daily (hourly)')}</option>
                                </select>
                            </div>

                            {/* 保留天数 */}
                            <div style={{ padding: '14px 18px', background: 'rgba(248,250,252,0.8)', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                                <div style={{ fontWeight: 600, fontSize: '0.82rem', color: '#475569', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>{L('📅 保留天数', '📅 Retention Days')}</div>
                                <select
                                    value={settings.backupRetentionDays}
                                    onChange={(e) => handleChange('backupRetentionDays', parseInt(e.target.value))}
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', background: 'white', fontSize: '0.88rem', color: '#334155', outline: 'none', cursor: 'pointer', appearance: 'auto' }}
                                >
                                    <option value={3}>{L('3 天', '3 days')}</option>
                                    <option value={7}>{L('7 天', '7 days')}</option>
                                    <option value={14}>{L('14 天', '14 days')}</option>
                                    <option value={30}>{L('30 天', '30 days')}</option>
                                    <option value={60}>{L('60 天', '60 days')}</option>
                                    <option value={90}>{L('90 天', '90 days')}</option>
                                </select>
                                <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '6px' }}>{L('超过保留天数的备份将被自动清理删除', 'Backups older than retention period will be auto-deleted')}</div>
                            </div>

                            {/* Email Notification */}
                            <div style={{ padding: '14px 18px', background: settings.backupEmailEnabled ? 'linear-gradient(135deg, rgba(59,130,246,0.06), rgba(37,99,235,0.03))' : 'rgba(248,250,252,0.8)', borderRadius: '14px', border: `1px solid ${settings.backupEmailEnabled ? 'rgba(59,130,246,0.2)' : '#e2e8f0'}`, transition: 'all 0.2s' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: '0.82rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>{L('📧 邮件通知', '📧 Email Notification')}</div>
                                        <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>{L('备份成功后发送邮件通知 (带 SQL 备份附件)', 'Send notification after backup (with SQL file)')}</div>
                                    </div>
                                    <label className="toggle-switch">
                                        <input type="checkbox" checked={settings.backupEmailEnabled} onChange={(e) => handleChange('backupEmailEnabled', e.target.checked)} />
                                        <span className="toggle-slider"></span>
                                    </label>
                                </div>

                                {settings.backupEmailEnabled && (
                                    <div style={{ marginTop: '12px' }}>
                                        <div style={{ fontWeight: 500, fontSize: '0.78rem', color: '#64748b', marginBottom: '6px' }}>{L('接收邮箱', 'Recipient Email')}</div>
                                        <input
                                            type="email"
                                            value={settings.backupEmail}
                                            onChange={(e) => handleChange('backupEmail', e.target.value)}
                                            placeholder="admin@example.com"
                                            style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', background: 'white', fontSize: '0.88rem', color: '#334155', outline: 'none', boxSizing: 'border-box' }}
                                        />
                                        <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '5px' }}>{L('小于 25MB 将作为附件发送，超出则仅进行邮件通知', '≤25MB sent as attachment; larger files notify only')}</div>
                                    </div>
                                )}
                            </div>

                            {/* 应用按钮 */}
                            <button
                                onClick={handleRestartSchedule}
                                style={{ marginTop: '4px', width: '100%', padding: '13px', borderRadius: '12px', fontSize: '0.9rem', background: 'linear-gradient(135deg, #059669, #10b981)', border: 'none', cursor: 'pointer', color: 'white', fontWeight: 600, boxShadow: '0 4px 12px rgba(16,185,129,0.3)', transition: 'all 0.2s', letterSpacing: '0.3px' }}
                            >
                                🔄 {L('保存并生效备份配置', 'Save & Apply Backup Plan')}
                            </button>
                        </div>
                    )}
                </div>

                {/* 右栏：备份Status与文件 */}
                <div style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.95), rgba(248,250,252,0.95))', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column' }}>
                    <h4 style={{ margin: '0 0 20px', fontSize: '1rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ width: '32px', height: '32px', background: 'linear-gradient(135deg, #2563eb, #3b82f6)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>📋</span>
                        {L('备份历史记录', 'Backup History')}
                    </h4>

                    {backupStatus ? (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                            {/* 最近备份信息 */}
                            {backupStatus.lastBackup?.time && (
                                <div style={{ background: backupStatus.lastBackup.status === 'success' ? 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(5,150,105,0.05))' : 'linear-gradient(135deg, rgba(239,68,68,0.08), rgba(220,38,38,0.05))', borderRadius: '12px', padding: '14px 16px', marginBottom: '16px', border: `1px solid ${backupStatus.lastBackup.status === 'success' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}` }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: backupStatus.lastBackup.status === 'success' ? '#059669' : '#dc2626' }}>
                                            {backupStatus.lastBackup.status === 'success' ? L('✅ 上次备份成功', '✅ Last backup successful') : L('❌ 上次备份失败', 'Last backup failed')}
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
                                        {L('备份文件列表', 'Backup Files')}
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
                                                    title={L('点击下载备份', 'Click to download backup')}
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
                                    <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>{L('暂无备份文件', 'No backup files')}</div>
                                    <div style={{ fontSize: '0.8rem', marginTop: '4px' }}>{L('启用自动备份或进行手动备份', 'Enable auto-backup or run a manual backup')}</div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>
                            {L('加载中...', 'Loading...')}
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
                        {running ? L('⏳ 正在备份数据库...', '⏳ Backing up database...') : L('🚀 立即执行备份', '🚀 Run Backup Now')}
                    </button>
                </div>
            </div>
        </div>
    )
}
function AgentsManage() {
    const { token } = useAuthStore()
    const L = useAdminL()
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
        } catch { showToast(L('加载失败', 'Load failed'), 'error') }
        setLoading(false)
    }

    const fetchWithdrawals = async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/admin/withdrawals', { headers: { 'Authorization': `Bearer ${token}` } })
            const data = await res.json()
            setWithdrawals(data.withdrawals || [])
        } catch { showToast(L('加载失败', 'Load failed'), 'error') }
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
        const label = { ACTIVE: L('启用', 'Approve'), SUSPENDED: L('挂起', 'Suspend'), REJECTED: L('拒绝', 'Reject') }[status]
        showConfirm(
            L('确认操作', 'Confirm Action'),
            L(`确定要${status === 'ACTIVE' ? '启用' : status === 'SUSPENDED' ? '挂起' : '拒绝'}该代理商吗？`, `Are you sure you want to ${status === 'ACTIVE' ? 'approve' : status === 'SUSPENDED' ? 'suspend' : 'reject'} this agent?`),
            async () => {
                try {
                    await fetch(`/api/admin/agents/${id}/status`, {
                        method: 'PUT',
                        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status })
                    })
                    showToast(L(`代理商已${status === 'ACTIVE' ? '启用' : status === 'SUSPENDED' ? '挂起' : '拒绝'}`, `Agent has been ${status === 'ACTIVE' ? 'approved' : status === 'SUSPENDED' ? 'suspended' : 'rejected'}`), 'success')
                    fetchAgents()
                } catch { showToast(L('操作失败', 'Operation failed'), 'error') }
            }
        )
    }

    const processWithdrawal = async (id, status) => {
        showConfirm(
            L('确认操作', 'Confirm Action'),
            L(`确定要${status === 'APPROVED' ? '同意' : '拒绝'}该提现申请吗？`, `Are you sure you want to ${status === 'APPROVED' ? 'approve' : 'reject'} this withdrawal request?`),
            async () => {
                try {
                    await fetch(`/api/admin/withdrawals/${id}`, {
                        method: 'PUT',
                        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status })
                    })
                    showToast(L(`提现已${status === 'APPROVED' ? '同意' : '拒绝'}`, `Withdrawal has been ${status === 'APPROVED' ? 'approved' : 'rejected'}`), 'success')
                    fetchWithdrawals()
                } catch { showToast(L('操作失败', 'Operation failed'), 'error') }
            }
        )
    }

    const saveSkinPool = async () => {
        try {
            await fetch('/api/admin/settings', {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ agentSkinPool: JSON.stringify(skinPool) })
            })
            showToast(L('主题池保存成功', 'Skin pool saved'), 'success')
        } catch { showToast(L('保存失败', 'Save failed'), 'error') }
    }

    const allSkins = [
        { id: 'zen', name: L('极简禅境', 'Zen Minimal'), desc: L('极简风格，最适合单品销售', 'Minimal style, ideal for single products') },
        { id: 'fresh', name: L('清新自然', 'Fresh Clean'), desc: L('侧边栏布局，适合多分类商品', 'Sidebar layout, ideal for multiple categories') },
        { id: 'classic', name: L('经典风范', 'Classic'), desc: L('传统导航栏，全功能支持', 'Traditional navbar, full-featured') }
    ]

    const statusLabel = {
        PENDING: L('等待审核', 'Pending Review'),
        ACTIVE: L('已启用', 'Active'),
        SUSPENDED: L('已挂起', 'Suspended'),
        REJECTED: L('已拒绝', 'Rejected')
    }
    const statusColor = { PENDING: '#F59E0B', ACTIVE: '#10B981', SUSPENDED: '#EF4444', REJECTED: '#6B7280' }
    const wStatusLabel = {
        PENDING: L('待处理', 'Pending'),
        APPROVED: L('已同意', 'Approved'),
        REJECTED: L('已拒绝', 'Rejected')
    }
    const wStatusColor = { PENDING: '#F59E0B', APPROVED: '#10B981', REJECTED: '#EF4444' }

    return (
        <div className="admin-page">
            <div className="page-header">
                <h2>{L('代理商管理', 'Agents')}</h2>
            </div>

            <div className="settings-tabs" style={{ marginBottom: 20 }}>
                <button className={`tab-btn ${tab === 'agents' ? 'active' : ''}`} onClick={() => setTab('agents')}>{L('代理商列表', 'Agent List')}</button>
                <button className={`tab-btn ${tab === 'withdrawals' ? 'active' : ''}`} onClick={() => setTab('withdrawals')}>{L('提现记录', 'Withdrawals')}</button>
                <button className={`tab-btn ${tab === 'skinPool' ? 'active' : ''}`} onClick={() => setTab('skinPool')}>{L('主题池配置', 'Skin Pool')}</button>
            </div>

            {tab === 'agents' && (
                <div className="data-table-wrapper">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>{L('店铺名称', 'Shop Name')}</th>
                                <th>{L('店铺路径', 'Shop Path')}</th>
                                <th>{L('用户', 'User')}</th>
                                <th>{L('商品数', 'Products')}</th>
                                <th>{L('订单数', 'Orders')}</th>
                                <th>{L('余额', 'Balance')}</th>
                                <th>{L('总收益', 'Total Earnings')}</th>
                                <th>{L('状态', 'Status')}</th>
                                <th>{L('申请时间', 'Applied')}</th>
                                <th>{L('操作', 'Actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={10} style={{ textAlign: 'center', padding: 40 }}>{L('加载中...', 'Loading...')}</td></tr>
                            ) : agents.length === 0 ? (
                                <tr><td colSpan={10} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>{L('暂无代理商', 'No agents')}</td></tr>
                            ) : agents.map(a => (
                                <Fragment key={a.id}>
                                <tr onClick={() => setExpandedAgent(expandedAgent === a.id ? null : a.id)} style={{ cursor: 'pointer' }}>
                                    <td style={{ fontWeight: 600 }}>{a.shopName}</td>
                                    <td><code>/s/{a.shopSlug}</code></td>
                                    <td>{a.user?.username || a.user?.email}</td>
                                    <td>{a.productCount}</td>
                                    <td>{a.orderCount}</td>
                                    <td>{formatMoney(a.balance)}</td>
                                    <td>{formatMoney(a.totalEarnings)}</td>
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
                                                    <button className="btn-sm btn-primary" onClick={() => updateAgentStatus(a.id, 'ACTIVE')}>{L('同意', 'Approve')}</button>
                                                    <button className="btn-sm btn-danger" onClick={() => updateAgentStatus(a.id, 'REJECTED')}>{L('拒绝', 'Reject')}</button>
                                                </>
                                            )}
                                            {a.status === 'ACTIVE' && (
                                                <button className="btn-sm btn-warning" onClick={() => updateAgentStatus(a.id, 'SUSPENDED')}>{L('挂起', 'Suspend')}</button>
                                            )}
                                            {a.status === 'SUSPENDED' && (
                                                <button className="btn-sm btn-primary" onClick={() => updateAgentStatus(a.id, 'ACTIVE')}>{L('重新启用', 'Reactivate')}</button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                                {expandedAgent === a.id && (
                                    <tr>
                                        <td colSpan={10} style={{ background: 'var(--bg-secondary)', padding: '16px 20px' }}>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
                                                <div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 2 }}>{L('通知邮箱', 'Notification Email')}</div>
                                                    <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>{a.contactEmail || L('未提供', 'Not provided')}</div>
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 2 }}>{L('联系方式', 'Contact')}</div>
                                                    <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>{a.contactInfo || L('未提供', 'Not provided')}</div>
                                                </div>
                                                <div style={{ gridColumn: '1 / -1' }}>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 2 }}>{L('申请备注', 'Application Note')}</div>
                                                    <div style={{ fontSize: '0.86rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{a.applyDescription || L('无', 'None')}</div>
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
                                <th>{L('代理商', 'Agent')}</th>
                                <th>{L('提现金额', 'Amount')}</th>
                                <th>{L('提现方式', 'Method')}</th>
                                <th>{L('提现账号', 'Account')}</th>
                                <th>{L('状态', 'Status')}</th>
                                <th>{L('申请时间', 'Applied')}</th>
                                <th>{L('操作', 'Actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40 }}>{L('加载中...', 'Loading...')}</td></tr>
                            ) : withdrawals.length === 0 ? (
                                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>{L('暂无提现申请', 'No withdrawal requests')}</td></tr>
                            ) : withdrawals.map(w => (
                                <tr key={w.id}>
                                    <td style={{ fontWeight: 600 }}>{w.agentName}</td>
                                    <td style={{ fontWeight: 700, color: '#EF4444' }}>{formatMoney(w.amount)}</td>
                                    <td>{w.method === 'alipay' ? L('支付宝', 'Alipay') : w.method === 'wechat' ? L('微信支付', 'WeChat') : L('银行卡', 'Bank Card')}</td>
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
                                                <button className="btn-sm btn-primary" onClick={() => processWithdrawal(w.id, 'APPROVED')}>{L('同意', 'Approve')}</button>
                                                <button className="btn-sm btn-danger" onClick={() => processWithdrawal(w.id, 'REJECTED')}>{L('拒绝', 'Reject')}</button>
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
                        {L('勾选授权给代理商选择的主题皮肤样式', 'Select skins available for agents')}
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
                                        if (skinPool.length <= 1) return showToast(L('必须至少保留一个主题', 'At least one skin must be selected'), 'error')
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
                        {L('保存分站主题配置', 'Save Skin Pool')}
                    </button>
                </div>
            )}
        </div>
    )
}
function SslApplyButton({ domain, token }) {
    const L = useAdminL()
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
            if (!res.ok || !data.success) { setLogs([data.error || L('申请失败', 'Application failed')]); setStep('error'); return }
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
        }).catch(e => { setLogs(prev => [...prev, L('连接错误：', 'Connection error: ') + e.message]); setStep('error') })
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
                {hasCert ? L('🔒 重新续签证书', '🔒 Renew Certificate') : L('🔐 申请泛域名证书', '🔐 Apply for Wildcard Certificate')}
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
                                <div style={{ fontWeight: 700, fontSize: '1rem' }}>{L('🔐 申请泛域名 SSL 证书', '🔐 Apply for Wildcard SSL Certificate')}</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
                                    {L('域名：', 'Domain: ')}<code style={{ color: '#4F46E5' }}>*.{domain}</code>
                                    {certStatus?.expireDate && <span style={{ marginLeft: 8, color: '#10B981' }}>{L(' · 当前证书有效期至：', ' · Current cert expires: ')}{certStatus.expireDate}</span>}
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
                                            {L('⚠️ 系统未检测到 acme.sh 工具，将自动为您下载并安装。', '⚠️ acme.sh not detected, will be auto-installed.')}
                                        </div>
                                    )}
                                    <div style={{ fontSize: '0.88rem', lineHeight: 1.8, color: 'var(--text-secondary)' }}>
                                        <p>{L(`本向导将为您申请免费的 Let's Encrypt 泛域名 SSL 证书 (*.${domain})：`, `This wizard will use Let's Encrypt for *.${domain} to apply for a free SSL certificate:`)}</p>
                                        <ol style={{ paddingLeft: 20, marginTop: 8 }}>
                                            <li>{L('点击“开始申请”，系统将生成包含 DNS TXT 的验证记录', 'Click "Start", the system will generate DNS TXT verification records')}</li>
                                            <li>{L('在您的域名 DNS 解析面板（如 Cloudflare）添加该 TXT 记录', 'Add the TXT record to your DNS panel (e.g. Cloudflare)')}</li>
                                            <li>{L('等待 DNS 解析记录在全球生效（约 5 分钟），点击“验证并颁发”', 'Wait for DNS records to propagate globally (approx. 5 mins), then click "Verify & Issue"')}</li>
                                            <li>{L('证书将自动生成并部署部署到 /etc/nginx/ssl 目录并重新加载 Nginx', 'Certificate will be auto-installed to /etc/nginx/ssl and Nginx reloaded')}</li>
                                        </ol>
                                        <div style={{ marginTop: 12, padding: '8px 12px', borderRadius: 6, background: 'rgba(79,70,229,0.08)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                            {L(`💡 申请前请确保 *.${domain} 和 ${domain} 的 DNS A 记录已解析并指向当前服务器`, `💡 Before applying, please ensure DNS A records for *.${domain} and ${domain} are already pointing to this server`)}
                                        </div>
                                    </div>
                                    <button onClick={handleStep1} style={{ marginTop: 20, width: '100%', padding: '12px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', color: '#fff', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}>
                                        🚀 {L('开始申请', 'Start')}
                                    </button>
                                </div>
                            )}

                            {step === 'step1-loading' && (
                                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                                    <div style={{ fontSize: '2rem', marginBottom: 12 }}>⏳</div>
                                    <div>{L('正在生成 DNS 验证记录...', 'Generating DNS verification records...')}</div>
                                </div>
                            )}

                            {step === 'step1-done' && records.length > 0 && (
                                <div>
                                    <div style={{ padding: '12px 16px', borderRadius: 10, marginBottom: 20, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', color: '#10B981', fontSize: '0.85rem', fontWeight: 600 }}>
                                        {L('✅ 第一步完成！请在 DNS 面板添加以下 TXT 记录，然后点击下方按钮继续', '✅ Step 1 completed! Please add the following TXT records to your DNS provider, and then click the button below to continue')}
                                    </div>
                                    {records.map((r, i) => (
                                        <div key={i} style={{ borderRadius: 10, border: '1px solid var(--border-color)', overflow: 'hidden', marginBottom: 12 }}>
                                            <div style={{ padding: '8px 14px', background: 'var(--bg-secondary)', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)' }}>{L('TXT 记录 #', 'TXT Record #')}{i + 1}</div>
                                            <div style={{ padding: '12px 14px' }}>
                                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 3 }}>{L('主机记录（Host）', 'Host')}</div>
                                                <code style={{ display: 'block', padding: '6px 10px', borderRadius: 6, background: 'var(--bg-secondary)', fontSize: '0.82rem', wordBreak: 'break-all', marginBottom: 10 }}>{r.host}</code>
                                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 3 }}>{L('TXT 值', 'TXT Value')}</div>
                                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                                    <code style={{ flex: 1, display: 'block', padding: '6px 10px', borderRadius: 6, background: 'var(--bg-secondary)', fontSize: '0.82rem', wordBreak: 'break-all' }}>{r.value}</code>
                                                    <button onClick={() => navigator.clipboard.writeText(r.value)} style={{ flexShrink: 0, padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', cursor: 'pointer', fontSize: '0.78rem', color: 'var(--text-muted)' }}>{L('复制', 'Copy')}</button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    <div style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 16, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', color: '#D97706', fontSize: '0.8rem' }}>
                                        {L('⏱️ 添加完成 DNS 记录后，请等待 5~10 分钟使其全球生效，再点击下方按钮验证', '⏱️ After adding DNS records, please wait 5-10 minutes for propagation, then click below to verify')}
                                    </div>
                                    <button onClick={handleStep2} style={{ width: '100%', padding: '12px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #10B981, #059669)', color: '#fff', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}>
                                        {L('✅ 我已添加 TXT 记录，开始验证并颁发证书', '✅ I have added TXT records, start validation and issue certificate')}
                                    </button>
                                </div>
                            )}

                            {(step === 'step2-loading' || step === 'step2-done' || step === 'error') && (
                                <div>
                                    <div style={{ background: '#0f0f0f', borderRadius: 10, padding: 16, fontFamily: 'monospace', fontSize: '0.78rem', lineHeight: 1.6, color: '#d4d4d4', minHeight: 200, maxHeight: 360, overflowY: 'auto' }}>
                                        {logs.map((log, i) => (
                                            <div key={i} style={{ color: log.startsWith('✅') || log.startsWith('🎉') ? '#4ade80' : log.includes('Failed') || log.includes('error') ? '#f87171' : '#d4d4d4' }}>{log}</div>
                                        ))}
                                        {step === 'step2-loading' && <div style={{ color: '#60a5fa' }}>{L('▋ 正在执行中...', '▋ Processing...')}</div>}
                                        <div ref={logsEndRef} />
                                    </div>
                                    {step === 'step2-done' && (
                                        <div style={{ marginTop: 16, padding: '12px 16px', borderRadius: 10, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', color: '#10B981', fontSize: '0.88rem', fontWeight: 600, textAlign: 'center' }}>
                                            {L('🎉 泛域名证书申请成功！Nginx 已自动重载生效。', '🎉 Wildcard certificate issued successfully! Nginx has reloaded.')}
                                        </div>
                                    )}
                                    {step === 'error' && (
                                        <button onClick={() => { setStep('idle'); setLogs([]) }} style={{ marginTop: 12, width: '100%', padding: '10px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'transparent', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{L('↩ 重新开始', '↩ Start Over')}</button>
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
    const L = useAdminL()
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
        else showToast(d.error || L('操作失败', 'Operation failed'), 'error')
    }

    const statusLabel = {
        PENDING: L('待配置', 'Pending'),
        REVIEWING: L('审核中', 'Reviewing'),
        ACTIVE: L('运营中', 'Active'),
        SUSPENDED: L('已挂起', 'Suspended'),
        REJECTED: L('已拒绝', 'Rejected')
    }
    const statusColor = { PENDING: '#F59E0B', REVIEWING: '#60A5FA', ACTIVE: '#10B981', SUSPENDED: '#EF4444', REJECTED: '#EF4444' }

    return (
        <div className="admin-section">
            <div className="section-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
                <h2>🏪 {L('租户商城管理', 'Tenant Management')}</h2>
                <div style={{ display:'flex', gap:8 }}>
                    {[['', L('全部', 'All')], ['REVIEWING', L('审核中', 'Reviewing')], ['ACTIVE', L('运营中', 'Active')], ['PENDING', L('待配置', 'Pending')], ['SUSPENDED', L('已挂起', 'Suspended')]].map(([v,l]) => (
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
                                [L('商城名称', 'Shop Name'), selected.shopName],
                                [L('访问路径', 'Path'), `/t/${selected.shopSlug}`],
                                [L('绑定用户邮箱', 'User Email'), selected.user?.email],
                                [L('独立域名', 'Domain'), selected.domains?.[0]?.domain || L('未绑定', 'Not bound')],
                                [L('DNS 验证状态', 'DNS Verified'), selected.domains?.[0]?.dnsVerified ? L('✅ 已验证', '✅ Verified') : L('❌ 未验证', '❌ Not verified')],
                                [L('商品/订单数量', 'Products/Orders'), `${selected._count?.products||0} / ${selected._count?.orders||0}`],
                                [L('申请时间', 'Applied'), new Date(selected.createdAt).toLocaleString()],
                                [L('当前状态', 'Current Status'), statusLabel[selected.status]]
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
                                    onClick={()=>showConfirm(L('批准商城上线', 'Approve Shop'), L(`确定要批准商城“${selected.shopName}”上线吗？批准后该商城将即刻生效对外展示。`, `Are you sure you want to approve "${selected.shopName}"? The shop will go online immediately.`), ()=>doAction(selected.id,'approve'))}>
                                    {L('✅ 同意上线', '✅ Approve')}
                                </button>
                                <input style={{flex:1,padding:'8px 12px',borderRadius:8,border:'1px solid var(--border-color)',background:'var(--bg-primary)',color:'var(--text-primary)',fontSize:'0.84rem'}}
                                    value={rejectReason} onChange={e=>setRejectReason(e.target.value)} placeholder={L('拒绝原因（可选）', 'Reason for rejection (Optional)')} />
                                <button className="btn btn-danger" disabled={actionLoading}
                                    onClick={()=>doAction(selected.id,'reject',{reason:rejectReason})}>
                                    {L('❌ 拒绝申请', '❌ Reject')}
                                </button>
                            </>)}
                            {selected.status === 'ACTIVE' && (
                                <button className="btn btn-warning" disabled={actionLoading}
                                    onClick={()=>showConfirm(L('挂起商城', 'Suspend Shop'), L(`确定要挂起商城“${selected.shopName}”吗？挂起后将暂停访问。`, `Are you sure you want to suspend "${selected.shopName}"?`), ()=>doAction(selected.id,'suspend'))}>
                                    {L('⏸ 挂起商城', '⏸ Suspend')}
                                </button>
                            )}
                            {selected.status === 'SUSPENDED' && (
                                <button className="btn btn-success" disabled={actionLoading}
                                    onClick={()=>doAction(selected.id,'reactivate')}>
                                    {L('▶ 恢复商城', '▶ Reactivate')}
                                </button>
                            )}
                            <button className="btn" onClick={()=>setSelected(null)} style={{marginLeft:'auto'}}>{L('关闭', 'Close')}</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="table-container">
                {loading ? (
                    <div style={{textAlign:'center',padding:60,color:'var(--text-muted)'}}>{L('加载中...', 'Loading...')}</div>
                ) : (
                    <table className="admin-table">
                        <thead><tr>
                            <th>{L('商城名称', 'Shop Name')}</th>
                            <th>{L('关联用户', 'User')}</th>
                            <th>{L('绑定域名', 'Domain')}</th>
                            <th>{L('DNS 验证', 'DNS')}</th>
                            <th>{L('商品/订单', 'Product/Order')}</th>
                            <th>{L('状态', 'Status')}</th>
                            <th>{L('申请时间', 'Applied')}</th>
                            <th>{L('操作', 'Actions')}</th>
                        </tr></thead>
                        <tbody>
                            {tenants.length === 0 ? (
                                <tr><td colSpan={8} style={{textAlign:'center',padding:40,color:'var(--text-muted)'}}>{L('暂无租户商城', 'No tenants')}</td></tr>
                            ) : tenants.map(t => (
                                <tr key={t.id}>
                                    <td>
                                        <div style={{fontWeight:600}}>{t.shopName}</div>
                                        <div style={{fontSize:'0.75rem',color:'var(--text-muted)'}}>/t/{t.shopSlug}</div>
                                    </td>
                                    <td style={{fontSize:'0.82rem'}}>{t.user?.email}</td>
                                    <td style={{fontSize:'0.82rem'}}>{t.domains?.[0]?.domain || <span style={{color:'var(--text-muted)'}}>{L('未绑定', 'Not bound')}</span>}</td>
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
                                            {L('详情/审核', 'Detail/Review')}
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
                    <button className="btn" onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}>{L('上一页', 'Prev')}</button>
                    <span style={{padding:'8px 14px',color:'var(--text-muted)',fontSize:'0.84rem'}}>{page} / {Math.ceil(total/20)}</span>
                    <button className="btn" onClick={()=>setPage(p=>p+1)} disabled={page>=Math.ceil(total/20)}>{L('下一页', 'Next')}</button>
                </div>
            )}
        </div>
    )
}

function SettingsPage() {
    const { token } = useAuthStore()
    const { showToast } = useToast()
    const { fetchSkin } = useSkinStore()
    const mToken = useMerchantStore(state => state.token)
    const L = useAdminL()

    // 默认设置
    const [settings, setSettings] = useState({
        // 基本设置
        siteName: 'Vmart',
        siteDescription: 'Virtual goods auto-delivery platform',
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
        // Admins通知设置
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
        // Database Backup设置
        backupEnabled: false,
        backupFrequency: 1,
        backupRetentionDays: 7,
        backupEmailEnabled: false,
        backupEmail: '',
        // Admins权限设置
        adminPermissionViewStatsGrid: true,
        adminPermissionViewTodayStats: true,
        adminEmailNotificationConfigs: []
    })

    const [activeTab, setActiveTab] = useState('basic')
    const [saving, setSaving] = useState(false)
    const [loading, setLoading] = useState(true)
    // 套餐邮件额度：>0 / -1 表示允许，0 表示已禁用
    const [emailQuota, setEmailQuota] = useState(-1)
    const emailDisabled = emailQuota === 0
    const [emailUsed, setEmailUsed] = useState(0)

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

    // 拉取套餐邮件额度（优先 admin 接口，fallback platform）
    useEffect(() => {
        const fetchUsage = (tk, isAdmin) => {
            if (isAdmin) {
                fetch('/api/admin/email-usage', { headers: { Authorization: `Bearer ${tk}` } })
                    .then(r => r.json())
                    .then(d => {
                        if (typeof d.limit === 'number') setEmailQuota(d.limit)
                        if (typeof d.used === 'number') setEmailUsed(d.used)
                    })
                    .catch(() => {})
            } else if (tk) {
                fetch('/api/platform/plan/limits', { headers: { Authorization: `Bearer ${tk}` } })
                    .then(r => r.json())
                    .then(d => {
                        const v = d?.limits?.emailNotifications
                        if (typeof v === 'number') setEmailQuota(v)
                    })
                    .catch(() => {})
            }
        }
        if (token) fetchUsage(token, true)
        else if (mToken) fetchUsage(mToken, false)
    }, [token, mToken])

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
                throw new Error('Save Failed')
            }

            showToast(L('设置保存成功！', 'Settings saved successfully!'), 'success')
            // 重新拉取皮肤，立即生效
            fetchSkin()

        } catch (err) {
            console.error(err)
            showToast(L('保存设置失败', 'Save settings failed'), 'error')
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
                throw new Error(data.error || L('库存重建失败', 'Stock rebuild failed'))
            }
            showToast(L(`库存重建成功：商品 ${data.updatedProducts} 个，规格 ${data.updatedVariants} 个`, `Stock rebuilt: Products ${data.updatedProducts}, Variants ${data.updatedVariants}`), 'success')
        } catch (error) {
            showToast(error.message || L('库存重建失败', 'Stock rebuild failed'), 'error')
        }
    }

    const adminNotifyEventOptions = [
        { key: 'notifyOrderPaid', label: L('支付成功', 'Payment Success') },
        { key: 'notifyPendingShip', label: L('待发货', 'Pending Ship') },
        { key: 'notifyNewTicket', label: L('工单提醒', 'Ticket Alert') },
        { key: 'notifyNewUser', label: L('新用户', 'New User') },
        { key: 'notifyLowStock', label: L('库存预警', 'Low Stock') },
        { key: 'notifyOrderCancelled', label: L('订单取消', 'Order Cancelled') }
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
        { id: 'basic', label: L('基本设置', 'Basic Settings') },
        { id: 'payment', label: L('支付设置', 'Payment Settings') },
        { id: 'order', label: L('订单设置', 'Order Settings') },
        { id: 'email', label: L('邮件设置', 'Email Settings') },
        { id: 'notify', label: L('通知设置', 'Notification Settings') },
        { id: 'admin', label: L('管理员设置', 'Admin Settings') }
    ]

    return (
        <div className="settings-page">
            <div className="page-header">
                <h2>{L('系统设置', 'System Settings')}</h2>
                <button
                    className="btn btn-primary"
                    onClick={handleSave}
                    disabled={saving}
                >
                    {saving ? L('正在保存...', 'Saving...') : L('保存设置', 'Save Settings')}
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
                            <label>{L('网站名称', 'Site Name')}</label>
                            <input
                                type="text"
                                value={settings.siteName}
                                onChange={(e) => handleChange('siteName', e.target.value)}
                                placeholder={L('网站名称', 'Site Name')}
                            />
                        </div>
                        <div className="setting-item">
                            <label>{L('网站描述', 'Site Description')}</label>
                            <textarea
                                value={settings.siteDescription}
                                onChange={(e) => handleChange('siteDescription', e.target.value)}
                                placeholder={L('网站描述', 'Site Description')}
                                rows={3}
                            />
                        </div>

                        {/* 代理域名 */}
                        <div className="setting-item">
                            <label>{L('代理域名', 'Agent Domain')}</label>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <input
                                    type="text"
                                    value={settings.agentSubdomainRoot || ''}
                                    onChange={(e) => handleChange('agentSubdomainRoot', e.target.value.trim().replace(/^https?:\/\//i, '').replace(/\/.*$/, ''))}
                                    placeholder={L('例如 vshop.cc（留空则使用路径模式 /s/slug）', 'e.g. vshop.cc (Leave empty to use /s/slug path)')}
                                    style={{ flex: 1 }}
                                />
                                {settings.agentSubdomainRoot && (
                                    <SslApplyButton domain={settings.agentSubdomainRoot} token={token} />
                                )}
                            </div>
                            <span className="setting-hint">
                                {L('仅用于 SSL 证书管理。目前代理分站采用路径模式（如 vmart.cc/s/slug）。', 'Only for SSL management. Agent sites currently use path mode (e.g. vmart.cc/s/slug).')}
                            </span>
                        </div>

                        {/* 网站 Logo */}
                        <div className="setting-item">
                            <label>{L('网站 Logo', 'Site Logo')}</label>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 8 }}>{L('推荐：透明背景 PNG 格式，高度不超过 60px，将显示在导航栏', 'Recommended: transparent PNG, max 60px height, shown in navbar')}</div>
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
                                    {settings.siteLogo ? L('更换 Logo', 'Change') : L('上传 Logo', 'Upload Logo')}
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
                                                showToast(L('Logo 上传成功', 'Logo Upload Success'), 'success')
                                            }
                                        } catch { showToast(L('上传失败', 'Upload Failed'), 'error') }
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
                                    >{L('清除', 'Clear')}</button>
                                )}
                            </div>
                        </div>

                        {/* 书签栏图标 Favicon */}
                        <div className="setting-item">
                            <label>{L('网站图标 (Favicon)', 'Favicon')}</label>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 8 }}>{L('推荐：64x64 像素的 PNG 格式，显示在浏览器标签页', 'Recommended: 64x64 PNG, shown in browser tab')}</div>
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
                                    {settings.siteFavicon ? L('更换图标', 'Change') : L('上传图标', 'Upload Icon')}
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
                                                showToast(L('图标上传成功', 'Icon Upload Success'), 'success')
                                            }
                                        } catch { showToast(L('上传失败', 'Upload Failed'), 'error') }
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
                                    >{L('清除', 'Clear')}</button>
                                )}
                            </div>
                        </div>
                    </div>
                    </>
                )}

                {/* 支付设置 */}
                {activeTab === 'payment' && (
                    <div className="settings-section">
                        <div className="setting-item toggle-item">
                            <div className="toggle-info">
                                <label>{L('支付宝', 'Alipay')}</label>
                                <span className="toggle-desc">{L('启用支付宝收款方式', 'Enable Alipay payment')}</span>
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
                                <label>{L('微信支付', 'WeChat Pay')}</label>
                                <span className="toggle-desc">{L('启用微信支付收款方式', 'Enable WeChat Pay')}</span>
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
                                <span className="toggle-desc">{L('启用 USDT 收款方式', 'Enable USDT payment')}</span>
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
                                    <label>{L('USDT 收款地址 (TRC20)', 'USDT Wallet Address (TRC20)')}</label>
                                    <input
                                        type="text"
                                        value={settings.usdtWalletAddress}
                                        onChange={(e) => handleChange('usdtWalletAddress', e.target.value)}
                                        placeholder={L('以 T 开头的 TRC20 钱包地址', 'TRC20 address starting with T')}
                                    />
                                    <span className="setting-hint">{L('请务必确保收款地址正确，否则将无法收到款项', 'Ensure address is correct to receive payments')}</span>
                                </div>
                                <div className="setting-item">
                                    <label>{L('USDT 汇率 (1 USDT = ? 元)', 'USDT Exchange Rate (1 USDT = ? CNY)')}</label>
                                    <input
                                        type="number"
                                        value={settings.usdtExchangeRate}
                                        onChange={(e) => handleChange('usdtExchangeRate', parseFloat(e.target.value))}
                                        min={1}
                                        max={20}
                                        step={0.1}
                                    />
                                    <span className="setting-hint">{L('当前折算汇率：', 'Current rate: ') + '1 USDT = ' + getCurrencySymbol() + settings.usdtExchangeRate}</span>
                                </div>
                            </>
                        )}

                        <div className="setting-item toggle-item">
                            <div className="toggle-info">
                                <label>USDT-BEP20</label>
                                <span className="toggle-desc">{L('启用 BSC (BNB 智能链) USDT 支付', 'Enable BEP20 USDT payment')}</span>
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
                                    <label>{L('USDT 收款地址 (BEP20)', 'USDT Wallet Address (BEP20)')}</label>
                                    <input
                                        type="text"
                                        value={settings.bscUsdtWalletAddress}
                                        onChange={(e) => handleChange('bscUsdtWalletAddress', e.target.value)}
                                        placeholder={L('以 0x 开头的 BEP20 钱包地址', 'BEP20 address starting with 0x')}
                                    />
                                    <span className="setting-hint">{L('请务必确保收款地址正确，否则将无法收到款项', 'Ensure address is correct to receive payments')}</span>
                                </div>
                                <div className="setting-item">
                                    <label>{L('USDT 汇率 (1 USDT = ? 元)', 'USDT Exchange Rate (1 USDT = ? CNY)')}</label>
                                    <input
                                        type="number"
                                        value={settings.bscUsdtExchangeRate}
                                        onChange={(e) => handleChange('bscUsdtExchangeRate', parseFloat(e.target.value))}
                                        min={1}
                                        max={20}
                                        step={0.1}
                                    />
                                    <span className="setting-hint">{L('当前折算汇率：', 'Current rate: ') + '1 USDT = ' + getCurrencySymbol() + settings.bscUsdtExchangeRate}</span>
                                </div>
                                <div className="setting-item">
                                    <label>{L('BscScan API Key (可选，推荐)', 'BscScan API Key (Optional, recommended)')}</label>
                                    <input
                                        type="text"
                                        value={settings.bscUsdtApiKey}
                                        onChange={(e) => handleChange('bscUsdtApiKey', e.target.value)}
                                        placeholder={L('加速交易查询，防止查询受限（免费申请）', 'Speeds up queries, prevents rate limiting (free)')}
                                    />
                                    <span className="setting-hint">{L('访问 bscscan.com/apis 免费获取', 'Get free at bscscan.com/apis')}</span>
                                </div>
                            </>
                        )}

                        <div className="setting-notice">
                            {L('💡 USDT 支付由系统每 30 秒自动检测一次，到账后订单自动发放卡密/发货。', '💡 USDT payments auto-detected every 30s, auto-shipped on receipt')}
                        </div>
                    </div>
                )}

                {/* 订单设置 */}
                {activeTab === 'order' && (
                    <div className="settings-section">
                        {/* 库存储备模式选择 */}
                        <div className="setting-item stock-mode-section">
                            <label className="stock-mode-label">{L('库存计算模式', 'Stock Calculation')}</label>
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
                                            <span className="stock-mode-name">{L('自动计算库存', 'Auto Calculate Stock')}</span>
                                            <span className="stock-mode-tag recommended">{L('推荐', 'Recommended')}</span>
                                        </div>
                                        <div className="stock-mode-description">
                                            {L('系统根据可用卡密数量自动计算库存，确保实时准确', 'System auto-counts available keys as stock, ensuring real-time accuracy')}
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
                                            <span className="stock-mode-name">{L('手动设置库存', 'Manual Stock')}</span>
                                        </div>
                                        <div className="stock-mode-description">
                                            {L('可在商品管理中手动设置库存，适用于货源充足但卡密无需提前导入的情况', 'Configure stock manually in product settings, suitable for ample supply without pre-imported keys')}
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
                                    {L('重新计算库存 (根据可用卡密)', 'Rebuild Stock (by available keys)')}
                                </button>
                            </div>
                        </div>

                        {/* 订单超时 */}
                        <div className="setting-item">
                            <label>{L('订单超时时间', 'Order Timeout')}</label>
                            <div className="input-with-suffix">
                                <input
                                    type="number"
                                    value={settings.orderTimeout}
                                    onChange={(e) => handleChange('orderTimeout', parseInt(e.target.value))}
                                    min={5}
                                    max={120}
                                    style={{ width: '120px' }}
                                />
                                <span className="input-suffix">{L('分钟', 'min')}</span>
                            </div>
                            <span className="setting-hint">{L('未支付的订单在超时后将自动关闭/释放库存', 'Unpaid orders auto-cancelled after timeout')}</span>
                        </div>

                        {/* 自动取消超时订单 */}
                        <div className="setting-item toggle-item">
                            <div className="toggle-info">
                                <label>{L('自动取消超时订单', 'Auto Cancel')}</label>
                                <span className="toggle-desc">{L('超出上述设定时间未支付的订单将自动失效', 'Unpaid orders automatically cancel after the set timeout')}</span>
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
                        {emailDisabled && (
                            <div style={{
                                padding: '14px 16px', marginBottom: 16,
                                background: 'rgba(245, 158, 11, 0.1)',
                                border: '1px solid rgba(245, 158, 11, 0.4)',
                                borderRadius: 8, color: '#92400e', fontSize: '0.9rem',
                                display: 'flex', alignItems: 'center', gap: 10
                            }}>
                                {L('🔒 当前套餐不包含邮件发送额度，请升级套餐以启用邮件通知。', '🔒 Current plan has no email quota. Please upgrade to enable.')}
                            </div>
                        )}
                        {!emailDisabled && (
                            <div style={{
                                padding: '14px 18px', marginBottom: 16,
                                background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.08), rgba(20, 184, 166, 0.08))',
                                border: '1px solid rgba(14, 165, 233, 0.25)',
                                borderRadius: 10, color: '#0c4a6e'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                                    <div>
                                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 4 }}>{L('本月平台代发邮件额度', 'Platform emails this month')}</div>
                                        <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                            {emailUsed} / {emailQuota === -1 ? L('无限额度', 'Unlimited') : emailQuota}
                                        </div>
                                    </div>
                                    {emailQuota > 0 && (
                                        <div style={{ flex: 1, minWidth: 180, marginLeft: 20 }}>
                                            <div style={{ height: 6, background: 'rgba(14, 165, 233, 0.15)', borderRadius: 3, overflow: 'hidden' }}>
                                                <div style={{
                                                    height: '100%',
                                                    width: `${Math.min(100, (emailUsed / emailQuota) * 100)}%`,
                                                    background: emailUsed >= emailQuota ? '#ef4444' : 'linear-gradient(90deg, #0ea5e9, #14b8a6)',
                                                    transition: 'width 0.3s'
                                                }} />
                                            </div>
                                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 6 }}>
                                                {emailUsed >= emailQuota
                                                    ? L('⚠️ 本月代发限额已用完。请在下方配置您自己的 SMTP 发信服务以享受无限发送。', '⚠️ Monthly quota used up. Switch to own SMTP for unlimited')
                                                    : L(`本月剩余代发额度：${Math.max(0, emailQuota - emailUsed)} 封。若使用自定义 SMTP 发信则不占用此额度。`, `Remaining: ${Math.max(0, emailQuota - emailUsed)} emails. Custom SMTP is not counted toward this limit.`)}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                        <fieldset disabled={emailDisabled} style={{ border: 0, padding: 0, margin: 0, opacity: emailDisabled ? 0.55 : 1 }}>
                        <div className="setting-item toggle-item">
                            <div className="toggle-info">
                                <label>{L('邮件通知功能', 'Email Notification')}</label>
                                <span className="toggle-desc">{L('订单完成后，将卡密信息自动发送至买家邮箱', 'Send card keys to email after order completion')}</span>
                            </div>
                            <label className="toggle-switch">
                                <input
                                    type="checkbox"
                                    checked={settings.emailNotify}
                                    onChange={(e) => handleChange('emailNotify', e.target.checked)}
                                    disabled={emailDisabled}
                                />
                                <span className="toggle-slider"></span>
                            </label>
                        </div>
                        <div className="setting-item">
                            <label>{L('SMTP 服务器地址', 'SMTP Host')}</label>
                            <input
                                type="text"
                                value={settings.smtpHost}
                                onChange={(e) => handleChange('smtpHost', e.target.value)}
                                placeholder="smtp.example.com"
                                disabled={emailDisabled}
                            />
                        </div>
                        <div className="setting-item">
                            <label>{L('SMTP 端口', 'SMTP Port')}</label>
                            <input
                                type="number"
                                value={settings.smtpPort}
                                onChange={(e) => handleChange('smtpPort', parseInt(e.target.value))}
                                placeholder="465"
                                disabled={emailDisabled}
                            />
                        </div>
                        <div className="setting-item">
                            <label>{L('发件邮箱账号 (SMTP User)', 'SMTP User')}</label>
                            <input
                                type="email"
                                value={settings.smtpUser}
                                onChange={(e) => handleChange('smtpUser', e.target.value)}
                                placeholder="noreply@example.com"
                                disabled={emailDisabled}
                            />
                        </div>
                        <div className="setting-item">
                            <label>{L('邮箱密码/授权码 (SMTP Password)', 'SMTP Password')}</label>
                            <input
                                type="password"
                                value={settings.smtpPass}
                                onChange={(e) => handleChange('smtpPass', e.target.value)}
                                placeholder={L('邮箱密码或授权码', 'SMTP password or authorization code')}
                                disabled={emailDisabled}
                            />
                        </div>
                        <div className="setting-item">
                            <button
                                className="btn btn-secondary"
                                disabled={emailDisabled}
                                onClick={async () => {
                                    try {
                                        const res = await fetch('/api/admin/settings/test-email', {
                                            method: 'POST',
                                            headers: { 'Authorization': `Bearer ${token}` }
                                        })
                                        const data = await res.json()
                                        if (res.ok) {
                                            alert('✅ ' + (data.message || L('测试邮件发送成功！', 'Test email sent successfully!')))
                                        } else {
                                            alert('❌ ' + L('测试发信失败: ', 'Test failed: ') + data.error)
                                        }
                                    } catch (error) {
                                        alert('❌ ' + L('测试发信失败: ', 'Test failed: ') + error.message)
                                    }
                                }}
                            >
                                {L('测试发信连接', 'Test SMTP Connection')}
                            </button>
                            <span className="setting-hint">{L('测试前请先保存当前设置', 'Save settings before testing SMTP connection')}</span>
                        </div>
                        </fieldset>
                    </div>
                )}

                {/* 通知设置 */}
                {activeTab === 'notify' && (
                    <div className="settings-section">
                        {emailDisabled && (
                            <div style={{
                                padding: '14px 16px', marginBottom: 16,
                                background: 'rgba(245, 158, 11, 0.1)',
                                border: '1px solid rgba(245, 158, 11, 0.4)',
                                borderRadius: 8, color: '#92400e', fontSize: '0.9rem'
                            }}>
                                {L('🔒 当前套餐不包含邮件通知额度，系统管理员邮件提醒已禁用。', '🔒 Current plan does not include email notifications. Admin email notifications are disabled.')}
                            </div>
                        )}
                        <fieldset disabled={emailDisabled} style={{ border: 0, padding: 0, margin: 0, opacity: emailDisabled ? 0.55 : 1 }}>
                        <div className="setting-item">
                            <label>{L('管理员接收通知邮箱', 'Admin Notification Email')}</label>
                            <input
                                type="email"
                                value={settings.adminNotifyEmail}
                                onChange={(e) => handleChange('adminNotifyEmail', e.target.value)}
                                placeholder="admin@example.com"
                                disabled={emailDisabled}
                            />
                            <span className="setting-hint">{L('上述触发的所有系统事件提醒将发送至该邮箱，留空则不开启提醒', 'System alerts will be sent to this email, leave blank to disable')}</span>
                        </div>

                        <div style={{ marginTop: '8px' }}>
                            <label style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '16px' }}>{L('通知触发事件', 'Notification Events')}</label>
                        </div>

                        <div className="setting-item toggle-item">
                            <div className="toggle-info">
                                <label>{L('💰 订单支付成功', '💰 Order Paid')}</label>
                                <span className="toggle-desc">{L('当有买家完成支付后发送邮件提醒管理员', 'Notify admins when a buyer completes payment')}</span>
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
                                <label>{L('📦 待手动发货', '📦 Pending Manual Ship')}</label>
                                <span className="toggle-desc">{L('当订单已支付但无可自动发放的卡密，需要管理员手动处理时提醒', 'Notify when order is paid but requires manual shipping')}</span>
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
                                <label>{L('🎫 新工单创建', '🎫 New Ticket Created')}</label>
                                <span className="toggle-desc">{L('当用户提交了新的客服工单时提醒管理员', 'Notify admins when a new support ticket is submitted')}</span>
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
                                <label>{L('👤 新用户注册', '👤 New User Registered')}</label>
                                <span className="toggle-desc">{L('当有新用户在商城注册账号时提醒管理员', 'Notify admins when a new user registers')}</span>
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
                                <label>{L('⚠️ 库存不足预警', '⚠️ Low Stock Warning')}</label>
                                <span className="toggle-desc">{L('当商品的可用卡密或库存低于警告阈值时发送邮件提醒', 'Notify admins when product stock drops below warning threshold')}</span>
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
                                <label>{L('📦 订单已取消', '📦 Order Cancelled')}</label>
                                <span className="toggle-desc">{L('当有订单超时未付被取消或手动取消时提醒管理员', 'Notify admins when an order is cancelled')}</span>
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
                                <label>{L('💸 退款成功通知', '💸 Refund Successful')}</label>
                                <span className="toggle-desc">{L('订单成功退款后自动向买家发送退款确认邮件', 'Send refund confirmation email to buyer after refund completes')}</span>
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
                        </fieldset>
                    </div>
                )}

                {/* 管理员权限/提醒设置 */}
                {activeTab === 'admin' && (
                    <div className="settings-section">
                        <div className="setting-item toggle-item">
                            <div className="toggle-info">
                                <label>{L('仪表盘总览数据权限', 'Dashboard Overview Stats')}</label>
                                <span className="toggle-desc">{L('允许普通管理员账号查看仪表盘顶部的统计指标卡（如总销售额、用户数等）和趋势图表', 'Allow normal admins to view the stats cards and trend charts on the dashboard')}</span>
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
                                <label>{L('仪表盘今日数据权限', 'Dashboard Today Stats')}</label>
                                <span className="toggle-desc">{L('允许普通管理员账号查看仪表盘顶部的“今日数据”面板（包含今日订单数和今日收入）', 'Allow normal admins to view today\'s stats (orders and revenue) on the dashboard')}</span>
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
                                <label>{L('子管理员个性化邮箱通知', 'Sub-admin Personalized Email Notifications')}</label>
                                <span>{L('在此可以为每个管理员子账号独立配置邮件接收开关，以及需要接收的提醒事件类型', 'Configure email switches and event subscriptions for each admin account individually')}</span>
                            </div>

                            {(settings.adminEmailNotificationConfigs || []).length === 0 ? (
                                <div className="admin-email-empty">{L('暂无其他管理员账号', 'No other admin accounts')}</div>
                            ) : (
                                <div className="admin-email-list">
                                    {(settings.adminEmailNotificationConfigs || []).map(config => (
                                        <div key={config.userId} className="admin-email-card">
                                            <div className="admin-email-card-main">
                                                <div>
                                                    <div className="admin-email-name">
                                                        {config.username || L('未设置用户名', 'Not set username')}
                                                        <span>{config.role === 'SUPER_ADMIN' ? L('超级管理员', 'Super Admin') : L('普通管理员', 'Admin')}</span>
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

            </div>
        </div>
    )
}

// 管理后台主组件
function AdminDashboard({ basePath = '/admin' }) {
    const location = useLocation()
    const navigate = useNavigate()
    const { logout, user } = useAuthStore()
    const L = useAdminL()
    const [sidebarOpen, setSidebarOpen] = useState(true)
    const [agentEnabled, setAgentEnabled] = useState(false)
    const [setupGuideHidden, setSetupGuideHidden] = useState(false)
    const [planLimits, setPlanLimits] = useState({})
    const isSuperAdmin = ['SUPER_ADMIN', 'TENANT_ADMIN'].includes(user?.role)

    // 拉取Agent开关Status
    useEffect(() => {
        // 已登录Admins（含 TENANT_ADMIN）：用 /api/admin/settings 拿到Current租户的 agentEnabled
        const token = useAuthStore.getState().token
        if (token) {
            fetch('/api/admin/settings', { headers: { Authorization: `Bearer ${token}` } })
                .then(r => r.json())
                .then(d => {
                    const v = d?.settings?.agentEnabled
                    setAgentEnabled(v === true || v === 'true')
                    const hidden = d?.settings?.setupGuideHidden
                    setSetupGuideHidden(hidden === true || hidden === 'true')
                    // 同步经营货币到本地缓存
                    const cur = d?.settings?.currency
                    if (cur === 'CNY' || cur === 'USD') {
                        useAdminPrefsStore.getState().setCurrency(cur)
                    }
                })
                .catch(() => {})
        } else {
            // 兜底：访问公开设置（Main Site时使用）
            fetch('/api/settings/public')
                .then(r => r.json())
                .then(d => setAgentEnabled(d.settings?.agentEnabled === 'true'))
                .catch(() => {})
        }

        // 拉取套餐限制（用于 support / customerTickets 等功能开关）
        // 优先用 admin token（适用于 TENANT_ADMIN 直接登录商户后台），fallback 到 merchant token
        try {
            const tk = useAuthStore.getState().token
            if (tk) {
                fetch('/api/admin/plan-limits', { headers: { Authorization: `Bearer ${tk}` } })
                    .then(r => r.json())
                    .then(d => setPlanLimits(d?.limits || {}))
                    .catch(() => {})
            } else {
                const mToken = useMerchantStore.getState().token
                if (mToken) {
                    fetch('/api/platform/plan/limits', { headers: { Authorization: `Bearer ${mToken}` } })
                        .then(r => r.json())
                        .then(d => setPlanLimits(d?.limits || {}))
                        .catch(() => {})
                }
            }
        } catch {}
    }, [])

    useEffect(() => {
        const handleSetupGuideHidden = () => setSetupGuideHidden(true)
        window.addEventListener('setup-guide-hidden', handleSetupGuideHidden)
        return () => window.removeEventListener('setup-guide-hidden', handleSetupGuideHidden)
    }, [])

    const handleLogout = () => {
        logout()
        useMerchantStore.getState().logout()
        navigate('/')
    }

    // 根据Role过滤菜单项
    const isTenantAdmin = user?.role === 'TENANT_ADMIN';

    // 将 menuItems 里的 /admin 前缀替换for实际 basePath
    const resolvedMenuItems = menuItems.map(item => ({
        ...item,
        resolvedPath: item.path === '/admin'
            ? basePath
            : item.path.replace('/admin/', basePath + '/')
    }))

    const visibleMenuItems = resolvedMenuItems.filter(item => {
        if (item.superOnly && user?.role !== 'SUPER_ADMIN') return false;
        if (item.tenantOnly && !isTenantAdmin) return false;
        // 仅所有者可见的菜单（如商城设置）
        if (item.ownerOnly && !['SUPER_ADMIN', 'TENANT_ADMIN'].includes(user?.role)) return false;
        // Agents仅在EnableAgent体系时显示
        if (item.path === '/admin/agents' && !agentEnabled) return false;
        // 新手引导完成或手动关闭后，从侧边栏隐藏入口；路由仍保留可直接访问
        if (item.path === '/admin/setup' && setupGuideHidden) return false;
        // 套餐限制：联系客服需要套餐Enable support
        if (item.path === '/admin/support' && planLimits.support === false) return false;
        // 套餐限制：tickets管理需要套餐Enable customerTickets
        if (item.path === '/admin/tickets' && planLimits.customerTickets === false) return false;
        // Sub-Admins（ADMIN）按 permissions 过滤
        if (user?.role === 'ADMIN' && item.permission) {
            const perms = user.permissions || {}
            if (!perms[item.permission]) return false
        }
        return true;
    })

    return (
        <div className={`admin-layout ${sidebarOpen ? '' : 'sidebar-collapsed'}`}>
            {/* 侧边栏 */}
            <aside className="admin-sidebar">
                <div className="sidebar-header">
                    <span className="sidebar-title">{L('admin.title')}</span>
                    <button className="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
                        {sidebarOpen ? <FiX /> : <FiMenu />}
                    </button>
                </div>

                <nav className="sidebar-nav">
                    {visibleMenuItems.map(item => {
                        const isActive = item.exact
                            ? location.pathname === item.resolvedPath
                            : location.pathname.startsWith(item.resolvedPath)
                        return (
                            <Link
                                key={item.resolvedPath}
                                to={item.resolvedPath}
                                className={`nav-item ${isActive ? 'active' : ''}`}
                            >
                                <item.icon />
                                <span>{L(item.labelZh, item.labelEn)}</span>
                            </Link>
                        )
                    })}
                </nav>

                <div className="sidebar-footer">
                    <div className="user-info">
                        <div className="user-avatar">👤</div>
                        <div className="user-details">
                            <span className="user-name">{user?.username || 'Admin'}</span>
                            <span className="user-role">{user?.role === 'SUPER_ADMIN' ? L('admin.userRole.superAdmin') : L('admin.userRole.admin')}</span>
                        </div>
                    </div>
                    <button className="logout-btn" onClick={handleLogout}>
                        <FiLogOut />
                        <span>{L('admin.logout')}</span>
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
                    <Route path="shop-settings" element={<TenantSettings />} />
                    <Route path="settings" element={<TenantSettings />} />
                    <Route path="support/*" element={<MerchantSupportPage />} />
                </Routes>
            </main>
        </div>
    )
}


// 新手起航页面
function SetupGuidePage() {
    const location = useLocation()
    const navigate = useNavigate()
    const L = useAdminL()
    const { showToast } = useToast()
    const basePath = location.pathname.replace(/\/setup.*$/, '') || '/admin'
    const [stats, setStats] = useState({ totalProducts: 0, totalOrders: 0 });
    const [tenant, setTenant] = useState(null);
    const [shop, setShop] = useState(null);
    const [copiedKey, setCopiedKey] = useState(null);
    const token = useAuthStore(state => state.token);
    const mShop = useMerchantStore(state => state.shop);

    useEffect(() => {
        if (token) {
            fetch('/api/admin/dashboard', { headers: { 'Authorization': `Bearer ${token}` } })
                .then(r => r.json())
                .then(data => {
                    setStats({
                        totalProducts: data.totalProducts || 0,
                        totalOrders: data.totalOrders || 0
                    })
                })
                .catch(() => {});
            fetch('/api/tenant/me', { headers: { 'Authorization': `Bearer ${token}` } })
                .then(r => r.json())
                .then(data => { if (data.tenant) setTenant(data.tenant) })
                .catch(() => {});
        }
    }, [token]);

    const hasProducts = stats.totalProducts > 0;
    const hasDomain = tenant?.domains?.some(d => d.dnsVerified);
    const hasPaidPlan = mShop?.plan && mShop.plan !== 'FREE';
    const hasPayment = tenant?.settings?.alipayEnabled || tenant?.settings?.usdtEnabled || tenant?.settings?.bscUsdtEnabled;
    const hasOrders = stats.totalOrders > 0;

    const handleCopyShopLink = async () => {
        const url = `${window.location.origin}/v/${tenant?.shopSlug || mShop?.slug || ''}`
        try {
            await navigator.clipboard.writeText(url)
        } catch {
            // fallback for non-secure context
            const ta = document.createElement('textarea')
            ta.value = url; document.body.appendChild(ta)
            ta.select(); document.execCommand('copy'); document.body.removeChild(ta)
        }
        setCopiedKey('share')
        setTimeout(() => setCopiedKey(null), 1500)
    }

    const hideSetupGuide = async ({ silent = false, redirect = false } = {}) => {
        try {
            await fetch('/api/admin/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ setupGuideHidden: true })
            })
            window.dispatchEvent(new Event('setup-guide-hidden'))
            if (!silent) showToast(L('inline.setup.guide.hidden.3b15f9b'), 'success')
            if (redirect) navigate(basePath)
        } catch {
            if (!silent) showToast(L('inline.failed.to.hide.please.try.again.later.c53926e'), 'error')
        }
    }

    const steps = [
        {
            key: 'product',
            icon: '📦',
            title: L('inline.publish.your.first.product.2303958'),
            desc: L('inline.add.product.details.and.card.key.inventory.so.buyers.can.pla.6c29e69'),
            done: hasProducts,
            action: { label: L('inline.publish.84d8bfb'), to: `${basePath}/products` }
        },
        {
            key: 'payment',
            icon: '💳',
            title: L('inline.configure.payment.methods.987d02d'),
            desc: L('inline.set.up.alipay.or.usdt.payments.so.funds.go.directly.to.your..0d7d845'),
            done: hasPayment,
            action: { label: L('inline.configure.2702202'), to: `${basePath}/shop-settings` }
        },
        {
            key: 'plan',
            icon: '💎',
            title: L('inline.upgrade.plan.f72f918'),
            desc: L('inline.upgrade.after.the.free.trial.ends.to.keep.accepting.orders.a.918404c'),
            done: hasPaidPlan,
            action: { label: L('inline.choose.plan.0966710'), to: `${basePath}/shop-settings` },
            highlight: !hasPaidPlan
        },
        {
            key: 'domain',
            icon: '🌐',
            title: L('inline.connect.custom.domain.f6623f9'),
            desc: L('inline.use.your.own.domain.for.the.store.to.strengthen.your.brand.p.61c24d6'),
            done: hasDomain,
            action: { label: L('inline.connect.e9f4a87'), to: `${basePath}/shop-settings` },
            optional: true
        },
        {
            key: 'share',
            icon: '🚀',
            title: L('inline.complete.your.first.order.5d6a6ab'),
            desc: L('inline.share.your.store.link.with.customers.and.start.receiving.you.7f874b9'),
            done: hasOrders,
            action: {
                label: copiedKey === 'share' ? L('inline.copied.2aff14e') : L('inline.copy.link.0d260eb'),
                onClick: handleCopyShopLink,
                copied: copiedKey === 'share'
            }
        },
    ];

    const completedCount = steps.filter(s => s.done).length;
    const progress = Math.round((completedCount / steps.length) * 100);
    const requiredSteps = steps.filter(s => !s.optional)
    const requiredDone = requiredSteps.every(s => s.done)

    useEffect(() => {
        if (token && requiredDone) {
            hideSetupGuide({ silent: true })
        }
    }, [token, requiredDone])

    return (
        <div className="dashboard-content">
            <div style={{ marginBottom: 28, display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' }}>
                <div>
                    <h2 className="page-title" style={{ marginBottom: 4 }}>{L('admin.menu.setup')}</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: 0 }}>{L('inline.complete.the.steps.below.to.quickly.launch.your.store.3a75aa6')}</p>
                </div>
                <button
                    type="button"
                    onClick={() => hideSetupGuide({ redirect: true })}
                    style={{
                        padding: '8px 14px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-color)',
                        background: 'var(--bg-tertiary)',
                        color: 'var(--text-secondary)',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        fontFamily: 'inherit'
                    }}
                >
                    {L('inline.hide.guide.0d42f78')}
                </button>
            </div>

            {/* 进度条 */}
            <div style={{
                background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)', padding: '24px', marginBottom: 24
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {L('inline.setup.progress.bc73d02')}
                    </span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        {L(`已完成 ${completedCount} / ${steps.length}`, `${completedCount} / ${steps.length} completed`)}
                    </span>
                </div>
                <div style={{ height: 8, background: 'var(--bg-tertiary)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{
                        height: '100%', width: `${progress}%`,
                        background: progress === 100 ? 'var(--success)' : 'var(--gradient-primary)',
                        borderRadius: 4, transition: 'width 0.3s ease'
                    }} />
                </div>
                {progress === 100 && (
                    <div style={{ marginTop: 12, fontSize: '0.85rem', color: 'var(--success)', fontWeight: 500 }}>
                        🎉 {L('inline.congratulations.all.steps.are.complete.and.your.store.is.rea.ccd047c')}
                    </div>
                )}
            </div>

            {/* 步骤列表 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {steps.map((step, idx) => (
                    <div key={step.key} style={{
                        display: 'flex', alignItems: 'center', gap: 16,
                        padding: '20px 24px',
                        background: 'var(--bg-card)',
                        border: `1px solid ${step.highlight && !step.done ? 'var(--primary)' : 'var(--border-color)'}`,
                        borderRadius: 'var(--radius-md)',
                        opacity: step.done ? 0.7 : 1,
                        transition: 'all 0.15s'
                    }}>
                        {/* StatusIcon */}
                        <div style={{
                            width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '1.2rem',
                            background: step.done ? 'rgba(16,185,129,0.12)' : 'var(--bg-tertiary)',
                        }}>
                            {step.done ? <FiCheckCircle size={20} color="var(--success)" /> : step.icon}
                        </div>

                        {/* 内容 */}
                        <div style={{ flex: 1 }}>
                            <div style={{
                                fontSize: '0.95rem', fontWeight: 600,
                                color: step.done ? 'var(--text-secondary)' : 'var(--text-primary)',
                                textDecoration: step.done ? 'line-through' : 'none',
                                display: 'flex', alignItems: 'center', gap: 8
                            }}>
                                {step.title}
                                {step.optional && <span style={{ fontSize: '0.7rem', padding: '2px 6px', background: 'var(--bg-tertiary)', color: 'var(--text-muted)', borderRadius: 4 }}>{L('inline.optional.dfa6fb8')}</span>}
                                {step.highlight && !step.done && <span style={{ fontSize: '0.7rem', padding: '2px 6px', background: 'rgba(239,68,68,0.1)', color: 'var(--primary-light)', borderRadius: 4 }}>{L('inline.important.c2627d9')}</span>}
                            </div>
                            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 4 }}>
                                {step.desc}
                            </div>
                        </div>

                        {/* Actions按钮 */}
                        {!step.done && (
                            step.action.to ? (
                                <Link to={step.action.to} style={{
                                    padding: '8px 18px', borderRadius: 'var(--radius-sm)',
                                    background: step.highlight ? 'var(--gradient-primary)' : 'var(--bg-tertiary)',
                                    color: step.highlight ? '#fff' : 'var(--text-primary)',
                                    border: step.highlight ? 'none' : '1px solid var(--border-color)',
                                    textDecoration: 'none', fontSize: '0.82rem', fontWeight: 600,
                                    whiteSpace: 'nowrap'
                                }}>
                                    {step.action.label}
                                </Link>
                            ) : (
                                <button onClick={step.action.onClick} style={{
                                    padding: '8px 18px', borderRadius: 'var(--radius-sm)',
                                    background: step.action.copied ? '#10b981' : 'var(--bg-tertiary)',
                                    color: step.action.copied ? '#fff' : 'var(--text-primary)',
                                    border: step.action.copied ? '1px solid #10b981' : '1px solid var(--border-color)',
                                    fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                                    transition: 'all 0.25s ease'
                                }}>
                                    {step.action.label}
                                </button>
                            )
                        )}
                        {step.done && (
                            <span style={{ fontSize: '0.8rem', color: 'var(--success)', fontWeight: 500 }}>✓ {L('admin.dashboard.orderStatus.completed')}</span>
                        )}
                    </div>
                ))}
            </div>

            {/* 帮助Notice */}
            <div style={{
                marginTop: 28, padding: '20px 24px',
                background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)'
            }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>💡 {L('inline.tips.8a95b16')}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    {[
                        { icon: '📋', text: L('inline.products.support.bulk.card.key.import.so.you.can.upload.many.0710b7f') },
                        { icon: '🎨', text: L('inline.you.can.switch.store.themes.in.store.settings.636104a') },
                        { icon: '📧', text: L('inline.after.an.order.is.completed.card.keys.are.emailed.to.buyers..af04f68') },
                        { icon: '📊', text: L('inline.the.dashboard.shows.real.time.order.and.revenue.data.4fd6de3') },
                    ].map((tip, i) => (
                        <div key={i} style={{ display: 'flex', gap: 8, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                            <span>{tip.icon}</span>
                            <span>{tip.text}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// 包装Export
function AdminDashboardWithProvider({ basePath }) {
    return (
        <ToastProvider>
            <AdminDashboard basePath={basePath} />
        </ToastProvider>
    )
}

export default AdminDashboardWithProvider

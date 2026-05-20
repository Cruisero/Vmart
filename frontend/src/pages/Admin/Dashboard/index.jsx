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
        if (!form.subject || !form.content) { showToast('Please fill in subject and content', 'error'); return }
        setSubmitting(true)
        try {
            const r = await fetch('/api/platform/tickets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
                body: JSON.stringify({ subject: form.subject, content: form.content, images: form.images.length ? form.images : null })
            })
            const d = await r.json()
            if (!r.ok) { showToast(d.error || 'Submission failed', 'error'); return }
            showToast('Ticket submitted', 'success')
            setForm({ subject: '', content: '', images: [] })
            setView('list')
            fetchTickets()
        } catch { showToast('Network error', 'error') }
        finally { setSubmitting(false) }
    }

    const handleReply = async () => {
        if (!replyContent.trim()) { showToast('Please enter content', 'error'); return }
        setSubmitting(true)
        try {
            const r = await fetch(`/api/platform/tickets/${selectedTicket.id}/reply`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
                body: JSON.stringify({ content: replyContent, images: replyImages.length ? replyImages : null })
            })
            if (!r.ok) { const d = await r.json(); showToast(d.error || 'Send failed', 'error'); return }
            setReplyContent('')
            setReplyImages([])
            // Refresh详情
            const dr = await fetch(`/api/platform/tickets/${selectedTicket.id}`, { headers: { Authorization: `Bearer ${authToken}` } })
            const dd = await dr.json()
            setSelectedTicket(dd.ticket)
        } catch { showToast('Network error', 'error') }
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
                showToast('Image uploaded', 'success')
            } else {
                showToast(d.error || 'Upload failed', 'error')
            }
        } catch {
            showToast('Upload failed', 'error')
        } finally {
            setUploading(false)
            e.target.value = ''
        }
    }

    const statusMap = { OPEN: { label: 'Pending', color: '#F59E0B' }, IN_PROGRESS: { label: 'In Progress', color: '#3B82F6' }, CLOSED: { label: 'Closed', color: '#6B7280' } }

    if (view === 'create') {
        return (
            <div className="admin-page">
                <div className="page-header">
                    <h2>Submit Ticket</h2>
                    <button className="btn btn-secondary" onClick={() => setView('list')}>Back to List</button>
                </div>
                <form onSubmit={handleCreate} style={{ maxWidth: 600, display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>Subject</label>
                        <input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="Brief description" required style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--border-color)', borderRadius: 8, background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.9rem' }} />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>Description</label>
                        <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} placeholder="Describe your issue in detail..." required rows={6} style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--border-color)', borderRadius: 8, background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.9rem', fontFamily: 'inherit', resize: 'vertical' }} />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>Attachments</label>
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
                        {submitting ? 'Submitting...' : 'Submit Ticket'}
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
                                    if (!confirm('Close this ticket? You can reopen within 24 hours.')) return
                                    const r = await fetch(`/api/platform/tickets/${selectedTicket.id}/close`, {
                                        method: 'POST', headers: { Authorization: `Bearer ${authToken}` }
                                    })
                                    if (r.ok) {
                                        showToast('Ticket closed', 'success')
                                        const dr = await fetch(`/api/platform/tickets/${selectedTicket.id}`, { headers: { Authorization: `Bearer ${authToken}` } })
                                        const dd = await dr.json()
                                        setSelectedTicket(dd.ticket)
                                    } else {
                                        const d = await r.json()
                                        showToast(d.error || 'Close failed', 'error')
                                    }
                                }}
                                style={{
                                    fontSize: '0.78rem', padding: '4px 12px', borderRadius: 8,
                                    background: 'transparent', border: '1px solid rgba(239, 68, 68, 0.4)',
                                    color: '#ef4444', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4
                                }}
                            >
                                <FiX size={13} />
                                Close Ticket
                            </button>
                        )}
                    </h2>
                    <button className="btn btn-secondary" onClick={() => { setView('list'); setSelectedTicket(null) }}>Back to List</button>
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
                                {msg.senderType === 'MERCHANT' ? 'Me' : 'Support'} · {new Date(msg.createdAt).toLocaleString()}
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
                        <textarea value={replyContent} onChange={e => setReplyContent(e.target.value)} placeholder="Type your reply..." rows={3} style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--border-color)', borderRadius: 8, background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.9rem', fontFamily: 'inherit', resize: 'vertical' }} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
                            <label style={{ cursor: 'pointer', padding: '6px 12px', border: '1px solid var(--border-color)', borderRadius: 6, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                                <FiImage size={14} style={{ verticalAlign: '-2px', marginRight: 4 }} />
                                {uploading ? 'Uploading...' : 'Add Image'}
                                <input type="file" accept="image/*" onChange={e => handleUpload(e, 'reply')} style={{ display: 'none' }} />
                            </label>
                            {replyImages.map((url, i) => (
                                <img key={i} src={url} alt="" style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 4 }} />
                            ))}
                            <button className="btn btn-primary" onClick={handleReply} disabled={submitting} style={{ marginLeft: 'auto' }}>
                                {submitting ? 'Sending...' : 'Send'}
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
                                    ? `Ticket closed (can reopen within ${hoursLeft} hours)`
                                    : 'Ticket closed for over 24 hours. Please submit a new ticket.'}
                            </span>
                            {canReopen && (
                                <button className="btn btn-secondary" onClick={async () => {
                                    const r = await fetch(`/api/platform/tickets/${selectedTicket.id}/reopen`, {
                                        method: 'POST', headers: { Authorization: `Bearer ${authToken}` }
                                    })
                                    if (r.ok) {
                                        showToast('Ticket reopened', 'success')
                                        const dr = await fetch(`/api/platform/tickets/${selectedTicket.id}`, { headers: { Authorization: `Bearer ${authToken}` } })
                                        const dd = await dr.json()
                                        setSelectedTicket(dd.ticket)
                                    } else {
                                        const d = await r.json()
                                        showToast(d.error || 'Operation failed', 'error')
                                    }
                                }}>Reopen</button>
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
                <h2>Contact Support</h2>
                <button className="btn btn-primary" onClick={() => setView('create')}>+ New Ticket</button>
            </div>
            {loading ? <p>Loading...</p> : tickets.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                    <FiSend size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
                    <p>No tickets yet. Submit a ticket if you need help.</p>
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
                                    {lastMsg && <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>{lastMsg.senderType === 'ADMIN' ? 'Support: ' : ''}{lastMsg.content?.slice(0, 50)}</div>}
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
function PlatformNotices() {
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
                        <span style={{ color: '#64748b', fontSize: '0.78rem', marginRight: 8 }}>From Vmart</span>
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
                    🎉 Free Trial Active
                </div>
                <div style={{ fontSize: '0.78rem', color: '#6366f1', marginTop: 3 }}>
                    All features available. Upgrade to start accepting orders.
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
                Upgrade →
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
            orders: { label: 'Order Trend', color: '#ef4444', fillId: 'colorOrders' },
            revenue: { label: 'Revenue Trend', color: '#10b981', fillId: 'colorRevenue' },
            products: { label: 'Product Trend', color: '#f59e0b', fillId: 'colorProducts' },
            users: { label: 'User Growth', color: '#3b82f6', fillId: 'colorUsers' },
            visits: { label: 'Visit Trend', color: '#8b5cf6', fillId: 'colorVisits' }
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
                    <div style={{ padding: '20px', color: 'var(--text-muted)' }}>Loading...</div>
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
        if (diffMins < 60) return `${diffMins}m ago`
        const diffHours = Math.floor(diffMins / 60)
        if (diffHours < 24) return `${diffHours}h ago`
        return date.toLocaleDateString()
    }

    const paymentMethodLabels = {
        'alipay': 'Alipay',
        'usdt_trc20': 'USDT (TRC20)',
        'bsc_usdt': 'USDT (BSC)',
        'wechat': 'WeChat Pay'
    }

    if (loading) {
        return <div className="dashboard-home"><p>Loading...</p></div>
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
                                🔴 {stats.stockAlertProducts.length} product(s) out of stock:
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
                            <span>{stats.pendingTickets} unread ticket(s)</span>
                            <FiTrendingUp className="alert-arrow" />
                        </Link>
                    )}
                    {stats.paidOrders > 0 && (
                        <Link to={`${basePath}/orders?status=PAID`} className="alert-item alert-shipping">
                            <FiSend />
                            <span>{stats.paidOrders} order(s) to ship</span>
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



// Product管理
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
            showToast(isEnabled ? 'Stock alert disabled' : 'Stock alert enabled', 'success')
        } catch (e) {
            showToast('Setting failed', 'error')
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
            showToast('Enter category name', 'error')
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
            showToast('Category added', 'success')
            setNewCategory({ name: '', icon: '📦' })
            fetchCategories()
        } catch (error) {
            showToast('Failed to add category', 'error')
        }
    }

    // Delete分类
    const handleDeleteCategory = async (categoryId, categoryName) => {
        showConfirm('Delete Category', `Delete category "${categoryName}"?`, async () => {
            try {
                const response = await fetch(`/api/admin/categories/${categoryId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                })
                if (!response.ok) throw new Error('Delete failed')
                showToast('Category deleted', 'success')
                fetchCategories()
            } catch (error) {
                showToast('Failed to delete category', 'error')
            }
        })
    }

    // 更新分类
    const handleUpdateCategory = async () => {
        if (!editingCategory) return
        if (!editingCategory.name.trim()) {
            showToast('Enter category name', 'error')
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
            showToast('Category updated', 'success')
            setEditingCategory(null)
            fetchCategories()
        } catch (error) {
            showToast('Failed to update category', 'error')
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
            'Delete Product',
            `Delete product "${product.name}"? This cannot be undone.`,
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
                    showToast('Product deleted', 'success')
                    fetchProducts()
                } catch (error) {
                    showToast('Delete failed: ' + error.message, 'error')
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
            showToast('Please add product variants, or enter a price in the "Price" field', 'error')
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
                showToast('Product updated', 'success')
            } else {
                showToast('Product added', 'success')
            }
            setShowModal(false)
            // Refresh页面以显示新Product（临时方案）
            fetchProducts()
        } catch (error) {
            showToast('Operation failed: ' + error.message, 'error')
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
                showToast(`${file.name} is not an image file`, 'warning')
                continue
            }
            if (file.size > 5 * 1024 * 1024) {
                showToast(`${file.name} exceeds 5MB`, 'warning')
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
            showToast('Please select images first', 'warning')
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
            showToast(`Successfully uploaded ${result.images.length} images`, 'success')
        } catch (error) {
            showToast('Image upload failed: ' + error.message, 'error')
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
            showToast('Image deleted', 'success')
        } catch (error) {
            showToast('Delete failed', 'error')
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
                                        title={stockAlertIds.includes(product.id) ? 'Disable stock alert' : 'Enable stock alert'}
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
                                <label>Short Description <span style={{ color: '#999', fontWeight: 'normal' }}>(shown on product card and below title)</span></label>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    placeholder="One-line product highlight"
                                    rows={2}
                                />
                            </div>
                            <div className="form-group">
                                <label>Full Description <span style={{ color: '#999', fontWeight: 'normal' }}>(shown at bottom of product detail page)</span></label>
                                <textarea
                                    name="fullDescription"
                                    value={formData.fullDescription}
                                    onChange={handleChange}
                                    placeholder="【Product Info】&#10;• Item detail 1&#10;• Item detail 2&#10;&#10;【How to Use】&#10;1. Step one&#10;2. Step two"
                                    rows={6}
                                />
                            </div>

                            {/* Variants - 放在价格上方 */}
                            <div className="form-group variants-section">
                                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <span>
                                        Variants
                                        <span style={{ color: '#999', fontWeight: 'normal', marginLeft: 8 }}>
                                            (optional, e.g.: Monthly, Quarterly, Annual)
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
                                        Enable variant type grouping
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
                                                        <span style={{ fontWeight: 500 }}>Type:</span>
                                                        <input
                                                            type="text"
                                                            value={typeName === 'Default' ? '' : typeName}
                                                            placeholder="Enter type name, e.g.: Shared, Dedicated"
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
                                                                title="Delete this type"
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
                                                                    title="Move up"
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
                                                                    placeholder="Variant name"
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
                                                                    placeholder="Price"
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
                                                                    placeholder="Stock"
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
                                                        + Add Variant
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
                                            + Add Type
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
                                                    title="Move up"
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
                                                    placeholder="Variant name"
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
                                                    placeholder="Price"
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
                                                    placeholder="Stock"
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
                                            + Add Variant
                                        </button>
                                    </>
                                )}
                            </div>

                            {/* 售价 + 库存（始终显示售价；手动Stock Mode +NoneVariant才显示库存） */}
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Price ({getCurrencySymbol()}) *</label>
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
                                        When variants are added, price follows variant pricing
                                    </span>
                                </div>
                                {!(formData.variants.length > 0 && formData.variants.some(v => v.name)) && stockMode === 'manual' && (
                                    <div className="form-group">
                                        <label>Stock *</label>
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
                                    Wholesale Pricing
                                    <span style={{ color: '#999', fontWeight: 'normal', fontSize: '0.85rem', marginLeft: 8 }}>
                                        Auto-applied when minimum quantity is reached
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
                                                                <span className="wholesale-editor__col-label">Variant</span>
                                                            )}
                                                            <span className="wholesale-editor__col-label">Min Qty</span>
                                                            <span className="wholesale-editor__col-label">Unit Price ({getCurrencySymbol()})</span>
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
                                                                    placeholder="e.g. 10"
                                                                    min="1"
                                                                    value={tier.minQty}
                                                                    onChange={(e) => updateTier(tier._key, 'minQty', e.target.value)}
                                                                />
                                                            </div>
                                                            <div className="wholesale-editor__input-wrap">
                                                                <input
                                                                    type="number"
                                                                    className="wholesale-editor__input"
                                                                    placeholder="e.g. 9.90"
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
                                                                title="Delete this tier"
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
                                                        Add wholesale tier
                                                    </button>
                                                </>
                                            )
                                        })()}
                                    </div>
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Category</label>
                                <CustomSelect
                                    name="categoryId"
                                    value={formData.categoryId}
                                    onChange={handleChange}
                                    placeholder="Select category"
                                    options={categories.map(cat => ({
                                        value: cat.id,
                                        label: `${cat.icon} ${cat.name}`
                                    }))}
                                />
                            </div>
                            <div className="form-group">
                                <label>Product Weight <span style={{ color: '#999', fontWeight: 'normal' }}>(0-100，Higher = higher priority, default 0)</span></label>
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
                                <label>Product Images <span className="upload-count">({formData.images.length} uploaded, {pendingImages.length} pending)</span></label>
                                <div className="image-upload-area multi">
                                    {/* Uploaded images */}
                                    {formData.images.map((img, index) => {
                                        // 处理不同格式的图片数据
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
                                            <span className="image-status pending">pending</span>
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
                                            <span>Add Image</span>
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
                                            {isUploading ? `Uploading...` : `Upload ${pendingImages.length} image(s)`}
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
                                <label>Delivery Note <span style={{ color: '#999', fontWeight: 'normal' }}>(Shown on order page after shipping. Leave empty to hide.)</span></label>
                                <textarea
                                    name="deliveryNote"
                                    value={formData.deliveryNote}
                                    onChange={handleChange}
                                    placeholder="e.g. Please login in incognito mode..."
                                    rows={3}
                                    style={{ resize: 'vertical' }}
                                />
                            </div>
                            <div className="form-group">
                                <label>Status</label>
                                <select name="status" value={formData.status} onChange={handleChange}>
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    {editingProduct ? 'Save Changes' : L('admin.products.add')}
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
                            <h3>📁 Categories</h3>
                            <button className="modal-close" onClick={() => setShowCategoryModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            {/* Add New Category */}
                            <div style={{ marginBottom: '20px', padding: '16px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                                <h4 style={{ marginBottom: '12px', fontSize: '14px', color: 'var(--text-secondary)' }}>Add New Category</h4>
                                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                                    <input
                                        type="text"
                                        placeholder="Icon (emoji)"
                                        value={newCategory.icon}
                                        onChange={e => setNewCategory(prev => ({ ...prev, icon: e.target.value }))}
                                        className="input"
                                        style={{ width: '80px', textAlign: 'center', fontSize: '20px' }}
                                    />
                                    <input
                                        type="text"
                                        placeholder="Category Name"
                                        value={newCategory.name}
                                        onChange={e => setNewCategory(prev => ({ ...prev, name: e.target.value }))}
                                        className="input"
                                        style={{ flex: 1 }}
                                    />
                                    <button className="btn btn-primary" onClick={handleAddCategory}>Add</button>
                                </div>
                            </div>

                            {/* 分类列表 */}
                            <div>
                                <h4 style={{ marginBottom: '12px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                                    Existing Categories ({categories.length})
                                </h4>
                                {categories.length === 0 ? (
                                    <p style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '20px' }}>No categories</p>
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
                                                            placeholder="Icon"
                                                        />
                                                        <input
                                                            type="text"
                                                            value={editingCategory.name}
                                                            onChange={e => setEditingCategory(prev => ({ ...prev, name: e.target.value }))}
                                                            className="input"
                                                            style={{ flex: 1 }}
                                                            placeholder="Category Name"
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
                                                        >Save</button>
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
                                                                {cat.productCount || 0} product(s)
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div style={{ display: 'flex', gap: 8 }}>
                                                        <button
                                                            className="action-btn edit"
                                                            onClick={() => setEditingCategory({ id: cat.id, name: cat.name, icon: cat.icon || '📦' })}
                                                            style={{ padding: '6px 12px' }}
                                                        >Edit</button>
                                                        <button
                                                            className="action-btn delete"
                                                            onClick={() => handleDeleteCategory(cat.id, cat.name)}
                                                            style={{ padding: '6px 12px' }}
                                                        >Delete</button>
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

// 订单管理
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
                showToast(data.emailSent ? 'Shipped, email sent' : 'Shipped, email failed', data.emailSent ? 'success' : 'warning')
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
                showToast(data.error || 'ShipFailed', 'error')
            }
        } catch (error) {
            showToast('ShipFailed', 'error')
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
                showToast(data.emailSent ? `Resent (${data.totalCards}keys), email sent` : 'Resent, but email failed', data.emailSent ? 'success' : 'warning')
                setShowCardInputModal(false)
                setCardInputOrder(null)
                setCardInputContent('')
                setIsResendMode(false)
                fetchOrders()
            } else {
                showToast(data.error || 'Resend failed', 'error')
            }
        } catch (error) {
            showToast('Resend failed', 'error')
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
            'RefundConfirm',
            `Are you sure you want to mark order ${order.orderNo}标记forRefunding吗？Confirm后会进入待RefundStatus，点击“Refunded”后才会最终释放卡密回库存。`,
            async () => {
                try {
                    const res = await fetch(`/api/admin/orders/${order.id}/refund`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}` }
                    })
                    const data = await res.json()
                    if (res.ok) {
                        showToast(data.message || 'Order marked as refunding', 'success')
                        fetchOrders()
                    } else {
                        showToast(data.error || 'RefundFailed', 'error')
                    }
                } catch (error) {
                    showToast('RefundFailed', 'error')
                }
            },
            'ConfirmRefunding'
        )
    }

    const handleCompleteRefund = (order) => {
        showConfirm(
            'Complete Refund',
            `Are you sure you want to mark order ${order.orderNo}as refunded? Associated keys will be released.`,
            async () => {
                try {
                    const res = await fetch(`/api/admin/orders/${order.id}/refund/complete`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}` }
                    })
                    const data = await res.json()
                    if (res.ok) {
                        showToast(data.message || 'Order refunded, keys released', 'success')
                        fetchOrders()
                    } else {
                        showToast(data.error || 'Complete RefundFailed', 'error')
                    }
                } catch (error) {
                    showToast('Complete RefundFailed', 'error')
                }
            },
            'ConfirmRefunded'
        )
    }

    // Delete Order
    const handleDeleteOrder = (order) => {
        showConfirm(
            'Delete Order',
            `Are you sure you want to delete order ${order.orderNo}? This cannot be undone. Associated keys will be released.`,
            async () => {
                try {
                    const res = await fetch(`/api/admin/orders/${order.id}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${token}` }
                    })
                    const data = await res.json()
                    if (res.ok) {
                        showToast('Order deleted', 'success')
                        fetchOrders()
                    } else {
                        showToast(data.error || 'DeleteFailed', 'error')
                    }
                } catch (error) {
                    showToast('DeleteFailed', 'error')
                }
            },
            'ConfirmDelete'
        )
    }

    const statusMap = {
        PENDING: { label: 'Pending', class: 'pending' },
        PAID: { label: 'Paid', class: 'paid' },
        COMPLETED: { label: 'Completed', class: 'completed' },
        CANCELLED: { label: 'Cancelled', class: 'cancelled' },
        REFUNDING: { label: 'Refunding', class: 'refunding' },
        REFUNDED: { label: 'Refunded', class: 'refunded' }
    }

    if (loading) {
        return <div className="manage-page"><p>Loading...</p></div>
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
                                        {shipping === order.id ? 'Shipping...' : 'Ship'}
                                    </button>
                                )}
                                {order.status?.toUpperCase() === 'COMPLETED' && (
                                    <button
                                        className="action-btn ship"
                                        onClick={() => handleResend(order)}
                                    >
                                        Resend
                                    </button>
                                )}
                                {isSuperAdmin && (order.status?.toUpperCase() === 'PAID' || order.status?.toUpperCase() === 'COMPLETED') && (
                                    <button
                                        className="action-btn refund"
                                        onClick={() => handleRefund(order)}
                                    >
                                        Refund
                                    </button>
                                )}
                                {isSuperAdmin && order.status?.toUpperCase() === 'REFUNDING' && (
                                    <button
                                        className="action-btn refund-complete"
                                        onClick={() => handleCompleteRefund(order)}
                                    >
                                        Refunded
                                    </button>
                                )}
                                <button className="action-btn view" onClick={() => window.open(`${storefrontPrefix}/order/${order.orderNo}`, '_blank')}>{L('admin.orders.view')}</button>
                                {isSuperAdmin && <button className="action-btn delete" onClick={() => handleDeleteOrder(order)}>Delete</button>}
                            </td>
                        </tr>
                    ))}
                    {orders.length === 0 && (
                        <tr><td colSpan="8" style={{ textAlign: 'center' }}>No orders</td></tr>
                    )}
                </tbody>
            </table>

            {totalPages > 1 && (
                <div className="pagination">
                    <button
                        disabled={currentPage <= 1}
                        onClick={() => setCurrentPage(p => p - 1)}
                    >
                        ← Prev
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
                        Next →
                    </button>
                    <span style={{ marginLeft: '8px', fontSize: '0.85rem', color: '#94a3b8' }}>
                        Page {currentPage}/{totalPages} 
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
                            <h3>{isResendMode ? 'Resend Keys' : 'Manual Ship'}</h3>
                            <p className="ship-modal-subtitle">Order {cardInputOrder.orderNo}</p>
                            <button className="ship-modal-close" onClick={() => setShowCardInputModal(false)}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M18 6L6 18M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="ship-modal-body">
                            <div className="order-info-card">
                                <div className="order-info-row">
                                    <span className="order-info-label">Product Name</span>
                                    <span className="order-info-value">{cardInputOrder.productName}</span>
                                </div>
                                <div className="order-info-row">
                                    <span className="order-info-label">Quantity</span>
                                    <span className="order-info-value highlight">{cardInputOrder.quantity} pcs</span>
                                </div>
                                <div className="order-info-row">
                                    <span className="order-info-label">Customer Email</span>
                                    <span className="order-info-value">{cardInputOrder.email}</span>
                                </div>
                                {cardInputOrder.remark && (
                                    <div className="order-info-row">
                                        <span className="order-info-label">Order Note</span>
                                        <span className="order-info-value remark-value">{cardInputOrder.remark}</span>
                                    </div>
                                )}
                            </div>

                            <div className="card-input-section">
                                <label className="card-input-label">
                                    <span className="card-icon">🎫</span>
                                    {isResendMode ? 'Resend Key Content' : 'Card Key Content'}
                                    <span className="card-hint">{isResendMode ? 'Separate multiple keys with ---' : (cardInputOrder.quantity === 1 ? 'Supports multi-line content' : `Separate with ---, max ${cardInputOrder.quantity}items`)}</span>
                                </label>
                                <textarea
                                    className="card-input-textarea"
                                    value={cardInputContent}
                                    onChange={(e) => setCardInputContent(e.target.value)}
                                    placeholder={cardInputOrder.quantity === 1 ? 'Enter card key content (multi-line supported)...' : `Enter card key content...\nSeparate with ---. Example:\nkey1 content\n---\nkey2 content`}
                                    rows={6}
                                    autoFocus
                                />
                            </div>

                            <div className="ship-notice">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10" />
                                    <path d="M12 16v-4M12 8h.01" />
                                </svg>
                                <span>{isResendMode ? 'After resend, customer will be notified by email with all keys' : 'After shipping, customer will be notified by email with key info'}</span>
                            </div>
                        </div>

                        <div className="ship-modal-footer">
                            <button
                                className="ship-btn ship-btn-cancel"
                                onClick={() => setShowCardInputModal(false)}
                            >
                                Cancel
                            </button>
                            <button
                                className="ship-btn ship-btn-confirm"
                                onClick={isResendMode ? handleSubmitResend : handleSubmitShip}
                                disabled={shipping === cardInputOrder.id || !cardInputContent.trim()}
                            >
                                {shipping === cardInputOrder.id ? (
                                    <>
                                        <span className="loading-spinner"></span>
                                        Shipping...
                                    </>
                                ) : (
                                    <>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                                        </svg>
                                        {isResendMode ? 'ConfirmResend' : 'ConfirmShip'}
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

// tickets管理
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
        OPEN: { label: 'Pending', class: 'pending', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' },
        IN_PROGRESS: { label: 'In Progress', class: 'processing', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)' },
        PENDING_SUPER_ADMIN: { label: 'Escalated', class: 'super-admin', color: '#7c3aed', bg: 'rgba(124, 58, 237, 0.1)' },
        CLOSED: { label: 'Closed', class: 'completed', color: '#64748b', bg: 'rgba(100, 116, 139, 0.1)' }
    }

    const typeMap = {
        ORDER_ISSUE: { label: 'Order Issue', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' },
        CARD_ISSUE: { label: 'Card Key Issue', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.1)' },
        REFUND: { label: 'Refund Request', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' },
        OTHER: { label: 'Other', color: '#64748b', bg: 'rgba(100, 116, 139, 0.1)' }
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
            showToast('Failed to load tickets', 'error')
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
            showToast('Failed to load ticket details', 'error')
        }
    }

    const handleReply = async () => {
        if (!replyContent.trim()) {
            showToast('Please enter reply content', 'warning')
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
                showToast('Reply sent, user notified by email', 'success')
                setReplyContent('')
                setReplyImages([])
                handleViewTicket(selectedTicket)
                fetchTickets()
            } else {
                const data = await res.json()
                showToast(data.error || 'Reply failed', 'error')
            }
        } catch (error) {
            showToast('Reply failed', 'error')
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
                showToast('Image uploaded', 'success')
            } else {
                showToast('UploadFailed', 'error')
            }
        } catch { showToast('UploadFailed', 'error') }
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
                showToast('Status updated', 'success')
                handleViewTicket({ id: selectedTicket.id })
                fetchTickets()
            }
        } catch (error) {
            showToast('Status update failed', 'error')
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
            showToast('User info not found', 'warning')
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
            showToast('Associated order not found', 'warning')
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
                            {globalStats.unread > 99 ? '99+' : globalStats.unread} new user message(s) pending
                        </span>
                    )}
                    <span className="total-count">Total {totalCount} ticket(s)</span>
                    <select
                        className="filter-select"
                        value={statusFilter}
                        onChange={(e) => handleStatusFilterChange(e.target.value)}
                    >
                        <option value="all">{L('admin.orders.allStatus')}</option>
                        <option value="OPEN">{L('admin.tickets.stats.pending')}</option>
                        <option value="IN_PROGRESS">{L('admin.tickets.stats.inProgress')}</option>
                        <option value="PENDING_SUPER_ADMIN">{L('admin.tickets.stats.pendingSuperAdmin')}</option>
                        <option value="COMPLETED">Completed</option>
                        <option value="CLOSED">{L('admin.tickets.stats.closed')}</option>
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="loading-state">
                    <div className="loading-spinner"></div>
                    <span>Loading...</span>
                </div>
            ) : displayTickets.length === 0 ? (
                <div className="empty-state">
                    <FiMessageCircle className="empty-icon" />
                    <h3>No tickets</h3>
                    <p>{unreadFilter ? 'No unread tickets' : noReplyFilter ? 'No tickets pending reply' : `No ${statusFilter !== 'all' ? statusMap[statusFilter]?.label : ''}tickets`}</p>
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
                                            {ticket.adminUnreadCount > 99 ? '99+' : ticket.adminUnreadCount} new message(s)
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
                                <button className="action-btn view">View Details</button>
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
                    >‹ Prev</button>
                    <span className="page-info">Page {page} / {totalPages} </span>
                    <button
                        className="page-btn"
                        onClick={() => setPage(p => p + 1)}
                        disabled={page === totalPages}
                    >Next ›</button>
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
                            <h3>Ticket Details</h3>
                            <p className="ship-modal-subtitle">{selectedTicket.ticketNo}</p>
                            <button className="ship-modal-close" onClick={() => setSelectedTicket(null)}>
                                <FiX />
                            </button>
                        </div>

                        <div className="ship-modal-body" style={{ maxHeight: '500px', overflow: 'auto' }}>
                            {/* tickets信息 */}
                            <div className="ticket-info-grid">
                                <div className="info-item">
                                    <label>User Email</label>
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
                                                title="View ticket history"
                                            >
                                                📋 History
                                            </button>
                                        </div>
                                    ) : (
                                        <span>-</span>
                                    )}
                                </div>
                                <div className="info-item">
                                    <label>Issue Type</label>
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
                                    <label>Ticket Subject</label>
                                    <span>{selectedTicket.subject}</span>
                                </div>
                                {selectedTicket.orderNo && (
                                    <div className="info-item">
                                        <label>Related Order</label>
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
                                    <label>Current Status</label>
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
                                                    if (confirm('Close this ticket? User can reopen within 24 hours.')) {
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
                                                Close Ticket
                                            </button>
                                        )}
                                    </div>
                                </div>
                                {selectedTicket.status !== 'CLOSED' && selectedTicket.status !== 'PENDING_SUPER_ADMIN' && (
                                    <div className="info-item">
                                        <label>Escalate</label>
                                        <button
                                            type="button"
                                            className="ticket-super-admin-button"
                                            onClick={handleSubmitToSuperAdmin}
                                        >
                                            <FiShield />
                                            Escalate to Super Admin
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* 消息列表 */}
                            <div className="ticket-messages">
                                <h4>Conversation</h4>
                                <div className="messages-container">
                                    {selectedTicket.messages?.map(msg => (
                                        <div
                                            key={msg.id}
                                            className={`message-item ${msg.isAdmin ? 'admin' : 'user'}`}
                                        >
                                            <div className="message-header">
                                                <span className="message-sender">
                                                    {msg.isAdmin ? 'Support' : 'User'}
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
                                    <h4>Reply</h4>
                                    <textarea
                                        value={replyContent}
                                        onChange={(e) => setReplyContent(e.target.value)}
                                        placeholder="Type your reply..."
                                        className="reply-textarea"
                                    />
                                    <div className="reply-actions">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                                            <label style={{ cursor: 'pointer', padding: '6px 12px', border: '1px solid var(--border-color)', borderRadius: 6, fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <FiImage size={14} />
                                                {uploadingImg ? 'Uploading...' : 'Add Image'}
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
                                            {replying ? 'Sending...' : 'Send Reply'}
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
                                            {canReopen ? `Ticket closed (${hoursLeft}h, can reopen)` : 'Ticket closed for over 24 hours'}
                                        </span>
                                        {canReopen && (
                                            <button className="btn btn-secondary" onClick={() => handleUpdateStatus('OPEN')}>
                                                Reopen
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
                            <h3>User Ticket History</h3>
                            <button className="ship-modal-close" onClick={() => setShowHistoryModal(false)}><FiX /></button>
                        </div>
                        <div className="ship-modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                            {historyLoading ? (
                                <p style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Loading...</p>
                            ) : historyTickets.length === 0 ? (
                                <p style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No ticket history for this user</p>
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
                                                        {isCurrent && <span style={{ fontSize: '0.7rem', padding: '2px 8px', background: 'var(--primary)', color: '#fff', borderRadius: 10 }}>Current</span>}
                                                    </div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                        {t.ticketNo} · {lastMsg?.content?.slice(0, 40) || 'No messages'}
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

// 卡密管理
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
            showToast('Failed to load keys', 'error')
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
            showToast('Please select a product first', 'error')
            return
        }
        // 检查Product是否有Variant，有则必须选择
        const selectedProduct = products.find(p => p.id === selectedProductId)
        if (selectedProduct?.variants?.length > 0 && !selectedVariantId) {
            showToast('Select variant', 'error')
            return
        }
        if (!importText.trim()) {
            showToast('Enter card key content', 'error')
            return
        }

        const cardsArray = importMode === 'single'
            ? [importText.trim()]
            : importText.split('\n').map(c => c.trim()).filter(c => c)
        if (cardsArray.length === 0) {
            showToast('No valid keys', 'error')
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
            showToast('Import failed', 'error')
        }
    }

    // Delete单个卡密
    const handleDelete = async (id) => {
        if (!confirm('Delete this key?')) return

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
            showToast('DeleteFailed', 'error')
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
            showToast('Key content cannot be empty', 'error')
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
            showToast('SaveFailed', 'error')
        }
    }

    // 批量Delete
    const handleBatchDelete = async () => {
        if (selectedCards.length === 0) {
            showToast('Please select keys to delete', 'error')
            return
        }
        if (!confirm(`Delete selected  ${selectedCards.length}key(s)？`)) return

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
            showToast('DeleteFailed', 'error')
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
            case 'AVAILABLE': return <span className="badge badge-success">Available</span>
            case 'SOLD': return <span className="badge badge-warning">Sold</span>
            case 'EXPIRED': return <span className="badge badge-danger">Expired</span>
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
                            Delete Selected ({selectedCards.length})
                        </button>
                    )}
                    <button
                        className="btn btn-primary"
                        onClick={() => { setShowImportModal(true); setImportText(''); setImportMode('batch') }}
                    >
                        + Import Keys
                    </button>
                </div>
            </div>

            <div className="cards-stats-grid">
                <div className="cards-stat-card total">
                    <div className="cards-stat-label">Total Keys</div>
                    <div className="cards-stat-value">{cardStats.total}</div>
                </div>
                <div className="cards-stat-card available">
                    <div className="cards-stat-label">Available</div>
                    <div className="cards-stat-value">{cardStats.available}</div>
                </div>
                <div className="cards-stat-card sold">
                    <div className="cards-stat-label">Used</div>
                    <div className="cards-stat-value">{cardStats.sold}</div>
                </div>
                <div className="cards-stat-card expired">
                    <div className="cards-stat-label">Expired</div>
                    <div className="cards-stat-value">{cardStats.expired}</div>
                </div>
            </div>

            {/* 筛选栏 */}
            <div className="filter-bar">
                <div className="filter-group">
                    <label>Select Product</label>
                    <select
                        value={selectedProductId}
                        onChange={(e) => {
                            setSelectedProductId(e.target.value)
                            setSelectedVariantFilter('')
                            setPage(1)
                            setSelectedCards([])
                        }}
                    >
                        <option value="">All Products</option>
                        {products.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                </div>
                <div className="filter-group">
                    <label>Variant</label>
                    <select
                        value={selectedVariantFilter}
                        onChange={(e) => { setSelectedVariantFilter(e.target.value); setPage(1); }}
                        disabled={!selectedProductId}
                    >
                        <option value="">All Variants</option>
                        <option value="default">Default Variant</option>
                        {productVariants.map(v => (
                            <option key={v.id} value={v.id}>{v.name}</option>
                        ))}
                    </select>
                </div>
                <div className="filter-group">
                    <label>Status</label>
                    <select
                        value={statusFilter}
                        onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                    >
                        <option value="">All Status</option>
                        <option value="AVAILABLE">Available</option>
                        <option value="SOLD">Sold</option>
                        <option value="EXPIRED">Expired</option>
                    </select>
                </div>
                <div className="filter-group">
                    <label>Search</label>
                    <input
                        type="text"
                        className="filter-search-input"
                        placeholder="Card Key Content / Order No."
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
                    Total {total} records
                </div>
            </div>

            {/* 卡密列表 */}
            {loading ? (
                <div className="loading-state">Loading...</div>
            ) : cards.length === 0 ? (
                <div className="placeholder-content">
                    <FiCreditCard />
                    <p>{selectedProductId ? 'No keys for this product' : 'Select a product to manage its keys'}</p>
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
                                    <th>Card Key Content</th>
                                    <th>Product</th>
                                    <th>Variant</th>
                                    <th>Status</th>
                                    <th>Order No.</th>
                                    <th>Created</th>
                                    <th>Actions</th>
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
                                                        Edit
                                                    </button>
                                                    {isSuperAdmin && (
                                                        <button
                                                            className="btn btn-sm btn-danger"
                                                            onClick={() => handleDelete(card.id)}
                                                        >
                                                            Delete
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
                                Prev
                            </button>
                            <span>Page {page} / {totalPages} </span>
                            <button
                                disabled={page === totalPages}
                                onClick={() => setPage(p => p + 1)}
                            >
                                Next
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
                            <h3>{importMode === 'single' ? 'Add Key' : 'Batch Import Keys'}</h3>
                            <button className="modal-close" onClick={() => setShowImportModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            {/* 输入模式切换 */}
                            <div className="import-mode-toggle">
                                <button
                                    className={`mode-btn ${importMode === 'single' ? 'active' : ''}`}
                                    onClick={() => { setImportMode('single'); setImportText('') }}
                                >
                                    Single
                                </button>
                                <button
                                    className={`mode-btn ${importMode === 'batch' ? 'active' : ''}`}
                                    onClick={() => { setImportMode('batch'); setImportText('') }}
                                >
                                    Batch
                                </button>
                            </div>
                            <div className="form-group">
                                <label>Target Product</label>
                                <select
                                    value={selectedProductId}
                                    onChange={(e) => {
                                        setSelectedProductId(e.target.value)
                                        setSelectedVariantId('')
                                    }}
                                >
                                    <option value="">Select product</option>
                                    {products.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>
                            {/* Variant选择 - 当Product有Variant时必须选择 */}
                            {selectedProductId && products.find(p => p.id === selectedProductId)?.variants?.length > 0 && (
                                <div className="form-group">
                                    <label>Target Variant <span className="required">*</span></label>
                                    <select
                                        value={selectedVariantId}
                                        onChange={(e) => setSelectedVariantId(e.target.value)}
                                    >
                                        <option value="">Select variant</option>
                                        <option value="default">Default ({formatMoney(products.find(p => p.id === selectedProductId)?.price)})</option>
                                        {products.find(p => p.id === selectedProductId)?.variants?.map(v => (
                                            <option key={v.id} value={v.id}>{v.name} ({formatMoney(v.price)})</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            <div className="form-group">
                                <>
                                    <label>
                                        Card Key Content{' '}
                                        <span className="hint">
                                            {importMode === 'single' ? '(line breaks are part of one key)' : '(One key per line)'}
                                        </span>
                                    </label>
                                    <textarea
                                        className="card-import-textarea"
                                        value={importText}
                                        onChange={(e) => setImportText(e.target.value)}
                                        placeholder={importMode === 'single'
                                            ? 'Enter card key content (multi-line)..'
                                            : 'Enter keys, one per line\ne.g.\nABC123-DEF456\nXYZ789-GHI012'
                                        }
                                    />
                                </>
                            </div>
                            <div className="import-preview">
                                {importMode === 'single'
                                    ? (importText.trim() ? 'Will import: 1 key' : 'Will import: 0 keys')
                                    : `Will import: ${importText.split('\n').filter(c => c.trim()).length}key(s)`
                                }
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowImportModal(false)}>{L('admin.common.cancel')}</button>
                            <button className="btn btn-primary" onClick={handleImport}>Confirm Import</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit弹窗 */}
            {editingCard && (
                <div className="modal-overlay" onClick={() => setEditingCard(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Edit Key</h3>
                            <button className="modal-close" onClick={() => setEditingCard(null)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label>Card Key Content</label>
                                <textarea
                                    value={editContent}
                                    onChange={(e) => setEditContent(e.target.value)}
                                    rows={5}
                                    placeholder="Enter card key content"
                                />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setEditingCard(null)}>{L('admin.common.cancel')}</button>
                            <button className="btn btn-primary" onClick={handleSaveEdit}>Save</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

// Customers
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
            showToast('Failed to load users', 'error')
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
                showToast('Role updated', 'success')
                doFetch(currentPageRef.current, searchTermRef.current, roleFilterRef.current)
            } else {
                const data = await res.json()
                showToast(data.error || 'Role update failed', 'error')
            }
        } catch {
            showToast('Operation failed', 'error')
        }
    }

    const handleCreateAdmin = async (e) => {
        e.preventDefault()
        if (!newAdmin.email || !newAdmin.password) {
            showToast('Please enter email and password', 'error')
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
                showToast('Sub-admin created', 'success')
                setShowCreateAdmin(false)
                setNewAdmin({ email: '', password: '', username: '', role: 'ADMIN' })
                doFetch(currentPageRef.current, searchTermRef.current, roleFilterRef.current)
            } else {
                showToast(data.error || 'Creation failed', 'error')
            }
        } catch {
            showToast('Creation failed', 'error')
        } finally {
            setCreating(false)
        }
    }

    const handleDeleteAdmin = (userId, username) => {
        showConfirm('Remove Admin', `Are you sure you want to remove ${username}from admin? The account will be downgraded to regular user.`, async () => {
            try {
                const res = await fetch(`/api/admin/admins/${userId}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                })
                const data = await res.json()
                if (res.ok) {
                    showToast('Admin removed', 'success')
                    doFetch(currentPageRef.current, searchTermRef.current, roleFilterRef.current)
                } else {
                    showToast(data.error || 'Operation failed', 'error')
                }
            } catch {
                showToast('Operation failed', 'error')
            }
        })
    }

    const getRoleLabel = (role) => {
        switch (role) {
            case 'SUPER_ADMIN': return 'Super Admin'
            case 'TENANT_ADMIN': return 'Store Owner'
            case 'ADMIN': return 'Admin'
            case 'AGENT': return 'Agent'
            case 'CUSTOMER': return 'Customer'
            default: return 'User'
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
                        <div className="users-header-card-label">Total Users</div>
                    </div>
                </div>
                <div className="users-header-card">
                    <div className="users-header-card-icon admin">
                        <FiShield size={20} />
                    </div>
                    <div>
                        <div className="users-header-card-value">{adminCount}</div>
                        <div className="users-header-card-label">Admins</div>
                    </div>
                </div>
                <div className="users-header-card">
                    <div className="users-header-card-icon normal">
                        <FiUser size={20} />
                    </div>
                    <div>
                        <div className="users-header-card-value">{totalUsers - adminCount}</div>
                        <div className="users-header-card-label">Users</div>
                    </div>
                </div>
                {isSuperAdmin && (
                    <div className="users-header-card users-header-card-action" onClick={() => setShowCreateAdmin(true)}>
                        <div className="users-header-card-icon add">
                            <FiShield size={20} />
                        </div>
                        <div>
                            <div className="users-header-card-value" style={{ fontSize: '0.95rem' }}>+ Add</div>
                            <div className="users-header-card-label">Sub-Admins</div>
                        </div>
                    </div>
                )}
            </div>

            {/* Add Sub-Admin弹窗 */}
            {showCreateAdmin && (
                <div className="confirm-overlay" onClick={() => setShowCreateAdmin(false)}>
                    <div className="confirm-dialog" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
                        <h3 className="confirm-title" style={{ marginTop: 0 }}>Add Sub-Admin</h3>
                        <form onSubmit={handleCreateAdmin}>
                            <div className="form-group">
                                <label>Email *</label>
                                <input type="email" className="form-input" required value={newAdmin.email} onChange={e => setNewAdmin(p => ({ ...p, email: e.target.value }))} placeholder="admin@example.com" />
                            </div>
                            <div className="form-group">
                                <label>Password *</label>
                                <input type="password" className="form-input" required minLength={6} value={newAdmin.password} onChange={e => setNewAdmin(p => ({ ...p, password: e.target.value }))} placeholder="Min 6 chars" />
                            </div>
                            <div className="form-group">
                                <label>Username</label>
                                <input type="text" className="form-input" value={newAdmin.username} onChange={e => setNewAdmin(p => ({ ...p, username: e.target.value }))} placeholder="Optional" />
                            </div>
                            <div className="confirm-actions">
                                <button type="button" className="btn btn-cancel" onClick={() => setShowCreateAdmin(false)}>{L('admin.common.cancel')}</button>
                                <button type="submit" className="btn btn-primary" disabled={creating}>{creating ? 'Creating...' : 'Create'}</button>
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
                        placeholder="Search email or username..."
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                    />
                    {searching && <span className="users-search-spinner" />}
                    {searchInput && !searching && (
                        <button className="users-search-clear" onClick={() => setSearchInput('')}>×</button>
                    )}
                </div>
                <div className="users-role-tabs">
                    {[['all', 'All'], ['CUSTOMER', 'Customer'], ['ADMIN', 'Admin'], ['TENANT_ADMIN', 'Owner']].map(([val, label]) => (
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
                    {searchInput ? `Found ${totalUsers}results` : `Total ${totalUsers} users`}
                </div>
            </div>

            {/* User列表 */}
            <div className={`users-table-wrapper${searching ? ' users-table-searching' : ''}`}>
                {users.length === 0 ? (
                    <div className="users-empty">
                        <FiUsers size={40} />
                        <p>{searchInput ? `No results for ${searchInput}matching users` : 'No customers'}</p>
                        {searchInput && (
                            <button className="btn btn-secondary btn-sm" onClick={() => setSearchInput('')}>Clear Search</button>
                        )}
                    </div>
                ) : (
                    <table className="admin-table users-table">
                        <thead>
                            <tr>
                                <th>User</th>
                                <th>Role</th>
                                {agentEnabled && <th>Source</th>}
                                <th>Orders</th>
                                <th>Registered</th>
                                <th>Actions</th>
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
                                                <span className="user-name-cell">{user.username || 'Not set'}</span>
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
                                                <option value="USER">Users</option>
                                                <option value="ADMIN">Admins</option>
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
                                                <span style={{ fontSize: '0.78rem', color: '#D1D5DB' }}>Main Site</span>
                                            )}
                                        </td>
                                    )}
                                    <td>{user._count?.orders || 0}</td>
                                    <td className="time">{new Date(user.createdAt).toLocaleDateString('zh-CN')}</td>
                                    <td className="actions">
                                        <button className="action-btn edit" onClick={() => navigate(`${basePath}/orders?userId=${user.id}`)}>View Orders</button>
                                        {isSuperAdmin && user.role === 'ADMIN' && (
                                            <button className="action-btn delete" onClick={() => handleDeleteAdmin(user.id, user.username || user.email)}>Remove Admin</button>
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
                    <button disabled={currentPage <= 1} onClick={() => setCurrentPage(p => p - 1)}>← Prev</button>
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
                    <button disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)}>Next →</button>
                    <span style={{ marginLeft: '8px', fontSize: '0.85rem', color: '#94a3b8' }}>Page {currentPage}/{totalPages} </span>
                </div>
            )}
        </div>
    )
}

// 系统设置
// 系统设置
// Database Backup设置子组件
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
                showToast(`Backup complete: ${data.filename} (${data.sizeMB} MB)`, 'success')
                loadBackupStatus()
            } else {
                showToast(`Backup failed: ${data.error}`, 'error')
            }
        } catch (e) {
            showToast('Backup request failed', 'error')
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
                showToast('Backup plan updated', 'success')
                loadBackupStatus()
            }
        } catch (e) {
            showToast('Update backup plan failed', 'error')
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
                showToast(data.error || 'DownloadFailed', 'error')
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
            showToast('Backup download started', 'success')
        } catch (e) {
            showToast('Download request failed', 'error')
        }
    }

    return (
        <div className="settings-section">
            <h3>Database Backup</h3>



            {/* 配置与Actions区 - 双栏布局 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                {/* 左栏：Backup Config */}
                <div style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.95), rgba(248,250,252,0.95))', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
                    <h4 style={{ margin: '0 0 24px', fontSize: '1rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ width: '34px', height: '34px', background: 'linear-gradient(135deg, #059669, #10b981)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>⚙️</span>
                        Backup Config
                    </h4>

                    {/* Enable开关 */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 18px', background: settings.backupEnabled ? 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(5,150,105,0.04))' : 'rgba(248,250,252,0.8)', borderRadius: '14px', border: `1px solid ${settings.backupEnabled ? 'rgba(16,185,129,0.25)' : '#e2e8f0'}`, marginBottom: '16px', transition: 'all 0.2s' }}>
                        <div>
                            <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#1e293b' }}>💾 Enable Auto Backup</div>
                            <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '3px' }}>Scheduled automatic MySQL database backup</div>
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
                                <div style={{ fontWeight: 600, fontSize: '0.82rem', color: '#475569', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>🕐 Backup Frequency</div>
                                <select
                                    value={settings.backupFrequency}
                                    onChange={(e) => handleChange('backupFrequency', parseInt(e.target.value))}
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', background: 'white', fontSize: '0.88rem', color: '#334155', outline: 'none', cursor: 'pointer', appearance: 'auto' }}
                                >
                                    <option value={1}>Once daily (3 AM)</option>
                                    <option value={2}>Twice daily (every 12h)</option>
                                    <option value={4}>4 times daily (every 6h)</option>
                                    <option value={6}>6 times daily (every 4h)</option>
                                    <option value={12}>12 times daily (every 2h)</option>
                                    <option value={24}>24 times daily (hourly)</option>
                                </select>
                            </div>

                            {/* 保留天数 */}
                            <div style={{ padding: '14px 18px', background: 'rgba(248,250,252,0.8)', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                                <div style={{ fontWeight: 600, fontSize: '0.82rem', color: '#475569', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>📅 Retention Days</div>
                                <select
                                    value={settings.backupRetentionDays}
                                    onChange={(e) => handleChange('backupRetentionDays', parseInt(e.target.value))}
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', background: 'white', fontSize: '0.88rem', color: '#334155', outline: 'none', cursor: 'pointer', appearance: 'auto' }}
                                >
                                    <option value={3}>3 days</option>
                                    <option value={7}>7 days</option>
                                    <option value={14}>14 days</option>
                                    <option value={30}>30 days</option>
                                    <option value={60}>60 days</option>
                                    <option value={90}>90 days</option>
                                </select>
                                <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '6px' }}>Backups older than retention period will be auto-deleted</div>
                            </div>

                            {/* Email Notification */}
                            <div style={{ padding: '14px 18px', background: settings.backupEmailEnabled ? 'linear-gradient(135deg, rgba(59,130,246,0.06), rgba(37,99,235,0.03))' : 'rgba(248,250,252,0.8)', borderRadius: '14px', border: `1px solid ${settings.backupEmailEnabled ? 'rgba(59,130,246,0.2)' : '#e2e8f0'}`, transition: 'all 0.2s' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: '0.82rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>📧 Email Notification</div>
                                        <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>Send notification after backup (with SQL file)</div>
                                    </div>
                                    <label className="toggle-switch">
                                        <input type="checkbox" checked={settings.backupEmailEnabled} onChange={(e) => handleChange('backupEmailEnabled', e.target.checked)} />
                                        <span className="toggle-slider"></span>
                                    </label>
                                </div>

                                {settings.backupEmailEnabled && (
                                    <div style={{ marginTop: '12px' }}>
                                        <div style={{ fontWeight: 500, fontSize: '0.78rem', color: '#64748b', marginBottom: '6px' }}>Recipient Email</div>
                                        <input
                                            type="email"
                                            value={settings.backupEmail}
                                            onChange={(e) => handleChange('backupEmail', e.target.value)}
                                            placeholder="admin@example.com"
                                            style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', background: 'white', fontSize: '0.88rem', color: '#334155', outline: 'none', boxSizing: 'border-box' }}
                                        />
                                        <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '5px' }}>≤25MB sent as attachment; larger files notify only</div>
                                    </div>
                                )}
                            </div>

                            {/* 应用按钮 */}
                            <button
                                onClick={handleRestartSchedule}
                                style={{ marginTop: '4px', width: '100%', padding: '13px', borderRadius: '12px', fontSize: '0.9rem', background: 'linear-gradient(135deg, #059669, #10b981)', border: 'none', cursor: 'pointer', color: 'white', fontWeight: 600, boxShadow: '0 4px 12px rgba(16,185,129,0.3)', transition: 'all 0.2s', letterSpacing: '0.3px' }}
                            >
                                🔄 Save & Apply Backup Plan
                            </button>
                        </div>
                    )}
                </div>

                {/* 右栏：备份Status与文件 */}
                <div style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.95), rgba(248,250,252,0.95))', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column' }}>
                    <h4 style={{ margin: '0 0 20px', fontSize: '1rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ width: '32px', height: '32px', background: 'linear-gradient(135deg, #2563eb, #3b82f6)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>📋</span>
                        Backup History
                    </h4>

                    {backupStatus ? (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                            {/* 最近备份信息 */}
                            {backupStatus.lastBackup?.time && (
                                <div style={{ background: backupStatus.lastBackup.status === 'success' ? 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(5,150,105,0.05))' : 'linear-gradient(135deg, rgba(239,68,68,0.08), rgba(220,38,38,0.05))', borderRadius: '12px', padding: '14px 16px', marginBottom: '16px', border: `1px solid ${backupStatus.lastBackup.status === 'success' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}` }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: backupStatus.lastBackup.status === 'success' ? '#059669' : '#dc2626' }}>
                                            {backupStatus.lastBackup.status === 'success' ? '✅ Last backup successful' : '❌ Last backup failed'}
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
                                        Backup Files
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
                                                    title="Click to download backup"
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
                                    <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>No backup files</div>
                                    <div style={{ fontSize: '0.8rem', marginTop: '4px' }}>Enable auto-backup or run a manual backup</div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>
                            Loading...
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
                        {running ? '⏳ Backing up database...' : '🚀 Run Backup Now'}
                    </button>
                </div>
            </div>
        </div>
    )
}

// ==================== Agents ====================
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
        } catch { showToast('Load failed', 'error') }
        setLoading(false)
    }

    const fetchWithdrawals = async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/admin/withdrawals', { headers: { 'Authorization': `Bearer ${token}` } })
            const data = await res.json()
            setWithdrawals(data.withdrawals || [])
        } catch { showToast('Load failed', 'error') }
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
        const label = { ACTIVE: 'Approve', SUSPENDED: 'Suspend', REJECTED: 'Reject' }[status]
        showConfirm('Confirm Action', `确定要${label}该Agent吗？`, async () => {
            try {
                await fetch(`/api/admin/agents/${id}/status`, {
                    method: 'PUT',
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status })
                })
                showToast(`Agent已${label}`, 'success')
                fetchAgents()
            } catch { showToast('Operation failed', 'error') }
        })
    }

    const processWithdrawal = async (id, status) => {
        const label = status === 'APPROVED' ? 'Approve' : 'Reject'
        showConfirm('Confirm Action', `确定要${label}该提现申请吗？`, async () => {
            try {
                await fetch(`/api/admin/withdrawals/${id}`, {
                    method: 'PUT',
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status })
                })
                showToast(`提现已${label}`, 'success')
                fetchWithdrawals()
            } catch { showToast('Operation failed', 'error') }
        })
    }

    const saveSkinPool = async () => {
        try {
            await fetch('/api/admin/settings', {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ agentSkinPool: JSON.stringify(skinPool) })
            })
            showToast('Skin pool saved', 'success')
        } catch { showToast('SaveFailed', 'error') }
    }

    const allSkins = [
        { id: 'zen', name: 'Zen Minimal', desc: 'Minimal style, ideal for single products' },
        { id: 'fresh', name: 'Fresh Clean', desc: 'Sidebar layout, ideal for multiple categories' },
        { id: 'classic', name: 'Classic', desc: 'Traditional navbar, full-featured' }
    ]

    const statusLabel = { PENDING: 'Pending Review', ACTIVE: 'Active', SUSPENDED: 'Suspended', REJECTED: 'Rejected' }
    const statusColor = { PENDING: '#F59E0B', ACTIVE: '#10B981', SUSPENDED: '#EF4444', REJECTED: '#6B7280' }
    const wStatusLabel = { PENDING: 'Pending', APPROVED: 'Approved', REJECTED: 'Rejected' }
    const wStatusColor = { PENDING: '#F59E0B', APPROVED: '#10B981', REJECTED: '#EF4444' }

    return (
        <div className="admin-page">
            <div className="page-header">
                <h2>Agents</h2>
            </div>

            <div className="settings-tabs" style={{ marginBottom: 20 }}>
                <button className={`tab-btn ${tab === 'agents' ? 'active' : ''}`} onClick={() => setTab('agents')}>Agent List</button>
                <button className={`tab-btn ${tab === 'withdrawals' ? 'active' : ''}`} onClick={() => setTab('withdrawals')}>Withdrawals</button>
                <button className={`tab-btn ${tab === 'skinPool' ? 'active' : ''}`} onClick={() => setTab('skinPool')}>Skin Pool</button>
            </div>

            {tab === 'agents' && (
                <div className="data-table-wrapper">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Shop Name</th>
                                <th>Shop Path</th>
                                <th>User</th>
                                <th>Products</th>
                                <th>Orders</th>
                                <th>Balance</th>
                                <th>Total Earnings</th>
                                <th>Status</th>
                                <th>Applied</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={10} style={{ textAlign: 'center', padding: 40 }}>Loading...</td></tr>
                            ) : agents.length === 0 ? (
                                <tr><td colSpan={10} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No agents</td></tr>
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
                                                    <button className="btn-sm btn-primary" onClick={() => updateAgentStatus(a.id, 'ACTIVE')}>Approve</button>
                                                    <button className="btn-sm btn-danger" onClick={() => updateAgentStatus(a.id, 'REJECTED')}>Reject</button>
                                                </>
                                            )}
                                            {a.status === 'ACTIVE' && (
                                                <button className="btn-sm btn-warning" onClick={() => updateAgentStatus(a.id, 'SUSPENDED')}>Suspend</button>
                                            )}
                                            {a.status === 'SUSPENDED' && (
                                                <button className="btn-sm btn-primary" onClick={() => updateAgentStatus(a.id, 'ACTIVE')}>Reactivate</button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                                {expandedAgent === a.id && (
                                    <tr>
                                        <td colSpan={10} style={{ background: 'var(--bg-secondary)', padding: '16px 20px' }}>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
                                                <div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 2 }}>Notification Email</div>
                                                    <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>{a.contactEmail || 'Not provided'}</div>
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 2 }}>Contact</div>
                                                    <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>{a.contactInfo || 'Not provided'}</div>
                                                </div>
                                                <div style={{ gridColumn: '1 / -1' }}>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 2 }}>Application Note</div>
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
                                <th>Agent</th>
                                <th>Amount</th>
                                <th>Method</th>
                                <th>Account</th>
                                <th>Status</th>
                                <th>Applied</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40 }}>Loading...</td></tr>
                            ) : withdrawals.length === 0 ? (
                                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No withdrawal requests</td></tr>
                            ) : withdrawals.map(w => (
                                <tr key={w.id}>
                                    <td style={{ fontWeight: 600 }}>{w.agentName}</td>
                                    <td style={{ fontWeight: 700, color: '#EF4444' }}>{formatMoney(w.amount)}</td>
                                    <td>{w.method === 'alipay' ? 'Alipay' : w.method === 'wechat' ? 'WeChat' : 'Bank Card'}</td>
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
                                                <button className="btn-sm btn-primary" onClick={() => processWithdrawal(w.id, 'APPROVED')}>Approve</button>
                                                <button className="btn-sm btn-danger" onClick={() => processWithdrawal(w.id, 'REJECTED')}>Reject</button>
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
                        Select skins available for agents
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
                                        if (skinPool.length <= 1) return showToast('At least one skin must be selected', 'error')
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
                        SaveSkin Pool
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
            if (!res.ok || !data.success) { setLogs([data.error || 'Application failed']); setStep('error'); return }
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
        }).catch(e => { setLogs(prev => [...prev, 'Connection error：' + e.message]); setStep('error') })
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
                {hasCert ? '🔒 Renew Certificate' : '🔐 Apply for Wildcard Certificate'}
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
                                <div style={{ fontWeight: 700, fontSize: '1rem' }}>🔐 Apply for Wildcard SSL Certificate</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
                                    Domain: <code style={{ color: '#4F46E5' }}>*.{domain}</code>
                                    {certStatus?.expireDate && <span style={{ marginLeft: 8, color: '#10B981' }}>· Current cert expires: {certStatus.expireDate}</span>}
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
                                            ⚠️ acme.sh not detected, will be auto-installed.
                                        </div>
                                    )}
                                    <div style={{ fontSize: '0.88rem', lineHeight: 1.8, color: 'var(--text-secondary)' }}>
                                        <p>This wizard will use <strong>Let's Encrypt</strong> for <code>*.{domain}</code> to apply for a free SSL certificate:</p>
                                        <ol style={{ paddingLeft: 20, marginTop: 8 }}>
                                            <li>点击"开始申请"，系统生成 <strong>DNS TXT 验证记录</strong></li>
                                            <li>在 DNS 面板（如 Cloudflare）Add该 TXT 记录</li>
                                            <li>等待 DNS 生效（约 5 min），点击"验证并颁发"</li>
                                            <li>证书自动安装到 <code>/etc/nginx/ssl/fullchain.pem</code></li>
                                        </ol>
                                        <div style={{ marginTop: 12, padding: '8px 12px', borderRadius: 6, background: 'rgba(79,70,229,0.08)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                            💡 申请前请确保 <code>*.{domain}</code> 和 <code>{domain}</code> 的 DNS A 记录已指向本服务器
                                        </div>
                                    </div>
                                    <button onClick={handleStep1} style={{ marginTop: 20, width: '100%', padding: '12px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', color: '#fff', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}>
                                        🚀 Start
                                    </button>
                                </div>
                            )}

                            {step === 'step1-loading' && (
                                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                                    <div style={{ fontSize: '2rem', marginBottom: 12 }}>⏳</div>
                                    <div>Generating DNS verification records...</div>
                                </div>
                            )}

                            {step === 'step1-done' && records.length > 0 && (
                                <div>
                                    <div style={{ padding: '12px 16px', borderRadius: 10, marginBottom: 20, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', color: '#10B981', fontSize: '0.85rem', fontWeight: 600 }}>
                                        ✅ 第一步完成！请在 DNS 面板Add以下 TXT 记录，然后点击下方按钮继续
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
                                                    <button onClick={() => navigator.clipboard.writeText(r.value)} style={{ flexShrink: 0, padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', cursor: 'pointer', fontSize: '0.78rem', color: 'var(--text-muted)' }}>Copy</button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    <div style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 16, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', color: '#D97706', fontSize: '0.8rem' }}>
                                        ⏱️ Add完 DNS 记录后请等待 5~10 min让其生效，再点击下方按钮
                                    </div>
                                    <button onClick={handleStep2} style={{ width: '100%', padding: '12px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #10B981, #059669)', color: '#fff', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}>
                                        ✅ 我已Add TXT 记录，开始验证并颁发证书
                                    </button>
                                </div>
                            )}

                            {(step === 'step2-loading' || step === 'step2-done' || step === 'error') && (
                                <div>
                                    <div style={{ background: '#0f0f0f', borderRadius: 10, padding: 16, fontFamily: 'monospace', fontSize: '0.78rem', lineHeight: 1.6, color: '#d4d4d4', minHeight: 200, maxHeight: 360, overflowY: 'auto' }}>
                                        {logs.map((log, i) => (
                                            <div key={i} style={{ color: log.startsWith('✅') || log.startsWith('🎉') ? '#4ade80' : log.includes('Failed') || log.includes('error') ? '#f87171' : '#d4d4d4' }}>{log}</div>
                                        ))}
                                        {step === 'step2-loading' && <div style={{ color: '#60a5fa' }}>▋ Processing...</div>}
                                        <div ref={logsEndRef} />
                                    </div>
                                    {step === 'step2-done' && (
                                        <div style={{ marginTop: 16, padding: '12px 16px', borderRadius: 10, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', color: '#10B981', fontSize: '0.88rem', fontWeight: 600, textAlign: 'center' }}>
                                            🎉 泛域名证书申请Success！nginx 已自动重载。
                                        </div>
                                    )}
                                    {step === 'error' && (
                                        <button onClick={() => { setStep('idle'); setLogs([]) }} style={{ marginTop: 12, width: '100%', padding: '10px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'transparent', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>↩ Start Over</button>
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
        else showToast(d.error || 'Operation failed', 'error')
    }

    const statusLabel = { PENDING: '待配置', REVIEWING: '审核中', ACTIVE: '运营中', SUSPENDED: 'Suspended', REJECTED: 'Rejected' }
    const statusColor = { PENDING: '#F59E0B', REVIEWING: '#60A5FA', ACTIVE: '#10B981', SUSPENDED: '#EF4444', REJECTED: '#EF4444' }

    return (
        <div className="admin-section">
            <div className="section-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
                <h2>🏪 Tenant Management</h2>
                <div style={{ display:'flex', gap:8 }}>
                    {[['','All'],['REVIEWING','审核中'],['ACTIVE','运营中'],['PENDING','待配置'],['SUSPENDED','Suspended']].map(([v,l]) => (
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
                                ['Shop Name', selected.shopName],
                                ['Path', `/t/${selected.shopSlug}`],
                                ['User Email', selected.user?.email],
                                ['Domain', selected.domains?.[0]?.domain || 'Not bound'],
                                ['DNS Verified', selected.domains?.[0]?.dnsVerified ? '✅ Verified' : '❌ Not verified'],
                                ['Product/订单', `${selected._count?.products||0} / ${selected._count?.orders||0}`],
                                ['Applied', new Date(selected.createdAt).toLocaleString()],
                                ['Current Status', statusLabel[selected.status]]
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
                                    ✅ Approve
                                </button>
                                <input style={{flex:1,padding:'8px 12px',borderRadius:8,border:'1px solid var(--border-color)',background:'var(--bg-primary)',color:'var(--text-primary)',fontSize:'0.84rem'}}
                                    value={rejectReason} onChange={e=>setRejectReason(e.target.value)} placeholder="Reject原因（Optional）" />
                                <button className="btn btn-danger" disabled={actionLoading}
                                    onClick={()=>doAction(selected.id,'reject',{reason:rejectReason})}>
                                    ❌ Reject
                                </button>
                            </>)}
                            {selected.status === 'ACTIVE' && (
                                <button className="btn btn-warning" disabled={actionLoading}
                                    onClick={()=>showConfirm('Suspend商城',`确定Suspend ${selected.shopName}？`,()=>doAction(selected.id,'suspend'))}>
                                    ⏸ Suspend
                                </button>
                            )}
                            {selected.status === 'SUSPENDED' && (
                                <button className="btn btn-success" disabled={actionLoading}
                                    onClick={()=>doAction(selected.id,'reactivate')}>
                                    ▶ Reactivate
                                </button>
                            )}
                            <button className="btn" onClick={()=>setSelected(null)} style={{marginLeft:'auto'}}>Close</button>
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
                            <th>Shop Name</th><th>User</th><th>Domain</th>
                            <th>DNS</th><th>Product/订单</th><th>Status</th><th>Applied</th><th>Actions</th>
                        </tr></thead>
                        <tbody>
                            {tenants.length === 0 ? (
                                <tr><td colSpan={8} style={{textAlign:'center',padding:40,color:'var(--text-muted)'}}>No tenants</td></tr>
                            ) : tenants.map(t => (
                                <tr key={t.id}>
                                    <td>
                                        <div style={{fontWeight:600}}>{t.shopName}</div>
                                        <div style={{fontSize:'0.75rem',color:'var(--text-muted)'}}>/t/{t.shopSlug}</div>
                                    </td>
                                    <td style={{fontSize:'0.82rem'}}>{t.user?.email}</td>
                                    <td style={{fontSize:'0.82rem'}}>{t.domains?.[0]?.domain || <span style={{color:'var(--text-muted)'}}>Not bound</span>}</td>
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
                    <button className="btn" onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}>Prev</button>
                    <span style={{padding:'8px 14px',color:'var(--text-muted)',fontSize:'0.84rem'}}>{page} / {Math.ceil(total/20)}</span>
                    <button className="btn" onClick={()=>setPage(p=>p+1)} disabled={page>=Math.ceil(total/20)}>Next</button>
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

    // 默认设置
    const [settings, setSettings] = useState({
        // 基本设置
        siteName: 'HaoDongXi',
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
        stockMode: 'auto', // 'auto' = 库存=卡密数量, 'manual' = Manual Stock
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
    // 套餐邮件额度：>0 / -1 表示允许，0 表示Disable
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
                console.error('加载设置Failed:', error)
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
            // 将设置值转换for字符串
            const settingsToSave = Object.fromEntries(
                Object.entries(settings).map(([key, value]) => [
                    key,
                    key === 'adminEmailNotificationConfigs' ? JSON.stringify(value) : String(value)
                ])
            )

            // Save Settings到后端
            const res = await fetch('/api/admin/settings', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(settingsToSave)
            })

            if (!res.ok) {
                throw new Error('SaveFailed')
            }

            showToast('设置SaveSuccess！', 'success')
            // 重新拉取皮肤，立即生效
            fetchSkin()

        } catch (err) {
            console.error(err)
            showToast('Save SettingsFailed', 'error')
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
                throw new Error(data.error || '库存重建Failed')
            }
            showToast(`Stock rebuilt: Products ${data.updatedProducts} 条，Variant ${data.updatedVariants} 条`, 'success')
        } catch (error) {
            showToast(error.message || '库存重建Failed', 'error')
        }
    }

    const adminNotifyEventOptions = [
        { key: 'notifyOrderPaid', label: '支付Success' },
        { key: 'notifyPendingShip', label: '待Ship' },
        { key: 'notifyNewTicket', label: 'tickets提醒' },
        { key: 'notifyNewUser', label: '新User' },
        { key: 'notifyLowStock', label: '库存预警' },
        { key: 'notifyOrderCancelled', label: '订单Cancel' }
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
        { id: 'admin', label: 'Admins设置' }
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
                    {saving ? 'Saving...' : 'Save Settings'}
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
                            <label>Site Description</label>
                            <textarea
                                value={settings.siteDescription}
                                onChange={(e) => handleChange('siteDescription', e.target.value)}
                                placeholder="Site Description"
                                rows={3}
                            />
                        </div>

                        {/* Agent Domain */}
                        <div className="setting-item">
                            <label>Agent Domain</label>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <input
                                    type="text"
                                    value={settings.agentSubdomainRoot || ''}
                                    onChange={(e) => handleChange('agentSubdomainRoot', e.target.value.trim().replace(/^https?:\/\//i, '').replace(/\/.*$/, ''))}
                                    placeholder="e.g.vshop.cc（Leave empty to use /s/slug path)"
                                    style={{ flex: 1 }}
                                />
                                {settings.agentSubdomainRoot && (
                                    <SslApplyButton domain={settings.agentSubdomainRoot} token={token} />
                                )}
                            </div>
                            <span className="setting-hint">
                                Only for SSL management. Agent sites use path mode（vmart.cc/s/slug）。
                            </span>
                        </div>

                        {/* Site Logo */}
                        <div className="setting-item">
                            <label>Site Logo</label>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 8 }}>Recommended: transparent PNG, max 60px height, shown in navbar</div>
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
                                    {settings.siteLogo ? 'Change' : 'Upload Logo'}
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
                                                showToast('Logo UploadSuccess', 'success')
                                            }
                                        } catch { showToast('UploadFailed', 'error') }
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
                                    >Clear</button>
                                )}
                            </div>
                        </div>

                        {/* 书签栏Icon Favicon */}
                        <div className="setting-item">
                            <label>Favicon</label>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 8 }}>Recommended: 64x64 PNG, shown in browser tab</div>
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
                                    {settings.siteFavicon ? 'Change' : 'UploadIcon'}
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
                                                showToast('IconUploadSuccess', 'success')
                                            }
                                        } catch { showToast('UploadFailed', 'error') }
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
                                    >Clear</button>
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
                                <label>Alipay</label>
                                <span className="toggle-desc">EnableAlipay支付</span>
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
                                <label>WeChat Pay</label>
                                <span className="toggle-desc">EnableWeChat Pay</span>
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
                                <span className="toggle-desc">Enable USDT payment</span>
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
                                        placeholder="TRC20 address starting with T"
                                    />
                                    <span className="setting-hint">Ensure address is correct to receive payments</span>
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
                                    <span className="setting-hint">Current rate：1 USDT = {getCurrencySymbol()}{settings.usdtExchangeRate}</span>
                                </div>
                            </>
                        )}

                        <div className="setting-item toggle-item">
                            <div className="toggle-info">
                                <label>USDT-BEP20</label>
                                <span className="toggle-desc">EnableBSC/BNB智能链USDT支付</span>
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
                                        placeholder="BEP20 address starting with 0x"
                                    />
                                    <span className="setting-hint">Ensure address is correct to receive payments</span>
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
                                    <span className="setting-hint">Current rate：1 USDT = {getCurrencySymbol()}{settings.bscUsdtExchangeRate}</span>
                                </div>
                                <div className="setting-item">
                                    <label>BscScan API Key (Optional, recommended)</label>
                                    <input
                                        type="text"
                                        value={settings.bscUsdtApiKey}
                                        onChange={(e) => handleChange('bscUsdtApiKey', e.target.value)}
                                        placeholder="Speeds up queries, prevents rate limiting (free)"
                                    />
                                    <span className="setting-hint">Get free at bscscan.com/apis</span>
                                </div>
                            </>
                        )}

                        <div className="setting-notice">
                            💡 USDT payments auto-detected every 30s, auto-shipped on receipt
                        </div>
                    </div>
                )}

                {/* 订单设置 */}
                {activeTab === 'order' && (
                    <div className="settings-section">
                        {/* Stock Calculation - 现代卡片选择 */}
                        <div className="setting-item stock-mode-section">
                            <label className="stock-mode-label">Stock Calculation</label>
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
                                            <span className="stock-mode-name">Auto Calculate Stock</span>
                                            <span className="stock-mode-tag recommended">Recommended</span>
                                        </div>
                                        <div className="stock-mode-description">
                                            System auto-counts available keys as stock, ensuring real-time accuracy
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
                                            <span className="stock-mode-name">Manual Stock</span>
                                        </div>
                                        <div className="stock-mode-description">
                                            可在Product管理中Manual Stock，适用于库存充足但卡密未导入的情况
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
                                    Rebuild Stock (by available keys)
                                </button>
                            </div>
                        </div>

                        {/* 订单超时 */}
                        <div className="setting-item">
                            <label>Order Timeout</label>
                            <div className="input-with-suffix">
                                <input
                                    type="number"
                                    value={settings.orderTimeout}
                                    onChange={(e) => handleChange('orderTimeout', parseInt(e.target.value))}
                                    min={5}
                                    max={120}
                                    style={{ width: '120px' }}
                                />
                                <span className="input-suffix">min</span>
                            </div>
                            <span className="setting-hint">Unpaid orders auto-cancelled after timeout</span>
                        </div>

                        {/* Auto Cancel */}
                        <div className="setting-item toggle-item">
                            <div className="toggle-info">
                                <label>Auto Cancel</label>
                                <span className="toggle-desc">超时订单Auto Cancel</span>
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
                                🔒 Current plan has no email quota. Please upgrade to enable.
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
                                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 4 }}>Platform emails this month</div>
                                        <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                            {emailUsed} / {emailQuota === -1 ? 'Unlimited' : emailQuota}
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
                                                    ? '⚠️ Monthly quota used up. Switch to own SMTP for unlimited'
                                                    : `Remaining: ${Math.max(0, emailQuota - emailUsed)} emails. Own SMTP not counted`}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                        <fieldset disabled={emailDisabled} style={{ border: 0, padding: 0, margin: 0, opacity: emailDisabled ? 0.55 : 1 }}>
                        <div className="setting-item toggle-item">
                            <div className="toggle-info">
                                <label>Email Notification</label>
                                <span className="toggle-desc">Send card keys to email after order completion</span>
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
                            <label>SMTP 服务器</label>
                            <input
                                type="text"
                                value={settings.smtpHost}
                                onChange={(e) => handleChange('smtpHost', e.target.value)}
                                placeholder="smtp.example.com"
                                disabled={emailDisabled}
                            />
                        </div>
                        <div className="setting-item">
                            <label>SMTP 端口</label>
                            <input
                                type="number"
                                value={settings.smtpPort}
                                onChange={(e) => handleChange('smtpPort', parseInt(e.target.value))}
                                placeholder="465"
                                disabled={emailDisabled}
                            />
                        </div>
                        <div className="setting-item">
                            <label>发件邮箱</label>
                            <input
                                type="email"
                                value={settings.smtpUser}
                                onChange={(e) => handleChange('smtpUser', e.target.value)}
                                placeholder="noreply@example.com"
                                disabled={emailDisabled}
                            />
                        </div>
                        <div className="setting-item">
                            <label>邮箱密码/授权码</label>
                            <input
                                type="password"
                                value={settings.smtpPass}
                                onChange={(e) => handleChange('smtpPass', e.target.value)}
                                placeholder="邮箱密码或授权码"
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
                                            alert('✅ ' + data.message)
                                        } else {
                                            alert('❌ 测试Failed: ' + data.error)
                                        }
                                    } catch (error) {
                                        alert('❌ 测试Failed: ' + error.message)
                                    }
                                }}
                            >
                                测试邮件连接
                            </button>
                            <span className="setting-hint">先Save Settings，再测试连接</span>
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
                                🔒 Current套餐不包含Email Notification额度，所有事件Email Notification已Disable。
                            </div>
                        )}
                        <fieldset disabled={emailDisabled} style={{ border: 0, padding: 0, margin: 0, opacity: emailDisabled ? 0.55 : 1 }}>
                        <div className="setting-item">
                            <label>Admins收信邮箱</label>
                            <input
                                type="email"
                                value={settings.adminNotifyEmail}
                                onChange={(e) => handleChange('adminNotifyEmail', e.target.value)}
                                placeholder="admin@example.com"
                                disabled={emailDisabled}
                            />
                            <span className="setting-hint">事件通知将发送到此邮箱，留空则不发送</span>
                        </div>

                        <div style={{ marginTop: '8px' }}>
                            <label style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '16px' }}>通知开关</label>
                        </div>

                        <div className="setting-item toggle-item">
                            <div className="toggle-info">
                                <label>💰 订单支付Success</label>
                                <span className="toggle-desc">User完成支付后通知Admins</span>
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
                                <label>📦 待Manual Ship</label>
                                <span className="toggle-desc">订单Paid但无卡密自动发放，需Manual Ship时通知</span>
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
                                <label>🎫 新ticketsCreate</label>
                                <span className="toggle-desc">User提交新tickets时通知Admins</span>
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
                                <label>👤 新User注册</label>
                                <span className="toggle-desc">有新User注册时通知Admins</span>
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
                                <span className="toggle-desc">Product库存低于阈值时通知Admins</span>
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
                                <label>📦 订单Cancel</label>
                                <span className="toggle-desc">订单被Cancel时通知Admins</span>
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
                                <label>💸 RefundSuccess通知</label>
                                <span className="toggle-desc">订单Complete Refund后向User发送RefundSuccess邮件</span>
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

                {activeTab === 'admin' && (
                    <div className="settings-section">
                        <div className="setting-item toggle-item">
                            <div className="toggle-info">
                                <label>仪表盘总览统计</label>
                                <span className="toggle-desc">允许普通Admins查看仪表盘顶部的 stats-grid 统计卡和趋势数据</span>
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
                                <span className="toggle-desc">允许普通Admins查看仪表盘中的 today-stats 今日订单和今日收入</span>
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
                                <label>Admins邮箱通知</label>
                                <span>for每个Admins配置是否接收邮件，以及接收哪些类型的通知</span>
                            </div>

                            {(settings.adminEmailNotificationConfigs || []).length === 0 ? (
                                <div className="admin-email-empty">暂无Admins账号</div>
                            ) : (
                                <div className="admin-email-list">
                                    {(settings.adminEmailNotificationConfigs || []).map(config => (
                                        <div key={config.userId} className="admin-email-card">
                                            <div className="admin-email-card-main">
                                                <div>
                                                    <div className="admin-email-name">
                                                        {config.username || 'Not setUsername'}
                                                        <span>{config.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Admin'}</span>
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

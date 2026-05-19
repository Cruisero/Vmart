import { useState, useEffect } from 'react'

const statusMap = { OPEN: { label: '待处理', color: '#F59E0B' }, IN_PROGRESS: { label: '处理中', color: '#3B82F6' }, CLOSED: { label: '已关闭', color: '#6B7280' } }

export default function ManSupportTickets({ token }) {
    const [tickets, setTickets] = useState([])
    const [loading, setLoading] = useState(true)
    const [selected, setSelected] = useState(null)
    const [replyContent, setReplyContent] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [filter, setFilter] = useState('all')

    const load = () => {
        if (!token) return
        setLoading(true)
        const url = filter === 'all' ? '/api/man/tickets' : `/api/man/tickets?status=${filter}`
        fetch(url, { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.json()).then(d => setTickets(d.tickets || []))
            .finally(() => setLoading(false))
    }
    useEffect(() => { load() }, [filter, token])

    const viewDetail = async (id) => {
        const r = await fetch(`/api/man/tickets/${id}`, { headers: { Authorization: `Bearer ${token}` } })
        const d = await r.json()
        setSelected(d.ticket)
    }

    const handleReply = async () => {
        if (!replyContent.trim()) return
        setSubmitting(true)
        await fetch(`/api/man/tickets/${selected.id}/reply`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ content: replyContent })
        })
        setReplyContent('')
        setSubmitting(false)
        viewDetail(selected.id)
        load()
    }

    const handleClose = async () => {
        await fetch(`/api/man/tickets/${selected.id}/close`, {
            method: 'POST', headers: { Authorization: `Bearer ${token}` }
        })
        viewDetail(selected.id)
        load()
    }

    if (selected) {
        const s = statusMap[selected.status] || statusMap.OPEN
        return (
            <div className="man-page">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <h1 className="man-page-title" style={{ display: 'flex', alignItems: 'center', gap: 10, margin: 0 }}>
                        {selected.subject}
                        <span style={{ fontSize: '0.72rem', padding: '3px 10px', borderRadius: 12, background: `${s.color}20`, color: s.color, fontWeight: 600 }}>{s.label}</span>
                    </h1>
                    <div style={{ display: 'flex', gap: 8 }}>
                        {selected.status !== 'CLOSED' && (
                            <button onClick={handleClose} style={{ padding: '6px 14px', border: '1px solid var(--border-color)', borderRadius: 6, background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', fontSize: '0.82rem', cursor: 'pointer' }}>关闭工单</button>
                        )}
                        <button onClick={() => setSelected(null)} style={{ padding: '6px 14px', border: '1px solid var(--border-color)', borderRadius: 6, background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', fontSize: '0.82rem', cursor: 'pointer' }}>返回列表</button>
                    </div>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 16 }}>
                    商户：{selected.merchant?.email} · {selected.merchant?.shop?.name || ''}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: '100%' }}>
                    {selected.messages?.map(msg => (
                        <div key={msg.id} style={{
                            padding: '14px 18px', borderRadius: 12,
                            background: msg.senderType === 'ADMIN' ? 'rgba(99, 102, 241, 0.08)' : 'var(--bg-secondary)',
                            border: `1px solid ${msg.senderType === 'ADMIN' ? 'rgba(99, 102, 241, 0.2)' : 'var(--border-color)'}`,
                            maxWidth: '85%', alignSelf: msg.senderType === 'ADMIN' ? 'flex-end' : 'flex-start'
                        }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 6 }}>
                                {msg.senderType === 'ADMIN' ? '平台客服' : '商户'} · {new Date(msg.createdAt).toLocaleString()}
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
                {selected.status !== 'CLOSED' && (
                    <div style={{ marginTop: 20, maxWidth: '100%', display: 'flex', gap: 10 }}>
                        <textarea value={replyContent} onChange={e => setReplyContent(e.target.value)} placeholder="输入回复..." rows={2} style={{ flex: 1, padding: '10px 14px', border: '1px solid var(--border-color)', borderRadius: 8, background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.9rem', fontFamily: 'inherit', resize: 'vertical' }} />
                        <button onClick={handleReply} disabled={submitting} style={{ padding: '10px 20px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', alignSelf: 'flex-end' }}>
                            {submitting ? '...' : '回复'}
                        </button>
                    </div>
                )}
            </div>
        )
    }

    return (
        <div className="man-page">
            <h1 className="man-page-title">商户工单</h1>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                {[{ key: 'all', label: '全部' }, { key: 'OPEN', label: '待处理' }, { key: 'IN_PROGRESS', label: '处理中' }, { key: 'CLOSED', label: '已关闭' }].map(f => (
                    <button key={f.key} onClick={() => setFilter(f.key)} style={{
                        padding: '6px 16px', border: '1px solid var(--border-color)', borderRadius: 6,
                        background: filter === f.key ? 'var(--primary)' : 'var(--bg-tertiary)',
                        color: filter === f.key ? '#fff' : 'var(--text-secondary)',
                        fontSize: '0.82rem', cursor: 'pointer', fontFamily: 'inherit'
                    }}>{f.label}</button>
                ))}
            </div>
            {loading ? <p>加载中...</p> : tickets.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>暂无工单</div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {tickets.map(t => {
                        const s = statusMap[t.status] || statusMap.OPEN
                        const lastMsg = t.messages?.[0]
                        return (
                            <div key={t.id} onClick={() => viewDetail(t.id)} style={{
                                padding: '16px 20px', border: '1px solid var(--border-color)',
                                borderRadius: 10, cursor: 'pointer', background: 'var(--bg-card)',
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                            }}>
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{t.subject}</div>
                                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>
                                        {t.merchant?.shop?.name || t.merchant?.email} · {lastMsg?.content?.slice(0, 40)}
                                    </div>
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

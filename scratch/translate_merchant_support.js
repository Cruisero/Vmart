const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../frontend/src/pages/Admin/Dashboard/index.jsx');
let content = fs.readFileSync(file, 'utf8');

const startTag = 'function MerchantSupportPage() {';
const startIdx = content.indexOf(startTag);
if (startIdx === -1) {
    console.error('MerchantSupportPage start not found');
    process.exit(1);
}

const endTag = '// 平台公告组件（显示在商户后台仪表盘顶部）';
const endIdx = content.indexOf(endTag, startIdx);
if (endIdx === -1) {
    console.error('PlatformNotices start tag not found');
    process.exit(1);
}

console.log('Replacing MerchantSupportPage from', startIdx, 'to', endIdx);

const prefix = content.slice(0, startIdx);
const suffix = content.slice(endIdx);

const translatedSupport = `function MerchantSupportPage() {
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
            const r = await fetch('/api/platform/tickets', { headers: { Authorization: \`Bearer \${authToken}\` } })
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
                headers: { 'Content-Type': 'application/json', Authorization: \`Bearer \${authToken}\` },
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
            const r = await fetch(\`/api/platform/tickets/\${selectedTicket.id}/reply\`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: \`Bearer \${authToken}\` },
                body: JSON.stringify({ content: replyContent, images: replyImages.length ? replyImages : null })
            })
            if (!r.ok) { const d = await r.json(); showToast(d.error || L('发送失败', 'Send failed'), 'error'); return }
            setReplyContent('')
            setReplyImages([])
            // Refresh详情
            const dr = await fetch(\`/api/platform/tickets/\${selectedTicket.id}\`, { headers: { Authorization: \`Bearer \${authToken}\` } })
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
            const r = await fetch('/api/upload', { method: 'POST', headers: { Authorization: \`Bearer \${token}\` }, body: fd })
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
                        <span style={{ fontSize: '0.75rem', padding: '3px 10px', borderRadius: 12, background: \`\${s.color}20\`, color: s.color, fontWeight: 600 \}}>{s.label}</span>
                        {selectedTicket.status !== 'CLOSED' && (
                            <button
                                onClick={async () => {
                                    if (!confirm(L('确定关闭该工单吗？您可以在 24 小时内重新开启。', 'Close this ticket? You can reopen within 24 hours.'))) return
                                    const r = await fetch(\`/api/platform/tickets/\${selectedTicket.id}/close\`, {
                                        method: 'POST', headers: { Authorization: \`Bearer \${authToken}\` }
                                    })
                                    if (r.ok) {
                                        showToast(L('工单已关闭', 'Ticket closed'), 'success')
                                        const dr = await fetch(\`/api/platform/tickets/\${selectedTicket.id}\`, { headers: { Authorization: \`Bearer \${authToken}\` } })
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
                            border: \`1px solid \${msg.senderType === 'MERCHANT' ? 'var(--border-color)' : 'rgba(99, 102, 241, 0.2)'}\`,
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
                                    ? L(\`工单已关闭 (可在 \${hoursLeft} 小时内重新开启)\`, \`Ticket closed (can reopen within \${hoursLeft} hours)\`)
                                    : L('工单已关闭超过 24 小时，请提交新工单。', 'Ticket closed for over 24 hours. Please submit a new ticket.')}
                            </span>
                            {canReopen && (
                                <button className="btn btn-secondary" onClick={async () => {
                                    const r = await fetch(\`/api/platform/tickets/\${selectedTicket.id}/reopen\`, {
                                        method: 'POST', headers: { Authorization: \`Bearer \${authToken}\` }
                                    })
                                    if (r.ok) {
                                        showToast(L('工单已重新开启', 'Ticket reopened'), 'success')
                                        const dr = await fetch(\`/api/platform/tickets/\${selectedTicket.id}\`, { headers: { Authorization: \`Bearer \${authToken}\` } })
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
                            <div key={t.id} onClick={() => { setSelectedTicket(null); setView('detail'); fetch(\`/api/platform/tickets/\${t.id}\`, { headers: { Authorization: \`Bearer \${authToken}\` } }).then(r => r.json()).then(d => setSelectedTicket(d.ticket)) }} style={{
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
                                    <span style={{ fontSize: '0.75rem', padding: '3px 10px', borderRadius: 12, background: \`\${s.color}20\`, color: s.color, fontWeight: 600 \}}>{s.label}</span>
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
`;

const newContent = prefix + translatedSupport + suffix;
fs.writeFileSync(file, newContent, 'utf8');
console.log('Successfully translated MerchantSupportPage!');

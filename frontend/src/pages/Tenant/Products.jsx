import { useState, useEffect } from 'react'

const API = import.meta.env.VITE_API_URL || '/api'

export default function TenantProducts({ tenant, token }) {
    const [products, setProducts] = useState([])
    const [loading, setLoading] = useState(false)
    const [showForm, setShowForm] = useState(false)
    const [editProduct, setEditProduct] = useState(null)
    const [showCards, setShowCards] = useState(null) // productId
    const [cardText, setCardText] = useState('')
    const [msg, setMsg] = useState(null)
    const [saving, setSaving] = useState(false)

    const [form, setForm] = useState({ name: '', description: '', price: '', deliveryNote: '' })

    const fetchProducts = () => {
        if (!tenant) return
        setLoading(true)
        fetch(`${API}/tenant/products`, { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.json()).then(d => setProducts(d.products || [])).finally(() => setLoading(false))
    }

    useEffect(() => { fetchProducts() }, [tenant])

    const openNew = () => { setForm({ name: '', description: '', price: '', deliveryNote: '' }); setEditProduct(null); setShowForm(true) }
    const openEdit = (p) => { setForm({ name: p.name, description: p.description || '', price: String(p.price), deliveryNote: p.deliveryNote || '' }); setEditProduct(p); setShowForm(true) }

    const saveProduct = async () => {
        if (!form.name || !form.price) return setMsg({ type: 'error', text: '商品名称和价格不能为空' })
        setSaving(true); setMsg(null)
        const url = editProduct ? `/tenant/products/${editProduct.id}` : '/tenant/products'
        const method = editProduct ? 'PUT' : 'POST'
        const r = await fetch(`${API}${url}`, {
            method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(form)
        })
        const d = await r.json(); setSaving(false)
        if (d.product) { fetchProducts(); setShowForm(false); setMsg({ type: 'success', text: editProduct ? '商品已更新' : '商品已创建' }) }
        else setMsg({ type: 'error', text: d.error || '操作失败' })
    }

    const deleteProduct = async (id) => {
        if (!confirm('确认删除此商品？')) return
        await fetch(`${API}/tenant/products/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
        fetchProducts()
    }

    const uploadCards = async (productId) => {
        const lines = cardText.split('\n').map(l => l.trim()).filter(Boolean)
        if (!lines.length) return
        setSaving(true)
        const r = await fetch(`${API}/tenant/products/${productId}/cards`, {
            method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ productId, cards: lines })
        })
        const d = await r.json(); setSaving(false)
        if (d.count >= 0) { setMsg({ type: 'success', text: `成功上传 ${d.count} 张卡密` }); setShowCards(null); setCardText(''); fetchProducts() }
        else setMsg({ type: 'error', text: d.error || '上传失败' })
    }

    if (!tenant || tenant.status !== 'ACTIVE') return (
        <div className="tenant-empty">
            <div className="tenant-empty-icon">📦</div>
            <div className="tenant-empty-title">商城尚未开通</div>
            <div className="tenant-empty-desc">审核通过后即可添加商品</div>
        </div>
    )

    return (
        <div>
            <div className="tenant-page-title" style={{ justifyContent: 'space-between' }}>
                <span>📦 商品管理</span>
                <button className="tenant-btn tenant-btn-primary" onClick={openNew}>＋ 添加商品</button>
            </div>

            {msg && <div className={`tenant-alert tenant-alert-${msg.type}`} onClick={() => setMsg(null)}>{msg.text}</div>}

            {/* 添加/编辑商品 */}
            {showForm && (
                <div className="tenant-card">
                    <div className="tenant-card-title">{editProduct ? '✏️ 编辑商品' : '➕ 添加商品'}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
                        <div className="tenant-form-group">
                            <label className="tenant-label">商品名称 *</label>
                            <input className="tenant-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Steam 充值卡 50元" />
                        </div>
                        <div className="tenant-form-group">
                            <label className="tenant-label">售价（元）*</label>
                            <input className="tenant-input" type="number" min="0.01" step="0.01" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="49.90" />
                        </div>
                    </div>
                    <div className="tenant-form-group">
                        <label className="tenant-label">商品描述</label>
                        <textarea className="tenant-input tenant-textarea" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="商品详细描述…" />
                    </div>
                    <div className="tenant-form-group">
                        <label className="tenant-label">发货说明</label>
                        <textarea className="tenant-input" style={{ minHeight: 60 }} value={form.deliveryNote} onChange={e => setForm(f => ({ ...f, deliveryNote: e.target.value }))} placeholder="支付成功后自动发送卡密，请妥善保管…" />
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                        <button className="tenant-btn tenant-btn-primary" onClick={saveProduct} disabled={saving}>{saving ? '保存中…' : '💾 保存'}</button>
                        <button className="tenant-btn tenant-btn-secondary" onClick={() => setShowForm(false)}>取消</button>
                    </div>
                </div>
            )}

            {/* 卡密上传弹窗 */}
            {showCards && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
                    onClick={e => { if (e.target === e.currentTarget) setShowCards(null) }}>
                    <div style={{ background: 'var(--tenant-surface)', borderRadius: 16, width: '100%', maxWidth: 500, padding: 24 }}>
                        <div style={{ fontWeight: 700, marginBottom: 16 }}>🎴 批量上传卡密</div>
                        <p style={{ fontSize: '0.82rem', color: 'var(--tenant-muted)', marginBottom: 10 }}>每行一条卡密，支持批量粘贴：</p>
                        <textarea
                            className="tenant-input tenant-textarea"
                            style={{ minHeight: 200, fontFamily: 'monospace', fontSize: '0.82rem' }}
                            value={cardText}
                            onChange={e => setCardText(e.target.value)}
                            placeholder={'XXXX-XXXX-XXXX\nYYYY-YYYY-YYYY\nZZZZ-ZZZZ-ZZZZ'}
                        />
                        <div style={{ fontSize: '0.78rem', color: 'var(--tenant-muted)', marginBottom: 16 }}>
                            共 {cardText.split('\n').filter(l => l.trim()).length} 条
                        </div>
                        <div style={{ display: 'flex', gap: 10 }}>
                            <button className="tenant-btn tenant-btn-primary" onClick={() => uploadCards(showCards)} disabled={saving || !cardText.trim()}>
                                {saving ? '上传中…' : '⬆️ 确认上传'}
                            </button>
                            <button className="tenant-btn tenant-btn-secondary" onClick={() => setShowCards(null)}>取消</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 商品列表 */}
            <div className="tenant-card" style={{ padding: 0 }}>
                {loading ? (
                    <div className="tenant-loading"><div className="tenant-spinner" /></div>
                ) : products.length === 0 ? (
                    <div className="tenant-empty">
                        <div className="tenant-empty-icon">📦</div>
                        <div className="tenant-empty-title">还没有商品</div>
                        <div className="tenant-empty-desc">点击右上角「添加商品」开始创建</div>
                    </div>
                ) : (
                    <table className="tenant-table">
                        <thead>
                            <tr><th>商品名称</th><th>价格</th><th>库存</th><th>状态</th><th>操作</th></tr>
                        </thead>
                        <tbody>
                            {products.map(p => (
                                <tr key={p.id}>
                                    <td>
                                        <div style={{ fontWeight: 600 }}>{p.name}</div>
                                        {p.description && <div style={{ fontSize: '0.75rem', color: 'var(--tenant-muted)', marginTop: 2 }}>{p.description.slice(0, 40)}…</div>}
                                    </td>
                                    <td><strong style={{ color: '#10B981' }}>¥{parseFloat(p.price).toFixed(2)}</strong></td>
                                    <td>
                                        <span style={{ color: (p._count?.cards || 0) > 0 ? '#10B981' : '#EF4444', fontWeight: 700 }}>
                                            {p._count?.cards ?? 0}
                                        </span> 张
                                    </td>
                                    <td>
                                        <span className={`tenant-badge ${p.status === 'ACTIVE' ? 'active' : 'suspended'}`}>
                                            {p.status === 'ACTIVE' ? '上架' : '下架'}
                                        </span>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 6 }}>
                                            <button className="tenant-btn tenant-btn-secondary" style={{ padding: '5px 10px', fontSize: '0.75rem' }} onClick={() => setShowCards(p.id)}>🎴 上传卡密</button>
                                            <button className="tenant-btn tenant-btn-secondary" style={{ padding: '5px 10px', fontSize: '0.75rem' }} onClick={() => openEdit(p)}>✏️ 编辑</button>
                                            <button className="tenant-btn tenant-btn-danger" style={{ padding: '5px 10px', fontSize: '0.75rem' }} onClick={() => deleteProduct(p.id)}>🗑️</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    )
}

import { useState, useEffect } from 'react'

const API = import.meta.env.VITE_API_URL || '/api'

export default function TenantOrders({ tenant, token }) {
    const [orders, setOrders] = useState([])
    const [total, setTotal] = useState(0)
    const [page, setPage] = useState(1)
    const [status, setStatus] = useState('')
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (!tenant) return
        setLoading(true)
        const params = new URLSearchParams({ page, limit: 20 })
        if (status) params.set('status', status)
        fetch(`${API}/tenant/orders?${params}`, { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.json()).then(d => { setOrders(d.orders || []); setTotal(d.total || 0) })
            .finally(() => setLoading(false))
    }, [tenant, page, status])

    const statusLabel = { PENDING: '待支付', PAID: '已支付', COMPLETED: '已完成', CANCELLED: '已取消', REFUNDED: '已退款' }
    const statusCls   = { PENDING: 'pending', PAID: 'reviewing', COMPLETED: 'active', CANCELLED: 'suspended', REFUNDED: 'rejected' }

    if (!tenant || tenant.status !== 'ACTIVE') return (
        <div className="tenant-empty">
            <div className="tenant-empty-icon">🧾</div>
            <div className="tenant-empty-title">商城尚未开通</div>
            <div className="tenant-empty-desc">审核通过后即可查看订单</div>
        </div>
    )

    return (
        <div>
            <div className="tenant-page-title">🧾 订单管理</div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                {['', 'PENDING', 'PAID', 'COMPLETED', 'CANCELLED'].map(s => (
                    <button key={s} onClick={() => { setStatus(s); setPage(1) }}
                        className={`tenant-btn ${status === s ? 'tenant-btn-primary' : 'tenant-btn-secondary'}`}
                        style={{ padding: '6px 14px', fontSize: '0.8rem' }}>
                        {s ? statusLabel[s] : '全部'}
                    </button>
                ))}
            </div>

            <div className="tenant-card" style={{ padding: 0 }}>
                {loading ? (
                    <div className="tenant-loading"><div className="tenant-spinner" /></div>
                ) : orders.length === 0 ? (
                    <div className="tenant-empty"><div className="tenant-empty-icon">📭</div><div className="tenant-empty-title">暂无订单</div></div>
                ) : (
                    <table className="tenant-table">
                        <thead>
                            <tr>
                                <th>订单号</th><th>商品</th><th>邮箱</th>
                                <th>金额</th><th>状态</th><th>时间</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.map(o => (
                                <tr key={o.id}>
                                    <td><code style={{ fontSize: '0.78rem', color: '#a5b4fc' }}>{o.orderNo}</code></td>
                                    <td style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.productName}</td>
                                    <td style={{ color: 'var(--tenant-muted)', fontSize: '0.8rem' }}>{o.email}</td>
                                    <td><strong>¥{parseFloat(o.totalAmount).toFixed(2)}</strong></td>
                                    <td><span className={`tenant-badge ${statusCls[o.status]}`}>{statusLabel[o.status]}</span></td>
                                    <td style={{ color: 'var(--tenant-muted)', fontSize: '0.78rem' }}>{new Date(o.createdAt).toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {total > 20 && (
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16 }}>
                    <button className="tenant-btn tenant-btn-secondary" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>上一页</button>
                    <span style={{ padding: '10px 16px', color: 'var(--tenant-muted)', fontSize: '0.84rem' }}>{page} / {Math.ceil(total / 20)}</span>
                    <button className="tenant-btn tenant-btn-secondary" onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(total / 20)}>下一页</button>
                </div>
            )}
        </div>
    )
}

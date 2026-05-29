import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'

export default function WithdrawManage({ token }) {
    const [withdrawals, setWithdrawals] = useState([])
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(true)
    const [statusFilter, setStatusFilter] = useState('PENDING')
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)

    // 驳回弹窗
    const [rejectingItem, setRejectingItem] = useState(null)
    const [rejectReason, setRejectReason] = useState('')
    const [auditingId, setAuditingId] = useState(null)

    const loadWithdrawals = async (p = 1, status = statusFilter) => {
        setLoading(true)
        try {
            const filterQuery = status ? `&status=${status}` : ''
            const res = await fetch(`/api/man/withdrawals?page=${p}&limit=10${filterQuery}`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            const data = await res.json()
            if (res.ok) {
                setWithdrawals(data.withdrawals || [])
                setTotal(data.total || 0)
                setPage(data.page || 1)
                setTotalPages(Math.ceil((data.total || 0) / 10) || 1)
            } else {
                toast.error(data.error || '获取提现申请列表失败')
            }
        } catch {
            toast.error('网络连接失败')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadWithdrawals(1, statusFilter)
    }, [token, statusFilter])

    const handleAudit = async (id, action, reason = '') => {
        setAuditingId(id)
        try {
            const res = await fetch('/api/man/withdrawals/audit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    id,
                    action,
                    rejectReason: reason
                })
            })
            const data = await res.json()
            if (res.ok) {
                toast.success(data.message || '操作成功')
                setRejectingItem(null)
                setRejectReason('')
                loadWithdrawals(page, statusFilter)
            } else {
                toast.error(data.error || '审核失败')
            }
        } catch {
            toast.error('网络连接错误，请重试')
        } finally {
            setAuditingId(null)
        }
    }

    const METHOD_LABELS = {
        alipay: '支付宝',
        usdt_trc20: 'USDT (TRC20)',
        usdt_bep20: 'USDT (BEP20)'
    }

    const STATUS_LABELS = {
        PENDING: '待处理',
        APPROVED: '已打款',
        REJECTED: '已驳回'
    }

    const STATUS_COLORS = {
        PENDING: '#f59e0b',
        APPROVED: '#10b981',
        REJECTED: '#ef4444'
    }

    return (
        <div className="man-page" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
            <div className="man-page-header">
                <h1 className="man-page-title">商户提现审核</h1>
                <span className="man-total-badge">共 {total} 个提现申请</span>
            </div>

            {/* 顶栏过滤 */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                {['PENDING', 'APPROVED', 'REJECTED'].map(status => (
                    <button
                        key={status}
                        onClick={() => { setStatusFilter(status); setPage(1) }}
                        style={{
                            padding: '8px 16px',
                            background: statusFilter === status ? 'rgba(239, 68, 68, 0.12)' : 'var(--bg-secondary)',
                            color: statusFilter === status ? 'var(--primary-light)' : 'var(--text-secondary)',
                            border: statusFilter === status ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid var(--border-color)',
                            borderRadius: '20px',
                            fontSize: '0.82rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.15s'
                        }}
                    >
                        {STATUS_LABELS[status]}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="man-loading">正在载入数据...</div>
            ) : withdrawals.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '12px' }}>☕</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: '500', color: 'var(--text-primary)' }}>没有找到符合条件的提现申请记录</div>
                </div>
            ) : (
                <div className="man-table-wrap">
                    <table className="man-table">
                        <thead>
                            <tr>
                                <th>店铺信息</th>
                                <th>提现方式</th>
                                <th>打款账号 / 地址</th>
                                <th>金额 (CNY)</th>
                                <th>实名姓名</th>
                                <th>申请时间</th>
                                <th>状态</th>
                                <th>操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            {withdrawals.map(w => (
                                <tr key={w.id}>
                                    <td>
                                        <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{w.shopName}</div>
                                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>/v/{w.shopSlug}</div>
                                    </td>
                                    <td style={{ fontWeight: '500' }}>{METHOD_LABELS[w.method] || w.method}</td>
                                    <td style={{ fontFamily: 'monospace', fontSize: '0.84rem', color: 'var(--text-muted)' }}>{w.account}</td>
                                    <td style={{ fontWeight: '700', fontSize: '0.92rem', color: 'var(--primary-light)' }}>
                                        ¥ {w.amount.toFixed(2)}
                                    </td>
                                    <td style={{ fontWeight: '500' }}>{w.kycRealName}</td>
                                    <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                                        {new Date(w.createdAt).toLocaleString()}
                                    </td>
                                    <td>
                                        <span style={{
                                            display: 'inline-block',
                                            padding: '2px 8px',
                                            borderRadius: '4px',
                                            fontSize: '0.72rem',
                                            fontWeight: '600',
                                            background: w.status === 'APPROVED' ? 'rgba(16,185,129,0.1)' : w.status === 'PENDING' ? 'rgba(245,158,11,0.1)' : 'rgba(239, 68, 68, 0.1)',
                                            color: STATUS_COLORS[w.status] || '#6b7280'
                                        }}>
                                            {STATUS_LABELS[w.status] || w.status}
                                        </span>
                                    </td>
                                    <td>
                                        {w.status === 'PENDING' ? (
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <button
                                                    disabled={auditingId !== null}
                                                    onClick={() => {
                                                        if (window.confirm(`确定已在线下完成向【${w.kycRealName}】的【${METHOD_LABELS[w.method]} (${w.account})】打款并同意此申请吗？`)) {
                                                            handleAudit(w.id, 'APPROVE')
                                                        }
                                                    }}
                                                    style={{
                                                        padding: '6px 12px', background: '#10b981', color: '#fff',
                                                        border: 'none', borderRadius: '4px', fontSize: '0.76rem', cursor: 'pointer', fontWeight: '600'
                                                    }}
                                                >
                                                    确认打款
                                                </button>
                                                <button
                                                    disabled={auditingId !== null}
                                                    onClick={() => setRejectingItem(w)}
                                                    style={{
                                                        padding: '6px 12px', background: '#ef4444', color: '#fff',
                                                        border: 'none', borderRadius: '4px', fontSize: '0.76rem', cursor: 'pointer', fontWeight: '600'
                                                    }}
                                                >
                                                    驳回
                                                </button>
                                            </div>
                                        ) : (
                                            <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                                                {w.status === 'APPROVED' ? (
                                                    `已于 ${new Date(w.processedAt).toLocaleDateString()} 处理`
                                                ) : (
                                                    `驳回原因: ${w.rejectReason || '无'}`
                                                )}
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* 分页栏 */}
            {totalPages > 1 && (
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
                    <button
                        disabled={page === 1}
                        onClick={() => loadWithdrawals(page - 1)}
                        style={{ padding: '6px 12px', fontSize: '0.78rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', cursor: 'pointer' }}
                    >
                        上一页
                    </button>
                    <span style={{ fontSize: '0.78rem', alignSelf: 'center', color: 'var(--text-muted)' }}>{page} / {totalPages}</span>
                    <button
                        disabled={page === totalPages}
                        onClick={() => loadWithdrawals(page + 1)}
                        style={{ padding: '6px 12px', fontSize: '0.78rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', cursor: 'pointer' }}
                    >
                        下一页
                    </button>
                </div>
            )}

            {/* 驳回原因 Modal */}
            {rejectingItem && (
                <div
                    onClick={() => setRejectingItem(null)}
                    style={{
                        position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                        background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        zIndex: 9999, padding: '20px'
                    }}
                >
                    <form
                        onSubmit={(e) => {
                            e.preventDefault()
                            if (!rejectReason.trim()) return toast.error('请填写驳回理由')
                            handleAudit(rejectingItem.id, 'REJECT', rejectReason.trim())
                        }}
                        onClick={e => e.stopPropagation()}
                        style={{
                            background: 'var(--bg-card)', padding: '24px', borderRadius: '12px',
                            maxWidth: '450px', width: '100%', border: '1px solid var(--border-color)',
                            position: 'relative'
                        }}
                    >
                        <h3 style={{ margin: '0 0 8px 0', color: 'var(--text-primary)' }}>驳回提现申请</h3>
                        <p style={{ margin: '0 0 16px 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            商户: <b>{rejectingItem.shopName}</b>, 提现金额: <b style={{ color: '#ef4444' }}>¥ {rejectingItem.amount.toFixed(2)}</b>.
                            驳回后系统将自动解除资金冻结，并将金额全额退还至商户可用余额。
                        </p>

                        <div className="ts-form-group" style={{ marginBottom: '20px' }}>
                            <label style={{ fontSize: '0.84rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '8px', display: 'block' }}>
                                请输入驳回理由
                            </label>
                            <textarea
                                placeholder="例如：收款账号格式不正确或收款人与实名核验姓名不符，请核实修改。"
                                value={rejectReason}
                                onChange={e => setRejectReason(e.target.value)}
                                required
                                rows={4}
                                style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.88rem', resize: 'vertical', outline: 'none' }}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                            <button
                                type="button"
                                className="man-btn-cancel"
                                onClick={() => setRejectingItem(null)}
                                style={{ padding: '8px 16px', background: 'none', border: '1px solid var(--border-color)', borderRadius: '6px', cursor: 'pointer', fontSize: '0.82rem', color: 'var(--text-secondary)' }}
                            >
                                取消
                            </button>
                            <button
                                type="submit"
                                style={{ padding: '8px 16px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: '600' }}
                            >
                                确认驳回
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    )
}

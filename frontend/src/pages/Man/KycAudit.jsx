import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'

export default function KycAudit({ token }) {
    const [requests, setRequests] = useState([])
    const [loading, setLoading] = useState(true)
    const [previewPhoto, setPreviewPhoto] = useState(null)
    const [rejectingRequest, setRejectingRequest] = useState(null)
    const [rejectReason, setRejectReason] = useState('')
    const [auditingId, setAuditingId] = useState(null)

    useEffect(() => {
        loadRequests()
    }, [])

    const loadRequests = () => {
        setLoading(true)
        fetch('/api/man/kyc/requests', {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(res => res.json())
            .then(data => {
                if (data.requests) {
                    setRequests(data.requests)
                }
            })
            .catch(() => toast.error('获取实名申请列表失败'))
            .finally(() => setLoading(false))
    }

    const handleAudit = async (tenantId, action, reason = '') => {
        setAuditingId(tenantId)
        try {
            const res = await fetch('/api/man/kyc/audit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    tenantId,
                    action,
                    rejectReason: reason
                })
            })
            const data = await res.json()
            if (res.ok) {
                toast.success(data.message || '操作成功')
                setRejectingRequest(null)
                setRejectReason('')
                loadRequests()
            } else {
                toast.error(data.error || '审核操作失败')
            }
        } catch {
            toast.error('网络连接错误，请稍后重试')
        } finally {
            setAuditingId(null)
        }
    }

    const openPreview = (photoFile) => {
        setPreviewPhoto(photoFile)
    }

    return (
        <div className="man-page" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
            <div className="man-page-header">
                <h1 className="man-page-title">商户实名审核 (KYC)</h1>
                <span className="man-total-badge">待处理申请: {requests.length}</span>
            </div>

            <div style={{ background: 'var(--bg-secondary)', padding: '16px 20px', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '24px', fontSize: '0.86rem', color: 'var(--text-secondary)' }}>
                💡 <b>安全合规提醒：</b>
                由于代收模式需要防范洗钱与虚假交易风险，请仔细核对商户身份证字条照片。一旦“通过”或“拒绝”，系统会**立即从磁盘永久擦除证件照图片文件**，以最大限度减少敏感隐私信息在服务器上的滞留。
            </div>

            {loading ? (
                <div className="man-loading">加载中...</div>
            ) : requests.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '12px' }}>☕</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: '500', color: 'var(--text-primary)' }}>暂无待处理的实名核验申请</div>
                </div>
            ) : (
                <div className="man-table-wrap">
                    <table className="man-table">
                        <thead>
                            <tr>
                                <th>店铺名称 / Slug</th>
                                <th>真实姓名</th>
                                <th>身份证号码</th>
                                <th>手持合照</th>
                                <th>申请时间</th>
                                <th>操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            {requests.map(req => (
                                <tr key={req.id}>
                                    <td>
                                        <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{req.shopName}</div>
                                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>/v/{req.shopSlug}</div>
                                    </td>
                                    <td style={{ fontWeight: '500' }}>{req.kycRealName}</td>
                                    <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{req.kycIdNumber}</td>
                                    <td>
                                        <button 
                                            onClick={() => openPreview(req.kycPhotoFile)}
                                            style={{
                                                padding: '6px 12px', background: 'rgba(59,130,246,0.1)', color: '#3b82f6',
                                                border: 'none', borderRadius: '4px', fontSize: '0.78rem', cursor: 'pointer', fontWeight: '500'
                                            }}
                                        >
                                            🔎 预览手持合照
                                        </button>
                                    </td>
                                    <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                                        {new Date(req.kycRequestedAt).toLocaleString()}
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button
                                                disabled={auditingId !== null}
                                                onClick={() => {
                                                    if (window.confirm(`确定通过该商户的实名核验吗？通过后系统将立即物理销毁对应的身份证照片。`)) {
                                                        handleAudit(req.id, 'APPROVE')
                                                    }
                                                }}
                                                style={{
                                                    padding: '6px 12px', background: '#10b981', color: '#fff',
                                                    border: 'none', borderRadius: '4px', fontSize: '0.78rem', cursor: 'pointer', fontWeight: '600'
                                                }}
                                            >
                                                通过
                                            </button>
                                            <button
                                                disabled={auditingId !== null}
                                                onClick={() => setRejectingRequest(req)}
                                                style={{
                                                    padding: '6px 12px', background: '#ef4444', color: '#fff',
                                                    border: 'none', borderRadius: '4px', fontSize: '0.78rem', cursor: 'pointer', fontWeight: '600'
                                                }}
                                            >
                                                拒绝
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* 预览照片 Modal */}
            {previewPhoto && (
                <div 
                    onClick={() => setPreviewPhoto(null)}
                    style={{
                        position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                        background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        zIndex: 9999, padding: '20px'
                    }}
                >
                    <div 
                        onClick={e => e.stopPropagation()}
                        style={{
                            background: 'var(--bg-card)', padding: '24px', borderRadius: '12px',
                            maxWidth: '700px', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center',
                            border: '1px solid var(--border-color)', position: 'relative'
                        }}
                    >
                        <button 
                            onClick={() => setPreviewPhoto(null)}
                            style={{
                                position: 'absolute', top: '12px', right: '12px', background: 'none', border: 'none',
                                color: 'var(--text-secondary)', fontSize: '1.2rem', cursor: 'pointer'
                            }}
                        >
                            ✕
                        </button>
                        <h3 style={{ margin: '0 0 16px 0', color: 'var(--text-primary)' }}>证件及手持字条预览 (已加防伪水印)</h3>
                        
                        <div style={{ width: '100%', maxHeight: '70vh', overflowY: 'auto', textAlign: 'center', background: '#000', borderRadius: '6px', padding: '10px' }}>
                            <img 
                                src={`/api/man/kyc/file/${previewPhoto}?token=${token}`} // Query token as fallback if headers are not applicable in img src
                                onError={(e) => {
                                    // Try loading with headers by using fetch to blob url if direct query token gets blocked
                                    fetch(`/api/man/kyc/file/${previewPhoto}`, { headers: { Authorization: `Bearer ${token}` } })
                                        .then(r => r.blob())
                                        .then(blob => {
                                            e.target.src = URL.createObjectURL(blob)
                                        })
                                        .catch(() => {
                                            toast.error('图片加载失败，请检查登录会话')
                                        })
                                }}
                                alt="Watermarked ID" 
                                style={{ maxWidth: '100%', maxHeight: '60vh', objectFit: 'contain' }}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* 拒绝说明 Modal */}
            {rejectingRequest && (
                <div 
                    onClick={() => setRejectingRequest(null)}
                    style={{
                        position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                        background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        zIndex: 9999, padding: '20px'
                    }}
                >
                    <form 
                        onSubmit={(e) => {
                            e.preventDefault()
                            if (!rejectReason.trim()) return toast.error('请输入拒绝原因')
                            handleAudit(rejectingRequest.id, 'REJECT', rejectReason.trim())
                        }}
                        onClick={e => e.stopPropagation()}
                        style={{
                            background: 'var(--bg-card)', padding: '24px', borderRadius: '12px',
                            maxWidth: '450px', width: '100%', border: '1px solid var(--border-color)',
                            position: 'relative'
                        }}
                    >
                        <h3 style={{ margin: '0 0 8px 0', color: 'var(--text-primary)' }}>拒绝实名核验申请</h3>
                        <p style={{ margin: '0 0 16px 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                            商户: <b>{rejectingRequest.shopName}</b>. 拒绝后系统会立即彻底删除该商户上传的证件照。
                        </p>

                        <div className="ts-form-group" style={{ marginBottom: '20px' }}>
                            <label style={{ fontSize: '0.84rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '8px', display: 'block' }}>
                                请填写拒绝原因
                            </label>
                            <textarea
                                placeholder="例如：手持证件不清晰，请确保身份证上的文字号码及手持便签日期无任何遮挡和反光。"
                                value={rejectReason}
                                onChange={e => setRejectReason(e.target.value)}
                                required
                                rows={4}
                                style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.88rem', resize: 'vertical' }}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                            <button 
                                type="button" 
                                onClick={() => setRejectingRequest(null)}
                                style={{
                                    padding: '8px 16px', background: 'var(--bg-tertiary)', color: 'var(--text-primary)',
                                    border: '1px solid var(--border-color)', borderRadius: '6px', cursor: 'pointer'
                                }}
                            >
                                取消
                            </button>
                            <button 
                                type="submit"
                                style={{
                                    padding: '8px 20px', background: '#ef4444', color: '#fff',
                                    border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600'
                                }}
                            >
                                确定拒绝
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    )
}

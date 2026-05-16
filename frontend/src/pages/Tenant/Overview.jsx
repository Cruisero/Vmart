import { useState, useEffect } from 'react'

const API = import.meta.env.VITE_API_URL || '/api'

export default function TenantOverview({ tenant, token }) {
    const [stats, setStats] = useState(null)

    useEffect(() => {
        if (!tenant) return
        fetch(`${API}/tenant/stats`, { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.json()).then(d => setStats(d.stats)).catch(() => {})
    }, [tenant])

    if (!tenant) return (
        <div className="tenant-empty">
            <div className="tenant-empty-icon">🏪</div>
            <div className="tenant-empty-title">欢迎使用商城后台</div>
            <div className="tenant-empty-desc">请先前往「开通配置」完成商城设置并提交审核</div>
        </div>
    )

    const statusMap = {
        PENDING: { color: '#F59E0B', tip: '请前往「开通配置」填写基本信息并提交审核申请。' },
        REVIEWING: { color: '#60A5FA', tip: '您的申请正在审核中，我们将在 1-3 个工作日内处理并发送邮件通知。' },
        ACTIVE: { color: '#10B981', tip: '商城已开通，您可以管理商品和订单。' },
        SUSPENDED: { color: '#EF4444', tip: '商城已被暂停，请联系平台客服。' },
        REJECTED: { color: '#EF4444', tip: `审核未通过：${tenant.reviewNote || '请检查配置后重新提交'}` },
    }
    const s = statusMap[tenant.status] || statusMap.PENDING

    return (
        <div>
            <div className="tenant-page-title">📊 概览</div>

            {/* 状态提示 */}
            <div className="tenant-alert" style={{ borderColor: s.color + '44', background: s.color + '18', color: s.color, marginBottom: 24 }}>
                <span style={{ fontSize: '1.1rem' }}>
                    {tenant.status === 'ACTIVE' ? '✅' : tenant.status === 'REVIEWING' ? '⏳' : tenant.status === 'REJECTED' ? '❌' : '📋'}
                </span>
                <span>{s.tip}</span>
            </div>

            {/* 统计卡片 */}
            <div className="tenant-stats-grid">
                {[
                    { label: '已完成订单', value: stats?.totalOrders ?? '—', sub: '历史累计', icon: '✅' },
                    { label: '今日订单', value: stats?.todayOrders ?? '—', sub: '今天', icon: '📅' },
                    { label: '总收入', value: stats ? `¥${stats.totalRevenue.toFixed(2)}` : '—', sub: '已完成订单', icon: '💰' },
                    { label: '在售商品', value: stats?.productCount ?? '—', sub: '已上架', icon: '📦' },
                    { label: '剩余卡密', value: stats?.cardCount ?? '—', sub: '可用库存', icon: '🎴' },
                ].map((item, i) => (
                    <div key={i} className="tenant-stat-card">
                        <div className="tenant-stat-label">{item.icon} {item.label}</div>
                        <div className="tenant-stat-value">{item.value}</div>
                        <div className="tenant-stat-sub">{item.sub}</div>
                    </div>
                ))}
            </div>

            {/* 快捷操作 */}
            <div className="tenant-card">
                <div className="tenant-card-title">🚀 快捷操作</div>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <a href="/tenant/setup" className="tenant-btn tenant-btn-secondary">⚙️ 开通配置</a>
                    <a href="/tenant/products" className="tenant-btn tenant-btn-secondary">📦 管理商品</a>
                    <a href="/tenant/orders" className="tenant-btn tenant-btn-secondary">🧾 查看订单</a>
                    <a href="/tenant/settings" className="tenant-btn tenant-btn-secondary">🔧 店铺设置</a>
                    {tenant.status === 'ACTIVE' && tenant.domains?.[0] && (
                        <a href={`https://${tenant.domains[0].domain}`} target="_blank" rel="noopener noreferrer" className="tenant-btn tenant-btn-success">
                            🔗 访问商城
                        </a>
                    )}
                </div>
            </div>

            {/* 商城信息 */}
            <div className="tenant-card">
                <div className="tenant-card-title">🏪 商城信息</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px' }}>
                    {[
                        ['店铺名称', tenant.shopName],
                        ['访问路径', `/t/${tenant.shopSlug}`],
                        ['皮肤主题', tenant.shopSkin],
                        ['联系邮箱', tenant.contactEmail || '未填写'],
                        ['绑定域名', tenant.domains?.[0]?.domain || '未绑定'],
                        ['创建时间', new Date(tenant.createdAt).toLocaleDateString()],
                    ].map(([k, v]) => (
                        <div key={k}>
                            <div style={{ fontSize: '0.72rem', color: 'var(--tenant-muted)', marginBottom: 2 }}>{k}</div>
                            <div style={{ fontSize: '0.88rem' }}>{v}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

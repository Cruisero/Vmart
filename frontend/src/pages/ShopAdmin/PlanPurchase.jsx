import { useState, useEffect } from 'react'
import { useMerchantStore } from '../../store/merchantStore'
import './PlanPurchase.css'

const PLAN_LABELS = { FREE: '免费试用', BASIC: '基础版', STANDARD: '标准版', PRO: '专业版' }
const STATUS_MAP = {
    PENDING: { label: '待支付', color: 'var(--warning, #f59e0b)' },
    REVIEWING: { label: '审核中', color: 'var(--info, #3b82f6)' },
    PAID: { label: '已完成', color: 'var(--success, #10b981)' },
    REJECTED: { label: '已拒绝', color: 'var(--error, #ef4444)' }
}

export default function PlanPurchase() {
    const { token } = useMerchantStore()
    const [step, setStep] = useState('select')
    const [plans, setPlans] = useState([])
    const [selectedPlan, setSelectedPlan] = useState('STANDARD')
    const [months, setMonths] = useState(1)
    const [paymentMethod, setPaymentMethod] = useState('usdt')
    const [paymentInfo, setPaymentInfo] = useState(null)
    const [loading, setLoading] = useState(false)
    const [orders, setOrders] = useState([])
    const [msg, setMsg] = useState('')

    useEffect(() => {
        fetch('/api/platform/plans').then(r => r.json()).then(d => setPlans(d.plans || []))
        loadOrders()
    }, [])

    const loadOrders = () => {
        fetch('/api/platform/plan/orders', { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.json()).then(d => setOrders(d.orders || []))
    }

    const handleBuy = async () => {
        if (!selectedPlan) return
        setLoading(true); setMsg('')
        try {
            const res = await fetch('/api/platform/plan/buy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ plan: selectedPlan, months, paymentMethod })
            })
            const data = await res.json()
            if (!res.ok) { setMsg(`❌ ${data.error}`); return }
            setPaymentInfo(data)
            setStep('pay')
        } catch { setMsg('❌ 网络错误') }
        finally { setLoading(false) }
    }

    // 轮询支付状态
    useEffect(() => {
        if (step !== 'pay' || !paymentInfo?.orderNo) return
        const interval = setInterval(async () => {
            try {
                const res = await fetch(`/api/platform/plan/check/${paymentInfo.orderNo}`, {
                    headers: { Authorization: `Bearer ${token}` }
                })
                const data = await res.json()
                if (data.status === 'paid') {
                    setMsg('✅ 支付成功，套餐已激活！')
                    setStep('select')
                    setPaymentInfo(null)
                    loadOrders()
                    clearInterval(interval)
                } else if (data.status === 'cancelled') {
                    setMsg('❌ 订单已取消')
                    setStep('select')
                    setPaymentInfo(null)
                    clearInterval(interval)
                }
            } catch {}
        }, 5000) // 每 5 秒检查一次
        return () => clearInterval(interval)
    }, [step, paymentInfo?.orderNo, token])

    // 15 分钟倒计时
    const [countdown, setCountdown] = useState(15 * 60)
    useEffect(() => {
        if (step !== 'pay') { setCountdown(15 * 60); return }
        const timer = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(timer)
                    // 自动取消
                    fetch(`/api/orders/${paymentInfo?.orderNo}/cancel`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } }).catch(() => {})
                    setMsg('⏰ 订单已超时自动取消')
                    setStep('select')
                    setPaymentInfo(null)
                    loadOrders()
                    return 0
                }
                return prev - 1
            })
        }, 1000)
        return () => clearInterval(timer)
    }, [step, paymentInfo?.orderNo])

    const formatCountdown = (s) => {
        const m = Math.floor(s / 60)
        const sec = s % 60
        return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
    }

    const currentPlan = plans.find(p => p.key === selectedPlan)
    const pricePerMonth = currentPlan ? (months >= 12 ? currentPlan.yearlyPrice : currentPlan.monthlyPrice) : 0
    const totalAmount = pricePerMonth * months

    // ─── 选择套餐 ───
    if (step === 'select') {
        return (
            <div className="pp2">
                {msg && <div className="pp2-msg">{msg}</div>}

                {/* 套餐选择卡片 */}
                <div className="pp2-plans">
                    {plans.map(plan => (
                        <div
                            key={plan.key}
                            className={`pp2-plan ${selectedPlan === plan.key ? 'active' : ''}`}
                            onClick={() => setSelectedPlan(plan.key)}
                        >
                            {plan.key === 'PRO' && <div className="pp2-plan-tag">推荐</div>}
                            <div className="pp2-plan-name">{plan.name}</div>
                            <div className="pp2-plan-price">
                                ¥{months >= 12 ? plan.yearlyPrice : plan.monthlyPrice}<span>/月</span>
                            </div>
                            <div className="pp2-plan-features">
                                <div>商品：{plan.features.maxProducts === -1 ? '无限' : plan.features.maxProducts + ' 个'}</div>
                                <div>订单：无限</div>
                                <div>{plan.features.customDomain ? '✓' : '✗'} 自定义域名</div>
                                <div>{plan.features.agentSystem ? '✓' : '✗'} 代理商系统</div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* 购买配置 */}
                <div className="pp2-config">
                    <div className="pp2-row">
                        <span className="pp2-label">购买时长</span>
                        <div className="pp2-options">
                            {[1, 3, 6, 12].map(m => (
                                <button key={m} className={`pp2-opt ${months === m ? 'active' : ''}`} onClick={() => setMonths(m)}>
                                    {m} 个月{m >= 12 ? ' (8折)' : ''}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="pp2-row">
                        <span className="pp2-label">支付方式</span>
                        <div className="pp2-options">
                            {[
                                { id: 'usdt', label: 'USDT-TRC20' },
                                { id: 'bsc_usdt', label: 'USDT-BEP20' },
                                { id: 'alipay', label: '支付宝' }
                            ].map(m => (
                                <button key={m.id} className={`pp2-opt ${paymentMethod === m.id ? 'active' : ''}`} onClick={() => setPaymentMethod(m.id)}>
                                    {m.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="pp2-total-row">
                        <span>合计</span>
                        <span className="pp2-total">¥{totalAmount}</span>
                    </div>
                    <button className="pp2-buy" onClick={handleBuy} disabled={loading || !selectedPlan}>
                        {loading ? '处理中...' : `立即购买 ¥${totalAmount}`}
                    </button>
                </div>

                {/* 购买记录入口 */}
                {orders.length > 0 && (
                    <button className="pp2-history-link" onClick={() => setStep('history')}>
                        📋 查看购买记录 ({orders.length})
                    </button>
                )}
            </div>
        )
    }

    // ─── 支付信息 ───
    if (step === 'pay' && paymentInfo) {
        return (
            <div className="pp2">
                {msg && <div className="pp2-msg">{msg}</div>}
                <div className="pp2-pay-card">
                    <div className="pp2-pay-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>请完成支付</span>
                        <span style={{
                            fontSize: '0.85rem', fontWeight: 700, fontFamily: 'monospace',
                            color: countdown < 120 ? 'var(--error, #ef4444)' : 'var(--text-muted, #64748b)',
                            background: countdown < 120 ? 'rgba(239,68,68,0.08)' : 'var(--bg-tertiary, #f1f5f9)',
                            padding: '4px 10px', borderRadius: 6
                        }}>
                            ⏱ {formatCountdown(countdown)}
                        </span>
                    </div>
                    <div className="pp2-pay-info">
                        <div><span>套餐</span><span>{PLAN_LABELS[paymentInfo.plan]} × {paymentInfo.months} 个月</span></div>
                        <div><span>金额</span><strong>¥{paymentInfo.amount}</strong></div>
                        {(paymentInfo.paymentType === 'usdt' || paymentInfo.paymentType === 'bsc_usdt') && (
                            <div><span>USDT</span><strong>{paymentInfo.usdtAmount} USDT</strong></div>
                        )}
                    </div>

                    {paymentInfo.paymentType === 'qrcode' && paymentInfo.qrCode && (
                        <div className="pp2-pay-addr">
                            <label>请使用支付宝扫描二维码支付</label>
                            <div style={{ textAlign: 'center', padding: '16px 0' }}>
                                <img src={paymentInfo.qrCode} alt="支付二维码" style={{ maxWidth: 200, borderRadius: 8 }} />
                            </div>
                        </div>
                    )}

                    {(paymentInfo.paymentType === 'usdt' || paymentInfo.paymentType === 'bsc_usdt') && (
                        <div className="pp2-pay-addr">
                            <label>请转账精确金额到以下地址</label>
                            <div style={{ textAlign: 'center', padding: '16px 0' }}>
                                <img
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(paymentInfo.walletAddress)}`}
                                    alt="收款地址二维码"
                                    style={{ width: 180, height: 180, borderRadius: 8, border: '1px solid var(--border-color, #e2e8f0)' }}
                                />
                            </div>
                            <div className="pp2-addr-box">
                                <code>{paymentInfo.walletAddress}</code>
                                <button onClick={() => { navigator.clipboard.writeText(paymentInfo.walletAddress); setMsg('✅ 已复制') }}>复制</button>
                            </div>
                            <div style={{ marginTop: 8, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                                转账金额：<strong style={{ color: 'var(--primary)' }}>{paymentInfo.usdtAmount} USDT</strong>（请精确到小数）
                            </div>
                        </div>
                    )}

                    <div className="pp2-note" style={{ marginTop: 16, padding: '12px 16px', background: 'var(--bg-tertiary, #f1f5f9)', borderRadius: 8, textAlign: 'left' }}>
                        ⏳ 系统正在自动检测支付状态，支付完成后将自动激活套餐...
                    </div>

                    <button
                        onClick={async () => {
                            try {
                                await fetch(`/api/orders/${paymentInfo.orderNo}/cancel`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
                                setMsg('订单已取消')
                                setStep('select')
                                setPaymentInfo(null)
                                loadOrders()
                            } catch {}
                        }}
                        style={{
                            marginTop: 16, width: '100%',
                            background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)',
                            borderRadius: 'var(--radius-sm, 8px)', padding: '10px',
                            color: 'var(--error, #ef4444)', fontSize: '0.84rem', fontWeight: 600,
                            cursor: 'pointer', fontFamily: 'inherit'
                        }}
                    >
                        取消订单
                    </button>
                </div>
                <button className="pp2-back" style={{ marginTop: 12 }} onClick={() => { setStep('select'); setPaymentInfo(null) }}>← 返回</button>
            </div>
        )
    }

    // ─── 购买记录 ───
    return (
        <div className="pp2">
            <div className="pp2-history-header">
                <span className="pp2-history-title">购买记录</span>
                <button className="pp2-back" onClick={() => setStep('select')}>← 返回</button>
            </div>
            {orders.length === 0 ? (
                <div className="pp2-empty">暂无记录</div>
            ) : (
                <div className="pp2-orders">
                    {orders.map(o => (
                        <div key={o.id} className="pp2-order">
                            <div className="pp2-order-left">
                                <span className="pp2-order-plan">{PLAN_LABELS[o.plan] || o.plan}</span>
                                <span className="pp2-order-detail">× {o.months} 个月</span>
                            </div>
                            <div className="pp2-order-right">
                                <span className="pp2-order-amount">¥{parseFloat(o.amount)}</span>
                                <span className="pp2-order-status" style={{ color: STATUS_MAP[o.paymentStatus]?.color }}>
                                    {STATUS_MAP[o.paymentStatus]?.label || o.paymentStatus}
                                </span>
                                <span className="pp2-order-time">{new Date(o.createdAt).toLocaleDateString()}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

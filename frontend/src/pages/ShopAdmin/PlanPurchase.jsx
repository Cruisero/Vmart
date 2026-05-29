import { useState, useEffect } from 'react'
import { useMerchantStore } from '../../store/merchantStore'
import { useAuthStore } from '../../store/authStore'
import './PlanPurchase.css'

const PLAN_LABELS = { FREE: '免费试用', BASIC: '基础版', STANDARD: '标准版', PRO: '专业版' }
const STATUS_MAP = {
    PENDING: { label: '待支付', color: 'var(--warning, #f59e0b)' },
    REVIEWING: { label: '审核中', color: 'var(--info, #3b82f6)' },
    PAID: { label: '已完成', color: 'var(--success, #10b981)' },
    REJECTED: { label: '已拒绝', color: 'var(--error, #ef4444)' }
}

const getPlanFeaturesList = (plan) => {
    const f = plan.features || {}
    const list = []

    // 1. 商品数量
    if (f.maxProducts === -1) {
        list.push({ text: '商品数量不限', included: true })
    } else if (f.maxProducts > 0) {
        list.push({ text: `最多 ${f.maxProducts} 个商品`, included: true })
    } else {
        list.push({ text: '不支持商品上架', included: false })
    }

    // 2. 皮肤
    if (f.skins === '全部') {
        list.push({ text: '全部主题和皮肤解锁', included: true })
    } else if (f.skins) {
        list.push({ text: `${f.skins}皮肤支持`, included: true })
    } else {
        list.push({ text: '1 套精美皮肤', included: true })
    }

    // 3. 自定义域名
    list.push({ text: '自定义独立域名', included: !!f.customDomain })

    // 4. 代理商分销系统
    list.push({ text: '代理商分销系统', included: !!f.agentSystem })

    // 5. 邮件通知配额
    if (f.emailNotifications === -1) {
        list.push({ text: '邮件通知不限', included: true })
    } else if (f.emailNotifications > 0) {
        list.push({ text: `邮件通知 ${f.emailNotifications.toLocaleString()} 封/月`, included: true })
    } else {
        list.push({ text: '邮件通知功能', included: false })
    }

    // 6. 子管理员上限
    if (f.maxSubAdmins === -1) {
        list.push({ text: '子管理员不限', included: true })
    } else if (f.maxSubAdmins > 0) {
        list.push({ text: `${f.maxSubAdmins} 个子管理员`, included: true })
    } else {
        list.push({ text: '协作子管理员', included: false })
    }

    // 7. 工单管理系统
    list.push({ text: '客服工单管理系统', included: !!f.customerTickets || f.support === true })

    // 8. 平台专属技术支持
    list.push({ text: '平台专属技术支持', included: f.support === true })

    // 9. 卡密自动发货
    list.push({ text: '卡密秒级自动发货', included: true })

    // 10. 多种支付方式集成
    list.push({ text: '支付宝/USDT集成支付', included: true })

    return list
}

export default function PlanPurchase() {
    const { token: mToken } = useMerchantStore()
    const { token: aToken } = useAuthStore()
    const token = aToken || mToken
    const [step, setStep] = useState('select')
    const [plans, setPlans] = useState([])
    const [selectedPlan, setSelectedPlan] = useState('STANDARD')
    const [months, setMonths] = useState(1)
    const [paymentMethod, setPaymentMethod] = useState('usdt')
    const [paymentInfo, setPaymentInfo] = useState(null)
    const [loading, setLoading] = useState(false)
    const [orders, setOrders] = useState([])
    const [msg, setMsg] = useState('')
    const [isPaid, setIsPaid] = useState(false)

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
        setLoading(true); setMsg(''); setIsPaid(false)
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
                    setIsPaid(true)
                    setMsg('✅ 支付成功，套餐已激活！')
                    loadOrders()
                    clearInterval(interval)
                } else if (data.status === 'cancelled') {
                    setMsg('❌ 订单已取消')
                    setStep('select')
                    setPaymentInfo(null)
                    setIsPaid(false)
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
                    {plans.map(plan => {
                        const featuresList = getPlanFeaturesList(plan)
                        return (
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
                                <ul className="pp2-plan-features">
                                    {featuresList.map((feat, idx) => (
                                        <li key={idx} className={!feat.included ? 'not-included' : ''}>
                                            <span className="feature-check">{feat.included ? '✓' : '×'}</span>
                                            {feat.text}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )
                    })}
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
        if (isPaid) {
            return (
                <div className="pp2">
                    <div className="pp2-success-card">
                        <div className="pp2-success-icon">✓</div>
                        <h3 className="pp2-success-title">订阅成功！</h3>
                        <p className="pp2-success-subtitle">您的套餐已激活，立即享受所有专属权益！</p>
                        
                        <div className="pp2-success-details">
                            <div className="pp2-success-row">
                                <span>订单号</span>
                                <code>{paymentInfo.orderNo}</code>
                            </div>
                            <div className="pp2-success-row">
                                <span>订阅套餐</span>
                                <strong>{PLAN_LABELS[paymentInfo.plan]}</strong>
                            </div>
                            <div className="pp2-success-row">
                                <span>订阅时长</span>
                                <span>{paymentInfo.months} 个月</span>
                            </div>
                            <div className="pp2-success-row">
                                <span>支付金额</span>
                                <span className="pp2-success-amount">¥{paymentInfo.amount}</span>
                            </div>
                        </div>

                        <button 
                            className="pp2-success-btn"
                            onClick={() => {
                                setIsPaid(false)
                                setPaymentInfo(null)
                                setStep('select')
                                setMsg('')
                            }}
                        >
                            完成
                        </button>
                    </div>
                </div>
            )
        }

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
                                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(paymentInfo.qrCode)}`} alt="支付二维码" style={{ maxWidth: 200, borderRadius: 8 }} />
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
                                setIsPaid(false)
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
                <button className="pp2-back" style={{ marginTop: 12 }} onClick={() => { setStep('select'); setPaymentInfo(null); setIsPaid(false) }}>← 返回</button>
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

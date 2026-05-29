import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'

export default function WalletSettings({ token, L }) {
    const [wallet, setWallet] = useState(null)
    const [loading, setLoading] = useState(true)
    
    // 提现账号绑定表单
    const [bindForm, setBindForm] = useState({ method: 'alipay', account: '' })
    const [binding, setBinding] = useState(false)
    
    // 提现表单
    const [withdrawForm, setWithdrawForm] = useState({ amount: '', method: 'alipay' })
    const [withdrawing, setWithdrawing] = useState(false)

    // 提现历史和账本流水
    const [subTab, setSubTab] = useState('logs') // logs | withdrawals
    const [withdrawals, setWithdrawals] = useState([])
    const [balanceLogs, setBalanceLogs] = useState([])
    const [logPage, setLogPage] = useState(1)
    const [logTotalPages, setLogTotalPages] = useState(1)

    const loadWallet = async () => {
        try {
            const res = await fetch('/api/tenant/wallet/profile', {
                headers: { Authorization: `Bearer ${token}` }
            })
            const data = await res.json()
            if (res.ok) {
                setWallet(data.wallet)
                // 默认选中第一个已绑定的通道，或默认 alipay
                const accounts = data.wallet.withdrawAccounts || {}
                const boundMethods = Object.keys(accounts)
                if (boundMethods.length > 0) {
                    setWithdrawForm(f => ({ ...f, method: boundMethods[0] }))
                }
            } else {
                toast.error(data.error || '获取钱包信息失败')
            }
        } catch {
            toast.error('网络错误，请稍后重试')
        } finally {
            setLoading(false)
        }
    }

    const loadWithdrawals = async () => {
        try {
            const res = await fetch('/api/tenant/wallet/withdrawals', {
                headers: { Authorization: `Bearer ${token}` }
            })
            const data = await res.json()
            if (res.ok) {
                setWithdrawals(data.withdrawals || [])
            }
        } catch {}
    }

    const loadBalanceLogs = async (page = 1) => {
        try {
            const res = await fetch(`/api/tenant/wallet/balance-logs?page=${page}&limit=10`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            const data = await res.json()
            if (res.ok) {
                setBalanceLogs(data.logs || [])
                setLogPage(data.page)
                setLogTotalPages(data.totalPages || 1)
            }
        } catch {}
    }

    useEffect(() => {
        loadWallet()
        loadWithdrawals()
        loadBalanceLogs(1)
    }, [token])

    const handleBind = async (e) => {
        e.preventDefault()
        if (!bindForm.account.trim()) {
            return toast.error('请输入收款账号或地址')
        }
        setBinding(true)
        try {
            const res = await fetch('/api/tenant/wallet/withdraw-accounts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(bindForm)
            })
            const data = await res.json()
            if (res.ok) {
                toast.success('收款账号保存成功')
                setBindForm(f => ({ ...f, account: '' }))
                loadWallet()
            } else {
                toast.error(data.error || '保存失败')
            }
        } catch {
            toast.error('网络错误')
        } finally {
            setBinding(false)
        }
    }

    const handleWithdraw = async (e) => {
        e.preventDefault()
        const amount = parseFloat(withdrawForm.amount)
        if (isNaN(amount) || amount <= 0) {
            return toast.error('请输入有效的提现金额')
        }
        if (amount < 100) {
            return toast.error('最低提现金额为 ¥100')
        }
        const singleLimit = wallet.kycProgressiveSingleLimit || 1000
        if (!kycVerified && amount > singleLimit) {
            return toast.error(`未实名认证账户单笔最高提现限额为 ¥${singleLimit} 元，大额提现请先完成实名认证`)
        }
        
        setWithdrawing(true)
        try {
            const res = await fetch('/api/tenant/wallet/withdraw', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    amount,
                    method: withdrawForm.method
                })
            })
            const data = await res.json()
            if (res.ok) {
                toast.success('提现申请提交成功，请等待平台打款')
                setWithdrawForm(f => ({ ...f, amount: '' }))
                loadWallet()
                loadWithdrawals()
                loadBalanceLogs(1)
            } else {
                toast.error(data.error || '提现失败')
            }
        } catch {
            toast.error('网络连接错误')
        } finally {
            setWithdrawing(false)
        }
    }

    if (loading || !wallet) {
        return <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>正在加载钱包数据...</div>
    }

    const withdrawAccounts = wallet.withdrawAccounts || {}
    const kycVerified = wallet.kycStatus === 'VERIFIED'

    const METHOD_LABELS = {
        alipay: '支付宝',
        usdt_trc20: 'USDT (TRC20)',
        usdt_bep20: 'USDT (BEP20)'
    }

    const LOG_TYPE_LABELS = {
        INCOME: '订单入账',
        WITHDRAW: '提现扣减',
        REFUND: '退款扣减',
        REJECT: '提现退回',
        ADJUST: '手动调账'
    }

    return (
        <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-primary)', margin: '0 0 4px 0' }}>💰 资金余额与提现结算</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0 0 24px 0' }}>管理您的平台代收资金流水，设置结算通道并申请提现</p>

            {/* 1. 资金卡片网格 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '18px' }}>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontWeight: '500' }}>可用余额</div>
                    <div style={{ fontSize: '1.6rem', fontWeight: '750', color: '#10b981', marginTop: '6px' }}>¥ {wallet.balance.toFixed(2)}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '8px' }}>达到最低 ¥100 即可发起提现</div>
                </div>
                <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '18px' }}>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontWeight: '500' }}>冻结中余额</div>
                    <div style={{ fontSize: '1.6rem', fontWeight: '750', color: '#f59e0b', marginTop: '6px' }}>¥ {wallet.frozenBalance.toFixed(2)}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '8px' }}>已发起的提现或处于争议期内的资金</div>
                </div>
                <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '18px' }}>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontWeight: '500' }}>专属代收费率</div>
                    <div style={{ fontSize: '1.6rem', fontWeight: '750', color: 'var(--text-primary)', marginTop: '6px' }}>{(wallet.feeRate * 100).toFixed(1)} %</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '8px' }}>使用平台代收通道收银的扣点费率</div>
                </div>
                <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '18px' }}>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontWeight: '500' }}>累计结算销售额</div>
                    <div style={{ fontSize: '1.6rem', fontWeight: '750', color: 'var(--text-primary)', marginTop: '6px' }}>¥ {wallet.totalSales.toFixed(2)}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '8px' }}>平台成功代收并记账的总流水金额</div>
                </div>
            </div>

            {/* 2. KYC 提醒栏 */}
            {!kycVerified && (
                <div style={{ background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.2)', color: '#3b82f6', padding: '12px 16px', borderRadius: '8px', fontSize: '0.82rem', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>💡</span>
                    <div>
                        <b>渐进式实名核验 (Progressive KYC)：</b>您的账号当前实名状态为 <b>{wallet.kycStatus === 'PENDING' ? '待审核' : wallet.kycStatus === 'REJECTED' ? '已拒绝' : '未验证'}</b>。
                        目前您处于<b>小额快捷提现阶段</b>（单笔提现限额 ¥{wallet.kycProgressiveSingleLimit || 1000} 元，累计总限额 ¥{wallet.kycProgressiveCumulativeLimit || 3000} 元）。如果您希望提现更大金额或获取无限提现额度，请前往<b>“实名认证”</b>标签页完成核验。
                    </div>
                </div>
            )}

            {/* 3. 配置与申请板块 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '32px' }}>
                
                {/* 提现通道绑定 */}
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px' }}>
                    <h4 style={{ margin: '0 0 16px 0', fontSize: '0.9rem', color: 'var(--text-primary)' }}>🛠️ 配置提现收款账号</h4>
                    <form onSubmit={handleBind} className="ts-form" style={{ gap: '14px' }}>
                        <div className="ts-form-group">
                            <label>选择渠道</label>
                            <select 
                                value={bindForm.method} 
                                onChange={e => setBindForm(f => ({ ...f, method: e.target.value }))}
                                style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', outline: 'none' }}
                            >
                                <option value="alipay">支付宝</option>
                                <option value="usdt_trc20">USDT (TRC20)</option>
                                <option value="usdt_bep20">USDT (BEP20)</option>
                            </select>
                        </div>
                        <div className="ts-form-group">
                            <label>收款账号/钱包地址</label>
                            <input 
                                type="text"
                                value={bindForm.account} 
                                onChange={e => setBindForm(f => ({ ...f, account: e.target.value }))}
                                placeholder="输入对应方式的账号/钱包地址..." 
                                style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', outline: 'none' }}
                            />
                        </div>
                        <button type="submit" className="ts-btn-primary" disabled={binding} style={{ padding: '8px 16px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: '600' }}>
                            {binding ? '正在保存...' : '保存此账号'}
                        </button>
                    </form>
                    
                    <div style={{ marginTop: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '8px' }}>已绑定收款方式：</div>
                        {Object.keys(withdrawAccounts).length === 0 ? (
                            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>暂无绑定的收款账号</div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {Object.entries(withdrawAccounts).map(([method, acc]) => (
                                    <div key={method} style={{ display: 'flex', justifyContent: 'space-between', background: 'var(--bg-secondary)', padding: '8px 12px', borderRadius: '6px', fontSize: '0.76rem', border: '1px solid var(--border-color)' }}>
                                        <span style={{ fontWeight: '500', color: 'var(--text-primary)' }}>{METHOD_LABELS[method]}</span>
                                        <span style={{ fontFamily: 'monospace', color: 'var(--text-muted)' }}>{acc}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* 发起提现申请 */}
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px' }}>
                    <h4 style={{ margin: '0 0 16px 0', fontSize: '0.9rem', color: 'var(--text-primary)' }}>💸 发起提现申请</h4>
                    <form onSubmit={handleWithdraw} className="ts-form" style={{ gap: '14px' }}>
                        <div className="ts-form-group">
                            <label>提现金额</label>
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                <span style={{ position: 'absolute', left: '10px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>¥</span>
                                <input 
                                    type="number" 
                                    step="0.01"
                                    min="100"
                                    value={withdrawForm.amount}
                                    onChange={e => setWithdrawForm(f => ({ ...f, amount: e.target.value }))}
                                    placeholder="起提金额 100 元"
                                    required
                                    style={{ width: '100%', padding: '8px 12px 8px 24px', border: '1px solid var(--border-color)', borderRadius: '6px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', outline: 'none' }}
                                />
                            </div>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>最大可提现金额: ¥ {wallet.balance.toFixed(2)}</span>
                        </div>
                        <div className="ts-form-group">
                            <label>到账渠道 (需先完成绑定)</label>
                            <select 
                                value={withdrawForm.method} 
                                onChange={e => setWithdrawForm(f => ({ ...f, method: e.target.value }))}
                                style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', outline: 'none' }}
                            >
                                {Object.keys(withdrawAccounts).length === 0 ? (
                                    <option value="">请先配置收款账号</option>
                                ) : (
                                    Object.keys(withdrawAccounts).map(method => (
                                        <option key={method} value={method}>{METHOD_LABELS[method]}</option>
                                    ))
                                )}
                            </select>
                        </div>
                        <button 
                            type="submit" 
                            disabled={withdrawing || Object.keys(withdrawAccounts).length === 0}
                            style={{ 
                                width: '100%', padding: '10px 16px', 
                                background: Object.keys(withdrawAccounts).length === 0 ? 'var(--border-color)' : '#10b981', 
                                color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600' 
                            }}
                        >
                            {Object.keys(withdrawAccounts).length === 0 ? '请先绑定收款账号' : (withdrawing ? '提交中...' : '提交提现申请')}
                        </button>
                    </form>
                </div>
            </div>

            {/* 4. 账目及提现历史 Tab 切换 */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px' }}>
                <div style={{ display: 'flex', gap: '16px', borderBottom: '1px solid var(--border-color)', marginBottom: '16px', paddingBottom: '10px' }}>
                    <button 
                        onClick={() => setSubTab('logs')}
                        style={{
                            background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.86rem', fontWeight: '600',
                            color: subTab === 'logs' ? '#3b82f6' : 'var(--text-muted)',
                            borderBottom: subTab === 'logs' ? '2px solid #3b82f6' : 'none',
                            paddingBottom: '6px'
                        }}
                    >
                        📝 资金账本流水
                    </button>
                    <button 
                        onClick={() => setSubTab('withdrawals')}
                        style={{
                            background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.86rem', fontWeight: '600',
                            color: subTab === 'withdrawals' ? '#3b82f6' : 'var(--text-muted)',
                            borderBottom: subTab === 'withdrawals' ? '2px solid #3b82f6' : 'none',
                            paddingBottom: '6px'
                        }}
                    >
                        📋 提现审核记录
                    </button>
                </div>

                {/* 资金账本流水 */}
                {subTab === 'logs' && (
                    <div>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                                        <th style={{ padding: '8px 12px' }}>时间</th>
                                        <th style={{ padding: '8px 12px' }}>类型</th>
                                        <th style={{ padding: '8px 12px' }}>明细金额</th>
                                        <th style={{ padding: '8px 12px' }}>变动后余额</th>
                                        <th style={{ padding: '8px 12px' }}>备注说明</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {balanceLogs.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)' }}>暂无财务资金往来记录</td>
                                        </tr>
                                    ) : (
                                        balanceLogs.map(l => (
                                            <tr key={l.id} style={{ borderBottom: '1px dashed var(--border-color)' }}>
                                                <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>{new Date(l.createdAt).toLocaleString()}</td>
                                                <td style={{ padding: '10px 12px' }}>
                                                    <span style={{
                                                        padding: '2px 6px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: '600',
                                                        background: l.type === 'INCOME' ? 'rgba(16,185,129,0.1)' : 'rgba(107,114,128,0.1)',
                                                        color: l.type === 'INCOME' ? '#10b981' : '#6b7280'
                                                    }}>
                                                        {LOG_TYPE_LABELS[l.type] || l.type}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '10px 12px', fontWeight: '700', color: l.amount > 0 ? '#10b981' : '#ef4444' }}>
                                                    {l.amount > 0 ? `+${l.amount.toFixed(2)}` : l.amount.toFixed(2)}
                                                </td>
                                                <td style={{ padding: '10px 12px', fontWeight: '500' }}>¥ {l.balance.toFixed(2)}</td>
                                                <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>{l.remark}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* 分页 */}
                        {logTotalPages > 1 && (
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
                                <button 
                                    disabled={logPage === 1} 
                                    onClick={() => loadBalanceLogs(logPage - 1)}
                                    style={{ padding: '4px 10px', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', cursor: 'pointer' }}
                                >
                                    上一页
                                </button>
                                <span style={{ fontSize: '0.75rem', alignSelf: 'center', color: 'var(--text-muted)' }}>{logPage} / {logTotalPages}</span>
                                <button 
                                    disabled={logPage === logTotalPages} 
                                    onClick={() => loadBalanceLogs(logPage + 1)}
                                    style={{ padding: '4px 10px', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', cursor: 'pointer' }}
                                >
                                    下一页
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* 提现审核记录 */}
                {subTab === 'withdrawals' && (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                                    <th style={{ padding: '8px 12px' }}>申请时间</th>
                                    <th style={{ padding: '8px 12px' }}>提现方式</th>
                                    <th style={{ padding: '8px 12px' }}>收款账号</th>
                                    <th style={{ padding: '8px 12px' }}>提现金额</th>
                                    <th style={{ padding: '8px 12px' }}>处理状态</th>
                                    <th style={{ padding: '8px 12px' }}>说明备注</th>
                                </tr>
                            </thead>
                            <tbody>
                                {withdrawals.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)' }}>暂无提现申请记录</td>
                                    </tr>
                                ) : (
                                    withdrawals.map(w => (
                                        <tr key={w.id} style={{ borderBottom: '1px dashed var(--border-color)' }}>
                                            <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>{new Date(w.createdAt).toLocaleString()}</td>
                                            <td style={{ padding: '10px 12px' }}>{METHOD_LABELS[w.method] || w.method}</td>
                                            <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: 'var(--text-muted)' }}>{w.account}</td>
                                            <td style={{ padding: '10px 12px', fontWeight: '600' }}>¥ {w.amount.toFixed(2)}</td>
                                            <td style={{ padding: '10px 12px' }}>
                                                <span style={{
                                                    padding: '2px 6px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: '600',
                                                    background: w.status === 'APPROVED' ? 'rgba(16,185,129,0.1)' : w.status === 'PENDING' ? 'rgba(245,158,11,0.1)' : 'rgba(239, 68, 68, 0.1)',
                                                    color: w.status === 'APPROVED' ? '#10b981' : w.status === 'PENDING' ? '#f59e0b' : '#ef4444'
                                                }}>
                                                    {w.status === 'PENDING' ? '审核中' : w.status === 'APPROVED' ? '已通过' : '被驳回'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '10px 12px', color: w.status === 'REJECTED' ? '#ef4444' : 'var(--text-secondary)' }}>
                                                {w.status === 'REJECTED' ? `驳回理由: ${w.rejectReason || '无'}` : (w.processedAt ? `处理时间: ${new Date(w.processedAt).toLocaleString()}` : '等待审核付款')}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}

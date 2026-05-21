const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../frontend/src/pages/Admin/Dashboard/index.jsx');
let content = fs.readFileSync(file, 'utf8');

const startTag = 'function AgentsManage() {';
const startIdx = content.indexOf(startTag);
if (startIdx === -1) {
    console.error('AgentsManage start not found');
    process.exit(1);
}

const endTag = 'function SslApplyButton({ domain, token }) {';
const endIdx = content.indexOf(endTag, startIdx);
if (endIdx === -1) {
    console.error('SslApplyButton start not found');
    process.exit(1);
}

console.log('Replacing AgentsManage from', startIdx, 'to', endIdx);

const prefix = content.slice(0, startIdx);
const suffix = content.slice(endIdx);

const translatedAgents = `function AgentsManage() {
    const { token } = useAuthStore()
    const L = useAdminL()
    const { showToast, showConfirm } = useToast()
    const [agents, setAgents] = useState([])
    const [withdrawals, setWithdrawals] = useState([])
    const [loading, setLoading] = useState(true)
    const [tab, setTab] = useState('agents') // agents | withdrawals | skinPool
    const [skinPool, setSkinPool] = useState([])
    const [expandedAgent, setExpandedAgent] = useState(null)

    useEffect(() => {
        if (tab === 'agents') fetchAgents()
        else if (tab === 'withdrawals') fetchWithdrawals()
        else if (tab === 'skinPool') fetchSkinPool()
    }, [tab])

    const fetchAgents = async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/admin/agents', { headers: { 'Authorization': \`Bearer \${token}\` } })
            const data = await res.json()
            setAgents(data.agents || [])
        } catch { showToast(L('加载失败', 'Load failed'), 'error') }
        setLoading(false)
    }

    const fetchWithdrawals = async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/admin/withdrawals', { headers: { 'Authorization': \`Bearer \${token}\` } })
            const data = await res.json()
            setWithdrawals(data.withdrawals || [])
        } catch { showToast(L('加载失败', 'Load failed'), 'error') }
        setLoading(false)
    }

    const fetchSkinPool = async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/admin/settings', { headers: { 'Authorization': \`Bearer \${token}\` } })
            const data = await res.json()
            const pool = data.settings?.agentSkinPool
            setSkinPool(pool ? JSON.parse(pool) : ['zen'])
        } catch { setSkinPool(['zen']) }
        setLoading(false)
    }

    const updateAgentStatus = async (id, status) => {
        const label = { ACTIVE: L('启用', 'Approve'), SUSPENDED: L('挂起', 'Suspend'), REJECTED: L('拒绝', 'Reject') }[status]
        showConfirm(
            L('确认操作', 'Confirm Action'),
            L(\`确定要\${status === 'ACTIVE' ? '启用' : status === 'SUSPENDED' ? '挂起' : '拒绝'}该代理商吗？\`, \`Are you sure you want to \${status === 'ACTIVE' ? 'approve' : status === 'SUSPENDED' ? 'suspend' : 'reject'} this agent?\`),
            async () => {
                try {
                    await fetch(\`/api/admin/agents/\${id}/status\`, {
                        method: 'PUT',
                        headers: { 'Authorization': \`Bearer \${token}\`, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status })
                    })
                    showToast(L(\`代理商已\${status === 'ACTIVE' ? '启用' : status === 'SUSPENDED' ? '挂起' : '拒绝'}\`, \`Agent has been \${status === 'ACTIVE' ? 'approved' : status === 'SUSPENDED' ? 'suspended' : 'rejected'}\`), 'success')
                    fetchAgents()
                } catch { showToast(L('操作失败', 'Operation failed'), 'error') }
            }
        )
    }

    const processWithdrawal = async (id, status) => {
        showConfirm(
            L('确认操作', 'Confirm Action'),
            L(\`确定要\${status === 'APPROVED' ? '同意' : '拒绝'}该提现申请吗？\`, \`Are you sure you want to \${status === 'APPROVED' ? 'approve' : 'reject'} this withdrawal request?\`),
            async () => {
                try {
                    await fetch(\`/api/admin/withdrawals/\${id}\`, {
                        method: 'PUT',
                        headers: { 'Authorization': \`Bearer \${token}\`, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status })
                    })
                    showToast(L(\`提现已\${status === 'APPROVED' ? '同意' : '拒绝'}\`, \`Withdrawal has been \${status === 'APPROVED' ? 'approved' : 'rejected'}\`), 'success')
                    fetchWithdrawals()
                } catch { showToast(L('操作失败', 'Operation failed'), 'error') }
            }
        )
    }

    const saveSkinPool = async () => {
        try {
            await fetch('/api/admin/settings', {
                method: 'PUT',
                headers: { 'Authorization': \`Bearer \${token}\`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ agentSkinPool: JSON.stringify(skinPool) })
            })
            showToast(L('主题池保存成功', 'Skin pool saved'), 'success')
        } catch { showToast(L('保存失败', 'Save failed'), 'error') }
    }

    const allSkins = [
        { id: 'zen', name: L('极简禅境', 'Zen Minimal'), desc: L('极简风格，最适合单品销售', 'Minimal style, ideal for single products') },
        { id: 'fresh', name: L('清新自然', 'Fresh Clean'), desc: L('侧边栏布局，适合多分类商品', 'Sidebar layout, ideal for multiple categories') },
        { id: 'classic', name: L('经典风范', 'Classic'), desc: L('传统导航栏，全功能支持', 'Traditional navbar, full-featured') }
    ]

    const statusLabel = {
        PENDING: L('等待审核', 'Pending Review'),
        ACTIVE: L('已启用', 'Active'),
        SUSPENDED: L('已挂起', 'Suspended'),
        REJECTED: L('已拒绝', 'Rejected')
    }
    const statusColor = { PENDING: '#F59E0B', ACTIVE: '#10B981', SUSPENDED: '#EF4444', REJECTED: '#6B7280' }
    const wStatusLabel = {
        PENDING: L('待处理', 'Pending'),
        APPROVED: L('已同意', 'Approved'),
        REJECTED: L('已拒绝', 'Rejected')
    }
    const wStatusColor = { PENDING: '#F59E0B', APPROVED: '#10B981', REJECTED: '#EF4444' }

    return (
        <div className="admin-page">
            <div className="page-header">
                <h2>{L('代理商管理', 'Agents')}</h2>
            </div>

            <div className="settings-tabs" style={{ marginBottom: 20 }}>
                <button className={\`tab-btn \${tab === 'agents' ? 'active' : ''}\`} onClick={() => setTab('agents')}>{L('代理商列表', 'Agent List')}</button>
                <button className={\`tab-btn \${tab === 'withdrawals' ? 'active' : ''}\`} onClick={() => setTab('withdrawals')}>{L('提现记录', 'Withdrawals')}</button>
                <button className={\`tab-btn \${tab === 'skinPool' ? 'active' : ''}\`} onClick={() => setTab('skinPool')}>{L('主题池配置', 'Skin Pool')}</button>
            </div>

            {tab === 'agents' && (
                <div className="data-table-wrapper">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>{L('店铺名称', 'Shop Name')}</th>
                                <th>{L('店铺路径', 'Shop Path')}</th>
                                <th>{L('用户', 'User')}</th>
                                <th>{L('商品数', 'Products')}</th>
                                <th>{L('订单数', 'Orders')}</th>
                                <th>{L('余额', 'Balance')}</th>
                                <th>{L('总收益', 'Total Earnings')}</th>
                                <th>{L('状态', 'Status')}</th>
                                <th>{L('申请时间', 'Applied')}</th>
                                <th>{L('操作', 'Actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={10} style={{ textAlign: 'center', padding: 40 }}>{L('加载中...', 'Loading...')}</td></tr>
                            ) : agents.length === 0 ? (
                                <tr><td colSpan={10} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>{L('暂无代理商', 'No agents')}</td></tr>
                            ) : agents.map(a => (
                                <Fragment key={a.id}>
                                <tr onClick={() => setExpandedAgent(expandedAgent === a.id ? null : a.id)} style={{ cursor: 'pointer' }}>
                                    <td style={{ fontWeight: 600 }}>{a.shopName}</td>
                                    <td><code>/s/{a.shopSlug}</code></td>
                                    <td>{a.user?.username || a.user?.email}</td>
                                    <td>{a.productCount}</td>
                                    <td>{a.orderCount}</td>
                                    <td>{formatMoney(a.balance)}</td>
                                    <td>{formatMoney(a.totalEarnings)}</td>
                                    <td>
                                        <span style={{
                                            padding: '2px 8px', borderRadius: 4, fontSize: '0.78rem', fontWeight: 600,
                                            background: statusColor[a.status] + '20', color: statusColor[a.status]
                                        }}>
                                            {statusLabel[a.status]}
                                        </span>
                                    </td>
                                    <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                                        {new Date(a.createdAt).toLocaleDateString()}
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                                            {a.status === 'PENDING' && (
                                                <>
                                                    <button className="btn-sm btn-primary" onClick={() => updateAgentStatus(a.id, 'ACTIVE')}>{L('同意', 'Approve')}</button>
                                                    <button className="btn-sm btn-danger" onClick={() => updateAgentStatus(a.id, 'REJECTED')}>{L('拒绝', 'Reject')}</button>
                                                </>
                                            )}
                                            {a.status === 'ACTIVE' && (
                                                <button className="btn-sm btn-warning" onClick={() => updateAgentStatus(a.id, 'SUSPENDED')}>{L('挂起', 'Suspend')}</button>
                                            )}
                                            {a.status === 'SUSPENDED' && (
                                                <button className="btn-sm btn-primary" onClick={() => updateAgentStatus(a.id, 'ACTIVE')}>{L('重新启用', 'Reactivate')}</button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                                {expandedAgent === a.id && (
                                    <tr>
                                        <td colSpan={10} style={{ background: 'var(--bg-secondary)', padding: '16px 20px' }}>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
                                                <div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 2 }}>{L('通知邮箱', 'Notification Email')}</div>
                                                    <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>{a.contactEmail || L('未提供', 'Not provided')}</div>
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 2 }}>{L('联系方式', 'Contact')}</div>
                                                    <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>{a.contactInfo || L('未提供', 'Not provided')}</div>
                                                </div>
                                                <div style={{ gridColumn: '1 / -1' }}>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 2 }}>{L('申请备注', 'Application Note')}</div>
                                                    <div style={{ fontSize: '0.86rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{a.applyDescription || L('无', 'None')}</div>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                                </Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {tab === 'withdrawals' && (
                <div className="data-table-wrapper">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>{L('代理商', 'Agent')}</th>
                                <th>{L('提现金额', 'Amount')}</th>
                                <th>{L('提现方式', 'Method')}</th>
                                <th>{L('提现账号', 'Account')}</th>
                                <th>{L('状态', 'Status')}</th>
                                <th>{L('申请时间', 'Applied')}</th>
                                <th>{L('操作', 'Actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40 }}>{L('加载中...', 'Loading...')}</td></tr>
                            ) : withdrawals.length === 0 ? (
                                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>{L('暂无提现申请', 'No withdrawal requests')}</td></tr>
                            ) : withdrawals.map(w => (
                                <tr key={w.id}>
                                    <td style={{ fontWeight: 600 }}>{w.agentName}</td>
                                    <td style={{ fontWeight: 700, color: '#EF4444' }}>{formatMoney(w.amount)}</td>
                                    <td>{w.method === 'alipay' ? L('支付宝', 'Alipay') : w.method === 'wechat' ? L('微信支付', 'WeChat') : L('银行卡', 'Bank Card')}</td>
                                    <td style={{ fontSize: '0.82rem' }}>{w.account}</td>
                                    <td>
                                        <span style={{
                                            padding: '2px 8px', borderRadius: 4, fontSize: '0.78rem', fontWeight: 600,
                                            background: wStatusColor[w.status] + '20', color: wStatusColor[w.status]
                                        }}>
                                            {wStatusLabel[w.status]}
                                        </span>
                                    </td>
                                    <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                                        {new Date(w.createdAt).toLocaleDateString()}
                                    </td>
                                    <td>
                                        {w.status === 'PENDING' && (
                                            <div style={{ display: 'flex', gap: 6 }}>
                                                <button className="btn-sm btn-primary" onClick={() => processWithdrawal(w.id, 'APPROVED')}>{L('同意', 'Approve')}</button>
                                                <button className="btn-sm btn-danger" onClick={() => processWithdrawal(w.id, 'REJECTED')}>{L('拒绝', 'Reject')}</button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {tab === 'skinPool' && (
                <div className="settings-section">
                    <p style={{ marginBottom: 16, color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                        {L('勾选授权给代理商选择的主题皮肤样式', 'Select skins available for agents')}
                    </p>
                    {allSkins.map(skin => (
                        <label key={skin.id} style={{
                            display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                            borderRadius: 10, border: \`2px solid \${skinPool.includes(skin.id) ? '#4F46E5' : 'var(--border-color)'}\`,
                            marginBottom: 10, cursor: 'pointer', transition: 'border-color 0.2s',
                            background: skinPool.includes(skin.id) ? '#4F46E510' : 'transparent'
                        }}>
                            <input
                                type="checkbox"
                                checked={skinPool.includes(skin.id)}
                                onChange={() => {
                                    if (skinPool.includes(skin.id)) {
                                        if (skinPool.length <= 1) return showToast(L('必须至少保留一个主题', 'At least one skin must be selected'), 'error')
                                        setSkinPool(skinPool.filter(s => s !== skin.id))
                                    } else {
                                        setSkinPool([...skinPool, skin.id])
                                    }
                                }}
                                style={{ width: 18, height: 18 }}
                            />
                            <div>
                                <div style={{ fontWeight: 600 }}>{skin.name}</div>
                                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{skin.desc}</div>
                            </div>
                        </label>
                    ))}
                    <button onClick={saveSkinPool} style={{
                        marginTop: 16, padding: '10px 32px', borderRadius: 8, border: 'none',
                        background: '#ef4444', color: '#fff', fontSize: '0.88rem', fontWeight: 600,
                        cursor: 'pointer', width: 'auto', display: 'inline-block'
                    }} onMouseEnter={e => e.target.style.background = '#dc2626'}
                       onMouseLeave={e => e.target.style.background = '#ef4444'}>
                        {L('保存分站主题配置', 'Save Skin Pool')}
                    </button>
                </div>
            )}
        </div>
    )
}
`;

const newContent = prefix + translatedAgents + suffix;
fs.writeFileSync(file, newContent, 'utf8');
console.log('Successfully translated AgentsManage!');

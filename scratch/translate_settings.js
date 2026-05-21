const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../frontend/src/pages/Admin/Dashboard/index.jsx');
let content = fs.readFileSync(file, 'utf8');

const startTag = 'function SettingsPage() {';
const startIdx = content.indexOf(startTag);
if (startIdx === -1) {
    console.error('SettingsPage start not found');
    process.exit(1);
}

const endTag = '// 管理后台主组件';
const endIdx = content.indexOf(endTag, startIdx);
if (endIdx === -1) {
    console.error('AdminDashboard start not found');
    process.exit(1);
}

console.log('Replacing SettingsPage from', startIdx, 'to', endIdx);

const prefix = content.slice(0, startIdx);
const suffix = content.slice(endIdx);

const translatedSettings = `function SettingsPage() {
    const { token } = useAuthStore()
    const { showToast } = useToast()
    const { fetchSkin } = useSkinStore()
    const mToken = useMerchantStore(state => state.token)
    const L = useAdminL()

    // 默认设置
    const [settings, setSettings] = useState({
        // 基本设置
        siteName: 'HaoDongXi',
        siteDescription: 'Virtual goods auto-delivery platform',
        frontend_skin: 'classic',
        siteLogo: '',
        siteFavicon: '',
        agentSubdomainRoot: '',
        // 通知栏设置
        notificationEnabled: false,
        notificationText: '',
        notificationLink: '',
        // 支付设置
        alipayEnabled: true,
        wechatEnabled: true,
        usdtEnabled: false,
        bscUsdtEnabled: false,
        // USDT配置
        usdtWalletAddress: '',
        usdtExchangeRate: 7,
        bscUsdtWalletAddress: '',
        bscUsdtExchangeRate: 7,
        bscUsdtApiKey: '',
        // 订单设置
        orderTimeout: 30,
        autoCancel: true,
        stockMode: 'auto', // 'auto' = 库存=卡密数量, 'manual' = 手动设置库存
        // 邮件设置
        smtpHost: '',
        smtpPort: 465,
        smtpUser: '',
        smtpPass: '',
        emailNotify: true,
        // Admins通知设置
        adminNotifyEmail: '',
        notifyOrderPaid: true,
        notifyPendingShip: true,
        notifyNewTicket: true,
        notifyNewUser: false,
        notifyLowStock: true,
        notifyOrderCancelled: false,
        notifyOrderRefunded: true,
        // 安全策略设置
        securityEnabled: true,
        securityEnableIpBlock: true,
        securityBlockedIps: '',
        securityEnableEmailSuffixBlock: true,
        securityBlockedEmailSuffixes: '',
        securityRequireVerifiedForTicket: true,
        securityRegisterLimitMax: 5,
        securityRegisterLimitWindowMinutes: 10,
        securityOrderQueryLimitMax: 20,
        securityOrderQueryLimitWindowMinutes: 10,
        securityTicketCreateLimitMax: 3,
        securityTicketCreateLimitWindowMinutes: 10,
        // Database Backup设置
        backupEnabled: false,
        backupFrequency: 1,
        backupRetentionDays: 7,
        backupEmailEnabled: false,
        backupEmail: '',
        // Admins权限设置
        adminPermissionViewStatsGrid: true,
        adminPermissionViewTodayStats: true,
        adminEmailNotificationConfigs: []
    })

    const [activeTab, setActiveTab] = useState('basic')
    const [saving, setSaving] = useState(false)
    const [loading, setLoading] = useState(true)
    // 套餐邮件额度：>0 / -1 表示允许，0 表示已禁用
    const [emailQuota, setEmailQuota] = useState(-1)
    const emailDisabled = emailQuota === 0
    const [emailUsed, setEmailUsed] = useState(0)

    // 从后端加载设置
    useEffect(() => {
        const loadSettings = async () => {
            try {
                const res = await fetch('/api/admin/settings', {
                    headers: { 'Authorization': \`Bearer \${token}\` }
                })
                if (res.ok) {
                    const data = await res.json()
                    if (data.settings) {
                        setSettings(prev => ({
                            ...prev,
                            ...Object.fromEntries(
                                Object.entries(data.settings).map(([key, value]) => {
                                    // 转换布尔值
                                    if (key === 'adminEmailNotificationConfigs') {
                                        try {
                                            const parsed = JSON.parse(value || '[]')
                                            return [key, Array.isArray(parsed) ? parsed : []]
                                        } catch {
                                            return [key, []]
                                        }
                                    }
                                    if (value === 'true') return [key, true]
                                    if (value === 'false') return [key, false]
                                    // 转换数字（排除0x开头的地址等非十进制字符串）
                                    if (value !== '' && /^-?\\d+(\\.\\d+)?$/.test(value)) return [key, Number(value)]
                                    return [key, value]
                                })
                            )
                        }))
                    }
                }
            } catch (error) {
                console.error('加载设置失败:', error)
            } finally {
                setLoading(false)
            }
        }
        if (token) loadSettings()
    }, [token])

    // 拉取套餐邮件额度（优先 admin 接口，fallback platform）
    useEffect(() => {
        const fetchUsage = (tk, isAdmin) => {
            if (isAdmin) {
                fetch('/api/admin/email-usage', { headers: { Authorization: \`Bearer \${tk}\` } })
                    .then(r => r.json())
                    .then(d => {
                        if (typeof d.limit === 'number') setEmailQuota(d.limit)
                        if (typeof d.used === 'number') setEmailUsed(d.used)
                    })
                    .catch(() => {})
            } else if (tk) {
                fetch('/api/platform/plan/limits', { headers: { Authorization: \`Bearer \${tk}\` } })
                    .then(r => r.json())
                    .then(d => {
                        const v = d?.limits?.emailNotifications
                        if (typeof v === 'number') setEmailQuota(v)
                    })
                    .catch(() => {})
            }
        }
        if (token) fetchUsage(token, true)
        else if (mToken) fetchUsage(mToken, false)
    }, [token, mToken])

    const handleChange = (key, value) => {
        setSettings(prev => ({ ...prev, [key]: value }))
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            // 将设置值转换为字符串
            const settingsToSave = Object.fromEntries(
                Object.entries(settings).map(([key, value]) => [
                    key,
                    key === 'adminEmailNotificationConfigs' ? JSON.stringify(value) : String(value)
                ])
            )

            // 保存设置到后端
            const res = await fetch('/api/admin/settings', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': \`Bearer \${token}\`
                },
                body: JSON.stringify(settingsToSave)
            })

            if (!res.ok) {
                throw new Error('Save Failed')
            }

            showToast(L('设置保存成功！', 'Settings saved successfully!'), 'success')
            // 重新拉取皮肤，立即生效
            fetchSkin()

        } catch (err) {
            console.error(err)
            showToast(L('保存设置失败', 'Save settings failed'), 'error')
        } finally {
            setSaving(false)
        }
    }

    const handleRebuildStock = async () => {
        try {
            const res = await fetch('/api/admin/stock/rebuild', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': \`Bearer \${token}\`
                },
                body: JSON.stringify({})
            })
            const data = await res.json()
            if (!res.ok) {
                throw new Error(data.error || L('库存重建失败', 'Stock rebuild failed'))
            }
            showToast(L(\`库存重建成功：商品 \${data.updatedProducts} 个，规格 \${data.updatedVariants} 个\`, \`Stock rebuilt: Products \${data.updatedProducts}, Variants \${data.updatedVariants}\`), 'success')
        } catch (error) {
            showToast(error.message || L('库存重建失败', 'Stock rebuild failed'), 'error')
        }
    }

    const adminNotifyEventOptions = [
        { key: 'notifyOrderPaid', label: L('支付成功', 'Payment Success') },
        { key: 'notifyPendingShip', label: L('待发货', 'Pending Ship') },
        { key: 'notifyNewTicket', label: L('工单提醒', 'Ticket Alert') },
        { key: 'notifyNewUser', label: L('新用户', 'New User') },
        { key: 'notifyLowStock', label: L('库存预警', 'Low Stock') },
        { key: 'notifyOrderCancelled', label: L('订单取消', 'Order Cancelled') }
    ]

    const updateAdminEmailConfig = (userId, updater) => {
        setSettings(prev => ({
            ...prev,
            adminEmailNotificationConfigs: (prev.adminEmailNotificationConfigs || []).map(config => (
                config.userId === userId ? { ...config, ...updater(config) } : config
            ))
        }))
    }

    const toggleAdminEmailEvent = (userId, eventKey) => {
        updateAdminEmailConfig(userId, (config) => {
            const currentEvents = Array.isArray(config.events) ? config.events : []
            const events = currentEvents.includes(eventKey)
                ? currentEvents.filter(key => key !== eventKey)
                : [...currentEvents, eventKey]
            return { events }
        })
    }

    const tabs = [
        { id: 'basic', label: L('基本设置', 'Basic Settings') },
        { id: 'payment', label: L('支付设置', 'Payment Settings') },
        { id: 'order', label: L('订单设置', 'Order Settings') },
        { id: 'email', label: L('邮件设置', 'Email Settings') },
        { id: 'notify', label: L('通知设置', 'Notification Settings') },
        { id: 'admin', label: L('管理员设置', 'Admin Settings') }
    ]

    return (
        <div className="settings-page">
            <div className="page-header">
                <h2>{L('系统设置', 'System Settings')}</h2>
                <button
                    className="btn btn-primary"
                    onClick={handleSave}
                    disabled={saving}
                >
                    {saving ? L('正在保存...', 'Saving...') : L('保存设置', 'Save Settings')}
                </button>
            </div>

            {/* 标签页 */}
            <div className="settings-tabs">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        className={\`tab-btn \${activeTab === tab.id ? 'active' : ''}\`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="settings-content">
                {/* 基本设置 */}
                {activeTab === 'basic' && (
                    <>
                    <div className="settings-section">
                        <div className="setting-item">
                            <label>{L('网站名称', 'Site Name')}</label>
                            <input
                                type="text"
                                value={settings.siteName}
                                onChange={(e) => handleChange('siteName', e.target.value)}
                                placeholder={L('网站名称', 'Site Name')}
                            />
                        </div>
                        <div className="setting-item">
                            <label>{L('网站描述', 'Site Description')}</label>
                            <textarea
                                value={settings.siteDescription}
                                onChange={(e) => handleChange('siteDescription', e.target.value)}
                                placeholder={L('网站描述', 'Site Description')}
                                rows={3}
                            />
                        </div>

                        {/* 代理域名 */}
                        <div className="setting-item">
                            <label>{L('代理域名', 'Agent Domain')}</label>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <input
                                    type="text"
                                    value={settings.agentSubdomainRoot || ''}
                                    onChange={(e) => handleChange('agentSubdomainRoot', e.target.value.trim().replace(/^https?:\\/\\//i, '').replace(/\\/.*$/, ''))}
                                    placeholder={L('例如 vshop.cc（留空则使用路径模式 /s/slug）', 'e.g. vshop.cc (Leave empty to use /s/slug path)')}
                                    style={{ flex: 1 }}
                                />
                                {settings.agentSubdomainRoot && (
                                    <SslApplyButton domain={settings.agentSubdomainRoot} token={token} />
                                )}
                            </div>
                            <span className="setting-hint">
                                {L('仅用于 SSL 证书管理。目前代理分站采用路径模式（如 vmart.cc/s/slug）。', 'Only for SSL management. Agent sites currently use path mode (e.g. vmart.cc/s/slug).')}
                            </span>
                        </div>

                        {/* 网站 Logo */}
                        <div className="setting-item">
                            <label>{L('网站 Logo', 'Site Logo')}</label>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 8 }}>{L('推荐：透明背景 PNG 格式，高度不超过 60px，将显示在导航栏', 'Recommended: transparent PNG, max 60px height, shown in navbar')}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                {settings.siteLogo && (
                                    <div style={{
                                        padding: '8px 16px', background: 'var(--bg-secondary)',
                                        borderRadius: 8, border: '1px solid var(--border-color)'
                                    }}>
                                        <img src={settings.siteLogo} alt="Logo" style={{ height: 36, width: 'auto', display: 'block' }} />
                                    </div>
                                )}
                                <label style={{
                                    padding: '8px 16px', borderRadius: 8,
                                    background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                                    cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500,
                                    color: 'var(--text-primary)', transition: 'all 0.15s'
                                }}>
                                    {settings.siteLogo ? L('更换 Logo', 'Change') : L('上传 Logo', 'Upload Logo')}
                                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={async (e) => {
                                        const file = e.target.files?.[0]
                                        if (!file) return
                                        const fd = new FormData()
                                        fd.append('logo', file)
                                        try {
                                            const res = await fetch('/api/upload/branding', {
                                                method: 'POST',
                                                headers: { 'Authorization': \`Bearer \${token}\` },
                                                body: fd
                                            })
                                            const data = await res.json()
                                            if (data.success && data.urls?.logo) {
                                                handleChange('siteLogo', data.urls.logo)
                                                showToast(L('Logo 上传成功', 'Logo Upload Success'), 'success')
                                            }
                                        } catch { showToast(L('上传失败', 'Upload Failed'), 'error') }
                                        e.target.value = ''
                                    }} />
                                </label>
                                {settings.siteLogo && (
                                    <button
                                        style={{
                                            padding: '8px 14px', borderRadius: 8,
                                            background: 'transparent', border: '1px solid #EF4444',
                                            color: '#EF4444', fontSize: '0.85rem', cursor: 'pointer'
                                        }}
                                        onClick={() => handleChange('siteLogo', '')}
                                    >{L('清除', 'Clear')}</button>
                                )}
                            </div>
                        </div>

                        {/* 书签栏图标 Favicon */}
                        <div className="setting-item">
                            <label>{L('网站图标 (Favicon)', 'Favicon')}</label>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 8 }}>{L('推荐：64x64 像素的 PNG 格式，显示在浏览器标签页', 'Recommended: 64x64 PNG, shown in browser tab')}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                {settings.siteFavicon && (
                                    <div style={{
                                        padding: 8, background: 'var(--bg-secondary)',
                                        borderRadius: 8, border: '1px solid var(--border-color)'
                                    }}>
                                        <img src={settings.siteFavicon} alt="Favicon" style={{ height: 32, width: 32, display: 'block', objectFit: 'contain' }} />
                                    </div>
                                )}
                                <label style={{
                                    padding: '8px 16px', borderRadius: 8,
                                    background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                                    cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500,
                                    color: 'var(--text-primary)', transition: 'all 0.15s'
                                }}>
                                    {settings.siteFavicon ? L('更换图标', 'Change') : L('上传图标', 'Upload Icon')}
                                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={async (e) => {
                                        const file = e.target.files?.[0]
                                        if (!file) return
                                        const fd = new FormData()
                                        fd.append('favicon', file)
                                        try {
                                            const res = await fetch('/api/upload/branding', {
                                                method: 'POST',
                                                headers: { 'Authorization': \`Bearer \${token}\` },
                                                body: fd
                                            })
                                            const data = await res.json()
                                            if (data.success && data.urls?.favicon) {
                                                handleChange('siteFavicon', data.urls.favicon)
                                                showToast(L('图标上传成功', 'Icon Upload Success'), 'success')
                                            }
                                        } catch { showToast(L('上传失败', 'Upload Failed'), 'error') }
                                        e.target.value = ''
                                    }} />
                                </label>
                                {settings.siteFavicon && (
                                    <button
                                        style={{
                                            padding: '8px 14px', borderRadius: 8,
                                            background: 'transparent', border: '1px solid #EF4444',
                                            color: '#EF4444', fontSize: '0.85rem', cursor: 'pointer'
                                        }}
                                        onClick={() => handleChange('siteFavicon', '')}
                                    >{L('清除', 'Clear')}</button>
                                )}
                            </div>
                        </div>
                    </div>
                    </>
                )}

                {/* 支付设置 */}
                {activeTab === 'payment' && (
                    <div className="settings-section">
                        <div className="setting-item toggle-item">
                            <div className="toggle-info">
                                <label>{L('支付宝', 'Alipay')}</label>
                                <span className="toggle-desc">{L('启用支付宝收款方式', 'Enable Alipay payment')}</span>
                            </div>
                            <label className="toggle-switch">
                                <input
                                    type="checkbox"
                                    checked={settings.alipayEnabled}
                                    onChange={(e) => handleChange('alipayEnabled', e.target.checked)}
                                />
                                <span className="toggle-slider"></span>
                            </label>
                        </div>
                        <div className="setting-item toggle-item">
                            <div className="toggle-info">
                                <label>{L('微信支付', 'WeChat Pay')}</label>
                                <span className="toggle-desc">{L('启用微信支付收款方式', 'Enable WeChat Pay')}</span>
                            </div>
                            <label className="toggle-switch">
                                <input
                                    type="checkbox"
                                    checked={settings.wechatEnabled}
                                    onChange={(e) => handleChange('wechatEnabled', e.target.checked)}
                                />
                                <span className="toggle-slider"></span>
                            </label>
                        </div>
                        <div className="setting-item toggle-item">
                            <div className="toggle-info">
                                <label>USDT-TRC20</label>
                                <span className="toggle-desc">{L('启用 USDT 收款方式', 'Enable USDT payment')}</span>
                            </div>
                            <label className="toggle-switch">
                                <input
                                    type="checkbox"
                                    checked={settings.usdtEnabled}
                                    onChange={(e) => handleChange('usdtEnabled', e.target.checked)}
                                />
                                <span className="toggle-slider"></span>
                            </label>
                        </div>

                        {settings.usdtEnabled && (
                            <>
                                <div className="setting-item">
                                    <label>{L('USDT 收款地址 (TRC20)', 'USDT Wallet Address (TRC20)')}</label>
                                    <input
                                        type="text"
                                        value={settings.usdtWalletAddress}
                                        onChange={(e) => handleChange('usdtWalletAddress', e.target.value)}
                                        placeholder={L('以 T 开头的 TRC20 钱包地址', 'TRC20 address starting with T')}
                                    />
                                    <span className="setting-hint">{L('请务必确保收款地址正确，否则将无法收到款项', 'Ensure address is correct to receive payments')}</span>
                                </div>
                                <div className="setting-item">
                                    <label>{L('USDT 汇率 (1 USDT = ? 元)', 'USDT Exchange Rate (1 USDT = ? CNY)')}</label>
                                    <input
                                        type="number"
                                        value={settings.usdtExchangeRate}
                                        onChange={(e) => handleChange('usdtExchangeRate', parseFloat(e.target.value))}
                                        min={1}
                                        max={20}
                                        step={0.1}
                                    />
                                    <span className="setting-hint">{L('当前折算汇率：', 'Current rate: ') + '1 USDT = ' + getCurrencySymbol() + settings.usdtExchangeRate}</span>
                                </div>
                            </>
                        )}

                        <div className="setting-item toggle-item">
                            <div className="toggle-info">
                                <label>USDT-BEP20</label>
                                <span className="toggle-desc">{L('启用 BSC (BNB 智能链) USDT 支付', 'Enable BEP20 USDT payment')}</span>
                            </div>
                            <label className="toggle-switch">
                                <input
                                    type="checkbox"
                                    checked={settings.bscUsdtEnabled}
                                    onChange={(e) => handleChange('bscUsdtEnabled', e.target.checked)}
                                />
                                <span className="toggle-slider"></span>
                            </label>
                        </div>

                        {settings.bscUsdtEnabled && (
                            <>
                                <div className="setting-item">
                                    <label>{L('USDT 收款地址 (BEP20)', 'USDT Wallet Address (BEP20)')}</label>
                                    <input
                                        type="text"
                                        value={settings.bscUsdtWalletAddress}
                                        onChange={(e) => handleChange('bscUsdtWalletAddress', e.target.value)}
                                        placeholder={L('以 0x 开头的 BEP20 钱包地址', 'BEP20 address starting with 0x')}
                                    />
                                    <span className="setting-hint">{L('请务必确保收款地址正确，否则将无法收到款项', 'Ensure address is correct to receive payments')}</span>
                                </div>
                                <div className="setting-item">
                                    <label>{L('USDT 汇率 (1 USDT = ? 元)', 'USDT Exchange Rate (1 USDT = ? CNY)')}</label>
                                    <input
                                        type="number"
                                        value={settings.bscUsdtExchangeRate}
                                        onChange={(e) => handleChange('bscUsdtExchangeRate', parseFloat(e.target.value))}
                                        min={1}
                                        max={20}
                                        step={0.1}
                                    />
                                    <span className="setting-hint">{L('当前折算汇率：', 'Current rate: ') + '1 USDT = ' + getCurrencySymbol() + settings.bscUsdtExchangeRate}</span>
                                </div>
                                <div className="setting-item">
                                    <label>{L('BscScan API Key (可选，推荐)', 'BscScan API Key (Optional, recommended)')}</label>
                                    <input
                                        type="text"
                                        value={settings.bscUsdtApiKey}
                                        onChange={(e) => handleChange('bscUsdtApiKey', e.target.value)}
                                        placeholder={L('加速交易查询，防止查询受限（免费申请）', 'Speeds up queries, prevents rate limiting (free)')}
                                    />
                                    <span className="setting-hint">{L('访问 bscscan.com/apis 免费获取', 'Get free at bscscan.com/apis')}</span>
                                </div>
                            </>
                        )}

                        <div className="setting-notice">
                            {L('💡 USDT 支付由系统每 30 秒自动检测一次，到账后订单自动发放卡密/发货。', '💡 USDT payments auto-detected every 30s, auto-shipped on receipt')}
                        </div>
                    </div>
                )}

                {/* 订单设置 */}
                {activeTab === 'order' && (
                    <div className="settings-section">
                        {/* 库存储备模式选择 */}
                        <div className="setting-item stock-mode-section">
                            <label className="stock-mode-label">{L('库存计算模式', 'Stock Calculation')}</label>
                            <div className="stock-mode-selector">
                                <div
                                    className={\`stock-mode-option \${settings.stockMode === 'auto' ? 'selected' : ''}\`}
                                    onClick={() => handleChange('stockMode', 'auto')}
                                    role="button"
                                    tabIndex={0}
                                >
                                    <div className="stock-mode-radio">
                                        <div className="radio-outer">
                                            <div className="radio-inner"></div>
                                        </div>
                                    </div>
                                    <div className="stock-mode-info">
                                        <div className="stock-mode-header">
                                            <span className="stock-mode-emoji">🤖</span>
                                            <span className="stock-mode-name">{L('自动计算库存', 'Auto Calculate Stock')}</span>
                                            <span className="stock-mode-tag recommended">{L('推荐', 'Recommended')}</span>
                                        </div>
                                        <div className="stock-mode-description">
                                            {L('系统根据可用卡密数量自动计算库存，确保实时准确', 'System auto-counts available keys as stock, ensuring real-time accuracy')}
                                        </div>
                                    </div>
                                </div>
                                <div
                                    className={\`stock-mode-option \${settings.stockMode === 'manual' ? 'selected' : ''}\`}
                                    onClick={() => handleChange('stockMode', 'manual')}
                                    role="button"
                                    tabIndex={0}
                                >
                                    <div className="stock-mode-radio">
                                        <div className="radio-outer">
                                            <div className="radio-inner"></div>
                                        </div>
                                    </div>
                                    <div className="stock-mode-info">
                                        <div className="stock-mode-header">
                                            <span className="stock-mode-emoji">✏️</span>
                                            <span className="stock-mode-name">{L('手动设置库存', 'Manual Stock')}</span>
                                        </div>
                                        <div className="stock-mode-description">
                                            {L('可在商品管理中手动设置库存，适用于货源充足但卡密无需提前导入的情况', 'Configure stock manually in product settings, suitable for ample supply without pre-imported keys')}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div style={{ marginTop: '10px' }}>
                                <button
                                    className="btn btn-secondary"
                                    onClick={handleRebuildStock}
                                    type="button"
                                >
                                    {L('重新计算库存 (根据可用卡密)', 'Rebuild Stock (by available keys)')}
                                </button>
                            </div>
                        </div>

                        {/* 订单超时 */}
                        <div className="setting-item">
                            <label>{L('订单超时时间', 'Order Timeout')}</label>
                            <div className="input-with-suffix">
                                <input
                                    type="number"
                                    value={settings.orderTimeout}
                                    onChange={(e) => handleChange('orderTimeout', parseInt(e.target.value))}
                                    min={5}
                                    max={120}
                                    style={{ width: '120px' }}
                                />
                                <span className="input-suffix">{L('分钟', 'min')}</span>
                            </div>
                            <span className="setting-hint">{L('未支付的订单在超时后将自动关闭/释放库存', 'Unpaid orders auto-cancelled after timeout')}</span>
                        </div>

                        {/* 自动取消超时订单 */}
                        <div className="setting-item toggle-item">
                            <div className="toggle-info">
                                <label>{L('自动取消超时订单', 'Auto Cancel')}</label>
                                <span className="toggle-desc">{L('超出上述设定时间未支付的订单将自动失效', 'Unpaid orders automatically cancel after the set timeout')}</span>
                            </div>
                            <label className="toggle-switch">
                                <input
                                    type="checkbox"
                                    checked={settings.autoCancel}
                                    onChange={(e) => handleChange('autoCancel', e.target.checked)}
                                />
                                <span className="toggle-slider"></span>
                            </label>
                        </div>
                    </div>
                )}

                {/* 邮件设置 */}
                {activeTab === 'email' && (
                    <div className="settings-section">
                        {emailDisabled && (
                            <div style={{
                                padding: '14px 16px', marginBottom: 16,
                                background: 'rgba(245, 158, 11, 0.1)',
                                border: '1px solid rgba(245, 158, 11, 0.4)',
                                borderRadius: 8, color: '#92400e', fontSize: '0.9rem',
                                display: 'flex', alignItems: 'center', gap: 10
                            }}>
                                {L('🔒 当前套餐不包含邮件发送额度，请升级套餐以启用邮件通知。', '🔒 Current plan has no email quota. Please upgrade to enable.')}
                            </div>
                        )}
                        {!emailDisabled && (
                            <div style={{
                                padding: '14px 18px', marginBottom: 16,
                                background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.08), rgba(20, 184, 166, 0.08))',
                                border: '1px solid rgba(14, 165, 233, 0.25)',
                                borderRadius: 10, color: '#0c4a6e'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                                    <div>
                                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 4 }}>{L('本月平台代发邮件额度', 'Platform emails this month')}</div>
                                        <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                            {emailUsed} / {emailQuota === -1 ? L('无限额度', 'Unlimited') : emailQuota}
                                        </div>
                                    </div>
                                    {emailQuota > 0 && (
                                        <div style={{ flex: 1, minWidth: 180, marginLeft: 20 }}>
                                            <div style={{ height: 6, background: 'rgba(14, 165, 233, 0.15)', borderRadius: 3, overflow: 'hidden' }}>
                                                <div style={{
                                                    height: '100%',
                                                    width: \`\${Math.min(100, (emailUsed / emailQuota) * 100)}%\`,
                                                    background: emailUsed >= emailQuota ? '#ef4444' : 'linear-gradient(90deg, #0ea5e9, #14b8a6)',
                                                    transition: 'width 0.3s'
                                                }} />
                                            </div>
                                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 6 }}>
                                                {emailUsed >= emailQuota
                                                    ? L('⚠️ 本月代发限额已用完。请在下方配置您自己的 SMTP 发信服务以享受无限发送。', '⚠️ Monthly quota used up. Switch to own SMTP for unlimited')
                                                    : L(\`本月剩余代发额度：\${Math.max(0, emailQuota - emailUsed)} 封。若使用自定义 SMTP 发信则不占用此额度。\`, \`Remaining: \${Math.max(0, emailQuota - emailUsed)} emails. Custom SMTP is not counted toward this limit.\`)}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                        <fieldset disabled={emailDisabled} style={{ border: 0, padding: 0, margin: 0, opacity: emailDisabled ? 0.55 : 1 }}>
                        <div className="setting-item toggle-item">
                            <div className="toggle-info">
                                <label>{L('邮件通知功能', 'Email Notification')}</label>
                                <span className="toggle-desc">{L('订单完成后，将卡密信息自动发送至买家邮箱', 'Send card keys to email after order completion')}</span>
                            </div>
                            <label className="toggle-switch">
                                <input
                                    type="checkbox"
                                    checked={settings.emailNotify}
                                    onChange={(e) => handleChange('emailNotify', e.target.checked)}
                                    disabled={emailDisabled}
                                />
                                <span className="toggle-slider"></span>
                            </label>
                        </div>
                        <div className="setting-item">
                            <label>{L('SMTP 服务器地址', 'SMTP Host')}</label>
                            <input
                                type="text"
                                value={settings.smtpHost}
                                onChange={(e) => handleChange('smtpHost', e.target.value)}
                                placeholder="smtp.example.com"
                                disabled={emailDisabled}
                            />
                        </div>
                        <div className="setting-item">
                            <label>{L('SMTP 端口', 'SMTP Port')}</label>
                            <input
                                type="number"
                                value={settings.smtpPort}
                                onChange={(e) => handleChange('smtpPort', parseInt(e.target.value))}
                                placeholder="465"
                                disabled={emailDisabled}
                            />
                        </div>
                        <div className="setting-item">
                            <label>{L('发件邮箱账号 (SMTP User)', 'SMTP User')}</label>
                            <input
                                type="email"
                                value={settings.smtpUser}
                                onChange={(e) => handleChange('smtpUser', e.target.value)}
                                placeholder="noreply@example.com"
                                disabled={emailDisabled}
                            />
                        </div>
                        <div className="setting-item">
                            <label>{L('邮箱密码/授权码 (SMTP Password)', 'SMTP Password')}</label>
                            <input
                                type="password"
                                value={settings.smtpPass}
                                onChange={(e) => handleChange('smtpPass', e.target.value)}
                                placeholder={L('邮箱密码或授权码', 'SMTP password or authorization code')}
                                disabled={emailDisabled}
                            />
                        </div>
                        <div className="setting-item">
                            <button
                                className="btn btn-secondary"
                                disabled={emailDisabled}
                                onClick={async () => {
                                    try {
                                        const res = await fetch('/api/admin/settings/test-email', {
                                            method: 'POST',
                                            headers: { 'Authorization': \`Bearer \${token}\` }
                                        })
                                        const data = await res.json()
                                        if (res.ok) {
                                            alert('✅ ' + (data.message || L('测试邮件发送成功！', 'Test email sent successfully!')))
                                        } else {
                                            alert('❌ ' + L('测试发信失败: ', 'Test failed: ') + data.error)
                                        }
                                    } catch (error) {
                                        alert('❌ ' + L('测试发信失败: ', 'Test failed: ') + error.message)
                                    }
                                }}
                            >
                                {L('测试发信连接', 'Test SMTP Connection')}
                            </button>
                            <span className="setting-hint">{L('测试前请先保存当前设置', 'Save settings before testing SMTP connection')}</span>
                        </div>
                        </fieldset>
                    </div>
                )}

                {/* 通知设置 */}
                {activeTab === 'notify' && (
                    <div className="settings-section">
                        {emailDisabled && (
                            <div style={{
                                padding: '14px 16px', marginBottom: 16,
                                background: 'rgba(245, 158, 11, 0.1)',
                                border: '1px solid rgba(245, 158, 11, 0.4)',
                                borderRadius: 8, color: '#92400e', fontSize: '0.9rem'
                            }}>
                                {L('🔒 当前套餐不包含邮件通知额度，系统管理员邮件提醒已禁用。', '🔒 Current plan does not include email notifications. Admin email notifications are disabled.')}
                            </div>
                        )}
                        <fieldset disabled={emailDisabled} style={{ border: 0, padding: 0, margin: 0, opacity: emailDisabled ? 0.55 : 1 }}>
                        <div className="setting-item">
                            <label>{L('管理员接收通知邮箱', 'Admin Notification Email')}</label>
                            <input
                                type="email"
                                value={settings.adminNotifyEmail}
                                onChange={(e) => handleChange('adminNotifyEmail', e.target.value)}
                                placeholder="admin@example.com"
                                disabled={emailDisabled}
                            />
                            <span className="setting-hint">{L('上述触发的所有系统事件提醒将发送至该邮箱，留空则不开启提醒', 'System alerts will be sent to this email, leave blank to disable')}</span>
                        </div>

                        <div style={{ marginTop: '8px' }}>
                            <label style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '16px' }}>{L('通知触发事件', 'Notification Events')}</label>
                        </div>

                        <div className="setting-item toggle-item">
                            <div className="toggle-info">
                                <label>{L('💰 订单支付成功', '💰 Order Paid')}</label>
                                <span className="toggle-desc">{L('当有买家完成支付后发送邮件提醒管理员', 'Notify admins when a buyer completes payment')}</span>
                            </div>
                            <label className="toggle-switch">
                                <input
                                    type="checkbox"
                                    checked={settings.notifyOrderPaid}
                                    onChange={(e) => handleChange('notifyOrderPaid', e.target.checked)}
                                />
                                <span className="toggle-slider"></span>
                            </label>
                        </div>

                        <div className="setting-item toggle-item">
                            <div className="toggle-info">
                                <label>{L('📦 待手动发货', '📦 Pending Manual Ship')}</label>
                                <span className="toggle-desc">{L('当订单已支付但无可自动发放的卡密，需要管理员手动处理时提醒', 'Notify when order is paid but requires manual shipping')}</span>
                            </div>
                            <label className="toggle-switch">
                                <input
                                    type="checkbox"
                                    checked={settings.notifyPendingShip}
                                    onChange={(e) => handleChange('notifyPendingShip', e.target.checked)}
                                />
                                <span className="toggle-slider"></span>
                            </label>
                        </div>

                        <div className="setting-item toggle-item">
                            <div className="toggle-info">
                                <label>{L('🎫 新工单创建', '🎫 New Ticket Created')}</label>
                                <span className="toggle-desc">{L('当用户提交了新的客服工单时提醒管理员', 'Notify admins when a new support ticket is submitted')}</span>
                            </div>
                            <label className="toggle-switch">
                                <input
                                    type="checkbox"
                                    checked={settings.notifyNewTicket}
                                    onChange={(e) => handleChange('notifyNewTicket', e.target.checked)}
                                />
                                <span className="toggle-slider"></span>
                            </label>
                        </div>

                        <div className="setting-item toggle-item">
                            <div className="toggle-info">
                                <label>{L('👤 新用户注册', '👤 New User Registered')}</label>
                                <span className="toggle-desc">{L('当有新用户在商城注册账号时提醒管理员', 'Notify admins when a new user registers')}</span>
                            </div>
                            <label className="toggle-switch">
                                <input
                                    type="checkbox"
                                    checked={settings.notifyNewUser}
                                    onChange={(e) => handleChange('notifyNewUser', e.target.checked)}
                                />
                                <span className="toggle-slider"></span>
                            </label>
                        </div>

                        <div className="setting-item toggle-item">
                            <div className="toggle-info">
                                <label>{L('⚠️ 库存不足预警', '⚠️ Low Stock Warning')}</label>
                                <span className="toggle-desc">{L('当商品的可用卡密或库存低于警告阈值时发送邮件提醒', 'Notify admins when product stock drops below warning threshold')}</span>
                            </div>
                            <label className="toggle-switch">
                                <input
                                    type="checkbox"
                                    checked={settings.notifyLowStock}
                                    onChange={(e) => handleChange('notifyLowStock', e.target.checked)}
                                />
                                <span className="toggle-slider"></span>
                            </label>
                        </div>

                        <div className="setting-item toggle-item">
                            <div className="toggle-info">
                                <label>{L('📦 订单已取消', '📦 Order Cancelled')}</label>
                                <span className="toggle-desc">{L('当有订单超时未付被取消或手动取消时提醒管理员', 'Notify admins when an order is cancelled')}</span>
                            </div>
                            <label className="toggle-switch">
                                <input
                                    type="checkbox"
                                    checked={settings.notifyOrderCancelled}
                                    onChange={(e) => handleChange('notifyOrderCancelled', e.target.checked)}
                                />
                                <span className="toggle-slider"></span>
                            </label>
                        </div>

                        <div className="setting-item toggle-item">
                            <div className="toggle-info">
                                <label>{L('💸 退款成功通知', '💸 Refund Successful')}</label>
                                <span className="toggle-desc">{L('订单成功退款后自动向买家发送退款确认邮件', 'Send refund confirmation email to buyer after refund completes')}</span>
                            </div>
                            <label className="toggle-switch">
                                <input
                                    type="checkbox"
                                    checked={settings.notifyOrderRefunded}
                                    onChange={(e) => handleChange('notifyOrderRefunded', e.target.checked)}
                                />
                                <span className="toggle-slider"></span>
                            </label>
                        </div>
                        </fieldset>
                    </div>
                )}

                {/* 管理员权限/提醒设置 */}
                {activeTab === 'admin' && (
                    <div className="settings-section">
                        <div className="setting-item toggle-item">
                            <div className="toggle-info">
                                <label>{L('仪表盘总览数据权限', 'Dashboard Overview Stats')}</label>
                                <span className="toggle-desc">{L('允许普通管理员账号查看仪表盘顶部的统计指标卡（如总销售额、用户数等）和趋势图表', 'Allow normal admins to view the stats cards and trend charts on the dashboard')}</span>
                            </div>
                            <label className="toggle-switch">
                                <input
                                    type="checkbox"
                                    checked={settings.adminPermissionViewStatsGrid}
                                    onChange={(e) => handleChange('adminPermissionViewStatsGrid', e.target.checked)}
                                />
                                <span className="toggle-slider"></span>
                            </label>
                        </div>

                        <div className="setting-item toggle-item">
                            <div className="toggle-info">
                                <label>{L('仪表盘今日数据权限', 'Dashboard Today Stats')}</label>
                                <span className="toggle-desc">{L('允许普通管理员账号查看仪表盘顶部的“今日数据”面板（包含今日订单数和今日收入）', 'Allow normal admins to view today\\\'s stats (orders and revenue) on the dashboard')}</span>
                            </div>
                            <label className="toggle-switch">
                                <input
                                    type="checkbox"
                                    checked={settings.adminPermissionViewTodayStats}
                                    onChange={(e) => handleChange('adminPermissionViewTodayStats', e.target.checked)}
                                />
                                <span className="toggle-slider"></span>
                            </label>
                        </div>

                        <div className="admin-email-settings">
                            <div className="admin-email-settings-header">
                                <label>{L('子管理员个性化邮箱通知', 'Sub-admin Personalized Email Notifications')}</label>
                                <span>{L('在此可以为每个管理员子账号独立配置邮件接收开关，以及需要接收的提醒事件类型', 'Configure email switches and event subscriptions for each admin account individually')}</span>
                            </div>

                            {(settings.adminEmailNotificationConfigs || []).length === 0 ? (
                                <div className="admin-email-empty">{L('暂无其他管理员账号', 'No other admin accounts')}</div>
                            ) : (
                                <div className="admin-email-list">
                                    {(settings.adminEmailNotificationConfigs || []).map(config => (
                                        <div key={config.userId} className="admin-email-card">
                                            <div className="admin-email-card-main">
                                                <div>
                                                    <div className="admin-email-name">
                                                        {config.username || L('未设置用户名', 'Not set username')}
                                                        <span>{config.role === 'SUPER_ADMIN' ? L('超级管理员', 'Super Admin') : L('普通管理员', 'Admin')}</span>
                                                    </div>
                                                    <div className="admin-email-address">{config.email}</div>
                                                </div>
                                                <label className="toggle-switch">
                                                    <input
                                                        type="checkbox"
                                                        checked={config.enabled}
                                                        onChange={(e) => updateAdminEmailConfig(config.userId, () => ({ enabled: e.target.checked }))}
                                                    />
                                                    <span className="toggle-slider"></span>
                                                </label>
                                            </div>

                                            <div className={\`admin-email-events \${config.enabled ? '' : 'disabled'}\`}>
                                                {adminNotifyEventOptions.map(option => (
                                                    <label key={option.key} className="admin-email-event">
                                                        <input
                                                            type="checkbox"
                                                            checked={(config.events || []).includes(option.key)}
                                                            disabled={!config.enabled}
                                                            onChange={() => toggleAdminEmailEvent(config.userId, option.key)}
                                                        />
                                                        <span>{option.label}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

            </div>
        </div>
    )
}

`;

const newContent = prefix + translatedSettings + suffix;
fs.writeFileSync(file, newContent, 'utf8');
console.log('Successfully translated SettingsPage!');

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../../store/authStore'
import { useMerchantStore } from '../../../store/merchantStore'
import { useAdminPrefsStore } from '../../../store/adminPrefsStore'
import { useAdminL } from '../../../hooks/useAdminL'
import { prepareUploadImageFile } from '../../../utils/imageUtils'
import PlanPurchase from '../../ShopAdmin/PlanPurchase'
import './TenantSettings.css'

const API = import.meta.env.VITE_API_URL || '/api'

const ALL_SKIN_OPTIONS = [
    {
        value: 'fresh',
        labelZh: 'Fresh',
        labelEn: 'Fresh',
        descZh: '清爽明亮的现代商城主题',
        descEn: 'Clean and bright storefront theme'
    },
    {
        value: 'zen',
        labelZh: 'Zen',
        labelEn: 'Zen',
        descZh: '克制优雅的极简商城主题',
        descEn: 'Minimal and elegant storefront theme'
    },
    {
        value: 'class',
        labelZh: 'Class',
        labelEn: 'Class',
        descZh: '现代经典风格商城主题',
        descEn: 'Modern classic storefront theme'
    },
]

// 后台语言 & 货币偏好组件
function AdminPrefsSection({ currency, onCurrencyChange }) {
    const L = useAdminL()
    const adminLang = useAdminPrefsStore((s) => s.language)
    const setAdminLang = useAdminPrefsStore((s) => s.setLanguage)
    const setAdminCurrency = useAdminPrefsStore((s) => s.setCurrency)

    const handleLangChange = (lang) => {
        setAdminLang(lang)
    }

    const handleCurrencyChange = (cur) => {
        onCurrencyChange(cur)
        setAdminCurrency(cur)
    }

    return (
        <>
            <div className="ts-form-group">
                <label>{L('inline.admin.language.a3bd876')}</label>
                <div className="admin-prefs-inline">
                    <div className="prefs-toggle-group">
                        <button
                            type="button"
                            className={`prefs-btn ${adminLang === 'zh' ? 'active' : ''}`}
                            onClick={() => handleLangChange('zh')}
                        >🇨🇳 中文</button>
                        <button
                            type="button"
                            className={`prefs-btn ${adminLang === 'en' ? 'active' : ''}`}
                            onClick={() => handleLangChange('en')}
                        >🇺🇸 English</button>
                    </div>
                </div>
                <span className="ts-hint">{L('inline.set.the.display.language.for.the.admin.panel.takes.effect.im.8a87b38')}</span>
            </div>
            <div className="ts-form-group">
                <label>{L('inline.store.currency.fe524a0')}</label>
                <div className="admin-prefs-inline">
                    <div className="prefs-toggle-group">
                        <button
                            type="button"
                            className={`prefs-btn ${currency === 'CNY' ? 'active' : ''}`}
                            onClick={() => handleCurrencyChange('CNY')}
                        >¥ CNY</button>
                        <button
                            type="button"
                            className={`prefs-btn ${currency === 'USD' ? 'active' : ''}`}
                            onClick={() => handleCurrencyChange('USD')}
                        >$ USD</button>
                    </div>
                </div>
                <span className="ts-hint">{L('inline.set.the.store.currency.after.switching.product.prices.will.u.39c9211')}</span>
            </div>
        </>
    )
}

export default function TenantSettings() {
    const { token, user } = useAuthStore()
    const { token: mToken, merchant, shop: storeShop, setAuth, updateShop } = useMerchantStore()
    const L = useAdminL()
    const adminLang = useAdminPrefsStore((s) => s.language)
    const [tenant, setTenant] = useState(null)
    const shop = storeShop || tenant?.shop
    const [tenantSettings, setTenantSettings] = useState(null)
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState('basic')
    const [allowedSkins, setAllowedSkins] = useState(['fresh', 'zen', 'class'])
    const [customThemes, setCustomThemes] = useState([]) // 已分配的定制主题
    const [themePickerOpen, setThemePickerOpen] = useState(false)

    // Basic Info表单
    const [shopForm, setShopForm] = useState({ name: '', notice: '', skin: 'fresh', logo: '', favicon: '', bookmarkTitle: '', agentEnabled: false, language: 'zh', currency: 'CNY' })
    // 特色卡片
    const [featureCard, setFeatureCard] = useState({ enabled: false, title: '', description: '', image: '', buttonText: '', buttonLink: '', collapsed: false })
    const [agreements, setAgreements] = useState({ enabled: false, purchasePolicy: '', refundPolicy: '' })
    const [agreementPreviewOpen, setAgreementPreviewOpen] = useState(false)
    const [planAllowsAgent, setPlanAllowsAgent] = useState(true)
    const [planAllowsCustomDomain, setPlanAllowsCustomDomain] = useState(true)
    const [emailQuota, setEmailQuota] = useState(-1)
    const emailDisabled = emailQuota === 0
    const [emailUsed, setEmailUsed] = useState(0)
    const [emailPackBalance, setEmailPackBalance] = useState(0)
    const [showPackModal, setShowPackModal] = useState(false)
    const [packs, setPacks] = useState([])
    const [packOrder, setPackOrder] = useState(null)
    const [packPaying, setPackPaying] = useState(false)
    const [maxSubAdmins, setMaxSubAdmins] = useState(-1)
    const [shopSaving, setShopSaving] = useState(false)
    const [shopMsg, setShopMsg] = useState(null)
    const policyTemplate = L(`【Purchase Policy】

一、服务说明

欢迎使用本店虚拟商品自动发卡服务。本店为用户提供数字订阅服务、软件激活码、会员账号等虚拟商品的在线购买服务。

二、购买流程

1. 选择商品：浏览并选择您需要的虚拟商品，确认商品规格与价格。
2. 填写信息：正确填写接收卡密的电子邮箱地址。请务必确认邮箱地址准确无误。
3. 选择支付：选择您偏好的支付方式完成付款。
4. 获取卡密：支付成功后，系统将自动发放卡密至您填写的邮箱，同时在订单页面显示。

三、用户须知

- 购买前请仔细阅读商品详情页的说明，了解商品有效期、使用限制等信息。
- 请确保填写的邮箱地址正确且可以正常接收邮件。
- 虚拟商品一经售出，不支持无理由退款（详见 Refund Policy）。
- 购买的虚拟商品仅供个人使用，严禁转售、共享或用于任何违法违规用途。
- 请妥善保管您收到的卡密/账号信息，因个人保管不当导致的泄露或损失，本店不承担责任。

四、商品保障

- 本店保证所售商品均为正规渠道获取，可以正常激活使用。
- 如收到的卡密/账号无法正常使用，请在收到后 24 小时内联系客服，我们将免费补发或退款。
- 商品的有效期以商品详情页标注为准。

五、免责条款

- 因不可抗力（如服务商政策变更、服务器故障等）导致商品无法使用的，本店将尽力协调解决，但不承担超出商品价格的赔偿责任。
- 用户因违反服务商使用条款导致账号被封禁的，本店不承担责任。

六、争议解决

如在购买过程中产生任何争议，请优先通过工单系统联系客服协商解决。我们承诺在收到工单后 24 小时内响应处理。


【Refund Policy】

重要提示：本店销售的均为虚拟数字商品（卡密/激活码/账号），具有不可复制回收的特殊性。一经发货（卡密已发放），原则上不支持退款。请在购买前仔细确认商品信息。

一、支持退款的情况

以下情况可申请全额退款：
- 卡密无法使用：收到的激活码/卡密/账号无法正常激活或登录（需在收到后 24 小时内反馈）。
- 重复发放：因系统故障导致同一卡密重复发放给不同用户。
- 商品描述不符：实际收到的商品与商品详情页描述严重不符。
- 支付成功未发货：支付成功后超过 30 分钟仍未收到卡密，且客服在 24 小时内无法解决。

二、不支持退款的情况

- 卡密/账号已正常使用或已被激活。
- 因个人原因不想要了或误购（虚拟商品不适用无理由退货）。
- 因用户自身操作不当导致账号被封禁。
- 超过有效反馈期限（收到卡密后超过 24 小时）才提出的问题。
- 用户自行修改账号密码、绑定信息后产生的问题。
- 因第三方服务商政策调整导致的服务变化。

三、退款申请流程

1. 提交工单：通过工单系统提交退款申请，需包含：订单号、问题描述、相关截图证据。
2. 客服审核：客服将在收到工单后 24 小时内进行审核。
3. 处理结果：审核通过后，将在 1-3 个工作日内完成退款操作。

四、退款方式

- 支付宝：原路退回支付宝账户，1-3 个工作日到账。
- USDT-TRC20：退回原转账地址，1-3 个工作日到账。
- USDT-BEP20：退回原转账地址，1-3 个工作日到账。
注：使用加密货币支付的退款将按退款时的实时汇率折算。

五、补发政策

对于符合退款条件的订单，我们优先提供免费补发处理：
- 如库存充足，将在确认问题后 1 小时内完成补发。
- 如库存不足无法补发，将按上述退款方式全额退款。

六、特别说明

- 每个订单仅限申请一次退款/补发。
- 恶意频繁申请退款的账户，本店有权限制其购买权限。`, `【Purchase Policy】

1. Service Description

Welcome to our virtual product auto-delivery service. We provide online purchase services for digital subscriptions, software activation codes, membership accounts, and other virtual products.

2. Purchase Process

1. Select product: Browse and select the virtual product you need, then confirm its specifications and price.
2. Enter information: Enter the email address used to receive card keys. Please make sure the email address is accurate.
3. Choose payment: Select your preferred payment method and complete payment.
4. Receive card key: After successful payment, the system will automatically deliver the card key to your email and display it on the order page.

3. User Notice

- Please read the product details carefully before purchase, including validity period, usage limits, and related notes.
- Please ensure that your email address is correct and can receive messages normally.
- Virtual products are non-refundable once sold, except as described in the Refund Policy.
- Purchased virtual products are for personal use only. Resale, sharing, or illegal use is prohibited.
- Please keep your card key/account information safe. We are not responsible for leaks or losses caused by improper personal storage.

4. Product Guarantee

- We guarantee that all sold products are obtained through legitimate channels and can be activated or used normally.
- If the card key/account you receive cannot be used normally, please contact support within 24 hours after receipt. We will provide a free replacement or refund.
- The product validity period is subject to the product details page.

5. Disclaimer

- If a product becomes unavailable due to force majeure, such as service provider policy changes or server failures, we will do our best to coordinate a solution, but our liability will not exceed the product price.
- We are not responsible for account bans caused by users violating the service provider's terms.

6. Dispute Resolution

If any dispute arises during purchase, please contact support through the ticket system first. We will respond within 24 hours after receiving the ticket.


【Refund Policy】

Important Notice: We sell virtual digital products, including card keys, activation codes, and accounts. These products are special because they cannot be copied back or recovered after delivery. Once delivered, refunds are generally not supported. Please confirm the product information carefully before purchase.

1. Refundable Cases

Full refunds may be requested in the following cases:
- Card key cannot be used: The activation code/card key/account cannot be activated or logged in normally. Feedback must be submitted within 24 hours after receipt.
- Duplicate delivery: The same card key is delivered to different users due to a system error.
- Product description mismatch: The received product is materially different from the product details page.
- Paid but not delivered: No card key is received more than 30 minutes after successful payment, and support cannot resolve the issue within 24 hours.

2. Non-Refundable Cases

- The card key/account has been used normally or activated.
- The buyer no longer wants the product or purchased by mistake. No-reason returns do not apply to virtual products.
- The account is banned due to the user's improper operation.
- The issue is reported after the valid feedback period, more than 24 hours after receipt.
- Issues arise after the user changes account passwords or binding information.
- Service changes caused by third-party service provider policy adjustments.

3. Refund Request Process

1. Submit a ticket: Submit a refund request through the ticket system, including the order number, issue description, and related screenshots.
2. Support review: Support will review the ticket within 24 hours after receipt.
3. Processing result: After approval, the refund will be completed within 1-3 business days.

4. Refund Method

- Alipay: Refunded to the original Alipay account within 1-3 business days.
- USDT-TRC20: Refunded to the original transfer address within 1-3 business days.
- USDT-BEP20: Refunded to the original transfer address within 1-3 business days.
Note: Cryptocurrency refunds will be calculated using the real-time exchange rate at the time of refund.

5. Replacement Policy

For orders eligible for a refund, we prioritize free replacement:
- If inventory is sufficient, replacement will be completed within 1 hour after the issue is confirmed.
- If inventory is insufficient, a full refund will be issued using the refund methods above.

6. Special Notes

- Each order can request a refund/replacement only once.
- We reserve the right to restrict purchase access for accounts that maliciously or repeatedly request refunds.`)

    // 密码表单
    const [pwdForm, setPwdForm] = useState({ currentPassword: '', newPassword: '', confirm: '' })
    const [pwdSaving, setPwdSaving] = useState(false)
    const [pwdMsg, setPwdMsg] = useState(null)

    // Payment
    const [payForm, setPayForm] = useState({
        alipayEnabled: false, usdtEnabled: false, bscUsdtEnabled: false,
        yipayEnabled: false,
        alipayAppId: '', alipayPrivateKey: '', alipayPublicKey: '',
        usdtWallet: '', bscUsdtWallet: '', usdtExchangeRate: '7.2',
        yipayApiUrl: '', yipayPid: '', yipayKey: '',
        emailMode: 'platform', smtpHost: '', smtpPort: '465', smtpUser: '', smtpPass: '',
        notifyOrderPaid: true, notifyShipRemind: true, notifyNewTicket: true, notifyNewUser: false, notifyStockAlert: true, notifyOrderCancel: false, notifyRefund: true, notifyEmail: '',
        stockMode: 'auto', orderTimeout: 15
    })
    const [paySaving, setPaySaving] = useState(false)
    const [payMsg, setPayMsg] = useState(null)
    const [globalChannels, setGlobalChannels] = useState({
        channel_alipay: 'true',
        channel_usdt_trc20: 'true',
        channel_usdt_bep20: 'true',
        channel_yipay: 'true'
    })
    const [payExpanded, setPayExpanded] = useState({
        alipay: false,
        usdt: false,
        bsc_usdt: false,
        yipay: false
    })

    const checkChannelVisible = (channelKey, defaultDomestic, defaultInternational) => {
        const isDomestic = globalChannels[`${channelKey}_is_domestic`] !== undefined
            ? globalChannels[`${channelKey}_is_domestic`] === 'true'
            : defaultDomestic;
        const isInternational = globalChannels[`${channelKey}_is_international`] !== undefined
            ? globalChannels[`${channelKey}_is_international`] === 'true'
            : defaultInternational;

        return adminLang === 'en' ? isInternational : isDomestic;
    }

    // 域名
    const [domain, setDomain] = useState('')
    const [dnsGuide, setDnsGuide] = useState(null)
    const [dnsVerified, setDnsVerified] = useState(false)
    const [domainSaving, setDomainSaving] = useState(false)
    const [domainDeleting, setDomainDeleting] = useState(false)
    const [domainMsg, setDomainMsg] = useState(null)
    const [verifying, setVerifying] = useState(false)

    // Toast 自动消失（3 秒）
    useEffect(() => { if (shopMsg) { const t = setTimeout(() => setShopMsg(null), 3000); return () => clearTimeout(t) } }, [shopMsg])
    useEffect(() => { if (pwdMsg) { const t = setTimeout(() => setPwdMsg(null), 3000); return () => clearTimeout(t) } }, [pwdMsg])
    useEffect(() => { if (payMsg) { const t = setTimeout(() => setPayMsg(null), 3000); return () => clearTimeout(t) } }, [payMsg])
    useEffect(() => { if (domainMsg) { const t = setTimeout(() => setDomainMsg(null), 3000); return () => clearTimeout(t) } }, [domainMsg])

    useEffect(() => {
        if (!token) return
        Promise.all([
            fetch(`${API}/tenant/me`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
            fetch(`${API}/tenant/settings`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
            mToken ? fetch('/api/platform/plan/limits', { headers: { Authorization: `Bearer ${mToken}` } }).then(r => r.json()).catch(() => null) : Promise.resolve(null),
            mToken ? fetch('/api/platform/me', { headers: { Authorization: `Bearer ${mToken}` } }).then(r => r.json()).catch(() => null) : Promise.resolve(null),
            fetch('/api/admin/settings', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).catch(() => null)
        ]).then(([tenantData, settingsData, limitsData, platformData, adminSettingsData]) => {
            const t = tenantData.tenant
            setTenant(t)
            setTenantSettings(settingsData.settings)
            // 解析 platform shop 的 settings（含 favicon）
            let shopSettings = {}
            const platformShop = platformData?.shop
            if (platformShop?.settings) {
                try { shopSettings = JSON.parse(platformShop.settings) } catch {}
            }
            // 解析租户 systemSettings（含 agentEnabled）
            const sysSettings = adminSettingsData?.settings || {}
            setPlanAllowsAgent(sysSettings._planAllowsAgent !== false)
            const channelsObj = {
                channel_alipay: 'true',
                channel_usdt_trc20: 'true',
                channel_usdt_bep20: 'true',
                channel_yipay: 'true'
            }
            Object.keys(sysSettings).forEach(key => {
                if (key.startsWith('channel_')) {
                    channelsObj[key] = String(sysSettings[key])
                }
            })
            setGlobalChannels(channelsObj)
            // 同步到 merchantStore（保证刷新后页面其他地方也能拿到最新 shop）
            if (platformShop && updateShop) updateShop(platformShop)
            if (t) {
                setShopForm({
                    name: t.shopName || '',
                    notice: t.shopNotice || '',
                    skin: t.shopSkin || 'fresh',
                    logo: t.shopLogo || platformShop?.logo || '',
                    favicon: shopSettings.favicon || '',
                    bookmarkTitle: shopSettings.bookmarkTitle || '',
                    agentEnabled: sysSettings.agentEnabled === true || sysSettings.agentEnabled === 'true',
                    language: sysSettings.language || 'zh',
                    currency: sysSettings.currency || 'CNY'
                })
                // 同步经营货币到 adminPrefsStore（供 Dashboard 等页面使用）
                useAdminPrefsStore.getState().setCurrency(sysSettings.currency || 'CNY')
                // 加载 featureCard
                if (sysSettings.featureCard) {
                    setFeatureCard({
                        enabled: !!sysSettings.featureCard.enabled,
                        title: sysSettings.featureCard.title || '',
                        description: sysSettings.featureCard.description || '',
                        image: sysSettings.featureCard.image || '',
                        buttonText: sysSettings.featureCard.buttonText || '',
                        buttonLink: sysSettings.featureCard.buttonLink || ''
                    })
                }
                // 加载协议声明
                if (sysSettings.agreements) {
                    setAgreements({
                        enabled: !!sysSettings.agreements.enabled,
                        purchasePolicy: sysSettings.agreements.purchasePolicy || '',
                        refundPolicy: sysSettings.agreements.refundPolicy || ''
                    })
                }
                if (t.domains?.[0]) {
                    const currentDomain = t.domains[0].domain
                    setDomain(currentDomain)
                    setDnsVerified(t.domains[0].dnsVerified)
                    if (!t.domains[0].dnsVerified) {
                        const getHostRecord = (domainName) => {
                            if (!domainName) return '@'
                            const parts = domainName.split('.')
                            if (parts.length <= 2) return '@'
                            const lastTwo = parts.slice(-2).join('.')
                            const secondSuffixes = ['com.cn', 'net.cn', 'org.cn', 'co.uk', 'org.uk', 'com.tw', 'com.hk']
                            if (secondSuffixes.includes(lastTwo) && parts.length === 3) return '@'
                            if (secondSuffixes.includes(lastTwo)) return parts.slice(0, -3).join('.')
                            return parts.slice(0, -2).join('.')
                        }
                        const computedHost = getHostRecord(currentDomain)
                        setDnsGuide({
                            type: 'CNAME',
                            host: computedHost,
                            value: 'fallback.vmart.cc',
                            ttl: 'Auto 或 600',
                            tip: `请在您的 DNS 服务商（如 Cloudflare / 腾讯云 / 阿里云）将主机记录为「 ${computedHost} 」的 CNAME 记录指向 fallback.vmart.cc。如果您也使用 Cloudflare 作为解析商，强烈建议您【开启代理状态（即橙色云朵 ☁️）】并将 TTL 设为【Auto】以获得最佳的边缘网络和防护体验。`
                        })
                    }
                }
            }
            if (settingsData.settings) {
                const s = settingsData.settings
                let payConfig = {}
                try { payConfig = JSON.parse(s.paymentConfig || '{}') } catch {}
                
                const alipayConfigured = !!(payConfig.alipay_app_id || payConfig.alipay_private_key)
                const usdtConfigured = !!payConfig.usdt_wallet
                const bscUsdtConfigured = !!payConfig.bsc_usdt_wallet
                const yipayConfigured = !!(payConfig.yipay_pid || payConfig.yipay_key)

                setPayExpanded({
                    alipay: !alipayConfigured,
                    usdt: !usdtConfigured,
                    bsc_usdt: !bscUsdtConfigured,
                    yipay: !yipayConfigured
                })

                setPayForm({
                    alipayEnabled: s.alipayEnabled || false,
                    usdtEnabled: s.usdtEnabled || false,
                    bscUsdtEnabled: s.bscUsdtEnabled || false,
                    yipayEnabled: payConfig.yipay_enabled || false,
                    alipayAppId: payConfig.alipay_app_id || '',
                    alipayPrivateKey: payConfig.alipay_private_key || '',
                    alipayPublicKey: payConfig.alipay_public_key || '',
                    usdtWallet: payConfig.usdt_wallet || '',
                    bscUsdtWallet: payConfig.bsc_usdt_wallet || '',
                    usdtExchangeRate: payConfig.usdt_exchange_rate || '7.2',
                    yipayApiUrl: payConfig.yipay_api_url || '',
                    yipayPid: payConfig.yipay_pid || '',
                    yipayKey: payConfig.yipay_key || '',
                    emailMode: payConfig.email_mode || 'platform',
                    smtpHost: payConfig.smtp_host || '',
                    smtpPort: payConfig.smtp_port || '465',
                    smtpUser: payConfig.smtp_user || '',
                    smtpPass: payConfig.smtp_pass || '',
                    notifyOrderPaid: payConfig.notify_order_paid !== false,
                    notifyShipRemind: payConfig.notify_ship_remind !== false,
                    notifyNewTicket: payConfig.notify_new_ticket !== false,
                    notifyNewUser: payConfig.notify_new_user || false,
                    notifyStockAlert: payConfig.notify_stock_alert !== false,
                    notifyOrderCancel: payConfig.notify_order_cancel || false,
                    notifyRefund: payConfig.notify_refund !== false,
                    notifyEmail: payConfig.notify_email || '',
                    stockMode: payConfig.stock_mode || 'auto',
                    orderTimeout: payConfig.order_timeout || 15
                })
            }
            // 获取套餐允许的皮肤
            if (limitsData?.limits?.skins) {
                const skins = limitsData.limits.skins
                if (Array.isArray(skins)) {
                    // 兼容旧 plan_config 里残留的 classic：把没在 ALL_SKIN_OPTIONS 里的过滤掉，并保证 origin 默认包含
                    const validKeys = ALL_SKIN_OPTIONS.map(o => o.value)
                    const cleaned = skins.filter(s => validKeys.includes(s))
                    if (cleaned.length === 0) {
                        setAllowedSkins(['fresh', 'zen', 'class'])
                    } else {
                        setAllowedSkins(cleaned)
                    }
                } else if (skins === 'all') {
                    setAllowedSkins(['fresh', 'zen', 'class'])
                }
            }
            // 自定义域名权限
            if (limitsData?.limits) {
                setPlanAllowsCustomDomain(limitsData.limits.customDomain === true)
                if (typeof limitsData.limits.emailNotifications === 'number') {
                    setEmailQuota(limitsData.limits.emailNotifications)
                }
                if (typeof limitsData.limits.maxSubAdmins === 'number') {
                    setMaxSubAdmins(limitsData.limits.maxSubAdmins)
                }
            }
        }).finally(() => setLoading(false))
    }, [token, mToken])

    // 拉取本月邮件用量
    useEffect(() => {
        if (!token) return
        fetch('/api/admin/email-usage', { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.json())
            .then(emailUsageData => {
                if (typeof emailUsageData.limit === 'number') setEmailQuota(emailUsageData.limit)
                if (typeof emailUsageData.used === 'number') setEmailUsed(emailUsageData.used)
                if (typeof emailUsageData.packBalance === 'number') setEmailPackBalance(emailUsageData.packBalance)
            })
            .catch(() => {})
    }, [token])

    // 拉取已分配的定制主题
    useEffect(() => {
        if (!token) return
        fetch('/api/admin/available-themes', { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.json())
            .then(availableThemesData => setCustomThemes(availableThemesData.custom || []))
            .catch(() => {})
    }, [token])

    const refreshEmailUsage = () => {
        if (!token) return
        fetch('/api/admin/email-usage', { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.json())
            .then(emailUsageData => {
                if (typeof emailUsageData.limit === 'number') setEmailQuota(emailUsageData.limit)
                if (typeof emailUsageData.used === 'number') setEmailUsed(emailUsageData.used)
                if (typeof emailUsageData.packBalance === 'number') setEmailPackBalance(emailUsageData.packBalance)
            })
            .catch(() => {})
    }

    // 保存商城Basic Info
    const handleShopSave = async e => {
        e.preventDefault()
        setShopSaving(true); setShopMsg(null)
        try {
            // 更新 tenant 信息
            const r = await fetch(`${API}/tenant/setup`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    shopName: shopForm.name,
                    shopSlug: tenant?.shopSlug,
                    shopSkin: shopForm.skin,
                    shopNotice: shopForm.notice,
                    shopLogo: shopForm.logo
                })
            })
            const d = await r.json()
            if (r.ok) {
                setTenant(d.tenant)
                setShopMsg({ type: 'success', text: L('inline.saved.edcefa5') })
                // 同步更新 platform shop
                if (mToken) {
                    const psr = await fetch('/api/platform/shop', {
                        method: 'PUT',
                        headers: { Authorization: `Bearer ${mToken}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name: shopForm.name, notice: shopForm.notice, skin: shopForm.skin, logo: shopForm.logo, settings: JSON.stringify({ favicon: shopForm.favicon, bookmarkTitle: shopForm.bookmarkTitle }) })
                    })
                    const psData = await psr.json().catch(() => null)
                    if (psData?.shop && updateShop) updateShop(psData.shop)
                }
                // 保存 systemSettings（如代理管理开关 + 特色卡片）
                await fetch('/api/admin/settings', {
                    method: 'PUT',
                    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        agentEnabled: !!shopForm.agentEnabled,
                        language: shopForm.language || 'zh',
                        currency: shopForm.currency || 'CNY',
                        featureCard: {
                            enabled: !!featureCard.enabled,
                            title: featureCard.title || '',
                            description: featureCard.description || '',
                            image: featureCard.image || '',
                            buttonText: featureCard.buttonText || '',
                            buttonLink: featureCard.buttonLink || '',
                            collapsed: !!featureCard.collapsed
                        },
                        agreements: {
                            enabled: !!agreements.enabled,
                            purchasePolicy: agreements.purchasePolicy || '',
                            refundPolicy: agreements.refundPolicy || ''
                        }
                    })
                }).catch(() => {})

                // 保存 stock_mode 至 tenantSettings 的 paymentConfig 中
                const paymentConfig = JSON.stringify({
                    alipay_app_id: payForm.alipayAppId,
                    alipay_private_key: payForm.alipayPrivateKey,
                    alipay_public_key: payForm.alipayPublicKey,
                    usdt_wallet: payForm.usdtWallet,
                    bsc_usdt_wallet: payForm.bscUsdtWallet,
                    usdt_exchange_rate: payForm.usdtExchangeRate,
                    yipay_enabled: payForm.yipayEnabled,
                    yipay_api_url: payForm.yipayApiUrl,
                    yipay_pid: payForm.yipayPid,
                    yipay_key: payForm.yipayKey,
                    email_mode: payForm.emailMode,
                    smtp_host: payForm.smtpHost,
                    smtp_port: payForm.smtpPort,
                    smtp_user: payForm.smtpUser,
                    smtp_pass: payForm.smtpPass,
                    notify_order_paid: payForm.notifyOrderPaid,
                    notify_ship_remind: payForm.notifyShipRemind,
                    notify_new_ticket: payForm.notifyNewTicket,
                    notify_new_user: payForm.notifyNewUser,
                    notify_stock_alert: payForm.notifyStockAlert,
                    notify_order_cancel: payForm.notifyOrderCancel,
                    notify_refund: payForm.notifyRefund,
                    notify_email: payForm.notifyEmail,
                    stock_mode: payForm.stockMode,
                    order_timeout: payForm.orderTimeout
                })
                await fetch(`${API}/tenant/settings`, {
                    method: 'PUT',
                    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        alipayEnabled: payForm.alipayEnabled,
                        usdtEnabled: payForm.usdtEnabled,
                        bscUsdtEnabled: payForm.bscUsdtEnabled,
                        paymentConfig
                    })
                }).catch(() => {})
            } else {
                setShopMsg({ type: 'error', text: d.error || L('inline.save.failed.1b32f27') })
            }
        } catch { setShopMsg({ type: 'error', text: L('inline.network.error.c15d73e') }) }
        setShopSaving(false)
    }

    // Password
    const handlePwdChange = async e => {
        e.preventDefault()
        if (pwdForm.newPassword !== pwdForm.confirm) { setPwdMsg({ type: 'error', text: L('inline.passwords.do.not.match.2de89f3') }); return }
        if (pwdForm.newPassword.length < 6) { setPwdMsg({ type: 'error', text: L('inline.password.min.6.chars.8a9dde5') }); return }
        setPwdSaving(true); setPwdMsg(null)
        try {
            const r = await fetch('/api/platform/account', {
                method: 'PATCH',
                headers: { Authorization: `Bearer ${mToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ currentPassword: pwdForm.currentPassword, newPassword: pwdForm.newPassword })
            })
            const d = await r.json()
            if (r.ok) { setPwdMsg({ type: 'success', text: L('inline.password.updated.5c338f7') }); setPwdForm({ currentPassword: '', newPassword: '', confirm: '' }) }
            else setPwdMsg({ type: 'error', text: d.error || L('inline.update.failed.8e798b4') })
        } catch { setPwdMsg({ type: 'error', text: L('inline.network.error.c15d73e') }) }
        setPwdSaving(false)
    }

    // 保存Payment
    const handlePaySave = async (e) => {
        if (e?.preventDefault) e.preventDefault()
        // 校验：已启用的支付方式必填配置
        const errors = []
        if (payForm.alipayEnabled) {
            if (!payForm.alipayAppId.trim()) errors.push(L('inline.alipay.please.enter.app.id.0620f7f'))
            if (!payForm.alipayPrivateKey.trim()) errors.push(L('inline.alipay.please.enter.private.key.e40bdce'))
            if (!payForm.alipayPublicKey.trim()) errors.push(L('inline.alipay.please.enter.public.key.1ce5a9a'))
        }
        if (payForm.usdtEnabled) {
            if (!payForm.usdtWallet.trim()) errors.push('USDT-TRC20: Please enter wallet address')
            else if (!/^T[A-Za-z0-9]{33}$/.test(payForm.usdtWallet.trim())) errors.push('USDT-TRC20: Invalid address format')
            const rate = parseFloat(payForm.usdtExchangeRate)
            if (!rate || rate <= 0) errors.push('USDT-TRC20: Please enter valid rate')
        }
        if (payForm.bscUsdtEnabled) {
            if (!payForm.bscUsdtWallet.trim()) errors.push('USDT-BEP20: Please enter wallet address')
            else if (!/^0x[a-fA-F0-9]{40}$/.test(payForm.bscUsdtWallet.trim())) errors.push('USDT-BEP20: Invalid address format')
        }
        if (payForm.yipayEnabled) {
            if (!payForm.yipayApiUrl.trim()) errors.push(L('易支付：请输入 API 地址', 'Yipay: Please enter API URL'))
            if (!payForm.yipayPid.trim()) errors.push(L('易支付：请输入商户 ID', 'Yipay: Please enter Merchant ID'))
            if (!payForm.yipayKey.trim()) errors.push(L('易支付：请输入商户密钥', 'Yipay: Please enter Merchant Key'))
        }
        if (errors.length) {
            setPayMsg({ type: 'error', text: errors[0] })
            return
        }

        setPaySaving(true); setPayMsg(null)
        try {
            const paymentConfig = JSON.stringify({
                alipay_app_id: payForm.alipayAppId,
                alipay_private_key: payForm.alipayPrivateKey,
                alipay_public_key: payForm.alipayPublicKey,
                usdt_wallet: payForm.usdtWallet,
                bsc_usdt_wallet: payForm.bscUsdtWallet,
                usdt_exchange_rate: payForm.usdtExchangeRate,
                yipay_enabled: payForm.yipayEnabled,
                yipay_api_url: payForm.yipayApiUrl,
                yipay_pid: payForm.yipayPid,
                yipay_key: payForm.yipayKey,
                email_mode: payForm.emailMode,
                smtp_host: payForm.smtpHost,
                smtp_port: payForm.smtpPort,
                smtp_user: payForm.smtpUser,
                smtp_pass: payForm.smtpPass,
                notify_order_paid: payForm.notifyOrderPaid,
                notify_ship_remind: payForm.notifyShipRemind,
                notify_new_ticket: payForm.notifyNewTicket,
                notify_new_user: payForm.notifyNewUser,
                notify_stock_alert: payForm.notifyStockAlert,
                notify_order_cancel: payForm.notifyOrderCancel,
                notify_refund: payForm.notifyRefund,
                notify_email: payForm.notifyEmail,
                stock_mode: payForm.stockMode,
                order_timeout: payForm.orderTimeout
            })
            const r = await fetch(`${API}/tenant/settings`, {
                method: 'PUT',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    alipayEnabled: payForm.alipayEnabled,
                    usdtEnabled: payForm.usdtEnabled,
                    bscUsdtEnabled: payForm.bscUsdtEnabled,
                    paymentConfig
                })
            })
            const d = await r.json()
            if (r.ok) setPayMsg({ type: 'success', text: L('inline.settings.saved.96f47b4') })
            else setPayMsg({ type: 'error', text: d.error || L('inline.save.failed.1b32f27') })
        } catch { setPayMsg({ type: 'error', text: L('inline.network.error.c15d73e') }) }
        setPaySaving(false)
    }

    // 域名操作
    const addDomain = async () => {
        if (!domain.trim()) return
        setDomainSaving(true); setDomainMsg(null)
        try {
            const r = await fetch(`${API}/tenant/domain`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ domain: domain.trim().toLowerCase() })
            })
            const d = await r.json()
            if (d.dnsGuide) {
                setDnsGuide(d.dnsGuide)
                setDomainMsg({ type: 'info', text: L('域名已添加，请配置 DNS 解析', 'Domain added, please configure DNS') })
                setTenant(prev => ({
                    ...prev,
                    domains: [d.domain]
                }))
            }
            else setDomainMsg({ type: 'error', text: d.error || L('inline.add.failed.4bda4aa') })
        } catch { setDomainMsg({ type: 'error', text: L('inline.network.error.c15d73e') }) }
        setDomainSaving(false)
    }

    const unbindDomain = async () => {
        if (!window.confirm(L('确定要解绑该自定义域名吗？解绑后商城将无法通过该域名访问。', 'Are you sure you want to unbind this custom domain? The store will no longer be accessible via this domain.'))) {
            return
        }
        setDomainDeleting(true); setDomainMsg(null)
        try {
            const r = await fetch(`${API}/tenant/domain`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ domain: domain.trim() })
            })
            const d = await r.json()
            if (r.ok) {
                setDomain('')
                setDnsVerified(false)
                setDnsGuide(null)
                setDomainMsg({ type: 'success', text: L('域名已成功解绑', 'Domain successfully unbound') })
                setTenant(prev => ({
                    ...prev,
                    domains: []
                }))
            } else {
                setDomainMsg({ type: 'error', text: d.error || L('解绑失败', 'Unbind failed') })
            }
        } catch {
            setDomainMsg({ type: 'error', text: L('inline.network.error.c15d73e') })
        }
        setDomainDeleting(false)
    }

    const verifyDns = async () => {
        setVerifying(true); setDomainMsg(null)
        try {
            const r = await fetch(`${API}/tenant/domain/verify`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ domain: domain.trim() })
            })
            const d = await r.json()
            if (d.verified) { setDnsVerified(true); setDomainMsg({ type: 'success', text: L('DNS 验证成功！', 'DNS verified!') }) }
            else setDomainMsg({ type: 'warning', text: d.message || L('DNS 尚未生效或未匹配成功', 'DNS not yet propagated') })
        } catch { setDomainMsg({ type: 'error', text: L('inline.network.error.c15d73e') }) }
        setVerifying(false)
    }

    if (loading) return <div className="ts-loading">{L('admin.common.loading')}</div>

    const displayEmail = merchant?.email || user?.email || '—'
    const displaySlug = shop?.slug || tenant?.shopSlug || '—'

    const tabs = [
        { key: 'basic', icon: '🏪', label: L('inline.basic.info.183eebc') },
        { key: 'payment', icon: '💳', label: L('inline.payment.d9fbbc6') },
        { key: 'email', icon: '📧', label: L('inline.email.dceeba7') },
        { key: 'admin', icon: '👥', label: L('inline.admins.d35236c') },
        { key: 'account', icon: '🔐', label: L('inline.account.d72d065') },
        { key: 'plan', icon: '💎', label: L('inline.plan.e8ec140') },
    ]

    return (
        <div className="ts-page">
            <div className="ts-header">
                <h2>{L('inline.store.settings.d95dc37')}</h2>
                <p>{L('inline.manage.store.info.payment.methods.account.security.and.domai.f6fe2d3')}</p>
            </div>

            {/* Tab 导航 */}
            <div className="ts-tabs">
                {tabs.map(t => (
                    <button
                        key={t.key}
                        className={`ts-tab ${activeTab === t.key ? 'active' : ''}`}
                        onClick={() => setActiveTab(t.key)}
                    >
                        <span>{t.icon}</span>
                        <span>{t.label}</span>
                    </button>
                ))}
            </div>

            {/* Basic Info */}
            {activeTab === 'basic' && (
                <div className="ts-section">
                    {shopMsg && <div className={`ts-msg ${shopMsg.type}`}>{shopMsg.text}</div>}
                    <form onSubmit={handleShopSave} className="ts-form">
                        <div className="ts-form-group">
                            <label>{L('inline.store.name.b223d79')}</label>
                            <input value={shopForm.name} onChange={e => setShopForm(f => ({ ...f, name: e.target.value }))} placeholder={L('inline.your.store.name.ebd1ef9')} required />
                        </div>
                        <div className="ts-form-group">
                            <label>Logo</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                {shopForm.logo && <img src={shopForm.logo} alt="Logo" style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover', border: '1px solid var(--border-color)' }} />}
                                <label style={{ padding: '8px 16px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontSize: '0.84rem', cursor: 'pointer' }}>
                                    {shopForm.logo ? L('inline.replace.6ce02bc') : L('inline.upload.logo.2a5b9fa')}
                                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={async e => {
                                        const file = e.target.files[0]
                                        if (!file) return
                                        const uploadFile = await prepareUploadImageFile(file)
                                        const formData = new FormData()
                                        formData.append('images', uploadFile)
                                        try {
                                            const r = await fetch('/api/upload', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData })
                                            const d = await r.json()
                                            if (d.images?.[0]) { setShopForm(f => ({ ...f, logo: d.images[0].urls.original })); setShopMsg({ type: 'success', text: L('inline.logo.uploaded.076e78c') }) }
                                            else setShopMsg({ type: 'error', text: d.error || L('inline.upload.failed.7d90602') })
                                        } catch { setShopMsg({ type: 'error', text: L('inline.upload.failed.7d90602') }) }
                                    }} />
                                </label>
                                {shopForm.logo && <button type="button" onClick={() => setShopForm(f => ({ ...f, logo: '' }))} style={{ background: 'none', border: 'none', color: 'var(--error)', fontSize: '0.8rem', cursor: 'pointer' }}>{L('inline.clear.a0e44b2')}</button>}
                            </div>
                            <span className="ts-hint">{L('inline.recommended.size.200.x.200.png.svg.supported.0d81dfb')}</span>
                        </div>
                        <div className="ts-form-group">
                            <label>{L('inline.favicon.a21d15d')}</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                {shopForm.favicon && <img src={shopForm.favicon} alt="Favicon" style={{ width: 32, height: 32, borderRadius: 4, objectFit: 'cover', border: '1px solid var(--border-color)' }} />}
                                <label style={{ padding: '8px 16px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontSize: '0.84rem', cursor: 'pointer' }}>
                                    {shopForm.favicon ? L('inline.replace.6ce02bc') : L('inline.upload.favicon.28f504b')}
                                    <input type="file" accept="image/*,.ico" style={{ display: 'none' }} onChange={async e => {
                                        const file = e.target.files[0]
                                        if (!file) return
                                        const uploadFile = await prepareUploadImageFile(file)
                                        const formData = new FormData()
                                        formData.append('images', uploadFile)
                                        try {
                                            const r = await fetch('/api/upload', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData })
                                            const d = await r.json()
                                            if (d.images?.[0]) { setShopForm(f => ({ ...f, favicon: d.images[0].urls.original })); setShopMsg({ type: 'success', text: L('inline.favicon.uploaded.af41074') }) }
                                            else setShopMsg({ type: 'error', text: d.error || L('inline.upload.failed.7d90602') })
                                        } catch { setShopMsg({ type: 'error', text: L('inline.upload.failed.7d90602') }) }
                                    }} />
                                </label>
                                {shopForm.favicon && <button type="button" onClick={() => setShopForm(f => ({ ...f, favicon: '' }))} style={{ background: 'none', border: 'none', color: 'var(--error)', fontSize: '0.8rem', cursor: 'pointer' }}>{L('inline.clear.a0e44b2')}</button>}
                            </div>
                            <span className="ts-hint">{L('inline.recommended.size.32.x.32.ico.or.png.97179ea')}</span>
                        </div>
                        <div className="ts-form-group">
                            <label>{L('书签栏文字 (浏览器标题)', 'Browser Tab Title')}</label>
                            <input
                                type="text"
                                placeholder={L('留空默认使用域名或商城名称', 'Leave blank to use domain or shop name by default')}
                                value={shopForm.bookmarkTitle || ''}
                                onChange={e => setShopForm(f => ({ ...f, bookmarkTitle: e.target.value }))}
                            />
                            <span className="ts-hint">{L('自定义浏览器标签页和书签栏显示的文字。如果留空，默认使用自动文字。', 'Customize the text displayed on browser tab and bookmark bar. If left blank, the automatic text will be used.')}</span>
                        </div>
                        <div className="ts-form-group">
                            <label>{L('inline.theme.410cf43')}</label>

                            {/* 当前主题预览 + 切换按钮 */}
                            {(() => {
                                const allOptions = [
                                    ...ALL_SKIN_OPTIONS.filter(s => allowedSkins.includes(s.value)).map(s => ({
                                        value: s.value,
                                        label: L(s.labelZh, s.labelEn),
                                        desc: L(s.descZh, s.descEn),
                                        group: s.value === 'class' ? L('inline.classic.c59d41b') : L('inline.minimal.db5115a'),
                                        type: 'public'
                                    })),
                                    ...customThemes.map(t => ({
                                        value: `custom:${t.key}`, label: t.name,
                                        desc: t.description || L('inline.custom.theme.edda78b'),
                                        group: L('inline.custom.953741b'), type: 'custom'
                                    }))
                                ]
                                const current = allOptions.find(o => o.value === shopForm.skin)
                                    || allOptions[0]
                                    || { label: L('inline.no.theme.selected.5149ae5'), desc: L('inline.please.select.a.theme.647628a'), group: '' }

                                return (
                                    <div className="ts-theme-current">
                                        <div className="ts-theme-current-info">
                                            <div className="ts-theme-current-meta">
                                                {current.group && <span className="ts-theme-current-group">{current.group}</span>}
                                                {current.type === 'custom' && <span className="ts-theme-current-badge">✨ {L('inline.custom.953741b')}</span>}
                                            </div>
                                            <div className="ts-theme-current-name">{current.label}</div>
                                            <div className="ts-theme-current-desc">{current.desc}</div>
                                        </div>
                                        <button
                                            type="button"
                                            className="ts-theme-switch-btn"
                                            onClick={() => setThemePickerOpen(true)}
                                        >
                                            {L('inline.switch.theme.0f2165b')}
                                        </button>
                                    </div>
                                )
                            })()}

                            {allowedSkins.length < 3 && (
                                <span className="ts-hint">{L('inline.upgrade.to.unlock.more.themes.cda1023')}</span>
                            )}
                        </div>
                        <div className="ts-form-group">
                            <label>{L('inline.store.language.8f95cf0')}</label>
                            <select
                                value={shopForm.language}
                                onChange={e => setShopForm(f => ({ ...f, language: e.target.value }))}
                                style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.9rem' }}
                            >
                                <option value="zh">🇨🇳 中文</option>
                                <option value="en">🇺🇸 English</option>
                                <option value="auto">🌐 {L('inline.auto.browser.language.8d0adbd')}</option>
                            </select>
                            <span className="ts-hint">{L('inline.set.buyer.side.language.in.auto.mode.visitors.can.switch.it..81bb27c')}</span>
                        </div>

                        {/* 后台语言 & 货币偏好 */}
                        <AdminPrefsSection
                            currency={shopForm.currency}
                            onCurrencyChange={(cur) => setShopForm(f => ({ ...f, currency: cur }))}
                        />

                        <div className="ts-form-group">
                            <label>{L('inline.agent.system.4353d5e')}</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
                                <label className="ts-switch" style={{ position: 'relative', display: 'inline-block', width: 42, height: 22, opacity: planAllowsAgent ? 1 : 0.5, cursor: planAllowsAgent ? 'pointer' : 'not-allowed' }}>
                                    <input
                                        type="checkbox"
                                        checked={!!shopForm.agentEnabled}
                                        disabled={!planAllowsAgent}
                                        onChange={e => setShopForm(f => ({ ...f, agentEnabled: e.target.checked }))}
                                        style={{ opacity: 0, width: 0, height: 0 }}
                                    />
                                    <span style={{
                                        position: 'absolute', cursor: planAllowsAgent ? 'pointer' : 'not-allowed', top: 0, left: 0, right: 0, bottom: 0,
                                        background: shopForm.agentEnabled ? 'var(--primary)' : '#ccc',
                                        borderRadius: 22, transition: '0.2s'
                                    }}>
                                        <span style={{
                                            position: 'absolute', height: 16, width: 16, left: shopForm.agentEnabled ? 23 : 3,
                                            top: 3, background: '#fff', borderRadius: '50%', transition: '0.2s'
                                        }} />
                                    </span>
                                </label>
                                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                    {!planAllowsAgent
                                        ? L('inline.current.plan.does.not.support.the.agent.system.please.upgrad.efdcdd0')
                                        : (shopForm.agentEnabled ? L('inline.enabled.agent.menu.is.visible.in.the.sidebar.5ad2235') : L('inline.disabled.agent.menu.is.hidden.2c8b403'))}
                                </span>
                            </div>
                            <span className="ts-hint">{L('inline.use.this.for.agents.theme.pools.and.withdrawals.disable.it.i.40ace2b')}</span>
                        </div>
                        <div className="ts-form-group">
                            <label>{L('inline.store.url.3755cdc')}</label>
                            <div className="ts-readonly">
                                <a href={`/v/${displaySlug}`} target="_blank" rel="noreferrer">
                                    {window.location.origin}/v/{displaySlug}
                                </a>
                            </div>
                        </div>

                        {/* Custom Domain（Pro功能） */}
                        <div className="ts-form-group">
                            <label>{L('inline.custom.domain.c02c51e')} <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>{planAllowsCustomDomain ? '' : L('inline.not.supported.by.current.plan.3628749')}</span></label>
                            {!planAllowsCustomDomain ? (
                                <div style={{
                                    padding: '16px 18px', border: '1px dashed var(--border-color)',
                                    borderRadius: 8, background: 'var(--bg-secondary)',
                                    color: 'var(--text-secondary)', fontSize: '0.85rem',
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12
                                }}>
                                    <span>🔒 {L('inline.custom.domains.are.a.paid.feature.please.upgrade.to.a.suppor.e6b3d54')}</span>
                                    <a href="/Man/plan-config" style={{ display: 'none' }}>{L('inline.upgrade.3147f08')}</a>
                                </div>
                            ) : (
                                <>
                                    {domainMsg && <div className={`ts-msg ${domainMsg.type}`}>{domainMsg.text}</div>}
                                    <div style={{ display: 'flex', gap: 10 }}>
                                        <input
                                            value={domain}
                                            onChange={e => setDomain(e.target.value.toLowerCase())}
                                            placeholder={L('例如 shop.yourdomain.com', 'e.g. shop.yourdomain.com')}
                                            disabled={dnsVerified || (tenant?.domains && tenant.domains.length > 0)}
                                            style={{ flex: 1 }}
                                        />
                                        {!dnsVerified && !(tenant?.domains && tenant.domains.length > 0) ? (
                                            <button type="button" className="ts-btn-secondary" onClick={addDomain} disabled={domainSaving || !domain}>
                                                {domainSaving ? '...' : L('添加', 'Add')}
                                            </button>
                                        ) : (
                                            <button type="button" className="ts-btn-danger" onClick={unbindDomain} disabled={domainDeleting || !domain} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>
                                                {domainDeleting ? '...' : L('解绑', 'Unbind')}
                                            </button>
                                        )}
                                    </div>
                                    {dnsGuide && !dnsVerified && (
                                        <div className="ts-dns-guide" style={{ marginTop: 12 }}>
                                            <div className="ts-dns-title">{L('📋 请添加以下 DNS 解析记录', '📋 Please add the following DNS record')}</div>
                                            <div className="ts-dns-table">
                                                <div><span>{L('类型', 'Type')}</span><code>{dnsGuide.type || 'CNAME'}</code></div>
                                                <div><span>{L('主机记录', 'Host')}</span><code>{dnsGuide.host || 'www'}</code></div>
                                                <div><span>{L('记录值', 'Value')}</span><code>{dnsGuide.value}</code></div>
                                                <div><span>{L('TTL', 'TTL')}</span><code>{dnsGuide.ttl || 600}</code></div>
                                            </div>
                                            {dnsGuide.tip && (
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 8, lineHeight: '1.4' }}>
                                                    💡 {dnsGuide.tip}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {domain && !dnsVerified && (
                                        <button type="button" className="ts-btn-primary" onClick={verifyDns} disabled={verifying} style={{ marginTop: 10 }}>
                                            {verifying ? L('正在验证...', 'Checking...') : L('🔍 验证 DNS', '🔍 Verify DNS')}
                                        </button>
                                    )}
                                    {dnsVerified && (
                                        <div className="ts-success-box" style={{ marginTop: 10 }}>{L('✅ DNS 验证成功，域名已生效', '✅ DNS verified, domain is active')}</div>
                                    )}
                                    <span className="ts-hint">{L('绑定您自己的独立域名，打造更专业的商城形象', 'Bind your own domain for a professional look')}</span>
                                </>
                            )}
                        </div>

                        {/* Homepage Info Card */}
                        <div className="ts-form-group" style={{ borderTop: '1px solid var(--border-color)', paddingTop: 18, marginTop: 4 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                <label style={{ margin: 0 }}>{L('首页特色卡片', 'Homepage Info Card')}</label>
                                <label className="ts-switch" style={{ position: 'relative', display: 'inline-block', width: 42, height: 22 }}>
                                    <input
                                        type="checkbox"
                                        checked={!!featureCard.enabled}
                                        onChange={e => setFeatureCard(f => ({ ...f, enabled: e.target.checked }))}
                                        style={{ opacity: 0, width: 0, height: 0 }}
                                    />
                                    <span style={{
                                        position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                                        background: featureCard.enabled ? 'var(--primary)' : '#ccc',
                                        borderRadius: 22, transition: '0.2s'
                                    }}>
                                        <span style={{
                                            position: 'absolute', height: 16, width: 16, left: featureCard.enabled ? 23 : 3,
                                            top: 3, background: '#fff', borderRadius: '50%', transition: '0.2s'
                                        }} />
                                    </span>
                                </label>
                            </div>
                            <span className="ts-hint">{L('启用后，将在首页商品列表上方展示一个信息提示卡片', 'When enabled, shows an info card above the product list')}</span>

                            {featureCard.enabled && (
                                <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    <div>
                                        <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>{L('标题 (可选)', 'Title (optional)')}</label>
                                        <input value={featureCard.title || ''} onChange={e => setFeatureCard(f => ({ ...f, title: e.target.value }))} placeholder={L('例如 声明公告', 'e.g. Announcement')} maxLength={40} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>{L('描述内容', 'Description')}</label>
                                        <textarea value={featureCard.description} onChange={e => setFeatureCard(f => ({ ...f, description: e.target.value }))} placeholder={L('支持换行，URL 会自动转为超链接。', 'Supports line breaks. URLs auto-linked.')} rows={8} maxLength={2000} style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.9rem', fontFamily: 'inherit', resize: 'vertical', minHeight: 160 }} />
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                                        <label style={{ position: 'relative', display: 'inline-block', width: 36, height: 20, flexShrink: 0 }}>
                                            <input type="checkbox" checked={!!featureCard.collapsed} onChange={e => setFeatureCard(f => ({ ...f, collapsed: e.target.checked }))} style={{ opacity: 0, width: 0, height: 0 }} />
                                            <span style={{
                                                position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                                                background: featureCard.collapsed ? 'var(--primary)' : '#ccc',
                                                borderRadius: 20, transition: '0.2s'
                                            }}>
                                                <span style={{
                                                    position: 'absolute', height: 14, width: 14, left: featureCard.collapsed ? 19 : 3,
                                                    top: 3, background: '#fff', borderRadius: '50%', transition: '0.2s'
                                                }} />
                                            </span>
                                        </label>
                                        <span style={{ fontSize: '0.84rem', color: 'var(--text-primary)' }}>{L('默认收起', 'Collapsed by default')}</span>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{L('买家需要点击标题才能展开内容', 'Users need to click title to expand')}</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Notice Banner */}
                        <div className="ts-form-group" style={{ borderTop: '1px solid var(--border-color)', paddingTop: 18, marginTop: 4 }}>
                            <label>{L('首页滚动公告', 'Notice Banner')}</label>
                            <input value={shopForm.notice} onChange={e => setShopForm(f => ({ ...f, notice: e.target.value }))} placeholder={L('在首页顶部展示的单行滚动公告 (可选)', 'One-line notice shown at top of homepage (optional)')} />
                            <span className="ts-hint">{L('显示在导航栏下方的提示条中', 'Shown in the dark gray bar below the navbar')}</span>
                        </div>

                        {/* Store Policies */}
                        <div className="ts-form-group" style={{ borderTop: '1px solid var(--border-color)', paddingTop: 18, marginTop: 4 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                <label style={{ margin: 0 }}>{L('商城服务协议', 'Store Policies')}</label>
                                <label className="ts-switch" style={{ position: 'relative', display: 'inline-block', width: 42, height: 22 }}>
                                    <input type="checkbox" checked={!!agreements.enabled} onChange={e => setAgreements(a => ({ ...a, enabled: e.target.checked }))} style={{ opacity: 0, width: 0, height: 0 }} />
                                    <span style={{ position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, background: agreements.enabled ? 'var(--primary)' : '#ccc', borderRadius: 22, transition: '0.2s' }}>
                                        <span style={{ position: 'absolute', height: 16, width: 16, left: agreements.enabled ? 23 : 3, top: 3, background: '#fff', borderRadius: '50%', transition: '0.2s' }} />
                                    </span>
                                </label>
                            </div>
                            <span className="ts-hint">{L('启用后，买家下单结算时需勾选同意协议（默认勾选）', 'When enabled, checkout shows agreement checkbox (checked by default)')}</span>

                            {agreements.enabled && (
                                <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
                                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const blob = new Blob([policyTemplate], { type: 'text/plain;charset=utf-8' })
                                                const url = URL.createObjectURL(blob)
                                                const a = document.createElement('a')
                                                a.href = url
                                                a.download = L('inline.store.policies.template.txt.1424c6b')
                                                a.click()
                                                URL.revokeObjectURL(url)
                                            }}
                                            style={{
                                                padding: '8px 16px', background: 'rgba(99, 102, 241, 0.08)',
                                                border: '1px solid rgba(99, 102, 241, 0.3)', borderRadius: 8,
                                                color: '#4f46e5', fontSize: '0.82rem', cursor: 'pointer', fontFamily: 'inherit'
                                            }}
                                        >
                                            📄 {L('inline.download.template.e4c7f42')}
                                        </button>
                                        <label style={{
                                            padding: '8px 16px', background: 'var(--bg-tertiary)',
                                            border: '1px solid var(--border-color)', borderRadius: 8,
                                            color: 'var(--text-primary)', fontSize: '0.82rem', cursor: 'pointer'
                                        }}>
                                            📤 {L('inline.upload.policy.file.txt.49d0a77')}
                                            <input
                                                type="file"
                                                accept=".txt"
                                                style={{ display: 'none' }}
                                                onChange={e => {
                                                    const file = e.target.files?.[0]
                                                    if (!file) return
                                                    const reader = new FileReader()
                                                    reader.onload = (ev) => {
                                                        const content = ev.target.result
                                                        // 按【Purchase Policy】和【Refund Policy】分割
                                                        let purchase = '', refund = ''
                                                        const purchaseMatch = content.match(/【Purchase Policy】([\s\S]*?)(?=【Refund Policy】|$)/)
                                                        const refundMatch = content.match(/【Refund Policy】([\s\S]*)/)
                                                        if (purchaseMatch) purchase = purchaseMatch[1].trim()
                                                        if (refundMatch) refund = refundMatch[1].trim()
                                                        // 如果没有标记，整个内容作为Purchase Policy
                                                        if (!purchase && !refund) purchase = content.trim()
                                                        setAgreements(a => ({ ...a, purchasePolicy: purchase, refundPolicy: refund }))
                                                        setAgreementPreviewOpen(true)
                                                        toast.success(L(`已导入协议文件：${file.name}`, `Policy file imported: ${file.name}`))
                                                    }
                                                    reader.readAsText(file, 'UTF-8')
                                                    e.target.value = ''
                                                }}
                                            />
                                        </label>
                                    </div>

                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                                        💡 {L('inline.file.format.plain.text.txt.use.purchase.policy.and.refund.po.53eb065')}
                                    </div>

                                    {(agreements.purchasePolicy || agreements.refundPolicy) && (
                                        <div style={{ padding: '12px 14px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 8 }}>
                                            <div
                                                style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                                onClick={() => setAgreementPreviewOpen(o => !o)}
                                            >
                                                <span>{L('inline.uploaded.content.preview.094a071')}</span>
                                                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{agreementPreviewOpen ? L('inline.collapse.538e5c8') : L('inline.expand.3107846')}</span>
                                            </div>
                                            {agreementPreviewOpen && (
                                                <div style={{ marginTop: 10 }}>
                                            {agreements.purchasePolicy && (
                                                <div style={{ marginBottom: 10 }}>
                                                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 3 }}>{L('购买须知', 'Purchase Policy')}</div>
                                                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', maxHeight: 80, overflow: 'hidden' }}>
                                                        {agreements.purchasePolicy.slice(0, 200)}{agreements.purchasePolicy.length > 200 ? '...' : ''}
                                                    </div>
                                                </div>
                                            )}
                                            {agreements.refundPolicy && (
                                                <div>
                                                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 3 }}>{L('退款政策', 'Refund Policy')}</div>
                                                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', maxHeight: 80, overflow: 'hidden' }}>
                                                        {agreements.refundPolicy.slice(0, 200)}{agreements.refundPolicy.length > 200 ? '...' : ''}
                                                    </div>
                                                </div>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => setAgreements(a => ({ ...a, purchasePolicy: '', refundPolicy: '' }))}
                                                style={{ marginTop: 10, padding: '4px 12px', background: 'none', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, color: '#ef4444', fontSize: '0.75rem', cursor: 'pointer' }}
                                            >
                                                {L('inline.clear.uploaded.content.a5ba771')}
                                            </button>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {agreements.enabled && !agreements.purchasePolicy && !agreements.refundPolicy && (
                                        <div style={{ padding: '8px 12px', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: 6, fontSize: '0.78rem', color: '#92400e' }}>
                                            {L('⚠️ 已启用但未上传协议内容。买家结账时不会显示勾选框，请上传协议并保存。', '⚠️ Enabled but no policy file uploaded. Checkout will not show agreement checkbox. Please upload and save.')}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* 库存计算方式 */}
                        <div className="ts-form-group" style={{ borderTop: '1px solid var(--border-color)', paddingTop: 18, marginTop: 18 }}>
                            <label>{L('inline.stock.calculation.3fce3ce')}</label>
                            <div style={{ display: 'flex', gap: 14, marginTop: 6, flexWrap: 'wrap' }}>
                                <div
                                    onClick={() => setPayForm(f => ({ ...f, stockMode: 'auto' }))}
                                    style={{
                                        flex: 1, minWidth: '240px',
                                        display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
                                        border: `2px solid ${(payForm.stockMode || 'auto') === 'auto' ? 'var(--primary)' : 'var(--border-color)'}`,
                                        borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                                        background: (payForm.stockMode || 'auto') === 'auto' ? 'rgba(239,68,68,0.04)' : 'transparent',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${(payForm.stockMode || 'auto') === 'auto' ? 'var(--primary)' : 'var(--border-color)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {(payForm.stockMode || 'auto') === 'auto' && <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--primary)' }} />}
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>🔄 {L('inline.auto.53a3bc0')}</div>
                                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 2 }}>{L('inline.stock.equals.available.card.count.and.is.deducted.after.deli.0efda59')}</div>
                                    </div>
                                </div>
                                <div
                                    onClick={() => setPayForm(f => ({ ...f, stockMode: 'manual' }))}
                                    style={{
                                        flex: 1, minWidth: '240px',
                                        display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
                                        border: `2px solid payForm.stockMode === 'manual' ? 'var(--primary)' : 'var(--border-color)'`,
                                        borderWidth: '2px',
                                        borderColor: payForm.stockMode === 'manual' ? 'var(--primary)' : 'var(--border-color)',
                                        borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                                        background: payForm.stockMode === 'manual' ? 'rgba(239,68,68,0.04)' : 'transparent',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${payForm.stockMode === 'manual' ? 'var(--primary)' : 'var(--border-color)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {payForm.stockMode === 'manual' && <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--primary)' }} />}
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>✏️ {L('inline.manual.843ab14')}</div>
                                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 2 }}>{L('inline.enter.stock.manually.without.linking.it.to.card.count.9693c33')}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <button type="submit" className="ts-btn-primary" disabled={shopSaving}>
                            {shopSaving ? L('inline.saving.18c1774') : L('inline.save.settings.bdd3186')}
                        </button>
                    </form>
                </div>
            )}

            {/* Payment */}
            {activeTab === 'payment' && (
                <div className="ts-section">
                    <div className="ts-section-desc">
                        <h3>{L('inline.payment.methods.6d30081')}</h3>
                        <p>{L('inline.enable.payment.methods.for.buyers.funds.go.directly.to.your..4a53a57')}</p>
                    </div>
                    {payMsg && <div className={`ts-msg ${payMsg.type}`}>{payMsg.text}</div>}
                    <form onSubmit={handlePaySave} className="ts-form">
                        {/* 支付宝 */}
                        {globalChannels.channel_alipay !== 'false' && checkChannelVisible('channel_alipay', true, false) && (
                            <>
                                <div className="ts-pay-toggle-row">
                                    <label className="ts-toggle">
                                        <input type="checkbox" checked={payForm.alipayEnabled} onChange={e => {
                                            const checked = e.target.checked
                                            setPayForm(f => ({ ...f, alipayEnabled: checked }))
                                            if (checked) setPayExpanded(ex => ({ ...ex, alipay: true }))
                                        }} />
                                        <span className="ts-toggle-slider"></span>
                                        <span className="ts-toggle-label">{L('inline.alipay.face.to.face.003c1ad')}</span>
                                    </label>
                                    {payForm.alipayEnabled && (
                                        <button type="button" className="ts-pay-config-btn" onClick={() => setPayExpanded(ex => ({ ...ex, alipay: !ex.alipay }))}>
                                            {payExpanded.alipay ? L('收起 ▴', 'Collapse ▴') : L('配置参数 ⚙️', 'Configure ⚙️')}
                                        </button>
                                    )}
                                </div>
                                {payForm.alipayEnabled && payExpanded.alipay && (
                                    <div className="ts-pay-config-wrapper">
                                        <div className="ts-pay-fields">
                                            <div className="ts-pay-field">
                                                <label>{L('inline.app.id.c0125a9')}</label>
                                                <input value={payForm.alipayAppId} onChange={e => setPayForm(f => ({ ...f, alipayAppId: e.target.value }))} placeholder="支付宝应用 App ID" />
                                            </div>
                                            <div className="ts-pay-field">
                                                <label>{L('inline.app.private.key.86b2173')}</label>
                                                <input value={payForm.alipayPrivateKey} onChange={e => setPayForm(f => ({ ...f, alipayPrivateKey: e.target.value }))} placeholder={L('inline.rsa2.app.private.key.18c4561')} type="password" />
                                            </div>
                                            <div className="ts-pay-field">
                                                <label>{L('inline.alipay.public.key.f1b9616')}</label>
                                                <input value={payForm.alipayPublicKey} onChange={e => setPayForm(f => ({ ...f, alipayPublicKey: e.target.value }))} placeholder={L('inline.alipay.public.key.for.signature.verification.b3ec4f7')} type="password" />
                                            </div>
                                            {shopForm.currency === 'USD' && (
                                                <div className="ts-pay-field">
                                                    <label>USD→CNY 汇率</label>
                                                    <input value={payForm.usdtExchangeRate} onChange={e => setPayForm(f => ({ ...f, usdtExchangeRate: e.target.value }))} placeholder="7.2" type="number" step="0.01" min="1" max="20" />
                                                    <span className="ts-hint">{L('inline.usd.pricing.with.alipay.cny.collection.example.8.x.7.2.57.60.52fb4e9')}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        {/* USDT-TRC20 */}
                        {globalChannels.channel_usdt_trc20 !== 'false' && checkChannelVisible('channel_usdt_trc20', false, true) && (
                            <>
                                <div className="ts-pay-toggle-row">
                                    <label className="ts-toggle">
                                        <input type="checkbox" checked={payForm.usdtEnabled} onChange={e => {
                                            const checked = e.target.checked
                                            setPayForm(f => ({ ...f, usdtEnabled: checked }))
                                            if (checked) setPayExpanded(ex => ({ ...ex, usdt: true }))
                                        }} />
                                        <span className="ts-toggle-slider"></span>
                                        <span className="ts-toggle-label">USDT-TRC20</span>
                                    </label>
                                    {payForm.usdtEnabled && (
                                        <button type="button" className="ts-pay-config-btn" onClick={() => setPayExpanded(ex => ({ ...ex, usdt: !ex.usdt }))}>
                                            {payExpanded.usdt ? L('收起 ▴', 'Collapse ▴') : L('配置参数 ⚙️', 'Configure ⚙️')}
                                        </button>
                                    )}
                                </div>
                                {payForm.usdtEnabled && payExpanded.usdt && (
                                    <div className="ts-pay-config-wrapper">
                                        <div className="ts-pay-fields">
                                            <div className="ts-pay-field">
                                                <label>{L('inline.trc20.receiving.wallet.2aab6ca')}</label>
                                                <input value={payForm.usdtWallet} onChange={e => setPayForm(f => ({ ...f, usdtWallet: e.target.value }))} placeholder="T..." />
                                            </div>
                                            {shopForm.currency !== 'USD' && (
                                                <div className="ts-pay-field">
                                                    <label>{L('inline.exchange.rate.1.usdt.cny.51a7779')}</label>
                                                    <input value={payForm.usdtExchangeRate} onChange={e => setPayForm(f => ({ ...f, usdtExchangeRate: e.target.value }))} placeholder="7.2" type="number" step="0.01" />
                                                </div>
                                            )}
                                            {shopForm.currency === 'USD' && (
                                                <div className="ts-pay-field">
                                                    <span className="ts-hint">{L('inline.usd.stores.collect.usdt.at.1.1.no.exchange.rate.needed.47fdc62')}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        {/* USDT-BEP20 */}
                        {globalChannels.channel_usdt_bep20 !== 'false' && checkChannelVisible('channel_usdt_bep20', false, true) && (
                            <>
                                <div className="ts-pay-toggle-row">
                                    <label className="ts-toggle">
                                        <input type="checkbox" checked={payForm.bscUsdtEnabled} onChange={e => {
                                            const checked = e.target.checked
                                            setPayForm(f => ({ ...f, bscUsdtEnabled: checked }))
                                            if (checked) setPayExpanded(ex => ({ ...ex, bsc_usdt: true }))
                                        }} />
                                        <span className="ts-toggle-slider"></span>
                                        <span className="ts-toggle-label">USDT-BEP20 (BSC)</span>
                                    </label>
                                    {payForm.bscUsdtEnabled && (
                                        <button type="button" className="ts-pay-config-btn" onClick={() => setPayExpanded(ex => ({ ...ex, bsc_usdt: !ex.bsc_usdt }))}>
                                            {payExpanded.bsc_usdt ? L('收起 ▴', 'Collapse ▴') : L('配置参数 ⚙️', 'Configure ⚙️')}
                                        </button>
                                    )}
                                </div>
                                {payForm.bscUsdtEnabled && payExpanded.bsc_usdt && (
                                    <div className="ts-pay-config-wrapper">
                                        <div className="ts-pay-fields">
                                            <div className="ts-pay-field">
                                                <label>{L('inline.bep20.receiving.wallet.835e5ab')}</label>
                                                <input value={payForm.bscUsdtWallet} onChange={e => setPayForm(f => ({ ...f, bscUsdtWallet: e.target.value }))} placeholder="0x..." />
                                            </div>
                                            {shopForm.currency !== 'USD' && (
                                                <div className="ts-pay-field">
                                                    <label>{L('inline.exchange.rate.1.usdt.cny.51a7779')}</label>
                                                    <input value={payForm.usdtExchangeRate} onChange={e => setPayForm(f => ({ ...f, usdtExchangeRate: e.target.value }))} placeholder="7.2" type="number" step="0.01" />
                                                </div>
                                            )}
                                            {shopForm.currency === 'USD' && (
                                                <div className="ts-pay-field">
                                                    <span className="ts-hint">{L('inline.usd.stores.collect.usdt.at.1.1.no.exchange.rate.needed.47fdc62')}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        {/* 易支付 */}
                        {globalChannels.channel_yipay !== 'false' && checkChannelVisible('channel_yipay', true, false) && (
                            <>
                                <div className="ts-pay-toggle-row">
                                    <label className="ts-toggle">
                                        <input type="checkbox" checked={payForm.yipayEnabled} onChange={e => {
                                            const checked = e.target.checked
                                            setPayForm(f => ({ ...f, yipayEnabled: checked }))
                                            if (checked) setPayExpanded(ex => ({ ...ex, yipay: true }))
                                        }} />
                                        <span className="ts-toggle-slider"></span>
                                        <span className="ts-toggle-label">{L('在线支付 (易支付)', 'Online Payment (Yipay)')}</span>
                                    </label>
                                    {payForm.yipayEnabled && (
                                        <button type="button" className="ts-pay-config-btn" onClick={() => setPayExpanded(ex => ({ ...ex, yipay: !ex.yipay }))}>
                                            {payExpanded.yipay ? L('收起 ▴', 'Collapse ▴') : L('配置参数 ⚙️', 'Configure ⚙️')}
                                        </button>
                                    )}
                                </div>
                                {payForm.yipayEnabled && payExpanded.yipay && (
                                    <div className="ts-pay-config-wrapper">
                                        <div className="ts-pay-fields">
                                            <div className="ts-pay-field">
                                                <label>{L('API 地址', 'API URL')}</label>
                                                <input value={payForm.yipayApiUrl} onChange={e => setPayForm(f => ({ ...f, yipayApiUrl: e.target.value }))} placeholder="https://pay.xxx.com/" />
                                            </div>
                                            <div className="ts-pay-field">
                                                <label>{L('商户 ID (PID)', 'Merchant ID (PID)')}</label>
                                                <input value={payForm.yipayPid} onChange={e => setPayForm(f => ({ ...f, yipayPid: e.target.value }))} placeholder="1000" />
                                            </div>
                                            <div className="ts-pay-field">
                                                <label>{L('商户密钥 (Key)', 'Merchant Key')}</label>
                                                <input value={payForm.yipayKey} onChange={e => setPayForm(f => ({ ...f, yipayKey: e.target.value }))} placeholder="Key" />
                                            </div>
                                            {shopForm.currency === 'USD' && (
                                                <div className="ts-pay-field">
                                                    <label>USD→CNY 汇率</label>
                                                    <input value={payForm.usdtExchangeRate} onChange={e => setPayForm(f => ({ ...f, usdtExchangeRate: e.target.value }))} placeholder="7.2" type="number" step="0.01" min="1" max="20" />
                                                    <span className="ts-hint">{L('USD商场使用在线支付时，美元折算为人民币支付的比例。例如设置 7.2，商品标价 $8，实际需支付 8 * 7.2 = 57.6 元。', 'When USD store uses online payment, the conversion ratio to CNY. E.g. if set to 7.2, a $8 product costs 8 * 7.2 = 57.6 RMB.')}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        <button type="submit" className="ts-btn-primary" disabled={paySaving}>
                            {paySaving ? L('inline.saving.18c1774') : L('inline.save.payment.settings.5ed4b51')}
                        </button>
                    </form>
                </div>
            )}

            {/* Admin */}
            {activeTab === 'admin' && (
                <AdminTab token={token} currentUserEmail={displayEmail} maxSubAdmins={maxSubAdmins} />
            )}

            {/* Security */}
            {activeTab === 'account' && (
                <div className="ts-section">
                    <div className="ts-info-card">
                        <div className="ts-info-row"><span>{L('inline.login.email.cb75967')}</span><span>{displayEmail}</span></div>
                        <div className="ts-info-row"><span>{L('inline.store.slug.ca1f7e9')}</span><span>{displaySlug}</span></div>
                        <div className="ts-info-row"><span>{L('inline.user.role.d45abd7')}</span><span>{user?.role || '—'}</span></div>
                    </div>

                    <div className="ts-section-desc" style={{ marginTop: 24 }}>
                        <h3>{L('inline.change.password.0afa917')}</h3>
                    </div>
                    {pwdMsg && <div className={`ts-msg ${pwdMsg.type}`}>{pwdMsg.text}</div>}
                    <form onSubmit={handlePwdChange} className="ts-form">
                        <div className="ts-form-group">
                            <label>{L('inline.current.password.cad7e6b')}</label>
                            <input type="password" value={pwdForm.currentPassword} onChange={e => setPwdForm(f => ({ ...f, currentPassword: e.target.value }))} required />
                        </div>
                        <div className="ts-form-group">
                            <label>{L('inline.new.password.57a200d')}</label>
                            <input type="password" value={pwdForm.newPassword} onChange={e => setPwdForm(f => ({ ...f, newPassword: e.target.value }))} required minLength={6} placeholder={L('inline.at.least.6.characters.7ffb04e')} />
                        </div>
                        <div className="ts-form-group">
                            <label>{L('inline.confirm.new.password.2f631ee')}</label>
                            <input type="password" value={pwdForm.confirm} onChange={e => setPwdForm(f => ({ ...f, confirm: e.target.value }))} required />
                        </div>
                        <button type="submit" className="ts-btn-primary" disabled={pwdSaving}>
                            {pwdSaving ? L('inline.updating.e060893') : L('inline.update.password.cd02826')}
                        </button>
                    </form>
                </div>
            )}



            {/* Email */}
            {activeTab === 'email' && (
                <div className="ts-section">
                    <div className="ts-section-desc">
                        <h3>{L('inline.email.notifications.1b7b91b')}</h3>
                        <p>{L('inline.send.card.details.to.buyers.automatically.after.orders.are.c.948090b')}</p>
                    </div>
                    {payMsg && <div className={`ts-msg ${payMsg.type}`}>{payMsg.text}</div>}
                    {emailDisabled && (
                        <div style={{
                            padding: '14px 16px', marginBottom: 16,
                            background: 'rgba(245, 158, 11, 0.1)',
                            border: '1px solid rgba(245, 158, 11, 0.4)',
                            borderRadius: 8, color: '#92400e', fontSize: '0.9rem',
                            display: 'flex', alignItems: 'center', gap: 10
                        }}>
                            🔒 {L('inline.your.current.plan.does.not.include.email.notification.quota..7fef012')}
                        </div>
                    )}
                    {!emailDisabled && (
                        <div style={{
                            padding: '14px 18px', marginBottom: 16,
                            background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.08), rgba(20, 184, 166, 0.08))',
                            border: '1px solid rgba(14, 165, 233, 0.25)',
                            borderRadius: 10
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                                <div>
                                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 4 }}>{L('inline.platform.emails.this.month.f1fbf39')}</div>
                                    <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                        {emailUsed} / {emailQuota === -1 ? L('inline.unlimited.6381d24') : emailQuota}
                                        {emailPackBalance > 0 && (
                                            <span style={{ fontSize: '0.78rem', color: '#0ea5e9', marginLeft: 8, fontWeight: 500 }}>
                                                {L(`（剩余 ${emailPackBalance} 永久额度）`, `(${emailPackBalance} lifetime credits left)`)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                {emailQuota > 0 && (
                                    <div style={{ flex: 1, minWidth: 180, marginLeft: 20 }}>
                                        <div style={{ height: 6, background: 'rgba(14, 165, 233, 0.15)', borderRadius: 3, overflow: 'hidden' }}>
                                            <div style={{
                                                height: '100%',
                                                width: `${Math.min(100, (emailUsed / emailQuota) * 100)}%`,
                                                background: emailUsed >= emailQuota && emailPackBalance === 0 ? '#ef4444' : 'linear-gradient(90deg, #0ea5e9, #14b8a6)',
                                                transition: 'width 0.3s'
                                            }} />
                                        </div>
                                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 6 }}>
                                            {emailUsed >= emailQuota
                                                ? (emailPackBalance > 0
                                                    ? L('inline.monthly.quota.exceeded.lifetime.pack.credits.will.be.used.au.b1a0c2d')
                                                    : L('inline.monthly.quota.is.used.up.buy.a.pack.or.switch.to.your.own.sm.ae3a651'))
                                                : L(`剩余 ${Math.max(0, emailQuota - emailUsed)} 封 · Own SMTP 不计入额度`, `${Math.max(0, emailQuota - emailUsed)} left · Own SMTP does not count toward quota`)}
                                        </div>
                                    </div>
                                )}
                                <button
                                    type="button"
                                    onClick={async () => {
                                        if (packs.length === 0) {
                                            try {
                                                const r = await fetch('/api/admin/email-packs/options', { headers: { Authorization: `Bearer ${token}` } })
                                                const d = await r.json()
                                                setPacks(d.packs || [])
                                            } catch {}
                                        }
                                        setPackOrder(null)
                                        setShowPackModal(true)
                                    }}
                                    style={{
                                        padding: '8px 18px',
                                        background: 'linear-gradient(135deg, #0ea5e9, #14b8a6)',
                                        color: '#fff',
                                        border: 'none',
                                        borderRadius: 8,
                                        cursor: 'pointer',
                                        fontSize: '0.82rem',
                                        fontWeight: 500,
                                        flexShrink: 0
                                    }}
                                >
                                    {L('inline.buy.pack.a692abf')}
                                </button>
                            </div>
                        </div>
                    )}

                    <fieldset disabled={emailDisabled} style={{ border: 0, padding: 0, margin: 0, opacity: emailDisabled ? 0.55 : 1, pointerEvents: emailDisabled ? 'none' : 'auto' }}>
                    <div className="ts-form">
                        {/* 邮件模式选择 */}
                        <div className="ts-form-group">
                            <label>{L('inline.sending.mode.02ee4c5')}</label>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                <div
                                    onClick={() => setPayForm(f => ({ ...f, emailMode: 'platform' }))}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px',
                                        border: `2px solid ${payForm.emailMode === 'platform' ? 'var(--primary)' : 'var(--border-color)'}`,
                                        borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                                        background: payForm.emailMode === 'platform' ? 'rgba(239,68,68,0.04)' : 'transparent',
                                        transition: 'all 0.15s'
                                    }}
                                >
                                    <div style={{
                                        width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                                        border: `2px solid ${payForm.emailMode === 'platform' ? 'var(--primary)' : 'var(--border-color)'}`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}>
                                        {payForm.emailMode === 'platform' && <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--primary)' }} />}
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>{L('inline.platform.sending.040437c')}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>{L('inline.no.configuration.sender.shows.your.store.name.monthly.quota..f7f009a')}</div>
                                    </div>
                                </div>
                                <div
                                    onClick={() => setPayForm(f => ({ ...f, emailMode: 'custom' }))}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px',
                                        border: `2px solid ${payForm.emailMode === 'custom' ? 'var(--primary)' : 'var(--border-color)'}`,
                                        borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                                        background: payForm.emailMode === 'custom' ? 'rgba(239,68,68,0.04)' : 'transparent',
                                        transition: 'all 0.15s'
                                    }}
                                >
                                    <div style={{
                                        width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                                        border: `2px solid ${payForm.emailMode === 'custom' ? 'var(--primary)' : 'var(--border-color)'}`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}>
                                        {payForm.emailMode === 'custom' && <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--primary)' }} />}
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>{L('inline.own.smtp.fd68a8b')}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>{L('inline.use.your.own.mail.server.with.no.platform.quota.limit.3c3bee8')}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Own SMTP 配置 */}
                        {payForm.emailMode === 'custom' && (
                            <div className="ts-pay-fields">
                                <div className="ts-pay-field">
                                    <label>{L('inline.smtp.server.c5216fc')}</label>
                                    <input value={payForm.smtpHost || ''} onChange={e => setPayForm(f => ({ ...f, smtpHost: e.target.value }))} placeholder="smtp.example.com" />
                                </div>
                                <div className="ts-pay-field">
                                    <label>{L('inline.smtp.port.dafafac')}</label>
                                    <input type="number" value={payForm.smtpPort || ''} onChange={e => setPayForm(f => ({ ...f, smtpPort: e.target.value }))} placeholder="465" />
                                </div>
                                <div className="ts-pay-field">
                                    <label>{L('inline.sender.email.d1ca2dd')}</label>
                                    <input value={payForm.smtpUser || ''} onChange={e => setPayForm(f => ({ ...f, smtpUser: e.target.value }))} placeholder="noreply@yourdomain.com" />
                                </div>
                                <div className="ts-pay-field">
                                    <label>{L('inline.email.password.app.password.69f9bd8')}</label>
                                    <input type="password" value={payForm.smtpPass || ''} onChange={e => setPayForm(f => ({ ...f, smtpPass: e.target.value }))} placeholder={L('inline.app.password.4da5546')} />
                                </div>
                            </div>
                        )}

                        {payForm.emailMode === 'platform' && (
                            <div style={{ padding: '14px 16px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: '1rem' }}>💡</span>
                                <span>{L('inline.platform.sending.needs.no.configuration.your.store.name.is.u.db7b340')}</span>
                            </div>
                        )}

                        {/* 通知开关 */}
                        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 18, marginTop: 4 }}>
                            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 14 }}>{L('inline.notification.toggles.53299f2')}</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                                {[
                                    { key: 'notifyOrderPaid', icon: '💰', label: L('inline.order.paid.9f137b9'), desc: L('inline.notify.admins.after.users.complete.payment.a2b6d45') },
                                    { key: 'notifyShipRemind', icon: '📦', label: L('inline.manual.delivery.needed.fc11d3d'), desc: L('inline.notify.when.a.paid.order.needs.manual.delivery.85a05e3') },
                                    { key: 'notifyNewTicket', icon: '📮', label: L('inline.new.ticket.d1818f7'), desc: L('inline.notify.admins.when.users.submit.tickets.efb780e') },
                                    { key: 'notifyNewUser', icon: '👤', label: L('inline.new.user.registration.16930a4'), desc: L('inline.notify.admins.when.a.new.user.registers.aa51bd0') },
                                    { key: 'notifyStockAlert', icon: '⚠️', label: L('inline.low.stock.alert.2179fee'), desc: L('inline.notify.admins.when.product.stock.is.below.the.threshold.307be7b') },
                                    { key: 'notifyOrderCancel', icon: '🚫', label: L('inline.order.cancelled.e74cb32'), desc: L('inline.notify.admins.when.an.order.is.cancelled.f7f4f9c') },
                                    { key: 'notifyRefund', icon: '💸', label: L('inline.refund.notification.fcc5470'), desc: L('inline.send.refund.success.email.after.an.order.is.refunded.589a724') },
                                ].map(item => (
                                    <div key={item.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderBottom: '1px solid var(--border-color)' }}>
                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                                            <span style={{ fontSize: '1.1rem' }}>{item.icon}</span>
                                            <div>
                                                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>{item.label}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>{item.desc}</div>
                                            </div>
                                        </div>
                                        <label style={{ position: 'relative', width: 42, height: 24, cursor: 'pointer', flexShrink: 0 }}>
                                            <input type="checkbox" checked={!!payForm[item.key]} onChange={e => setPayForm(f => ({ ...f, [item.key]: e.target.checked }))} style={{ display: 'none' }} />
                                            <span style={{ position: 'absolute', inset: 0, borderRadius: 12, background: payForm[item.key] ? 'var(--primary)' : 'var(--border-color)', transition: 'background 0.2s' }}>
                                                <span style={{ position: 'absolute', top: 3, left: payForm[item.key] ? 21 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                                            </span>
                                        </label>
                                    </div>
                                ))}
                            </div>
                            <div className="ts-form-group" style={{ marginTop: 14 }}>
                                <label>{L('inline.admin.notification.email.085f350')}</label>
                                <input value={payForm.notifyEmail || ''} onChange={e => setPayForm(f => ({ ...f, notifyEmail: e.target.value }))} placeholder={L('inline.email.for.notifications.defaults.to.login.email.f3e43a1')} />
                                <span className="ts-hint">{L('inline.leave.blank.to.use.the.login.email.a788521')}</span>
                            </div>
                        </div>

                        <button type="button" className="ts-btn-primary" onClick={handlePaySave}>
                            {L('inline.save.email.settings.ef7cb1b')}
                        </button>

                        {/* 测试通知 */}
                        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 18, marginTop: 18 }}>
                            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>{L('inline.test.notification.5eb1e5b')}</div>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 12 }}>{L('inline.choose.a.notification.type.and.send.a.test.to.the.admin.emai.0db3856')}</p>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                {[
                                    { key: 'order_paid', label: L('inline.order.paid.f7ee83e') },
                                    { key: 'pending_ship', label: L('inline.pending.delivery.779546f') },
                                    { key: 'stock_alert', label: L('inline.stock.alert.aad841e') },
                                    { key: 'new_ticket', label: L('inline.new.ticket.1f5a015') },
                                    { key: 'order_cancel', label: L('inline.order.cancelled.df76e50') },
                                ].map(t => (
                                    <button key={t.key} type="button" onClick={async () => {
                                        setPayMsg(null)
                                        try {
                                            const r = await fetch(`${API}/tenant/test-notify`, {
                                                method: 'POST',
                                                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ type: t.key })
                                            })
                                            const d = await r.json()
                                            setPayMsg(r.ok ? { type: 'success', text: `测试通知已发送：${t.label}` } : { type: 'error', text: d.error || '发送失败' })
                                        } catch { setPayMsg({ type: 'error', text: L('inline.network.error.c15d73e') }) }
                                    }} style={{
                                        padding: '7px 14px', border: '1px solid var(--border-color)',
                                        borderRadius: 'var(--radius-sm)', background: 'var(--bg-tertiary)',
                                        color: 'var(--text-primary)', fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'inherit'
                                    }}>
                                        {t.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                    </fieldset>
                </div>
            )}

            {/* Plan */}
            {activeTab === 'plan' && (
                <div className="ts-section">
                    <PlanTab shop={shop} mToken={mToken} displaySlug={displaySlug} />
                </div>
            )}

            {/* 邮件资源包购买弹窗 */}
            {showPackModal && (
                <EmailPackModal
                    token={token}
                    packs={packs}
                    packOrder={packOrder}
                    setPackOrder={setPackOrder}
                    paying={packPaying}
                    setPaying={setPackPaying}
                    onClose={() => { setShowPackModal(false); setPackOrder(null); refreshEmailUsage() }}
                    onPaid={refreshEmailUsage}
                />
            )}

            {/* 主题选择弹窗 */}
            {themePickerOpen && (
                <ThemePickerModal
                    currentSkin={shopForm.skin}
                    allowedSkins={allowedSkins}
                    customThemes={customThemes}
                    onSelect={(value) => { setShopForm(f => ({ ...f, skin: value })); setThemePickerOpen(false) }}
                    onClose={() => setThemePickerOpen(false)}
                />
            )}
        </div>
    )
}

// 主题选择弹窗
function ThemePickerModal({ currentSkin, allowedSkins, customThemes, onSelect, onClose }) {
    const L = useAdminL()
    const minimalSkins = ALL_SKIN_OPTIONS.filter(s => ['fresh', 'zen'].includes(s.value) && allowedSkins.includes(s.value))
    const originSkins = ALL_SKIN_OPTIONS.filter(s => s.value === 'class' && allowedSkins.includes(s.value))

    const renderSkinCard = (s, isCustom = false) => {
        const value = isCustom ? `custom:${s.key}` : s.value
        const label = isCustom ? s.name : L(s.labelZh, s.labelEn)
        const desc = isCustom ? (s.description || L('inline.custom.theme.edda78b')) : L(s.descZh, s.descEn)
        const active = currentSkin === value
        return (
            <div
                key={value}
                className={`ts-skin-card ${active ? 'active' : ''}`}
                onClick={() => onSelect(value)}
                style={{ position: 'relative' }}
            >
                {isCustom && (
                    <span style={{
                        position: 'absolute', top: 6, right: 6,
                        fontSize: '0.65rem', padding: '1px 7px', borderRadius: 999,
                        background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
                        color: '#fff', fontWeight: 600
                    }}>
                        ✨ {L('inline.custom.953741b')}
                    </span>
                )}
                <div className="ts-skin-name">{label}</div>
                <div className="ts-skin-desc">{desc}</div>
            </div>
        )
    }

    return (
        <div onClick={onClose} className="ep-overlay">
            <div onClick={e => e.stopPropagation()} className="ep-modal" style={{ maxWidth: 720 }}>
                <button onClick={onClose} className="ep-close">✕</button>
                <h3 style={{ margin: '0 0 18px', fontSize: '1.15rem' }}>{L('inline.select.theme.c00031f')}</h3>

                {minimalSkins.length > 0 && (
                    <div className="ts-theme-group">
                        <div className="ts-theme-group-header">
                            <span className="ts-theme-name">📦 {L('inline.minimal.db5115a')}</span>
                            <span className="ts-theme-desc">{L('inline.minimal.style.7dbe337')}</span>
                        </div>
                        <div className="ts-skin-grid">{minimalSkins.map(s => renderSkinCard(s))}</div>
                    </div>
                )}

                {originSkins.length > 0 && (
                    <div className="ts-theme-group">
                        <div className="ts-theme-group-header">
                            <span className="ts-theme-name">✨ {L('inline.classic.c59d41b')}</span>
                            <span className="ts-theme-desc">{L('inline.modern.classic.91121ba')}</span>
                        </div>
                        <div className="ts-skin-grid">{originSkins.map(s => renderSkinCard(s))}</div>
                    </div>
                )}

                {customThemes.length > 0 && (
                    <div className="ts-theme-group">
                        <div className="ts-theme-group-header">
                            <span className="ts-theme-name">🎁 {L('inline.custom.themes.aab67f7')}</span>
                            <span className="ts-theme-desc">{L('inline.private.themes.authorized.only.for.you.a53fd6f')}</span>
                        </div>
                        <div className="ts-skin-grid">{customThemes.map(t => renderSkinCard(t, true))}</div>
                    </div>
                )}
            </div>
        </div>
    )
}

// 邮件资源包购买弹窗组件
function EmailPackModal({ token, packs, packOrder, setPackOrder, paying, setPaying, onClose, onPaid }) {
    const [selectedPack, setSelectedPack] = useState('5K')
    const [paymentMethod, setPaymentMethod] = useState('alipay')
    const [polling, setPolling] = useState(false)

    const handleBuy = async () => {
        setPaying(true)
        try {
            const r = await fetch('/api/admin/email-packs/order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ packKey: selectedPack, paymentMethod })
            })
            const d = await r.json()
            if (!r.ok) { toast.error(d.error || '下单失败'); return }
            setPackOrder(d)
        } catch { toast.error('网络错误') }
        finally { setPaying(false) }
    }

    useEffect(() => {
        if (!packOrder?.orderNo || polling) return
        setPolling(true)
        const timer = setInterval(async () => {
            try {
                const r = await fetch(`/api/admin/email-packs/order/${packOrder.orderNo}`, {
                    headers: { Authorization: `Bearer ${token}` }
                })
                const d = await r.json()
                if (d.status === 'paid') {
                    clearInterval(timer)
                    toast.success('支付成功，邮件额度已到账')
                    onPaid()
                    setTimeout(() => onClose(), 1200)
                } else if (d.status === 'cancelled') {
                    clearInterval(timer)
                    toast.error('订单已取消')
                    setPackOrder(null)
                }
            } catch {}
        }, 3000)
        return () => { clearInterval(timer); setPolling(false) }
    }, [packOrder?.orderNo])

    const currentPack = packs.find(p => p.key === selectedPack)

    return (
        <div onClick={onClose} className="ep-overlay">
            <div onClick={e => e.stopPropagation()} className="ep-modal">
                <button onClick={onClose} className="ep-close" aria-label="关闭">✕</button>

                {!packOrder ? (
                    <>
                        <div className="ep-header">
                            <div className="ep-icon-bg">📦</div>
                            <h3>邮件资源包</h3>
                            <p>永久有效 · 不清零 · 可叠加 · 套餐用完后自动消耗</p>
                        </div>

                        <div className="ep-packs">
                            {packs.map(p => {
                                const unitPrice = (p.price / (p.count / 1000)).toFixed(2)
                                const isPopular = p.key === '5K'
                                return (
                                    <button
                                        key={p.key}
                                        type="button"
                                        onClick={() => setSelectedPack(p.key)}
                                        className={`ep-pack ${selectedPack === p.key ? 'active' : ''}`}
                                    >
                                        {isPopular && <span className="ep-pack-badge">推荐</span>}
                                        <div className="ep-pack-count">{(p.count / 1000)}K</div>
                                        <div className="ep-pack-label">{p.count.toLocaleString()} 封</div>
                                        <div className="ep-pack-price">¥{p.price}</div>
                                        <div className="ep-pack-unit">¥{unitPrice} / 千封</div>
                                    </button>
                                )
                            })}
                        </div>

                        <div className="ep-section-title">支付方式</div>
                        <div className="ep-pay-methods">
                            {[
                                { key: 'alipay', label: '支付宝', icon: '💳' },
                                { key: 'usdt', label: 'USDT-TRC20', icon: '🟢' },
                                { key: 'bsc_usdt', label: 'USDT-BEP20', icon: '🟡' }
                            ].map(m => (
                                <button
                                    key={m.key}
                                    type="button"
                                    onClick={() => setPaymentMethod(m.key)}
                                    className={`ep-pay-method ${paymentMethod === m.key ? 'active' : ''}`}
                                >
                                    <span className="ep-pay-icon">{m.icon}</span>
                                    <span>{m.label}</span>
                                </button>
                            ))}
                        </div>

                        <div className="ep-summary">
                            <div>
                                <div className="ep-summary-label">合计支付</div>
                                <div className="ep-summary-amount">¥{currentPack?.price || 0}</div>
                            </div>
                            <button onClick={handleBuy} disabled={paying} className="ep-buy-btn">
                                {paying ? '生成订单中...' : '立即购买'}
                            </button>
                        </div>
                    </>
                ) : (
                    <EmailPackPayPanel
                        order={packOrder}
                        onCancel={async (timeout) => {
                            try {
                                await fetch(`/api/admin/email-packs/order/${packOrder.orderNo}/cancel`, {
                                    method: 'POST',
                                    headers: { Authorization: `Bearer ${token}` }
                                })
                            } catch {}
                            if (timeout) toast.error('订单已超时取消')
                            else toast('订单已取消')
                            setPackOrder(null)
                        }}
                    />
                )}
            </div>
        </div>
    )
}

// 资源包支付面板
function EmailPackPayPanel({ order, onCancel }) {
    const [secondsLeft, setSecondsLeft] = useState(15 * 60)
    const [copied, setCopied] = useState(false)

    useEffect(() => {
        const t = setInterval(() => setSecondsLeft(s => Math.max(0, s - 1)), 1000)
        return () => clearInterval(t)
    }, [])

    useEffect(() => {
        if (secondsLeft === 0) onCancel?.(true)
    }, [secondsLeft])

    const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0')
    const ss = String(secondsLeft % 60).padStart(2, '0')

    const copy = async (text) => {
        try {
            await navigator.clipboard.writeText(text)
            setCopied(true)
            setTimeout(() => setCopied(false), 1500)
        } catch {}
    }

    return (
        <div className="ep-pay">
            <div className="ep-pay-header">
                <h3>等待支付</h3>
                <div className={`ep-timer ${secondsLeft < 60 ? 'warning' : ''}`}>
                    <span>⏱</span>
                    {mm}:{ss}
                </div>
            </div>

            {order.paymentType === 'qrcode' && (
                <div className="ep-qr-block">
                    <div className="ep-qr-frame">
                        <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(order.qrCode)}`}
                            alt="支付二维码"
                        />
                    </div>
                    <div className="ep-qr-hint">使用支付宝扫码支付</div>
                </div>
            )}

            {(order.paymentType === 'usdt' || order.paymentType === 'bsc_usdt') && (
                <div className="ep-usdt-block">
                    <div className="ep-qr-frame">
                        <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(order.walletAddress)}`}
                            alt="收款地址"
                        />
                    </div>
                    <div className="ep-usdt-network">
                        网络：USDT {order.paymentType === 'usdt' ? 'TRC20' : 'BEP20'}
                    </div>
                    <button type="button" className="ep-usdt-addr" onClick={() => copy(order.walletAddress)}>
                        <span className="ep-usdt-addr-text">{order.walletAddress}</span>
                        <span className="ep-usdt-addr-copy">{copied ? '已复制' : '复制'}</span>
                    </button>
                </div>
            )}

            <div className="ep-pay-amount">
                <div className="ep-pay-amount-label">支付金额</div>
                <div className="ep-pay-amount-value">
                    {order.paymentType === 'qrcode'
                        ? <>¥<strong>{order.amount}</strong></>
                        : <><strong>{order.usdtAmount}</strong> USDT</>}
                </div>
                {(order.paymentType === 'usdt' || order.paymentType === 'bsc_usdt') && (
                    <div className="ep-pay-rate">≈ ¥{order.amount} · 汇率 {order.exchangeRate}</div>
                )}
            </div>

            <div className="ep-pay-status">
                <span className="ep-pulse" />
                等待{order.paymentType === 'qrcode' ? '支付平台' : '区块链'}确认中
            </div>

            <button type="button" onClick={() => onCancel?.(false)} className="ep-cancel-btn">
                取消订单
            </button>
        </div>
    )
}

// Admin Tab 组件
function AdminTab({ token, currentUserEmail, maxSubAdmins = -1 }) {
    const L = useAdminL()
    const [admins, setAdmins] = useState([])
    const [loading, setLoading] = useState(true)
    const [showCreate, setShowCreate] = useState(false)
    const [form, setForm] = useState({ email: '', username: '', password: '' })
    const [submitting, setSubmitting] = useState(false)
    const [msg, setMsg] = useState(null)
    const [permGroups, setPermGroups] = useState([])
    const [permDefaults, setPermDefaults] = useState({})
    const [editingAdmin, setEditingAdmin] = useState(null) // { id, username, permissions }
    const [createPermissions, setCreatePermissions] = useState({})

    useEffect(() => { if (msg) { const t = setTimeout(() => setMsg(null), 3000); return () => clearTimeout(t) } }, [msg])

    const fetchAdmins = async () => {
        try {
            const r = await fetch('/api/admin/admins', { headers: { Authorization: `Bearer ${token}` } })
            const d = await r.json()
            setAdmins(d.admins || [])
        } catch {}
        setLoading(false)
    }

    const fetchPermissionGroups = async () => {
        try {
            const r = await fetch('/api/admin/admins/permissions/groups', { headers: { Authorization: `Bearer ${token}` } })
            const d = await r.json()
            setPermGroups(d.groups || [])
            setPermDefaults(d.defaults || {})
            setCreatePermissions(d.defaults || {})
        } catch {}
    }

    useEffect(() => { if (token) { fetchAdmins(); fetchPermissionGroups() } }, [token])

    const handleCreate = async (e) => {
        e.preventDefault()
        if (!form.email.trim() || !form.password.trim()) {
            setMsg({ type: 'error', text: L('inline.email.and.password.are.required.ae17f89') }); return
        }
        if (form.password.length < 6) { setMsg({ type: 'error', text: L('inline.password.must.be.at.least.6.characters.366a31c') }); return }
        setSubmitting(true)
        try {
            const r = await fetch('/api/admin/admins', {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...form, permissions: createPermissions })
            })
            const d = await r.json()
            if (r.ok) {
                setMsg({ type: 'success', text: d.message || L('inline.sub.admin.created.75b7194') })
                setForm({ email: '', username: '', password: '' })
                setCreatePermissions(permDefaults)
                setShowCreate(false)
                fetchAdmins()
            } else {
                setMsg({ type: 'error', text: d.error || L('inline.create.failed.f14034d') })
            }
        } catch { setMsg({ type: 'error', text: L('inline.network.error.c15d73e') }) }
        setSubmitting(false)
    }

    const handleSavePermissions = async () => {
        if (!editingAdmin) return
        try {
            const r = await fetch(`/api/admin/admins/${editingAdmin.id}`, {
                method: 'PUT',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ permissions: editingAdmin.permissions })
            })
            const d = await r.json()
            if (r.ok) {
                setMsg({ type: 'success', text: L('inline.permissions.updated.8555f3d') })
                setEditingAdmin(null)
                fetchAdmins()
            } else {
                setMsg({ type: 'error', text: d.error || L('inline.update.failed.8e798b4') })
            }
        } catch { setMsg({ type: 'error', text: L('inline.network.error.c15d73e') }) }
    }

    const handleRemove = async (id, email) => {
        if (!confirm(L(`确定要移除 ${email} 的管理员权限吗？\n（其账号会保留但降级为普通用户）`, `Remove admin permissions for ${email}?\n(The account will remain but become a normal user.)`))) return
        try {
            const r = await fetch(`/api/admin/admins/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            })
            const d = await r.json()
            if (r.ok) {
                setMsg({ type: 'success', text: L('inline.removed.312f80f') })
                fetchAdmins()
            } else {
                setMsg({ type: 'error', text: d.error || L('admin.common.operationFailed') })
            }
        } catch { setMsg({ type: 'error', text: L('inline.network.error.c15d73e') }) }
    }

    // 权限分组渲染（用于创建表单 + 编辑弹窗）
    const renderPermissionGroups = (perms, onChange) => (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {permGroups.map(g => (
                <div key={g.key} style={{ padding: 14, border: '1px solid var(--border-color)', borderRadius: 10, background: 'var(--bg-card)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <div style={{ fontSize: '0.84rem', fontWeight: 600 }}>{g.label}</div>
                        <button
                            type="button"
                            onClick={() => {
                                const allOn = g.items.every(i => perms[i.key])
                                const next = { ...perms }
                                g.items.forEach(i => { next[i.key] = !allOn })
                                onChange(next)
                            }}
                            style={{ background: 'none', border: 'none', color: 'var(--primary, #ef4444)', fontSize: '0.74rem', cursor: 'pointer', padding: 0 }}
                        >
                            {g.items.every(i => perms[i.key]) ? L('inline.deselect.all.bd85e69') : L('inline.select.all.23cc93b')}
                        </button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {g.items.map(item => (
                            <label key={item.key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={!!perms[item.key]}
                                    onChange={e => onChange({ ...perms, [item.key]: e.target.checked })}
                                />
                                <span>{item.label}</span>
                            </label>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    )

    return (
        <div className="ts-section">
            {msg && <div className={`ts-msg ${msg.type}`}>{msg.text}</div>}

            <div className="ts-section-desc">
                <h3>{L('inline.admin.settings.dd2392b')}</h3>
                <p>{L('inline.invite.staff.to.help.manage.the.store.sub.admins.have.all.pe.4ff82d6')}</p>
            </div>

            {/* 当前所有者 */}
            <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>{L('inline.store.owner.1830eb7')}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--gradient-primary, linear-gradient(135deg, #ef4444, #f97316))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700 }}>
                        {(currentUserEmail || '?')[0].toUpperCase()}
                    </div>
                    <div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{currentUserEmail}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>{L('inline.owner.store.admin.all.permissions.24f4772')}</div>
                    </div>
                </div>
            </div>

            {/* 子管理员列表 */}
            <div style={{ marginBottom: 20 }}>
                {maxSubAdmins === 0 && (
                    <div style={{
                        padding: '14px 16px', marginBottom: 14,
                        background: 'rgba(245, 158, 11, 0.1)',
                        border: '1px solid rgba(245, 158, 11, 0.4)',
                        borderRadius: 8, color: '#92400e', fontSize: '0.9rem',
                        display: 'flex', alignItems: 'center', gap: 10
                    }}>
                        🔒 {L('inline.current.plan.does.not.support.sub.admins.please.upgrade.to.e.89e1ba0')}
                    </div>
                )}
                {maxSubAdmins > 0 && admins.length >= maxSubAdmins && (
                    <div style={{
                        padding: '14px 16px', marginBottom: 14,
                        background: 'rgba(245, 158, 11, 0.1)',
                        border: '1px solid rgba(245, 158, 11, 0.4)',
                        borderRadius: 8, color: '#92400e', fontSize: '0.85rem'
                    }}>
                        ⚠️ {L(`已达到当前套餐上限（${maxSubAdmins} 人），如需更多请升级套餐。`, `Current plan limit reached (${maxSubAdmins}). Please upgrade for more.`)}
                    </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {L('inline.sub.admins.313e4ba')}
                            <span style={{ fontSize: '0.78rem', fontWeight: 'normal', color: 'var(--text-muted)', marginLeft: 8 }}>
                                {L(`共 ${admins.length} 人`, `${admins.length} total`)}
                                {maxSubAdmins >= 0 && <> / {L(`最多 ${maxSubAdmins === 0 ? '0' : maxSubAdmins}`, `max ${maxSubAdmins === 0 ? '0' : maxSubAdmins}`)}</>}
                            </span>
                        </div>
                    </div>
                    {!showCreate && (() => {
                        const reachedLimit = maxSubAdmins === 0 || (maxSubAdmins > 0 && admins.length >= maxSubAdmins)
                        return (
                            <button
                                type="button"
                                onClick={() => !reachedLimit && setShowCreate(true)}
                                className="ts-btn-primary"
                                disabled={reachedLimit}
                                style={{ padding: '7px 14px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 4, opacity: reachedLimit ? 0.5 : 1, cursor: reachedLimit ? 'not-allowed' : 'pointer' }}
                            >
                                <span style={{ fontSize: '1.1em', lineHeight: 1 }}>+</span> {L('inline.add.sub.admin.6a4a6ce')}
                            </button>
                        )
                    })()}
                </div>

                {showCreate && (
                    <form onSubmit={handleCreate} style={{
                        marginBottom: 16,
                        padding: 20,
                        background: 'linear-gradient(135deg, rgba(239,68,68,0.04), rgba(249,115,22,0.04))',
                        border: '1px solid var(--border-color)',
                        borderRadius: 12,
                        display: 'flex', flexDirection: 'column', gap: 14
                    }}>
                        <div style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span>👤</span> {L('inline.add.new.sub.admin.2577681')}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: 6 }}>{L('admin.users.table.email')} <span style={{ color: '#ef4444' }}>*</span></label>
                                <input
                                    type="email"
                                    placeholder="staff@example.com"
                                    value={form.email}
                                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                                    required
                                    style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border-color)', borderRadius: 8, fontSize: '0.88rem', background: 'var(--bg-card)' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: 6 }}>{L('inline.name.0c5acea')} <span style={{ color: 'var(--text-muted)', fontWeight: 'normal' }}>{L('inline.optional.a52b3ba')}</span></label>
                                <input
                                    type="text"
                                    placeholder={L('inline.staff.name.51d7e7f')}
                                    value={form.username}
                                    onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                                    style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border-color)', borderRadius: 8, fontSize: '0.88rem', background: 'var(--bg-card)' }}
                                />
                            </div>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: 6 }}>{L('inline.initial.password.551df71')} <span style={{ color: '#ef4444' }}>*</span></label>
                            <input
                                type="password"
                                placeholder={L('inline.at.least.6.characters.7ffb04e')}
                                value={form.password}
                                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                                required
                                minLength={6}
                                style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border-color)', borderRadius: 8, fontSize: '0.88rem', background: 'var(--bg-card)' }}
                            />
                            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 6 }}>{L('inline.staff.can.change.the.password.after.login.eb04f0f')}</div>
                        </div>

                        {/* 权限配置 */}
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{L('inline.permissions.8a9ebea')}</label>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button type="button" onClick={() => {
                                        const all = {}; permGroups.forEach(g => g.items.forEach(i => { all[i.key] = true }))
                                        setCreatePermissions(all)
                                    }} style={{ background: 'none', border: '1px solid var(--border-color)', borderRadius: 6, padding: '3px 10px', fontSize: '0.74rem', cursor: 'pointer' }}>{L('inline.enable.all.8d8b492')}</button>
                                    <button type="button" onClick={() => setCreatePermissions(permDefaults)} style={{ background: 'none', border: '1px solid var(--border-color)', borderRadius: 6, padding: '3px 10px', fontSize: '0.74rem', cursor: 'pointer' }}>{L('inline.default.58cd596')}</button>
                                    <button type="button" onClick={() => setCreatePermissions({})} style={{ background: 'none', border: '1px solid var(--border-color)', borderRadius: 6, padding: '3px 10px', fontSize: '0.74rem', cursor: 'pointer' }}>{L('inline.disable.all.9d7cba6')}</button>
                                </div>
                            </div>
                            {renderPermissionGroups(createPermissions, setCreatePermissions)}
                        </div>
                        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                            <button
                                type="button"
                                onClick={() => { setShowCreate(false); setForm({ email: '', username: '', password: '' }) }}
                                style={{ padding: '8px 18px', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-secondary)', borderRadius: 8, fontSize: '0.85rem', cursor: 'pointer' }}
                            >
                                {L('admin.common.cancel')}
                            </button>
                            <button type="submit" className="ts-btn-primary" disabled={submitting} style={{ padding: '8px 18px' }}>
                                {submitting ? L('inline.creating.3abc349') : L('inline.create.sub.admin.27d6dbc')}
                            </button>
                        </div>
                    </form>
                )}

                {loading ? (
                    <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>{L('admin.common.loading')}</div>
                ) : admins.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '32px 20px', background: 'var(--bg-tertiary)', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)' }}>
                        <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>👥</div>
                        <div style={{ fontSize: '0.85rem' }}>{L('inline.no.sub.admins.yet.396c511')}</div>
                        <div style={{ fontSize: '0.75rem', marginTop: 4 }}>{L('inline.click.add.sub.admin.to.invite.staff.b87bb13')}</div>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {admins.map(a => (
                            <div key={a.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontWeight: 600 }}>
                                        {(a.email || '?')[0].toUpperCase()}
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.88rem', fontWeight: 500 }}>{a.username || a.email}</div>
                                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{a.email}</div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button type="button" onClick={() => setEditingAdmin({ id: a.id, username: a.username, permissions: { ...a.permissions } })} style={{ background: 'none', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.78rem', cursor: 'pointer', padding: '4px 12px', borderRadius: 6 }}>
                                        {L('inline.edit.permissions.31cb6d7')}
                                    </button>
                                    <button type="button" onClick={() => handleRemove(a.id, a.email)} style={{ background: 'none', border: 'none', color: 'var(--error, #ef4444)', fontSize: '0.82rem', cursor: 'pointer', padding: '4px 10px' }}>
                                        {L('inline.remove.permissions.2b4c4d4')}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* 权限说明 */}
            <div style={{ padding: '14px 16px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.7 }}>
                <div style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>{L('inline.permission.notes.74ba764')}</div>
                <div>• {L('inline.store.owner.has.all.permissions.including.store.settings.and.251b332')}</div>
                <div>• {L('inline.sub.admins.can.manage.products.orders.cards.tickets.and.user.69aba6a')}</div>
                <div>• {L('inline.sub.admins.can.only.access.the.current.store.95742a8')}</div>
                <div>• {L('inline.after.removal.the.account.becomes.a.normal.user.and.can.stil.af28da8')}</div>
            </div>

            {/* 编辑权限弹窗 */}
            {editingAdmin && (
                <div onClick={() => setEditingAdmin(null)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.45)', zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                    <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-card)', borderRadius: 14, padding: 24, maxWidth: 920, width: '100%', maxHeight: '85vh', overflow: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <h3 style={{ margin: 0, fontSize: '1rem' }}>{L('inline.edit.sub.admin.permissions.85e2ca6')}</h3>
                            <button onClick={() => setEditingAdmin(null)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--text-muted)' }}>×</button>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 12 }}>
                            <button type="button" onClick={() => {
                                const all = {}; permGroups.forEach(g => g.items.forEach(i => { all[i.key] = true }))
                                setEditingAdmin({ ...editingAdmin, permissions: all })
                            }} style={{ background: 'none', border: '1px solid var(--border-color)', borderRadius: 6, padding: '4px 12px', fontSize: '0.78rem', cursor: 'pointer' }}>{L('inline.enable.all.8d8b492')}</button>
                            <button type="button" onClick={() => setEditingAdmin({ ...editingAdmin, permissions: { ...permDefaults } })} style={{ background: 'none', border: '1px solid var(--border-color)', borderRadius: 6, padding: '4px 12px', fontSize: '0.78rem', cursor: 'pointer' }}>{L('inline.default.58cd596')}</button>
                            <button type="button" onClick={() => setEditingAdmin({ ...editingAdmin, permissions: {} })} style={{ background: 'none', border: '1px solid var(--border-color)', borderRadius: 6, padding: '4px 12px', fontSize: '0.78rem', cursor: 'pointer' }}>{L('inline.disable.all.9d7cba6')}</button>
                        </div>

                        {renderPermissionGroups(
                            editingAdmin.permissions,
                            (next) => setEditingAdmin({ ...editingAdmin, permissions: next })
                        )}

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                            <button type="button" onClick={() => setEditingAdmin(null)} style={{ padding: '8px 18px', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-secondary)', borderRadius: 8, cursor: 'pointer' }}>{L('admin.common.cancel')}</button>
                            <button type="button" onClick={handleSavePermissions} className="ts-btn-primary" style={{ padding: '8px 18px' }}>{L('inline.save.permissions.e1ebb48')}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

// Plan Tab 组件
function PlanTab({ shop, mToken, displaySlug }) {
    const L = useAdminL()
    const [showPurchase, setShowPurchase] = useState(false)

    const planName = shop?.plan === 'FREE' ? '免费试用' : shop?.plan === 'BASIC' ? '基础版' : shop?.plan === 'STANDARD' ? '标准版' : shop?.plan === 'PRO' ? 'Pro' : shop?.plan || '—'
    const isExpired = shop?.status === 'EXPIRED'
    const expiryDate = shop?.planExpiresAt ? new Date(shop.planExpiresAt).toLocaleDateString() : (shop?.trialEndsAt ? new Date(shop.trialEndsAt).toLocaleDateString() : null)

    return (
        <div>
            {/* 当前套餐卡片 */}
            <div style={{
                background: 'var(--gradient-card)', border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)', padding: '24px', marginBottom: 24
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: '1.5rem' }}>💎</span>
                        <div>
                            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{planName}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
                                {isExpired ? '已到期' : expiryDate ? L(`到期时间 ${expiryDate}`, `Expires ${expiryDate}`) : '永久有效'}
                            </div>
                        </div>
                    </div>
                    <div style={{
                        padding: '4px 12px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600,
                        background: isExpired ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.12)',
                        color: isExpired ? 'var(--error)' : 'var(--success)'
                    }}>
                        {isExpired ? '已到期' : L('使用中', 'Active')}
                    </div>
                </div>

                {/* 商城链接 */}
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '10px 14px', background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)',
                    fontSize: '0.84rem'
                }}>
                    <span style={{ color: 'var(--text-muted)' }}>{L('店铺链接: ', 'Store URL: ')}</span>
                    <a href={`/v/${displaySlug}`} target="_blank" rel="noreferrer" style={{ color: 'var(--primary-light)', textDecoration: 'none' }}>
                        {window.location.origin}/v/{displaySlug}
                    </a>
                </div>
            </div>

            {/* 操作按钮 */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 28, flexWrap: 'wrap' }}>
                <button
                    onClick={() => setShowPurchase(!showPurchase)}
                    className="ts-btn-primary"
                    style={{ padding: '12px 28px', fontSize: '0.9rem' }}
                >
                    {showPurchase ? L('收起', 'Collapse') : (shop?.plan === 'FREE' || isExpired ? L('🚀 升级套餐', '🚀 Upgrade Plan') : L('续费 / 升级', 'Renew / Upgrade'))}
                </button>
                {!showPurchase && shop?.plan && shop.plan !== 'FREE' && !isExpired && (
                    <span style={{ alignSelf: 'center', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        {L('付费套餐已启用。您可以在此处进行续费或更换套餐。', 'Paid plan active. Renew or switch plans here.')}
                    </span>
                )}
            </div>

            {/* 购买面板 — 从下方滑出 */}
            <div style={{
                maxHeight: showPurchase ? '2000px' : '0',
                overflow: 'hidden',
                transition: 'max-height 0.35s ease-in-out',
                marginBottom: showPurchase ? 28 : 0
            }}>
                <div style={{
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    padding: '24px',
                    background: 'var(--bg-secondary)'
                }}>
                    <PlanPurchase />
                </div>
            </div>
        </div>
    )
}

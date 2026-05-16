import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FiArrowLeft, FiCheck, FiAlertCircle } from 'react-icons/fi'
import { useAuthStore } from '../../store/authStore'
import { useSkinStore } from '../../store/skinStore'
import toast from 'react-hot-toast'
import './AgentApply.css'

export default function AgentApply() {
    const { isAuthenticated, token } = useAuthStore()
    const { siteName } = useSkinStore()
    const navigate = useNavigate()

    const [form, setForm] = useState({
        shopName: '',
        slug: '',
        contactEmail: '',
        contactInfo: '',
        description: '',
    })
    const [agreed, setAgreed] = useState(false)
    const [showAgreement, setShowAgreement] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [result, setResult] = useState(null) // 'success' | { error }

    const setField = (key, val) => setForm(prev => ({ ...prev, [key]: val }))

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (!form.shopName.trim()) { toast.error('请输入店铺名称'); return }
        if (!form.slug.trim()) { toast.error('请输入分站路径'); return }
        if (!/^[a-z0-9-]{3,30}$/.test(form.slug)) {
            toast.error('分站路径需要 3-30 位小写字母、数字或连字符'); return
        }
        if (!form.contactEmail.trim()) { toast.error('请输入通知邮箱'); return }
        if (!form.contactInfo.trim()) { toast.error('请输入联系方式'); return }
        if (!agreed) { toast.error('请先阅读并同意代理协议'); return }

        setSubmitting(true)
        try {
            const res = await fetch('/api/agent/apply', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    shopName: form.shopName,
                    shopSlug: form.slug,
                    contactEmail: form.contactEmail,
                    contactInfo: form.contactInfo,
                    description: form.description,
                })
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || '申请失败')
            setResult('success')
        } catch (err) {
            toast.error(err.message)
        } finally {
            setSubmitting(false)
        }
    }

    // ── 未登录 ──
    if (!isAuthenticated) {
        return (
            <div className="aa-page">
                <div className="aa-card aa-not-auth">
                    <FiAlertCircle size={40} style={{ color: '#F59E0B', marginBottom: 12 }} />
                    <h2>请先登录</h2>
                    <p>申请成为代理商需要先登录您的账户</p>
                    <Link to="/login" className="aa-btn aa-btn-primary" style={{ textDecoration: 'none' }}>
                        前往登录
                    </Link>
                </div>
            </div>
        )
    }

    // ── 提交成功 ──
    if (result === 'success') {
        return (
            <div className="aa-page">
                <div className="aa-card aa-success">
                    <div className="aa-success-icon">
                        <FiCheck size={32} />
                    </div>
                    <h2>申请已提交</h2>
                    <p>您的代理商申请已成功提交，管理员将在 1-3 个工作日内完成审核。</p>
                    <p className="aa-hint">审核结果将通过您填写的通知邮箱发送，请注意查收。</p>
                    <button className="aa-btn aa-btn-primary" onClick={() => navigate('/')}>
                        返回首页
                    </button>
                </div>
            </div>
        )
    }

    const platformName = siteName || 'VMart'

    return (
        <div className="aa-page">
            <div className="aa-header">
                <Link to="/" className="aa-back"><FiArrowLeft size={18} /> 返回首页</Link>
            </div>

            <div className="aa-card">
                <div className="aa-title-section">
                    <h1>代理商入驻申请</h1>
                    <p>成为代理商，在平台商品基础上自主定价销售，拥有独立分站与管理后台。</p>
                </div>

                <form className="aa-form" onSubmit={handleSubmit}>
                    {/* 基础信息 */}
                    <div className="aa-section-label">基本信息</div>

                    <div className="aa-field">
                        <label className="aa-label">店铺名称 <span className="aa-required">*</span></label>
                        <input
                            type="text" className="aa-input"
                            placeholder="例如：小明优选数码"
                            value={form.shopName}
                            onChange={e => setField('shopName', e.target.value)}
                            maxLength={50}
                            required
                        />
                        <span className="aa-field-hint">将展示在您的分站页面上</span>
                    </div>

                    <div className="aa-field">
                        <label className="aa-label">分站路径 <span className="aa-required">*</span></label>
                        <div className="aa-input-group">
                            <span className="aa-input-prefix">{window.location.origin}/s/</span>
                            <input
                                type="text" className="aa-input aa-input-slug"
                                placeholder="my-shop"
                                value={form.slug}
                                onChange={e => setField('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                                maxLength={30}
                                required
                            />
                        </div>
                        <span className="aa-field-hint">3-30位，仅限小写字母、数字和连字符（-）</span>
                    </div>

                    {/* 联系方式 */}
                    <div className="aa-section-label">联系方式</div>

                    <div className="aa-row">
                        <div className="aa-field">
                            <label className="aa-label">通知邮箱 <span className="aa-required">*</span></label>
                            <input
                                type="email" className="aa-input"
                                placeholder="your@email.com"
                                value={form.contactEmail}
                                onChange={e => setField('contactEmail', e.target.value)}
                                required
                            />
                            <span className="aa-field-hint">用于接收审核结果和系统通知</span>
                        </div>
                        <div className="aa-field">
                            <label className="aa-label">联系方式 <span className="aa-required">*</span></label>
                            <input
                                type="text" className="aa-input"
                                placeholder="微信/QQ/Telegram 等"
                                value={form.contactInfo}
                                onChange={e => setField('contactInfo', e.target.value)}
                                required
                            />
                            <span className="aa-field-hint">便于管理员与您沟通</span>
                        </div>
                    </div>

                    {/* 申请说明 */}
                    <div className="aa-section-label">补充说明</div>

                    <div className="aa-field">
                        <label className="aa-label">申请描述</label>
                        <textarea
                            className="aa-textarea"
                            placeholder="请简要说明您的推广计划、目标用户群体、以往分销经验等（选填）"
                            value={form.description}
                            onChange={e => setField('description', e.target.value)}
                            rows={4}
                            maxLength={500}
                        />
                        <span className="aa-field-hint">{form.description.length}/500</span>
                    </div>

                    {/* 协议 */}
                    <div className="aa-agreement-section">
                        <label className="aa-checkbox-label">
                            <input
                                type="checkbox"
                                checked={agreed}
                                onChange={e => setAgreed(e.target.checked)}
                                className="aa-checkbox"
                            />
                            <span>我已阅读并同意</span>
                            <button
                                type="button"
                                className="aa-agreement-link"
                                onClick={() => setShowAgreement(!showAgreement)}
                            >
                                《{platformName} 代理商服务协议》
                            </button>
                        </label>

                        {showAgreement && (
                            <div className="aa-agreement-content">
                                <h4>{platformName} 代理商服务协议</h4>
                                <p>生效日期：即日起</p>

                                <h5>一、总则</h5>
                                <p>本协议是您（以下称「代理商」）与 {platformName} 平台（以下称「平台」）之间就代理分销服务所订立的协议。申请成为代理商即表示您已充分阅读并同意遵守本协议的全部条款。</p>

                                <h5>二、代理商资格</h5>
                                <ol>
                                    <li>代理商须为具有完全民事行为能力的自然人或合法注册的经营主体。</li>
                                    <li>代理商须如实填写申请信息，提供有效的联系方式，并对所填信息的真实性负责。</li>
                                    <li>平台有权对代理商申请进行审核，并有权拒绝不符合条件的申请。</li>
                                </ol>

                                <h5>三、经营规范</h5>
                                <ol>
                                    <li>代理商不得销售任何违反中华人民共和国法律法规的商品或服务，包括但不限于涉及色情、赌博、毒品、枪支弹药、侵犯知识产权等违法违规内容。</li>
                                    <li>代理商不得利用平台从事洗钱、欺诈或其他非法金融活动。</li>
                                    <li>代理商不得发布虚假、误导性的商品信息或宣传内容。</li>
                                    <li>代理商不得恶意干扰平台正常运营或其他代理商的经营活动。</li>
                                    <li>代理商应合理定价，不得进行恶性竞争或价格欺诈。</li>
                                </ol>

                                <h5>四、结算与提现</h5>
                                <ol>
                                    <li>代理商的销售利润将自动结算至代理商账户余额。</li>
                                    <li>提现申请需经平台审核通过后处理，平台保留对异常交易进行审查的权利。</li>
                                    <li>因代理商自身原因（如违规操作、虚假交易等）产生的订单退款，相应利润将从代理商余额中扣除。</li>
                                </ol>

                                <h5>五、违约与处罚</h5>
                                <ol>
                                    <li>代理商违反本协议任何条款的，平台有权视情节严重程度采取以下措施：警告、暂停代理资格、永久取消代理资格、冻结账户余额。</li>
                                    <li>因代理商违规行为导致平台遭受损失的，代理商应承担相应的赔偿责任。</li>
                                    <li>涉及违法犯罪行为的，平台将依法向有关部门举报。</li>
                                </ol>

                                <h5>六、免责声明</h5>
                                <ol>
                                    <li>平台不对代理商的经营行为承担连带责任。</li>
                                    <li>因不可抗力、系统维护等原因导致服务中断的，平台不承担责任，但将尽力减少影响。</li>
                                </ol>

                                <h5>七、协议变更</h5>
                                <p>平台保留随时修改本协议的权利。修改后的协议一经发布即生效，继续使用代理服务即视为接受变更后的协议。</p>

                                <h5>八、其他</h5>
                                <p>本协议的解释权归 {platformName} 平台所有。如有任何争议，双方应友好协商解决。</p>
                            </div>
                        )}
                    </div>

                    <button
                        type="submit"
                        className="aa-btn aa-btn-primary aa-submit"
                        disabled={submitting || !agreed}
                    >
                        {submitting ? '提交中…' : '提交代理申请'}
                    </button>
                </form>
            </div>
        </div>
    )
}

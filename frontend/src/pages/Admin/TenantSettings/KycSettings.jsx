import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'

const API = import.meta.env.VITE_API_URL || '/api'

export default function KycSettings({ token, L }) {
    const [kyc, setKyc] = useState(null)
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [form, setForm] = useState({ realName: '', idNumber: '', docType: 'id_card' })
    const [photo, setPhoto] = useState(null)
    const [photoPreview, setPhotoPreview] = useState(null)

    useEffect(() => {
        fetchKycStatus()
    }, [])

    const fetchKycStatus = () => {
        setLoading(true)
        fetch(`${API}/tenant/kyc/status`, {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(res => res.json())
            .then(data => {
                if (data.kyc) {
                    setKyc(data.kyc)
                }
            })
            .catch(() => toast.error(L('无法获取实名认证状态', 'Failed to retrieve verification status')))
            .finally(() => setLoading(false))
    }

    const handleFileChange = (e) => {
        const file = e.target.files[0]
        if (!file) return

        if (file.size > 5 * 1024 * 1024) {
            toast.error(L('图片大小不能超过 5MB', 'Image size must be less than 5MB'))
            return
        }

        setPhoto(file)
        const reader = new FileReader()
        reader.onloadend = () => {
            setPhotoPreview(reader.result)
        }
        reader.readAsDataURL(file)
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!form.realName.trim()) return toast.error(L('请输入真实姓名', 'Please enter your real name'))
        if (!form.idNumber.trim()) return toast.error(L('请输入证件号码', 'Please enter your document number'))
        if (!photo) return toast.error(L('请上传手持证件及字条照片', 'Please upload a hand-held photo with document and handwritten note'))

        setSubmitting(true)
        const formData = new FormData()
        formData.append('realName', form.realName.trim())
        formData.append('idNumber', form.idNumber.trim())
        formData.append('docType', form.docType)
        formData.append('photo', photo)

        try {
            const res = await fetch(`${API}/tenant/kyc/submit`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: formData
            })
            const data = await res.json()
            if (res.ok) {
                toast.success(L('申请提交成功', 'Application submitted successfully'))
                fetchKycStatus()
            } else {
                toast.error(data.error || L('提交失败', 'Submission failed'))
            }
        } catch {
            toast.error(L('网络连接错误，请稍后重试', 'Network error, please try again later'))
        } finally {
            setSubmitting(false)
        }
    }

    const kycStatus = kyc?.status || 'UNVERIFIED'

    if (loading) {
        return <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)' }}>{L('正在加载状态...', 'Loading status...')}</div>
    }

    return (
        <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
            {/* 顶部声明 */}
            <div style={{ background: 'var(--bg-secondary)', padding: '20px 24px', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '24px' }}>
                <h3 style={{ margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)', fontSize: '1.1rem' }}>
                    🛡️ {L('资金结算安全合规说明', 'Payment Collection Compliance')}
                </h3>
                <p style={{ margin: 0, fontSize: '0.88rem', lineHeight: '1.6', color: 'var(--text-secondary)' }}>
                    如果您正在使用或计划启用<b>平台代收渠道</b>，根据《中华人民共和国电子商务法》及《反电信网络诈骗法》的实名制规定，您必须在首次发起提现前完成实名核验。自备收款通道的商户无需在此处认证。
                </p>
                <div style={{ marginTop: '12px', padding: '10px 14px', background: 'rgba(59,130,246,0.06)', borderLeft: '3px solid #3b82f6', borderRadius: '4px', fontSize: '0.82rem', color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    💡 <b>{L('隐私保护承诺：', 'Privacy Promise: ')}</b>
                    {L('为保障个人信息安全，上传的手持照片仅用于人工比对审核，通过或拒绝后系统会自动立即从服务器磁盘彻底销毁照片文件，绝不作任何物理备份留存，请放心核验。', 'To protect your privacy, all uploaded photos are used only for audit and will be permanently deleted from the disk automatically after review.')}
                </div>
            </div>

            {/* 实名已通过 */}
            {kycStatus === 'VERIFIED' && (
                <div style={{
                    textAlign: 'center',
                    padding: '48px 24px',
                    background: 'var(--bg-secondary)',
                    borderRadius: '16px',
                    border: '1px solid var(--border-color)',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
                    animation: 'fadeIn 0.6s ease-out'
                }}>
                    <style>{`
                        @keyframes scaleIn {
                            0% { transform: scale(0.6); opacity: 0; }
                            100% { transform: scale(1); opacity: 1; }
                        }
                        @keyframes fadeIn {
                            0% { opacity: 0; transform: translateY(15px); }
                            100% { opacity: 1; transform: translateY(0); }
                        }
                    `}</style>

                    {/* 动感绿色勾选徽章 */}
                    <div style={{
                        width: '72px',
                        height: '72px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 20px auto',
                        boxShadow: '0 8px 20px rgba(16, 185, 129, 0.25)',
                        animation: 'scaleIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards'
                    }}>
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                        </svg>
                    </div>

                    <h2 style={{ fontSize: '1.5rem', color: '#10B981', margin: '0 0 10px 0', fontWeight: '700', letterSpacing: '-0.01em' }}>
                        {L('已通过实名认证', 'Real-name Verified')}
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: '0 0 32px 0', lineHeight: 1.5 }}>
                        {L('您的账户状态正常，已获得平台代收与额度提现权限。', 'Your account is active. Platform billing and payouts have been unlocked.')}
                    </p>

                    {/* 详情卡片 */}
                    <div style={{
                        maxWidth: '420px',
                        margin: '0 auto',
                        background: 'var(--bg-tertiary)',
                        padding: '24px',
                        borderRadius: '12px',
                        border: '1px solid var(--border-color)',
                        textAlign: 'left',
                        boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.05)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '14px', borderBottom: '1px solid var(--border-color)', fontSize: '0.9rem' }}>
                            <span style={{ color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                    <circle cx="12" cy="7" r="4" />
                                </svg>
                                {L('真实姓名', 'Real Name')}
                            </span>
                            <span style={{ fontWeight: '600', color: 'var(--text-primary)', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                                {kyc?.realName || ''}
                                <span style={{ fontSize: '0.72rem', color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '2px 8px', borderRadius: '10px', fontWeight: '500' }}>已核验</span>
                            </span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '14px', fontSize: '0.9rem' }}>
                            <span style={{ color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="4" width="18" height="16" rx="2" ry="2" />
                                    <line x1="7" y1="8" x2="17" y2="8" />
                                    <line x1="7" y1="12" x2="17" y2="12" />
                                </svg>
                                {L('身份证号', 'ID Card')}
                            </span>
                            <span style={{ fontWeight: '600', color: 'var(--text-primary)', fontFamily: 'monospace', letterSpacing: '0.05em' }}>
                                {kyc?.idNumber || ''}
                            </span>
                        </div>

                        {/* 安全提示 */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            marginTop: '20px',
                            paddingTop: '16px',
                            borderTop: '1px dashed var(--border-color)',
                            color: '#10b981',
                            fontSize: '0.78rem',
                            fontWeight: '500'
                        }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                            </svg>
                            {L('已启用数据安全加密保护', 'Data encryption protection active')}
                        </div>
                    </div>
                </div>
            )}

            {/* 实名审核中 */}
            {kycStatus === 'PENDING' && (
                <div style={{ textAlign: 'center', padding: '48px 24px', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '4.5rem', marginBottom: '16px', animation: 'pulse 2s infinite' }}>⏳</div>
                    <style>{`@keyframes pulse { 0% { opacity: 0.6; } 50% { opacity: 1; } 100% { opacity: 0.6; } }`}</style>
                    <h2 style={{ fontSize: '1.4rem', color: '#F59E0B', margin: '0 0 8px 0', fontWeight: '600' }}>{L('身份信息审核中', 'Under Review')}</h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: '0 0 24px 0', maxWidth: '420px', marginLeft: 'auto', marginRight: 'auto', lineHeight: '1.5' }}>
                        您的实名认证申请已提交，平台管理员正为您加急比对核验。我们通常在 24 小时内完成审核并彻底物理删除证件照片。
                    </p>
                    <div style={{ display: 'inline-block', padding: '8px 16px', borderRadius: '20px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                        提交时间：{kyc?.requestedAt ? new Date(kyc.requestedAt).toLocaleString() : ''}
                    </div>
                </div>
            )}

            {/* 未提交或已拒绝 */}
            {(kycStatus === 'UNVERIFIED' || kycStatus === 'REJECTED') && (
                <form onSubmit={handleSubmit} style={{ background: 'var(--bg-secondary)', padding: '24px 28px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                    {kycStatus === 'REJECTED' && (
                        <div style={{ padding: '14px 18px', background: 'rgba(239,68,68,0.06)', borderLeft: '4px solid #ef4444', borderRadius: '6px', color: '#ef4444', marginBottom: '24px', fontSize: '0.88rem' }}>
                            <div style={{ fontWeight: '600', marginBottom: '4px' }}>❌ {L('实名申请已被拒绝，原照片已被销毁，请重新提交：', 'Verification Rejected. Please re-submit:')}</div>
                            <div>{kyc.rejectReason || L('原因：信息不匹配，或上传的手持合照不清晰。', 'Reason: Information mismatch, or the uploaded photo is not clear.')}</div>
                        </div>
                    )}

                    {/* 三列栅格：姓名、证件类型、证件号码 */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                        <div className="ts-form-group" style={{ margin: 0 }}>
                            <label style={{ fontSize: '0.86rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '8px', display: 'block' }}>
                                {L('真实姓名 / Full Name', 'Full Name')}
                            </label>
                            <input
                                type="text"
                                placeholder={L('请填写与证件一致的姓名', 'Enter name matching your document')}
                                value={form.realName}
                                onChange={e => setForm(f => ({ ...f, realName: e.target.value }))}
                                required
                                style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.9rem' }}
                            />
                        </div>
                        <div className="ts-form-group" style={{ margin: 0 }}>
                            <label style={{ fontSize: '0.86rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '8px', display: 'block' }}>
                                {L('证件类型 / Document Type', 'Document Type')}
                            </label>
                            <select
                                value={form.docType}
                                onChange={e => setForm(f => ({ ...f, docType: e.target.value }))}
                                style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.9rem', cursor: 'pointer' }}
                            >
                                <option value="id_card">{L('居民身份证 / National ID Card', 'National ID Card')}</option>
                                <option value="passport">{L('护照 / Passport', 'Passport')}</option>
                                <option value="driver_license">{L('驾照 / Driver\'s License', 'Driver\'s License')}</option>
                            </select>
                        </div>
                        <div className="ts-form-group" style={{ margin: 0 }}>
                            <label style={{ fontSize: '0.86rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '8px', display: 'block' }}>
                                {L('证件号码 / Document Number', 'Document Number')}
                            </label>
                            <input
                                type="text"
                                placeholder={
                                    form.docType === 'id_card'
                                        ? L('请输入18位身份证号码', 'Enter 18-digit ID number')
                                        : form.docType === 'passport'
                                            ? L('请输入护照号码', 'Enter passport number')
                                            : L('请输入驾照证件号码', 'Enter driver\'s license number')
                                }
                                value={form.idNumber}
                                onChange={e => setForm(f => ({ ...f, idNumber: e.target.value }))}
                                required
                                style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.9rem' }}
                            />
                        </div>
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                        <label style={{ fontSize: '0.86rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '8px', display: 'block' }}>
                            {L('手持证件与字条合照上传 / Hand-held Document & Note Photo', 'Hand-held Document & Note Photo')}
                        </label>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'stretch' }}>
                            {/* 上传区域 */}
                            <div style={{ border: '2px dashed var(--border-color)', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', cursor: 'pointer', background: 'var(--bg-tertiary)', position: 'relative', minHeight: '180px' }}>
                                <input
                                    type="file"
                                    accept="image/jpeg,image/jpg,image/png,image/webp"
                                    onChange={handleFileChange}
                                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                                />
                                {photoPreview ? (
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                                        <img src={photoPreview} alt="Preview" style={{ maxWidth: '100%', maxHeight: '160px', objectFit: 'contain', borderRadius: '4px' }} />
                                    </div>
                                ) : (
                                    <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '20px 0' }}>
                                        <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>📸</div>
                                        <div style={{ fontSize: '0.84rem', fontWeight: '500', color: 'var(--text-primary)', marginBottom: '4px' }}>{L('选择并上传手持合照', 'Upload hand-held photo')}</div>
                                        <div style={{ fontSize: '0.74rem' }}>{L('支持 JPG、PNG、WebP 格式，小于 5MB', 'JPG, PNG, WebP format under 5MB')}</div>
                                    </div>
                                )}
                            </div>

                            {/* 示例提示 */}
                            <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '16px', fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                <div style={{ fontWeight: '600', color: 'var(--text-primary)', marginBottom: '8px', fontSize: '0.82rem' }}>⚠️ {L('拍摄与上传规范指引：', 'Photo guidelines & requirements:')}</div>
                                <ul style={{ margin: 0, paddingLeft: '16px', lineHeight: '1.6' }}>
                                    <li>{L('请手持您选择的<b>证件信息面</b>靠近镜头；', 'Hold the selected document info page close to the camera;')}</li>
                                    <li>{L('准备一张白纸，手写内容：<b>“仅限 Vmart 平台实名认证”</b> 并写下<b>当前日期</b>，与证件一同拿在手中拍照；', 'Prepare a white paper with hand-written note: "For Vmart verification only" and the current date, hold it alongside your document;')}</li>
                                    <li>{L('确保五官清晰，证件上的<b>文字、姓名和号码必须清晰可辨</b>，无任何反光、阴影或遮挡；', 'Ensure facial features and all text/numbers on the document are sharp, readable, without glare or blur;')}</li>
                                    <li>{L('禁止使用任何证件扫描件、复印件或电子屏翻拍件。', 'Photocopies, screenshots or digital scans are strictly prohibited.')}</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <button type="submit" disabled={submitting} className="ts-btn-primary" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: '120px' }}>
                        {submitting ? L('正在提交...', 'Submitting...') : L('提交申请', 'Submit Request')}
                    </button>
                </form>
            )}
        </div>
    )
}

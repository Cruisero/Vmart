const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../frontend/src/pages/Admin/Dashboard/index.jsx');
let content = fs.readFileSync(file, 'utf8');

const startTag = 'function BackupSettings({ token, settings, handleChange, showToast }) {';
const startIdx = content.indexOf(startTag);
if (startIdx === -1) {
    console.error('BackupSettings start not found');
    process.exit(1);
}

const endTag = 'function AgentsManage() {';
const endIdx = content.indexOf(endTag, startIdx);
if (endIdx === -1) {
    console.error('AgentsManage start tag not found');
    process.exit(1);
}

console.log('Replacing BackupSettings from', startIdx, 'to', endIdx);

const prefix = content.slice(0, startIdx);
const suffix = content.slice(endIdx);

const translatedBackup = `function BackupSettings({ token, settings, handleChange, showToast }) {
    const L = useAdminL()
    const [backupStatus, setBackupStatus] = useState(null)
    const [running, setRunning] = useState(false)

    useEffect(() => {
        loadBackupStatus()
    }, [])

    const loadBackupStatus = async () => {
        try {
            const res = await fetch('/api/admin/backup/status', {
                headers: { 'Authorization': \`Bearer \${token}\` }
            })
            if (res.ok) {
                const data = await res.json()
                setBackupStatus(data)
            }
        } catch (e) {
            console.error('获取备份StatusFailed:', e)
        }
    }

    const handleManualBackup = async () => {
        setRunning(true)
        try {
            const res = await fetch('/api/admin/backup/run', {
                method: 'POST',
                headers: { 'Authorization': \`Bearer \${token}\` }
            })
            const data = await res.json()
            if (data.success) {
                showToast(L(\`备份完成: \${data.filename} (\${data.sizeMB} MB)\`, \`Backup complete: \${data.filename} (\${data.sizeMB} MB)\`), 'success')
                loadBackupStatus()
            } else {
                showToast(L(\`备份失败: \${data.error}\`, \`Backup failed: \${data.error}\`), 'error')
            }
        } catch (e) {
            showToast(L('备份请求失败', 'Backup request failed'), 'error')
        } finally {
            setRunning(false)
        }
    }

    const handleRestartSchedule = async () => {
        try {
            const res = await fetch('/api/admin/backup/restart-schedule', {
                method: 'POST',
                headers: { 'Authorization': \`Bearer \${token}\` }
            })
            if (res.ok) {
                showToast(L('备份计划已更新', 'Backup plan updated'), 'success')
                loadBackupStatus()
            }
        } catch (e) {
            showToast(L('更新备份计划失败', 'Update backup plan failed'), 'error')
        }
    }

    const formatSize = (bytes) => {
        if (!bytes) return '0 B'
        if (bytes < 1024) return bytes + ' B'
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
        return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
    }

    const handleDownloadBackup = async (filename) => {
        try {
            const res = await fetch(\`/api/admin/backup/download/\${encodeURIComponent(filename)}\`, {
                headers: { 'Authorization': \`Bearer \${token}\` }
            })
            if (!res.ok) {
                const data = await res.json().catch(() => ({}))
                showToast(data.error || L('下载失败', 'DownloadFailed'), 'error')
                return
            }
            const blob = await res.blob()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = filename
            document.body.appendChild(a)
            a.click()
            a.remove()
            window.URL.revokeObjectURL(url)
            showToast(L('已开始下载备份', 'Backup download started'), 'success')
        } catch (e) {
            showToast(L('下载请求失败', 'Download request failed'), 'error')
        }
    }

    return (
        <div className="settings-section">
            <h3>{L('数据库备份', 'Database Backup')}</h3>

            {/* 配置与Actions区 - 双栏布局 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                {/* 左栏：Backup Config */}
                <div style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.95), rgba(248,250,252,0.95))', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
                    <h4 style={{ margin: '0 0 24px', fontSize: '1rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ width: '34px', height: '34px', background: 'linear-gradient(135deg, #059669, #10b981)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>⚙️</span>
                        {L('备份配置', 'Backup Config')}
                    </h4>

                    {/* Enable开关 */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 18px', background: settings.backupEnabled ? 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(5,150,105,0.04))' : 'rgba(248,250,252,0.8)', borderRadius: '14px', border: \`1px solid \${settings.backupEnabled ? 'rgba(16,185,129,0.25)' : '#e2e8f0'}\`, marginBottom: '16px', transition: 'all 0.2s' }}>
                        <div>
                            <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#1e293b' }}>{L('💾 启用自动备份', '💾 Enable Auto Backup')}</div>
                            <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '3px' }}>{L('自动定时备份 MySQL 数据库', 'Scheduled automatic MySQL database backup')}</div>
                        </div>
                        <label className="toggle-switch">
                            <input type="checkbox" checked={settings.backupEnabled} onChange={(e) => handleChange('backupEnabled', e.target.checked)} />
                            <span className="toggle-slider"></span>
                        </label>
                    </div>

                    {settings.backupEnabled && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            {/* 频率 */}
                            <div style={{ padding: '14px 18px', background: 'rgba(248,250,252,0.8)', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                                <div style={{ fontWeight: 600, fontSize: '0.82rem', color: '#475569', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>{L('🕐 备份频率', '🕐 Backup Frequency')}</div>
                                <select
                                    value={settings.backupFrequency}
                                    onChange={(e) => handleChange('backupFrequency', parseInt(e.target.value))}
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', background: 'white', fontSize: '0.88rem', color: '#334155', outline: 'none', cursor: 'pointer', appearance: 'auto' }}
                                >
                                    <option value={1}>{L('每天一次 (凌晨 3 点)', 'Once daily (3 AM)')}</option>
                                    <option value={2}>{L('每天两次 (每 12 小时)', 'Twice daily (every 12h)')}</option>
                                    <option value={4}>{L('每天 4 次 (每 6 小时)', '4 times daily (every 6h)')}</option>
                                    <option value={6}>{L('每天 6 次 (每 4 小时)', '6 times daily (every 4h)')}</option>
                                    <option value={12}>{L('每天 12 次 (每 2 小时)', '12 times daily (every 2h)')}</option>
                                    <option value={24}>{L('每天 24 次 (每小时)', '24 times daily (hourly)')}</option>
                                </select>
                            </div>

                            {/* 保留天数 */}
                            <div style={{ padding: '14px 18px', background: 'rgba(248,250,252,0.8)', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                                <div style={{ fontWeight: 600, fontSize: '0.82rem', color: '#475569', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>{L('📅 保留天数', '📅 Retention Days')}</div>
                                <select
                                    value={settings.backupRetentionDays}
                                    onChange={(e) => handleChange('backupRetentionDays', parseInt(e.target.value))}
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', background: 'white', fontSize: '0.88rem', color: '#334155', outline: 'none', cursor: 'pointer', appearance: 'auto' }}
                                >
                                    <option value={3}>{L('3 天', '3 days')}</option>
                                    <option value={7}>{L('7 天', '7 days')}</option>
                                    <option value={14}>{L('14 天', '14 days')}</option>
                                    <option value={30}>{L('30 天', '30 days')}</option>
                                    <option value={60}>{L('60 天', '60 days')}</option>
                                    <option value={90}>{L('90 天', '90 days')}</option>
                                </select>
                                <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '6px' }}>{L('超过保留天数的备份将被自动清理删除', 'Backups older than retention period will be auto-deleted')}</div>
                            </div>

                            {/* Email Notification */}
                            <div style={{ padding: '14px 18px', background: settings.backupEmailEnabled ? 'linear-gradient(135deg, rgba(59,130,246,0.06), rgba(37,99,235,0.03))' : 'rgba(248,250,252,0.8)', borderRadius: '14px', border: \`1px solid \${settings.backupEmailEnabled ? 'rgba(59,130,246,0.2)' : '#e2e8f0'}\`, transition: 'all 0.2s' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: '0.82rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>{L('📧 邮件通知', '📧 Email Notification')}</div>
                                        <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>{L('备份成功后发送邮件通知 (带 SQL 备份附件)', 'Send notification after backup (with SQL file)')}</div>
                                    </div>
                                    <label className="toggle-switch">
                                        <input type="checkbox" checked={settings.backupEmailEnabled} onChange={(e) => handleChange('backupEmailEnabled', e.target.checked)} />
                                        <span className="toggle-slider"></span>
                                    </label>
                                </div>

                                {settings.backupEmailEnabled && (
                                    <div style={{ marginTop: '12px' }}>
                                        <div style={{ fontWeight: 500, fontSize: '0.78rem', color: '#64748b', marginBottom: '6px' }}>{L('接收邮箱', 'Recipient Email')}</div>
                                        <input
                                            type="email"
                                            value={settings.backupEmail}
                                            onChange={(e) => handleChange('backupEmail', e.target.value)}
                                            placeholder="admin@example.com"
                                            style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', background: 'white', fontSize: '0.88rem', color: '#334155', outline: 'none', boxSizing: 'border-box' }}
                                        />
                                        <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '5px' }}>{L('小于 25MB 将作为附件发送，超出则仅进行邮件通知', '≤25MB sent as attachment; larger files notify only')}</div>
                                    </div>
                                )}
                            </div>

                            {/* 应用按钮 */}
                            <button
                                onClick={handleRestartSchedule}
                                style={{ marginTop: '4px', width: '100%', padding: '13px', borderRadius: '12px', fontSize: '0.9rem', background: 'linear-gradient(135deg, #059669, #10b981)', border: 'none', cursor: 'pointer', color: 'white', fontWeight: 600, boxShadow: '0 4px 12px rgba(16,185,129,0.3)', transition: 'all 0.2s', letterSpacing: '0.3px' }}
                            >
                                🔄 {L('保存并生效备份配置', 'Save & Apply Backup Plan')}
                            </button>
                        </div>
                    )}
                </div>

                {/* 右栏：备份Status与文件 */}
                <div style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.95), rgba(248,250,252,0.95))', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column' }}>
                    <h4 style={{ margin: '0 0 20px', fontSize: '1rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ width: '32px', height: '32px', background: 'linear-gradient(135deg, #2563eb, #3b82f6)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>📋</span>
                        {L('备份历史记录', 'Backup History')}
                    </h4>

                    {backupStatus ? (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                            {/* 最近备份信息 */}
                            {backupStatus.lastBackup?.time && (
                                <div style={{ background: backupStatus.lastBackup.status === 'success' ? 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(5,150,105,0.05))' : 'linear-gradient(135deg, rgba(239,68,68,0.08), rgba(220,38,38,0.05))', borderRadius: '12px', padding: '14px 16px', marginBottom: '16px', border: \`1px solid \${backupStatus.lastBackup.status === 'success' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}\` }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: backupStatus.lastBackup.status === 'success' ? '#059669' : '#dc2626' }}>
                                            {backupStatus.lastBackup.status === 'success' ? L('✅ 上次备份成功', '✅ Last backup successful') : L('❌ 上次备份失败', 'Last backup failed')}
                                        </span>
                                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                            {new Date(backupStatus.lastBackup.time).toLocaleString('zh-CN')}
                                        </span>
                                    </div>
                                    {backupStatus.lastBackup.filename && (
                                        <div style={{ marginTop: '6px', fontFamily: "'SF Mono', Monaco, monospace", fontSize: '0.75rem', color: '#475569' }}>
                                            {backupStatus.lastBackup.filename}
                                        </div>
                                    )}
                                    {backupStatus.lastBackup.error && (
                                        <div style={{ marginTop: '8px', fontSize: '0.78rem', color: '#dc2626', padding: '8px 10px', background: 'rgba(239,68,68,0.08)', borderRadius: '8px' }}>
                                            {backupStatus.lastBackup.error}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* 文件列表 */}
                            {backupStatus.backups?.length > 0 ? (
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
                                        {L('备份文件列表', 'Backup Files')}
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        {backupStatus.backups.slice(0, 6).map((b, i) => (
                                            <div key={b.filename} style={{
                                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                padding: '10px 14px', borderRadius: '10px',
                                                background: i % 2 === 0 ? 'rgba(248,250,252,0.8)' : 'rgba(241,245,249,0.5)',
                                                border: '1px solid rgba(226,232,240,0.6)',
                                                transition: 'all 0.15s ease'
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <span style={{ fontSize: '1.1rem' }}>💾</span>
                                                    <div>
                                                        <div style={{ fontFamily: "'SF Mono', Monaco, monospace", fontSize: '0.78rem', color: '#334155', fontWeight: 500 }}>
                                                            {b.filename}
                                                        </div>
                                                        <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '2px' }}>
                                                            {new Date(b.createdAt).toLocaleString('zh-CN')}
                                                        </div>
                                                    </div>
                                                </div>
                                                <span
                                                    onClick={() => handleDownloadBackup(b.filename)}
                                                    title={L('点击下载备份', 'Click to download backup')}
                                                    style={{
                                                        padding: '4px 10px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 600,
                                                        background: 'linear-gradient(135deg, rgba(59,130,246,0.1), rgba(37,99,235,0.1))',
                                                        color: '#2563eb', border: '1px solid rgba(59,130,246,0.2)',
                                                        cursor: 'pointer', transition: 'all 0.2s ease',
                                                        userSelect: 'none'
                                                    }}
                                                    onMouseEnter={e => { e.target.style.background = 'linear-gradient(135deg, #2563eb, #3b82f6)'; e.target.style.color = 'white'; e.target.style.boxShadow = '0 2px 8px rgba(37,99,235,0.3)' }}
                                                    onMouseLeave={e => { e.target.style.background = 'linear-gradient(135deg, rgba(59,130,246,0.1), rgba(37,99,235,0.1))'; e.target.style.color = '#2563eb'; e.target.style.boxShadow = 'none' }}
                                                >
                                                    ⬇ {formatSize(b.size)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', color: '#94a3b8' }}>
                                    <div style={{ fontSize: '3rem', marginBottom: '12px', opacity: 0.5 }}>📂</div>
                                    <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>{L('暂无备份文件', 'No backup files')}</div>
                                    <div style={{ fontSize: '0.8rem', marginTop: '4px' }}>{L('启用自动备份或进行手动备份', 'Enable auto-backup or run a manual backup')}</div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>
                            {L('加载中...', 'Loading...')}
                        </div>
                    )}

                    {/* 手动备份按钮 */}
                    <button
                        onClick={handleManualBackup}
                        disabled={running}
                        style={{
                            marginTop: '16px', width: '100%', padding: '14px', borderRadius: '12px',
                            fontSize: '0.9rem', fontWeight: 600, cursor: running ? 'not-allowed' : 'pointer',
                            background: running ? '#94a3b8' : 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
                            color: 'white', border: 'none',
                            boxShadow: running ? 'none' : '0 4px 15px rgba(37,99,235,0.3)',
                            transition: 'all 0.2s ease',
                            opacity: running ? 0.7 : 1
                        }}
                    >
                        {running ? L('⏳ 正在备份数据库...', '⏳ Backing up database...') : L('🚀 立即执行备份', '🚀 Run Backup Now')}
                    </button>
                </div>
            </div>
        </div>
    )
}
`;

const newContent = prefix + translatedBackup + suffix;
fs.writeFileSync(file, newContent, 'utf8');
console.log('Successfully translated BackupSettings!');

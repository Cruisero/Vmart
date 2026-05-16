// 数据库自动备份服务
const { exec } = require('child_process')
const fs = require('fs')
const path = require('path')
const prisma = require('../config/database')
const logger = require('../utils/logger')
const cron = require('node-cron')

const BACKUP_DIR = '/app/backups'
let backupJob = null
let lastBackupInfo = { time: null, size: null, status: null, error: null }

// 获取备份相关设置
const getBackupSettings = async () => {
    const keys = [
        'backupEnabled', 'backupFrequency', 'backupRetentionDays',
        'backupEmailEnabled', 'backupEmail'
    ]
    const settings = await prisma.setting.findMany({
        where: { key: { in: keys } }
    })
    const map = {}
    settings.forEach(s => { map[s.key] = s.value })
    return {
        enabled: map.backupEnabled === 'true',
        frequency: parseInt(map.backupFrequency) || 1,       // 每天几次 (1/2/4/6/12/24)
        retentionDays: parseInt(map.backupRetentionDays) || 7, // 保留天数
        emailEnabled: map.backupEmailEnabled === 'true',
        email: map.backupEmail || ''
    }
}

// 解析 DATABASE_URL
const parseDatabaseUrl = () => {
    const url = process.env.DATABASE_URL || ''
    const match = url.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)/)
    if (!match) {
        logger.error('无法解析 DATABASE_URL, 当前值:', url ? '(已设置但格式不匹配)' : '(未设置)')
        return null
    }
    return {
        user: match[1],
        password: match[2],
        host: match[3],
        port: match[4],
        database: match[5]
    }
}

// 执行数据库备份
const performBackup = async () => {
    const db = parseDatabaseUrl()
    if (!db) {
        logger.error('数据库备份失败: 无法解析 DATABASE_URL')
        lastBackupInfo = { time: new Date(), size: null, status: 'failed', error: '无法解析数据库连接' }
        return null
    }

    // 确保备份目录存在
    if (!fs.existsSync(BACKUP_DIR)) {
        fs.mkdirSync(BACKUP_DIR, { recursive: true })
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const filename = `haodongxi_${timestamp}.sql`
    const filepath = path.join(BACKUP_DIR, filename)

    return new Promise((resolve, reject) => {
        const cmd = `mysqldump -h ${db.host} -P ${db.port} -u ${db.user} -p'${db.password}' --ssl=false --single-transaction --quick ${db.database} > ${filepath}`

        logger.info(`执行备份命令: mysqldump -h ${db.host} -P ${db.port} -u ${db.user} --single-transaction --quick ${db.database}`)

        exec(cmd, { timeout: 120000 }, (error, stdout, stderr) => {
            if (stderr) {
                logger.warn('mysqldump stderr:', stderr)
            }
            if (error) {
                const errMsg = stderr || error.message
                logger.error('数据库备份失败:', errMsg)
                lastBackupInfo = { time: new Date(), size: null, status: 'failed', error: errMsg }
                // 清理失败的文件
                if (fs.existsSync(filepath)) fs.unlinkSync(filepath)
                reject(new Error(errMsg))
                return
            }

            const stats = fs.statSync(filepath)
            const sizeMB = (stats.size / (1024 * 1024)).toFixed(2)
            logger.info(`数据库备份成功: ${filename} (${sizeMB} MB)`)
            lastBackupInfo = { time: new Date(), size: stats.size, filename, status: 'success', error: null }
            resolve({ filepath, filename, size: stats.size, sizeMB })
        })
    })
}

// 清理过期备份
const cleanOldBackups = async (retentionDays) => {
    if (!fs.existsSync(BACKUP_DIR)) return 0

    const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000
    const files = fs.readdirSync(BACKUP_DIR).filter(f => f.endsWith('.sql'))
    let deleted = 0

    for (const file of files) {
        const filepath = path.join(BACKUP_DIR, file)
        const stat = fs.statSync(filepath)
        if (stat.mtimeMs < cutoff) {
            fs.unlinkSync(filepath)
            deleted++
            logger.info(`已删除过期备份: ${file}`)
        }
    }

    return deleted
}

// 发送备份邮件
const sendBackupEmail = async (backupResult) => {
    try {
        const emailService = require('./emailService')
        const config = await emailService.getEmailConfig()
        const transporter = await emailService.createTransporter()
        const settings = await getBackupSettings()

        if (!transporter || !settings.email) {
            logger.warn('备份邮件发送跳过: 邮件未配置或备份邮箱未设置')
            return false
        }

        const sizeMB = (backupResult.size / (1024 * 1024)).toFixed(2)

        const mailOptions = {
            from: `"${config.senderName || 'HaoDongXi'}" <${config.smtpUser}>`,
            to: settings.email,
            subject: `【数据库备份】${backupResult.filename} (${sizeMB} MB)`,
            html: `
                <div style="font-family: -apple-system, sans-serif; max-width: 580px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
                    <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 30px; text-align: center;">
                        <div style="font-size: 40px; margin-bottom: 8px;">💾</div>
                        <h2 style="color: white; margin: 0; font-size: 22px;">数据库备份完成</h2>
                    </div>
                    <div style="padding: 28px;">
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr><td style="padding: 10px 0; color: #64748b; border-bottom: 1px solid #f1f5f9;">文件名</td><td style="padding: 10px 0; text-align: right; font-weight: 600; color: #1e293b; border-bottom: 1px solid #f1f5f9;">${backupResult.filename}</td></tr>
                            <tr><td style="padding: 10px 0; color: #64748b; border-bottom: 1px solid #f1f5f9;">文件大小</td><td style="padding: 10px 0; text-align: right; font-weight: 600; color: #1e293b; border-bottom: 1px solid #f1f5f9;">${sizeMB} MB</td></tr>
                            <tr><td style="padding: 10px 0; color: #64748b;">备份时间</td><td style="padding: 10px 0; text-align: right; color: #1e293b;">${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}</td></tr>
                        </table>
                    </div>
                    <div style="text-align: center; padding: 20px; background: #f8fafc; border-top: 1px solid #e2e8f0;">
                        <p style="color: #94a3b8; font-size: 12px; margin: 0;">HaoDongXi 自动备份系统</p>
                    </div>
                </div>
            `,
            attachments: backupResult.size < 25 * 1024 * 1024 ? [
                { filename: backupResult.filename, path: backupResult.filepath }
            ] : []
        }

        // 如果文件太大（>25MB），提示不附带附件
        if (backupResult.size >= 25 * 1024 * 1024) {
            mailOptions.html = mailOptions.html.replace('</table>', `
                <tr><td colspan="2" style="padding: 12px 0; color: #f59e0b; font-size: 13px; text-align: center;">⚠️ 备份文件超过 25MB，未附带附件，请到服务器下载</td></tr>
                </table>
            `)
        }

        await transporter.sendMail(mailOptions)
        logger.info(`备份邮件已发送至 ${settings.email}`)
        return true
    } catch (error) {
        logger.error('备份邮件发送失败:', error.message)
        return false
    }
}

// 执行完整备份流程
const runBackup = async () => {
    try {
        const settings = await getBackupSettings()

        // 执行备份
        const result = await performBackup()
        if (!result) return

        // 清理过期备份
        const deleted = await cleanOldBackups(settings.retentionDays)
        if (deleted > 0) {
            logger.info(`已清理 ${deleted} 个过期备份文件`)
        }

        // 定时备份时：邮件开关开启且配置了邮箱才发送
        if (settings.emailEnabled && settings.email) {
            await sendBackupEmail(result)
        }

        return result
    } catch (error) {
        logger.error('备份流程执行失败:', error)
        return null
    }
}

// 按文件名推送备份到邮箱
const sendBackupByFilename = async (filename) => {
    const filepath = path.join(BACKUP_DIR, filename)
    if (!fs.existsSync(filepath)) {
        throw new Error('备份文件不存在')
    }
    const stat = fs.statSync(filepath)
    const result = { filepath, filename, size: stat.size }
    const sent = await sendBackupEmail(result)
    if (!sent) throw new Error('邮件发送失败，请检查邮箱和 SMTP 配置')
    return true
}

// 频率转换为 cron 表达式
const frequencyToCron = (timesPerDay) => {
    switch (timesPerDay) {
        case 24: return '0 * * * *'          // 每小时
        case 12: return '0 */2 * * *'        // 每2小时
        case 6:  return '0 */4 * * *'        // 每4小时
        case 4:  return '0 */6 * * *'        // 每6小时
        case 2:  return '0 0,12 * * *'       // 每12小时
        case 1:
        default: return '0 3 * * *'          // 每天凌晨3点
    }
}

// 启动/重启定时备份
const startBackupSchedule = async () => {
    // 先停止旧的定时任务
    stopBackupSchedule()

    const settings = await getBackupSettings()
    if (!settings.enabled) {
        logger.info('数据库备份未启用')
        return
    }

    const cronExpr = frequencyToCron(settings.frequency)
    backupJob = cron.schedule(cronExpr, async () => {
        logger.info('定时数据库备份开始...')
        await runBackup()
    }, { timezone: 'Asia/Shanghai' })

    logger.info(`✅ 数据库自动备份已启动 (每天 ${settings.frequency} 次, 保留 ${settings.retentionDays} 天)`)
}

// 停止定时备份
const stopBackupSchedule = () => {
    if (backupJob) {
        backupJob.stop()
        backupJob = null
        logger.info('数据库自动备份已停止')
    }
}

// 获取备份状态
const getBackupStatus = () => {
    const files = fs.existsSync(BACKUP_DIR)
        ? fs.readdirSync(BACKUP_DIR)
            .filter(f => f.endsWith('.sql'))
            .map(f => {
                const stat = fs.statSync(path.join(BACKUP_DIR, f))
                return { filename: f, size: stat.size, createdAt: stat.mtime }
            })
            .sort((a, b) => b.createdAt - a.createdAt)
        : []

    return {
        isRunning: backupJob !== null,
        lastBackup: lastBackupInfo,
        backupCount: files.length,
        backups: files.slice(0, 6), // 最近10个
        totalSize: files.reduce((sum, f) => sum + f.size, 0)
    }
}

module.exports = {
    performBackup,
    runBackup,
    startBackupSchedule,
    stopBackupSchedule,
    getBackupStatus,
    getBackupSettings,
    sendBackupByFilename
}

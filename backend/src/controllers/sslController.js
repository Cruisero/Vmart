const { spawn, execSync } = require('child_process')
const path = require('path')
const fs = require('fs')
const os = require('os')
const cloudflareService = require('../services/cloudflareService')

const ACME_SH = process.env.ACME_SH_PATH || path.join(os.homedir(), '.acme.sh', 'acme.sh')
const SSL_DIR = process.env.SSL_DIR || '/etc/nginx/ssl'

const pendingChallenges = new Map()

function checkAcmeInstalled() {
    return fs.existsSync(ACME_SH)
}

// Step 1: 启动 DNS-01 挑战，返回需要添加的 TXT 记录
exports.applyStep1 = async (req, res) => {
    try {
        const { domain } = req.body
        if (!domain || !/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain)) {
            return res.status(400).json({ error: '域名格式不正确' })
        }
        const cleanDomain = domain.trim().toLowerCase().replace(/^https?:\/\//i, '').replace(/\/.*$/, '')

        // 优先使用 Cloudflare 方案
        if (cloudflareService.isConfigured()) {
            // 向 Cloudflare 注册/查询自定义域名
            await cloudflareService.createCustomHostname(cleanDomain)
            const status = await cloudflareService.getCustomHostnameStatus(cleanDomain)

            // 提取 Cloudflare 要求的 TXT 验证记录
            const records = []
            if (status.ownershipValidation && status.ownershipValidation.type === 'txt') {
                records.push({
                    host: status.ownershipValidation.name,
                    value: status.ownershipValidation.value
                })
            }
            if (status.sslValidationRecords && status.sslValidationRecords.length > 0) {
                status.sslValidationRecords.forEach(r => {
                    records.push({
                        host: r.name,
                        value: r.value
                    })
                })
            }

            if (records.length === 0) {
                // 如果域名和 SSL 都已经在 Cloudflare 中完成验证和激活
                if (status.status === 'active' && status.sslStatus === 'active') {
                    return res.json({
                        success: true,
                        domain: cleanDomain,
                        records: [],
                        message: '🎉 该域名所有权及 SSL 证书已在云端成功激活，无需任何额外验证配置！'
                    })
                }
                return res.status(500).json({ error: '无法从 Cloudflare 获取验证记录，请确认该域名没有与其他 Cloudflare 账户冲突。' })
            }

            pendingChallenges.set(cleanDomain, { domain: cleanDomain, records, startedAt: Date.now() })
            return res.json({
                success: true,
                domain: cleanDomain,
                records,
                message: '已成功向云端网关发起域名注册。请在您的 DNS 面板添加以上 TXT 记录，并点击"验证并颁发"来进行状态同步。'
            })
        }

        // 降级兜底方案：本地 acme.sh 脚本运行 (原有逻辑)
        if (!checkAcmeInstalled()) {
            return res.status(500).json({ error: 'acme.sh 未安装，请先在服务器上运行：curl https://get.acme.sh | sh' })
        }

        const args = [ACME_SH, '--issue', '--dns', '--yes-I-know-dns-manual-mode-enough-go-ahead-please', '-d', cleanDomain, '-d', `*.${cleanDomain}`]
        const proc = spawn('sh', args, { stdio: ['ignore', 'pipe', 'pipe'] })
        let stdout = '', stderr = ''
        proc.stdout.on('data', d => stdout += d)
        proc.stderr.on('data', d => stderr += d)

        proc.on('close', () => {
            const combined = stdout + stderr
            const txtMatches = [...combined.matchAll(/Domain:\s*'?(_acme-challenge\.[^'\s]+)'?[\s\S]*?TXT value:\s*'?([^'\s\n]+)'?/g)]
            const records = txtMatches.map(m => ({ host: m[1].trim(), value: m[2].trim() }))

            if (records.length === 0) {
                return res.status(500).json({ error: '无法解析 DNS 验证记录', raw: combined.slice(-2000) })
            }

            pendingChallenges.set(cleanDomain, { domain: cleanDomain, records, startedAt: Date.now() })
            res.json({ success: true, domain: cleanDomain, records, message: '请在 DNS 面板添加以上 TXT 记录，等待约 5 分钟生效后再点击"验证并颁发"' })
        })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

// Step 2: 验证并安装证书（SSE 流式日志）
exports.applyStep2 = async (req, res) => {
    const { domain } = req.body
    if (!domain) return res.status(400).json({ error: '缺少域名' })
    const cleanDomain = domain.trim().toLowerCase()

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.flushHeaders()

    const send = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`)

    // 优先使用 Cloudflare 方案
    if (cloudflareService.isConfigured()) {
        send({ type: 'log', msg: `🔄 开始向 Cloudflare 查询域名 ${cleanDomain} 的最新激活状态...` })

        try {
            const status = await cloudflareService.getCustomHostnameStatus(cleanDomain)
            if (!status.exists) {
                send({ type: 'error', msg: '该域名在 Cloudflare 中不存在，请重新执行 Step 1 注册。' })
                return res.end()
            }

            send({ type: 'log', msg: `📡 域名所有权校验状态: [${status.status}]` })
            send({ type: 'log', msg: `🔒 SSL 证书签发状态: [${status.sslStatus}]` })

            if (status.status === 'active' && status.sslStatus === 'active') {
                send({ type: 'log', msg: '✅ 恭喜！Cloudflare 验证完全通过，SSL 证书已部署就绪。' })
                send({ type: 'done', msg: `🎉 证书申请成功！*.${cleanDomain} 证书已在云端生效，Nginx 兜底层已无需重启。` })
            } else {
                send({ type: 'log', msg: '⏱️ Cloudflare 验证仍在进行中，尚未完全激活。' })
                if (status.status !== 'active') {
                    send({ type: 'log', msg: '👉 请检查您是否正确添加了 TXT 记录，或直接将 CNAME 记录指向回源站。' })
                }
                if (status.sslStatus !== 'active') {
                    send({ type: 'log', msg: '👉 SSL 证书目前正在初始化/签发中，通常需要 2-5 分钟。' })
                }
                send({ type: 'error', msg: '激活尚未完成，请确认 DNS 解析已全球生效，并在几分钟后再次重试。' })
            }
        } catch (err) {
            send({ type: 'error', msg: `请求 Cloudflare API 失败: ${err.message}` })
        }
        return res.end()
    }

    // 降级兜底方案：本地 acme.sh 脚本运行 (原有逻辑)
    send({ type: 'log', msg: `🔄 开始验证域名 ${cleanDomain}...` })

    const args = [ACME_SH, '--renew', '--dns', '--yes-I-know-dns-manual-mode-enough-go-ahead-please', '-d', cleanDomain, '-d', `*.${cleanDomain}`]
    const proc = spawn('sh', args, { stdio: ['ignore', 'pipe', 'pipe'] })
    proc.stdout.on('data', d => send({ type: 'log', msg: d.toString().trim() }))
    proc.stderr.on('data', d => send({ type: 'log', msg: d.toString().trim() }))

    proc.on('close', (code) => {
        if (code !== 0) {
            send({ type: 'error', msg: '验证失败，请检查 DNS TXT 记录是否已生效（可用 dig TXT _acme-challenge.' + cleanDomain + ' 验证）' })
            return res.end()
        }

        send({ type: 'log', msg: '✅ 证书申请成功，正在安装...' })
        try { fs.mkdirSync(SSL_DIR, { recursive: true }) } catch {}

        const certArgs = [ACME_SH, '--install-cert', '-d', cleanDomain, '-d', `*.${cleanDomain}`,
            '--cert-file', path.join(SSL_DIR, `${cleanDomain}.cer`),
            '--key-file', path.join(SSL_DIR, `${cleanDomain}.key`),
            '--fullchain-file', path.join(SSL_DIR, `${cleanDomain}.fullchain.pem`),
            '--reloadcmd', 'nginx -s reload || true']

        const ip = spawn('sh', certArgs, { stdio: ['ignore', 'pipe', 'pipe'] })
        ip.stdout.on('data', d => send({ type: 'log', msg: d.toString().trim() }))
        ip.stderr.on('data', d => send({ type: 'log', msg: d.toString().trim() }))
        ip.on('close', (ic) => {
            pendingChallenges.delete(cleanDomain)
            if (ic === 0) send({ type: 'done', msg: `🎉 证书安装成功！*.${cleanDomain} 泛域名证书已生效，nginx 已重载。` })
            else send({ type: 'error', msg: '证书申请成功，但安装失败，请手动执行 acme.sh --install-cert 命令。' })
            res.end()
        })
    })
}

// 查询证书状态
exports.getStatus = async (req, res) => {
    const { domain } = req.query
    if (!domain) return res.status(400).json({ error: '缺少域名' })
    const cleanDomain = domain.trim().toLowerCase()

    // 优先使用 Cloudflare 方案
    if (cloudflareService.isConfigured()) {
        try {
            const status = await cloudflareService.getCustomHostnameStatus(cleanDomain)
            if (!status.exists) {
                return res.json({
                    domain: cleanDomain,
                    hasCert: false,
                    hasKey: false,
                    expireDate: null,
                    cloudflareStatus: 'none',
                    acmeInstalled: true // 跳过前端 acme.sh 缺失警告
                })
            }

            const active = status.status === 'active' && status.sslStatus === 'active'
            return res.json({
                domain: cleanDomain,
                hasCert: active,
                hasKey: active,
                expireDate: active ? 'Cloudflare 自动签发托管 (无需手动维护)' : '等待 DNS 记录验证及 SSL 证书签发部署',
                cloudflareStatus: status.status,
                sslStatus: status.sslStatus,
                acmeInstalled: true
            })
        } catch (err) {
            return res.status(500).json({ error: err.message })
        }
    }

    // 降级兜底方案：本地文件查询 (原有逻辑)
    const certPath = path.join(SSL_DIR, `${cleanDomain}.fullchain.pem`)
    const keyPath = path.join(SSL_DIR, `${cleanDomain}.key`)
    const hasCert = fs.existsSync(certPath)
    const hasKey = fs.existsSync(keyPath)

    let expireDate = null
    if (hasCert) {
        try {
            const result = execSync(`openssl x509 -noout -enddate -in "${certPath}" 2>/dev/null`).toString()
            const match = result.match(/notAfter=(.+)/)
            if (match) expireDate = match[1].trim()
        } catch {}
    }

    res.json({ domain: cleanDomain, hasCert, hasKey, expireDate, acmeInstalled: checkAcmeInstalled() })
}

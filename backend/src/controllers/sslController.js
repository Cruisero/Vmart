const { spawn, execSync } = require('child_process')
const path = require('path')
const fs = require('fs')
const os = require('os')

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
            '--fullchain-file', path.join(SSL_DIR, 'fullchain.pem'),
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

    const certPath = path.join(SSL_DIR, 'fullchain.pem')
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

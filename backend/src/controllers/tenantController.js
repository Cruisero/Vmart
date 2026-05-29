const prisma = require('../config/database')
const dns = require('dns').promises
const { execSync } = require('child_process')
const cloudflareService = require('../services/cloudflareService')

// 获取当前用户的租户信息
exports.getMe = async (req, res) => {
    try {
        const tenant = await prisma.tenant.findUnique({
            where: { userId: req.user.id },
            include: { domains: true, settings: true }
        })
        if (tenant) {
            const shop = await prisma.shop.findUnique({
                where: { slug: tenant.shopSlug }
            })
            tenant.shop = shop
        }
        res.json({ tenant })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

// 创建或更新租户基本信息
exports.setup = async (req, res) => {
    try {
        const { shopName, shopSlug, shopSkin, shopNotice, shopLogo, contactEmail, contactInfo, favicon, bookmarkTitle, seoDescription, seoKeywords } = req.body

        if (!shopName || !shopSlug) {
            return res.status(400).json({ error: '店铺名称和路径不能为空' })
        }
        if (!/^[a-z0-9-]{3,30}$/.test(shopSlug)) {
            return res.status(400).json({ error: 'slug 只能包含小写字母、数字、连字符，长度 3-30' })
        }

        // 检查 slug 是否被其他租户占用
        const existing = await prisma.tenant.findFirst({
            where: { shopSlug, NOT: { userId: req.user.id } }
        })
        if (existing) return res.status(409).json({ error: '该路径已被占用，请换一个' })

        // 校验定制主题授权
        if (shopSkin && shopSkin.startsWith('custom:')) {
            const currentTenant = await prisma.tenant.findUnique({ where: { userId: req.user.id }, select: { id: true } })
            if (currentTenant) {
                const { canUseSkin } = require('./customThemeController')
                const ok = await canUseSkin(currentTenant.id, shopSkin)
                if (!ok) return res.status(403).json({ error: '该定制主题未授权给当前商户' })
            }
        }

        const tenant = await prisma.tenant.upsert({
            where: { userId: req.user.id },
            create: {
                userId: req.user.id,
                shopName, shopSlug, shopSkin: shopSkin || 'zen',
                shopNotice, shopLogo, contactEmail, contactInfo,
                status: 'PENDING'
            },
            update: { shopName, shopSkin, shopNotice, shopLogo, contactEmail, contactInfo },
            include: { domains: true, settings: true }
        })

        // 初始化 TenantSetting（如不存在）
        if (!tenant.settings) {
            await prisma.tenantSetting.create({ data: { tenantId: tenant.id } })
        }

        // 同步更新与其绑定的平台 Shop 表记录
        let updatedShop = null
        if (tenant.shopSlug) {
            const shop = await prisma.shop.findUnique({
                where: { slug: tenant.shopSlug }
            })
            if (shop) {
                let settings = {}
                if (shop.settings) {
                    try {
                        settings = JSON.parse(shop.settings)
                    } catch (e) {}
                }
                if (favicon !== undefined) {
                    settings.favicon = favicon
                }
                if (bookmarkTitle !== undefined) {
                    settings.bookmarkTitle = bookmarkTitle
                }
                if (seoDescription !== undefined) {
                    settings.seoDescription = seoDescription
                }
                if (seoKeywords !== undefined) {
                    settings.seoKeywords = seoKeywords
                }

                updatedShop = await prisma.shop.update({
                    where: { id: shop.id },
                    data: {
                        name: shopName,
                        skin: shopSkin || shop.skin,
                        logo: shopLogo !== undefined ? shopLogo : shop.logo,
                        notice: shopNotice !== undefined ? shopNotice : shop.notice,
                        settings: JSON.stringify(settings)
                    }
                })
            }
        }

        if (updatedShop) {
            tenant.shop = updatedShop
        } else {
            const shop = await prisma.shop.findUnique({
                where: { slug: tenant.shopSlug }
            })
            if (shop) {
                tenant.shop = shop
            }
        }

        res.json({ tenant })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

// 添加域名
exports.addDomain = async (req, res) => {
    try {
        const { domain } = req.body
        if (!domain || !/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain)) {
            return res.status(400).json({ error: '域名格式不正确' })
        }

        const tenant = await prisma.tenant.findUnique({ where: { userId: req.user.id } })
        if (!tenant) return res.status(404).json({ error: '请先完成基本信息配置' })

        // 校验：套餐是否允许自定义域名
        try {
            const shop = await prisma.shop.findUnique({ where: { slug: tenant.shopSlug } })
            if (shop) {
                // 免费试用与专业版同权限：FREE 视同 PRO 读功能配置
                const effectivePlanKey = shop.plan === 'FREE' ? 'PRO' : shop.plan
                const setting = await prisma.platformSetting.findUnique({ where: { key: 'plan_config' } })
                if (setting?.value) {
                    const cfg = JSON.parse(setting.value)
                    const plan = (cfg.plans || []).find(p => p.key === effectivePlanKey)
                    if (plan && plan.features?.customDomain !== true) {
                        return res.status(403).json({ error: '当前套餐不支持自定义域名，请升级套餐' })
                    }
                }
            }
        } catch (e) { /* 不阻塞，但若 plan_config 读取失败仍允许 */ }

        // 检查是否被其他租户占用
        const existing = await prisma.tenantDomain.findUnique({ where: { domain } })
        if (existing && existing.tenantId !== tenant.id) {
            return res.status(409).json({ error: '该域名已被其他商城使用' })
        }

        const record = await prisma.tenantDomain.upsert({
            where: { domain },
            create: { tenantId: tenant.id, domain, isPrimary: true },
            update: {}
        })

        // 判断 Cloudflare 服务是否已配置
        if (cloudflareService.isConfigured()) {
            try {
                // 向 Cloudflare 注册自定义域名
                await cloudflareService.createCustomHostname(domain)
            } catch (cfErr) {
                console.error('注册 Cloudflare 自定义域名失败:', cfErr)
                // 即使 Cloudflare API 报错，我们也允许在数据库先建立记录，但在 DNS 指南中友好提示
            }

            // 智能提取主机记录 (例如: shop.abc.com -> shop; abc.com -> @)
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

            const computedHost = getHostRecord(domain)
            const fallbackOrigin = cloudflareService.FALLBACK_ORIGIN
            return res.json({
                domain: record,
                dnsGuide: {
                    type: 'CNAME',
                    host: computedHost,
                    value: fallbackOrigin,
                    ttl: 'Auto 或 600',
                    tip: `请在您的 DNS 服务商（如 Cloudflare / 腾讯云 / 阿里云）将主机记录为「 ${computedHost} 」的 CNAME 记录指向 ${fallbackOrigin}。如果您也使用 Cloudflare 作为解析商，强烈建议您【开启代理状态（即橙色云朵 ☁️）】并将 TTL 设为【Auto】以获得最佳的边缘网络和防护体验。`
                }
            })
        }

        // 降级兜底方案：获取服务器 IP 供用户配置 DNS (原有逻辑)
        let serverIp = process.env.SERVER_IP || '待配置'

        res.json({
            domain: record,
            dnsGuide: {
                type: 'A',
                host: '@',
                value: serverIp,
                ttl: 600,
                tip: `请在您的 DNS 服务商（如 Cloudflare）将 ${domain} 的 A 记录指向 ${serverIp}`
            }
        })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

// 验证 DNS 是否生效
exports.verifyDns = async (req, res) => {
    try {
        const { domain } = req.body
        const tenant = await prisma.tenant.findUnique({ where: { userId: req.user.id } })
        if (!tenant) return res.status(404).json({ error: '租户不存在' })

        const domainRecord = await prisma.tenantDomain.findFirst({
            where: { domain, tenantId: tenant.id }
        })
        if (!domainRecord) return res.status(404).json({ error: '域名未添加' })

        // 如果配置了 Cloudflare，通过 Cloudflare 接口验证域名状态与 SSL 状态
        if (cloudflareService.isConfigured()) {
            const status = await cloudflareService.getCustomHostnameStatus(domain)

            if (!status.exists) {
                // 如果在 CF 中不存在（可能被误删），重新尝试创建
                await cloudflareService.createCustomHostname(domain)
                return res.json({
                    verified: false,
                    message: '正在向域名接入网关重新发起注册，请在 10 秒后重新尝试验证。'
                })
            }

            const dnsVerified = status.status === 'active'
            const sslIssued = status.sslStatus === 'active'
            const verified = dnsVerified && sslIssued

            // 只要有状态变更，就同步数据库
            if (domainRecord.dnsVerified !== dnsVerified || domainRecord.sslIssued !== sslIssued) {
                await prisma.tenantDomain.update({
                    where: { id: domainRecord.id },
                    data: {
                        dnsVerified: dnsVerified,
                        sslIssued: sslIssued,
                        verifiedAt: dnsVerified ? new Date() : domainRecord.verifiedAt
                    }
                })
            }

            // 同步绑定状态到主站 Shop 记录，使平台超管能正确看到和搜索
            if (tenant.shopSlug) {
                if (dnsVerified) {
                    await prisma.shop.update({
                        where: { slug: tenant.shopSlug },
                        data: { customDomain: domain }
                    })
                } else {
                    const shop = await prisma.shop.findUnique({ where: { slug: tenant.shopSlug } })
                    if (shop && shop.customDomain === domain) {
                        await prisma.shop.update({
                            where: { slug: tenant.shopSlug },
                            data: { customDomain: null }
                        })
                    }
                }
            }

            let msg = ''
            if (verified) {
                msg = '🎉 域名解析及 SSL 安全证书已完全生效！您的商城已支持安全访问。'
            } else if (!dnsVerified) {
                msg = `⏱️ 域名解析尚未生效。Cloudflare 正在等待您的 DNS 记录指向 ${cloudflareService.FALLBACK_ORIGIN}。若您刚刚修改了解析，可能需要 5-10 分钟生效。`
            } else {
                msg = `🔄 域名所有权已通过验证，但 SSL 证书正在签发部署中（当前状态: ${status.sslStatus}）。通常需要 2-5 分钟，请稍后刷新重试。`
            }

            return res.json({
                verified,
                cloudflareStatus: {
                    status: status.status,
                    sslStatus: status.sslStatus,
                    ownershipValidation: status.ownershipValidation,
                    sslValidationRecords: status.sslValidationRecords
                },
                message: msg
            })
        }

        // 降级兜底方案：本地 DNS 检查 (原有逻辑)
        const serverIp = process.env.SERVER_IP
        if (!serverIp) return res.status(500).json({ error: '服务器未配置 SERVER_IP 环境变量' })

        let resolved = []
        try {
            resolved = await dns.resolve4(domain)
        } catch {
            return res.json({ verified: false, message: 'DNS 解析失败，请确认已添加 A 记录并等待生效（约 5-10 分钟）' })
        }

        const verified = resolved.includes(serverIp)
        if (verified) {
            await prisma.tenantDomain.update({
                where: { id: domainRecord.id },
                data: { dnsVerified: true, verifiedAt: new Date() }
            })

            // 同步绑定状态到主站 Shop 记录
            if (tenant.shopSlug) {
                await prisma.shop.update({
                    where: { slug: tenant.shopSlug },
                    data: { customDomain: domain }
                })
            }
        }

        res.json({
            verified,
            resolved,
            serverIp,
            message: verified
                ? 'DNS 验证成功！可以继续申请 SSL 证书'
                : `DNS 尚未生效。检测到 ${domain} 指向 ${resolved.join(', ')}，期望 ${serverIp}`
        })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

// 删除域名
exports.deleteDomain = async (req, res) => {
    try {
        const { domain } = req.body
        if (!domain) {
            return res.status(400).json({ error: '缺少域名参数' })
        }

        const tenant = await prisma.tenant.findUnique({ where: { userId: req.user.id } })
        if (!tenant) return res.status(404).json({ error: '租户不存在' })

        const domainRecord = await prisma.tenantDomain.findFirst({
            where: { domain, tenantId: tenant.id }
        })
        if (!domainRecord) return res.status(404).json({ error: '域名记录不存在或不属于该商户' })

        // 如果配置了 Cloudflare，尝试从 Cloudflare 删除该自定义域名映射
        if (cloudflareService.isConfigured()) {
            try {
                await cloudflareService.deleteCustomHostname(domain)
            } catch (cfErr) {
                console.error('从 Cloudflare 删除自定义域名失败 (继续删除本地记录):', cfErr)
            }
        }

        // 从数据库删除域名记录
        await prisma.tenantDomain.delete({
            where: { id: domainRecord.id }
        })

        // 从主站 Shop 记录中清除已解绑的域名
        if (tenant.shopSlug) {
            const shop = await prisma.shop.findUnique({ where: { slug: tenant.shopSlug } })
            if (shop && shop.customDomain === domain) {
                await prisma.shop.update({
                    where: { slug: tenant.shopSlug },
                    data: { customDomain: null }
                })
            }
        }

        res.json({ success: true, message: '域名已成功解绑和删除' })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

// 提交审核
exports.submitReview = async (req, res) => {
    try {
        const tenant = await prisma.tenant.findUnique({
            where: { userId: req.user.id },
            include: { domains: true }
        })
        if (!tenant) return res.status(404).json({ error: '请先完成基本信息配置' })
        if (tenant.status === 'REVIEWING') return res.status(400).json({ error: '已提交审核，请耐心等待' })
        if (tenant.status === 'ACTIVE') return res.status(400).json({ error: '商城已开通' })

        const verifiedDomain = tenant.domains.find(d => d.dnsVerified)
        if (!verifiedDomain) {
            return res.status(400).json({ error: '请先添加并验证至少一个域名' })
        }
        if (!tenant.shopName) {
            return res.status(400).json({ error: '请先填写店铺名称' })
        }

        await prisma.tenant.update({
            where: { id: tenant.id },
            data: { status: 'REVIEWING' }
        })

        res.json({ message: '审核申请已提交，我们将在 1-3 个工作日内完成审核并发送邮件通知' })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

// 获取租户设置
exports.getSettings = async (req, res) => {
    try {
        if (req.user?.role === 'ADMIN') {
            return res.status(403).json({ error: '需要管理员权限' })
        }
        const tenant = await prisma.tenant.findUnique({ where: { userId: req.user.id } })
        if (!tenant) return res.status(404).json({ error: '租户不存在' })

        const settings = await prisma.tenantSetting.findUnique({ where: { tenantId: tenant.id } })
        res.json({ settings })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

// 更新租户设置
exports.updateSettings = async (req, res) => {
    try {
        if (req.user?.role === 'ADMIN') {
            return res.status(403).json({ error: '需要管理员权限' })
        }
        const tenant = await prisma.tenant.findUnique({ where: { userId: req.user.id } })
        if (!tenant) return res.status(404).json({ error: '租户不存在' })

        const {
            alipayEnabled, wechatEnabled, usdtEnabled, bscUsdtEnabled,
            paymentConfig, notificationEnabled, notificationText, notificationLink
        } = req.body

        let config = {}
        if (paymentConfig) {
            try {
                config = typeof paymentConfig === 'string' ? JSON.parse(paymentConfig) : paymentConfig
            } catch (e) {
                return res.status(400).json({ error: '支付配置格式不正确，必须是合法的 JSON' })
            }
        }

        // 支付宝配置强校验 (仅对所有者做，或者如果非子管理员且启用了支付宝，且并非平台代收模式)
        const isSubAdmin = req.user?.role === 'ADMIN'
        if (!isSubAdmin && alipayEnabled && config.alipay_mode !== 'platform') {
            const appId = config.alipay_app_id || ''
            const privateKey = config.alipay_private_key || ''
            const publicKey = config.alipay_public_key || ''

            if (!appId) {
                return res.status(400).json({ error: '启用支付宝时，应用 ID (AppID) 不能为空' })
            }
            if (!privateKey) {
                return res.status(400).json({ error: '启用支付宝时，应用私钥 (Private Key) 不能为空' })
            }
            if (!publicKey) {
                return res.status(400).json({ error: '启用支付宝时，支付宝公钥 (Public Key) 不能为空' })
            }

            const crypto = require('crypto')

            // 1. 校验私钥
            const privateKeyCleaned = privateKey.replace(/-----BEGIN[A-Z\s]+-----|-----END[A-Z\s]+-----|\s/g, '')
            if (privateKeyCleaned.startsWith('MIIBIjANBgkqhkiG9w0BAQ')) {
                return res.status(400).json({ error: '保存失败：您填入的【应用私钥】似乎是公钥（公钥通常以 MIIBIj 开头，长度较短）。请重新复制您的 PKCS8 格式应用私钥。' })
            }
            if (privateKeyCleaned.length < 1000) {
                return res.status(400).json({ error: '保存失败：您填入的【应用私钥】长度不足，合法的 RSA2 私钥长度通常为 1600+ 字符。请检查复制是否完整，或是否误填了公钥。' })
            }

            try {
                let pem = privateKey.trim()
                if (!pem.includes('BEGIN PRIVATE KEY') && !pem.includes('BEGIN RSA PRIVATE KEY')) {
                    pem = `-----BEGIN PRIVATE KEY-----\n${pem}\n-----END PRIVATE KEY-----`
                }
                crypto.createPrivateKey(pem)
            } catch (err) {
                return res.status(400).json({ error: `保存失败：【应用私钥】格式无法被解析（报错: ${err.message}）。请确认填写的是 PKCS8 格式的应用私钥，且头部带有 BEGIN PRIVATE KEY 标识或复制了完整文本。` })
            }

            // 2. 校验公钥
            const publicKeyCleaned = publicKey.replace(/-----BEGIN[A-Z\s]+-----|-----END[A-Z\s]+-----|\s/g, '')
            if (publicKeyCleaned.length > 1000) {
                return res.status(400).json({ error: '保存失败：您填入的【支付宝公钥】长度过长，这通常是私钥的长度。请检查是否误填了私钥。' })
            }

            try {
                let pem = publicKey.trim()
                if (!pem.includes('BEGIN PUBLIC KEY')) {
                    pem = `-----BEGIN PUBLIC KEY-----\n${pem}\n-----END PUBLIC KEY-----`
                }
                crypto.createPublicKey(pem)
            } catch (err) {
                return res.status(400).json({ error: `保存失败：【支付宝公钥】格式无法被解析（报错: ${err.message}）。请确认是支付宝开放平台生成的【支付宝公钥】（而非商户自己生成的应用公钥）。` })
            }
        }

        const settings = await prisma.tenantSetting.upsert({
            where: { tenantId: tenant.id },
            create: {
                tenantId: tenant.id,
                alipayEnabled: !!alipayEnabled,
                wechatEnabled: !!wechatEnabled,
                usdtEnabled: !!usdtEnabled,
                bscUsdtEnabled: !!bscUsdtEnabled,
                paymentConfig: typeof paymentConfig === 'string' ? paymentConfig : (paymentConfig ? JSON.stringify(paymentConfig) : null),
                notificationEnabled: !!notificationEnabled,
                notificationText,
                notificationLink
            },
            update: {
                alipayEnabled: !!alipayEnabled,
                wechatEnabled: !!wechatEnabled,
                usdtEnabled: !!usdtEnabled,
                bscUsdtEnabled: !!bscUsdtEnabled,
                paymentConfig: typeof paymentConfig === 'string' ? paymentConfig : (paymentConfig ? JSON.stringify(paymentConfig) : null),
                notificationEnabled: !!notificationEnabled,
                notificationText,
                notificationLink
            }
        })

        res.json({ settings, message: '设置已保存' })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

// ===== 租户商品管理 =====

exports.getProducts = async (req, res) => {
    try {
        const tenant = await prisma.tenant.findUnique({ where: { userId: req.user.id } })
        if (!tenant) return res.status(404).json({ error: '租户不存在' })

        const products = await prisma.product.findMany({
            where: { tenantId: tenant.id },
            include: { category: true, variants: true, _count: { select: { cards: { where: { status: 'AVAILABLE' } } } } },
            orderBy: [{ status: 'asc' }, { weight: 'desc' }, { createdAt: 'desc' }]
        })
        res.json({ products })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

exports.createProduct = async (req, res) => {
    try {
        const tenant = await prisma.tenant.findUnique({ where: { userId: req.user.id } })
        if (!tenant) return res.status(404).json({ error: '租户不存在' })
        if (tenant.status !== 'ACTIVE') return res.status(403).json({ error: '商城未开通，无法添加商品' })

        const { name, description, price, image, images, tags, deliveryNote } = req.body
        if (!name || !price) return res.status(400).json({ error: '商品名称和价格不能为空' })

        const product = await prisma.product.create({
            data: {
                name, description,
                price: parseFloat(price),
                image, images: images || [],
                tags: tags || [],
                deliveryNote,
                tenantId: tenant.id,
                status: 'ACTIVE'
            }
        })
        res.json({ product })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

exports.updateProduct = async (req, res) => {
    try {
        const { id } = req.params
        const tenant = await prisma.tenant.findUnique({ where: { userId: req.user.id } })
        if (!tenant) return res.status(404).json({ error: '租户不存在' })

        const product = await prisma.product.findFirst({ where: { id, tenantId: tenant.id } })
        if (!product) return res.status(404).json({ error: '商品不存在' })

        const { name, description, price, image, images, tags, deliveryNote, status } = req.body
        const updated = await prisma.product.update({
            where: { id },
            data: { name, description, price: price ? parseFloat(price) : undefined, image, images, tags, deliveryNote, status }
        })
        res.json({ product: updated })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

exports.deleteProduct = async (req, res) => {
    try {
        const { id } = req.params
        const tenant = await prisma.tenant.findUnique({ where: { userId: req.user.id } })
        if (!tenant) return res.status(404).json({ error: '租户不存在' })

        await prisma.product.deleteMany({ where: { id, tenantId: tenant.id } })
        res.json({ message: '商品已删除' })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

// 批量上传卡密
exports.uploadCards = async (req, res) => {
    try {
        const { productId, cards } = req.body
        if (!productId || !Array.isArray(cards) || cards.length === 0) {
            return res.status(400).json({ error: '参数不完整' })
        }
        const tenant = await prisma.tenant.findUnique({ where: { userId: req.user.id } })
        if (!tenant) return res.status(404).json({ error: '租户不存在' })

        const product = await prisma.product.findFirst({ where: { id: productId, tenantId: tenant.id } })
        if (!product) return res.status(404).json({ error: '商品不存在' })

        const data = cards
            .map(c => (typeof c === 'string' ? c.trim() : ''))
            .filter(c => c.length > 0)
            .map(content => ({ productId, content, tenantId: tenant.id }))

        await prisma.card.createMany({ data, skipDuplicates: true })
        await prisma.product.update({ where: { id: productId }, data: { stock: { increment: data.length } } })

        res.json({ message: `成功上传 ${data.length} 张卡密`, count: data.length })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

// 获取租户订单
exports.getOrders = async (req, res) => {
    try {
        const tenant = await prisma.tenant.findUnique({ where: { userId: req.user.id } })
        if (!tenant) return res.status(404).json({ error: '租户不存在' })

        const { page = 1, limit = 20, status } = req.query
        const where = { tenantId: tenant.id }
        if (status) where.status = status

        const [orders, total] = await Promise.all([
            prisma.order.findMany({
                where, include: { product: true, cards: true },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: Number(limit)
            }),
            prisma.order.count({ where })
        ])

        res.json({ orders, total, page: Number(page), limit: Number(limit) })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

// 租户统计
exports.getStats = async (req, res) => {
    try {
        const tenant = await prisma.tenant.findUnique({ where: { userId: req.user.id } })
        if (!tenant) return res.status(404).json({ error: '租户不存在' })

        const today = new Date(); today.setHours(0, 0, 0, 0)

        const [totalOrders, todayOrders, totalRevenue, productCount, cardCount] = await Promise.all([
            prisma.order.count({ where: { tenantId: tenant.id, status: 'COMPLETED' } }),
            prisma.order.count({ where: { tenantId: tenant.id, createdAt: { gte: today } } }),
            prisma.order.aggregate({ where: { tenantId: tenant.id, status: 'COMPLETED' }, _sum: { totalAmount: true } }),
            prisma.product.count({ where: { tenantId: tenant.id, status: 'ACTIVE' } }),
            prisma.card.count({ where: { tenantId: tenant.id, status: 'AVAILABLE' } })
        ])

        res.json({
            stats: {
                totalOrders, todayOrders, productCount, cardCount,
                totalRevenue: Number(totalRevenue._sum.totalAmount || 0)
            }
        })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    console.log('\x1b[36m%s\x1b[0m', '==================================================')
    console.log('\x1b[36m%s\x1b[0m', '          VMart 支付宝当面付生产环境诊断脚本          ')
    console.log('\x1b[36m%s\x1b[0m', '==================================================')
    console.log('正在生产数据库中检索商店 [ 88hao.shop ] ...')

    // 1. 查询租户域名表
    const domainRecord = await prisma.tenantDomain.findUnique({
        where: { domain: '88hao.shop' },
        include: {
            tenant: {
                include: {
                    settings: true
                }
            }
        }
    })

    // 2. 查询主站店铺表
    const shopRecord = await prisma.shop.findFirst({
        where: {
            OR: [
                { customDomain: '88hao.shop' },
                { slug: '88hao' },
                { slug: '88hao.shop' }
            ]
        },
        include: {
            merchant: {
                include: {
                    shop: true
                }
            }
        }
    })

    let configJson = null
    let shopName = ''
    let shopSlug = ''

    if (domainRecord) {
        const tenant = domainRecord.tenant
        shopName = tenant.shopName
        shopSlug = tenant.shopSlug
        configJson = tenant.settings?.paymentConfig
        console.log(`\n\x1b[32m✔ [租户模式] 成功找到该域名的租户记录:\x1b[0m`)
        console.log(`  - 租户名称: ${shopName}`)
        console.log(`  - 租户标识(Slug): ${shopSlug}`)
        console.log(`  - 支付宝启用状态: ${tenant.settings?.alipayEnabled}`)
    } else if (shopRecord) {
        shopName = shopRecord.name
        shopSlug = shopRecord.slug
        configJson = shopRecord.settings
        console.log(`\n\x1b[32m✔ [主站店铺模式] 成功找到关联的店铺记录:\x1b[0m`)
        console.log(`  - 店铺名称: ${shopName}`)
        console.log(`  - 店铺标识(Slug): ${shopSlug}`)
        console.log(`  - 店铺状态: ${shopRecord.status}`)
    } else {
        console.log('\n\x1b[31m❌ 错误：在当前数据库中未找到任何与 [ 88hao.shop ] 关联的域名或店铺记录。\x1b[0m')
        console.log('这可能意味着：')
        console.log('  1. 域名拼写有误，或者尚未在商户后台绑定此域名。')
        console.log('  2. 您正在开发/测试数据库上运行此脚本，而该商店只存在于您的生产服务器数据库中。')
        
        // 列出库中现存的所有域名协助排查
        const allDomains = await prisma.tenantDomain.findMany()
        if (allDomains.length > 0) {
            console.log('\n当前库中存在的域名有：')
            allDomains.forEach(d => console.log(`  - ${d.domain}`))
        }
        return
    }

    if (!configJson) {
        console.log('\n\x1b[31m❌ 错误：该商店的支付配置文件完全为空，尚未保存过配置。\x1b[0m')
        return
    }

    try {
        const config = JSON.parse(configJson)
        // 兼容不同版本的配置结构
        const appId = config.alipay_app_id || config.alipayAppId
        const privateKey = config.alipay_private_key || config.alipayPrivateKey
        const publicKey = config.alipay_public_key || config.alipayPublicKey

        console.log('\n\x1b[36m--- 支付宝参数完整度与格式审计 ---\x1b[0m')
        
        // 1. AppID 审计
        if (appId) {
            console.log(`[AppID]: \x1b[32m已配置 (${appId})\x1b[0m`)
            if (!/^\d{16}$/.test(appId.trim()) && !/^\d{32}$/.test(appId.trim())) {
                console.log(`  \x1b[33m⚠️ 警告：AppID 格式可能不正确，通常应为 16 位或 32 位数字！\x1b[0m`)
            }
        } else {
            console.log('[AppID]: \x1b[31m未配置 ❌\x1b[0m')
        }

        // 2. 应用私钥审计
        if (privateKey) {
            const cleanKey = privateKey.trim()
            const lines = cleanKey.split(/[\r\n]+/).map(l => l.trim()).filter(Boolean)
            console.log(`[应用私钥]: \x1b[32m已配置 (长度: ${cleanKey.length} 字符, 行数: ${lines.length})\x1b[0m`)
            console.log(`  - 首行内容: "${lines[0]}"`)
            console.log(`  - 末行内容: "${lines[lines.length - 1]}"`)

            if (cleanKey.includes('RSA PRIVATE KEY')) {
                console.log('\n  \x1b[31m[🚨 致命错误]: 检测到私钥首行为 "-----BEGIN RSA PRIVATE KEY-----"！\x1b[0m')
                console.log('  原因分析: 这是 PKCS1 格式的私钥。支付宝标准官方 Node.js SDK 要求必须使用 \x1b[36mPKCS8\x1b[0m 格式！')
                console.log('  修复方法: 请使用支付宝密钥生成工具将私钥格式转换为 \x1b[32mPKCS8 (非加密)\x1b[0m，')
                console.log('           转换后的 PKCS8 私钥首行应为 \x1b[32m"-----BEGIN PRIVATE KEY-----"\x1b[0m (没有 RSA 字样)。')
            } else if (!cleanKey.includes('PRIVATE KEY')) {
                console.log('  \x1b[33m⚠️ 警告：您的私钥中缺少标准证书标记头尾 "-----BEGIN PRIVATE KEY-----"！\x1b[0m')
                console.log('  有些版本的 SDK 要求必须带有头尾证书标头，建议在填写时保持完整。')
            }
        } else {
            console.log('[应用私钥]: \x1b[31m未配置 ❌\x1b[0m')
        }

        // 3. 支付宝公钥审计
        if (publicKey) {
            const cleanPubKey = publicKey.trim()
            console.log(`[支付宝公钥]: \x1b[32m已配置 (长度: ${cleanPubKey.length} 字符)\x1b[0m`)
            
            if (cleanPubKey.includes('PRIVATE KEY')) {
                console.log('  \x1b[31m[🚨 严重错误]: 支付宝公钥输入框中似乎误填了您的“私钥”！请检查复制内容！\x1b[0m')
            }

            const keyBody = cleanPubKey.replace(/-----BEGIN PUBLIC KEY-----|-----END PUBLIC KEY-----|\s/g, '')
            console.log(`  - 公钥缩略码: ${keyBody.substring(0, 15)}...${keyBody.substring(keyBody.length - 15)}`)
            
            console.log('\n  \x1b[33m💡 配置自查指南（极度重要）：\x1b[0m')
            console.log('  请务必核对上面的公钥缩略码，确保它代表的是 \x1b[36m"支付宝公钥" (Alipay Public Key)\x1b[0m，而\x1b[31m绝不能是您自签的 "应用公钥" (Application Public Key)\x1b[0m。')
            console.log('  - 应用公钥: 是您在自己电脑的密钥生成工具上生成的，需要上传到支付宝平台。')
            console.log('  - 支付宝公钥: 是您上传完应用公钥后，\x1b[32m支付宝控制台自动生成并展示给您的那个公钥\x1b[0m。商户后台必须填写支付宝生成的这个公钥。')

        } else {
            console.log('[支付宝公钥]: \x1b[31m未配置 ❌\x1b[0m')
        }

        // 4. 最近的订单检索
        console.log('\n\x1b[36m--- 正在检索该商店最近 5 个支付宝付款订单以协助诊断 ---\x1b[0m')
        const orders = await prisma.order.findMany({
            where: {
                tenantId: domainRecord ? domainRecord.tenantId : undefined,
                paymentMethod: 'alipay'
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: 5,
            include: {
                payment: true
            }
        })

        if (orders.length === 0) {
            console.log('没有查到该商店在本地数据库中的支付宝订单。')
        } else {
            orders.forEach(o => {
                console.log(`\n  - 订单号: ${o.orderNo}`)
                console.log(`    创建时间: ${o.createdAt}`)
                console.log(`    金额: ${o.totalAmount} CNY`)
                console.log(`    订单状态: ${o.status}`)
                console.log(`    支付状态: ${o.payment?.status || 'PENDING'}`)
            })
        }

    } catch (e) {
        console.log(`❌ 解析 paymentConfig 失败: ${e.message}`)
    }
    console.log('\n\x1b[36m%s\x1b[0m', '==================================================')
}

main().catch(console.error).finally(() => prisma.$disconnect())

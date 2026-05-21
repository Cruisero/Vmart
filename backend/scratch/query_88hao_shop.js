const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    console.log('--- 正在深度查询 88hao.shop 商店配置 (租户与主站商店表) ---')

    // 1. 查询 TenantDomain (租户侧)
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

    // 2. 查询 Shop (主站商店侧)
    const shopRecord = await prisma.shop.findFirst({
        where: {
            OR: [
                { customDomain: '88hao.shop' },
                { slug: '88hao' },
                { slug: '88hao-shop' },
                { slug: '88hao.shop' },
                { name: { contains: '88hao' } }
            ]
        },
        include: {
            merchant: true
        }
    })

    if (domainRecord) {
        const tenant = domainRecord.tenant
        console.log(`\n[租户模式] 找到自定义域名绑定的租户: ${tenant.shopName} (${tenant.shopSlug})`)
        logTenantSettings(tenant.settings)
    }

    if (shopRecord) {
        console.log(`\n[主站商户模式] 找到匹配的商户店铺:`)
        console.log(`  - 店铺名称: ${shopRecord.name}`)
        console.log(`  - 标识(Slug): ${shopRecord.slug}`)
        console.log(`  - 自定义域名: ${shopRecord.customDomain || '无'}`)
        console.log(`  - 套餐计划: ${shopRecord.plan}`)
        console.log(`  - 状态: ${shopRecord.status}`)
        console.log(`  - 关联商家邮箱: ${shopRecord.merchant?.email}`)
        
        logShopSettings(shopRecord.settings)
    }

    if (!domainRecord && !shopRecord) {
        console.log('❌ 未在 TenantDomain 或 Shop 中找到任何与 88hao.shop 关联的记录！')
        
        // 列出所有有自定义域名的主站 Shop
        const allShops = await prisma.shop.findMany({
            where: { customDomain: { not: null } }
        })
        console.log('\n当前系统中绑定的所有主站自定义域名：')
        if (allShops.length === 0) {
            console.log('（无任何主站自定义域名记录）')
        } else {
            allShops.forEach(s => {
                console.log(`  - 域名: ${s.customDomain} -> 店铺: ${s.name} (Slug: ${s.slug})`)
            })
        }
    }
}

function logTenantSettings(settings) {
    if (!settings) {
        console.log('❌ 该租户没有对应的 settings 记录！')
        return
    }
    console.log(`支付宝开启状态: ${settings.alipayEnabled}`)
    parseAndAuditPayConfig(settings.paymentConfig)
}

function logShopSettings(settingsStr) {
    if (!settingsStr) {
        console.log('❌ 该商户店铺 settings 字段为空！')
        return
    }
    try {
        const settings = JSON.parse(settingsStr)
        console.log('店铺设置详情:')
        console.log(`  - 支付宝状态: ${settings.alipay_enabled === true || settings.alipayEnabled === true || settings.alipay_app_id ? '可能已启用' : '未启用'}`)
        
        // 打印设置中所有的 key 供分析结构
        console.log(`  - 配置Keys: ${Object.keys(settings).join(', ')}`)
        
        parseAndAuditPayConfig(settingsStr)
    } catch (e) {
        console.log(`❌ 解析店铺 settings 失败: ${e.message}`)
    }
}

function parseAndAuditPayConfig(configJson) {
    if (!configJson) return
    try {
        const config = JSON.parse(configJson)
        // 尝试从不同的可能字段名中提取
        const appId = config.alipay_app_id || config.alipayAppId
        const privateKey = config.alipay_private_key || config.alipayPrivateKey
        const publicKey = config.alipay_public_key || config.alipayPublicKey

        console.log('\n支付宝配置审计:')
        console.log(`  - appId: ${appId ? '已配置 (' + appId + ')' : '未配置 ❌'}`)
        
        if (privateKey) {
            const len = privateKey.length
            const firstLines = privateKey.split(/[\r\n]+/).map(l => l.trim()).filter(Boolean)
            console.log(`  - privateKey: 已配置 (长度: ${len} 字符, 行数: ${firstLines.length})`)
            console.log(`    私钥首行: "${firstLines[0] || ''}"`)
            console.log(`    私钥末行: "${firstLines[firstLines.length - 1] || ''}"`)
            
            if (privateKey.includes('RSA PRIVATE KEY')) {
                console.log('    ⚠️ 警报: 私钥包含 "RSA PRIVATE KEY"，属于 PKCS1 格式！支付宝标准 SDK 通常要求使用 PKCS8 格式（首行应为 "BEGIN PRIVATE KEY"），这会导致签名失败报错！')
            } else if (!privateKey.includes('PRIVATE KEY')) {
                console.log('    ⚠️ 警告: 私钥缺少 "BEGIN PRIVATE KEY" 证书标记，请确认复制是否完整！')
            }
        } else {
            console.log('  - privateKey: 未配置 ❌')
        }

        if (publicKey) {
            const len = publicKey.length
            const firstLines = publicKey.split(/[\r\n]+/).map(l => l.trim()).filter(Boolean)
            console.log(`  - publicKey: 已配置 (长度: ${len} 字符, 行数: ${firstLines.length})`)
            console.log(`    公钥首行: "${firstLines[0] || ''}"`)
            
            const cleanedKey = publicKey.replace(/-----BEGIN PUBLIC KEY-----|-----END PUBLIC KEY-----|\s/g, '')
            console.log(`    公钥缩略: ${cleanedKey.substring(0, 15)}...${cleanedKey.substring(cleanedKey.length - 15)}`)
            
            // 是否包含 PRIVATE KEY
            if (publicKey.includes('PRIVATE KEY')) {
                console.log('    ❌ 严重错误: 支付宝公钥中填入了私钥！请检查配置！')
            }
            // 判断是否是商户的应用公钥而非支付宝公钥（这是一个极其隐蔽又常见的错误）
            // 在常规情况下，我们需要提示商户核对该公钥是否是支付宝生成的支付宝公钥（Alipay Public Key）而非商户自签的应用公钥（Application Public Key）
        } else {
            console.log('  - publicKey: 未配置 ❌')
        }
    } catch (e) {
        console.log(`❌ 解析支付宝配置 JSON 失败: ${e.message}`)
    }
}

main().catch(console.error).finally(() => prisma.$disconnect())

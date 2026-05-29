const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    console.log('--- 正在深度查询 "ai方舟" 商店配置 (租户与主站商店表) ---')

    // 1. 查找所有 Shop 包含 "ai方舟" 或相似拼写
    const shops = await prisma.shop.findMany({
        where: {
            OR: [
                { name: { contains: 'ai' } },
                { name: { contains: '方舟' } },
                { slug: { contains: 'ark' } },
                { slug: { contains: 'ark' } },
                { slug: { contains: 'ai' } }
            ]
        },
        include: {
            merchant: true
        }
    })

    console.log(`找到符合条件的店铺数量: ${shops.length}`)
    for (const shop of shops) {
        console.log(`\n店铺: ${shop.name} (Slug: ${shop.slug})`)
        console.log(`- 自定义域名: ${shop.customDomain || '无'}`)
        console.log(`- 状态: ${shop.status}`)
        console.log(`- 邮箱: ${shop.merchant?.email}`)
        
        if (shop.settings) {
            try {
                const settings = JSON.parse(shop.settings)
                console.log(`- 配置Keys: ${Object.keys(settings).join(', ')}`)
                const alipayEnabled = settings.alipayEnabled || settings.alipay_enabled
                console.log(`- 支付宝开启状态: ${alipayEnabled}`)
                
                const appId = settings.alipayAppId || settings.alipay_app_id
                const privateKey = settings.alipayPrivateKey || settings.alipay_private_key
                const publicKey = settings.alipayPublicKey || settings.alipay_public_key
                
                console.log(`  - appId: ${appId ? '已配置 (' + appId + ')' : '未配置 ❌'}`)
                if (privateKey) {
                    console.log(`  - privateKey 长度: ${privateKey.length}`)
                    const lines = privateKey.split(/[\r\n]+/).map(l => l.trim()).filter(Boolean)
                    console.log(`    第一行: ${lines[0]}`)
                    console.log(`    最后一行: ${lines[lines.length - 1]}`)
                } else {
                    console.log(`  - privateKey: 未配置 ❌`)
                }
                
                if (publicKey) {
                    console.log(`  - publicKey 长度: ${publicKey.length}`)
                    const lines = publicKey.split(/[\r\n]+/).map(l => l.trim()).filter(Boolean)
                    console.log(`    第一行: ${lines[0]}`)
                } else {
                    console.log(`  - publicKey: 未配置 ❌`)
                }
            } catch (e) {
                console.log(`❌ 解析 settings 失败: ${e.message}`)
            }
        } else {
            console.log('- settings 字段为空')
        }
    }
}

main().catch(console.error).finally(() => prisma.$disconnect())

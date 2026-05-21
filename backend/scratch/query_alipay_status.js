const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    console.log('--- 正在查询商户支付宝配置状态 ---')
    const settings = await prisma.tenantSetting.findMany({
        select: {
            tenantId: true,
            alipayEnabled: true,
            paymentConfig: true,
            tenant: {
                select: {
                    shopName: true,
                    shopSlug: true
                }
            }
        }
    })

    settings.forEach(s => {
        console.log(`\n商户名称: ${s.tenant?.shopName || '未命名'} (${s.tenant?.shopSlug})`)
        console.log(`支付宝开启状态: ${s.alipayEnabled}`)
        if (s.paymentConfig) {
            try {
                const config = JSON.parse(s.paymentConfig)
                console.log(`  - alipay_app_id: ${config.alipay_app_id ? '已配置 (' + config.alipay_app_id + ')' : '未配置 ❌'}`)
                console.log(`  - alipay_private_key: ${config.alipay_private_key ? '已配置 (长度: ' + config.alipay_private_key.length + ')' : '未配置 ❌'}`)
                console.log(`  - alipay_public_key: ${config.alipay_public_key ? '已配置 (长度: ' + config.alipay_public_key.length + ')' : '未配置 ❌'}`)
                
                // 检查常见私钥和公钥误用问题
                if (config.alipay_private_key && config.alipay_private_key.includes('PUBLIC KEY')) {
                    console.log(`  - ⚠️ 警告：私钥字段中似乎填入了公钥！`)
                }
                if (config.alipay_public_key && config.alipay_public_key.includes('PRIVATE KEY')) {
                    console.log(`  - ⚠️ 警告：公钥字段中似乎填入了私钥！`)
                }
            } catch (e) {
                console.log(`  - ❌ 解析 payment_config 失败: ${e.message}`)
            }
        } else {
            console.log(`  - ❌ 未配置任何支付参数`)
        }
    })
}

main().catch(console.error).finally(() => prisma.$disconnect())

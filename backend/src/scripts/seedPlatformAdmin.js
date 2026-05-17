/**
 * 平台超管种子脚本
 * 读取环境变量创建初始超管账号
 * 运行：node backend/src/scripts/seedPlatformAdmin.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') })
const bcrypt = require('bcryptjs')
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    const email = process.env.PLATFORM_ADMIN_EMAIL
    const password = process.env.PLATFORM_ADMIN_PASSWORD
    const shopName = process.env.PLATFORM_ADMIN_SHOP_NAME || 'Vmart Platform'

    if (!email || !password) {
        console.error('❌ 请在 .env 中设置 PLATFORM_ADMIN_EMAIL 和 PLATFORM_ADMIN_PASSWORD')
        process.exit(1)
    }

    const exists = await prisma.merchant.findUnique({ where: { email } })
    if (exists) {
        // 确保 isSuperAdmin 为 true
        await prisma.merchant.update({ where: { email }, data: { isSuperAdmin: true } })
        console.log(`✅ 超管账号已存在，已确保 isSuperAdmin=true：${email}`)
        return
    }

    const hashed = await bcrypt.hash(password, 10)
    const merchant = await prisma.merchant.create({
        data: {
            email,
            password: hashed,
            shopName,
            isSuperAdmin: true,
            shop: {
                create: {
                    slug: 'platform-admin',
                    name: shopName,
                    trialEndsAt: new Date('2099-12-31'),
                    plan: 'PRO',
                    status: 'ACTIVE'
                }
            }
        }
    })

    // 初始化平台配置
    await prisma.platformSetting.createMany({
        data: [
            { key: 'trial_hours', value: '24', description: '新商户免费试用时长（小时）' },
            { key: 'platform_name', value: 'Vmart', description: '平台名称' },
            { key: 'register_open', value: 'true', description: '是否开放注册' },
            { key: 'usdt_wallet', value: '', description: '平台 USDT-TRC20 收款地址' },
            { key: 'bsc_usdt_wallet', value: '', description: '平台 USDT-BEP20 收款地址' },
            { key: 'alipay_app_id', value: '', description: '支付宝当面付 App ID' },
            { key: 'alipay_private_key', value: '', description: '支付宝应用私钥' },
            { key: 'alipay_public_key', value: '', description: '支付宝公钥' },
        ],
        skipDuplicates: true
    })

    console.log(`✅ 平台超管创建成功：${email}`)
    console.log(`   商城 slug：platform-admin`)
    console.log(`   请登录 /Man 访问平台后台`)
}

main()
    .catch(e => { console.error(e); process.exit(1) })
    .finally(() => prisma.$disconnect())

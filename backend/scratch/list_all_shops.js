const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    console.log('--- 租户表 (Tenant) 列表 ---')
    const tenants = await prisma.tenant.findMany()
    tenants.forEach(t => {
        console.log(`- ID: ${t.id}, 名称: ${t.shopName}, Slug: ${t.shopSlug}, 状态: ${t.status}`)
    })

    console.log('\n--- 主站店铺表 (Shop) 列表 ---')
    const shops = await prisma.shop.findMany({
        include: { merchant: true }
    })
    shops.forEach(s => {
        console.log(`- ID: ${s.id}, 名称: ${s.name}, Slug: ${s.slug}, 域名: ${s.customDomain}, 商家: ${s.merchant?.email}`)
    })
}

main().catch(console.error).finally(() => prisma.$disconnect())

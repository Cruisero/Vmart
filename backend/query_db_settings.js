const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    const siteNameSetting = await prisma.setting.findUnique({
        where: { key: 'siteName' }
    })
    console.log('siteName in Setting:', siteNameSetting)

    const platformNameSetting = await prisma.platformSetting.findUnique({
        where: { key: 'platform_name' }
    })
    console.log('platform_name in PlatformSetting:', platformNameSetting)
}

main().catch(console.error).finally(() => prisma.$disconnect())

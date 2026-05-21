const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    console.log('=== PLATFORM SETTINGS (PlatformSetting) ===')
    const platformSettings = await prisma.platformSetting.findMany()
    console.log(JSON.stringify(platformSettings, null, 2))

    console.log('\n=== GLOBAL SETTINGS (Setting) ===')
    const settings = await prisma.setting.findMany()
    console.log(JSON.stringify(settings, null, 2))
}

main().catch(console.error).finally(() => prisma.$disconnect())

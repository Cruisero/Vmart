const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    console.log('=== TARGET TENANT ===')
    const tenant = await prisma.tenant.findFirst({
        where: { shopSlug: 'gq48i3' },
        include: {
            settings: true,
            user: { select: { id: true, email: true, username: true, role: true } }
        }
    })
    console.log(JSON.stringify(tenant, null, 2))
}

main().catch(console.error).finally(() => prisma.$disconnect())

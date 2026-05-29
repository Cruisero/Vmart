const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    const domains = await prisma.tenantDomain.findMany({
        include: { tenant: { include: { user: true } } }
    })
    console.log('All Tenant Domains:', JSON.stringify(domains, null, 2))
}

main().catch(console.error).finally(() => prisma.$disconnect())


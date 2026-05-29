const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    const users = await prisma.user.findMany({
        include: { tenant: true }
    })
    console.log('All Users:', JSON.stringify(users.map(u => ({ id: u.id, email: u.email, role: u.role, tenantId: u.tenantId, hasTenant: !!u.tenant })), null, 2))

    const tenants = await prisma.tenant.findMany({
        include: { user: true }
    })
    console.log('All Tenants:', JSON.stringify(tenants.map(t => ({ id: t.id, shopName: t.shopName, shopSlug: t.shopSlug, userEmail: t.user.email })), null, 2))
}

main().catch(console.error).finally(() => prisma.$disconnect())

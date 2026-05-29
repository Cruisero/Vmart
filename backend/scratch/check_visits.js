const prisma = require('../src/config/database')

async function main() {
    try {
        const tenants = await prisma.tenant.findMany({
            select: { id: true, shopName: true, shopSlug: true }
        })
        console.log('Tenants list:', tenants)

        const siteVisits = await prisma.siteVisit.findMany()
        console.log('All visits in database:', siteVisits)
    } catch (e) {
        console.error('Error:', e)
    } finally {
        await prisma.$disconnect()
    }
}

main()

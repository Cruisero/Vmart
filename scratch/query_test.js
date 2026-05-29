const prisma = require('../backend/src/config/database')

async function run() {
    try {
        console.log('--- Database Query Test ---')
        const tenants = await prisma.tenant.findMany({ select: { id: true, shopName: true, shopSlug: true } })
        console.log('Tenants:', tenants)

        const usersCount = await prisma.user.count()
        console.log('Total Users count:', usersCount)

        const customersCount = await prisma.customer.count()
        console.log('Total Customers count:', customersCount)

        const tenantId = '97abafe8-7aef-4b8b-82ff-5b62f1a3ea15' // gq48i3
        console.log(`\nTesting for Tenant ID: ${tenantId} (gq48i3)`)

        const emailToSearch = 'rawbump@gmail.com'
        console.log(`\nGlobal Lookup for: ${emailToSearch}`)

        const globalUser = await prisma.user.findFirst({
            where: { email: emailToSearch }
        })
        console.log('Global User record:', globalUser)

        const globalCustomer = await prisma.customer.findMany({
            where: { email: emailToSearch }
        })
        console.log('Global Customer records:', globalCustomer)

    } catch (e) {
        console.error('Error querying database:', e)
    } finally {
        await prisma.$disconnect()
    }
}

run()

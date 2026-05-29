const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')
const prisma = new PrismaClient()

async function main() {
    const email = 'admin@vmart.cc'
    const password = 'Pure314159'
    const hashed = await bcrypt.hash(password, 10)

    // Update merchant
    await prisma.merchant.updateMany({
        where: { email },
        data: { password: hashed, isSuperAdmin: true }
    })

    // Update user
    await prisma.user.updateMany({
        where: { email },
        data: { password: hashed, role: 'TENANT_ADMIN' }
    })

    console.log(`✅ Successfully reset password for ${email} to ${password}`)
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())

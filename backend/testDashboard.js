const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    const days = 7
    const today = new Date()
    today.setHours(23, 59, 59, 999)
    const startDate = new Date(today)
    startDate.setDate(startDate.getDate() - days + 1)
    startDate.setHours(0, 0, 0, 0)
    
    try {
        const [orders, users, products, siteVisits] = await Promise.all([
            prisma.order.findMany({
                where: { status: 'COMPLETED', createdAt: { gte: startDate, lte: today } },
                select: { createdAt: true, totalAmount: true }
            }),
            prisma.user.findMany({
                where: { createdAt: { gte: startDate, lte: today } },
                select: { createdAt: true }
            }),
            prisma.product.findMany({
                where: { createdAt: { gte: startDate, lte: today } },
                select: { createdAt: true }
            }),
            prisma.siteVisit.findMany({
                where: { date: { gte: startDate, lte: today } },
                select: { date: true, visits: true }
            })
        ])
        console.log("Success!")
    } catch(err) {
        console.error(err)
    } finally {
        await prisma.$disconnect()
    }
}
main()

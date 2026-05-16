const prisma = require('../config/database')

exports.recordVisit = async (req, res, next) => {
    try {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        
        if (!prisma.siteVisit) {
            return res.json({ success: false, reason: 'model_not_available' })
        }

        const siteVisit = await prisma.siteVisit.upsert({
            where: {
                    ...(req.tenantId ? { tenantId: req.tenantId } : {}),
                date: today
            },
            update: {
                visits: {
                    increment: 1
                }
            },
            create: {
                date: today,
                visits: 1
            }
        })
        
        res.json({ success: true, visits: siteVisit.visits })
    } catch (error) {
        console.error('Record visit error:', error)
        res.json({ success: false })
    }
}

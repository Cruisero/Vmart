require('dotenv').config()
const app = require('./src/app')
const logger = require('./src/utils/logger')

const PORT = process.env.PORT || 8080

app.listen(PORT, async () => {
    logger.info(`🚀 Kashop API 服务已启动: http://localhost:${PORT}`)
    logger.info(`📚 API 文档: http://localhost:${PORT}/api/docs`)

    // 一次性同步已验证的自定义域名至主站 Shop 表中，修复历史未同步的域名展示
    try {
        const prisma = require('./src/config/database')
        const verifiedDomains = await prisma.tenantDomain.findMany({
            where: { dnsVerified: true },
            include: { tenant: true }
        })
        for (const record of verifiedDomains) {
            if (record.tenant && record.tenant.shopSlug) {
                const shop = await prisma.shop.findUnique({
                    where: { slug: record.tenant.shopSlug }
                })
                if (shop && shop.customDomain !== record.domain) {
                    await prisma.shop.update({
                        where: { slug: record.tenant.shopSlug },
                        data: { customDomain: record.domain }
                    })
                    logger.info(`[Sync] 已自动同步已验证的域名 ${record.domain} 到商店 ${shop.name}`)
                }
            }
        }
    } catch (e) {
        logger.error('[Sync] 初始化同步已验证域名失败:', e)
    }
})

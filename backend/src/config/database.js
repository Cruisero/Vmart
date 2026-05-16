const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
})

// 连接测试
prisma.$connect()
    .then(() => {
        console.log('✅ 数据库连接成功')
    })
    .catch((err) => {
        console.error('❌ 数据库连接失败:', err)
        process.exit(1)
    })

module.exports = prisma

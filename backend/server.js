require('dotenv').config()
const app = require('./src/app')
const logger = require('./src/utils/logger')

const PORT = process.env.PORT || 8080

app.listen(PORT, () => {
    logger.info(`🚀 Kashop API 服务已启动: http://localhost:${PORT}`)
    logger.info(`📚 API 文档: http://localhost:${PORT}/api/docs`)
})

const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const morgan = require('morgan')
const rateLimit = require('express-rate-limit')
const routes = require('./routes')
const errorHandler = require('./middleware/errorHandler')
const logger = require('./utils/logger')
const { initScheduledTasks } = require('./tasks/scheduler')

const app = express()

// 反向代理场景下启用真实客户端 IP（Nginx -> Node）
app.set('trust proxy', 1)

// 安全中间件 (配置允许跨域图片)
app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false
}))

// CORS 配置
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}))

// 请求日志
app.use(morgan('combined', {
    stream: { write: (message) => logger.http(message.trim()) }
}))

// 请求体解析
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// 请求限流 (开发环境放宽限制)
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15分钟
    max: process.env.NODE_ENV === 'production' ? 500 : 1000, // 开发环境1000次，生产环境500次
    message: { error: '请求过于频繁，请稍后再试' }
})
app.use('/api', limiter)

// 静态文件
app.use('/uploads', express.static('uploads'))

// API 路由
app.use('/api', routes)

// 健康检查
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// 初始化定时任务
initScheduledTasks()

// 启动 USDT 支付监控
const usdtService = require('./services/usdtService')
usdtService.startPolling()

// 启动 BSC USDT 支付监控
const bscUsdtService = require('./services/bscUsdtService')
bscUsdtService.startPolling()

// 404 处理
app.use((req, res) => {
    res.status(404).json({ error: '接口不存在' })
})

// 全局错误处理
app.use(errorHandler)

module.exports = app

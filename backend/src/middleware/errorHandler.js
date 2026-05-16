const logger = require('../utils/logger')

const errorHandler = (err, req, res, next) => {
    logger.error(err.stack)

    // Joi 验证错误
    if (err.isJoi) {
        return res.status(400).json({
            error: '请求参数错误',
            details: err.details.map(d => d.message)
        })
    }

    // JWT 错误
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({ error: '无效的Token' })
    }

    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token已过期' })
    }

    // 数据库错误
    if (err.code === 'P2002') {
        return res.status(409).json({ error: '数据已存在' })
    }

    // 自定义错误
    if (err.statusCode) {
        return res.status(err.statusCode).json({ error: err.message })
    }

    // 默认服务器错误
    res.status(500).json({ error: '服务器内部错误' })
}

module.exports = errorHandler

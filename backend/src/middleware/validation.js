// 请求体验证中间件
const validateBody = (schema) => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.body, {
            abortEarly: false,
            stripUnknown: true
        })

        if (error) {
            error.isJoi = true
            return next(error)
        }

        req.body = value
        next()
    }
}

// 查询参数验证中间件
const validateQuery = (schema) => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.query, {
            abortEarly: false,
            stripUnknown: true
        })

        if (error) {
            error.isJoi = true
            return next(error)
        }

        req.query = value
        next()
    }
}

module.exports = { validateBody, validateQuery }

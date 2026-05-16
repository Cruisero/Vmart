const prisma = require('../config/database')

// 获取租户列表
exports.getTenants = async (req, res) => {
    try {
        const { status, page = 1, limit = 20, search } = req.query
        const where = {}
        if (status) where.status = status
        if (search) where.OR = [
            { shopName: { contains: search } },
            { shopSlug: { contains: search } },
            { user: { email: { contains: search } } }
        ]

        const [tenants, total] = await Promise.all([
            prisma.tenant.findMany({
                where,
                include: {
                    user: { select: { id: true, email: true, username: true } },
                    domains: true,
                    _count: { select: { products: true, orders: true } }
                },
                orderBy: { createdAt: 'desc' },
                skip: (Number(page) - 1) * Number(limit),
                take: Number(limit)
            }),
            prisma.tenant.count({ where })
        ])

        res.json({ tenants, total, page: Number(page), limit: Number(limit) })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

// 获取租户详情
exports.getTenantDetail = async (req, res) => {
    try {
        const tenant = await prisma.tenant.findUnique({
            where: { id: req.params.id },
            include: {
                user: { select: { id: true, email: true, username: true, createdAt: true } },
                domains: true,
                settings: true,
                _count: { select: { products: true, orders: true } }
            }
        })
        if (!tenant) return res.status(404).json({ error: '租户不存在' })

        // 获取收入统计
        const revenue = await prisma.order.aggregate({
            where: { tenantId: tenant.id, status: 'COMPLETED' },
            _sum: { totalAmount: true }
        })

        res.json({ tenant, revenue: Number(revenue._sum.totalAmount || 0) })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

// 批准租户
exports.approveTenant = async (req, res) => {
    try {
        const tenant = await prisma.tenant.findUnique({ where: { id: req.params.id } })
        if (!tenant) return res.status(404).json({ error: '租户不存在' })
        if (tenant.status !== 'REVIEWING') return res.status(400).json({ error: '只有审核中的租户可以批准' })

        await prisma.tenant.update({
            where: { id: req.params.id },
            data: { status: 'ACTIVE', reviewNote: null }
        })

        // 更新用户角色为 TENANT_ADMIN
        await prisma.user.update({
            where: { id: tenant.userId },
            data: { role: 'TENANT_ADMIN' }
        })

        res.json({ message: '租户已批准，商城已上线' })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

// 拒绝租户
exports.rejectTenant = async (req, res) => {
    try {
        const { reason } = req.body
        const tenant = await prisma.tenant.findUnique({ where: { id: req.params.id } })
        if (!tenant) return res.status(404).json({ error: '租户不存在' })

        await prisma.tenant.update({
            where: { id: req.params.id },
            data: { status: 'REJECTED', reviewNote: reason || '审核未通过，请检查配置后重新提交' }
        })

        res.json({ message: '已拒绝该租户申请' })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

// 暂停租户
exports.suspendTenant = async (req, res) => {
    try {
        const { reason } = req.body
        await prisma.tenant.update({
            where: { id: req.params.id },
            data: { status: 'SUSPENDED', reviewNote: reason || '已被管理员暂停' }
        })
        res.json({ message: '租户已暂停' })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

// 恢复租户
exports.reactivateTenant = async (req, res) => {
    try {
        await prisma.tenant.update({
            where: { id: req.params.id },
            data: { status: 'ACTIVE', reviewNote: null }
        })
        res.json({ message: '租户已恢复运营' })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

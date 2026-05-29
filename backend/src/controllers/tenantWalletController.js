const prisma = require('../config/database')

/**
 * 获取租户钱包概览与余额
 */
exports.getWalletProfile = async (req, res, next) => {
    try {
        const tenant = await prisma.tenant.findUnique({
            where: { userId: req.user.id },
            select: {
                id: true,
                balance: true,
                frozenBalance: true,
                totalSales: true,
                feeRate: true,
                withdrawAccounts: true,
                kycStatus: true
            }
        })
        
        if (!tenant) {
            return res.status(404).json({ error: '商户不存在' })
        }

        // 加载平台设置的渐进式 KYC 限制
        let singleLimit = 1000;
        let cumulativeLimit = 3000;
        try {
            const singleSetting = await prisma.platformSetting.findUnique({ where: { key: 'kyc_progressive_single_limit' } });
            if (singleSetting && singleSetting.value) {
                const val = parseFloat(singleSetting.value);
                if (!isNaN(val) && val > 0) singleLimit = val;
            }
            const cumulativeSetting = await prisma.platformSetting.findUnique({ where: { key: 'kyc_progressive_cumulative_limit' } });
            if (cumulativeSetting && cumulativeSetting.value) {
                const val = parseFloat(cumulativeSetting.value);
                if (!isNaN(val) && val > 0) cumulativeLimit = val;
            }
        } catch (e) {}

        res.json({
            wallet: {
                tenantId: tenant.id,
                balance: parseFloat(tenant.balance),
                frozenBalance: parseFloat(tenant.frozenBalance),
                totalSales: parseFloat(tenant.totalSales),
                feeRate: parseFloat(tenant.feeRate),
                kycStatus: tenant.kycStatus,
                withdrawAccounts: tenant.withdrawAccounts ? JSON.parse(tenant.withdrawAccounts) : {},
                kycProgressiveSingleLimit: singleLimit,
                kycProgressiveCumulativeLimit: cumulativeLimit
            }
        })
    } catch (error) {
        next(error)
    }
}

/**
 * 绑定/更新提现账号
 */
exports.bindWithdrawAccount = async (req, res, next) => {
    try {
        const { method, account } = req.body
        const validMethods = ['alipay', 'usdt_trc20', 'usdt_bep20']

        if (!method || !validMethods.includes(method)) {
            return res.status(400).json({ error: '请选择有效的提现方式' })
        }
        if (!account || !account.trim()) {
            return res.status(400).json({ error: '请填写收款账号/地址' })
        }

        const tenant = await prisma.tenant.findUnique({ where: { userId: req.user.id } })
        if (!tenant) {
            return res.status(404).json({ error: '商户不存在' })
        }

        const existing = tenant.withdrawAccounts ? JSON.parse(tenant.withdrawAccounts) : {}
        existing[method] = account.trim()

        await prisma.tenant.update({
            where: { id: tenant.id },
            data: { withdrawAccounts: JSON.stringify(existing) }
        })

        res.json({ message: '收款账号已保存', withdrawAccounts: existing })
    } catch (error) {
        next(error)
    }
}

/**
 * 申请提现 (悲观锁定行)
 */
exports.requestWithdrawal = async (req, res, next) => {
    try {
        const { amount, method } = req.body

        if (!amount || amount <= 0) {
            return res.status(400).json({ error: '请输入有效的提现金额' })
        }

        const withdrawAmount = parseFloat(amount)
        if (withdrawAmount < 100) {
            return res.status(400).json({ error: '最低提现金额为 ¥100' })
        }

        const validMethods = ['alipay', 'usdt_trc20', 'usdt_bep20']
        if (!method || !validMethods.includes(method)) {
            return res.status(400).json({ error: '请选择提现方式' })
        }

        const tenant = await prisma.tenant.findUnique({ where: { userId: req.user.id } })
        if (!tenant) {
            return res.status(404).json({ error: '商户不存在' })
        }

        // 渐进式 KYC (Progressive KYC) 校验：未实名核验商户支持小额快捷提现测试，大额提现需完成 KYC 实名核验
        if (tenant.kycStatus !== 'VERIFIED') {
            let singleLimit = 1000;
            let cumulativeLimit = 3000;
            try {
                const singleSetting = await prisma.platformSetting.findUnique({ where: { key: 'kyc_progressive_single_limit' } });
                if (singleSetting && singleSetting.value) {
                    const val = parseFloat(singleSetting.value);
                    if (!isNaN(val) && val > 0) singleLimit = val;
                }
                const cumulativeSetting = await prisma.platformSetting.findUnique({ where: { key: 'kyc_progressive_cumulative_limit' } });
                if (cumulativeSetting && cumulativeSetting.value) {
                    const val = parseFloat(cumulativeSetting.value);
                    if (!isNaN(val) && val > 0) cumulativeLimit = val;
                }
            } catch (e) {}

            if (withdrawAmount > singleLimit) {
                return res.status(400).json({ 
                    error: `未实名认证账户单笔最高提现限额为 ¥${singleLimit}。如需提现更大额度，请先前往“店铺设置-实名认证”提交 KYC 审核。` 
                });
            }

            // 查询该商户已成功或处理中的提现总额
            const withdrawnAgg = await prisma.tenantWithdrawal.aggregate({
                where: {
                    tenantId: tenant.id,
                    status: { in: ['APPROVED', 'PENDING'] }
                },
                _sum: { amount: true }
            });
            const totalWithdrawn = parseFloat(withdrawnAgg._sum.amount || 0);

            if (totalWithdrawn + withdrawAmount > cumulativeLimit) {
                return res.status(400).json({ 
                    error: `未实名认证账户累计免签提现上限为 ¥${cumulativeLimit}（您已成功及处理中提现：¥${totalWithdrawn.toFixed(2)}）。如需继续清算，请先前往“店铺设置-实名认证”标签页完成实名核验。` 
                });
            }
        }

        // 从已保存账号中拉取收款地址
        const accounts = tenant.withdrawAccounts ? JSON.parse(tenant.withdrawAccounts) : {}
        const account = accounts[method]
        if (!account) {
            return res.status(400).json({ error: '请先保存该提现方式的收款账号信息' })
        }

        try {
            await prisma.$transaction(async (tx) => {
                // 用 SELECT ... FOR UPDATE 锁住该商户，避免并发提现余额双花
                const [lockedTenant] = await tx.$queryRaw`SELECT balance, frozen_balance FROM tenants WHERE id = ${tenant.id} FOR UPDATE`
                if (!lockedTenant) {
                    throw new Error('商户不存在')
                }

                const currentBalance = parseFloat(lockedTenant.balance)
                if (currentBalance < withdrawAmount) {
                    throw new Error(`提现余额不足，当前可用余额: ¥${currentBalance.toFixed(2)}`)
                }

                // 检查是否有处理中的提现
                const pendingCount = await tx.tenantWithdrawal.count({
                    where: { tenantId: tenant.id, status: 'PENDING' }
                })
                if (pendingCount > 0) {
                    throw new Error('您有一笔提现申请正在处理中，请等待上一笔处理完毕再提交')
                }

                // 更新余额与冻结余额
                const updatedTenant = await tx.tenant.update({
                    where: { id: tenant.id },
                    data: {
                        balance: { decrement: withdrawAmount },
                        frozenBalance: { increment: withdrawAmount }
                    }
                })

                // 创建提现记录
                const w = await tx.tenantWithdrawal.create({
                    data: {
                        tenantId: tenant.id,
                        amount: withdrawAmount,
                        method,
                        account
                    }
                })

                // 写入财务流水
                await tx.tenantBalanceLog.create({
                    data: {
                        tenantId: tenant.id,
                        type: 'WITHDRAW',
                        amount: -withdrawAmount,
                        balance: updatedTenant.balance,
                        referenceId: w.id,
                        remark: `提现申请已提交，系统冻结资金 ¥${withdrawAmount.toFixed(2)}`
                    }
                })
            })
        } catch (error) {
            if (error.message && (error.message.includes('余额不足') || error.message.includes('处理中') || error.message.includes('不存在'))) {
                return res.status(400).json({ error: error.message })
            }
            throw error
        }

        res.json({ message: '提现申请已提交，请等待平台管理员审核付款' })
    } catch (error) {
        next(error)
    }
}

/**
 * 获取租户历史提现列表
 */
exports.getWithdrawals = async (req, res, next) => {
    try {
        const tenant = await prisma.tenant.findUnique({ where: { userId: req.user.id } })
        if (!tenant) {
            return res.status(404).json({ error: '商户不存在' })
        }

        const withdrawals = await prisma.tenantWithdrawal.findMany({
            where: { tenantId: tenant.id },
            orderBy: { createdAt: 'desc' },
            take: 50
        })

        res.json({
            withdrawals: withdrawals.map(w => ({
                id: w.id,
                amount: parseFloat(w.amount),
                method: w.method,
                account: w.account,
                status: w.status,
                rejectReason: w.rejectReason || null,
                processedAt: w.processedAt || null,
                createdAt: w.createdAt
            }))
        })
    } catch (error) {
        next(error)
    }
}

/**
 * 获取租户财务账本流水 (支持过滤和分页)
 */
exports.getBalanceLogs = async (req, res, next) => {
    try {
        const { type, page = 1, limit = 20 } = req.query
        const skip = (parseInt(page) - 1) * parseInt(limit)
        const take = parseInt(limit)

        const tenant = await prisma.tenant.findUnique({ where: { userId: req.user.id } })
        if (!tenant) {
            return res.status(404).json({ error: '商户不存在' })
        }

        const where = { tenantId: tenant.id }
        if (type) {
            where.type = type
        }

        const [logs, total] = await Promise.all([
            prisma.tenantBalanceLog.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take
            }),
            prisma.tenantBalanceLog.count({ where })
        ])

        res.json({
            logs: logs.map(l => ({
                id: l.id,
                type: l.type,
                amount: parseFloat(l.amount),
                balance: parseFloat(l.balance),
                referenceId: l.referenceId,
                remark: l.remark,
                createdAt: l.createdAt
            })),
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / take)
        })
    } catch (error) {
        next(error)
    }
}

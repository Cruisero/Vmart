const express = require('express')
const router = express.Router()
const adminController = require('../controllers/adminController')
const adminAgent = require('../controllers/adminAgent.controller')
const sslController = require('../controllers/sslController')
const { authenticate, isAdmin, isSuperAdmin } = require('../middleware/auth')

// 所有管理员路由需要认证 + 管理员权限（ADMIN 和 SUPER_ADMIN 均可访问）
router.use(authenticate, isAdmin)

// ==================== 所有管理员可访问 ====================

// 仪表盘统计
router.get('/dashboard', adminController.getDashboard)
router.get('/dashboard/trend', adminController.getDashboardTrend)

// 商品管理
router.get('/products', adminController.getProducts)
router.post('/products', adminController.createProduct)
router.put('/products/:id', adminController.updateProduct)
router.delete('/products/:id', adminController.deleteProduct)

// 分类管理
router.get('/categories', adminController.getCategories)
router.post('/categories', adminController.createCategory)
router.put('/categories/:id', adminController.updateCategory)
router.delete('/categories/:id', adminController.deleteCategory)

// 订单管理 - 查看 & 发货 & 重发
router.get('/orders', adminController.getOrders)
router.put('/orders/:id/status', adminController.updateOrderStatus)
router.post('/orders/:id/ship', adminController.shipOrder)
router.post('/orders/:id/resend', adminController.resendCards)

// 卡密管理 - 查看 & 导入 & 编辑
router.get('/cards', adminController.getCards)
router.post('/cards/import', adminController.importCards)
router.put('/cards/:id', adminController.updateCard)

// 用户管理 - 查看
router.get('/users', adminController.getUsers)

// 代理管理
router.get('/agents', adminAgent.getAgents)
router.put('/agents/:id/status', adminAgent.updateAgentStatus)
router.get('/agents/:id/orders', adminAgent.getAgentOrders)
router.get('/withdrawals', adminAgent.getWithdrawals)
router.put('/withdrawals/:id', adminAgent.processWithdrawal)

// ==================== 仅超级管理员可访问 ====================

// 订单管理 - 退款 & 删除（高危操作）
router.post('/orders/:id/refund', isSuperAdmin, adminController.refundOrder)
router.post('/orders/:id/refund/complete', isSuperAdmin, adminController.completeRefundOrder)
router.delete('/orders/:id', isSuperAdmin, adminController.deleteOrder)

// 卡密管理 - 删除（高危操作）
router.delete('/cards/:id', isSuperAdmin, adminController.deleteCard)
router.post('/cards/batch-delete', isSuperAdmin, adminController.deleteCards)

// 用户管理 - 清理 & 角色修改
router.post('/users/cleanup-unverified', isSuperAdmin, adminController.cleanupUnverifiedAccounts)
router.patch('/users/:id/role', isSuperAdmin, adminController.updateUserRole)

// 管理员管理（创建 / 删除子管理员）
router.post('/admins', isSuperAdmin, adminController.createAdmin)
router.delete('/admins/:id', isSuperAdmin, adminController.deleteAdmin)

// 系统设置
router.get('/settings', isAdmin, adminController.getSettings)
router.put('/settings', isAdmin, adminController.updateSettings)
router.post('/settings/test-email', isAdmin, adminController.testEmail)

// 数据库备份
router.get('/backup/status', isAdmin, adminController.getBackupStatus)
router.post('/backup/run', isAdmin, adminController.runBackup)
router.post('/backup/restart-schedule', isSuperAdmin, adminController.restartBackupSchedule)
router.post('/backup/email', isSuperAdmin, adminController.emailBackup)
router.get('/backup/download/:filename', isSuperAdmin, adminController.downloadBackup)

// 库存警报
router.get('/stock-alert/products', isSuperAdmin, adminController.getStockAlertProducts)
router.post('/stock-alert/products', isSuperAdmin, adminController.setStockAlertProducts)
router.post('/stock/rebuild', isSuperAdmin, adminController.rebuildStockFromCards)

// SSL 泛域名证书申请（仅超级管理员）
router.get('/ssl/status', isSuperAdmin, sslController.getStatus)
router.post('/ssl/apply-step1', isSuperAdmin, sslController.applyStep1)
router.post('/ssl/apply-step2', isSuperAdmin, sslController.applyStep2)

// ==================== 租户管理 ====================
const adminTenantController = require('../controllers/adminTenantController')
router.get('/tenants', adminTenantController.getTenants)
router.get('/tenants/:id', adminTenantController.getTenantDetail)
router.put('/tenants/:id/approve', adminTenantController.approveTenant)
router.put('/tenants/:id/reject', adminTenantController.rejectTenant)
router.put('/tenants/:id/suspend', adminTenantController.suspendTenant)
router.put('/tenants/:id/reactivate', adminTenantController.reactivateTenant)

module.exports = router

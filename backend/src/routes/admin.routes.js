const express = require('express')
const router = express.Router()
const adminController = require('../controllers/adminController')
const adminAgent = require('../controllers/adminAgent.controller')
const sslController = require('../controllers/sslController')
const { authenticate, isAdmin, isSuperAdmin, requirePermission } = require('../middleware/auth')
const { checkProductLimit } = require('../middleware/planLimits')

// 所有管理员路由需要认证 + 管理员权限（ADMIN 和 SUPER_ADMIN 均可访问）
router.use(authenticate, isAdmin)

// ==================== 所有管理员可访问 ====================

// 仪表盘统计
router.get('/dashboard', requirePermission('dashboard.view'), adminController.getDashboard)
router.get('/dashboard/trend', requirePermission('dashboard.view'), adminController.getDashboardTrend)

// 商品管理
router.get('/products', requirePermission('products.view'), adminController.getProducts)
router.post('/products', requirePermission('products.edit'), checkProductLimit, adminController.createProduct)
router.put('/products/:id', requirePermission('products.edit'), adminController.updateProduct)
router.delete('/products/:id', requirePermission('products.delete'), adminController.deleteProduct)

// 分类管理
router.get('/categories', requirePermission('products.view'), adminController.getCategories)
router.post('/categories', requirePermission('products.categories'), adminController.createCategory)
router.put('/categories/:id', requirePermission('products.categories'), adminController.updateCategory)
router.delete('/categories/:id', requirePermission('products.categories'), adminController.deleteCategory)

// 订单管理 - 查看 & 发货 & 重发
router.get('/orders', requirePermission('orders.view'), adminController.getOrders)
router.put('/orders/:id/status', requirePermission('orders.ship'), adminController.updateOrderStatus)
router.post('/orders/:id/ship', requirePermission('orders.ship'), adminController.shipOrder)
router.post('/orders/:id/resend', requirePermission('orders.ship'), adminController.resendCards)

// 卡密管理 - 查看 & 导入 & 编辑
router.get('/cards', requirePermission('cards.view'), adminController.getCards)
router.post('/cards/import', requirePermission('cards.import'), adminController.importCards)
router.put('/cards/:id', requirePermission('cards.import'), adminController.updateCard)

// 用户管理 - 查看
router.get('/users', requirePermission('customers.view'), adminController.getUsers)

// 代理管理
router.get('/agents', requirePermission('agents.review'), adminAgent.getAgents)
router.put('/agents/:id/status', requirePermission('agents.review'), adminAgent.updateAgentStatus)
router.get('/agents/:id/orders', requirePermission('agents.review'), adminAgent.getAgentOrders)
router.get('/withdrawals', requirePermission('agents.withdraw'), adminAgent.getWithdrawals)
router.put('/withdrawals/:id', requirePermission('agents.withdraw'), adminAgent.processWithdrawal)

// ==================== 仅超级管理员可访问 ====================

// 订单管理 - 退款 & 删除（高危操作，所有者可用，子管理员需要权限）
router.post('/orders/:id/refund', requirePermission('orders.refund'), adminController.refundOrder)
router.post('/orders/:id/refund/complete', requirePermission('orders.refund'), adminController.completeRefundOrder)
router.delete('/orders/:id', isSuperAdmin, adminController.deleteOrder)

// 卡密管理 - 删除（仅子管理员有 cards.delete 才行；所有者直接通过）
router.delete('/cards/:id', requirePermission('cards.delete'), adminController.deleteCard)
router.post('/cards/batch-delete', requirePermission('cards.delete'), adminController.deleteCards)

// 用户管理 - 清理 & 角色修改
router.post('/users/cleanup-unverified', isSuperAdmin, adminController.cleanupUnverifiedAccounts)
router.patch('/users/:id/role', isSuperAdmin, adminController.updateUserRole)

// 管理员管理（创建 / 删除 / 编辑权限）
router.get('/admins', adminController.getSubAdmins)
router.get('/admins/permissions/groups', adminController.getPermissionGroups)
router.post('/admins', adminController.createAdmin)
router.put('/admins/:id', adminController.updateAdminPermissions)
router.delete('/admins/:id', adminController.deleteAdmin)

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

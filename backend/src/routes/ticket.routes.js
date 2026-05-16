const express = require('express')
const router = express.Router()
const ticketController = require('../controllers/ticketController')
const { authenticate, isAdmin } = require('../middleware/auth')
const {
    ticketCreateSecurityGuard,
    ticketCreateRateLimiter
} = require('../middleware/security')

// ==================== 用户端路由 ====================

// 获取用户的订单列表（用于选择关联订单）
router.get('/orders', authenticate, ticketController.getMyOrders)

// 创建工单
router.post('/', authenticate, ticketCreateRateLimiter, ticketCreateSecurityGuard, ticketController.createTicket)

// 获取我的工单列表
router.get('/', authenticate, ticketController.getMyTickets)

// 获取工单详情
router.get('/:id', authenticate, ticketController.getTicketDetail)

// 发送消息
router.post('/:id/messages', authenticate, ticketController.addMessage)

// 用户主动关闭工单
router.patch('/:id/close', authenticate, ticketController.closeMyTicket)

// ==================== 管理端路由 ====================

// 获取所有工单
router.get('/admin/all', authenticate, isAdmin, ticketController.getAllTickets)

// 获取工单详情（管理员）
router.get('/admin/:id', authenticate, isAdmin, ticketController.getTicketDetail)

// 管理员回复
router.post('/admin/:id/reply', authenticate, isAdmin, ticketController.adminReply)

// 更新工单状态
router.patch('/admin/:id/status', authenticate, isAdmin, ticketController.updateTicketStatus)

module.exports = router

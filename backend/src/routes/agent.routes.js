const express = require('express')
const router = express.Router()
const { authenticate, isAgent } = require('../middleware/auth')
const agent = require('../controllers/agent.controller')

// 申请代理（仅需登录）
router.post('/apply', authenticate, agent.applyAgent)

// 以下需要已激活代理身份
router.get('/profile', authenticate, isAgent, agent.getAgentProfile)
router.put('/profile', authenticate, isAgent, agent.updateAgentProfile)
router.get('/products', authenticate, isAgent, agent.getAgentProducts)
router.post('/products', authenticate, isAgent, agent.setAgentProduct)
router.get('/orders', authenticate, isAgent, agent.getAgentOrders)
router.get('/stats', authenticate, isAgent, agent.getAgentStats)
router.get('/users', authenticate, isAgent, agent.getAgentUsers)
router.post('/withdraw', authenticate, isAgent, agent.requestWithdrawal)
router.put('/withdraw/bind', authenticate, isAgent, agent.bindWithdrawAccount)
router.get('/withdrawals', authenticate, isAgent, agent.getWithdrawals)

module.exports = router

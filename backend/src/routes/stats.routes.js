const express = require('express')
const router = express.Router()
const statsController = require('../controllers/stats.controller')

router.post('/visit', statsController.recordVisit)

module.exports = router

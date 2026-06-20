const express    = require('express')
const router     = express.Router()
const controller = require('../controllers/resolution.controller')

// internal routes — called by chat-service
router.post('/resolve',                      controller.resolve)
router.get('/conversation/:conversationId',  controller.getResolution)

module.exports = router
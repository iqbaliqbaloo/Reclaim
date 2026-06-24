const express    = require('express')
const router     = express.Router()
const controller = require('../controllers/notification.controller')
const { protect } = require('../middleware/auth')

// user routes
router.get('/',              protect, controller.getMyNotifications)
router.put('/read-all',      protect, controller.markAllRead)
router.put('/:id/read',      protect, controller.markRead)

// internal — called by other services
router.post('/match',                    controller.handleNewMatch)
router.post('/claim-received',           controller.handleClaimReceived)
router.post('/claim-approved',           controller.handleClaimApproved)
router.post('/claim-rejected',           controller.handleClaimRejected)
router.post('/claim-expired',            controller.handleClaimExpired)
router.post('/claim-reminder-1',         controller.handleClaimReminder1)
router.post('/claim-reminder-2',         controller.handleClaimReminder2)
router.post('/new-message',              controller.handleNewMessage)
router.post('/claims-rejected-bulk',     controller.handleClaimsRejectedBulk)

module.exports = router
const express    = require('express')
const router     = express.Router()
const controller = require('../controllers/chat.controller')
const { protect } = require('../middleware/auth')

router.post('/',                    controller.createConversation)       // internal — claim-service
router.get('/',                     protect, controller.getMyConversations)
router.get('/:id/messages',         protect, controller.getMessages)
router.post('/:id/messages',        protect, controller.sendMessage)
router.put('/:id/confirm',          protect, controller.confirmReturn)
router.put('/:id/dispute',          protect, controller.disputeResolution)

module.exports = router
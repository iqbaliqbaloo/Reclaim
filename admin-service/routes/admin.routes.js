const express    = require('express')
const router     = express.Router()
const controller = require('../controllers/admin.controller')
const { protect, authorize } = require('../middleware/auth')

// any logged in user can submit a report
router.post('/reports',            protect, controller.submitReport)

// admin only routes
router.get('/reports',             protect, authorize('admin'), controller.getReportsQueue)
router.put('/reports/:id/resolve', protect, authorize('admin'), controller.resolveReport)
router.get('/users',               protect, authorize('admin'), controller.getAllUsers)
router.put('/users/:id/ban',       protect, authorize('admin'), controller.banUser)
router.put('/users/:id/unban',     protect, authorize('admin'), controller.unbanUser)
router.delete('/listings/:id',     protect, authorize('admin'), controller.removeListing)
router.get('/stats',               protect, authorize('admin'), controller.getStats)

module.exports = router
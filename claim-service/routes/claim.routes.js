const express    = require('express')
const router     = express.Router()
const controller = require('../controllers/claim.controller')
const { protect } = require('../middleware/auth')
const { submitClaimValidator } = require('../validators/claim.validators')


router.post('/',                protect, submitClaimValidator, controller.submitClaim)
router.get('/my',               protect, controller.getMyClaims)
router.get('/listing/:id',      protect, controller.getClaimsForListing)
router.put('/:id/approve',      protect, controller.approveClaim)
router.put('/:id/reject',       protect, controller.rejectClaim)

module.exports = router
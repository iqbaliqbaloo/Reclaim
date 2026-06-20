const express    = require('express')
const router     = express.Router()
const controller = require('../controllers/match.controller')
const { protect } = require('../middleware/auth')
const {
  scoreValidator,
  getMatchesValidator
} = require('../validators/match.validators')

/*
  POST /matches/score
  Called by listing-service — no auth needed
  listing-service passes token in body for service-to-service calls
*/
router.post(
  '/score',
  scoreValidator,
  controller.scoreNewListing
)

/*
  GET /matches/my
  Must come before /matches/listing/:id
*/
router.get(
  '/my',
  protect,
  controller.getMatchesForUser
)

/*
  GET /matches/listing/:id
  ?type=lost or ?type=found required
*/
router.get(
  '/listing/:id',
  protect,
  getMatchesValidator,
  controller.getMatchesForListing
)

/*
  PUT /matches/:id/dismiss
*/
router.put(
  '/:id/dismiss',
  protect,
  controller.dismissMatch
)

module.exports = router
const { body, validationResult } = require('express-validator')

const handleValidation = (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    console.log('[validators] failed:', errors.array())
    return res.status(400).json({
      success: false,
      error:   'Validation failed',
      details: errors.array().map(e => ({ field: e.path, message: e.msg }))
    })
  }
  next()
}


const submitClaimValidator = [
  body('listingId')
    .notEmpty().withMessage('listingId is required')
    .isInt({ min: 1 }).withMessage('listingId must be positive integer'),

  body('claimDescription')
    .notEmpty().withMessage('Claim description is required')
    .isLength({ min: 20 }).withMessage('Description must be at least 20 characters')
    .isLength({ max: 2000 }).withMessage('Description max 2000 characters')
    .trim(),

  handleValidation
]

module.exports = { submitClaimValidator }
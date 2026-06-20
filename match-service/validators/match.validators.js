/*
  ============================================================
  VALIDATORS — match route input validation
  ============================================================
*/

const { body, query, validationResult } = require('express-validator')

const handleValidation = (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    console.log('[validators] validation failed:', errors.array())
    return res.status(400).json({
      success: false,
      error:   'Validation failed',
      details: errors.array().map(e => ({
        field:   e.path,
        message: e.msg
      }))
    })
  }
  console.log('[validators] validation passed')
  next()
}


const scoreValidator = [
  body('listingId')
    .notEmpty().withMessage('listingId is required')
    .isInt({ min: 1 }).withMessage('listingId must be a positive integer'),

  body('userId')
    .notEmpty().withMessage('userId is required'),

  body('type')
    .notEmpty().withMessage('type is required')
    .isIn(['lost', 'found']).withMessage('type must be lost or found'),

  body('title')
    .notEmpty().withMessage('title is required'),

  body('description')
    .notEmpty().withMessage('description is required'),

  body('category')
    .notEmpty().withMessage('category is required')
    .isIn([
      'electronics', 'wallet', 'keys', 'pets',
      'bags', 'documents', 'clothing', 'other'
    ]).withMessage('Invalid category'),

  body('latitude')
    .notEmpty().withMessage('latitude is required')
    .isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),

  body('longitude')
    .notEmpty().withMessage('longitude is required')
    .isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),

  body('date_occurred')
    .notEmpty().withMessage('date_occurred is required')
    .isDate().withMessage('Invalid date format'),

  handleValidation
]


const getMatchesValidator = [
  query('type')
    .notEmpty().withMessage('type is required')
    .isIn(['lost', 'found']).withMessage('type must be lost or found'),

  handleValidation
]

module.exports = {
  scoreValidator,
  getMatchesValidator
}
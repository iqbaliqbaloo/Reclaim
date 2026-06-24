const { body, query, validationResult } = require('express-validator')

const handleValidation = (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error:   'Validation failed',
      details: errors.array().map(e => ({ field: e.path, message: e.msg }))
    })
  }
  next()
}

const createListingValidator = [
  body('type')
    .notEmpty().withMessage('Type is required')
    .isIn(['lost', 'found']).withMessage('Type must be lost or found'),

  body('title')
    .notEmpty().withMessage('Title is required')
    .isLength({ max: 120 }).withMessage('Title max 120 characters')
    .trim(),

  body('description')
    .notEmpty().withMessage('Description is required')
    .trim(),

  body('category')
    .notEmpty().withMessage('Category is required')
    .isIn(['electronics', 'wallet', 'keys', 'pets', 'bags', 'documents', 'clothing', 'other'])
    .withMessage('Invalid category'),

  body('date_occurred')
    .notEmpty().withMessage('Date is required')
    .isDate().withMessage('Invalid date format (use YYYY-MM-DD)'),

  body('location_label')
    .notEmpty().withMessage('Location label is required')
    .isLength({ max: 200 }).withMessage('Location label max 200 characters')
    .trim(),

  body('latitude')
    .notEmpty().withMessage('Latitude is required')
    .isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),

  body('longitude')
    .notEmpty().withMessage('Longitude is required')
    .isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),

  body('reward_offered')
    .optional()
    .isBoolean().withMessage('reward_offered must be true or false'),

  body('reward_note')
    .optional()
    .isLength({ max: 500 }).withMessage('Reward note max 500 characters')
    .trim(),

  handleValidation
]

const updateListingValidator = [
  body('title')
    .optional()
    .isLength({ max: 120 }).withMessage('Title max 120 characters')
    .trim(),

  body('description').optional().trim(),

  body('category')
    .optional()
    .isIn(['electronics', 'wallet', 'keys', 'pets', 'bags', 'documents', 'clothing', 'other'])
    .withMessage('Invalid category'),

  body('date_occurred')
    .optional()
    .isDate().withMessage('Invalid date format'),

  body('location_label')
    .optional()
    .isLength({ max: 200 }).withMessage('Location label max 200 characters')
    .trim(),

  body('latitude')
    .optional()
    .isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),

  body('longitude')
    .optional()
    .isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),

  body('reward_offered')
    .optional()
    .isBoolean().withMessage('reward_offered must be true or false'),

  body('reward_note')
    .optional()
    .isLength({ max: 500 }).withMessage('Reward note max 500 characters')
    .trim(),

  handleValidation
]

const searchValidator = [
  query('type')
    .optional()
    .isIn(['lost', 'found']).withMessage('Type must be lost or found'),

  query('category')
    .optional()
    .isIn(['electronics', 'wallet', 'keys', 'pets', 'bags', 'documents', 'clothing', 'other'])
    .withMessage('Invalid category'),

  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive number'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 }).withMessage('Limit must be 1-50'),

  handleValidation
]

module.exports = { createListingValidator, updateListingValidator, searchValidator }

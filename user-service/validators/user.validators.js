const { body, validationResult } = require('express-validator')

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

const updateProfileValidator = [
  body('name').optional().isLength({ max: 100 }).withMessage('Name max 100 characters').trim(),
  body('phone').optional().isLength({ max: 20 }).withMessage('Phone max 20 characters').trim(),
  body('avatar_url').optional().isURL().withMessage('Avatar must be a valid URL'),
  handleValidation
]

const banValidator = [
  body('reason')
    .notEmpty().withMessage('Ban reason is required')
    .isLength({ max: 500 }).withMessage('Reason max 500 characters')
    .trim(),
  handleValidation
]

const createProfileValidator = [
  body('authId').notEmpty().withMessage('authId is required'),
  body('email')
    .notEmpty().withMessage('email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),
  body('role').optional().isIn(['visitor', 'user', 'admin']).withMessage('Invalid role'),
  handleValidation
]

module.exports = { updateProfileValidator, banValidator, createProfileValidator }

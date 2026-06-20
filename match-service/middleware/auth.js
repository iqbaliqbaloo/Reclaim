/*
  Same pattern as all services
  Shared JWT_SECRET verifies tokens from auth-service
*/

const jwt = require('jsonwebtoken')

const protect = (req, res, next) => {
  console.log('[auth.middleware] protect() called')

  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error:   'No token provided. Please login.'
    })
  }

  const token = authHeader.split(' ')[1]

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    console.log('[auth.middleware] token valid, userId:', decoded.userId)

    req.user = {
      userId: decoded.userId,
      email:  decoded.email,
      role:   decoded.role
    }
    next()
  } catch (err) {
    console.log('[auth.middleware] token invalid:', err.message)
    return res.status(401).json({
      success: false,
      error:   'Invalid or expired token. Please login again.'
    })
  }
}

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Not authenticated' })
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error:   `Access denied. Required: ${roles.join(' or ')}`
      })
    }
    next()
  }
}

module.exports = { protect, authorize }
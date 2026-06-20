const axios = require('axios')
const jwt = require('jsonwebtoken')

const protect = async (req, res, next) => {
  console.log('[auth.middleware] protect() called')
  console.log('[auth.middleware] authorization header:',
    req.headers.authorization ? 'PRESENT' : 'MISSING'
  )

  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error:   'No token provided. Please login.'
    })
  }

  const token = authHeader.split(' ')[1]

  try {
   const response = await axios.get(`${process.env.AUTH_SERVICE_URL}/api/auth/me`, {
      headers:{Authorization :`Bearer ${token}`},
    })
    req.user=response.data.data
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
    console.log('[auth.middleware] authorize() called')
    console.log('[auth.middleware] user role:', req.user?.role)
    console.log('[auth.middleware] required roles:', roles)

    if (!req.user) {
      return res.status(401).json({
        success: false,
        error:   'Not authenticated'
      })
    }

    if (!roles.includes(req.user.role)) {
      console.log('[auth.middleware] access denied')
      return res.status(403).json({
        success: false,
        error:   `Access denied. Required: ${roles.join(' or ')}`
      })
    }

    console.log('[auth.middleware] access granted')
    next()
  }
}

module.exports = { protect, authorize }
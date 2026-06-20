const jwt = require('jsonwebtoken')

const protect = (req, res, next) => {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'No token provided' })
  }
  try {
    const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET)
    req.user = { userId: decoded.userId, email: decoded.email, role: decoded.role }
    console.log('[auth.middleware] userId:', decoded.userId, 'role:', decoded.role)
    next()
  } catch {
    return res.status(401).json({ success: false, error: 'Invalid or expired token' })
  }
}

const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role)) {
    return res.status(403).json({ success: false, error: `Access denied. Required: ${roles.join(' or ')}` })
  }
  next()
}

module.exports = { protect, authorize }
const authService = require('../services/auth.service')
const passport = require('passport')

const register = async (req, res) => {
  try {
    const result = await authService.registerUser(req.body)
    return res.status(201).json({ success: true, data: result, message: result.message })
  } catch (err) {
    return res.status(err.statusCode || 500).json({ success: false, error: err.message })
  }
}

const login = async (req, res) => {
  try {
    const { accessToken, refreshToken, user } = await authService.loginUser(req.body.email, req.body.password)
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
      maxAge:   7 * 24 * 60 * 60 * 1000
    })
    return res.status(200).json({ success: true, data: { accessToken, user }, message: 'Login successful' })
  } catch (err) {
    return res.status(err.statusCode || 500).json({ success: false, error: err.message })
  }
}

const logout = async (req, res) => {
  try {
    await authService.logoutUser(req.user._id, req.cookies.refreshToken)
    res.clearCookie('refreshToken')
    return res.status(200).json({ success: true, data: null, message: 'Logged out successfully' })
  } catch (err) {
    return res.status(err.statusCode || 500).json({ success: false, error: err.message })
  }
}

const logoutAll = async (req, res) => {
  try {
    await authService.logoutAllDevices(req.user._id)
    res.clearCookie('refreshToken')
    return res.status(200).json({ success: true, data: null, message: 'Logged out from all devices successfully' })
  } catch (err) {
    return res.status(err.statusCode || 500).json({ success: false, error: err.message })
  }
}

const refresh = async (req, res) => {
  try {
    const { accessToken, refreshToken } = await authService.refreshAccessToken(req.cookies.refreshToken)
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
      maxAge:   7 * 24 * 60 * 60 * 1000
    })
    return res.status(200).json({ success: true, data: { accessToken }, message: 'Token refreshed' })
  } catch (err) {
    return res.status(err.statusCode || 500).json({ success: false, error: err.message })
  }
}

const resendVerification = async (req, res) => {
  try {
    const result = await authService.resendVerificationEmail(req.body.email)
    return res.status(200).json({ success: true, data: null, message: result.message })
  } catch (err) {
    return res.status(err.statusCode || 500).json({ success: false, error: err.message })
  }
}

const verifyEmail = async (req, res) => {
  try {
    const result = await authService.verifyEmail(req.params.token)
    return res.status(200).json({ success: true, data: null, message: result.message })
  } catch (err) {
    return res.status(err.statusCode || 500).json({ success: false, error: err.message })
  }
}

const forgotPassword = async (req, res) => {
  try {
    const result = await authService.forgetPassword(req.body.email)
    return res.status(200).json({ success: true, data: null, message: result.message })
  } catch (err) {
    return res.status(err.statusCode || 500).json({ success: false, error: err.message })
  }
}

const resetPassword = async (req, res) => {
  try {
    const result = await authService.resetPassword(req.params.token, req.body.newPassword)
    return res.status(200).json({ success: true, data: null, message: result.message })
  } catch (err) {
    return res.status(err.statusCode || 500).json({ success: false, error: err.message })
  }
}

const googleAuth = (req, res, next) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.redirect(`${process.env.FRONTEND_URL}/login?error=google_not_configured`)
  }
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next)
}

const googleCallback = (req, res, next) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.redirect(`${process.env.FRONTEND_URL}/login?error=google_not_configured`)
  }
  passport.authenticate('google', { session: false }, async (err, result) => {
    if (err || !result) {
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=google_auth_failed`)
    }
    const { accessToken, refreshToken, user } = result
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
      maxAge:   7 * 24 * 60 * 60 * 1000
    })
    res.redirect(`${process.env.FRONTEND_URL}/auth/success?token=${accessToken}`)
  })(req, res, next)
}

const getMe = async (req, res) => {
  return res.status(200).json({ success: true, data: req.user, message: 'User info retrieved' })
}

const User = require('../models/user.model')

const getUserEmail = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('email')
    if (!user) return res.status(404).json({ success: false, error: 'User not found' })
    return res.status(200).json({ success: true, data: { email: user.email } })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

module.exports = {
  register,
  resendVerification,
  login,
  logout,
  logoutAll,
  refresh,
  verifyEmail,
  forgotPassword,
  resetPassword,
  googleAuth,
  googleCallback,
  getMe,
  getUserEmail
}

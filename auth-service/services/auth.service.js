const jwt    = require('jsonwebtoken')
const { v4: uuidv4 } = require('uuid')
const axios  = require('axios')
const User   = require('../models/user.model')
const { sendEmail } = require('./email.service')

const generateTokens = (id, email, role) => {
  const accessToken = jwt.sign({ id, email, role }, process.env.JWT_SECRET, { expiresIn: '15m' })
  const refreshToken = jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' })
  return { accessToken, refreshToken }
}

const callUserService = async (method, path, data) => {
  try {
    const response = await axios({
      method,
      url:     `${process.env.USER_SERVICE_URL}${path}`,
      data,
      timeout: 5000,
      headers: { 'x-internal-secret': process.env.INTERNAL_SECRET }
    })
    return response.data
  } catch (err) {
    console.error('[auth.service] user-service call failed:', err.message)
  }
}

const registerUser = async (data) => {
  const { email, password } = data
  const existing = await User.findOne({ email })
  if (existing) {
    const err = new Error('Email already registered')
    err.statusCode = 409
    throw err
  }
  const emailVerifyToken = uuidv4()
  const user = new User({ email, password, emailVerifyToken })
  await user.save()
  await callUserService('post', '/api/users/internal/create-profile', {
    authId: user._id.toString(),
    email:  user.email,
    role:   user.role
  })
  await sendVerificationEmail(email, emailVerifyToken)
  return {
    user: { _id: user._id, email: user.email, role: user.role, isEmailVerified: user.isEmailVerified },
    message: 'Verification email sent. Please check your inbox.'
  }
}

const resendVerificationEmail = async (email) => {
  const user = await User.findOne({ email })
  if (!user) {
    return { message: 'If that email is registered, a verification link has been sent.' }
  }
  if (user.isEmailVerified) {
    const err = new Error('Email is already verified.')
    err.statusCode = 400
    throw err
  }
  const emailVerifyToken = uuidv4()
  user.emailVerifyToken = emailVerifyToken
  await user.save()
  await sendVerificationEmail(email, emailVerifyToken)
  return { message: 'Verification email resent. Please check your inbox.' }
}

const loginUser = async (email, password) => {
  const user = await User.findOne({ email })
  if (!user) {
    const err = new Error('Invalid email or password')
    err.statusCode = 401
    throw err
  }
  if (user.isBanned) {
    const err = new Error(`Account banned. Reason: ${user.banReason}`)
    err.statusCode = 403
    throw err
  }
  const isMatch = await user.comparePassword(password)
  if (!isMatch) {
    const err = new Error('Invalid email or password')
    err.statusCode = 401
    throw err
  }
  if (!user.isEmailVerified) {
    const err = new Error('Please verify your email before logging in.')
    err.statusCode = 403
    throw err
  }
  const { accessToken, refreshToken } = generateTokens(user._id, user.email, user.role)
  user.refreshTokens.push(refreshToken)
  await user.save()
  return { accessToken, refreshToken, user: { _id: user._id, email: user.email, role: user.role } }
}

const refreshAccessToken = async (refreshToken) => {
  if (!refreshToken) {
    const err = new Error('No refresh token provided')
    err.statusCode = 401
    throw err
  }
  let decoded
  try {
    decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET)
  } catch (_err) {
    const err = new Error('Invalid or expired refresh token')
    err.statusCode = 401
    throw err
  }
  const user = await User.findById(decoded.id)
  if (!user) {
    const err = new Error('User not found')
    err.statusCode = 401
    throw err
  }
  const tokenIndex = user.refreshTokens.indexOf(refreshToken)
  if (tokenIndex === -1) {
    user.refreshTokens = []
    await user.save()
    const err = new Error('Refresh token reuse detected. Please login again.')
    err.statusCode = 401
    throw err
  }
  const { accessToken: newAccessToken, refreshToken: newRefreshToken } = generateTokens(user._id, user.email, user.role)
  user.refreshTokens.splice(tokenIndex, 1)
  user.refreshTokens.push(newRefreshToken)
  await user.save()
  return { accessToken: newAccessToken, refreshToken: newRefreshToken }
}

const logoutUser = async (userId, refreshToken) => {
  const user = await User.findById(userId)
  if (user && refreshToken) {
    user.refreshTokens = user.refreshTokens.filter(t => t !== refreshToken)
    await user.save()
  }
  return { message: 'Logged out successfully' }
}

const logoutAllDevices = async (userId) => {
  const user = await User.findById(userId)
  if (user) {
    user.refreshTokens = []
    await user.save()
  }
  return { message: 'Logged out from all devices successfully' }
}

const verifyEmail = async (token) => {
  const user = await User.findOne({ emailVerifyToken: token })
  if (!user) {
    const err = new Error('Invalid or expired verification token')
    err.statusCode = 400
    throw err
  }
  user.isEmailVerified = true
  user.role = 'user'
  user.emailVerifyToken = null
  await user.save()
  await callUserService('post', '/api/users/internal/update-role', {
    authId: user._id.toString(),
    role:   'user'
  })
  return { message: 'Email verified successfully. You can now login.' }
}

const forgetPassword = async (email) => {
  const user = await User.findOne({ email })
  if (user) {
    const resetToken = uuidv4()
    user.resetToken = resetToken
    user.resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000)
    await user.save()
    await sendPasswordResetEmail(email, resetToken)
  }
  return { message: 'If an account with that email exists, a reset link has been sent.' }
}

const resetPassword = async (token, newPassword) => {
  const user = await User.findOne({ resetToken: token })
  if (!user) {
    const err = new Error('Invalid or expired reset token')
    err.statusCode = 400
    throw err
  }
  if (user.resetTokenExpiry < new Date()) {
    const err = new Error('Reset token has expired. Please request a new one.')
    err.statusCode = 400
    throw err
  }
  user.password = newPassword
  user.resetToken = null
  user.resetTokenExpiry = null
  user.refreshTokens = []
  await user.save()
  return { message: 'Password reset successfully. Please login with your new password.' }
}

const handleGoogleUser = async (googleProfile) => {
  const email    = googleProfile.emails[0].value
  const googleId = googleProfile.id
  let user = await User.findOne({ googleId })
  if (!user) {
    user = await User.findOne({ email })
    if (user) {
      user.googleId = googleId
      user.isEmailVerified = true
      if (user.role === 'visitor') user.role = 'user'
      await user.save()
      await callUserService('post', '/api/users/internal/update-role', {
        authId: user._id.toString(),
        role:   user.role
      })
    } else {
      user = new User({ email, googleId, isEmailVerified: true, role: 'user' })
      await user.save()
      await callUserService('post', '/api/users/internal/create-profile', {
        authId: user._id.toString(),
        email:  user.email,
        role:   user.role
      })
    }
  }
  if (user.isBanned) {
    const err = new Error(`Account banned. Reason: ${user.banReason}`)
    err.statusCode = 403
    throw err
  }
  const { accessToken, refreshToken } = generateTokens(user._id, user.email, user.role)
  user.refreshTokens.push(refreshToken)
  await user.save()
  return { accessToken, refreshToken, user: { _id: user._id, email: user.email, role: user.role } }
}

const sendVerificationEmail = async (email, token) => {
  const link = `${process.env.FRONTEND_URL}/auth/verify-email?token=${token}`
  await sendEmail({
    to:      email,
    subject: 'Reclaim - Verify your email',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:32px;background:#f9f9f9;border-radius:8px;">
        <h2 style="margin:0 0 8px;color:#111;">Welcome to Reclaim</h2>
        <p style="color:#555;margin:0 0 24px;">Click the button below to verify your email and activate your account.</p>
        <a href="${link}"
           style="display:inline-block;padding:12px 28px;background:#6366f1;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;font-size:15px;">
          Verify Email
        </a>
        <p style="color:#888;font-size:12px;margin:24px 0 4px;">If the button doesn't work, copy and paste this link into your browser:</p>
        <p style="word-break:break-all;font-size:12px;color:#6366f1;margin:0;">${link}</p>
      </div>
    `
  })
  return link
}

const sendPasswordResetEmail = async (email, token) => {
  const link = `${process.env.FRONTEND_URL}/reset-password?token=${token}`
  await sendEmail({
    to:      email,
    subject: 'Reclaim - Reset your password',
    html:    `<h2>Password Reset</h2><p>Click the link below to reset your password.</p><a href="${link}">Reset Password</a><p>This link expires in 1 hour.</p><p>If you did not request this, ignore this email.</p>`
  })
}

module.exports = {
  registerUser,
  resendVerificationEmail,
  loginUser,
  refreshAccessToken,
  logoutUser,
  logoutAllDevices,
  verifyEmail,
  forgetPassword,
  resetPassword,
  handleGoogleUser,
  generateTokens
}

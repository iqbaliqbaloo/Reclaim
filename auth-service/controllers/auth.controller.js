const authService = require('../services/auth.service')
const passport = require('passport')
const{v4:uuidv4} =require('uuid')

const register =async(req,res)=>{
    try{
        console.log('[auth.controller] register called')
         console.log('[auth.controller] req.body received:', {
      email:    req.body.email,
      password: '***hidden***'
    })
    const result = await authService.registerUser(req.body)
    console.log('[auth.controller] sending register response:', result)
    return res.status(201).json({
      success: true,
      data:    result,
      message: result.message
    })
    }catch(err){
        console.error('[auth.controller] register error:', err.message)
    return res.status(err.statusCode || 500).json({
      success: false,
      error:   err.message
    })
    }
}
const login = async (req,res)=>{
    try{
        console.log('[auth.controller] login called')
    console.log('[auth.controller] req.body received:', {
      email:    req.body.email,
      password: '***hidden***'
    })
    const {accessToken,refreshToken,user} = await authService.loginUser(req.body.email,req.body.password)
    res.cookie('refreshToken',refreshToken,{
        httpOnly:true,
        secure:false,
        sameSite:'Lax',
        maxAge:7*24*60*60*1000
    })
     console.log('[auth.controller] refresh token set as httpOnly cookie')
    console.log('[auth.controller] sending login response')
    return res.status(200).json({
      success: true,
      data:    { accessToken, user },
      message: 'Login successful'
    })
    }catch(err){
        console.error('[auth.controller] login error:', err.message)
    return res.status(err.statusCode || 500).json({
      success: false,
      error:   err.message
    })
    }
}
const logout = async (req,res)=>{
    try{
        console.log('[auth.controller] logout called')
    console.log('[auth.controller] req.user:', req.user)
    console.log('[auth.controller] req.cookies.refreshToken present:', !!req.cookies.refreshToken)
    await authService.logoutUser(req.user.userId,req.cookies.refreshToken)
    res.clearCookie(refreshToken)
    console.log('[auth.controller] refreshToken cookie cleared')
     return res.status(200).json({
      success: true,
      data:    null,
      message: 'Logged out successfully'
    })
    }catch(err){
         console.error('[auth.controller] logout error:', err.message)
    return res.status(err.statusCode || 500).json({
      success: false,
      error:   err.message
    })
    }
}
const refresh =async(req,res)=>{
    try{
        console.log('[auth.controller] refresh called')
    console.log('[auth.controller] req.cookies:', req.cookies)
    console.log('[auth.controller] refreshToken in cookie:', !!req.cookies.refreshToken)
    const {accessToken,refreshToken} =await authService.refreshAccessToken(req.cookies.refreshToken)
    res.cookie('refreshToken',refreshToken,{
        httpOnly:true,
        secure:false,
        sameSite:'Lax',
        maxAge:7 * 24 * 60 * 60 * 1000
    })
    console.log('[auth.controller] new tokens issued and cookie set')
    return res.status(200).json({
      success: true,
      data:    { accessToken },
      message: 'Token refreshed'
    })
    }catch(err){
         console.error('[auth.controller] refresh error:', err.message)
    return res.status(err.statusCode || 500).json({
      success: false,
      error:   err.message
    })
    }
}
const verifyEmail = async(req,res)=>{
    try{
        console.log('[auth.controller] verifyEmail called')
    // DATA IN: URL param
    console.log('[auth.controller] req.params.token:', req.params.token)
    const result = await authService.verifyEmail(req.params.token)
    return res.status(200).json({
      success: true,
      data:    null,
      message: result.message
    })
    }catch(err){
        console.error('[auth.controller] verifyEmail error:', err.message)
    return res.status(err.statusCode || 500).json({
      success: false,
      error:   err.message
    })
    }
}
const forgotPassword = async (req,res)=>{
    try{
        console.log('[auth.controller] forgotPassword called')
    console.log('[auth.controller] req.body.email:', req.body.email)
    const result = await authService.forgetPassword(req.body.email)
     return res.status(200).json({
      success: true,
      data:    null,
      message: result.message
     })
    }catch(err){
         console.error('[auth.controller] forgotPassword error:', err.message)
    return res.status(err.statusCode || 500).json({
      success: false,
      error:   err.message
    })
    }
}
const resetPassword =async(req,res)=>{
    try{
        console.log('[auth.controller] resetPassword called')
    console.log('[auth.controller] req.params.token:', req.params.token)
    console.log('[auth.controller] req.body.newPassword: ***hidden***')
    const result = await authService.resetPassword(req.params.token,req.body.newPassword)
    return res.status(200).json({
      success: true,
      data:    null,
      message: result.message
    })
    }catch(err){
         console.error('[auth.controller] resetPassword error:', err.message)
    return res.status(err.statusCode || 500).json({
      success: false,
      error:   err.message
    })
    }
}
const googleAuth =(req,res,next)=>{
   console.log('[auth.controller] googleAuth — starting OAuth flow')
   passport.authenticate('google',{
    scope:['profile','email'],
    state
   })(req,res,next
   )
}
const googleCallback =(req,res,next)=>{
  console.log('[auth.controller] googleCallback called')
  console.log('[auth.controller] query params from Google:', req.query)
   passport.authenticate('google',{session:false},async(err,result)=>{
    if(err || !result){
       console.error('[auth.controller] Google OAuth failed:', err?.message)
      return res.redirect(
        `${process.env.FRONTEND_URL}/login?error=google_auth_failed`
      )
    }
    const {accessToken,refreshToken,user} = result
    console.log('[auth.controller] Google OAuth success for user:', user.email)
     res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure:  false,
      sameSite: 'Lax',
      maxAge:   7 * 24 * 60 * 60 * 1000
    })
    console.log('[auth.controller] redirecting to frontend with token')
    res.redirect(
      `${process.env.FRONTEND_URL}/auth/success?token=${accessToken}`
    )
   })(req,res,next)
}
const getMe =async(req,res)=>{
  console.log('[auth.controller] getMe called')
  console.log('[auth.controller] req.user:', req.user)
  return res.status(200).json({
    success: true,
    data:    req.user,
    message: 'User info retrieved'
  })
}
module.exports = {
  register,
  login,
  logout,
  refresh,
  verifyEmail,
  forgotPassword,
  resetPassword,
  googleAuth,
  googleCallback,
  getMe
}
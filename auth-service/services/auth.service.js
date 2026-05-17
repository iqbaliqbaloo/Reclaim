const jwt = require('jsonwebtoken')
const {v4:uuidv4} = require('uuid')
const axios = require('axios')
const User= require('../models/user.model')
const {sendEmail} = require('./email.service')

const generateTokens =(user) =>{
    console.log('[auth.service] generating tokens for user:', user._id)
    const accessToken = jwt.sign(
        {
            userId:user._id,
            email:user.email,
            role:user.role
        },
        process.env.JWT_SECRET,
        {expiresIn:'15m'}
    )
    const refreshToken = jwt.sign(
        {userId:user._id},
        process.env.JWT_REFRESH_SECRET,
        {expiresIn:'7d'}
    )
    console.log('[auth.service] tokens generated successfully')
  console.log('[auth.service] access token expires: 15 minutes')
  console.log('[auth.service] refresh token expires: 7 days')

  return {accessToken,refreshToken}
}
const callUserService = async (method, path, data) => {
  try {
    console.log('[auth.service] calling user-service:', method, path)
    console.log('[auth.service] data sent to user-service:', data)

    const response = await axios({
      method,
      url:     `${process.env.USER_SERVICE_URL}${path}`,
      data,
      timeout: 5000
    })

    console.log('[auth.service] user-service response:', response.data)
    return response.data
  } catch (err) {
    console.error('[auth.service] user-service call failed:', err.message)
    // do not throw — user-service failure should not break auth
  }
}
const registerUser = async (data)=>{
    const {email,password} = data
    console.log('[auth.service] registerUser called')
  console.log('[auth.service] data received:', { email, password: '***hidden***' })
  const existing = await User.findOne({email})
  console.log('[auth.service] existing user check:', existing ? 'FOUND — duplicate' : 'NOT FOUND — ok')
  if(existing){
    const err = new Error('Email already registered')
    err.statusCode=409
    throw err
  }
  const emailVerifyToken=uuidv4()
   console.log('[auth.service] email verify token generated:', emailVerifyToken)

   const user = new User({
    email,
    password,
    emailVerifyToken
   })
   await user.save()
   console.log('[auth.service] user saved to MongoDB')
  console.log('[auth.service] user._id:', user._id)
  console.log('[auth.service] user.role:', user.role)
  await callUserService('post', '/api/users/internal/create-profile', {
  authId: user._id.toString(),
  email:  user.email,
  role:   user.role
})
console.log('[auth.service] user-service profile creation called')
  await sendVerificationEmail(email,emailVerifyToken)

  const userResponse ={
    _id: user._id,
    email:user.email,
    role: user.role,
    isEmailVerified:user.isEmailVerified
  }
  console.log('[auth.service] registerUser response:', userResponse)
  return{user:userResponse,message:'Verification email sent.Please check inbox'}
}
const loginUser = async (email,password)=>{
  console.log('[auth.service] loginUser called')
  console.log('[auth.service] email received:', email)

  const user = await User.findOne({email})
  console.log('[auth.service] user found:', user ? 'YES' : 'NO')

  if(!user){
    const err = new Error('invalid email or password')
    err.statusCode=401
    throw err
  }
  console.log('[auth.service] user.isBanned:', user.isBanned)
  
    if(user.isBanned){
      const err = new Error(`Acccount banned.Reason:${user.banReason}`)
      err.statusCode = 403
      throw err
    }
    const isMatch = await user.comparePassword(password)
    console.log('[auth.service] password match:', isMatch)
    if(!isMatch){
      const err = new Error('invalid email or password')
      err.statusCode=401
      throw err
    }
    const {accessToken,refreshToken} = generateTokens(user)
    user.refreshTokens.push(refreshToken)
    await user.save()
    console.log('[auth.service] refresh token saved to MongoDB')
  console.log('[auth.service] total active sessions:', user.refreshTokens.length)
  const userResponse={
    _id:user._id,
    email:user.email,
    role:user.role
  }
  console.log('[auth.service] loginUser response data:', userResponse)
  return{accessToken,refreshToken,user:userResponse}
}
const refreshAccessToken = async (refreshToken)=>{
   console.log('[auth.service] refreshAccessToken called')
  console.log('[auth.service] refresh token received (first 20 chars):', refreshToken?.substring(0, 20))

  if(!refreshToken){
    const err = new Error('No refreshtoken provided')
    err.statusCode=401
    throw err
  }
  let decode
  try{
    decoded =jwt.verify(refreshToken,process.env.JWT_REFRESH_SECRET)
    console.log('[auth.service] refresh token decoded:', decoded)
  }catch(e){
    const err = new Error('invalid or expired refresh token')
    err.statusCode=401
    throw err
  }
  const user = await User.findById(decoded.userId)
  console.log('[auth.service] user found for refresh:', user ? 'YES' : 'NO')
  if(!user){
    const err = new Error('Usernot found')
    err.statusCode=401
    throw err
  }
  const tokenIndex = user.refreshToken.indexOf(refreshToken)
  console.log('[auth.service] token index in array:', tokenIndex)
  if(tokenIndex===-1){
    user.refreshTokens=[]
    await user.save()
     console.log('[auth.service] SECURITY: token not found — all sessions cleared')
    const err = new Error('Refresh token reuse detected. Please login again.')
    err.statusCode = 401
    throw err
  }
  const {accessToken:newAccessToken,refreshToken:newRefreshToken}=generateTokens(user)
  user.refreshTokens.splice(tokenIndex,1)
  user.refreshTokens.push(newRefreshToken)
  await user.save()
  console.log('[auth.service] token rotated successfully')
  return {accessToken:newAccessToken,refreshToken:newRefreshToken}
}

const logoutUser = async(userId,refreshToken)=>{
    console.log('[auth.service] logoutUser called')
  console.log('[auth.service] userId:', userId)

  const user = await User.findById(userId)
  if(user && refreshToken){
    const before = user.refreshTokens.length
    user.refreshTokens=user.refreshTokens.filter(t=>t!==refreshToken)
    const after = user.refreshTokens.length
    await user.save()
    console.log('[auth.service] refresh tokens before:', before, 'after:', after)
  }
  return{message:'Logged out successfully'}
}
const verifyEmail = async(token)=>{
  console.log('[auth.service] verifyEmail called')
  console.log('[auth.service] token received:', token)
  const user = await User.findOne({emailVerifyToken:token})
  console.log('[auth.service] user found with token:', user ? 'YES' : 'NO')
  if(!user){
    const err = new Error('invalid or expired verification token')
    err.statusCode=400
    throw err
  }
  user.isEmailVerified=true
  user.role='user'
  user.emailVerifyToken=null
  await user.save()
   console.log('[auth.service] email verified — role upgraded to user')
  console.log('[auth.service] user._id:', user._id)
  
  await callUserService('post', '/api/users/internal/update-role', {
  authId: user._id.toString(),
  role:   'user'
})
console.log('[auth.service] user-service role update called')
  return { message: 'Email verified successfully. You can now login.' }
}
const forgetPassword = async(email)=>{
  console.log('[auth.service] forgotPassword called')
  console.log('[auth.service] email:', email)
  const user = await User.findOne({email})
   console.log('[auth.service] user found:', user ? 'YES' : 'NO (but still return success)')
   if(user){
   const resetToken =uuidv4()
   user.resetToken=resetToken
   user.resetTokenExpiry = new Date(Date.now()+60*60*1000)
   await user.save()
   console.log('[auth.service] reset token saved, expiry:', user.resetTokenExpiry)
    await sendPasswordResetEmail(email,resetToken)
   }
    return { message: 'If an account with that email exists, a reset link has been sent.' }
}
const resetPassword = async(token,newPassword)=>{
    console.log('[auth.service] resetPassword called')
  console.log('[auth.service] token received:', token)
  const user = await User.findOne({resetToken:token})
   console.log('[auth.service] user found with reset token:', user ? 'YES' : 'NO')
   if(!user){
      const err = new Error('Invalid or expired reset token')
    err.statusCode = 400
    throw err
   }
   console.log('[auth.service] token expiry:', user.resetTokenExpiry)
  console.log('[auth.service] current time:', new Date())
  if(user.resetTokenExpiry<new Date()){
     const err = new Error('Reset token has expired. Please request a new one.')
    err.statusCode = 400
    throw err
  }
  user.password=newPassword
  user.resetToken=null
  user.resetTokenExpiry=null
  user.refreshTokens=[]
  await user.save()

  console.log('[auth.service] password reset successfully')
  console.log('[auth.service] all sessions cleared for security')

  return { message: 'Password reset successfully. Please login with your new password.' }
}
const handleGoogleUser=async(googleProfile)=>{
  console.log('[auth.service] handleGoogleUser called')
  console.log('[auth.service] googleProfile.id:', googleProfile.id)
  console.log('[auth.service] googleProfile.email:', googleProfile.emails[0].value)

  const email=googleProfile.emails[0].value
  const googleId = googleProfile.id
  let user = await User.findOne({googleId})
  console.log('[auth.service] found by googleId:', user ? 'YES' : 'NO')
  if(!user){
    user = await User.findOne({email})
     console.log('[auth.service] found by email:', user ? 'YES — linking Google' : 'NO — creating new')
     if(user){
      user.googleId=googleId
      await user.save()
     }else{
      user=new User({
        email,
        googleId,
        isEmailVerified:true,
        role:'user'
      })
      await user.save()
       console.log('[auth.service] new user created via Google:', user._id)
     }
  }
  if(user.isBanned){
     const err = new Error(`Account banned. Reason: ${user.banReason}`)
    err.statusCode = 403
    throw err
  }
  const {accessToken,refreshToken}= generateTokens(user)
  user.refreshTokens.push(refreshToken)
  await user.save()

  console.log('[auth.service] Google login complete for:', user.email)
  return{
    accessToken,
    refreshToken,
    user:{_id:user._id,email:user.email,role:user.role}
  }
}
const sendVerificationEmail =async(email,token)=>{
  const link = `${process.env.FRONTEND_URL}/verify-email?token=${token}`
  console.log('[auth.service] sending verification email to:', email)
  console.log('[auth.service] verification link:', link)
  await sendEmail({
    to:email,
    subject:'Reclaim - Verify your email',
    html:`
     <h2>Welcome to Reclaim</h2>
      <p>Click the link below to verify your email and activate your account.</p>
      <a href="${link}">Verify Email</a>
      <p>This link does not expire.</p>
    `
  })
}
  const sendPasswordResetEmail = async (email,token)=>{
    const link = `${process.env.FRONTEND_URL}/reset-password?token=${token}`
      console.log('[auth.service] sending password reset email to:', email)
      console.log('[auth.service] reset link:', link)

      await sendEmail({
        to:email,
        subject:'Reclaim-Reset your password',
        html:`
         <h2>Password Reset</h2>
      <p>Click the link below to reset your password.</p>
      <a href="${link}">Reset Password</a>
      <p>This link expires in 1 hour.</p>
      <p>If you did not request this, ignore this email.</p>`
      })
  }
  module.exports={
    registerUser,
    loginUser,
    refreshAccessToken,
    logoutUser,
    verifyEmail,
    forgetPassword,
    resetPassword,
    handleGoogleUser,
    generateTokens
  }

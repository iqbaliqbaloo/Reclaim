const express = require('express')
const router=express.Router()
const controller = require('../controllers/auth.controller');
const {protect,authorize} = require('../middleware/auth')
const { loginLimiter } = require('../middleware/rateLimit')
const{
    registerValidator,
    loginValidator,
    forgotPasswordValidator,
    resetPasswordValidator
} = require('../validators/auth.validators');
router.post('/register',registerValidator,controller.register)
router.post('/login',loginLimiter,loginValidator,controller.login)
router.post('/refresh',controller.refresh)

router.get('/verify-email/:token',controller.verifyEmail)
router.post('/resend-verification',controller.resendVerification)

router.post('/forget-password',forgotPasswordValidator,controller.forgotPassword)

router.post('/reset-password/:token',resetPasswordValidator,controller.resetPassword)

router.get('/google',controller.googleAuth)

router.get('/google/callback',controller.googleCallback)
router.post('/logout',protect,authorize('user', 'admin'),controller.logout)
router.post('/logout-all', protect, authorize('user', 'admin'),controller.logoutAll) 
router.get('/me',protect,authorize('user', 'admin'),controller.getMe)
router.get('/user-email/:id', controller.getUserEmail)

module.exports = router
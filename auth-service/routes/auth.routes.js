const express = require('express')
const router=express.Router()
const controller = require('../controllers/auth.controller');
const {protect} = require('../middleware/auth')
const{
    registerValidator,
    loginValidator,
    forgotPasswordValidator,
    resetPasswordValidator
} = require('../validators/auth.validators');
router.post('/register',registerValidator,controller.register)
router.post('/login',loginValidator,controller.login)
router.post('/refresh',controller.refresh)

router.get('verify-email/:token',controller.verifyEmail)

router.post('/forget-password',forgotPasswordValidator,controller.forgotPassword)

router.post('/reset-password/:token',resetPasswordValidator,controller.resetPassword)

router.get('/google',controller.googleAuth)

router.get('google/callback',controller.googleCallback)
router.post('/logout',protect,controller.logout)
router.get('/me',protect,controller.getMe)

module.exports = router
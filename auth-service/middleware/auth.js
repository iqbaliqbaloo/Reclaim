const jwt = require('jsonwebtoken')
const user = require('../models/user.model')
const protect = async (req,res,next)=>{
     if(!authHeader || !authHeader.startsWith('Bearer')){
        console.log('[auth.middleware] no token — rejecting')
        return res.status(401).json({
        success: false,
        error:   'No token provided. Please login.'
    })
     }
     const token = authHeader.split(' ')[1]
     try{
        const decoded = jwt.verify(token,process.env.JWT_SECRET)
         req.user = await user.findById(decoded.id).select('-password')
         if(!req.user){
            return res.status(401).json({
                message:'User not found'
            })
         }
         next()
        }catch(err){
            return res.status(401).json({
             success: false,
             error:   'Invalid or expired token. Please login again.'
            })
        }
}
const authorize = (...roles)=>{
    return(req,res,next)=>{
         if(!req.user){
              return res.status(401).json({
                success: false,
                error:   'Not authenticated'
         })
         }
         if(!roles.includes(req.user.role)){
            return res.status(403).json({
                success: false,
                error:   `Access denied. Required role: ${roles.join(' or ')}`
            })
        }
        next()
    }
}
module.exports={protect,authorize}
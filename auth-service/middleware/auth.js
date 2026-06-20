const jwt = require('jsonwebtoken')
const user = require('../models/user.model')
const protect = async (req,res,next)=>{
     console.log('[auth.middleware] protect() called')
     console.log('[auth.middleware] authorization header:', req.headers.authorization ? 'PRESENT' : 'MISSING')
     
     const authHeader = req.headers.authorization
     if(!authHeader || !authHeader.startsWith('Bearer')){
        console.log('[auth.middleware] no token — rejecting')
        return res.status(401).json({
        success: false,
        error:   'No token provided. Please login.'
    })
     }
     const token = authHeader.split(' ')[1]
     console.log('[auth.middleware] token extracted (first 20 chars):', token.substring(0, 20))
     try{
        const decoded = jwt.verify(token,process.env.JWT_SECRET)
         console.log('[auth.middleware] token decoded successfully')
         console.log('[auth.middleware] decoded.id:', decoded.id)
         console.log('[auth.middleware] decoded.role:', decoded.role)
         console.log('[auth.middleware] token expires at:', new Date(decoded.exp * 1000))
         req.user = await user.findById(decoded.id).select('-password')
         if(!req.user){
            return res.status(401).json({
                message:'User not found'
            })
         }
         console.log('[auth.middleware] req.user set:', req.user)
         next()
        }catch(err){
             console.log('[auth.middleware] token verification failed:', err.message)
            return res.status(401).json({
             success: false,
             error:   'Invalid or expired token. Please login again.'
            })
        }
}
const authorize = (...roles)=>{
    return(req,res,next)=>{
         console.log('[auth.middleware] authorize() called')
         console.log('[auth.middleware] user role:', req.user?.role)
         console.log('[auth.middleware] required roles:', roles)
         if(!req.user){
              return res.status(401).json({
                success: false,
                error:   'Not authenticated'
         })
         }
         if(!roles.includes(req.user.role)){
            console.log('[auth.middleware] access denied — role not allowed')
            return res.status(403).json({
                success: false,
                error:   `Access denied. Required role: ${roles.join(' or ')}`
            })
        }
        console.log('[auth.middleware] access granted for role:', req.user.role)
        next()
    }
}
module.exports={protect,authorize}
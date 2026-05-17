const passport = require('passport')
const {Strategy:GoogleStrategy} =require('passport-google-oauth20')
const {handleGoogleUser} = require('./auth.service')

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    console.log('[passport.service] setting up Google OAuth strategy')
passport.use(
    new GoogleStrategy(
        {
            clientID:process.env.GOOGLE_CLIENT_ID,
            clientSecret:process.env.GOOGLE_CLIENT_SECRET,
            clientbackURL:process.env.GOOGLE_CALLBACK_URL,
            passReqToCallback:true
        },
        async(req,accessToken,refreshToken,profile,done)=>{
            try{
                console.log('[passport.service] Google callback received')
        console.log('[passport.service] profile.id:', profile.id)
        console.log('[passport.service] profile.email:', profile.emails[0].value)
        const result= await handleGoogleUser(profile)
         console.log('[passport.service] user handled:', result.user)
         return done(null,result)
            }catch(err){
                console.error('[passport.service] error:', err.message)
                return done(err,null)
            }
        }
    )
)
}else{
    console.log('[passport.service] Google OAuth skipped — credentials not set')
}
module.exports=passport
const passport = require('passport')
const { Strategy: GoogleStrategy } = require('passport-google-oauth20')
const { handleGoogleUser } = require('./auth.service')

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID:     process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL:  process.env.GOOGLE_CALLBACK_URL,
        passReqToCallback: true
      },
      async (req, accessToken, refreshToken, profile, done) => {
        try {
          const result = await handleGoogleUser(profile)
          return done(null, result)
        } catch (err) {
          return done(err, null)
        }
      }
    )
  )
}

module.exports = passport

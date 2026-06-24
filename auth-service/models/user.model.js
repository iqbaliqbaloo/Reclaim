const mongoose = require('mongoose')
const bcrypt   = require('bcryptjs')

const userSchema = new mongoose.Schema(
  {
    email: {
      type:      String,
      required:  true,
      unique:    true,
      lowercase: true,
      trim:      true
    },
    password: {
      type:    String,
      default: null
    },
    role: {
      type:    String,
      enum:    ['visitor', 'user', 'admin'],
      default: 'visitor'
    },
    isEmailVerified: {
      type:    Boolean,
      default: false
    },
    emailVerifyToken: {
      type:    String,
      default: null
    },
    resetToken: {
      type:    String,
      default: null
    },
    resetTokenExpiry: {
      type:    Date,
      default: null
    },
    refreshTokens: {
      type:    [String],
      default: []
    },
    googleId: {
      type:    String,
      default: null
    },
    isBanned: {
      type:    Boolean,
      default: false
    },
    banReason: {
      type:    String,
      default: null
    }
  },
  { timestamps: true }
)

userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next()
  this.password = await bcrypt.hash(this.password, 10)
  next()
})

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password)
}

const User = mongoose.model('User', userSchema)
module.exports = User

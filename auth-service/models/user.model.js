const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const userSchmea = new mongoose.Schema(
    {
        email:{
            type:String,
            required:true,
            unique:true,
            lowercase:true,
            trim:true
        },
        password:{
                type:String,
                default:null   
        },
        role:{
            type:String,
            enum:['visitor','role','admin'],
            default:'visitor'
        },
        isEmailVerified:{
            type:Booleand,
            default:false
        },
        emailVerifyToken:{
            type:String,
            default:null
        },
        resetToken:{
            type:String,
            default:null
        },
        resetTokenExpiry:{
            type:Date,
            default:null
        },
        refreshTokens:{
            type:[String],
            default:[]
        },
        googleId:{
            type:String,
            default:null
        },
        isBanned:{
            type:Boolean,
            default:false
        },
        banReason:{
            type:String,
            default:null
        }
    },
    {
        timestamps:true
    }
)
userSchmea.pre('save',async function(next){
    if(!this.isModified('password') || !this.password){
        return next()
    }
    console.log('[user.model] hashing password before save')
    this.password=await bcrypt.hash(this.password,10)
    console.log('[user.model] password hashed succesfully')
    next()
})
userSchmea.methods.comparePassword = async function (candidatePassword){
    console.log(']user.model comparing password...')
    const isMatch = await bcrypt.compare(candidatePassword,this.password)
    console.log('[user.model] password match result',isMatch)
    return isMatch
}
const User = mongoose.model('User',userSchmea)
module.exports =User
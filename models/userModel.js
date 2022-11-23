const mongoose = require('mongoose')
const validator = require('validator')
const bcrypt = require('bcrypt');
const crypto = require("crypto");
const { token } = require('morgan');

const userSchema = mongoose.Schema({
    name: {
        type : String,
        required: [true, 'please tell us your name'],
    },
    email: {
        type : String,
        required : [true , 'Please provide tour email'],
        unique : true,
        lowercase : true,
        validate : [validator.isEmail , 'Please provide a valid email']
    },
    photo: {
        type : String ,
        default : 'default.jpg'
    },
    role: {
        type: String,
        enum: ['user', 'guide', 'lead-guide', 'admin'],
        default: 'user'
      },
    password: {
        type : String,
        required : [true , 'Please provide a pasword'],
        minlength : 8,
        select : false ,
    },
    passwordResetToken : {
        type : String 
    },
    passwordResetExpires :{
        type : String 
    } ,
    passwordConfirm : {
        type : String,
        required : [true , 'please confirm password'],
        //This only work for .save() ans .create()
        validate : {
            validator: function(el) {
                return el === this.password;
            } , message : 'Passwords are not same' 
        }
    },
    passwordChangedAt : {
        type: Date
    }, 
    active : {
        type : Boolean ,
        default : true ,
        select : false
    }
    

})

userSchema.pre('save' , async function(next) {
    // Only run this function if the password is actully modified
    if(!this.isModified('password')) return next() ;
    // hash the password
    this.password = await bcrypt.hash(this.password , 12) ;
    // delete the confirm password
    this.passwordConfirm = undefined ;
    next();
})

userSchema.pre('save' , function(next){
    if(!this.isModified('password') || this.isNew) return next();

    this.passwordChangedAt =Date.now()-1000 ;
    next()
})

userSchema.pre(/^find/ , function(next){
    //this points to the current query
    this.find({active : { $ne : false}})
    next()
})

userSchema.methods.correctPassword = async function(candidatePassword , userPassword){
    return await bcrypt.compare(candidatePassword , userPassword)
}

userSchema.methods.changedPasswordAfter = function(JWTTimestamp){
    if(this.passwordChangedAt){
        const changedTimestamp = parseInt(this.passwordChangedAt.getTime()/1000 , 10)
        // console.log(changedTimestamp , JWTTimestamp);
        return JWTTimestamp < changedTimestamp
    }
    //false means NOT changed
    return false ;
}

userSchema.methods.createPasswordResetToken= function() {
    const resetToken = crypto.randomBytes(32).toString('hex');

    this.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    // console.log( {resetToken} , this.passwordResetToken);

    this.passwordResetExpires = Date.now() + 10 * 60 * 1000 ;

    return resetToken ;
    
}

const User = mongoose.model('User' , userSchema)

module.exports = User ;
const User = require('./../models/userModel');
const catchAsync = require('./../utils/catchAsync')
const jwt = require('jsonwebtoken');

const AppError = require('../utils/appError');
const util = require('util');
const {promisify} = require('util')
const Email = require('../utils/email')
const crypto = require("crypto");


const signToken = (id  ) => {
    return jwt.sign( {id } , process.env.JWT_SECRET , {expiresIn : process.env.JWT_EXPIRES_IN})
}

const creatSendToken = (user , statusCode , res) => {
    const token = signToken(user._id)

    const cookieOptions = {
            expires : new Date(
                Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
            ),
            httpOnly : true
    }
    
    if(process.env.NODE_ENV === 'production') cookieOptions.secure = true ;

    res.cookie('jwt' , token, cookieOptions);

    //remove form the output
    user.password = undefined ;

    res.status(statusCode).json({
        status : 'success' ,
        token ,
        data : {
            user
        }
    })
}

exports.signup = catchAsync( async (req , res , next) => {
    const newUser = await User. create({
        name: req.body.name,
        email: req.body.email,
        password: req.body.password,         
        passwordConfirm: req.body.passwordConfirm
    })
    const url = `${req.protocol}://${req.get('host')}/me`
    console.log(url);
    await new Email(newUser , url).sendWelcome();
   

    creatSendToken(newUser , 201 , res)

    // const token = signToken(newUser._id)
    // res.status(201).json({
    //     status : 'sucess' ,
    //     token ,
    //     data : {
    //         user : newUser
    //     }
    // })
});


exports.login = catchAsync(async (req ,res , next) => {

    const { email , password} = req.body ;
    // const email = req.body.email ;
    // const password = req.body.password ;

    //1)check if email and password exist
    if(!email || !password ) {
        return next(new AppError('please provide email nd password'))
    }

    //2)checkk id user exist and password is corrext
    const user = await User.findOne({email}).select('+password')

    if(!user || !(await user.correctPassword(password , user.password))) {
        return next(new AppError('incorrect email or password' , 401))
    }
    //3) if every thin is ok
    const token = signToken(user._id , user.email)

    // getByEmail = user.email
    // console.log(getByEmail);
    creatSendToken(user , 201 , res)

    // console.log(token);
    // res.status(201).json({
    //     status : 'sucess' ,
    //     token ,
    // })
})

exports.logout = (req , res) => {
    res.cookie('jwt' , 'loggedout' , {
        expires : new Date(Date.now() + 10 * 1000),
        httpOnly: true 
    });
    res.status(200).json({ status: 'success'})
};

exports.protect = catchAsync( async (req , res , next ) => {
    //1)getting token and check its there
    let token ;
    if(req.headers.authorization && req.headers.authorization.startsWith('Bearer')){
        token = req.headers.authorization.split(' ')[1]
    } else if(req.cookies.jwt){
        token = req.cookies.jwt
    }

    // console.log(token);

    if(!token){
        return next(
            new AppError('you are not logged in! please log in to get access' , 401)
        )
    }
    //2)verification token

    const decode = await util.promisify(jwt.verify)(token, process.env.JWT_SECRET);
  
    //3)check if user is still exist
    const currentUser = await User.findById(decode.id)
    // console.log(decode.id , decode.email , getByEmail);
    if(!currentUser){
        return next(
            new AppError('The user belonging to this token does not exist' , 401)
        )
    }

    // 4)check if user change password after token was issyed
    if (currentUser.changedPasswordAfter(decode.iat)) {
        return next(
            new AppError('user recently changed password , please login again' , 401)
        )
    }

    //grant acess to protected route
    req.user = currentUser;
    res.locals.user = currentUser;
    next();
});

// Only for rendered pages, no errors!
exports.isLoggedIn = async (req, res, next) => {
    if (req.cookies.jwt) {
      try {
        // 1) verify token
        const decoded = await promisify(jwt.verify)(
          req.cookies.jwt,
          process.env.JWT_SECRET
        );
  
        // 2) Check if user still exists
        const currentUser = await User.findById(decoded.id);
        if (!currentUser) {
          return next();
        }
  
        // 3) Check if user changed password after the token was issued
        if (currentUser.changedPasswordAfter(decoded.iat)) {
          return next();
        }
  
        // THERE IS A LOGGED IN USER
        res.locals.user = currentUser;
        // console.log(currentUser);
        return next();
      } catch (err) {
        // console.log(err);
        return next();
      }
    }
    next();
};

exports.forgotPassword = catchAsync(async ( req, res, next ) => {
    //1) Get user based on Posted email
    const user = await User.findOne({ email : req.body.email});
    // console.log(user);

    if(!user) {
        return next(new AppError('there is no user with this email address' , 404))
    }

    //2)senerate the random rest token

    const resetToken = user.createPasswordResetToken();
    await user.save({validateBeforeSave : false})
    // await user.save();
    //3)send ir ti user`s` email

    
    try{
        const resetURL = `${req.protocol}://${req.get('host')}/api/v1/users/resetPassword/${resetToken}`;
        
        const message =`Forgot your password? Submit a PATCH request with your new password and
        passwordConfirm to: ${resetURL}. \nlf you didn't forget your password, please ignore this
        email!` ;
        // await sendEmail({
        //     email : user.email,
        //     subject: 'your password rest token (valid for only 10 min )',
        //     message : message
        // })
        await new Email(user , resetURL).sendPasswordReset();
    
        res.status(200).json({
            status : "success",
            message: 'token send to the email' , 
            data : ({
                // remove this message below after development of project
                message : `Reset Url :- ${resetURL}`
            })
        })
        
    }catch(err){
        // user.createPasswordResetToken = undefined ;
        // user.createPasswordResetExpires = undefined ;
        // await user.save({validateBeforeSave : false})

        // return next( new AppError('There is an error sending the email. try again later') , 500)
        res.status(500).json({
            status : 'fail',
            data :  err
        })
    }
})

exports.restrictTo = (...roles) => {
    return (req, res, next) => {
      // roles ['admin', 'lead-guide']. role='user'
      if (!roles.includes(req.user.role)) {
        return next(
          new AppError('You do not have permission to perform this action', 403)
        );
      }
  
      next();
    };
  };
 
exports.restPassword = catchAsync(async ( req, res, next ) => {
    //1)Get the user based on that token 
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex') ;

    const user = await User.findOne({
        passwordResetToken : hashedToken ,
        passwordResetExpires  : { $gt : Date.now()}
    })
    //)2)if token is not expired. and there is user , set new password 

    if(!user) {
        return next (new AppError("token is invalid or expired " , 400))
    }

    user.password = req.body.password ;
    user.passwordConfirm = req.body.passwordConfirm ;
    user.passwordResetToken = undefined ;
    user.passwordResetExpires = undefined ;
    await user.save()

    //3)update the passwordChangedAt property for the user
    //4)log in user , send JWT
    creatSendToken(user , 201 , res)
    
})

exports.updatePassword = catchAsync( async (req , res ,next) => {
    
    //1)Get user from collection
    const user = await User.findById(req.user.id).select('+password');
    // console.log(user);

    //2)Check if POSTed current password is correct 
    passwordBody = req.body.currentPassword
    if(!(await user.correctPassword(passwordBody , user.password))) {
        return next(new AppError('incorrect password please provide your previous password correctly' , 401))
    }
    //3) If so , update passwords
    user.password = req.body.password 
    user.passwordConfirm = req.body.passwordConfirm


    await user.save()
    //3)log user in , send JWT
    user.email = req.body.email
    // const token = signToken(user._id , user.email)

    creatSendToken(user , 201 , res)

});
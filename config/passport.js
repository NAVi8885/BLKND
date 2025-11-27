const GoogleStrategy = require('passport-google-oauth20').Strategy;
const passport =require('passport');
const User = require('../models/userSchema');
const jwt = require('jsonwebtoken')


passport.serializeUser((user,done)=>{
  done(null,user._id);
});

passport.deserializeUser(async (_id, done) => {
  try {
    const user = await User.findById(_id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

passport.use('google-signup',new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_SIGNUP_CALLBACK_URL
},
async (accessToken, refreshToken, profile, done) => {
  let photo = null;
  if (profile.photos && profile.photos.length > 0) {
    photo = profile.photos[0].value + "?sz=200";
  }
  const newUser ={
    name: profile.displayName,
    email: profile.emails[0].value,
    phoneNumber: null,
    password: null,
    googleId: profile.id,
    loginType: 'google',
    profilePic: photo
  };

    // USER CREATION THROUGH GMAIL \\
  try{
    let userExist = await User.findOne({email: newUser.email});
    if(userExist){
      return done(null, false,{message:"email-already-exist"});
    }

    const user = await User.create(newUser);
    return done(null, user);
  }catch(err){
    console.log("Error happened at passport google auth",err);
    return done(err, null);
  }
}));

passport.use('google-login', new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_LOGIN_CALLBACK_URL
},
async (accessToken, refreshToken, profile, done) => {
  try{
    let userExist = await User.findOne({email: profile.emails[0].value})
    if(!userExist){
      return done(null, false, {message: "acc-not-found"});
    }
    if(userExist.loginType === 'local'){
      return done(null, false, {message: "login-mismatch"})
    }
    
    return done(null, userExist);
  }catch(err){
    console.log("error happened at passport login auth",err);
    return done(err, null);
  }
}));
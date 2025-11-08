const GoogleStrategy = require('passport-google-oauth20').Strategy;
const passport =require('passport');
const User = require('../models/userSchema');
// const router = require('express').Router();

passport.serializeUser((user,done)=>{
  done(null,user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
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
  const newUser ={
    name: profile.displayName,
    email: profile.emails[0].value,
    phoneNumber: null,
    password: null,
    googleId: profile.id,
    loginType: 'google',
    profilePic: profile.photos[0].value
  };

    // USER CREATION THROUGH GMAIL \\
  try{
    let userExist = await User.findOne({email: newUser.email});
    if(userExist){
      console.log("login button of google is misplaced");
      
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
  console.log('hey');
  
  try{
    let userExist = await User.findOne({email: profile.emails[0].value})
    if(!userExist){
      return done(null, false, {message: "acc-not-found"});
    }
    return done(null, userExist);
  }catch(err){
    console.log("error happened at passport login auth",err);
    return done(err, null);
  }
}));
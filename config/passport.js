const GoogleStrategy = require('passport-google-oauth20').Strategy;
const passport =require('passport');
const User = require('../models/userSchema');

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
    callbackURL: process.env.GOOGLE_CALLBACK_URL
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
      let userExist = await User.findOne({email: newUser.email})
      console.log(userExist);
      if(userExist) return res.render('user/login',{errors: [{msg:"Email already found please login", path:"email"}]})
      
      const user = await User.create(newUser);
      
    }catch{

    }
}));

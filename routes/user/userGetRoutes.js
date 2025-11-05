const express = require('express');
const router = express.Router();
const passport = require('passport');


router.get('/index',(req,res) => {
  res.render('user/index');
})

router.get('/login',(req,res) => {
  res.render('user/login',{errors:null});
})

router.get('/signup',(req,res) => {
  const errKey = req.query.error;
  let errorMsg = null;
  if(errKey === 'google-auth-failed'){
    errorMsg = "Google authentication failed." 
  }else if(errKey === 'email-already-exist'){
    errorMsg = "Email already registered."
  }else if(errKey === 'server-error'){
    errorMsg = "There was a server error."
  }
  res.render('user/signup',{errors: errorMsg? [{msg:errorMsg}]:[]});
})

// creating account using passport google auth
router.get('/auth/google/signup', passport.authenticate('google-signup', { scope: ['profile', 'email'] }));

// callback route
router.get('/auth/google/callback',(req, res, next) => {
  passport.authenticate('google-signup',(err, user, info) =>{
    if(err){
      console.log(err);
    return res.redirect('/signup?error=google-auth-failed');
    }
    if(!user){
      // info.message sent from passport.js
      return res.redirect(`/signup?error=${info.message}`);
    }
    req.logIn(user, (err) => {
      if(err) return res.redirect('/signup?error=server-error');

      return res.redirect('/login');
    })
  })
  (req, res, next);
});

// loging in account using passport google auth
router.get('/auth/google/login', passport.authenticate('google-login', { scope: ['profile', 'email'] }));

// callback route for login
router.get('/auth/google/login/callback',
  passport.authenticate('google-login', { failureRedirect: '/login', failureFlash: true }),
//   googleLogin  this is for going in controller and creating a token.
);

module.exports = router;
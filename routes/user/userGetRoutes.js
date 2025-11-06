const express = require('express');
const router = express.Router();
const passport = require('passport');


router.get('/index',(req,res) => {
  res.render('user/index');
})

router.get('/login',(req,res) => {
  const errKey = req.query.error;
  let errorMsg = null;
  if(errKey === 'email-already-exist'){
    errorMsg = "Email already registered please log in using gmail from here."
  }
  res.render('user/login',{errors: errorMsg? [{msg:errorMsg, path :'signup'}]:[]});
})

router.get('/signup',(req,res) => {
  const errKey = req.query.error;
  let errorMsg = null;
  if(errKey === 'google-auth-failed'){
    errorMsg = "Google authentication failed." 
  }else if(errKey === 'server-error'){
    errorMsg = "There was a server error."
  }
  res.render('user/signup',{errors: errorMsg? [{msg:errorMsg, path :'signup'}]:[]});
})

  //========================================\\
 //===========PASS PORT GOOGLE START=========\\
//============================================\\

// creating account using passport google auth
router.get('/auth/google/signup', passport.authenticate('google-signup', { scope: ['profile', 'email'] }));

// callback route
router.get('/auth/google/callback',(req, res, next) => {
  passport.authenticate('google-signup',(err, user, info) =>{
    if(!user){
      // info.message sent from passport.js
      return res.redirect(`/login?error=${info.message}`);
    }
    req.logIn(user, (err) => {
      return res.redirect('/login?error=google-exist');
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
  //========================================\\
 //===========PASS PORT GOOGLE END===========\\
//============================================\\


module.exports = router;
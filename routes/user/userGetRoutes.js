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
    res.render('user/signup',{errors:null});
})

// creating account using passport google auth
router.get('/auth/google/signup', passport.authenticate('google-signup', { scope: ['profile', 'email'] }));

// callback route
router.get('/auth/google/signup/callback',
  passport.authenticate('google-signup', { failureRedirect: '/signup', failureFlash: true }),
  (req, res) => {
    // registration successfull
    res.redirect('/login'); 
  }
);

// loging in account using passport google auth
router.get('/auth/google/login', passport.authenticate('google-login', { scope: ['profile', 'email'] }));

// callback route for login
router.get('/auth/google/login/callback',
  passport.authenticate('google-login', { failureRedirect: '/login', failureFlash: true }),
//   googleLogin  this is for going in controller and creating a token.
);

module.exports = router;
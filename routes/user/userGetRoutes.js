const express = require('express');
const router = express.Router();
const passport = require('passport');
const {optionalVerify, verifyRequired} = require('../../middlewares/authentication/userAuth');
const jwt = require('jsonwebtoken');
const User = require('../../models/userSchema');
const Product = require('../../models/product');



router.get('/index', optionalVerify,async (req, res) => {
  res.render('user/index',{user: req.user});
})

router.get('/login',(req, res) => {
  const errKey = req.query.error;
  let errorMsg = null;

  if(errKey === 'email-already-exist'){
    errorMsg = "Email already registered please log in using gmail."
  }else if(errKey === 'acc-not-found'){
    errorMsg = "This email is not registered"
  }else if(errKey === 'login-mismatch'){
    errorMsg = "User already exist please login using the form"
    return res.render('user/login',{errors: errorMsg? [{msg:errorMsg, path:'email'}]:[]});
  }else if(errKey === 'server-error'){
    errorMsg = "There was a server error."
  }else if(errKey === 'password-changed'){
    errorMsg = "The password has been changed"
    return res.render('user/login',{errors: errorMsg? [{msg:errorMsg, path:'email'}]:[]});
  }
  return res.render('user/login',{errors: errorMsg? [{msg:errorMsg, path :'signup'}]:[]});
});

router.get('/signup',(req, res) => {
  const errKey = req.query.error;
  let errorMsg = null;

  if(errKey === 'google-auth-failed'){
    errorMsg = "Google authentication failed." 
  }else if(errKey === 'server-error'){
    errorMsg = "There was a server error."
  }
  res.render('user/signup',{errors: errorMsg? [{msg:errorMsg, path :'signup'}]:[]});
});

  //========================================\\
 //===========PASS PORT GOOGLE START=========\\
//============================================\\

// creating account using passport google auth
router.get('/auth/google/signup', passport.authenticate('google-signup', { scope: ['profile', 'email'] }));

// callback route
router.get('/auth/google/signup/callback',(req, res, next) => {
  passport.authenticate('google-signup',(err, user, info) =>{
    if(!user){
      // info.message sent from passport.js
      const msg = info?.message;
      return res.redirect(`/login?error=${encodeURIComponent(msg)}`);
    }

    res.clearCookie("token");
    req.logIn(user, (err) => {
      return res.redirect('/login?error=google-exist');
    })
  })
  (req, res, next);
});

// loging in account using passport google auth
router.get('/auth/google/login', passport.authenticate('google-login', { scope: ['profile', 'email'] }));

// callback route for login
router.get('/auth/google/login/callback',(req, res, next) => {
  passport.authenticate('google-login', (err, user, info) => {

    if (!user) {
    const msg = info?.message || 'server-error';
    return res.redirect(`/login?error=${encodeURIComponent(msg)}`);
    }
    // creating the cookie for google sign in
    const token = jwt.sign({ _id: user._id, email: user.email }, process.env.SECRET_KEY,{ expiresIn: '7d' });
    console.log(token);

    res.cookie('token', token,{
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/'
    })

    res.redirect('/index');
  })
  (req, res, next);
});
  //========================================\\
 //===========PASS PORT GOOGLE END===========\\
//============================================\\

router.get('/forgotpassword', (req, res) => {
  res.render('user/forgotPassword', {errors : null});
})

// router.get('/verifyotp', (req, res) => {
//   res.render('user/verifyOtp', {errors : null, email: null} );
// })

// router.get('/resetPassword', (req, res) => {
//   res.render('user/resetPassword', {errors: [], email: null});
// })


///////////\\\\\\\\\\\\\
//USER PROFILE SECTION\\
///////////\\\\\\\\\\\\\


router.get('/profile', verifyRequired, (req, res) => {
  if(!req.user) {
    return res.redirect('/login')
  }
  res.render('user/profile', {user: req.user, errors: null, oldInput: null});
})

router.get('/userorders', verifyRequired, (req, res) => {
  if(!req.user) {
    return res.redirect('/login')
  }
  res.render('user/profileOrder', {user: req.user, errors: null, oldInput: null});  
})
///////////\\\\\\\\\\\\\
//USER PROFILE SECTION\\
///////////\\\\\\\\\\\\\

router.get('/shop', verifyRequired, async(req, res) => {
  const products = await Product.find();
  res.render('user/shop', {products, user: req.user});
})

router.get('/product/:id', verifyRequired, async (req, res) => {
  const product = await Product.findById(req.params.id).lean();
  res.render('user/singleProduct', {product, user: req.user});
});

module.exports = router;
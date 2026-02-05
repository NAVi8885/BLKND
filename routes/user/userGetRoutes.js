const express = require('express');
const router = express.Router();
const passport = require('passport');
const {optionalVerify, verifyRequired} = require('../../middlewares/authentication/userAuth');
const jwt = require('jsonwebtoken');
const Product = require('../../models/product');
const Review = require('../../models/review');
const { getCart, getCheckout, getAddress, deleteAddress, setDefaultAddress, orderSuccess, getWishlist, filterUserOrders, getUserOrders, verifyPayment, loadHomepage, shopFilter, searchProducts, forgotPassword } = require('../../controller/userController');



router.get('/index', optionalVerify, loadHomepage);

router.get('/login',(req, res) => {
  const errKey = req.query.error;
  let errorMsg = null;
  let successMsg = null;

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
    // return res.render('user/login',{errors: errorMsg? [{msg:errorMsg, path:'email'}]:[]});
  }else if(errKey === 'google-exist'){
    errorMsg = "Account already exists. Please log in.";
  }else if(errKey === 'account-created'){
    successMsg = "Account created successfully! You are logged in."; // Assuming we redirect to index, but if we come here...
  }

  return res.render('user/login',{errors: errorMsg? [{msg:errorMsg, path :'signup'}]:[], success: successMsg});
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
// callback route
router.get('/auth/google/signup/callback',(req, res, next) => {
  passport.authenticate('google-signup',(err, user, info) =>{
    if(!user){
      // info.message sent from passport.js
      const msg = info?.message;
      return res.redirect(`/login?error=${encodeURIComponent(msg)}`);
    }

    // Creating JWT token for immediate login after signup
    const token = jwt.sign({ _id: user._id, email: user.email }, process.env.SECRET_KEY,{ expiresIn: '7d' });
    
    res.cookie('token', token,{
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/'
    });

    return res.redirect('/index');
    })(req, res, next);
});

// loging in account using passport google auth
router.get('/auth/google/login', passport.authenticate('google-login', { scope: ['profile', 'email'] }));

// callback route for login
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
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/'
    })

    res.redirect('/index');
    })(req, res, next);
});
  //========================================\\
 //===========PASS PORT GOOGLE END===========\\
//============================================\\

router.get('/forgotpassword', (req, res) => {
  res.render('user/forgotPassword', {errors : null});
});

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
  res.render('user/profile', {user: req.user, errors: null, oldInput: null});
});

router.get('/userorders', verifyRequired, getUserOrders);

router.get('/user/orders/filter', verifyRequired, filterUserOrders);

router.get('/useraddress', verifyRequired, getAddress);

router.get('/usersetting', verifyRequired, (req, res) => {
  res.render('user/profileSetting', {user: req.user, error: null})
});
///////////\\\\\\\\\\\\\
//USER PROFILE SECTION\\
///////////\\\\\\\\\\\\\


router.get('/shop', optionalVerify, shopFilter);



router.get('/product/:id', optionalVerify, async (req, res) => {
  console.log("Request for product ID:", req.params.id);
  try {
      const product = await Product.findById(req.params.id).lean();
      console.log("Found product:", product ? product.name : "NULL");
      
      if (!product) {
          console.log("Product not found, rendering 404");
          return res.status(404).render('user/404'); 
      }

      const reviews = await Review.find({ product: req.params.id })
          .populate('user', 'name profilePic')
          .sort({ createdAt: -1 });
      console.log("Found reviews count:", reviews.length);

      console.log("Rendering singleProduct with data...");
      res.render('user/singleProduct', {
        product, 
        user: req.user,
        reviews: reviews || [],
        averageRating: product.averageRating || 0,
        reviewCount: product.reviewCount || 0
      });
  } catch (error) {
      console.error("Error in product detail page:", error);
      res.status(500).render('user/404');
  }
});

router.get('/cart', verifyRequired, getCart);

router.get('/wishlist', verifyRequired, getWishlist); 

router.get('/about', optionalVerify, async (req, res) => {
  res.render('user/about', {user: req.user});
});

router.get('/contact', optionalVerify, async (req, res) => {
  res.render('user/contact', {user: req.user});
});

router.get('/checkout', verifyRequired, getCheckout);

router.get('/payment/verify', verifyRequired, verifyPayment);

// Action Buttons of addreses (delete/ set default)
router.get('/address/delete/:id', verifyRequired, deleteAddress);
router.get('/address/setdefault/:id', verifyRequired, setDefaultAddress);

router.get('/ordersuccess/:id', verifyRequired, orderSuccess);

// API: Search Products
router.get('/api/search', optionalVerify, searchProducts);



module.exports = router;
const express = require('express');
const router = express();
const { validateUserReg, validateUserLogin, validateUpdateUser } = require("../../middlewares/validation/userValidator");
const { userRegister, loginUser, logoutUser, forgotPassword, verifyOtp, resetPassword, updateProfile, updateProfileImage, addToCart, updateCart, removeFromCart, addAddress, editAddress, placeOrder, addToWishlist, removeFromWishlist } = require('../../controller/userController');
const { verifyRequired } = require('../../middlewares/authentication/userAuth');
const upload = require('../../config/multer');
const createMulter = require('../../config/multer');


// User Login
router.post('/login',validateUserLogin,loginUser);

// User Register
router.post('/signup',validateUserReg, userRegister);

// user logout
router.get('/logout', logoutUser);

// forgotpassword
router.post('/forgotpassword', forgotPassword);

// verify otp
router.post('/verifyOtp', verifyOtp);

// reset password
router.post('/resetpassword', resetPassword);

// updates profile
router.post('/savechanges', verifyRequired, validateUpdateUser, updateProfile);

// update profile image
const profileUpload = createMulter('profile');
router.post('/updateprofile', verifyRequired, profileUpload.single('avatar'), updateProfileImage);

// gets cart 
router.post('/add-to-cart', verifyRequired, addToCart);

// updates cart + / - quantity
router.post('/cart/update/:itemId', verifyRequired, updateCart);

// removes cart 
router.post('/cart/remove/:itemId', verifyRequired, removeFromCart);

// adds to wishlist
router.post('/add-to-wishlist', verifyRequired, addToWishlist);

// remove from wishlist
router.post('/remove-from-wishlist', verifyRequired, removeFromWishlist);

// adds address
router.post('/address/add', verifyRequired, addAddress);

// edit address
router.post('/address/edit/:id', verifyRequired, editAddress);

// places order
router.post('/placeorder', verifyRequired, placeOrder);

module.exports = router;
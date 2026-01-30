const express = require('express');
const router = express.Router();
const { validateUserReg, validateUserLogin, validateUpdateUser } = require("../../middlewares/validation/userValidator");
const { userRegister, loginUser, logoutUser, forgotPassword, verifyOtp, resetPassword, updateProfile, updateProfileImage, addToCart, updateCart, removeFromCart, addAddress, editAddress, placeOrder, addToWishlist, removeFromWishlist, changePassword, submitContact, deleteAccount, updatePreferences, removeCoupon, applyCoupon, tryOnProduct, getTryOnImage, addReview } = require('../../controller/userController');
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
router.post('/sendingotp', forgotPassword);

// verify otp
router.post('/verifyOtp', verifyOtp);

// reset password
router.post('/resetpassword', resetPassword);

// updates profile
router.post('/savechanges', verifyRequired, validateUpdateUser, updateProfile);

// update profile image
const profileUpload = createMulter('profile');
router.post('/updateprofile', verifyRequired, profileUpload.single('avatar'), updateProfileImage);

// Changing password from user settings
router.post('/settings/change-password', verifyRequired, changePassword);

// preferencee updates here
router.post('/settings/preferences', verifyRequired, updatePreferences);

// deletes account
router.post('/settings/delete-account', verifyRequired, deleteAccount);

// Contacvt admin
router.post('/contact/submit', verifyRequired, submitContact);

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

// Apply's coupon
router.post('/apply-coupon', verifyRequired, applyCoupon);

// Removes coupon
router.post('/remove-coupon', verifyRequired, removeCoupon);

// places order
router.post('/placeorder', verifyRequired, placeOrder);

// RETRIEVE Try-On Status 
const tryOnUpload = createMulter('tryons');
router.post('/try-on', tryOnUpload.single('userPhoto'), tryOnProduct);

// Add Review
router.post('/add-review', verifyRequired, addReview);

module.exports = router;
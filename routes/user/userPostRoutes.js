const express = require('express');
const router = express();
const { validateUserReg, validateUserLogin, validateUpdateUser } = require("../../middlewares/validation/userValidator");
const { userRegister, loginUser, logoutUser, forgotPassword, verifyOtp, resetPassword, updateProfile, updateProfileImage, addToCart, updateCart } = require('../../controller/userController');
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

// updates cart
router.post('/cart/update/:id', verifyRequired, updateCart)
module.exports = router;
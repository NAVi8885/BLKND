const express = require('express');
const router = express();
const { validateUserReg, validateUserLogin, validateUpdateUser } = require("../../middlewares/validation/userValidator");
const { userRegister, loginUser, logoutUser, forgotPassword, verifyOtp, resetPassword, updateProfile, updateProfileImage, addToCart } = require('../../controller/userController');
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

router.post('/cart/add', verifyRequired, addToCart);

module.exports = router;
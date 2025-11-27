const express = require('express');
const router = express();
const { validateUserReg, validateUserLogin } = require("../../middlewares/validation/userValidator");
const { userRegister, loginUser, logoutUser, forgotPassword, verifyOtp, resetPassword, updateProfile } = require('../../controller/userController');


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
router.post('/savechanges', updateProfile);


module.exports = router;
const express = require('express');
const router = express();
const { validateUserReg, validateUserLogin } = require("../../middlewares/validation/userValidator");
const { userRegister, loginUser } = require('../../controller/userController');


// User Login
router.post('/login',validateUserLogin,loginUser);

// User Register
router.post('/signup',validateUserReg, userRegister);



module.exports = router;
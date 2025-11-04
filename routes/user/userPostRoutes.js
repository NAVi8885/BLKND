const express = require('express');
const router = express();
const { validateUserReg } = require("../../middlewares/validation/userValidator");
const { userRegister } = require('../../controller/userController');


// User Login
// router.post('/login')

// User Register
router.post('/signup',validateUserReg, userRegister)



module.exports = router;
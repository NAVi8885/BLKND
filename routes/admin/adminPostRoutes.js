const express = require('express');
const router = express.Router();

const validateAdminLogin = require('../../middlewares/validation/adminValidator');
const {adminLogin, adminLogout} = require('../../controller/adminController');



router.post('/adminLogin',validateAdminLogin,adminLogin);

router.post('/logout', adminLogout);

module.exports = router;
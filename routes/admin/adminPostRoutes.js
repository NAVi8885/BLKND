const express = require('express');
const router = express();
const validateAdminLogin = require('../../middlewares/validation/adminValidator');
const adminLogin = require('../../controller/adminController');



router.post('/adminLogin',validateAdminLogin,adminLogin);
module.exports = router;
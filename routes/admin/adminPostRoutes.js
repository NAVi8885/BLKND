const express = require('express');
const router = express.Router();

const validateAdminLogin = require('../../middlewares/validation/adminValidator');
const {adminLogin, adminLogout, addProducts} = require('../../controller/adminController');
const verifyAdmin = require('../../middlewares/authentication/adminAuth');
const createMulter = require('../../config/multer');



router.post('/adminLogin',validateAdminLogin, adminLogin);

router.post('/logout', adminLogout);

const productMulter = createMulter('products')
router.post('/admin/products', verifyAdmin, productMulter.array('images', 6), addProducts);

module.exports = router;
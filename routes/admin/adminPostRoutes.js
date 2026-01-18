const express = require('express');
const router = express.Router();

const validateAdminLogin = require('../../middlewares/validation/adminValidator');
const {adminLogin, adminLogout, upsertProducts, deleteProduct, createCategory, addSubCategory, updateCategory, sendMessageToUser, createCoupon, updateCoupon, deleteBanner, addBanner} = require('../../controller/adminController');
const verifyAdmin = require('../../middlewares/authentication/adminAuth');
const createMulter = require('../../config/multer');



router.post('/adminLogin',validateAdminLogin, adminLogin);

router.post('/logout', adminLogout);


const productMulter = createMulter('products') // for uploading product images
router.post('/admin/products', verifyAdmin, productMulter.array('images', 6), upsertProducts);

router.post('/admin/categories/add_category', verifyAdmin, createCategory);
router.post('/admin/categories/add_subcategory/:id',verifyAdmin, addSubCategory);
router.post('/admin/categories/edit_category/:id', verifyAdmin, updateCategory);

router.post('/admin/customers/send-message', verifyAdmin, sendMessageToUser);

router.post('/admin/create-coupon', verifyAdmin, createCoupon);
router.post('/admin/coupons/edit/:id', verifyAdmin, updateCoupon);

const bannerUpload = createMulter('banners');// for uploading banner images
router.post('/admin/add-banner', verifyAdmin, bannerUpload.single('image'), addBanner);
router.post('/delete-banner/:id', verifyAdmin, deleteBanner);
module.exports = router;
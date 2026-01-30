const express = require('express');
const router = express.Router();

const validateAdminLogin = require('../../middlewares/validation/adminValidator');
const {adminLogin, adminLogout, upsertProducts, deleteProduct, createCategory, addSubCategory, updateCategory, sendMessageToUser, createCoupon, updateCoupon, deleteBanner, addBanner, updateBanner, createSubAdmin, editSubAdmin, toggleAdminStatus} = require('../../controller/adminController');
const { verifyAdmin, requireMainAdmin, checkPermission } = require('../../middlewares/authentication/adminAuth');
const createMulter = require('../../config/multer');



router.post('/adminLogin',validateAdminLogin, adminLogin);

router.post('/logout', adminLogout);


const productMulter = createMulter('products') // for uploading product images
router.post('/admin/products', verifyAdmin, checkPermission('edit_products'), productMulter.array('images', 6), upsertProducts);

router.post('/admin/categories/add_category', verifyAdmin, checkPermission('edit_categories'), createCategory);
router.post('/admin/categories/add_subcategory/:id',verifyAdmin, checkPermission('edit_categories'), addSubCategory);
router.post('/admin/categories/edit_category/:id', verifyAdmin, checkPermission('edit_categories'), updateCategory);

router.post('/admin/customers/send-message', verifyAdmin, checkPermission('contact_customers'), sendMessageToUser);

router.post('/admin/create-coupon', verifyAdmin, checkPermission('edit_coupons'), createCoupon);
router.post('/admin/coupons/edit/:id', verifyAdmin, checkPermission('edit_coupons'), updateCoupon);

const bannerUpload = createMulter('banners');// for uploading banner images
router.post('/admin/add-banner', verifyAdmin, checkPermission('edit_banners'), bannerUpload.single('image'), addBanner);
router.post('/admin/edit-banner/:id', verifyAdmin, checkPermission('edit_banners'), bannerUpload.single('image'), updateBanner);
router.post('/admin/delete-banner/:id', verifyAdmin, checkPermission('edit_banners'), deleteBanner);

// Admin Management (Main Admin Only)
router.post('/admin-management/create', verifyAdmin, requireMainAdmin, createSubAdmin);
router.post('/admin-management/edit/:id', verifyAdmin, requireMainAdmin, editSubAdmin);
router.post('/admin-management/toggle-status/:id', verifyAdmin, requireMainAdmin, toggleAdminStatus);

module.exports = router;
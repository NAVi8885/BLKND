const express = require('express');
const router = express.Router();
const Product = require('../../models/product');
const { deleteProduct, getProductsPage, deleteCategory, deleteSub, updateCategory, getCustomers, getCoupons, deleteCoupon, getBannerPage, getOrderPage, getDashboard, getAdminManagement, deleteSubAdmin } = require('../../controller/adminController');
const { verifyAdmin, requireMainAdmin, checkPermission } = require('../../middlewares/authentication/adminAuth');
const Category = require('../../models/categorySchema');

router.get('/adminlogin',(req, res) => {
    res.render('admin/adminLogin',{errors:null});
});

router.get('/dashboard', verifyAdmin, checkPermission('view_dashboard'), getDashboard);

// Admin Management Routes (Main Admin Only)
router.get('/admin-management', verifyAdmin, requireMainAdmin, getAdminManagement);
router.get('/admin-management/delete/:id', verifyAdmin, requireMainAdmin, deleteSubAdmin);

router.get('/products', verifyAdmin, checkPermission('view_products'), async (req, res) => {
    const products = await Product.find();
    const categories = await Category.find().lean();
    res.render('admin/products', { products, categories, filters: null, admin: req.admin });
    // res.redirect('admin/products');
})

router.get('/admin/products/delete/:id', verifyAdmin, checkPermission('edit_products'), deleteProduct);

router.get('/admin/products', verifyAdmin, checkPermission('view_products'), getProductsPage);

router.get('/orders', verifyAdmin, checkPermission('view_orders'), getOrderPage);

router.get('/categories', verifyAdmin, checkPermission('view_categories'), async (req, res) => {
    const categories = await Category.find().sort({createdAt: -1});
    res.render('admin/categories', {categories, error: null, admin: req.admin})
})

router.get('/admin/categories/delete/:id', verifyAdmin, checkPermission('edit_categories'), deleteCategory);

router.get('/admin/categories/deletesub', verifyAdmin, checkPermission('edit_categories'), deleteSub);

router.get('/customers', verifyAdmin, checkPermission('view_customers'), getCustomers);

router.get('/coupons', verifyAdmin, checkPermission('view_coupons'), getCoupons);

router.get('/admin/coupons/delete/:id', verifyAdmin, checkPermission('edit_coupons'), deleteCoupon);

router.get('/banners', verifyAdmin, checkPermission('view_banners'), getBannerPage);

router.get('/settings', verifyAdmin, (req, res) => {
    res.render('admin/settings', { admin: req.admin });
})

module.exports = router;
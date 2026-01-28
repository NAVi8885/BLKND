const express = require('express');
const router = express.Router();
const Product = require('../../models/product');
const { deleteProduct, getProductsPage, deleteCategory, deleteSub, updateCategory, getCustomers, getCoupons, deleteCoupon, getBannerPage, getOrderPage, getDashboard, getAdminManagement, deleteSubAdmin } = require('../../controller/adminController');
const { verifyAdmin, requireMainAdmin } = require('../../middlewares/authentication/adminAuth');
const Category = require('../../models/categorySchema');

router.get('/adminlogin',(req, res) => {
    res.render('admin/adminLogin',{errors:null});
});

router.get('/dashboard', verifyAdmin, getDashboard);

// Admin Management Routes (Main Admin Only)
router.get('/admin-management', verifyAdmin, requireMainAdmin, getAdminManagement);
router.get('/admin-management/delete/:id', verifyAdmin, requireMainAdmin, deleteSubAdmin);

router.get('/products', async (req, res) => {
    const products = await Product.find();
    const categories = await Category.find().lean();
    res.render('admin/products', { products, categories, filters: null });
    // res.redirect('admin/products');
})

router.get('/admin/products/delete/:id', verifyAdmin, deleteProduct);

router.get('/admin/products', verifyAdmin, getProductsPage);

router.get('/orders', verifyAdmin, getOrderPage);

router.get('/categories', async (req, res) => {
    const categories = await Category.find().sort({createdAt: -1});
    res.render('admin/categories', {categories, error: null})
})

router.get('/admin/categories/delete/:id', verifyAdmin, deleteCategory);

router.get('/admin/categories/deletesub', verifyAdmin, deleteSub);

router.get('/customers', verifyAdmin, getCustomers);

router.get('/coupons', verifyAdmin, getCoupons);

router.get('/admin/coupons/delete/:id', verifyAdmin, deleteCoupon);

router.get('/banners', verifyAdmin, getBannerPage);

router.get('/settings', (req, res) => {
    res.render('admin/settings');
})

module.exports = router;
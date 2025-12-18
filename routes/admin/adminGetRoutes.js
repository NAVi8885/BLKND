const express = require('express');
const Product = require('../../models/product');
const { deleteProduct, getProductsPage } = require('../../controller/adminController');
const verifyAdmin = require('../../middlewares/authentication/adminAuth');
const Category = require('../../models/categorySchema');
const router = express.Router();

router.get('/adminlogin',(req, res) => {
    res.render('admin/adminLogin',{errors:null});
});

router.get('/dashboard',(req, res) => {
    res.render('admin/dashboard');
})

router.get('/products', async (req, res) => {
    const products = await Product.find();
    res.render('admin/products', {products, filters: null});
})

router.get('/admin/products/delete/:id', verifyAdmin, deleteProduct);

router.get('/admin/products', verifyAdmin, getProductsPage);


router.get('/orders', (req, res) => {
    res.render('admin/orders');
})

router.get('/categories', async (req, res) => {
    const categories = await Category.find().sort({createdAt: -1});
    res.render('admin/categories', {categories, error: null})
})

router.get('/customers', (req, res) => {
    res.render('admin/customers');
})

router.get('/coupons', (req, res) => {
    res.render('admin/coupons');
})

router.get('/analytics', (req, res) => {
    res.render('admin/analytics');
})

router.get('/settings', (req, res) => {
    res.render('admin/settings');
})
module.exports = router;
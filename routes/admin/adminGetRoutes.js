const express = require('express');
const router = express.Router();

router.get('/adminlogin',(req, res) => {
    res.render('admin/adminLogin',{errors:null});
});

router.get('/dashboard',(req, res) => {
    res.render('admin/dashboard');
})


module.exports = router;
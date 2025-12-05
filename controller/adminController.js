const argon2 = require('@node-rs/argon2');
const Admin = require('../models/adminSchema');
const jwt = require('jsonwebtoken');
const { findByIdAndUpdate } = require('../models/product');
const Product = require('../models/product');


const adminLogin = async (req, res) => {
    try{
        const {email, password} = req.body;
        const adminExist = await Admin.findOne({email});

        if(!adminExist) return res.render('admin/adminLogin',{errors: [{msg:"Admin account not found", path: "email"}]});

        const checkPass = await argon2.verify(adminExist.password, password);

        if(!checkPass) return res.render('admin/adminLogin', {errors: [{msg:"Incorrect password", path: "password"}]});

        const token = jwt.sign({id: adminExist._id}, process.env.SECRET_KEY,{expiresIn:'1h'});
        console.log(token);

        res.cookie('token', token,{
            httpOnly: true,
            secure: false,
            sameSite: 'strict'
        });        

        return res.render('admin/dashboard');
    }catch(err){
        console.log("error happened at adminLogin", err);
    }
}

const adminLogout= async (req, res) => {
    res.clearCookie('token',  { httpOnly: true, sameSite: "strict" });
    return res.redirect('admin/adminLogin');
}

const addProducts = async (req, res) => {
    try {
        console.log(req.body);
        const { name, status, description, category, price, stock, tags, sizes, colorsJson} = req.body;
        if (!name || !status || !description || !category  || !price || !stock) {
            return res.render('admin/product', {errors: [{msg:"Missing required fields", path:"name"}]});
        }

        // making tags seperate
        let tagsArray = [];
        if (typeof tags === 'string' && tags.trim() !== '') {
            tagsArray = tags.split(',').map(t => t.trim()).filter(Boolean)
        };

        let sizesArray = [];
        if (Array.isArray(sizes)) {
            sizesArray = sizes;
        } else if (typeof sizes === 'string' && sizes.trim() !== '') {
            sizesArray = [sizes];
        }

        let colorsArray = [];
        if (colorsJson && typeof colorsJson === 'string') {
            try {
            const parsed = JSON.parse(colorsJson);  // <= THIS is your '[{"name":"black","code":"#000000"}]'

                if (Array.isArray(parsed)) {
                    colorsArray = parsed
                    .filter(c => c && typeof c.name === 'string' && typeof c.code === 'string')
                    .map(c => ({
                    name: c.name.trim(),
                    code: c.code.trim().toUpperCase()}));
                }
            } catch (e) {
                console.log('Failed to parse colorsJson:', e);
            }
        }
        
        if (!req.files || req.files.length === 0) {
            return res.render('admin/products', {errors: [{msg:"Image not found", path:"file"}]});
        }

        let productPics = req.files.map(file => `/uploads/products/${file.filename}`);

        const productAdded = new Product({
            name: name.trim(),
            status,
            description,
            category,
            price: Number(price),
            stock: Number(stock),
            size: sizesArray,
            image: productPics,
            colors: colorsArray,
            tags: tagsArray
        })

        console.log('PRODUCT TO SAVE:',productAdded);

        await productAdded.save();
        return res.redirect('/products');

    } catch (error) {
        console.log("error happened at admin controller/ add product: ", error);
    }
}

module.exports = {
    adminLogin,
    adminLogout,
    addProducts
}

    
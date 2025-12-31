const argon2 = require('@node-rs/argon2');
const Admin = require('../models/adminSchema');
const jwt = require('jsonwebtoken');
const Product = require('../models/product');
const Category = require('../models/categorySchema');


const adminLogin = async (req, res) => {
    try{
        const {email, password} = req.body;
        const adminExist = await Admin.findOne({email});

        if(!adminExist) return res.render('admin/adminLogin',{errors: [{msg:"Admin account not found", path: "email"}]});

        const checkPass = await argon2.verify(adminExist.password, password);

        if(!checkPass) return res.render('admin/adminLogin', {errors: [{msg:"Incorrect password", path: "password"}]});

        const token = jwt.sign({id: adminExist._id}, process.env.SECRET_KEY,{expiresIn:'2d'});
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

// create or update a product based on if the product id is available or not 
const upsertProducts = async (req, res) => {
    try {
        const { productId, name, status, description, category, subCategory, price, stock, tags, sizes, colorsJson, existingImagesJson } = req.body;
        // if (!name || !status || !description || category || !subCategory  || !price || !stock) {
        //     return res.render('admin/products', {filters:null ,products: null ,categories:null ,  errors: [{msg:"Missing required fields", path:"name"}]});
        // }

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
            const parsed = JSON.parse(colorsJson);
            if (Array.isArray(parsed)) {
                colorsArray = parsed
                .filter(c => c && typeof c.name === 'string' && typeof c.code === 'string')
                .map(c => ({
                name: c.name.trim(),
                code: c.code.trim().toUpperCase()}));
            }
        }
        
        let existingImages = [];
        if ( existingImagesJson && typeof existingImagesJson === 'string') {
            const parsed = JSON.parse(existingImagesJson);
            if(Array.isArray(parsed)) {
                existingImages = parsed.filter((img) => img && img.url).map((img) => String(img.url));
            }
        }

        let newImages = [];
        if(req.files && req.files.length > 0) {
            newImages = req.files.map((file) => `/uploads/products/${file.filename}`);
        }

        let finalImages = [];
        if(productId) {
            finalImages = [...existingImages, ...newImages];
            if(finalImages.length === 0){
                return res.render('admin/products', {
                    errors: [{ msg: "At least one image is required", path: "file"}]
                });
            }
        }else {
            finalImages = [...newImages];
            if(finalImages.length === 0){
                return res.render('admin/products', {
                    errors: [{ msg: "image not found", path: "file"}]
                });
            }
        }

        const productAdded = {
            name: name.trim(),
            status,
            description,
            category,
            subcategory: subCategory,
            price: Number(price),
            stock: Number(stock),
            size: sizesArray,
            image: finalImages,
            colors: colorsArray,
            tags: tagsArray
        };

        console.log('PRODUCT TO SAVE:',productAdded);
        if(productId){
            await Product.findByIdAndUpdate(
                productId,
                { $set: productAdded }                
            );
        }else{
            await Product.create(productAdded);
        }

        return res.redirect('/products');
    } catch (error) {
        console.log("error happened at admin controller/ add product: ", error);
    }
}

const deleteProduct = async(req, res) => {
    try {
        await Product.findByIdAndDelete(req.params.id);
        res.redirect('/products');
    } catch(error) {
        console.log('error happened at deleteproduct/ admincontroller ', error);
    }
}

const getProductsPage = async (req, res) => {
  try {
    const {
      search = '',
      category = '',
      status = '',
      inventory = '',
    } = req.query;

    const query = {};

    // Text search on name 
    if (search && search.trim() !== '') {
      const regex = new RegExp(search.trim(), 'i'); 
      query.$or = [
        { name: regex }
      ];
    }
    // Category filter


    if (category && category !== 'all') {
        const allowedCategories = ['men', 'women', 'unisex', 'accessories'];

        if (allowedCategories.includes(category)) {
            query.category = category;
        }
    }


    // Status filter
    if (status && status !== 'all') {
        const allowedStatus = ['active', 'draft', 'archived'];

        if (allowedStatus.includes(status)) {
        query.status = status;
        }
    }

    // Inventory filter
    if (inventory && inventory !== 'all') {
      if (inventory === 'in_stock') {
        query.stock = { $gt: 0 };
      } else if (inventory === 'low_stock') {
        query.stock = { $gt: 0, $lte: 5 };
      } else if (inventory === 'out_of_stock') {
        query.stock = 0;
      }
    }

    const products = await Product
      .find(query)
      .sort({ createdAt: -1 });

    const categories = await Category.find().lean();

    return res.render('admin/products', {
      products,
      categories,
      filters: { search, category, status, inventory },
    });
  } catch (error) {
    console.error('error happened at the product filter', error);
  }
}

const createCategory = async (req, res) => {
    try {
        const {main} = req.body;

    if (!main || !main.trim()) {
        const error = "Please enter the category name"
        console.log(error);
        
        return res.render('admin/categories',{error});
    }

    const exists = await Category.findOne({ main: main.trim() });
    if (exists) {
        console.log("category already exists");

        return res.render('admin/categories', {categories});
    }
    const categories = await Category.create({
        main: main.trim(),
    })

    return res.redirect('/categories');

    } catch (error) {
        console.log("error happened at creating category",error);        
    }
}

const addSubCategory = async (req, res) => {
    try{
        const {id} = req.params;
        const {sub} = req.body;

        if (!sub || !sub.trim()) {
            return res.redirect('/categories');
        }

        await Category.findByIdAndUpdate(
        id,
        { $addToSet: { sub: sub.trim() } }, // prevents duplicates
        );

    return res.redirect('/categories');

  }catch(error){
    console.log("error happened at adding subcategory",error)
  }
}

const deleteCategory = async (req, res) => {
    try {
        await Category.findByIdAndDelete(req.params.id);
        return res.redirect('/categories');
    } catch (error) {
        console.log("error happened at deleting category",error)
    }
}

const deleteSub = async (req, res) => {
    try {
        const {categoryId, index}= req.query;
        if (!categoryId || index === undefined) {
            return console.log("no category selected to delete");
        }

        const category = await Category.findById(categoryId);
        if (!category) {
            return console.log("category not found");
            
        }

        const i = Number(index);
        if (Number.isNaN(i) || i < 0 || i >= category.sub.length) {
            return console.log("invalid index number");
            
        }

        category.sub.splice(i, 1);
        await category.save();

        return res.redirect('/categories');
    } catch (error) {
        console.log("error happened at delete subcategory", error);
    }
}

const updateCategory = async (req, res) => {
  const { id } = req.params;
  const { main, sub } = req.body;

  let subs = [];
  try {
    subs = JSON.parse(sub);
  } catch {
    subs = [];
  }

  await Category.findByIdAndUpdate(id, {
    main: main.trim(),
    sub: subs
  });

  res.redirect("/categories");
}


module.exports = {
    adminLogin,
    adminLogout,
    upsertProducts,
    deleteProduct,
    getProductsPage,
    createCategory,
    addSubCategory,
    deleteCategory,
    deleteSub,
    updateCategory
}

    
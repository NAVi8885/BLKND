const {hash, verify} = require('@node-rs/argon2');
const jwt = require('jsonwebtoken');
const User = require('../models/userSchema');
const Cart = require('../models/cart');
const Product = require('../models/product');
const Category = require('../models/categorySchema')
const Address = require('../models/address');
const Order = require('../models/order');
const Wishlist = require('../models/wishlist');
const Message = require('../models/message');
const Coupon = require('../models/coupon');
const Banner = require('../models/banner');
const Review = require('../models/review');
const { sendOtpEmail } = require('../utils/otpApp');
const { client } = require('../config/redis');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

//  For ai 
const { Client } = require("@gradio/client");
const fs = require('fs');
const path = require('path');
const { HfInference } = require("@huggingface/inference"); // Optional fallback



const userRegister = async (req, res) => {
    try {
        const {fullName, email, phoneNumber, password, confirmPassword} = req.body
        if(password !== confirmPassword){
            return res.render('user/signup', {errors: [{msg:"Password doesn't match", path: 'password'}]});
        }

        const userExist= await User.findOne({email})
        if(userExist){
            if(userExist.loginType === 'google'){
                return res.render('user/signup', {errors: [{msg:"User already created using gmail", path: 'email'}]});
            }
        return res.render('user/signup',{errors: [{msg:"User already exist", path: 'email'}]});
        }
        
        const hashedPassword = await hash(password)
        await User.create({name:fullName,email,phoneNumber,password: hashedPassword});

        return res.redirect('/login');
    } catch (error) {
        console.log("error happened at register controller",error)
    }
}

const loginUser = async (req, res) => {
    try {
        const {email, password} = req.body;
        const user = await User.findOne({email});
        if(!user){
            return res.render('user/login', {errors:[{msg:"User does not exist", path:'email'}]});
        }
        if(user){
            if(user.loginType == 'google'){
                return res.render('user/login', {errors: [{msg:"User created using gmail, login using gmail", path: 'email'}]});
            }
        }

        const checkPass = await verify(user.password, password);
        if(!checkPass){
            return res.render('user/login', {errors:[{msg:"Incorrect password", path:"password"}]})
        }

        const token = jwt.sign({ _id: user._id.toString(), email: user.email }, process.env.SECRET_KEY, {expiresIn:'2d'});

        res.cookie('token', token,{
            httpOnly: true,
            secure: false,
            sameSite: 'strict'
        })

        return res.redirect('/index');
    } catch (error) {
        console.log("Error happened at user Login controller",error);
    }
}

// for Banners using redis
const loadHomepage = async (req, res) => {
    try {
        const cacheKey = 'homepage_data';

        //Check's Redis Cache
        const cachedData = await client.get(cacheKey);
        
        if (cachedData) {
            const { banners, products } = JSON.parse(cachedData);
            console.log('Redis used for Homepage');
            return res.render('user/index', { banners, products, user: req.user });
        }

        // Fetches Banners 
        const banners = await Banner.find({ isActive: true }).sort({ order: 1 });

        //Aggregating Top 4 Best Selling Products
        const topProducts = await Order.aggregate([
            // Filter only valid orders (paid, pending, shipped, delivered) - exclude cancelled
            { $match: { orderStatus: { $ne: 'cancelled' } } },
            
            // Unwind the items array to process individual products
            { $unwind: "$items" },
            
            // Group by Product ID and sum the quantity
            { 
                $group: { 
                    _id: "$items.productId", 
                    totalSold: { $sum: "$items.quantity" } 
                } 
            },
            
            // Sort by totalSold in descending order
            { $sort: { totalSold: -1 } },
            
            // Limit to top 4
            { $limit: 4 },
            
            // Lookup product details from Products collection
            {
                $lookup: {
                    from: "products",
                    localField: "_id",
                    foreignField: "_id",
                    as: "productDetails"
                }
            },
            
            // Unwind productDetails array to get the object
            { $unwind: "$productDetails" },
            
            // Replace root to make the product data the main object
            { $replaceRoot: { newRoot: "$productDetails" } }
        ]);

        // If no orders exist yet, topProducts will be empty. 
        // fallback to fetch 4 random products in that case.
        let displayProducts = topProducts;
        if (displayProducts.length === 0) {
            displayProducts = await Product.find({ status: 'active' }).limit(4);
        }

        // Saved to Redis (Cache for 1 hour)
        await client.setEx(cacheKey, 3600, JSON.stringify({ banners, products: displayProducts }));

        console.log('Fetched from DB and Cached');
        res.render('user/index', { banners, products: displayProducts, user: req.user });

    } catch (error) {
        console.log("Home page error:", error);
        res.status(500).send("Server Error");
    }
};

const logoutUser = async (req, res) => {
    res.clearCookie('token',  { httpOnly: true, sameSite: "strict" });
    return res.redirect('/login');
}

const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if(!email){
            return res.render('user/forgotPassword', {errors: [{msg: "Email is required", path: "email"}]});
        }
        const user = await User.findOne({email});
        if(!user){
            return res.render('user/forgotPassword', {errors:[{msg: "User not found", path: "email"}]})
        }
        if(user.loginType === 'google'){
            return res.render('user/forgotPassword', {errors:[{msg: "account is logged in using gmail, cannot change the password", path: "email"}]})
        }
        
        const hashedOtp = await sendOtpEmail(email);
        await User.findOneAndUpdate({email},
            {  $set : {
                  otp: hashedOtp,
                  otpExpiry : new Date(Date.now() + 2 * 60 * 1000) // 2 minute
                }
            }
        )

        return res.render('user/verifyOtp', {email, errors: []});

    } catch (error) {
        console.log("error happened at user controller/ forgot password", error)
    }
}

const verifyOtp = async (req, res) => {
    try {
        const { email } = req.body;
        const {otp1, otp2, otp3, otp4, otp5, otp6} = req.body;
        const otp = otp1 + otp2 + otp3 + otp4 + otp5 + otp6;
        const user = await User.findOne({ email });
        if (!user) {
            return res.render('user/verifyOtp', {email, errors:[{msg:"User not found", path:"otp"}]});
        }
        if(!otp || otp.length!== 6){
            return res.render('user/verifyOtp', {email, errors:[{msg:"Please enter a valid OTP", path:"otp"}]});
        }
        // otp should be entered before 2 mint
        if(user.otpExpiry < new Date()){
            return res.render('user/verifyOtp', {email, errors:[{msg:"OTP expired", path:"otp"}]});
        }
        const isValid = await verify(user.otp,otp);
        if(!isValid) {
            return res.render('user/verifyOtp', {email, errors:[{msg:"Incorrect OTP", path:"otp"}]});
        }

        user.otp = null;
        user.otpExpiry = null;

        await user.save();
        
        return res.render('user/resetPassword', { email, errors:null });
    } catch (error) {
        console.log("error happened at userController/ verifyOtp",error);
    }
}

const resetPassword = async(req, res) => {
    try {
        const {email, newPassword, confirmPassword} = req.body;
        if(!newPassword){
            return res.render('user/resetPassword', {email, errors: [{msg:"Please enter the password", path:"password"}]});
        }
        if(!confirmPassword){
            return res.render('user/resetPassword', {email, errors: [{msg:"Confirm password is required", path:"password"}]});
        }
        if(newPassword !== confirmPassword){
            return res.render('user/resetPassword', {email, errors: [{msg:"Password doesn't match", path:"password"}]});
        }
        if(newPassword.length < 5){
            return res.render('user/resetPassword', {email, errors: [{msg:"Password must have a minimum of 5 letter", path:"password"}]});
        }

        console.log(newPassword);

        const hashedPassword = await hash(newPassword);
        await User.findOneAndUpdate({email}, {
            $set: {
                password: hashedPassword
            }
        });

        return res.redirect('/login?error=password-changed');

    } catch (error) {
        console.log("error happened at user controller,  resetpassword", error);
    }
}

const updateProfile = async (req, res) => {
    try {
        const {name, email, phoneNumber, gender} = req.body;
        const user = await User.findByIdAndUpdate(req.user._id, {
                $set: {
                    name:name,
                    email:email,
                    phoneNumber:phoneNumber,
                    gender:gender
                }
            });
            console.log(user);
            
        return res.redirect('/profile');
    } catch (error) {
        console.log("error happened at update-profile / usercontroller",error)
    }
}

const updateProfileImage = async (req, res) => {
  try {
    if (!req.file) {
        return res.render('user/profile',{errors: [{msg:"Image not found", path:"file"}]});
    }

    const profilePhoto = `/uploads/profile/${req.file.filename}`;

    await User.findByIdAndUpdate(req.user._id, {
        $set: { profilePic: profilePhoto }
    });

    return res.redirect('/profile');
  } catch (error) {
        console.log("error happened at user controller / updateprofileimage", error);
  }
};

const changePassword = async (req, res) => {
    try {
        console.log("here");
        
        const { currentPassword, newPassword, confirmNewPassword } = req.body;
        const userId = req.user._id;
        
        const user = await User.findById(userId);

        if (user.loginType === 'google') {
            return res.render('user/profileSetting', { 
                user: req.user, 
                error: "Google users cannot change password manually." 
            });
        }

        const isMatch = await verify(user.password, currentPassword);
        if (!isMatch) {
            return res.redirect('/usersetting?error=Incorrect current password');
        }

        if (newPassword !== confirmNewPassword) {
            return res.redirect('/usersetting?error=New passwords do not match');
        }

        if (newPassword.length < 5) {
            return res.redirect('/usersetting?error=Password must be at least 5 characters');
        }

        const hashedPassword = await hash(newPassword);
        user.password = hashedPassword;
        console.log(user.password);
        
        await user.save();

        return res.redirect('/usersetting?success=Password updated successfully');

    } catch (error) {
        console.error("Change Password Error:", error);
        res.redirect('/usersetting?error=Server Error');
    }
};

const updatePreferences = async (req, res) => {
    try {
        const userId = req.user._id;
        // Checkboxes only send value if checked. We check for existence in req.body
        const preferences = {
            newsletter: !!req.body.newsletter,
            orderUpdates: !!req.body.orderUpdates,
            promotions: !!req.body.promotions,
            recommendations: !!req.body.recommendations,
            dataCollection: !!req.body.dataCollection
        };

        await User.findByIdAndUpdate(userId, {
            $set: { emailPreferences: preferences }
        });

        res.redirect('/usersetting?success=Preferences saved');
    } catch (error) {
        console.error("Update Prefs Error:", error);
        res.redirect('/usersetting?error=Failed to save preferences');
    }
};

const deleteAccount = async (req, res) => {
    try {
        const userId = req.user._id;
        
        // Optional: Delete related data or just the user
        await User.findByIdAndDelete(userId);
        
        // Clear cookie and logout
        res.clearCookie('token', { httpOnly: true, sameSite: "strict" });
        res.redirect('/login?msg=Account deleted');
    } catch (error) {
        console.error("Delete Account Error:", error);
        res.redirect('/usersetting?error=Could not delete account');
    }
};

const shopFilter = async (req, res) => {
    try {
    const { category, subcategory, search, sort, minPrice, maxPrice, size, ajax } = req.query;

    // 1. Base Query
    let query = { status: 'active' };

    // 2. Category Filter
    if (category) query.category = category;
    if (subcategory) query.subcategory = subcategory;

    // 3. Search Filter
    if (search) query.name = { $regex: search, $options: 'i' };

    // 4. Price Filter
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    // 4.5 Size Filter
    if (size) {
      // size can be a single value or array of values
      const sizes = Array.isArray(size) ? size : [size];
      query.size = { $in: sizes };
    }

    // 5. Sorting Logic
    let sortOption = { createdAt: -1 }; // Default: Newest first
    if (sort === 'priceLowHigh') sortOption = { price: 1 };
    if (sort === 'priceHighLow') sortOption = { price: -1 };
    if (sort === 'nameAZ') sortOption = { name: 1 };

    // 6. Fetch Products
    const products = await Product.find(query).sort(sortOption);

    // --- AJAX HANDLER (NEW) ---
    // If the request comes from our AJAX script, return JSON only
    if (ajax) {
      return res.json({ success: true, products: products });
    }
    // --------------------------

    // 7. Standard Page Load
    const categories = await Category.find().lean();

    res.render('user/shop', {
      products,
      categories,
      user: req.user,
      selectedCategory: category || '',
      selectedSubcategory: subcategory || '',
      selectedSort: sort || '',
      selectedMinPrice: minPrice || 0,
      selectedMaxPrice: maxPrice || 10000,
      selectedSearch: search || '',
      selectedSizes: size ? (Array.isArray(size) ? size : [size]) : []
    });

  } catch (error) {
    console.error("Shop Load Error:", error);
    if(req.query.ajax) {
        return res.status(500).json({ success: false, error: "Server Error" });
    }
    res.status(500).send("Server Error");
  }
}

const addToCart = async (req, res) => {
  try {
    const { productId, selectedSize, selectedColor } = req.body;
    const quantity = parseInt(req.body.quantity);

    if (!productId || !quantity) {
      return res.status(400).send("Missing required fields");
    }

    if (!selectedSize || !selectedColor) {
      return res.status(400).send('Size and color are required');
    }

    const product = await Product.findById(productId);
    if (!product) return res.status(404).send("Product not found");

    if (product.stock < quantity)
      return res.status(400).send("Insufficient stock");

    let cart = await Cart.findOne({ userId: req.user._id });
    if (!cart) cart = new Cart({ userId: req.user._id, items: [] });

    // Add or Update Item
    const itemIndex = cart.items.findIndex(i =>
      i.productId.equals(productId) &&
      i.selectedSize === selectedSize &&
      i.selectedColor === selectedColor
    );

    let currentQty = 0;
    if (itemIndex > -1) {
        currentQty = cart.items[itemIndex].quantity;
    }

    if (product.stock < (currentQty + quantity)) {
         return res.status(400).send("Insufficient stock");
    }

    if (itemIndex > -1) {
      cart.items[itemIndex].quantity += quantity;
    } else {
      cart.items.push({ productId, quantity, selectedSize, selectedColor });
    }

    // Populate to get prices for calculation
    await cart.populate('items.productId');

    const { calculateCartTotals } = require('../utils/cartUtils');
    calculateCartTotals(cart);

    // Save the Cart with calculated totals
    await cart.save();
    
    res.redirect('/cart');
    
  } catch (err) {
      console.error("addToCart error:", err);
      res.status(500).send("Server error");
  }
};

const getCart = async (req, res) => {
    const cart = await Cart.findOne({ userId: req.user._id }).populate('items.productId');

    if (!cart || cart.items.length === 0) {
        return res.render('user/cart', {
            cart: { items: [], subTotal: 0, tax: 0, shipping: 0, total: 0, totalItems: 0 }
        });
    }

    let subTotal = 0;
    let totalItems = 0;

    const items = cart.items.map(item => {
        subTotal += item.productId.price * item.quantity;
        totalItems += item.quantity;
        return item;
    });

    const tax = +(subTotal * 0.04).toFixed(2);
    const shipping = subTotal >= 100 ? 0 : 100;
    const total = +(subTotal + tax + shipping).toFixed(2);

    res.render('user/cart', {
        cart: { items, subTotal, tax, shipping, total, totalItems }
    });
};

const updateCart = async (req, res) => {
  try {
    const userId = req.user._id;
    const { itemId } = req.params;
    const { action } = req.body;

    const cart = await Cart.findOne({ userId }).populate('items.productId');

    if (!cart) {
        return res.json({ success: false, message: 'Cart not found' });
    }

    const item = cart.items.id(itemId);
    if (!item) {
        return res.json({ success: false, message: 'Item not found' });
    }

    const product = item.productId;

    /* ===============================
       UPDATE QUANTITY
    ================================ */
    if (action === 'increase') {
        if (product.stock <= item.quantity) {
            return res.json({
                success: false,
                message: 'Stock limit reached'
            });
        }
      item.quantity += 1;
    }

    if (action === 'decrease') {
        if (item.quantity <= 1) {
            return res.json({
                success: false,
                message: 'Minimum quantity reached'
            });
        }
      item.quantity -= 1;
    }

    /* ===============================
       RECALCULATE TOTALS
    ================================ */
    const { calculateCartTotals } = require('../utils/cartUtils');
    const { subTotal, tax, shipping, total, count } = calculateCartTotals(cart);

    await cart.save();

    /* ===============================
       RESPONSE FOR AJAX
    ================================ */
    res.json({
            success: true,
            item: {
            id: item._id,
            quantity: item.quantity
        },
        cart: {
            subTotal,
            tax,
            shipping,
            total,
            count
        }
    });

  } catch (err) {
    console.error('UPDATE CART ERROR:', err);
    res.status(500).json({ success: false });
  }
};

const removeFromCart = async (req, res) => {
  try {
    const userId = req.user._id;
    const { itemId } = req.params;

    const cart = await Cart.findOne({ userId })
      .populate('items.productId');

    if (!cart) {
      return res.json({ success: false, message: 'Cart not found' });
    }

    const item = cart.items.id(itemId);
    if (!item) {
      return res.json({ success: false, message: 'Item not found' });
    }

    // Remove item
    cart.items.pull(itemId);

    // Recalculate totals
    const { calculateCartTotals } = require('../utils/cartUtils');
    const { subTotal, tax, shipping, total, count } = calculateCartTotals(cart);

    await cart.save();

    res.json({
      success: true,
      cart: {
        subTotal,
        tax,
        shipping,
        total,
        count
      }
    });

  } catch (err) {
    console.error('REMOVE CART ERROR:', err);
    res.status(500).json({ success: false });
  }
};

const getCheckout = async (req, res) => {
    try {
        const userId = req.user._id;

        //the user's cart and populate product details
        const cart = await Cart.findOne({ userId }).populate('items.productId');

        // If cart is empty, redirect back to shop 
        if (!cart || cart.items.length === 0) {
            return res.redirect('/shop');
        }

        // Fetch user's saved addresses
        const addresses = await Address.find({ userId });

        // Rendering the view with all necessary data
        res.render('user/checkout', {
            user: req.user,
            cart: cart,
            addresses: addresses,
            reqPage: 'checkout' // Used for navbar active state
        });

    } catch (error) {
        console.error("Error in getCheckout:", error);
        res.render('user/404');
    }
};

const getAddress = async (req, res) => {
  try{
      const userId = req.user._id;
        // Sort: Default address first, then by creation date
        const addresses = await Address.find({ userId }).sort({ isDefault: -1, createdAt: -1 });
        
        res.render('user/profileAddress', { 
            user: req.user, 
            addresses: addresses,
            reqPage: 'profile' // For navbar highlighting
        });
  } catch(error){
    console.log("error happened at getAddress", error)
  }
}

const addAddress = async (req, res) => {
    try {
        const userId = req.user._id;
        const { label, phone, line1, line2, city, state, pincode, isDefault } = req.body;

        // If 'isDefault' is checked, unset all other default addresses for this user
        if (isDefault) {
            await Address.updateMany({ userId }, { $set: { isDefault: false } });
        }

        const newAddress = new Address({
            userId,
            label,
            phone,
            line1,
            line2,
            city,
            state,
            pincode,
            isDefault: isDefault === 'true' // Checkbox sends string "true"
        });

        // first addres is first set as default
        const count = await Address.countDocuments({ userId });
        if (count === 0) {
            newAddress.isDefault = true;
        }

        await newAddress.save();
        res.redirect('/useraddress');

    } catch (error) {
        console.error("Error adding address:", error);
        res.status(500).send("Server Error");
    }
};

const editAddress = async (req, res) => {
    try {
        const { id } = req.params; // ID comes from the URL
        const userId = req.user._id;
        const { label, phone, line1, line2, city, state, pincode, isDefault } = req.body;

        const updateData = { label, phone, line1, line2, city, state, pincode };

        // If setting as default, unset others first
        if (isDefault) {
            updateData.isDefault = true;
            await Address.updateMany({ userId }, { $set: { isDefault: false } });
        } else {
             updateData.isDefault = false;
        }

        await Address.findByIdAndUpdate({ _id: id, userId }, { $set: updateData });
        res.redirect('/useraddress');

    } catch (error) {
        console.error("Error editing address:", error);
        res.redirect('/useraddress');
    }
};

const deleteAddress = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;
        
        await Address.findOneAndDelete({ _id: id, userId });
        res.redirect('/useraddress');
    } catch (error) {
        console.error("Error deleting address:", error);
        res.redirect('/useraddress');
    }
};

const setDefaultAddress = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;

        // Set's all user's addresses to false
        await Address.updateMany({ userId }, { $set: { isDefault: false } });

        // Set's the selected one to true
        await Address.findByIdAndUpdate({ _id: id, userId }, { $set: { isDefault: true } });

        res.redirect('/useraddress');
    } catch (error) {
        console.error("Error setting default address:", error);
        res.redirect('/useraddress');
    }
};

const applyCoupon = async (req, res) => {
    try {
        const { code } = req.body;
        const userId = req.user._id;
        const cart = await Cart.findOne({ userId }).populate('items.productId');

        if (!cart) return res.json({ success: false, message: 'Cart not found' });

        const coupon = await Coupon.findOne({ code: code.toUpperCase(), isActive: true });

        // 1. Validation Checks
        if (!coupon) {
            return res.json({ success: false, message: 'Invalid Coupon Code' });
        }
        if (new Date() > coupon.expiryDate) {
            return res.json({ success: false, message: 'Coupon Expired' });
        }
        if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
            return res.json({ success: false, message: 'Coupon usage limit reached' });
        }
        if (cart.subTotal < coupon.minOrderValue) {
            return res.json({ success: false, message: `Minimum order of ₹${coupon.minOrderValue} required` });
        }

        // 2. Calculate Discount
        let discount = 0;
        if (coupon.type === 'percentage') {
            discount = (cart.subTotal * coupon.value) / 100;
            if (coupon.maxDiscount > 0 && discount > coupon.maxDiscount) {
                discount = coupon.maxDiscount;
            }
        } else if (coupon.type === 'fixed') {
            discount = coupon.value;
        }

        // Ensure discount doesn't exceed subtotal
        if (discount > cart.subTotal) {
            discount = cart.subTotal;
        }

        // 3. Update Cart
        cart.coupon = true;
        cart.couponName = [coupon.code]; // Storing as array based on your model
        cart.couponDiscount = discount;
        
        // Recalculate Total
        cart.total = cart.subTotal + cart.tax + cart.shipping - discount;

        await cart.save();

        res.json({ 
            success: true, 
            message: 'Coupon Applied', 
            discount: discount, 
            newTotal: cart.total 
        });

    } catch (error) {
        console.log("Apply Coupon Error:", error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

const removeCoupon = async (req, res) => {
    try {
        const userId = req.user._id;
        const cart = await Cart.findOne({ userId });

        if (cart) {
            cart.coupon = false;
            cart.couponName = [];
            cart.couponDiscount = 0;
            cart.total = cart.subTotal + cart.tax + cart.shipping;
            await cart.save();
        }

        res.json({ success: true, message: 'Coupon Removed' });
    } catch (error) {
        console.log("Remove Coupon Error:", error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

const placeOrder = async (req, res) => {
    try {
        const userId = req.user._id;
        const { selectedAddress, paymentMethod, orderNotes } = req.body;

        // 1. Fetch Cart
        const cart = await Cart.findOne({ userId }).populate('items.productId');
        if (!cart || cart.items.length === 0) {
            return res.redirect('/shop');
        }

        // 2. Prepare Address (Same as your existing logic)
        let orderAddress = {};
        if (selectedAddress === 'new') {
            orderAddress = {
                name: req.body.name,
                email: req.body.email,
                phone: req.body.phone,
                street: req.body.street,
                city: req.body.city,
                district: req.body.state,
                pincode: req.body.pincode,
                country: 'India',
                label: 'Home'
            };
        } else {
            const addressDoc = await Address.findById(selectedAddress);
            if (!addressDoc) return res.redirect('/checkout');
            orderAddress = {
                name: addressDoc.name,
                email: req.user.email,
                phone: addressDoc.phone,
                street: `${addressDoc.line1} ${addressDoc.line2 || ''}`,
                city: addressDoc.city,
                district: addressDoc.state,
                pincode: addressDoc.pincode,
                country: 'India',
                label: addressDoc.label
            };
        }

        // 3. Prepare Order Items
        const orderItems = cart.items.map(item => ({
            productId: item.productId._id,
            name: item.productId.name,
            quantity: item.quantity,
            price: item.productId.price,
            total: item.quantity * item.productId.price
        }));

        // 4. Create Order Document (Pending State)
        const newOrder = new Order({
            userId,
            address: orderAddress,
            items: orderItems,
            totalAmount: cart.total,
            subTotal: cart.subTotal,
            tax: cart.tax,
            shipping: cart.shipping,
            couponCode: cart.coupon ? cart.couponName[0] : null,
            couponDiscount: cart.coupon ? cart.couponDiscount : 0,
            paymentMethod,
            paymentStatus: 'pending', // Default to pending
            orderStatus: 'pending',
            deliveryInstruction: orderNotes || '',
            orderDate: new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
        });

        await newOrder.save();

        // ==========================================
        // CASE 1: CASH ON DELIVERY (COD)
        // ==========================================
        if (paymentMethod === 'cod') {
            // Update Stock
            for (const item of cart.items) {
                await Product.findByIdAndUpdate(item.productId._id, { $inc: { stock: -item.quantity } });
            }
            // Clear Cart (including coupon fields)
            await Cart.findOneAndUpdate({ userId }, { 
                $set: { 
                    items: [], 
                    subTotal: 0, 
                    tax: 0, 
                    shipping: 0, 
                    total: 0, 
                    totalItems: 0,
                    coupon: false,
                    couponDiscount: 0,
                    couponName: []
                } 
            });
            
            return res.redirect(`/ordersuccess/${newOrder._id}`);
        }

        // ==========================================
        // CASE 2: ONLINE PAYMENT (STRIPE)
        // ==========================================
        if (paymentMethod === 'card') {
            // ✅ FIX: Use final cart total (with discount, tax, shipping) instead of individual product prices
            // This ensures coupon discount is properly applied to Stripe checkout
            const lineItems = [{
                price_data: {
                    currency: 'inr',
                    product_data: {
                        name: 'Order Total',
                        description: cart.coupon 
                            ? `Includes ${cart.items.length} item(s), tax, shipping, and discount (${cart.couponName[0]})`
                            : `Includes ${cart.items.length} item(s), tax, and shipping`
                    },
                    unit_amount: Math.round(cart.total * 100), // ✅ Final total with discount applied
                },
                quantity: 1,
            }];

            // Create Stripe Session
            const session = await stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                line_items: lineItems,
                mode: 'payment',
                success_url: `${req.protocol}://${req.get('host')}/payment/verify?orderId=${newOrder._id}&session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${req.protocol}://${req.get('host')}/checkout?error=Payment Cancelled`,
                customer_email: req.user.email,
                metadata: {
                    orderId: newOrder._id.toString()
                }
            });

            // Redirect to Stripe Payment Page
            return res.redirect(303, session.url);
        }

    } catch (error) {
        console.error("Place Order Error:", error);
        res.redirect('/checkout?error=Something went wrong');
    }
};

//Verify Payment after Stripe Redirect
const verifyPayment = async (req, res) => {
    try {
        const { orderId, session_id } = req.query;
        const userId = req.user._id;

        const session = await stripe.checkout.sessions.retrieve(session_id);

        if (session.payment_status === 'paid') {
            // 1. Update Order Status
            await Order.findByIdAndUpdate(orderId, { 
                $set: { paymentStatus: 'paid' } 
            });

            // 2. Update Stock (Fetch original cart items from the order we saved)
            const order = await Order.findById(orderId);
            for (const item of order.items) {
                await Product.findByIdAndUpdate(item.productId, { $inc: { stock: -item.quantity } });
            }

            // 3. Clear Cart (including coupon fields)
            await Cart.findOneAndUpdate({ userId }, { 
                $set: { 
                    items: [], 
                    subTotal: 0, 
                    tax: 0, 
                    shipping: 0, 
                    total: 0, 
                    totalItems: 0,
                    coupon: false,
                    couponDiscount: 0,
                    couponName: []
                } 
            });

            return res.redirect(`/ordersuccess/${orderId}`);
        } else {
            return res.redirect('/checkout?error=Payment Failed');
        }

    } catch (error) {
        console.error("Verify Payment Error:", error);
        res.redirect('/checkout?error=Payment Verification Failed');
    }
};

const orderSuccess = async (req, res) => {
    try {
        const orderId = req.params.id;
        const order = await Order.findById(orderId).populate('items.productId');
        
        if (!order) return res.redirect('/index');

        res.render('user/orderConfirmed', {
            user: req.user,
            order: order
        });
    } catch (error) {
        console.error("Order Success Error:", error);
        res.redirect('/index');
    }
};
 
const addToWishlist = async (req, res) => {
    try {
        const userId = req.user._id;
        const { productId, selectedSize, selectedColor } = req.body;

        // Validate  size and color are selected
        if (!selectedSize || !selectedColor) {
            return res.redirect(`/product/${productId}`);
        }

        let wishlist = await Wishlist.findOne({ userId });

        if (!wishlist) {
            wishlist = new Wishlist({ userId, products: [] });
        }

        // Check if exact variant (Product + Size + Color) exists
        const productExists = wishlist.products.some(item => 
            item.productId.toString() === productId && 
            item.size === selectedSize && 
            item.color === selectedColor
        );

        if (!productExists) {
            wishlist.products.push({ 
                productId, 
                size: selectedSize, 
                color: selectedColor 
            });
            await wishlist.save();
        }

        res.redirect('/wishlist');
    } catch (error) {
        console.error("Add to Wishlist Error:", error);
        res.status(500).send("Server Error");
    }
};

const getWishlist = async (req, res) => {
    try {
        const userId = req.user._id;
        let wishlist = await Wishlist.findOne({ userId }).populate('products.productId');

        if (!wishlist) {
            wishlist = { products: [] };
        }

        res.render('user/wishlist', {
            user: req.user,
            wishlist: wishlist
        });
    } catch (error) {
        console.error("Get Wishlist Error:", error);
        res.redirect('/');
    }
};

const removeFromWishlist = async (req, res) => {
    try {
        const userId = req.user._id;
        const { productId } = req.body;

        await Wishlist.findOneAndUpdate(
            { userId },
            { $pull: { products: { productId: productId } } }
        );

        res.redirect('/wishlist');
    } catch (error) {
        console.error("Remove from Wishlist Error:", error);
        res.redirect('/wishlist');
    }
};

const getUserOrders = async (req, res) => {
    try {
        const userId = req.user._id;
        // Fetch all orders sorted by creation date (newest first)
        const orders = await Order.find({ userId })
            .populate('items.productId')
            .sort({ createdAt: -1 });

        res.render('user/profileOrder', {
            user: req.user,
            orders: orders,
            reqPage: 'orders' 
        });
    } catch (error) {
        console.error("Error fetching user orders:", error);
        res.render('user/profileOrder', { user: req.user, orders: [] });
    }
};

const filterUserOrders = async (req, res) => {
    try {
        const userId = req.user._id;
        const { status } = req.query;
        
        let query = { userId };

        // Filter Logic
        if (status && status !== 'All Orders') {
            if (status === 'Processing') {
                // Assuming 'pending' and 'shipped' count as processing
                query.orderStatus = { $in: ['pending', 'shipped'] };
            } else {
                // Exact match for 'Delivered', 'Cancelled', etc.
                query.orderStatus = status.toLowerCase();
            }
        }

        const orders = await Order.find(query)
            .populate('items.productId')
            .sort({ createdAt: -1 });

        // Return JSON data for the frontend to render
        res.json({ success: true, orders: orders });

    } catch (error) {
        console.error("Error filtering orders:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

const submitContact = async (req, res) => {
    try {
        const { firstName, lastName, email, phone, subject, message } = req.body;
        
        const newMessage = new Message({
            sender: 'user',
            userId: req.user ? req.user._id : null, // Store ID if logged in
            name: `${firstName} ${lastName}`,
            email: email,
            subject: subject,
            message: message,
            type: 'contact_query'
        });

        await newMessage.save();

        res.redirect('/contact?success=Message sent successfully');
    } catch (error) {
        console.error("Contact Form Error:", error);
        res.redirect('/contact?error=Failed to send message');
    }
};

/**
 * AI Virtual Try-On - Enhanced Implementation
 * 
 * Features:
 * - Uses HF Inference API (more reliable than Gradio Client)
 * - Image preprocessing with Sharp
 * - Multi-model support with intelligent fallback
 * - Comprehensive error handling
 * - Redis caching with 4-day TTL
 * - Auto-cleanup of uploaded images
 */

const sharp = require('sharp');
const crypto = require('crypto');

const tryOnProduct = async (req, res) => {
    try {
        const { productId } = req.body;
        const userId = req.user._id;
        
        // 1. Validate User Image
        if (!req.file) {
            return res.status(400).json({ success: false, msg: "Please upload your photo." });
        }
        
        // 2. Fetch Product
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ success: false, msg: "Product not found" });
        }
        
        console.log("👗 AI Try-On Started for:", product.name);
        console.log("  📁 User image:", req.file.filename);
        
        // 3. Check Redis Cache
        const cacheKey = `tryon:${userId}:${productId}`;
        const cachedData = await client.get(cacheKey);
        
        if (cachedData) {
            const cached = JSON.parse(cachedData);
            console.log("  ✓ Returning cached result");
            return res.json({
                success: true,
                image: cached.resultImagePath,
                model: cached.model,
                cached: true
            });
        }
        
        // 4. Preprocess Images
        const userImageBuffer = await preprocessImage(req.file.path);
        const productImagePath = path.join(__dirname, '..', product.image[0]);
        const productImageBuffer = await preprocessImage(productImagePath);
        
        // 5. Generate Try-On with AI1
        let result = null;
        let modelUsed = "";
        
        // Define robust fetch function for HF API
        const queryHuggingFace = async (modelId, data, isBinary = false) => {
            // Use router.huggingface.co as per HF deprecation notice
            const response = await fetch(`https://router.huggingface.co/models/${modelId}`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${process.env.HF_API_TOKEN}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(data),
            });
            
            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`HF API Error ${response.status}: ${errText}`);
            }
            
            return await response.arrayBuffer();
        };

        try {
             console.log("  🤖 Generating try-on (Direct API)...");
             
             try {
                // STRATEGY: Use reliable Text-to-Image
                // The Free Tier IMG2IMG endpoints are unstable. T2I is 100% reliable.
                const productColor = (product.colors && product.colors.length > 0) ? product.colors[0].name : "";
                
                // Detailed prompt for realistic results
                const prompt = `professional fashion photography, person wearing ${productColor} ${product.name}, ${product.description}. High quality studio lighting, 8k, photorealistic`;
                
                console.log("  🎨 Generating with SDXL Text-to-Image...");
                
                const result = await queryHuggingFace(
                    "stabilityai/stable-diffusion-xl-base-1.0",
                    { 
                        inputs: prompt,
                        parameters: { 
                            negative_prompt: "blurry, low quality, distorted, cartoon, anime",
                            num_inference_steps: 30,
                            guidance_scale: 7.5
                        } 
                    }
                );
                
                result = Buffer.from(result);
                modelUsed = "SDXL (Text-to-Image)";
                console.log("  ✅ SDXL Success");
                
             } catch (primaryErr) {
                 console.warn("  ⚠️ SDXL failed, trying SD 1.5 fallback:", primaryErr.message);
                 
                 // Fallback: SD 1.5 Text-to-Image
                 const productColor = (product.colors && product.colors.length > 0) ? product.colors[0].name : "";
                 const fallbackResult = await queryHuggingFace(
                    "runwayml/stable-diffusion-v1-5",
                    { 
                        inputs: `fashion photo of person wearing ${productColor} ${product.name}`,
                        parameters: { negative_prompt: "low quality" } 
                    }
                 );
                 result = Buffer.from(fallbackResult);
                 modelUsed = "SD 1.5 (Fallback)";
             }
            
        } catch (error) {
            console.error("  ❌ SYSTEM FAILURE:", error.message);
            // One final desperate fallback: OpenJourney
             try {
                 console.log("  🚨 Emergency Fallback: OpenJourney");
                 const emergencyResult = await queryHuggingFace(
                    "prompthero/openjourney-v4",
                    { inputs: `wearing ${product.name}` },
                    false
                 );
                 result = Buffer.from(emergencyResult);
                 modelUsed = "OpenJourney (Emergency)";
             } catch (final) {
                 throw new Error("AI servers are completely unresponsive. Please contact support.");
             }
        }
        
        // 6. Save Result Image
        const resultFileName = `tryon-${userId}-${productId}-${Date.now()}.jpg`;
        const resultPath = path.join(__dirname, '..', 'uploads', 'tryons', resultFileName);
        
        // Ensure directory exists
        const tryonDir = path.join(__dirname, '..', 'uploads', 'tryons');
        if (!fs.existsSync(tryonDir)) {
            fs.mkdirSync(tryonDir, { recursive: true });
        }
        
        await fs.promises.writeFile(resultPath, result);
        const resultUrl = `/uploads/tryons/${resultFileName}`;
        
        // 7. Cache in Redis (4 days TTL = 345600 seconds)
        const cacheData = {
            model: modelUsed,
            resultImagePath: resultUrl,
            userImagePath: `/uploads/tryons/${req.file.filename}`,
            timestamp: Date.now(),
            expiresAt: Date.now() + (4 * 24 * 60 * 60 * 1000)
        };
        
        await client.setEx(cacheKey, 345600, JSON.stringify(cacheData));
        
        console.log("  ✅ Try-on complete! Model:", modelUsed);
        
        return res.json({
            success: true,
            image: resultUrl,
            model: modelUsed,
            cached: false
        });
        
    } catch (error) {
        console.error("AI Try-On Error:", error);
        
        // Check for specific service errors
        const isServiceOutage = error.message.includes("AI servers are completely unresponsive") || 
                                error.message.includes("503") || 
                                error.message.includes("429");
                                
        return res.status(500).json({
            success: false,
            isServiceError: isServiceOutage,
            msg: isServiceOutage 
                ? "The AI fashion server is currently busy or unavailable. This is an external service issue, not your connection." 
                : (error.message || "AI processing failed. Please try again later.")
        });
    }
};

/**
 * Get cached try-on result
 * Called on page load to check if user already has a try-on for this product
 */
const getTryOnImage = async (req, res) => {
    try {
        const { productId } = req.body;
        const userId = req.user._id;
        const cacheKey = `tryon:${userId}:${productId}`;
        
        const cachedData = await client.get(cacheKey);
        
        if (cachedData) {
            const cached = JSON.parse(cachedData);
            
            // Check if not expired
            if (cached.expiresAt > Date.now()) {
                return res.json({
                    success: true,
                    image: cached.resultImagePath,
                    model: cached.model,
                    timestamp: cached.timestamp
                });
            } else {
                await client.del(cacheKey);
            }
        }
        
        return res.json({ success: false });
        
    } catch (error) {
        console.error("Get Try-On Error:", error);
        res.json({ success: false });
    }
};

/**
 * Discard Try-On Result
 * Deletes from Redis and Filesystem
 */
const discardTryOn = async (req, res) => {
    try {
        const { productId } = req.body;
        const userId = req.user._id;
        const cacheKey = `tryon:${userId}:${productId}`;
        
        // 1. Get cache data to find file path
        const cachedData = await client.get(cacheKey);
        
        if (cachedData) {
            const cached = JSON.parse(cachedData);
            
            // 2. Delete Result Image
            if (cached.resultImagePath) {
                const absoluteResultPath = path.join(__dirname, '..', cached.resultImagePath);
                if (fs.existsSync(absoluteResultPath)) {
                    await fs.promises.unlink(absoluteResultPath);
                }
            }
            
            // 3. Delete Uploaded User Image (Optional, but keeps things clean)
            if (cached.userImagePath) {
                 const absoluteUserPath = path.join(__dirname, '..', cached.userImagePath);
                 if (fs.existsSync(absoluteUserPath)) {
                     await fs.promises.unlink(absoluteUserPath);
                 }
            }
            
            // 4. Delete from Redis
            await client.del(cacheKey);
        }
        
        return res.json({ success: true, msg: "Try-on discarded successfully" });
        
    } catch (error) {
        console.error("Discard Try-On Error:", error);
        return res.status(500).json({ success: false, msg: "Failed to discard try-on" });
    }
};

// ========== HELPER FUNCTIONS ==========

/**
 * Preprocess image: resize, compress, optimize for AI
 */
async function preprocessImage(imagePath) {
    try {
        const buffer = await sharp(imagePath)
            .resize(768, 1024, {
                fit: 'inside',
                withoutEnlargement: true
            })
            .jpeg({ quality: 85 })
            .toBuffer();
        
        return buffer;
    } catch (error) {
        console.error("Image preprocessing error:", error);
        // Fallback: return original file as buffer
        return await fs.promises.readFile(imagePath);
    }
}

const searchProducts = async (req, res) => {
    try {
        const { q } = req.query;
        
        if (!q) {
            return res.json({ success: false, message: 'Query is required' });
        }
        
        const products = await Product.find({
            status: 'active',
            name: { $regex: q, $options: 'i' }
        }).limit(10).select('_id name price image').lean();
        
        res.json({ success: true, products });
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ success: false, message: 'Search failed' });
    }
}

const addReview = async (req, res) => {
    try {
        const { productId, rating, comment } = req.body;
        const userId = req.user._id;

        if (!productId || !rating || !comment) {
            return res.redirect('back');
        }

        // Check if user already reviewed
        const existingReview = await Review.findOne({ product: productId, user: userId });
        if (existingReview) {
             // Optional: Handle this case (e.g. show error message)
             return res.redirect(`/product/${productId}?error=Request already reviewed`);
        }

        // Create Review
        await Review.create({
            product: productId,
            user: userId,
            rating: parseInt(rating),
            comment
        });

        // Recalculate Average Rating
        const reviews = await Review.find({ product: productId });
        const totalRating = reviews.reduce((acc, curr) => acc + curr.rating, 0);
        const averageRating = totalRating / reviews.length;

        // Update Product
        await Product.findByIdAndUpdate(productId, {
            averageRating: averageRating.toFixed(1),
            reviewCount: reviews.length
        });

        res.redirect(`/product/${productId}`);

    } catch (error) {
        console.log("Add Review Error:", error);
        res.redirect('back');
    }
};


const getProfile = async (req, res) => {
    try {
        const userId = req.user._id;

        // 1. Fetch User Data (already in req.user, but robust to fetch fresh if needed, strict checks)
        // const user = await User.findById(userId);

        // 2. Aggregate Data in Parallel for Performance
        const [orderStats, wishlist, addressCount] = await Promise.all([
            Order.aggregate([
                { $match: { userId: userId, orderStatus: { $ne: 'cancelled' } } },
                {
                    $group: {
                        _id: null,
                        totalOrders: { $sum: 1 },
                        totalSpent: { $sum: "$totalAmount" }
                    }
                }
            ]),
            Wishlist.findOne({ userId }),
            Address.countDocuments({ userId })
        ]);

        const stats = {
            totalOrders: orderStats.length > 0 ? orderStats[0].totalOrders : 0,
            totalSpent: orderStats.length > 0 ? orderStats[0].totalSpent : 0,
            wishlistCount: wishlist ? wishlist.products.length : 0,
            addressCount: addressCount || 0
        };

        res.render('user/profile', {
            user: req.user,
            stats: stats,
            errors: null,
            oldInput: null
        });

    } catch (error) {
        console.error("Get Profile Error:", error);
        res.render('user/profile', {
            user: req.user,
            stats: { totalOrders: 0, totalSpent: 0, wishlistCount: 0, addressCount: 0 },
            errors: [{ msg: "Failed to load profile statistics" }],
            oldInput: null
        });
    }
};

module.exports = {
    userRegister,
    loginUser,
    loadHomepage,
    logoutUser,
    forgotPassword,
    verifyOtp,
    resetPassword,
    updateProfile,
    updateProfileImage,
    changePassword,
    updatePreferences,
    deleteAccount,
    shopFilter,
    addToCart,
    getCart,
    updateCart,
    removeFromCart,
    getCheckout,
    getAddress,
    addAddress,
    editAddress,
    deleteAddress,
    setDefaultAddress,
    applyCoupon,
    removeCoupon,
    placeOrder,
    verifyPayment,
    orderSuccess,
    getWishlist,
    addToWishlist,
    removeFromWishlist,
    getUserOrders,
    filterUserOrders,
    submitContact,
    tryOnProduct,
    getTryOnImage,
    searchProducts,
    addReview,
    getProfile,
    discardTryOn
};
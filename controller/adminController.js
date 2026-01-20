const argon2 = require('@node-rs/argon2');
const jwt = require('jsonwebtoken');
const Admin = require('../models/adminSchema');
const Product = require('../models/product');
const Category = require('../models/categorySchema');
const User = require('../models/userSchema');
const Message = require('../models/message');
const Order = require('../models/order');
const Coupon = require('../models/coupon');
const Banner = require('../models/banner');
const { sendCustomMessage } = require('../utils/otpApp');

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

const getOrderPage = async (req, res) => {
    try {
        const { search, status, payment, dateFrom, dateTo, page = 1 } = req.query;
        const limit = 10;
        const skip = (page - 1) * limit;

        // 1. Build Query
        let query = {};

        // Search (Order ID or User Name)
        if (search) {
            // Check if search is a valid ObjectId for exact match
            const isObjectId = mongoose.Types.ObjectId.isValid(search);
            if (isObjectId) {
                query._id = search;
            } else {
                // Otherwise search inside address.name or paymentMethod
                query.$or = [
                    { 'address.name': { $regex: search, $options: 'i' } },
                    { paymentMethod: { $regex: search, $options: 'i' } }
                ];
            }
        }

        // Filter by Status
        if (status && status !== 'Any') {
            // Map UI status to DB status if they differ, or ensure exact match
            // Your model uses lowercase: 'pending', 'shipped', 'delivered', 'cancelled'
            query.orderStatus = status.toLowerCase();
        }

        // Filter by Payment Method
        if (payment && payment !== 'Any') {
            query.paymentMethod = payment.toLowerCase();
        }

        // Filter by Date Range
        if (dateFrom || dateTo) {
            query.createdAt = {};
            if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
            if (dateTo) query.createdAt.$lte = new Date(dateTo);
        }

        // 2. Fetch Data
        const totalOrders = await Order.countDocuments(query);
        const orders = await Order.find(query)
            .populate('userId', 'email') // Get user email from User model
            .populate('items.productId', 'name') // Get product details if needed
            .sort({ createdAt: -1 }) // Newest first
            .skip(skip)
            .limit(limit);

        const totalPages = Math.ceil(totalOrders / limit);

        // 3. Render
        res.render('admin/orders', {
            orders,
            currentPage: Number(page),
            totalPages,
            filters: { search, status, payment, dateFrom, dateTo }
        });

    } catch (error) {
        console.error("Error fetching orders:", error);
        res.status(500).send("Server Error");
    }
};

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

const getCustomers = async (req, res) => {
    try {
        const customers = await User.aggregate([
            {
                $lookup: {
                    from: "orders",       // The collection name for Orders (usually lowercase plural)
                    localField: "_id",    // Field in User collection
                    foreignField: "userId", // Field in Order collection
                    as: "orders"          // The name of the array field to populate
                }
            },
            {
                $sort: { createdAt: -1 } // Optional: Sort customers by newest first
            }
        ]);
        
        res.render('admin/customers', { customers });
    } catch (error) {
        console.error("Error fetching customers:", error);
        res.status(500).send("Internal Server Error");
    }
}; 

const sendMessageToUser = async (req, res) => {
    try {
        const { userId, subject, message } = req.body;
        
        if (!req.admin) {
            return res.redirect('/adminLogin');
        }

        if (!userId || !message) {
            return res.redirect('/customers?error=Message and Recipient are required');
        }

        // Handle Single vs Bulk (Standardize to Array)
        // If one ID comes in, it's a string. If multiple, it's an array.
        const userIds = Array.isArray(userId) ? userId : [userId];

        // Find all users to get their email addresses
        const users = await User.find({ _id: { $in: userIds } });

        // Send Emails and Save to Database in Parallel
        const tasks = users.map(async (user) => {
            // A. Send the real email
            await sendCustomMessage(user.email, subject, message);

            // B. Save copy to database (for the "Inbox" feature)
            return Message.create({
                sender: 'admin',
                userId: user._id,
                adminId: req.admin._id,
                name: "Admin", // Display name
                email: process.env.NODEMAILER_EMAIL,
                subject: subject,
                message: message,
                type: 'admin_message',
                isRead: false
            });
        });

        // Wait for all emails to be sent
        await Promise.all(tasks);

        return res.redirect(`/customers?success=Successfully sent ${users.length} message(s)`);

    } catch (error) {
        console.error("SendMessage Error:", error);
        return res.redirect('/customers?error=Something went wrong while sending messages');
    }
};

const getCoupons = async (req, res) => {
    try {
        const coupons = await Coupon.find().sort({ createdAt: -1 });
        res.render('admin/coupons', { coupons });
    } catch (error) {
        console.log("Error fetching coupons:", error);
    }
};

const createCoupon = async (req, res) => {
    try {
        const { 
            code, type, value, minOrderValue, 
            maxDiscount, expiryDate, usageLimit 
        } = req.body;

        const newCoupon = new Coupon({
            code,
            type: type.toLowerCase(),
            value: Number(value),
            minOrderValue: Number(minOrderValue),
            maxDiscount: Number(maxDiscount),
            expiryDate: new Date(expiryDate),
            usageLimit: usageLimit ? Number(usageLimit) : null
        });

        await newCoupon.save();
        res.redirect('/coupons');
    } catch (error) {
        console.log("Error creating coupon:", error);
        res.redirect('/coupons');
    }
};

const updateCoupon = async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            code, type, value, minOrderValue, 
            maxDiscount, expiryDate, usageLimit 
        } = req.body;

        await Coupon.findByIdAndUpdate(id, {
            code: code.toUpperCase(),
            type,
            value: Number(value),
            minOrderValue: Number(minOrderValue),
            maxDiscount: Number(maxDiscount),
            expiryDate: new Date(expiryDate),
            usageLimit: usageLimit ? Number(usageLimit) : null
        });

        res.redirect('/coupons');
    } catch (error) {
        console.log("Error updating coupon:", error);
        res.redirect('/coupons');
    }
};

const deleteCoupon = async (req, res) => {
    try {
        await Coupon.findByIdAndDelete(req.params.id);
        res.redirect('/coupons');
    } catch (error) {
        console.log("Error deleting coupon:", error);
        res.redirect('/coupons');
    }
};

const getAnalytics = async (req, res) => {
    try {
        // 1. Get KPI Data (Total Revenue, Total Orders, etc.)
        const kpiData = await Order.aggregate([
            { $match: { orderStatus: { $ne: 'cancelled' } } }, // Exclude cancelled
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: "$totalAmount" },
                    totalOrders: { $sum: 1 },
                    avgOrderValue: { $avg: "$totalAmount" }
                }
            }
        ]);

        const kpis = kpiData.length > 0 ? kpiData[0] : { totalRevenue: 0, totalOrders: 0, avgOrderValue: 0 };

        // 2. Get Chart Data: Revenue & Orders by Date (Last 7 days example)
        // Note: You can adjust the $match to filter by date range
        const salesData = await Order.aggregate([
            { $match: { orderStatus: { $ne: 'cancelled' } } },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    dailyRevenue: { $sum: "$totalAmount" },
                    dailyOrders: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }, // Sort by date ascending
            { $limit: 7 } // Last 7 days/entries
        ]);

        // Prepare arrays for Chart.js
        const dates = salesData.map(d => d._id);
        const revenues = salesData.map(d => d.dailyRevenue);
        const orderCounts = salesData.map(d => d.dailyOrders);

        // 3. Get Top 5 Best Selling Products
        const topProducts = await Order.aggregate([
            { $match: { orderStatus: { $ne: 'cancelled' } } },
            { $unwind: "$items" },
            {
                $group: {
                    _id: "$items.productId",
                    name: { $first: "$items.name" },
                    totalSold: { $sum: "$items.quantity" },
                    totalRevenue: { $sum: "$items.total" }
                }
            },
            { $sort: { totalSold: -1 } },
            { $limit: 5 }
        ]);

        // 4. Get Payment Method Stats (Replacing "Channels" chart)
        const paymentStats = await Order.aggregate([
            { $match: { orderStatus: { $ne: 'cancelled' } } },
            {
                $group: {
                    _id: "$paymentMethod",
                    count: { $sum: 1 }
                }
            }
        ]);

        // Render the view with all data
        res.render('admin/analytics', {
            kpis,
            chartData: {
                dates: JSON.stringify(dates),
                revenues: JSON.stringify(revenues),
                orderCounts: JSON.stringify(orderCounts),
                paymentMethods: JSON.stringify(paymentStats.map(p => p._id)),
                paymentCounts: JSON.stringify(paymentStats.map(p => p.count))
            },
            topProducts
        });

    } catch (error) {
        console.error("Analytics Error:", error);
        res.status(500).send("Server Error");
    }
};

const getBannerPage = async (req, res) => {
    try {
            const banners = await Banner.find({}).sort({ order: 1 });
            res.render('admin/banners', { banners });
        } catch (error) {
            console.log("Error loading banner page:", error);
            res.status(500).send("Server Error");
        }
}

const addBanner = async (req, res) => {
    try {
            const { title, subtitle, link, order } = req.body;
            
            // Assuming your multer saves file details in req.file
            if (!req.file) {
                return res.redirect('/banners');
            }

            const newBanner = new Banner({
                image: req.file.filename,
                title,
                subtitle,
                link,
                order
            });

            await newBanner.save();
            res.redirect('/banners');
        } catch (error) {
            console.log("Error adding banner:", error);
            res.status(500).send("Server Error");
        }
}

const updateBanner = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, subtitle, link, order } = req.body;
        
        // Find the banner
        const banner = await Banner.findById(id);
        if (!banner) {
            return res.redirect('/banners');
        }

        // Update fields
        banner.title = title;
        banner.subtitle = subtitle;
        banner.link = link;
        banner.order = order;

        // If a new image , update it
        if (req.file) {
            banner.image = req.file.filename;
        }

        await banner.save();
        res.redirect('/banners');
    } catch (error) {
        console.log("Error updating banner:", error);
        res.status(500).send("Server Error");
    }
}

const deleteBanner = async (req, res) => {
    try {
            const { id } = req.params;
            await Banner.findByIdAndDelete(id);
            res.redirect('/banners');
        } catch (error) {
            console.log("Error deleting banner:", error);
            res.status(500).send("Server Error");
        }
}

module.exports = {
    adminLogin,
    adminLogout,
    getOrderPage,
    upsertProducts,
    deleteProduct,
    getProductsPage,
    createCategory,
    addSubCategory,
    deleteCategory,
    deleteSub,
    updateCategory,
    getCustomers,
    sendMessageToUser,
    getCoupons,
    getAnalytics,
    createCoupon,
    updateCoupon,
    deleteCoupon,
    getBannerPage,
    addBanner,
    updateBanner,
    deleteBanner
}

    
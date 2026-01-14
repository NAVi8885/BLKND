const {hash, verify} = require('@node-rs/argon2');
const jwt = require('jsonwebtoken');
const User = require('../models/userSchema');
const Cart = require('../models/cart');
const Product = require('../models/product');
const Address = require('../models/address');
const Order = require('../models/order');
const Wishlist = require('../models/wishlist');
const { sendOtpEmail } = require('../utils/otpApp');


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

        const token = jwt.sign({ id: user._id.toString(), email: user.email }, process.env.SECRET_KEY, {expiresIn:'2d'});
        // console.log(token);

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
            return res.render('user/forgotPassword', {errors:[{msg:"User not found", path:"email"}]})
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

    if (itemIndex > -1) {
      cart.items[itemIndex].quantity += quantity;
    } else {
      cart.items.push({ productId, quantity, selectedSize, selectedColor });
    }

    // Populate to get prices for calculation
    await cart.populate('items.productId');

    let subTotal = 0;
    
    // Filter out invalid items just in case
    cart.items = cart.items.filter(item => item.productId != null);

    cart.items.forEach(item => {
      subTotal += item.productId.price * item.quantity;
    });

    //  Update Cart Fields
    cart.subTotal = subTotal;
    cart.tax = subTotal * 0.04; // 4% Tax
    cart.shipping = subTotal >= 100 ? 0 : 100; // Free shipping over 100
    cart.total = cart.subTotal + cart.tax + cart.shipping;

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
    let subTotal = 0;
    let count = 0;

    cart.items.forEach(i => {
        subTotal += i.productId.price * i.quantity;
        count += i.quantity;
    });

    const tax = +(subTotal * 0.04).toFixed(2);
    const shipping = subTotal >= 100 ? 0 : 100;
    const total = +(subTotal + tax + shipping).toFixed(2);

    cart.subTotal = subTotal;
    cart.tax = tax;
    cart.shipping = shipping;
    cart.total = total;

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
    let subTotal = 0;
    let count = 0;

    cart.items.forEach(i => {
      subTotal += i.productId.price * i.quantity;
      count += i.quantity;
    });

    const tax = +(subTotal * 0.04).toFixed(2);
    const shipping = subTotal >= 100 ? 0 : 100;
    const total = +(subTotal + tax + shipping).toFixed(2);

    cart.subTotal = subTotal;
    cart.tax = tax;
    cart.shipping = shipping;
    cart.total = total;

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

        // 1. Fetch the user's cart and populate product details
        const cart = await Cart.findOne({ userId }).populate('items.productId');

        // If cart is empty, redirect back to shop or cart
        if (!cart || cart.items.length === 0) {
            return res.redirect('/shop');
        }

        // 2. Fetch user's saved addresses
        const addresses = await Address.find({ userId });

        // 3. Render the view with all necessary data
        res.render('user/checkout', {
            user: req.user,
            cart: cart,
            addresses: addresses,
            reqPage: 'checkout' // Used for navbar active state
        });

    } catch (error) {
        console.error("Error in getCheckout:", error);
        res.render('user/404'); // Or handle error appropriately
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

const placeOrder = async (req, res) => {
    try {
        const userId = req.user._id;
        const { selectedAddress, paymentMethod, orderNotes } = req.body;

        // Fetch Cart
        const cart = await Cart.findOne({ userId }).populate('items.productId');
        if (!cart || cart.items.length === 0) {
            return res.redirect('/shop');
        }

        let orderAddress = {};

        // Handle Address Selection
        if (selectedAddress === 'new') {
            // Construct address from form data
            orderAddress = {
                name: req.body.name,
                email: req.body.email,
                phone: req.body.phone,
                street: req.body.street,
                city: req.body.city,
                district: req.body.state, // Mapping state to district based on schema
                pincode: req.body.pincode,
                country: 'India', // Default
                label: 'Home'
            };
        } else {
            // Fetch existing address
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

        // Prepare Order Items
        const orderItems = cart.items.map(item => ({
            productId: item.productId._id,
            name: item.productId.name,
            quantity: item.quantity,
            price: item.productId.price,
            total: item.quantity * item.productId.price
        }));

        // Create Order Document
        const newOrder = new Order({
            userId,
            address: orderAddress,
            items: orderItems,
            totalAmount: cart.total,
            paymentMethod,
            paymentStatus: paymentMethod === 'cod' ? 'pending' : 'paid',
            orderStatus: 'pending',
            deliveryInstruction: orderNotes || '',
            orderDate: new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
        });

        await newOrder.save();

        // Update Product Stock
        for (const item of cart.items) {
            await Product.findByIdAndUpdate(item.productId._id, { $inc: { stock: -item.quantity } });
        }

        // Clear Cart
        await Cart.findOneAndUpdate({ userId }, { 
            $set: { items: [], subTotal: 0, tax: 0, shipping: 0, total: 0, totalItems: 0 } 
        });

        // Redirect to Success Page
        res.redirect(`/ordersuccess/${newOrder._id}`);

    } catch (error) {
        console.error("Place Order Error:", error);
        res.render('user/checkout', {
            user: req.user,
            cart: await Cart.findOne({ userId: req.user._id }),
            addresses: await Address.find({ userId: req.user._id }),
            error: "Something went wrong while placing the order."
        });
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



module.exports = {
    userRegister,
    loginUser,
    logoutUser,
    forgotPassword,
    verifyOtp,
    resetPassword,
    updateProfile,
    updateProfileImage,
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
    placeOrder,
    orderSuccess,
    getWishlist,
    addToWishlist,
    removeFromWishlist
};

const {hash, verify} = require('@node-rs/argon2');
const jwt = require('jsonwebtoken');
const User = require('../models/userSchema');
const Cart = require('../models/cart');
const Product = require('../models/product');
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
    return res.redirect('user/login');
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
    const { productId, quantity, selectedSize, selectedColor } = req.body;

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

    const item = cart.items.find(i =>
      i.productId.equals(productId) &&
      i.selectedSize === selectedSize &&
      i.selectedColor === selectedColor
    );

    if (item) {
      item.quantity += quantity;
    } else {
      cart.items.push({ productId, quantity, selectedSize, selectedColor });
    }

    await cart.save();
      res.redirect('/cart');
    } catch (err) {
      console.error("addToCart error:", err);
      res.status(500).send("Server error");
    }
};

const getCart = async (req, res) => {
  const cart = await Cart.findOne({ userId: req.user._id })
    .populate('items.productId');

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

  const tax = subTotal * 0.04;
  const shipping = subTotal >= 100 ? 0 : 100;
  const total = subTotal + tax + shipping;

  res.render('user/cart', {
    cart: { items, subTotal, tax, shipping, total, totalItems }
  });
};

const updateCart = async (req, res) => {
  try {
    const userId = req.user._id;
    const { itemId } = req.params;
    const { action } = req.body;

    const cart = await Cart.findOne({ userId })
      .populate('items.productId');

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
    removeFromCart
};

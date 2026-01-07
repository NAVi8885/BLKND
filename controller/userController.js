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
    const { productId, quantity } = req.body;
    
    if (!productId) {
      return res.render('user/cart', { message: "Product ID is required" });
    }
    
    if (!quantity || quantity < 1) {
      return res.render('user/cart', { message: "Quantity must be at least 1" });
    }
    
    const product = await Product.findById(productId);
    if (!product) {
      return res.render('user/cart', { message: "Product not found" });
    }
    
    // Check if product has stock
    if (product.stock < quantity) {
      return res.render('user/cart', { message: "Insufficient stock available" });
    }
    
    let cart = await Cart.findOne({ userId: req.user._id });
    
    if (!cart) {
      const subTotal = product.price * quantity;
      cart = await Cart.create({
        userId: req.user._id,
        items: [{ productId, quantity }],
        subTotal: subTotal,
        total: subTotal
      });
    } else {
      // Check if product already in cart
      const existingItem = cart.items.find(item => item.productId.toString() === productId);
      
      if (existingItem) {
        // Update quantity if product already exists
        const totalQuantity = existingItem.quantity + quantity;
        if (product.stock < totalQuantity) {
          return res.render('user/cart', { message: "Insufficient stock for requested quantity"});
        }
        existingItem.quantity = totalQuantity;
      } else {
        cart.items.push({ productId, quantity });
      }
      
      let newSubTotal = 0;
      for (let item of cart.items) {
        const prod = await Product.findById(item.productId);
        newSubTotal += prod.price * item.quantity;
      }
      
      cart.subTotal = newSubTotal;
      cart.total = newSubTotal + (cart.shipping || 0) - (cart.couponDiscount || 0);
      
      await cart.save();
    }
  } catch (error) {
    console.log("error happened at addToCart controller", error);
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
    addToCart
};

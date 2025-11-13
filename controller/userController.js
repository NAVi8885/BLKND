const {hash, verify} = require('@node-rs/argon2');
const jwt = require('jsonwebtoken');
const User = require('../models/userSchema');




const userRegister = async (req, res) => {
    try {
        const {fullName, email, phoneNumber, password, confirmPassword} = req.body
        
        const userExist= await User.findOne({email})
        if(userExist){
            return res.render('user/signup',{errors: [{msg:"User already exist", path: 'email'}]});
        }
        
        if(password !== confirmPassword){
            return res.render('user/signup',{errors: [{msg:"Password doesn't match", path: 'password'}]});
        }

        const hashedPassword = await hash(password)
        const user = await User.create({name:fullName,email,phoneNumber,password: hashedPassword})
        await user.save()

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
            return res.render('user/login',{errors:[{msg:"User does not exist", path:'email'}]});
        }

        const checkPass = await verify(user.password, password)
        if(!checkPass){
            return res.render('user/login',{errors:[{msg:"Incorrect password", path:"password"}]})
        }

        const token = jwt.sign({ _id: user._id, email: user.email }, process.env.SECRET_KEY,{expiresIn:'1h'});
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

module.exports = {
    userRegister,
    loginUser
};

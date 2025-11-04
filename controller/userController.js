const {hash} = require('@node-rs/argon2');
const User = require('../models/userSchema');








const userRegister = async (req, res) => {
    try {
        const {fullName, email, phoneNumber, password, confirmPassword} = req.body
        
        const isUser = await User.findOne({email})
        if(isUser){
            return res.render('user/signup',{errors: [{msg:"User already exist", path: 'email'}]});
        }
        
        if(password !== confirmPassword){
            return res.render('user/signup',{errors: [{msg:"Password doesn't match", path: 'password'}]});
        }

        const hashedPassword = await hash(password)
        const user = await User.create({name:fullName,email,phoneNumber,password: hashedPassword})
        await user.save()

        return res.redirect('user/login');
    } catch (error) {
        console.log("error happened at register controller",error)
    }
}

module.exports = {
    userRegister
};

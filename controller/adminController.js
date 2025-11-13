const argon2 = require('@node-rs/argon2');
const Admin = require('../models/adminSchema');



const adminLogin = async (req, res) => {
    try{
        const {email, password} = req.body;
        const adminExist = Admin.findOne({email});

        if(!adminExist) return res.render('admin/adminLogin',{errors: [{msg:"Admin account not found", path: "email"}]});

        const checkPass = await argon2.verify(adminExist.password, password);

        if(!checkPass) return res.render('/adminLogin', {errors: [{msg:"Incorrect password", path: "password"}]});

        const token = jwt.sign({adminExist}, process.env.SECRET_KEY,{expiresIn:'1h'});
        console.log(token);

        res.cookie('token', token,{
            httpOnly: true,
            secure: false,
            sameSite: 'strict'
        })        

        return res.render('/dashboard');
    }catch(err){
        console.log("error happened at adminLogin", err);
    }
}

module.exports = adminLogin;
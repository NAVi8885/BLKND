const jwt = require('jsonwebtoken');
const User = require('../../models/userSchema');


const verifyUser = async (req, res, next) => {
    const token = req.cookies.token;

    if(!token){
        return res.render('user/login',{errors:[{msg:"Please login again", path:"email"}]})
    }

    try{
        const verify = await jwt.verify(token, process.env.SECRET_KEY);
        const user = await User.findById(verify.id);
        // if (!user) {
        //     res.clearCookie('token');
        //     return res.render('user/login', {errors: [{ msg: "Account not found. Please login again.", path: "email" }]})
        // }

        req.user = user;
        next();
    }catch(err){
        console.log("error happened at user-verify in userauth :", err)
    }
}

module.exports = verifyUser;
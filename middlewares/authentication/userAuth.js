const jwt = require('jsonwebtoken');
const User = require('../../models/userSchema');


const optionalVerify = async (req, res, next) => {
    const token = req.cookies.token;
    if(token){
        try{
            const verify = await jwt.verify(token, process.env.SECRET_KEY);
            const user = await User.findById(verify._id);
            
            req.user = user;
            
            next();
        }catch(err){
            console.log("error happened at user-verify in userauth :", err)
        }
    } 
    next();
}

const verifyRequired = async(req, res, next) => {
    const token = req.cookies.token;
    if(!token){
        return res.render('user/login',{errors:[{msg:"Please login again", path:"email"}]})
    }
    try{
        const verify = await jwt.verify(token, process.env.SECRET_KEY);
        // console.log('token: ', verify);
        
        const user = await User.findById(verify._id);
        if (!user) {
            res.clearCookie('token');
            return res.render('user/login', {errors: [{ msg: "Account not found. Please login again.", path: "email" }]})
        }

        req.user = user;

        next();
    }catch(err){
        console.log("error happened at user-verify in userauth :", err)
    }
}
module.exports = { 
    optionalVerify,
    verifyRequired
}
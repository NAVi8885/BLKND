const jwt = require('jsonwebtoken');
const User = require('../../models/userSchema');


const verifyUser = async (req, res) => {
    const token = req.cookies.token;

    if(!token){
        return res.render('user/login',{errors:[{msg:"Please login again", path:"email"}]})
    }

    try{
        const verify = jwt.verify(token,process.env.SECRET_KEY)
    }catch(err){
        console.log("error happened at userverify in userauth =", err)
    }
}

module.exports = verifyUser;
const jwt = require('jsonwebtoken');
const Admin = require('../../models/adminSchema');

const verifyAdmin = async (req, res, next) => {
    const token = req.cookies.token;

    if(!token){
        return res.render('admin/adminLogin', {errors:[{msg:"Please login again", path:"email"}]});
    }

    try{
        const verify = await jwt.verify(token, process.env.SECRET_KEY);
        const admin = await Admin.findById(verify.id);

        // Check's if admin exists. If not, clear cookie and redirect.
        if (!admin) {
            res.clearCookie('token');
            return res.render('admin/adminLogin', {
                errors: [{ msg: "Account not found. Please login again.", path: "email" }]
            });
        }

        req.admin = admin;
        next();
    } catch(err){
        console.log("error happened at user-verify in adminauth :", err);
        res.clearCookie('token');
        return res.render('admin/adminLogin', {errors:[{msg:"Session expired", path:"email"}]});
    }
}

module.exports = verifyAdmin;
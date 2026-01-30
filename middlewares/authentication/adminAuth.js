const jwt = require('jsonwebtoken');
const Admin = require('../../models/adminSchema');

const verifyAdmin = async (req, res, next) => {
    const token = req.cookies.token;

    if(!token){
        return res.render('admin/adminLogin', {errors:[{msg:"Please login again", path:"email"}]});
    }

    try{
        const verify = await jwt.verify(token, process.env.SECRET_KEY);
        const admin = await Admin.findById(verify.id).lean();

        // Check if admin exists and is active (explicit false check for legacy support)
        if (!admin || admin.isActive === false) {
            res.clearCookie('token');
            return res.render('admin/adminLogin', {
                errors: [{ msg: "Account not found or inactive. Please login again.", path: "email" }]
            });
        }

        req.admin = admin;
        res.locals.admin = admin; // Make available in ALL admin views
        next();
    } catch(err){
        console.log("error happened at user-verify in adminauth :", err);
        res.clearCookie('token');
        return res.render('admin/adminLogin', {errors:[{msg:"Session expired", path:"email"}]});
    }
}

const checkPermission = (requiredPermission) => {
  return (req, res, next) => {
    const admin = req.admin;
    
    if (!admin) {
      return res.redirect('/adminLogin');
    }
    
    // Main admin has all permissions (including legacy admins with undefined role)
    if (!admin.role || admin.role === 'main_admin') {
      return next();
    }
    
    // Check if sub-admin has required permission
    if (admin.permissions && admin.permissions.includes(requiredPermission)) {
      return next();
    }
    
    // Unauthorized
    return res.status(403).render('admin/403', { 
      message: 'You do not have permission to access this page',
      admin: admin 
    });
  };
};

const requireMainAdmin = (req, res, next) => {
  const admin = req.admin;
  
  if (!admin) {
    return res.redirect('/adminLogin');
  }
  
  // Legacy admins are main admins
  if (!admin.role || admin.role === 'main_admin') {
    return next();
  }
  
  return res.status(403).render('admin/403', { 
    message: 'Only main admin can access this page',
    admin: admin 
  });
};

module.exports = { verifyAdmin, checkPermission, requireMainAdmin };
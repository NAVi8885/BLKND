const {body, validationResult} = require('express-validator');

const validateAdminLogin = [
    body('email')
    .isEmail().withMessage("Email is empty"),

    body('password')
    .notEmpty().withMessage("Password cannot be empty")
    .isLength({min:5, max:30}).withMessage("Password should have minimum of 5 letters"),

    async (req, res, next) => {
    const errors = validationResult(req);
    if(!errors.isEmpty()){
        // console.log(errors)
        return res.render('user/signup',{errors: errors.array()});
    }
    next();
    }
]

module.exports = validateAdminLogin;
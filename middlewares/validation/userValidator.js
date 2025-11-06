const {body, validationResult} = require('express-validator');

const validateUserReg = [
    body('fullName')
    .notEmpty().withMessage("Name connot be empty")
    .isLength({ min: 3 , max: 20 }).withMessage("Name be have between 3- 20 letters"),
    
    body('email')
    .isEmail().withMessage("Email is required"),
    
    body('phoneNumber')
    .notEmpty().withMessage("Phone number cannot be empty")
    .isLength({min:10,max:13}).withMessage("Enter a valid number"),
    
    body('password')
    .notEmpty().withMessage("Password cannot be empty")
    .isLength({min:5, max:30}).withMessage("Password should have minimum of 5 letters"),
    
    body('confirmPassword')
    .notEmpty().withMessage("Password cannot be empty")
    .isLength({min:5,max:30}).withMessage("Password should have minimum of 5 letters")
    .custom((value , {req})=>{
        if(value !== req.body.password){
            throw new Error ("Password does not match")
        }
        return value
    }),

    async (req, res, next) => {
    const errors = validationResult(req);
    if(!errors.isEmpty()){
        // console.log(errors)
        return res.render('user/signup',{errors: errors.array()});
    }
    next();
    }
]

const validateUserLogin = [
    body('email')
    .isEmail().withMessage("Email is required"),

    body('password')
    .notEmpty().withMessage("Password cannot be empty")
    .isLength({min:5, max:30}).withMessage("Password should have minimum of 5 letters"),

    async(req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.render('user/signup',{errors: errors.array()});
        }
        next();
    }
]


module.exports = {
    validateUserReg,
    validateUserLogin
};
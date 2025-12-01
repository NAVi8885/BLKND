const mongoose = require('mongoose');
const { Schema } = mongoose;


const userSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        unique: true,
        required: true
    },
    phoneNumber: {
        type: String
    },
    password: {
        type: String,
    },
    googleId: {
        type: String,
        default: null
    },
    loginType: {
        type: String,
        enum:['local', 'google'],
        default: 'local'
    },
    profilePic:{
        type: String
    },
    isBlocked: {
        type: Boolean,
        default: false
    },
    otp:{
        type: String,
        default: null
    },
    otpExpiry:{
        type: Date,
        default: null
    },
    gender:{
        type: String,
        enum:['null','male', 'female'],
        default: 'Not Specified'
    }
    
}, {
    timestamps: true
})

const User = mongoose.model('User',userSchema);
module.exports = User;
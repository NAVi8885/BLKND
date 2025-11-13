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
        type: Number,
        unique: true,
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
    otpExiry:{
        type: Date,
        default: null
    }

}, {
    timestamps: true
})

const User = mongoose.model('User',userSchema);
module.exports = User;
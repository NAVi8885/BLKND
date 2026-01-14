const mongoose = require('mongoose');
const { Schema } = mongoose

const AddressSchema = new Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true
    },
    label: {
        type: String
    },
    phone: {
        type: String,
        required: true
    },
    line1: {
        type: String,
        required: true
    },
    line2: {
        type: String
    },
    city: {
        type: String,
        required: true
    },
    state: { 
        type: String, 
        required: true },
    pincode: { 
        type: String, 
        required: true },
    country: { 
        type: String, 
        default: 'India' },

    isDefault: { 
        type: Boolean, 
        default: false },
    isDeleted: { 
        type: Boolean, 
        default: false }
}, { timestamps: true }
);

const Address = mongoose.model('Address', AddressSchema);
module.exports = Address;

const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
    code: { 
        type: String, 
        required: true, 
        unique: true, 
        uppercase: true,
        trim: true
    },
    type: { 
        type: String, 
        enum: ['percentage', 'fixed'], 
        required: true 
    },
    value: { 
        type: Number, 
        required: true 
    },
    minOrderValue: { 
        type: Number, 
        default: 0 
    },
    maxDiscount: { 
        type: Number, 
        default: 0 // 0 means no limit for percentage
    },
    expiryDate: { 
        type: Date, 
        required: true 
    },
    usageLimit: { 
        type: Number, 
        default: null // null means infinite
    },
    usedCount: { 
        type: Number, 
        default: 0 
    },
    isActive: { 
        type: Boolean, 
        default: true 
    }
}, { timestamps: true });

const Coupon = mongoose.model('Coupon', couponSchema);
module.exports = Coupon;
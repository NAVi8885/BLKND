const mongoose = require('mongoose');
const { Schema } = mongoose;
const User = require('./userSchema');
const Product = require('./product')

const cartSchema = new Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        unique: true
    },
    items: [{
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        quantity: {
            type: Number, 
            min: 1,
            required: true
        },
        selectedSize: {
            type: String,
            enum: ["XS", "S", "M", "L", "XL"],
            required: true
        },
        selectedColor: {
            type: String,   // store color name, not entire object
            required: true
        }
    }],
    subTotal: {
        type: Number,
    },
    shipping: {
        type: Number,
        default: 0
    },
    coupon: {
        type: Boolean,
        default: false
    },
    couponDiscount: {
        type: Number
    },
    couponName: {
        type: [String],
        default: []
    },
    tax: {
        type: Number,
        default: 0
    },
    total: {
        type: Number,
    }
},{timestamps: true});

const Cart = mongoose.model('Cart', cartSchema);
module.exports = Cart;

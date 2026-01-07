const mongoose = require('mongoose');
const { Schema } = mongoose;
const User = require('./userSchema');
const Product = require('./product')

const cartSchema = new Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: User,
        unique: true
    },
    items: [{
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: Product,
            required: true
        },
        quantity: {
            type: Number, 
            miin: 1,
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
    total: {
        type: Number,
    }
},{timestamps: true});

const Cart = mongoose.model('Cart', cartSchema);
module.exports = Cart;

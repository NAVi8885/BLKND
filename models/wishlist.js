const mongoose = require('mongoose');
const { Schema } = mongoose;

const wishlistSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    products: [{
        productId: {
            type: Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        size: {
            type: String,
            required: true
        },
        color: {
            type: String,
            required: true
        },
        addedAt: {
            type: Date,
            default: Date.now
        }
    }]
}, { timestamps: true });

const Wishlist = mongoose.model('Wishlist', wishlistSchema);
module.exports = Wishlist;
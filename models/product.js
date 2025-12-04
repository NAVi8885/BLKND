const mongoose = require('mongoose');
const { type } = require('os');
const { Schema } = mongoose;

const colorSchema = new mongoose.Schema({
    name: {
        type: String, required: true
    },
    code: {
        type: String, required: true
    }, 
},
  { _id: false } );

const productSchema = new Schema({
    name: {
        type: String, 
        required: true 
    },
    category: {
        type: String,
        required: true,
        enum: ["men", "women", "unisex", "accessories"],
        default: "unisex"
    },
    description: {
        type: String,
        required: true
    },
    status: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    stock: {
        type: Number,
        required: true
    },
    image: {
        type: [String],
        required: true
    },
    size: {
        type: [String],
        enum:["XS","S", "M", "L", "XL"],
        default:[]
    },
    colors: [colorSchema],
    tags: {
        type: [String],
        default: []
    }
},{timestamps: true});

const Product = mongoose.model("Product", productSchema);
module.exports = Product;
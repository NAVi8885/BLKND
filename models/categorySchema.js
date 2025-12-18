const mongoose = require('mongoose');
const { Schema } = mongoose;

const categorySchema = new Schema({
    main: {
        type: String,
        required: true,
        trim: true
    },
    sub: {
        type: [String],
        default: []
    }
},
{
    timestamps: true
});

const Category = mongoose.model("Category", categorySchema);
module.exports = Category;
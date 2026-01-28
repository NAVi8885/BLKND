const mongoose = require('mongoose');
const { Schema } = mongoose;

const adminSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
    },
    role: {
        type: String,
        enum: ['main_admin', 'sub_admin'],
        default: 'main_admin'
    },
    permissions: {
        type: [String],
        default: []
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'Admin'
    },
    isAdmin: { type: Boolean, default: true }
},{
    timestamps: true
});

const Admin = mongoose.model('Admin',adminSchema);
module.exports = Admin;
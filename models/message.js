const mongoose = require('mongoose');
const { Schema } = mongoose;

const messageSchema = new Schema({
    sender: {
        type: String,
        required: true,
        enum: ['user', 'admin']
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
    adminId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
        required: false
    },
    name: { 
        type: String 
    }, 
    email: { 
        type: String
    },
    subject: { 
        type: String,
        required: true 
    },
    message: { 
        type: String,
        required: true 
    },
    isRead: { 
        type: Boolean,
        default: false 
    },
    type: {
        type: String,
        enum: ['contact_query', 'admin_message'],
        default: 'contact_query'
    }
}, {
    timestamps: true
});

const Message = mongoose.model('Message', messageSchema);
module.exports = Message;
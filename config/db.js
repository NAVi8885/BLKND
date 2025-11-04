const mongoose = require('mongoose');

const URI = process.env.DB_URI;

const connectDB = async () => {
    try {
        await mongoose.connect(URI);
        console.log("Mongo DB is connected");
    } catch (error) {
        console.error("Mongo DB connection failed");
    }
}
module.exports = connectDB;
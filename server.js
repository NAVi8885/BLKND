require('dotenv').config();
const express = require('express');
const app = express();
const session = require('express-session')
const path = require('path');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');


const userGetRouter = require('./routes/user/userGetRoutes');
const userPostRouter = require('./routes/user/userPostRoutes');

const adminGetRouter = require('./routes/admin/adminGetRoutes');
const adminPostRouter = require('./routes/admin/adminPostRoutes');

const connectDB = require('./config/db');
const passport = require('passport');
require('./config/passport');
const { RedisStore } = require('connect-redis');
const redisClient = require('./config/redis');

// Security Headers
app.use(helmet({
  contentSecurityPolicy: false, // Disabled for development/inline scripts (adjust for production)
}));

app.use(
    session({
        store: new RedisStore({ client: redisClient }),  
        secret: process.env.SESSION_SECRET,
        resave: false,             // Recommended false for Redis
        saveUninitialized: false,  // Recommended false for Redis to save memory
        cookie: {
            secure: process.env.NODE_ENV === 'production', // Set to TRUE when hosting
            httpOnly: true, // Prevents client-side JS from reading the cookie
            maxAge: 1000 * 60 * 60 * 24 // 1 Day
        }
    })
);

app.use(passport.initialize());
app.use(passport.session());

connectDB();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.set('view engine', 'ejs');
app.set('views' , 'views');
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/',userGetRouter);
app.use('/',userPostRouter);

app.use('/',adminGetRouter);
app.use('/',adminPostRouter);

// Global Error Handler
app.use((err, req, res, next) => {
    console.error("Global Error:", err.stack);
    res.status(500).send("Something broke!");
});

const PORT = process.env.PORT || 4200;

app.listen(PORT, () => {console.log(`Server started at localhost: ${PORT}`)});
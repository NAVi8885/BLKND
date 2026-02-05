require('dotenv').config();
const express = require('express');
const app = express();
const session = require('express-session')
const path = require('path');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');

app.set('trust proxy', 1);  // telling the app it's behind a proxy

const userGetRouter = require('./routes/user/userGetRoutes');
const userPostRouter = require('./routes/user/userPostRoutes');

const adminGetRouter = require('./routes/admin/adminGetRoutes');
const adminPostRouter = require('./routes/admin/adminPostRoutes');

const connectDB = require('./config/db');
const passport = require('passport');
require('./config/passport');
const { RedisStore } = require('connect-redis');
const redisClient = require('./config/redis').client;

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
    console.error("Global Error stack:", err.stack);
    console.error("Global Error message:", err.message);
    
    // Don't leak stack traces to user in production
    const isProduction = process.env.NODE_ENV === 'production';
    const errorMessage = isProduction ? 'Something went wrong on the server.' : `Error: ${err.message}. Stack: ${err.stack}`;
    
    res.status(500).send(errorMessage);
});

const PORT = process.env.PORT || 4200;

// Check for critical environment variables
// Check for critical environment variables
const requiredEnv = ['DB_URI', 'SESSION_SECRET', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_SIGNUP_CALLBACK_URL', 'GOOGLE_LOGIN_CALLBACK_URL'];
const missingEnv = requiredEnv.filter(key => !process.env[key]);

if (missingEnv.length > 0) {
  console.warn(`WARNING: Missing environment variables: ${missingEnv.join(', ')}`);
}

app.listen(PORT, () => {console.log(`Server started at localhost: ${PORT}`)});
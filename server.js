require('dotenv').config();
const express = require('express');
const app = express();
const session = require('express-session')
const path = require('path');
const cookieParser = require('cookie-parser');


const userGetRouter = require('./routes/user/userGetRoutes');
const userPostRouter = require('./routes/user/userPostRoutes');

const adminGetRouter = require('./routes/admin/adminGetRoutes');
const adminPostRouter = require('./routes/admin/adminPostRoutes');

const connectDB = require('./config/db');
// const connectRedis = require('./config/redis');
const passport = require('passport');
require('./config/passport');


app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false
    })
);

app.use(passport.initialize());
app.use(passport.session());

connectDB();
// connectRedis();
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

const PORT = process.env.PORT || 4200;

app.listen(PORT, () => {console.log(`Server started at localhost: ${PORT}`)});
const express = require('express');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');

// Routes
const users = require('./routes/users');
const {serve, setup} = require("swagger-ui-express");
const swaggerSpec = require("./swagger");

// Initialize Express app
const app = express();

// Middleware
app.use(express.json());  // Replaces bodyParser.json()
app.use(express.urlencoded({ extended: false }));  // Replaces bodyParser.urlencoded()
app.use(cookieParser());
app.use('/api-docs', serve, setup(swaggerSpec));

// Connect to database
connectDB()
    .then(() => {
        console.log('MongoDB connected successfully');
    })
    .catch(err => {
        console.error('MongoDB connection failed:', err);
        process.exit(1);  // Exit process with failure
    });

// API routes
app.use('/api/v1/users', users);

// Export the app for server or testing
app.listen(3000);

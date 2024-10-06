// services/logger.js

const winston = require('winston');

// Create a Winston logger
const logger = winston.createLogger({
    level: 'info', // Log level
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json() // Log in JSON format
    ),
    transports: [
        new winston.transports.Console(), // Log to console
        new winston.transports.File({ filename: 'error.log', level: 'error' }), // Log errors to file
        new winston.transports.File({ filename: 'combined.log' }) // Log all to file
    ]
});

// Export the logger
module.exports = logger;

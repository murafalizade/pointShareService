const swaggerJsdoc = require('swagger-jsdoc');

const options = {
    definition: {
        openapi: '3.0.0', // OpenAPI version
        info: {
            title: 'Points Share API',
            version: '1.0.0',
            description: 'API for Points Share Application',
        },
        servers: [
            {
                url: 'http://localhost:3000/api/v1', // Base URL
                description: 'Local server',
            },
        ],
    },
    apis: ['./routes/*.js'], // Path to the API docs
};

// Initialize swagger-jsdoc -> returns validated swagger spec in json format
const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;

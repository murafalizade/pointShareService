const express = require('express');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');
const { createServer } = require('node:http');
const { Server } = require('socket.io');
const cors = require('cors');


// Routes
const users = require('./routes/users');
const { serve, setup } = require("swagger-ui-express");
const swaggerSpec = require("./swagger");
const {handleConnection} = require("./services/socketServices");


// Initialize Express app
const app = express();
const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: 'https://point-share.netlify.app',
        methods: ['GET', 'POST', "PUT", "DELETE"],
        credentials: true,  // Allow credentials (cookies, etc.)
    },
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use('/api-docs', serve, setup(swaggerSpec));
app.use(cors({
    origin: 'https://point-share.netlify.app',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
}))

connectDB()
    .then(() => {
        console.log('MongoDB connected successfully');
    })
    .catch(err => {
        console.error('MongoDB connection failed:', err);
        process.exit(1);
    });

app.use('/api/v1/users', users);


io.on('connection', (ws) => {
    handleConnection(ws);
});


server.listen(3000, () => {
    console.log('server running at http://localhost:3000');
});

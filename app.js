const express = require('express');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');
const { createServer } = require('node:http');
const { Server } = require('socket.io');


// Routes
const users = require('./routes/users');
const { serve, setup } = require("swagger-ui-express");
const swaggerSpec = require("./swagger");

// Initialize Express app
const app = express();
const server = createServer(app);
const io = new Server(server);

const socketUsers = {};

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use('/api-docs', serve, setup(swaggerSpec));

connectDB()
    .then(() => {
        console.log('MongoDB connected successfully');
    })
    .catch(err => {
        console.error('MongoDB connection failed:', err);
        process.exit(1);  // Exit process with failure
    });

app.use('/api/v1/users', users);


io.on('connection', (ws, req) => {
    const urlParams = new URLSearchParams(req.url.replace('/?', ''));
    const token = urlParams.get('token');
    const user = jwt.verify(token, JWT_SECRET);

    if (!user) {
        ws.close(4001, 'Unauthorized'); // Close connection if not authorized
        return;
    }

    users[user.id] = socket.id;

    console.log(`WebSocket connection authenticated for user: ${user.username}`);

    ws.on('updateMyLocation', async (userInfo) => {
        const { latitude, longitude } = userInfo;

        const user = await User.findByIdAndUpdate(
            user.id,
            {
                $set: {
                    location: {
                        type: 'Point',
                        coordinates: [longitude, latitude]
                    }
                }
            },
            { new: true }
        ).select('-password');
        ws.to(socket.id).emit("myUser", user);
    });

    ws.on("givePoint", async (pointInfo) => {
        const { targetUserId, points } = pointInfo;

        if (points <= 0) {
            ws.close(4001, 'Points must be greater than zero');
        }

        const targetUser = await User.findById(targetUserId);
        if (!targetUser) {
            ws.close(4001, 'Target user not found' );
        }

        const givingUser = await User.findById(req.userId);
        if (!givingUser) {
            ws.close(4001, 'Giving user not found');
        }

        targetUser.point = (targetUser.point + points) / 2;
        await targetUser.save();

        const targetSocketId = socketUsers[targetUser.id];
        ws.to(targetSocketId).emit("notification", {
            message: `${givingUser.name} has given you ${points} points!`,
            pointsReceived: points,
            totalPoints: targetUser.point
        });
    });

    ws.on("getCloseUser", async (location) => {
        const { latitude, longitude } = location;

        const closeUsers = await User.find({
            location: {
                $geoWithin: {
                    $centerSphere: [
                        [longitude, latitude],
                        100 / 6371
                    ]
                }
            }
        }).select('-password');

        ws.to(socket.id).emit("closeUser", closeUsers);
    })

    ws.on('close', () => {
        console.log(`User ${user.username} disconnected`);
        delete socketUsers[user.id];
    });
});

server.listen(3000, () => {
    console.log('server running at http://localhost:3000');
});

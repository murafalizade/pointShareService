const User = require('../models/user');
const jwt = require("jsonwebtoken");

const socketUsers = {}; // Store connected users by their user ID
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Handle WebSocket connection
const handleConnection = (ws) => {
    const token = getTokenFromSocket(ws);

    if (!token) {
        closeConnection(ws, 'Token not found');
        return;
    }

    const user = verifyToken(ws, token);
    if (!user) {
        return;
    }

    socketUsers[user.userId] = ws.id;
    console.log(`WebSocket connection authenticated for user: ${user.userId}`);

    // Register event listeners
    ws.on('updateMyLocation', (userInfo) => handleUpdateLocation(ws, user.userId, userInfo));
    ws.on('givePoint', (pointInfo) => handleGivePoint(ws, pointInfo));
    ws.on('getCloseUser', (location) => handleGetCloseUser(ws, user.userId, location));

    ws.on('disconnect', () => handleDisconnection(user));
};

// Extract token from the WebSocket handshake query
const getTokenFromSocket = (ws) => {
    return ws.handshake.query.token || null;
};

// Verify the JWT token
const verifyToken = (ws, token) => {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (err) {
        console.log('Invalid token:', err.message);
        closeConnection(ws, 'Invalid token');
        return null;
    }
};

// Close the WebSocket connection
const closeConnection = (ws, reason) => {
    console.log(`Closing connection: ${reason}`);
    ws.disconnect(true); // Use ws.disconnect() instead of ws.close()
};

// Handle disconnection and cleanup
const handleDisconnection = (user) => {
    console.log(`User ${user.username} disconnected`);
    delete socketUsers[user.userId];
};

// Handle updating user's location
const handleUpdateLocation = async (ws, userId, userInfo) => {
    try {
        const { latitude, longitude } = userInfo;
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            {
                $set: {
                    location: {
                        type: 'Point',
                        coordinates: [longitude, latitude],
                    },
                },
            },
            { new: true }
        ).select('-password');

        ws.emit("myUser", updatedUser);
    } catch (error) {
        console.error('Error updating location:', error);
        closeConnection(ws, 'Error updating location');
    }
};

// Handle giving points to a user
const handleGivePoint = async (ws, pointInfo) => {
    const { targetUserId, points } = pointInfo;

    if (points <= 0) {
        closeConnection(ws, 'Invalid points');
        return;
    }

    try {
        const targetUser = await User.findById(targetUserId);
        if (!targetUser) {
            closeConnection(ws, 'Target user not found');
            return;
        }

        const givingUser = await User.findById(ws.id);
        if (!givingUser) {
            closeConnection(ws, 'Giving user not found');
            return;
        }

        targetUser.point = (targetUser.point + points) / 2;
        await targetUser.save();

        const targetSocketId = socketUsers[targetUser.id];
        if (targetSocketId) {
            ws.to(targetSocketId).emit("notification", {
                message: `${givingUser.name} has given you ${points} points!`,
                pointsReceived: points,
                totalPoints: targetUser.point,
            });
        }
    } catch (error) {
        console.error('Error giving points:', error);
        closeConnection(ws, 'Error processing points');
    }
};

// Handle fetching nearby users within 100 meters
const handleGetCloseUser = async (ws, userId, location) => {
    const { latitude, longitude } = location;
    console.log(location, userId)
    try {
        const closeUsers = await User.find({
            location: {
                $geoWithin: {
                    $centerSphere: [
                        [longitude, latitude],
                        100 / 6371, // 100 meters radius
                    ],
                },
            },
            _id: { $ne: userId }, // Exclude the current user
        }).select('-password');

        ws.emit("closeUser", closeUsers);
    } catch (error) {
        console.error('Error fetching close users:', error);
        closeConnection(ws, 'Error fetching close users');
    }
};

module.exports = { handleConnection };

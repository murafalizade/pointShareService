const User = require('../models/user');
const PointHistory = require('../models/PointHistory'); // Import PointHistory model
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
    ws.on('givePoint', (pointInfo) => handleGivePoint(ws, user.userId, pointInfo));
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

            console.log(updatedUser);
        ws.emit("myUserLocation", updatedUser);
    } catch (error) {
        console.error('Error updating location:', error);
        closeConnection(ws, 'Error updating location');
    }
};

// Handle giving points to a user
const handleGivePoint = async (ws,userId, pointInfo) => {
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

        const givingUser = await User.findById(userId);
        if (!givingUser) {
            closeConnection(ws, 'Giving user not found');
            return;
        }

        // Update the target user's points (average with given points)
        targetUser.point = (targetUser.point + points) / 2;
        await targetUser.save();

        // Log the point transaction in PointHistory
        const pointHistory = new PointHistory({
            point: points,
            senderUser: givingUser.id, // Use IDs for tracking
            recipientUser: targetUser.id,
        });
        await pointHistory.save(); // Save the point history entry
        // Notify the target user if they're connected
        const targetSocketId = socketUsers[targetUser.id];
        if (targetSocketId) {
            ws.emit("notification", {
                message: `${givingUser.username} has given you ${points} points!`,
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

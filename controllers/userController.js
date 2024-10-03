const User = require('../models/user');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Register
exports.register = async (req, res) => {
    try {
        const { username, email, password, country } = req.body;

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = new User({
            username,
            email,
            password: hashedPassword,
            country
        });

        await user.save();
        res.status(201).json({ message: 'User registered successfully!' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Login
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ error: 'User not found' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });

        const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '1h' });
        res.json({ token, userId: user._id });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
};

// Get Profile Info
exports.getProfileInfo = async (req, res) => {
    try {
        const user = await User.findById(req.userId).select('-password');
        if (!user) return res.status(404).json({ error: 'User not found' });

        res.json(user);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
};

// Get Close Users (within 100 meters)
exports.getCloseUsers = async (req, res) => {
    // try {
        const { latitude, longitude } = req.body;

        const closeUsers = await User.find({
            location: {
                $geoWithin: {
                    $centerSphere: [
                        [longitude, latitude],
                        100 / 6371 // Convert 100 meters to radians (Earth's radius is ~6371 km)
                    ]
                }
            }
        }).select('-password');

        res.json(closeUsers);
    // } catch (error) {
    //     res.status(500).json({ error});
    // }
};

// Get Top Ranked Users (Top 10 by points in the same country)
exports.getTopRanked = async (req, res) => {
    try {
        const { country } = req.query;

        const topRankedUsers = await User.find({ country })
            .sort({ point: -1 })
            .limit(10)
            .select('-password');

        res.json(topRankedUsers);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
};

// Update My Location
exports.updateMyLocation = async (req, res) => {
    try {
        const { latitude, longitude } = req.body;

        const user = await User.findByIdAndUpdate(
            req.userId,
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

        res.json(user);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
};

// Update My Profile
exports.updateMyProfile = async (req, res) => {
    try {
        const { username, email, country } = req.body;

        const updatedUser = await User.findByIdAndUpdate(
            req.userId,
            { $set: { username, email, country } },
            { new: true }
        ).select('-password');

        res.json(updatedUser);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
};

// Change Password
exports.changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) return res.status(400).json({ error: 'Current password is incorrect' });

        const hashedNewPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedNewPassword;
        await user.save();

        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
};

// Forget Password
exports.forgetPassword = async (req, res) => {
    try {
        const { email } = req.body;

        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ error: 'User not found' });

        const resetToken = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '15m' });

        // Send email with nodemailer (assuming you have SMTP config)
        const transporter = nodemailer.createTransport({
            service: 'Gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: user.email,
            subject: 'Password Reset',
            text: `You requested a password reset. Use this token: ${resetToken}`
        };

        await transporter.sendMail(mailOptions);

        res.json({ message: 'Password reset token sent to email' });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
};

// Give Points to Another User
exports.givePoint = async (req, res) => {
    try {
        const { targetUserId, points } = req.body;

        // Validate that points are a positive number
        if (points <= 0) {
            return res.status(400).json({ error: 'Points must be greater than zero' });
        }

        // Find the target user
        const targetUser = await User.findById( targetUserId);
        if (!targetUser) {
            return res.status(404).json({ error: 'Target user not found' });
        }

        // Find the logged-in user (the giver)
        const givingUser = await User.findById(req.userId);
        if (!givingUser) {
            return res.status(404).json({ error: 'Giving user not found' });
        }

        // Add points to the target user
        targetUser.point += points;
        await targetUser.save();

        res.json({ message: `Successfully gave ${points} points to ${targetUser.username}` });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
};

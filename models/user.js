const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    location: {
        type: {
            type: String,
            enum: ['Point'], // 'Point' is required for GeoJSON format
            required: false
        },
        coordinates: {
            type: [Number], // [longitude, latitude]
            required: false
        }
    },
    date: {
        type: Date,
        default: Date.now
    },
    point: {
        type: Number,
        required: true,
        default: 5
    },
    country: {
        type: String,
        required: true,
    }
});

module.exports = mongoose.model('User', UserSchema);

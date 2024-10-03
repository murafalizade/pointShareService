const mongoose = require('mongoose');

const PointHistory = new mongoose.Schema({
    point: {
        type: Number,
        required: true,
    },
    senderUser:{
        type: String,
        required: true,
    },
    recipientUser: {
        type: String,
        required: true,
    },
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('PointHistory', PointHistory);

const mongoose = require('mongoose');

const pointHistorySchema = new mongoose.Schema({
    // your schema fields here
    senderUser: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    recipientUser: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    point: {
        type: Number,
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

// Check if the model already exists before defining it
const PointHistory = mongoose.models.PointHistory || mongoose.model('PointHistory', pointHistorySchema);

module.exports = PointHistory;

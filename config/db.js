const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        await mongoose.connect("mongodb+srv://murad:0P0cNAFdGmhQV6N7@points-cluster.ltwrg.mongodb.net/?retryWrites=true&w=majority&appName=points-cluster");
        console.log('MongoDB connected...');
    } catch (err) {
        console.error(err.message);
        process.exit(1);
    }
};

module.exports = connectDB;

const mongoose = require('mongoose');

const connectDB = async () => {
        await mongoose.connect("mongodb+srv://murad:0P0cNAFdGmhQV6N7@points-cluster.ltwrg.mongodb.net/?retryWrites=true&w=majority&appName=points-cluster");
};

module.exports = connectDB;

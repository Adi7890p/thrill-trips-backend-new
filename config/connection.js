import mongoose from "mongoose";

// MongoDB connection
const connection = mongoose.connect('mongodb+srv://aditya:ak%40109@thrill-trips.qt6sjqq.mongodb.net/thrill-trips?retryWrites=true&w=majority&appName=thrill-trips').then(() => {
    console.log('Connected to MongoDB park');
}).catch((err) => {
    console.error('Error connecting to MongoDB:', err);
});

export default connection;
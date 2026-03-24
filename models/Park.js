import mongoose from 'mongoose';

const parkSchema = new mongoose.Schema({
    pid: Number,
    pname: String,
    category: String,
    pcity: String,
    price: String,
    parkImage: String,
    rideImages: [String],
    description: String,
    owner: String,
    accountNumber: String,
    phone: String,
    approved: String
});
const Park = mongoose.model('Park', parkSchema, 'parks');

export default Park;
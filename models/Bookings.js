import mongoose from 'mongoose'
const BookingsSchema = new mongoose.Schema({
    username: String,
    pid:Number,
    addons:String,
    persons:Number,
    date:String,
    bill:Number
});
const Bookings = mongoose.model("Bookings", BookingsSchema);
export default Bookings;
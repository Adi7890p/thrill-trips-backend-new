import mongoose from 'mongoose'
const ownerSchema = new mongoose.Schema({
    email: String,
    password: String,
    subscription: { type: Boolean, default: false },
    accountNumber: { type: String, default: null }
});
const Owner = mongoose.model('Owner', ownerSchema, 'owner');

export default Owner;
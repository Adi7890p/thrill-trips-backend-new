import mongoose from 'mongoose'
const adminSchema = new mongoose.Schema({
    unm: String,
    password: String
});
const Admin = mongoose.model('Admin', adminSchema, 'admins');

export default Admin;
import mongoose from 'mongoose';

const notifSchema = new mongoose.Schema({
    owner: String,
    title: String,
    message: String,
    time: { type: Date, default: Date.now },
    read: { type: Boolean, default: false },
    park: { type: mongoose.Schema.Types.Mixed }
});

const Notification = mongoose.model('Notification', notifSchema, 'notifications');

export default Notification;

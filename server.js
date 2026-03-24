/** Restored Clean Version */
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import { fileURLToPath } from 'url';
import Park from './models/Park.js';
import Admin from './models/Admin.js';
import User from './models/User.js';
import Bookings from './models/Bookings.js';
import connection from './config/connection.js';
import { fireapp } from './firebase.js'
import { createUserWithEmailAndPassword, getAuth, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, onAuthStateChanged } from 'firebase/auth'
import Owner from './models/Owner.js';
import Notification from './models/Notification.js';

const JWT_SECRET = "Om_Namh_Shivay_Har_Har_Mahadev";
const app = express();
import http from 'http';
import { Server } from 'socket.io';

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
app.set('io', io);

io.on('connection', (socket) => {
    socket.on('join_admin', () => { socket.join('admin_room'); });
    socket.on('join_owner', (ownerId) => { socket.join(`owner_${ownerId}`); }); // ownerId here is ownerEmail
});

app.use(express.json());
app.use(cors());
app.use((req, res, next) => {
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
    next();
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const storage = multer.diskStorage({
    destination: (req, file, cb) => { cb(null, 'uploads') },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

// -------------------- Park Routes --------------------
app.get('/parks', async (req, res) => {
    try {
        const parks = await Park.find({ approved: 'Approved' }, { '_id': 0, '__v': 0 }).sort({ pid: 1 });
        res.json(parks);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch parks' });
    }
});

app.get('/search/:search', async (req, res) => {
    try {
        const queryNum = Number(req.params.search);
        const orConditions = [
            { pname: { $regex: req.params.search, $options: 'i' } },
            { category: { $regex: req.params.search, $options: 'i' } },
            { pcity: { $regex: req.params.search, $options: 'i' } },
            { description: { $regex: req.params.search, $options: 'i' } }
        ];

        if (!isNaN(queryNum)) {
            orConditions.push({ price: queryNum });
        }

        const parks = await Park.find({ $or: orConditions, approved: 'Approved' }, { '_id': 0, '__v': 0 }).sort({ pid: 1 });
        res.json(parks);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch parks' });
    }
});


app.get('/sort/:sortval', async (req, res) => {
    try {
        let parks;
        if (req.params.sortval === 'lth') {
            parks = await Park.find({ approved: 'Approved' }, { '_id': 0, '__v': 0 }).sort({ price: 1 });
        } else if (req.params.sortval === 'htl') {
            parks = await Park.find({ approved: 'Approved' }, { '_id': 0, '__v': 0 }).sort({ price: -1 });
        } else {
            parks = await Park.find({ approved: 'Approved' }, { '_id': 0, '__v': 0 }).sort({ pid: 1 });
        }
        res.json(parks);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to fetch parks' });
    }
})

app.put('/updatepark/:pid', upload.single('parkImage'), async (req, res) => {
    try {
        const { parkName, parkCategory, pcity, parkPrice, description } = req.body;
        const pid = Number(req.params.pid);
        const pimage = req.file ? req.file.filename : null;
        const park = await Park.findOne({ pid });
        if (!park) return res.status(404).json({ error: 'Park not found' });

        park.pname = parkName || park.pname;
        park.category = parkCategory || park.category;
        park.pcity = pcity || park.pcity;
        park.price = parkPrice || park.price;
        park.description = description || park.description;
        if (pimage) park.pimage = pimage;

        await park.save();
        res.json({ message: 'Park updated successfully', park });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update park' });
    }
});

app.delete('/deletepark/:pid', async (req, res) => {
    try {
        await Park.deleteOne({ pid: req.params.pid });
        res.json({ message: 'Park deleted' });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// -------------------- Admin Routes --------------------
app.get('/admins', async (req, res) => {
    try {
        const admins = await Admin.find({}, { '_id': 0, '__v': 0 });
        res.json(admins);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch admins' });
    }
});

app.post('/addadmin', async (req, res) => {
    try {
        const { unm, password } = req.body;
        const admin = new Admin({ unm, password });
        await admin.save();
        res.json({ message: 'Admin added successfully', admin });
    } catch (err) {
        res.status(500).json({ error: 'Failed to add admin' });
    }
});

app.delete('/deleteadmin/:unm', async (req, res) => {
    try {
        await Admin.deleteOne({ unm: req.params.unm });
        res.json({ message: 'Admin deleted' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete admin' });
    }
});

// -------------------- User Routes --------------------
app.post("/register", async (req, res) => {
    try {
        const { username, password, fullname, email, phone, city } = req.body;
        const existingUser = await User.findOne({ username });
        if (existingUser) return res.json({ message: "Username already exists" });

        const newUser = new User({ username, password, fullname, email, phone, city });
        await newUser.save();
        res.json({ message: "Registration successful", success: true });
    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
});

app.get('/users', async (req, res) => {
    try {
        const users = await User.find({}, { '_id': 0, '__v': 0 });
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch users' });
    }
})

app.get('/user/:username', async (req, res) => {
    try {
        const { username } = req.params;
        const user = await User.find({ username: username }, { '_id': 0, '__v': 0 });
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch users' });
    }
})

app.post("/loginUser", async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ username, password });
        if (user) {
            res.json({ success: true, message: "User login successful" });
        } else {
            res.json({ success: false, message: "Invalid credentials" });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});

app.post('/cng', async (req, res) => {
    const { username, old, neww } = req.body;
    try {
        const user = await User.findOne({ username, password: old });
        if (user) {
            user.password = neww;
            await user.save();
            res.json({ success: true, message: "Password changed successfully!" });
        } else {
            res.json({ success: false, message: "Wrong Password Entered!" });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: "Server error" });
    }
})

app.post('/edit', async (req, res) => {
    const { username, name, email, phone, city } = req.body;
    try {
        const user = await User.findOne({ username });
        if (user) {
            user.fullname = name;
            user.email = email;
            user.phone = phone;
            user.city = city;
            await user.save();
            res.json({ success: true, message: "Profile updated successfully!" });
        } else {
            res.json({ success: false, message: "User not found!" });
        }
    } catch (err) {
        res.json({ success: false, message: "Server error" });
    }
})

app.post("/loginAdmin", async (req, res) => {
    const { username, password } = req.body;
    try {
        const admin = await Admin.findOne({ unm: username, password });
        if (admin) {
            res.json({ success: true, message: "Admin login successful" });
        } else {
            res.json({ success: false, message: "Invalid credentials" });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});

app.get('/admin/admins', async (req, res) => {
    try {
        const admins = await Admin.find({}, { unm: 1 });
        res.json({ success: true, admins });
    } catch (err) {
        res.json({ success: false, message: err });
    }
});

app.post('/admin/admins', async (req, res) => {
    const { unm, password } = req.body;
    try {
        const exists = await Admin.findOne({ unm });
        if (exists) return res.json({ success: false, message: "Username already exists!" });
        const newAdmin = new Admin({ unm, password });
        await newAdmin.save();
        res.json({ success: true, admin: { _id: newAdmin._id, unm: newAdmin.unm } });
    } catch (err) {
        res.json({ success: false, message: err });
    }
});

app.delete('/admin/admins/:id', async (req, res) => {
    try {
        await Admin.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.json({ success: false, message: err });
    }
});

app.post("/book", async (req, res) => {
    try {
        const { username, pid, addons, persons, date, bill } = req.body;
        const newBooking = new Bookings({ username, pid, addons, persons, date, bill });
        await newBooking.save();

        const io = req.app.get('io');
        
        const park = await Park.findOne({ pid });
        if (park && park.owner) {
             const ownerDoc = await Owner.findById(park.owner);
             if (ownerDoc) {
                 const notif = new Notification({
                     owner: ownerDoc.email,
                     title: "New Booking Received",
                     message: `Your park '${park.pname}' received a booking for ${persons} person(s) on ${date}. Total Payment: ₹${bill}.`,
                     park: park
                 });
                 await notif.save();
                 io.to(`owner_${ownerDoc.email}`).emit('new_booking_notification', notif);
             }
        }
        
        io.to('admin_room').emit('new_booking_admin', newBooking);

        res.json({ success: true, message: "Booking confirmed" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Server error" });
    }
})

app.post('/editbook', async (req, res) => {
    try {
        const { pid, addons, persons, date, bill, uid } = req.body;
        const bookings = await Bookings.findOne({ _id: uid });
        bookings.pid = pid;
        bookings.addons = addons;
        bookings.persons = persons;
        bookings.date = date;
        bookings.bill = bill;
        await bookings.save();
        res.json({ message: "Booking updated" });
    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
})

app.get("/bookings/:username", async (req, res) => {
    try {
        const bookings = await Bookings.aggregate([
            { $match: { username: req.params.username } },
            { $lookup: { from: "parks", localField: "pid", foreignField: "pid", as: "park" } },
            { $lookup: { from: "users", localField: "username", foreignField: "username", as: "user" } },
            { $unwind: "$park" },
            { $unwind: "$user" }
        ])
        res.json(bookings);
    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
})

app.delete('/cancel/:_id', async (req, res) => {
    try {
        const booking = await Bookings.findById(req.params._id);
        if (!booking) return res.json({ message: 'Booking not found' });

        const park = await Park.findOne({ pid: booking.pid });
        const io = req.app.get('io');

        if (park) {
            const ownerDoc = await Owner.findById(park.owner);
            if (ownerDoc) {
                const notif = new Notification({
                    owner: ownerDoc.email,
                    title: "Booking Cancelled",
                    message: `A booking for ${park.pname} on ${booking.date} by ${booking.username} was cancelled.`,
                    park: park.toObject()
                });
                await notif.save();
                io.to(`owner_${ownerDoc.email}`).emit('new_booking_notification', notif);
            }
        }

        await Bookings.deleteOne({ _id: req.params._id });
        io.to('admin_room').emit('booking_cancelled_admin', { _id: req.params._id });

        res.json({ message: 'Booking deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
})

app.get('/bookpark/:pid', async (req, res) => {
    try {
        const { pid } = req.params;
        const park = await Park.findOne({ pid });
        res.json(park);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

const auth = getAuth(fireapp);

app.post("/owner-signup-email", async (req, res) => {
    const { email, pwd } = req.body;
    try {
        await createUserWithEmailAndPassword(auth, email, pwd);
        const owner = new Owner({ email, password: pwd });
        await owner.save();
        res.json({ success: true });
    } catch (err) {
        res.json({ success: false, message: err });
    }
})

app.post("/owner-login-email", async (req, res) => {
    const { email, pwd } = req.body;
    try {
        await signInWithEmailAndPassword(auth, email, pwd);
        const owner = await Owner.findOne({ email });
        const token = jwt.sign({ id: owner._id }, JWT_SECRET, { expiresIn: "2h" });
        res.json({ success: true, message: email + " logined successfully", token });
    } catch (err) {
        const ownerEmail = await Owner.findOne({ email });
        if (!ownerEmail) {
            return res.json({ success: false, message: "email not found" });
        }
        res.json({ success: false, message: "wrong" });
    }
})

app.post("/google-signin", async (req, res) => {
    const { email } = req.body;
    try {
        let owner = await Owner.findOne({ email });
        if (!owner) {
            owner = new Owner({ email });
            await owner.save();
        }
        const token = jwt.sign({ id: owner._id }, JWT_SECRET, { expiresIn: "2h" });
        res.json({ success: true, message: email + " logined successfully", token });
    } catch (err) {
        res.json({ success: false, message: err });
    }
})

app.post("/owner-verifier", async (req, res) => {
    const { token } = req.body;
    try {
        if (!token) return res.json({ success: false, message: "Owner not found" });
        const { id } = jwt.verify(token, JWT_SECRET);
        const owner = await Owner.findById(id);
        if (owner) {
            const parksCount = await Park.countDocuments({ owner: owner._id });
            res.json({
                success: true,
                message: "Owner verified",
                owner: owner.email,
                subscribed: owner.subscription || false,
                accountNumber: owner.accountNumber || "",
                hasParks: parksCount > 0
            });
        } else {
            res.json({ success: false, message: "Owner not found" });
        }
    } catch (err) {
        res.json({ error: true, message: "Invalid token" });
    }
})

app.post("/owner/subscribe", async (req, res) => {
    const { token } = req.body;
    try {
        if (!token) return res.json({ success: false, message: "No token" });
        const { id } = jwt.verify(token, JWT_SECRET);
        const owner = await Owner.findByIdAndUpdate(id, { subscription: true }, { new: true });
        if (owner) {
            res.json({ success: true, message: "Subscription active", subscribed: owner.subscription });
        } else {
            res.json({ success: false, message: "Owner not found" });
        }
    } catch (err) {
        res.json({ success: false, message: "Invalid token" });
    }
});


app.post("/owner/addpark", upload.fields([{ name: "parkImage", maxCount: 1 }, { name: "rideImages", maxCount: 3 }]), async (req, res) => {
    const { parkName, category, price, pcity, description, phone, owner, accountNumber } = req.body;
    const parkId = Math.floor(Math.random() * 10000000900);
    const approved = "Pending";
    try {
        const ownerDoc = await Owner.findOne({ email: owner });
        if (!ownerDoc) {
            return res.json({ success: false, message: "Owner not found" });
        }
        
        let finalAccount = accountNumber || ownerDoc.accountNumber;
        if (accountNumber && !ownerDoc.accountNumber) {
            ownerDoc.accountNumber = accountNumber;
            await ownerDoc.save();
        }

        const parkImage = req.files.parkImage && req.files.parkImage[0] ? req.files.parkImage[0].filename : null;
        const rideImages = req.files.rideImages ? req.files.rideImages.map(file => file.filename) : [];
        const newpark = new Park({ pid: parkId, pname: parkName, category, pcity, price, description, phone, owner: ownerDoc._id, accountNumber: finalAccount, approved, parkImage, rideImages });
        await newpark.save();

        const emitPark = newpark.toObject();
        emitPark.ownerEmail = ownerDoc.email;
        if (!emitPark.accountNumber && finalAccount) emitPark.accountNumber = finalAccount; // Complete override
        
        const io = req.app.get('io');
        io.to('admin_room').emit('new_park_request', emitPark);

        res.json({ success: true, message: "Park added successfully", newpark });
    } catch (err) {
        res.json({ success: false, message: err });
    }
})

app.get('/owner/data/:email', async (req, res) => {
    try {
        const ownerDoc = await Owner.findOne({ email: req.params.email });
        if (!ownerDoc) return res.json({ success: false, message: "Owner not found" });

        const parks = await Park.find({ owner: ownerDoc._id });
        const parkIds = parks.map(p => p.pid);

        const bookings = await Bookings.aggregate([
            { $match: { pid: { $in: parkIds } } },
            { $lookup: { from: 'parks', localField: 'pid', foreignField: 'pid', as: 'parkInfo' } },
            { $unwind: '$parkInfo' },
            { $sort: { _id: -1 } }
        ]);

        // Calculate Stats
        let totalRevenue = 0;
        let todaysBookings = 0;
        
        const now = new Date();
        const dd = String(now.getDate()).padStart(2, '0');
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const yyyy = now.getFullYear();
        const todayStr = `${dd}-${mm}-${yyyy}`;

        bookings.forEach(b => {
             const addonsStr = String(b.addons || "").toLowerCase();
             let addonAmt = 0;
             if (addonsStr.includes('express pass')) addonAmt += 250;
             if (addonsStr.includes('meal pass')) addonAmt += 180;
             if (addonsStr.includes('locker pass')) addonAmt += 100;
             
             let basePrice = Number(b.bill || 0) - addonAmt;
             if(basePrice < 0) basePrice = 0;
             totalRevenue += (basePrice * 0.90) + (addonAmt * 0.40);

             if (b.date === todayStr) {
                  todaysBookings++;
             }
        });

        res.json({ success: true, parks, bookings, stats: { totalRevenue, todaysBookings } });
    } catch(err) {
        console.error(err);
        res.json({ success: false, message: err });
    }
});

app.put('/admin/parks/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        const park = await Park.findByIdAndUpdate(req.params.id, { approved: status }, { new: true });

        const io = req.app.get('io');
        const ownerDoc = await Owner.findById(park.owner);
        if (ownerDoc) {
            const notif = new Notification({
                owner: ownerDoc.email,
                title: `Park ${park.approved.toUpperCase()}`,
                message: `Your park '${park.pname}'is ${park.approved} by the Thrill Trips.`,
                park: park
            });
            await notif.save();
            io.to(`owner_${ownerDoc.email}`).emit('park_status_updated', notif);
        }

        io.to('admin_room').emit('status_updated', park);
        res.json({ success: true, park });
    } catch (err) {
        res.json({ success: false, message: err });
    }
});

app.get('/admin/parks/pending', async (req, res) => {
    try {
        const parks = await Park.find({ approved: 'Pending' }).sort({ _id: -1 });
        const parksWithAccounts = await Promise.all(parks.map(async (p) => {
            const parkObj = p.toObject();
            if (parkObj.owner) {
                try {
                    const ownerDoc = await Owner.findById(parkObj.owner);
                    if (ownerDoc) {
                        parkObj.ownerEmail = ownerDoc.email;
                        if (!parkObj.accountNumber) parkObj.accountNumber = ownerDoc.accountNumber;
                    }
                } catch(e) {}
            }
            return parkObj;
        }));
        res.json({ success: true, parks: parksWithAccounts });
    } catch (err) {
        res.json({ success: false, message: err });
    }
});

app.get('/owner/notifications/:email', async (req, res) => {
    try {
        const notifications = await Notification.find({ owner: req.params.email, read: false }).sort({ _id: -1 });
        res.json({ success: true, notifications });
    } catch (err) {
        res.json({ success: false, message: err });
    }
});

app.post('/owner/notifications/read', async (req, res) => {
    try {
        await Notification.updateMany({ owner: req.body.email, read: false }, { read: true });
        res.json({ success: true });
    } catch (err) {
        res.json({ success: false, message: err });
    }
});

app.get('/admin/dashboard-data', async (req, res) => {
    try {
        const users = await User.find({}).sort({ _id: -1 });
        const owners = await Owner.find({}).sort({ _id: -1 });
        const parks = await Park.find({}).sort({ _id: -1 });
        const bookings = await Bookings.aggregate([
            { $lookup: { from: 'parks', localField: 'pid', foreignField: 'pid', as: 'park' } },
            { $unwind: { path: '$park', preserveNullAndEmptyArrays: true } },
            { $sort: { _id: -1 } }
        ]);

        let totalRevenue = 0;
        bookings.forEach(b => {
             const addonsStr = String(b.addons || "").toLowerCase();
             let addonAmt = 0;
             if (addonsStr.includes('express pass')) addonAmt += 250;
             if (addonsStr.includes('meal pass')) addonAmt += 180;
             if (addonsStr.includes('locker pass')) addonAmt += 100;
             
             let basePrice = Number(b.bill || 0) - addonAmt;
             if(basePrice < 0) basePrice = 0;
             // Admin gets 10% of base and 60% of addons
             totalRevenue += (basePrice * 0.10) + (addonAmt * 0.60);
        });
        const subscribedOwners = owners.filter(o => o.subscription).length;
        totalRevenue += (subscribedOwners * 999);

        res.json({ 
            success: true, 
            users, 
            owners, 
            parks, 
            bookings, 
            stats: { 
                totalUsers: users.length, 
                totalOwners: owners.length, 
                totalParks: parks.length, 
                totalBookings: bookings.length, 
                totalRevenue 
            } 
        });
    } catch (err) {
        res.json({ success: false, message: err });
    }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

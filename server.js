const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

app.use(session({
    secret: process.env.SESSION_SECRET || 'secret_key_freefire',
    resave: false,
    saveUninitialized: false
}));

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/freefire')
    .then(() => console.log("DB Connected"))
    .catch(err => console.log(err));

const User = mongoose.model('User', new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true }
}));

app.get('/', (req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="bn">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Free Fire Private Server</title>
    <style>
        body { background: #111; color: #fff; font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
        .box { background: #222; padding: 25px; border-radius: 10px; width: 300px; text-align: center; box-shadow: 0 0 10px rgba(0,0,0,0.5); }
        input { width: 90%; padding: 10px; margin: 8px 0; background: #333; border: 1px solid #444; color: #fff; border-radius: 5px; outline: none; }
        button { width: 95%; padding: 10px; background: #ff5722; color: #fff; border: none; border-radius: 5px; font-weight: bold; cursor: pointer; margin-top: 10px; }
        .toggle { background: none; border: none; color: #4fc3f7; cursor: pointer; margin-top: 15px; font-size: 12px; }
    </style>
</head>
<body>
    <div class="box">
        <h2 id="title">লগইন</h2>
        <form id="form">
            <input type="text" id="username" placeholder="ইউজারনেম" required>
            <input type="password" id="password" placeholder="পাসওয়ার্ড" required>
            <button type="submit" id="btn">প্রবেশ করুন</button>
        </form>
        <button class="toggle" onclick="toggle()">অ্যাকাউন্ট নেই? সাইন-আপ</button>
        <p id="msg" style="font-size: 13px; margin-top: 10px;"></p>
    </div>
    <script>
        let isLogin = true;
        function toggle() {
            isLogin = !isLogin;
            document.getElementById('title').innerText = isLogin ? "লগইন" : "সাইন-আপ";
            document.getElementById('btn').innerText = isLogin ? "প্রবেশ করুন" : "রেজিস্ট্রেশন করুন";
        }
        document.getElementById('form').onsubmit = async (e) => {
            e.preventDefault();
            let u = document.getElementById('username').value;
            let p = document.getElementById('password').value;
            let res = await fetch(isLogin ? '/api/login' : '/api/signup', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({username: u, password: p})
            });
            let data = await res.json();
            document.getElementById('msg').innerText = data.message;
            if(data.success) {
                if(isLogin) { window.location.href = '/download-page'; } 
                else { toggle(); }
            }
        }
    </script>
</body>
</html>`);
});

app.post('/api/signup', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ success: false, message: "ইউজারনেম ও পাসওয়ার্ড দিন!" });
        const existing = await User.findOne({ username });
        if (existing) return res.status(400).json({ success: false, message: "এই ইউজারনেমটি ইতিমধ্যে আছে!" });
        const hashedPassword = await bcrypt.hash(password, 10);
        await new User({ username, password: hashedPassword }).save();
        res.json({ success: false, message: "সাইন-আপ সফল! এবার লগইন করুন।" });
    } catch (e) { res.status(500).json({ success: false, message: "সার্ভার এরর!" }); }
});

app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(400).json({ success: false, message: "ভুল ইউজারনেম বা পাসওয়ার্ড!" });
        }
        req.session.userId = user._id;
        req.session.username = user.username;
        res.json({ success: true, message: "লগইন সফল!" });
    } catch (e) { res.status(500).json({ success: false, message: "সার্ভার এরর!" }); }
});

app.get('/download-page', (req, res) => {
    if (!req.session.userId) return res.redirect('/');
    res.send(`<!DOCTYPE html>
<html lang="bn"><head><meta charset="UTF-8"><title>ডাউনলোড পেজ</title></head>
<body style="background:#111; color:#fff; text-align:center; padding-top:100px; font-family:sans-serif;">
    <h1 style="color:#4caf50;">স্বাগতম! সফলভাবে লগইন হয়েছে।</h1>
    <p>নিচের লিংকে ক্লিক করে আপনার ফ্রি ফায়ার ফাইলটি ডাউনলোড করুন:</p>
    <a href="YOUR_APK_DOWNLOAD_LINK_HERE" style="display:inline-block; margin-top:20px; padding:12px 25px; background:#008cba; color:white; text-decoration:none; border-radius:5px; font-weight:bold;">ডাউনলোড করুন</a>
</body>
</html>`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on port " + PORT));

document.getElementById('form').onsubmit = async (e) => {
    e.preventDefault();
    let u = document.getElementById('username').value;
    let p = document.getElementById('password').value;
    let msgBox = document.getElementById('msg');
    
    msgBox.style.color = "#ff5722";
    msgBox.innerText = "লোডিং হচ্ছে...";

    try {
        let res = await fetch(isLogin ? '/api/login' : '/api/signup', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({username: u, password: p})
        });
        
        let data = await res.json();
        msgBox.innerText = data.message;
        
        if(data.success) {
            msgBox.style.color = "#4caf50";
            if(isLogin) { 
                window.location.href = '/download-page'; 
            } else { 
                setTimeout(toggle, 1500); // সাইন আপ সফল হলে লগইন ট্যাবে নিয়ে যাবে
            }
        } else {
            msgBox.style.color = "#ff5252";
        }
    } catch (err) {
        msgBox.style.color = "#ff5252";
        msgBox.innerText = "সার্ভার কানেকশন এরর!";
    }
}

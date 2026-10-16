const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// মিডলওয়্যার সেটআপ
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(session({
    secret: 'freefire_secret_key_123',
    resave: false,
    saveUninitialized: true
}));

// সাময়িকভাবে ইউজার ডাটা সেভ করার জন্য একটি অবজেক্ট (বা এখানে ডাটাবেজ কানেক্ট করতে পারেন)
const usersDB = {}; 

// আপনার মডিফাই করা গেমের ডাউনলোড লিংক এখানে বসাবেন
const GAME_APK_LINK = "https://your-download-link.com/freefire-mod.apk";

// ১. হোম পেজ (লগইন ও সাইন-আপ ফর্ম একসাথে)
app.get('/', (req, res) => {
    res.send(`<!DOCTYPE html>
    <html lang="bn">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>ফ্রি ফায়ার প্রাইভেট সার্ভার লগইন</title>
        <style>
            body { background: #0f172a; color: #fff; font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
            .card { background: #1e293b; padding: 30px; border-radius: 10px; width: 320px; box-shadow: 0 4px 15px rgba(0,0,0,0.5); text-align: center; }
            input { width: 100%; padding: 12px; margin: 10px 0; background: #0f172a; border: 1px solid #334155; color: #fff; border-radius: 5px; box-sizing: border-box; }
            button { width: 100%; padding: 12px; background: #3b82f6; border: none; color: white; font-weight: bold; border-radius: 5px; cursor: pointer; margin-top: 10px; }
            button:hover { background: #2563eb; }
            .toggle { margin-top: 15px; cursor: pointer; color: #60a5fa; font-size: 14px; }
            #msg { margin-top: 10px; font-size: 14px; }
        </style>
    </head>
    <body>
        <div class="card">
            <h2 id="title">লগইন করুন</h2>
            <form id="authForm">
                <input type="text" id="username" placeholder="ইউজারনেম দিন" required>
                <input type="password" id="password" placeholder="পাসওয়ার্ড দিন" required>
                <button type="submit" id="btnText">লগইন</button>
            </form>
            <p id="msg"></p>
            <div class="toggle" onclick="toggleMode()">একাউন্ট নেই? সাইন আপ করুন</div>
        </div>

        <script>
            let isLogin = true;
            function toggleMode() {
                isLogin = !isLogin;
                document.getElementById('title').innerText = isLogin ? "লগইন করুন" : "নতুন একাউন্ট তৈরি করুন";
                document.getElementById('btnText').innerText = isLogin ? "লগইন" : "রেজিস্ট্রেশন";
                document.querySelector('.toggle').innerText = isLogin ? "একাউন্ট নেই? সাইন আপ করুন" : "লগইন করা আছে? লগইন করুন";
            }

            document.getElementById('authForm').onsubmit = async (e) => {
                e.preventDefault();
                let u = document.getElementById('username').value;
                let p = document.getElementById('password').value;
                let msgBox = document.getElementById('msg');
                
                msgBox.style.color = "#fbbf24";
                msgBox.innerText = "অপেক্ষা করুন...";

                let endpoint = isLogin ? '/api/login' : '/api/signup';

                try {
                    let res = await fetch(endpoint, {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({username: u, password: p})
                    });
                    let data = await res.json();
                    
                    msgBox.style.color = data.success ? "#22c55e" : "#ef4444";
                    msgBox.innerText = data.message;

                    if(data.success) {
                        if(isLogin) {
                            setTimeout(() => { window.location.href = '/download-page'; }, 1000);
                        } else {
                            setTimeout(() => { toggleMode(); }, 1500);
                        }
                    }
                } catch(err) {
                    msgBox.style.color = "#ef4444";
                    msgBox.innerText = "সার্ভার কানেকশন এরর!";
                }
            }
        </script>
    </body>
    </html>`);
});

// ২. সাইন-আপ API
app.post('/api/signup', (req, res) => {
    const { username, password } = req.body;
    if (usersDB[username]) {
        return res.json({ success: false, message: "এই ইউজারনেম আগেই ব্যবহার করা হয়েছে!" });
    }
    usersDB[username] = password;
    res.json({ success: true, message: "রেজিস্ট্রেশন সফল হয়েছে! এখন লগইন করুন।" });
});

// ৩. লগইন API
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (usersDB[username] && usersDB[username] === password) {
        req.session.user = username;
        return res.json({ success: true, message: "লগইন সফল! ডাউনলোড পেজে নেওয়া হচ্ছে..." });
    }
    res.json({ success: false, message: "ভুল ইউজারনেম বা পাসওয়ার্ড!" });
});

// ৪. ডাউনলোড পেজ
app.get('/download-page', (req, res) => {
    if (!req.session.user) return res.redirect('/');
    
    res.send(`<!DOCTYPE html>
    <html lang="bn">
    <head>
        <meta charset="UTF-8">
        <title>ডাউনলোড পেজ</title>
        <style>
            body { background: #0f172a; color: #fff; font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; text-align: center; }
            .card { background: #1e293b; padding: 40px; border-radius: 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.5); }
            .btn { display: inline-block; margin-top: 20px; padding: 12px 30px; background: #22c55e; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; }
            .btn:hover { background: #16a34a; }
        </style>
    </head>
    <body>
        <div class="card">
            <h1 style="color: #22c55e;">লগইন সফল হয়েছে!</h1>
            <p>আপনার প্রাইভেট সার্ভারের মডিফাই করা গেম APK ফাইলটি নিচে থেকে ডাউনলোড করুন:</p>
            <a href="${GAME_APK_LINK}" class="btn" target="_blank">APK ডাউনলোড করুন</a>
        </div>
    </body>
    </html>`);
});

// সার্ভার স্টার্ট
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

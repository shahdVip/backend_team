import express from 'express';
import connectDB from './DB/connection.js'; // استدعاء ملف الاتصال

const PORT = process.env.PORT || 3000;
import initApp from './src/initApp.js';
import 'dotenv/config';

const app = initApp(); // <-- استدعاء initApp بدون تمرير express

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Hello world! Server is running');
});
import crypto from 'crypto';
import fs from 'fs';

const key = crypto.randomBytes(32); // نفس طول المفتاح اللي رح تستخدمه
const iv = crypto.randomBytes(16);

const imageBuffer = fs.readFileSync("profile.jpg");

// Encrypt
const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
const encrypted = Buffer.concat([cipher.update(imageBuffer), cipher.final()]);

// Decrypt
const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);

fs.writeFileSync("test-decrypted.png", decrypted);
console.log("Done!");

console.log(decrypted);

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

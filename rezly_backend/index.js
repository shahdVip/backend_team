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


app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

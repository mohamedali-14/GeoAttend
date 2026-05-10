const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

app.get('/health', (req, res) => {
    res.json({ status: 'OK', message: 'GeoAttend API is running on Vercel' });
});

module.exports = app;
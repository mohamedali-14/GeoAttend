const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

app.get('/health', (req, res) => {
    res.json({ status: 'OK', message: 'GeoAttend API is running on Vercel' });
});

app.get('/', (req, res) => {
    res.json({ message: 'GeoAttend API is ready', endpoints: ['/health'] });
});


module.exports = app;
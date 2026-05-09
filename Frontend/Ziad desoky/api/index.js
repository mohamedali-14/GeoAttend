const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'GeoAttend API is running' });
});

app.get('/api/test', (req, res) => {
    res.json({ message: 'API is working!' });
});

module.exports = app;
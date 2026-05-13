const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', message: 'Backend is working!' });
});

// Test endpoint
app.get('/test', (req, res) => {
    res.json({ message: 'Test endpoint works!' });
});

// Auth endpoint (placeholder)
app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    res.json({ success: true, message: 'Login successful', email });
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({ message: 'GeoAttend API is running' });
});

module.exports = app;

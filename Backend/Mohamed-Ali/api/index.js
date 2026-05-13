// Simple working API for Vercel
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Simple health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'Backend is working!' });
});

// Simple test endpoint
app.get('/test', (req, res) => {
    res.json({ message: 'Test endpoint works!' });
});

// Login endpoint
app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    res.json({ 
        success: true, 
        token: 'test-token-123',
        user: { email, name: 'Test User', role: 'STUDENT' }
    });
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({ message: 'GeoAttend API is running' });
});

module.exports = app;

const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'Backend is working!' });
});

// Test endpoint
app.get('/test', (req, res) => {
    res.json({ message: 'API test endpoint works!' });
});

// Login endpoint
app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    res.json({
        success: true,
        token: 'test-jwt-token-12345',
        user: { email, name: 'Test User', role: 'STUDENT' }
    });
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({ message: 'GeoAttend API is running', endpoints: ['/health', '/test', '/api/auth/login'] });
});

// Start server (REQUIRED for Railway)
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`✅ GeoAttend API running on port ${PORT}`);
});

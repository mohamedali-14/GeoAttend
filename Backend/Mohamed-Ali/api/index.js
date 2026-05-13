const app = require('../src/app');

// Add a direct health endpoint for Vercel
app.get('/health', (req, res) => {
    res.json({ status: 'OK', message: 'Health check working!' });
});

// Add a test endpoint
app.get('/api/test', (req, res) => {
    res.json({ message: 'API is working!' });
});

module.exports = app;

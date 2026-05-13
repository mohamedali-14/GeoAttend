const app = require('../src/app');

// Add direct health endpoint at root level for Vercel
app.get('/health', (req, res) => {
    res.json({ status: 'OK', message: 'Health check working!' });
});

// Add test endpoint
app.get('/api/test', (req, res) => {
    res.json({ message: 'API is working!' });
});

module.exports = app;

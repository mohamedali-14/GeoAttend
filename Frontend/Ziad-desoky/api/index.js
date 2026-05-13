const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

app.get('/health', (req, res) => {
    res.json({ status: 'OK', message: 'GeoAttend API is running on Vercel' });
});

app.post('/api/auth/login', (req, res) => {
    res.json({ success: true, message: 'Login successful' });
});

app.post('/api/auth/register', (req, res) => {
    res.json({ success: true, message: 'User registered' });
});

app.get('/api/sessions', (req, res) => {
    res.json({ success: true, sessions: [] });
});

app.post('/api/sessions', (req, res) => {
    res.json({ success: true, message: 'Session created' });
});

app.post('/api/attendance/mark', (req, res) => {
    res.json({ success: true, message: 'Attendance marked' });
});

app.get('/api/quiz/:sessionId', (req, res) => {
    res.json({ success: true, questions: [] });
});

app.post('/api/quiz/submit', (req, res) => {
    res.json({ success: true, score: 85 });
});

module.exports = app;

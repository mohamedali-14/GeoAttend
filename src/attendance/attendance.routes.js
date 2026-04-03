const express = require('express');
const router = express.Router();
const { authenticateUser, requireRole } = require('../../middleware/auth.middleware');
const {
    joinSession,
    getNearbySessions,
    getAttendanceHistory,
    getSessionSummary
} = require('./attendance.controller');


router.use(authenticateUser);


router.post('/sessions/:sessionId/join', joinSession);


router.get('/sessions/nearby', getNearbySessions);


router.get('/history', getAttendanceHistory);

router.get('/sessions/:sessionId/summary', requireRole('PROFESSOR', 'ADMIN'), getSessionSummary);

module.exports = router;
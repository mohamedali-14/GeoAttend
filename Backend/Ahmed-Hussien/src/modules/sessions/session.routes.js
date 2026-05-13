const express = require('express');
const router = express.Router();
const { authenticateUser, requireRole } = require("../../middleware/auth.middleware");
const {
    createSession,
    startSession,
    pauseSession,
    resumeSession,
    endSession,
    getSession,
    getSessions
} = require("./session.controller");

// All routes require authentication
router.use(authenticateUser);

// Public routes (authenticated)
router.get('/', getSessions);
router.get('/:sessionId', getSession);

// Professor only routes
router.post('/', requireRole("PROFESSOR"), createSession);
router.post('/:sessionId/start', requireRole("PROFESSOR"), startSession);
router.post('/:sessionId/pause', requireRole("PROFESSOR"), pauseSession);
router.post('/:sessionId/resume', requireRole("PROFESSOR"), resumeSession);
router.post('/:sessionId/end', requireRole("PROFESSOR"), endSession);

module.exports = router;
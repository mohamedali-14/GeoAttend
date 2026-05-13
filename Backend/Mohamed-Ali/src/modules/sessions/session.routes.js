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

// Professor only routes - accept both PROFESSOR and DOCTOR roles
router.post('/', requireRole("PROFESSOR", "DOCTOR"), createSession);
router.post('/:sessionId/start', requireRole("PROFESSOR", "DOCTOR"), startSession);
router.post('/:sessionId/pause', requireRole("PROFESSOR", "DOCTOR"), pauseSession);
router.post('/:sessionId/resume', requireRole("PROFESSOR", "DOCTOR"), resumeSession);
router.post('/:sessionId/end', requireRole("PROFESSOR", "DOCTOR"), endSession);

module.exports = router;
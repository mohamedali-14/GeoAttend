// src/modules/analytics/quiz.routes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticateUser, requireRole } = require('../../middleware/auth.middleware');
const upload = multer({ storage: multer.memoryStorage() });

const {
    uploadLectureAndGenerateQuiz,
    getQuiz,
    submitQuiz,
    getQuizAnalyticsEndpoint
} = require('./quiz.controller');

// All routes require authentication
router.use(authenticateUser);

// Professor only routes
router.post('/sessions/:sessionId/upload-lecture', requireRole('PROFESSOR'), upload.single('pdf'), uploadLectureAndGenerateQuiz);
router.get('/sessions/:sessionId/quiz-analytics', requireRole('PROFESSOR'), getQuizAnalyticsEndpoint);

// Student routes
router.get('/:sessionId', getQuiz);
router.post('/submit', submitQuiz);

module.exports = router;
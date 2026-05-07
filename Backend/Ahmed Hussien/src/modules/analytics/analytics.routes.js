const express = require('express');
const router = express.Router();
const { authenticateUser, requireRole } = require('../middleware/auth.middleware');
const {
    getAttendanceStatsHandler,
    getAttendanceTrendsHandler,
    getStudentEngagementHandler,
    getCourseAnalyticsHandler,
    getRealtimeDashboardHandler,
    getQuickStatsHandler,
    exportAnalyticsHandler
} = require('../controllers/analytics.controller');

router.use(authenticateUser);

router.get('/quick-stats', getQuickStatsHandler);

router.get('/attendance-stats', requireRole('PROFESSOR', 'ADMIN'), getAttendanceStatsHandler);

router.get('/attendance-trends', requireRole('PROFESSOR', 'ADMIN'), getAttendanceTrendsHandler);

router.get('/student/:studentId/engagement', getStudentEngagementHandler);

router.get('/course/:courseId/analytics', requireRole('PROFESSOR', 'ADMIN'), getCourseAnalyticsHandler);

router.get('/realtime-dashboard', requireRole('PROFESSOR', 'ADMIN'), getRealtimeDashboardHandler);

router.get('/export', requireRole('PROFESSOR', 'ADMIN'), exportAnalyticsHandler);

module.exports = router;
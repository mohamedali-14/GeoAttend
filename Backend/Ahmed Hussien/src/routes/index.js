// src/index.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');
const multer = require('multer');

admin.initializeApp();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Configure multer for file uploads
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files are allowed'), false);
        }
    }
});

// ============================================
// WEEK 5 IMPORTS
// ============================================
const { createSession, updateSessionVerificationSettings, getSession } = require('./controllers/session.controller');
const { markAttendance } = require('./controllers/attendance.controller');
const { verifySelfie, rejectSelfie, getPendingSelfiesForSession } = require('./utils/selfieUpload');
const { generateSessionAttendanceExcel, generateSessionAttendancePDF } = require('./services/export.service');
const { authenticateUser, requireRole } = require('./middleware/auth.middleware');

// ============================================
// WEEK 6 IMPORTS - Analytics & AI Quiz
// ============================================
const { 
    buildCustomReport, 
    scheduleReport, 
    generateComparativeReport, 
    generateStudentProgressReport, 
    exportToCSV, 
    exportToJSON 
} = require('../week6/advanced-report.service');

const { 
    getQuiz, 
    submitQuiz, 
    getQuizAnalyticsEndpoint,
    uploadLectureAndGenerateQuiz,
    getStudentQuizResults,
    getAllQuizSubmissions
} = require('../controllers/quiz.controller');

const { getAttendanceStats, getAttendanceTrends, getStudentEngagement, getCourseAnalytics, getRealtimeDashboard, getQuickStats, exportAnalyticsData } = require('../services/analytics.service');
const { checkAtRiskStudents, getSystemMetrics } = require('../services/monitoring.service');

// ============================================
// HEALTH CHECK ENDPOINT
// ============================================
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        message: 'GeoAttend API is running',
        version: '2.0.0'
    });
});

// ============================================
// SESSION ENDPOINTS (Week 5)
// ============================================

// Create session
app.post('/sessions', authenticateUser, requireRole('PROFESSOR'), async (req, res) => {
    try {
        const { title, courseId, professorId, professorName, scheduledDate, location, radius, verificationSettings } = req.body;
        const sessionId = await createSession({ title, courseId, professorId, professorName, scheduledDate, location, radius, verificationSettings });
        res.status(201).json({ success: true, sessionId });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// Get session details
app.get('/sessions/:sessionId', authenticateUser, async (req, res) => {
    try {
        const session = await getSession(req.params.sessionId);
        res.status(200).json({ success: true, session });
    } catch (error) {
        res.status(404).json({ success: false, error: error.message });
    }
});

// Update session verification settings
app.patch('/sessions/:sessionId/verification-settings', authenticateUser, requireRole('PROFESSOR'), async (req, res) => {
    try {
        const { professorId, ...updates } = req.body;
        await updateSessionVerificationSettings(req.params.sessionId, professorId, updates);
        res.status(200).json({ success: true });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// Create session with advanced verification settings
app.post('/sessions/with-settings', authenticateUser, requireRole('PROFESSOR'), async (req, res) => {
    try {
        const { title, courseId, scheduledDate, location, radius, verificationSettings } = req.body;
        const sessionId = await createSessionWithSettings({
            title, courseId, professorId: req.user.uid, professorName: req.user.fullName,
            scheduledDate, location, radius, verificationSettings
        });
        res.status(201).json({ success: true, sessionId, message: "Session created successfully with verification settings" });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// Get session settings
app.get('/sessions/:sessionId/settings', authenticateUser, async (req, res) => {
    try {
        const { sessionId } = req.params;
        const session = await getSessionWithSettings(sessionId);
        if (req.user.role === 'PROFESSOR' && session.professorId !== req.user.uid) {
            return res.status(403).json({ success: false, error: "You do not have permission to view this session" });
        }
        res.status(200).json({ success: true, session });
    } catch (error) {
        res.status(404).json({ success: false, error: error.message });
    }
});

// ============================================
// ATTENDANCE ENDPOINTS (Week 5)
// ============================================

// Mark attendance (basic)
app.post('/attendance/mark', authenticateUser, requireRole('STUDENT'), async (req, res) => {
    try {
        const { sessionId, studentId, location, selfieBase64, ipAddress } = req.body;
        let selfieBuffer = null;
        let selfieMimeType = null;
        if (selfieBase64) {
            const matches = selfieBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
            if (matches && matches.length === 3) {
                selfieMimeType = matches[1];
                selfieBuffer = Buffer.from(matches[2], 'base64');
            } else {
                selfieBuffer = Buffer.from(selfieBase64, 'base64');
                selfieMimeType = 'image/jpeg';
            }
        }
        const result = await markAttendance(sessionId, studentId, { location, selfieBuffer, selfieMimeType, ipAddress });
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// Mark attendance with selfie (enhanced)
app.post('/attendance/mark-with-selfie', authenticateUser, requireRole('STUDENT'), async (req, res) => {
    try {
        const { sessionId, location, selfieBase64, ipAddress } = req.body;
        if (!sessionId) {
            return res.status(400).json({ success: false, error: "Session ID is required" });
        }
        let selfieBuffer = null;
        let selfieMimeType = null;
        if (selfieBase64) {
            const matches = selfieBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
            if (matches && matches.length === 3) {
                selfieMimeType = matches[1];
                selfieBuffer = Buffer.from(matches[2], "base64");
            } else {
                selfieBuffer = Buffer.from(selfieBase64, "base64");
                selfieMimeType = "image/jpeg";
            }
        }
        const result = await markAttendance(sessionId, req.user.uid, {
            location, selfieBuffer, selfieMimeType, ipAddress
        });
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// ============================================
// SELFIE VERIFICATION ENDPOINTS (Week 5)
// ============================================

// Get pending selfies for a session
app.get('/sessions/:sessionId/pending-selfies', authenticateUser, requireRole('PROFESSOR'), async (req, res) => {
    try {
        const { sessionId } = req.params;
        const selfies = await getPendingSelfiesForSession(sessionId, req.user.uid);
        res.status(200).json({ success: true, selfies, count: selfies.length });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// Verify a selfie
app.post('/selfies/:selfieId/verify', authenticateUser, requireRole('PROFESSOR'), async (req, res) => {
    try {
        const { selfieId } = req.params;
        const result = await verifySelfie(selfieId, req.user.uid);
        res.status(200).json({ success: true, ...result, message: "Selfie verified successfully" });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// Reject a selfie
app.post('/selfies/:selfieId/reject', authenticateUser, requireRole('PROFESSOR'), async (req, res) => {
    try {
        const { selfieId } = req.params;
        const { reason } = req.body;
        if (!reason) {
            return res.status(400).json({ success: false, error: "Rejection reason is required" });
        }
        const result = await rejectSelfie(selfieId, req.user.uid, reason);
        res.status(200).json({ success: true, ...result, message: "Selfie rejected successfully" });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// ============================================
// REPORT EXPORT ENDPOINTS (Week 5)
// ============================================

// Export attendance to Excel
app.get('/sessions/:sessionId/export/excel', authenticateUser, requireRole('PROFESSOR'), async (req, res) => {
    try {
        const { sessionId } = req.params;
        const sessionDoc = await admin.firestore().collection('sessions').doc(sessionId).get();
        if (!sessionDoc.exists) {
            return res.status(404).json({ success: false, error: "Session not found" });
        }
        if (sessionDoc.data().professorId !== req.user.uid) {
            return res.status(403).json({ success: false, error: "Access denied" });
        }
        const filePath = await generateSessionAttendanceExcel(sessionId);
        res.download(filePath, `attendance_${sessionId}.xlsx`, (err) => {
            if (err) console.error("Error downloading Excel file:", err);
        });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// Export attendance to PDF
app.get('/sessions/:sessionId/export/pdf', authenticateUser, requireRole('PROFESSOR'), async (req, res) => {
    try {
        const { sessionId } = req.params;
        const sessionDoc = await admin.firestore().collection('sessions').doc(sessionId).get();
        if (!sessionDoc.exists) {
            return res.status(404).json({ success: false, error: "Session not found" });
        }
        if (sessionDoc.data().professorId !== req.user.uid) {
            return res.status(403).json({ success: false, error: "Access denied" });
        }
        const filePath = await generateSessionAttendancePDF(sessionId);
        res.download(filePath, `attendance_${sessionId}.pdf`, (err) => {
            if (err) console.error("Error downloading PDF file:", err);
        });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// ============================================
// ANALYTICS ENDPOINTS (Week 6)
// ============================================

// Get attendance statistics
app.get('/analytics/stats', authenticateUser, requireRole('PROFESSOR', 'ADMIN'), async (req, res) => {
    try {
        const { courseId, period, startDate, endDate } = req.query;
        const professorId = req.user.role === 'PROFESSOR' ? req.user.uid : req.query.professorId;
        const stats = await getAttendanceStats({ courseId, professorId, period, startDate, endDate });
        res.status(200).json({ success: true, data: stats });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// Get attendance trends
app.get('/analytics/trends', authenticateUser, requireRole('PROFESSOR', 'ADMIN'), async (req, res) => {
    try {
        const { courseId, interval, days } = req.query;
        const professorId = req.user.role === 'PROFESSOR' ? req.user.uid : req.query.professorId;
        const trends = await getAttendanceTrends({ courseId, professorId, interval, days: parseInt(days) || 30 });
        res.status(200).json({ success: true, data: trends });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// Get student engagement
app.get('/analytics/student/:studentId/engagement', authenticateUser, async (req, res) => {
    try {
        const { studentId } = req.params;
        const { courseId } = req.query;
        if (req.user.role === 'STUDENT' && req.user.uid !== studentId) {
            return res.status(403).json({ error: 'You can only view your own engagement data.' });
        }
        const engagement = await getStudentEngagement(studentId, courseId);
        res.status(200).json({ success: true, data: engagement });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// Get course analytics
app.get('/analytics/course/:courseId', authenticateUser, requireRole('PROFESSOR', 'ADMIN'), async (req, res) => {
    try {
        const { courseId } = req.params;
        const analytics = await getCourseAnalytics(courseId);
        res.status(200).json({ success: true, data: analytics });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// Get real-time dashboard
app.get('/dashboard/realtime', authenticateUser, requireRole('PROFESSOR', 'ADMIN'), async (req, res) => {
    try {
        const professorId = req.user.uid;
        const dashboard = await getRealtimeDashboard(professorId);
        res.status(200).json({ success: true, data: dashboard });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// Get quick stats
app.get('/analytics/quick-stats', authenticateUser, async (req, res) => {
    try {
        const stats = await getQuickStats(req.user.uid, req.user.role);
        res.status(200).json({ success: true, data: stats });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// Export analytics data
app.get('/analytics/export', authenticateUser, requireRole('PROFESSOR', 'ADMIN'), async (req, res) => {
    try {
        const { courseId, format, period } = req.query;
        const professorId = req.user.role === 'PROFESSOR' ? req.user.uid : req.query.professorId;
        const exportData = await exportAnalyticsData({ courseId, professorId, format, period });
        res.status(200).json({ success: true, data: exportData });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// ============================================
// ADVANCED REPORTS ENDPOINTS (Week 6)
// ============================================

// Build custom report
app.post('/reports/custom', authenticateUser, requireRole('PROFESSOR', 'ADMIN'), async (req, res) => {
    try {
        const { courseId, professorId, fields, dateRange, filters } = req.body;
        const report = await buildCustomReport({ courseId, professorId, fields, dateRange, filters });
        res.status(200).json({ success: true, data: report });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// Schedule automated report
app.post('/reports/schedule', authenticateUser, requireRole('PROFESSOR', 'ADMIN'), async (req, res) => {
    try {
        const { name, professorId, type, schedule, recipients, format, filters } = req.body;
        const scheduleId = await scheduleReport({ name, professorId, type, schedule, recipients, format, filters });
        res.status(201).json({ success: true, scheduleId });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// Generate comparative report
app.post('/reports/compare', authenticateUser, requireRole('PROFESSOR', 'ADMIN'), async (req, res) => {
    try {
        const { courseId, period1, period2, metrics } = req.body;
        const comparison = await generateComparativeReport({ courseId, period1, period2, metrics });
        res.status(200).json({ success: true, data: comparison });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// Generate student progress report
app.get('/reports/student/:studentId/progress', authenticateUser, async (req, res) => {
    try {
        const { studentId } = req.params;
        const { courseId } = req.query;
        const filePath = await generateStudentProgressReport(studentId, courseId);
        res.download(filePath, `student_progress_${studentId}.pdf`);
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// Export to CSV
app.post('/reports/export/csv', authenticateUser, requireRole('PROFESSOR', 'ADMIN'), async (req, res) => {
    try {
        const { data, filename } = req.body;
        const filePath = await exportToCSV(data, filename);
        res.download(filePath, `${filename || 'export'}.csv`);
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// Export to JSON
app.post('/reports/export/json', authenticateUser, requireRole('PROFESSOR', 'ADMIN'), async (req, res) => {
    try {
        const { data, filename } = req.body;
        const filePath = await exportToJSON(data, filename);
        res.download(filePath, `${filename || 'export'}.json`);
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// ============================================
// AI QUIZ ENDPOINTS (Week 6)
// ============================================

// Upload lecture PDF and generate quiz
app.post('/sessions/:sessionId/upload-lecture', authenticateUser, requireRole('PROFESSOR'), upload.single('pdf'), uploadLectureAndGenerateQuiz);

// Get quiz for student
app.get('/quiz/:sessionId', authenticateUser, requireRole('STUDENT'), getQuiz);

// Submit quiz answers
app.post('/quiz/submit', authenticateUser, requireRole('STUDENT'), submitQuiz);

// Get quiz analytics for professor
app.get('/sessions/:sessionId/quiz-analytics', authenticateUser, requireRole('PROFESSOR'), getQuizAnalyticsEndpoint);

// Get all quiz submissions for a session
app.get('/quiz/sessions/:sessionId/submissions', authenticateUser, requireRole('PROFESSOR'), getAllQuizSubmissions);

// Get individual student quiz results
app.get('/quiz/sessions/:sessionId/student/:studentId/results', authenticateUser, requireRole('PROFESSOR'), getStudentQuizResults);

// ============================================
// MONITORING ENDPOINTS (Week 6)
// ============================================

// Check at-risk students
app.post('/monitoring/check-at-risk', authenticateUser, requireRole('PROFESSOR', 'ADMIN'), async (req, res) => {
    try {
        const { courseId } = req.body;
        const result = await checkAtRiskStudents(courseId);
        res.status(200).json({ success: true, data: result });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// Get system metrics
app.get('/monitoring/system-metrics', authenticateUser, requireRole('ADMIN'), async (req, res) => {
    try {
        const metrics = await getSystemMetrics();
        res.status(200).json({ success: true, data: metrics });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// ============================================
// 404 HANDLER
// ============================================
app.use('*', (req, res) => {
    res.status(404).json({ 
        success: false, 
        error: `Route ${req.originalUrl} not found`,
        message: 'Please check the API documentation for available endpoints'
    });
});

// ============================================
// ERROR HANDLER
// ============================================
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ 
        success: false, 
        error: 'Internal server error', 
        message: err.message 
    });
});

// ============================================
// EXPORT CLOUD FUNCTION
// ============================================
exports.api = functions.https.onRequest(app);
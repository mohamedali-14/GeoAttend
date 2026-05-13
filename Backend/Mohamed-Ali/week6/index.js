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

const upload = multer({ storage: multer.memoryStorage() });

// ============ WEEK 5 IMPORTS ============
const { createSession, updateSessionVerificationSettings, getSession } = require('./controllers/session.controller');
const { markAttendance } = require('./controllers/attendance.controller');
const { verifySelfie, rejectSelfie, getPendingSelfiesForSession } = require('./utils/selfieUpload');
const { generateSessionAttendanceExcel, generateSessionAttendancePDF } = require('./services/export.service');

// ============ WEEK 6 IMPORTS ============
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
    uploadLectureAndGenerateQuiz 
} = require('../week6/quiz.controller');

const { getAttendanceStats, getAttendanceTrends, getStudentEngagement, getCourseAnalytics, getRealtimeDashboard } = require('../week6/analytics.service');
const { checkAtRiskStudents, getSystemMetrics } = require('../week6/monitoring.service');

// ============ WEEK 5 SESSION ENDPOINTS ============

app.post('/sessions', async (req, res) => {
    try {
        const { title, courseId, professorId, professorName, scheduledDate, location, radius, verificationSettings } = req.body;
        const sessionId = await createSession({ title, courseId, professorId, professorName, scheduledDate, location, radius, verificationSettings });
        res.status(201).json({ success: true, sessionId });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

app.get('/sessions/:sessionId', async (req, res) => {
    try {
        const session = await getSession(req.params.sessionId);
        res.status(200).json({ success: true, session });
    } catch (error) {
        res.status(404).json({ success: false, error: error.message });
    }
});

app.patch('/sessions/:sessionId/verification-settings', async (req, res) => {
    try {
        const { professorId, ...updates } = req.body;
        await updateSessionVerificationSettings(req.params.sessionId, professorId, updates);
        res.status(200).json({ success: true });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// ============ WEEK 5 ATTENDANCE ENDPOINTS ============

app.post('/attendance/mark', async (req, res) => {
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

// ============ WEEK 5 SELFIE VERIFICATION ENDPOINTS ============

app.get('/sessions/:sessionId/pending-selfies', async (req, res) => {
    try {
        const { professorId } = req.query;
        const selfies = await getPendingSelfiesForSession(req.params.sessionId, professorId);
        res.status(200).json({ success: true, selfies });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

app.post('/selfies/:selfieId/verify', async (req, res) => {
    try {
        const { professorId } = req.body;
        const result = await verifySelfie(req.params.selfieId, professorId);
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

app.post('/selfies/:selfieId/reject', async (req, res) => {
    try {
        const { professorId, reason } = req.body;
        const result = await rejectSelfie(req.params.selfieId, professorId, reason);
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// ============ WEEK 5 REPORT ENDPOINTS ============

app.get('/sessions/:sessionId/export/excel', async (req, res) => {
    try {
        const filePath = await generateSessionAttendanceExcel(req.params.sessionId);
        res.download(filePath, `attendance_${req.params.sessionId}.xlsx`);
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

app.get('/sessions/:sessionId/export/pdf', async (req, res) => {
    try {
        const filePath = await generateSessionAttendancePDF(req.params.sessionId);
        res.download(filePath, `attendance_${req.params.sessionId}.pdf`);
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// ============ WEEK 6 ANALYTICS ENDPOINTS ============

app.get('/analytics/stats', async (req, res) => {
    try {
        const { courseId, professorId, period } = req.query;
        const stats = await getAttendanceStats({ courseId, professorId, period });
        res.status(200).json({ success: true, data: stats });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

app.get('/analytics/trends', async (req, res) => {
    try {
        const { courseId, professorId, interval } = req.query;
        const trends = await getAttendanceTrends({ courseId, professorId, interval });
        res.status(200).json({ success: true, data: trends });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

app.get('/analytics/student/:studentId', async (req, res) => {
    try {
        const { courseId } = req.query;
        const engagement = await getStudentEngagement(req.params.studentId, courseId);
        res.status(200).json({ success: true, data: engagement });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

app.get('/analytics/course/:courseId', async (req, res) => {
    try {
        const analytics = await getCourseAnalytics(req.params.courseId);
        res.status(200).json({ success: true, data: analytics });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

app.get('/dashboard/realtime', async (req, res) => {
    try {
        const { professorId } = req.query;
        const dashboard = await getRealtimeDashboard(professorId);
        res.status(200).json({ success: true, data: dashboard });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// ============ WEEK 6 REPORTS ENDPOINTS ============

app.post('/reports/custom', async (req, res) => {
    try {
        const { courseId, professorId, fields, dateRange, filters } = req.body;
        const report = await buildCustomReport({ courseId, professorId, fields, dateRange, filters });
        res.status(200).json({ success: true, data: report });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

app.post('/reports/schedule', async (req, res) => {
    try {
        const { name, professorId, type, schedule, recipients, format, filters } = req.body;
        const scheduleId = await scheduleReport({ name, professorId, type, schedule, recipients, format, filters });
        res.status(201).json({ success: true, scheduleId });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

app.post('/reports/compare', async (req, res) => {
    try {
        const { courseId, period1, period2, metrics } = req.body;
        const comparison = await generateComparativeReport({ courseId, period1, period2, metrics });
        res.status(200).json({ success: true, data: comparison });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

app.get('/reports/student/:studentId/progress', async (req, res) => {
    try {
        const { courseId } = req.query;
        const filePath = await generateStudentProgressReport(req.params.studentId, courseId);
        res.download(filePath, `student_progress_${req.params.studentId}.pdf`);
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

app.post('/reports/export/csv', async (req, res) => {
    try {
        const { data, filename } = req.body;
        const filePath = await exportToCSV(data, filename);
        res.download(filePath, `${filename || 'export'}.csv`);
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

app.post('/reports/export/json', async (req, res) => {
    try {
        const { data, filename } = req.body;
        const filePath = await exportToJSON(data, filename);
        res.download(filePath, `${filename || 'export'}.json`);
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// ============ WEEK 6 QUIZ ENDPOINTS ============

app.post('/sessions/:sessionId/upload-lecture', upload.single('pdf'), async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { professorId } = req.body;
        req.file ? await uploadLectureAndGenerateQuiz(req, res) : res.status(400).json({ success: false, error: 'No file uploaded' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/quiz/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { studentId } = req.query;
        const quiz = await getStudentQuiz(sessionId, studentId);
        res.status(200).json({ success: true, data: quiz });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

app.post('/quiz/submit', async (req, res) => {
    try {
        const { sessionId, studentId, answers } = req.body;
        const result = await submitQuizAnswers(sessionId, studentId, answers);
        res.status(200).json({ success: true, data: result });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

app.get('/sessions/:sessionId/quiz-analytics', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { professorId } = req.query;
        const analytics = await getQuizAnalytics(sessionId, professorId);
        res.status(200).json({ success: true, data: analytics });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// ============ WEEK 6 MONITORING ENDPOINTS ============

app.post('/monitoring/check-at-risk', async (req, res) => {
    try {
        const { courseId } = req.body;
        const result = await checkAtRiskStudents(courseId);
        res.status(200).json({ success: true, data: result });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

app.get('/monitoring/system-metrics', async (req, res) => {
    try {
        const metrics = await getSystemMetrics();
        res.status(200).json({ success: true, data: metrics });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// ============ 404 HANDLER ============
app.use('*', (req, res) => {
    res.status(404).json({ success: false, error: `Route ${req.originalUrl} not found` });
});

// ============ ERROR HANDLER ============
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ success: false, error: 'Internal server error', message: err.message });
});

exports.api = functions.https.onRequest(app);
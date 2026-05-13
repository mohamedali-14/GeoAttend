const {
    getAttendanceStats,
    getAttendanceTrends,
    getStudentEngagement,
    getCourseAnalytics,
    getRealtimeDashboard,
    getQuickStats,
    exportAnalyticsData
} = require('../services/analytics.service');

async function getAttendanceStatsHandler(req, res) {
    try {
        const { courseId, period = 'month', startDate, endDate } = req.query;
        const professorId = req.user.role === 'PROFESSOR' ? req.user.uid : req.query.professorId;
        
        if (req.user.role === 'STUDENT') {
            return res.status(403).json({ error: 'Access denied. Only professors and admins can view analytics.' });
        }
        
        const stats = await getAttendanceStats({ courseId, professorId, period, startDate, endDate });
        
        res.json({ success: true, data: stats });
    } catch (error) {
        console.error('Error in getAttendanceStatsHandler:', error);
        res.status(500).json({ error: error.message });
    }
}

async function getAttendanceTrendsHandler(req, res) {
    try {
        const { courseId, interval = 'daily', days = 30 } = req.query;
        const professorId = req.user.role === 'PROFESSOR' ? req.user.uid : req.query.professorId;
        
        if (req.user.role === 'STUDENT') {
            return res.status(403).json({ error: 'Access denied.' });
        }
        
        const trends = await getAttendanceTrends({ courseId, professorId, interval, days: parseInt(days) });
        
        res.json({ success: true, data: trends });
    } catch (error) {
        console.error('Error in getAttendanceTrendsHandler:', error);
        res.status(500).json({ error: error.message });
    }
}

async function getStudentEngagementHandler(req, res) {
    try {
        const { studentId } = req.params;
        const { courseId } = req.query;
        
        if (req.user.role === 'STUDENT' && req.user.uid !== studentId) {
            return res.status(403).json({ error: 'You can only view your own engagement data.' });
        }
        
        const engagement = await getStudentEngagement(studentId, courseId);
        
        res.json({ success: true, data: engagement });
    } catch (error) {
        console.error('Error in getStudentEngagementHandler:', error);
        res.status(500).json({ error: error.message });
    }
}

async function getCourseAnalyticsHandler(req, res) {
    try {
        const { courseId } = req.params;
        
        const { db } = require('../config/firebase');
        const courseDoc = await db.collection('courses').doc(courseId).get();
        
        if (!courseDoc.exists) {
            return res.status(404).json({ error: 'Course not found' });
        }
        
        const course = courseDoc.data();
        
        if (req.user.role === 'PROFESSOR' && course.professorId !== req.user.uid) {
            return res.status(403).json({ error: 'You can only view analytics for your own courses.' });
        }
        
        const analytics = await getCourseAnalytics(courseId);
        
        res.json({ success: true, data: analytics });
    } catch (error) {
        console.error('Error in getCourseAnalyticsHandler:', error);
        res.status(500).json({ error: error.message });
    }
}

async function getRealtimeDashboardHandler(req, res) {
    try {
        const professorId = req.user.uid;
        
        if (req.user.role !== 'PROFESSOR' && req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Only professors can access the dashboard.' });
        }
        
        const dashboard = await getRealtimeDashboard(professorId);
        
        res.json({ success: true, data: dashboard });
    } catch (error) {
        console.error('Error in getRealtimeDashboardHandler:', error);
        res.status(500).json({ error: error.message });
    }
}

async function getQuickStatsHandler(req, res) {
    try {
        const stats = await getQuickStats(req.user.uid, req.user.role);
        
        res.json({ success: true, data: stats });
    } catch (error) {
        console.error('Error in getQuickStatsHandler:', error);
        res.status(500).json({ error: error.message });
    }
}

async function exportAnalyticsHandler(req, res) {
    try {
        const { courseId, format = 'json', period = 'month' } = req.query;
        const professorId = req.user.role === 'PROFESSOR' ? req.user.uid : req.query.professorId;
        
        if (req.user.role === 'STUDENT') {
            return res.status(403).json({ error: 'Access denied.' });
        }
        
        const exportData = await exportAnalyticsData({ courseId, professorId, format, period });
        
        if (format === 'json') {
            res.json({ success: true, data: exportData });
        } else {
            res.json({ success: true, data: exportData, message: `Export as ${format} - implement conversion` });
        }
    } catch (error) {
        console.error('Error in exportAnalyticsHandler:', error);
        res.status(500).json({ error: error.message });
    }
}

module.exports = {
    getAttendanceStatsHandler,
    getAttendanceTrendsHandler,
    getStudentEngagementHandler,
    getCourseAnalyticsHandler,
    getRealtimeDashboardHandler,
    getQuickStatsHandler,
    exportAnalyticsHandler
};
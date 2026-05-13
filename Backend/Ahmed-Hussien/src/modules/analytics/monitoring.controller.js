// src/modules/analytics/monitoring.controller.js
const { checkAtRiskStudents, getSystemMetrics } = require('../../services/monitoring.service');

async function checkAtRiskStudentsHandler(req, res) {
    try {
        const { courseId } = req.body;
        
        if (!courseId) {
            return res.status(400).json({ error: 'Course ID is required' });
        }
        
        const result = await checkAtRiskStudents(courseId);
        res.json({ success: true, data: result });
    } catch (error) {
        console.error('Error checking at-risk students:', error);
        res.status(500).json({ error: error.message });
    }
}

async function getSystemMetricsHandler(req, res) {
    try {
        const metrics = await getSystemMetrics();
        res.json({ success: true, data: metrics });
    } catch (error) {
        console.error('Error getting system metrics:', error);
        res.status(500).json({ error: error.message });
    }
}

module.exports = {
    checkAtRiskStudentsHandler,
    getSystemMetricsHandler
};
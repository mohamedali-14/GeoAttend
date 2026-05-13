// src/modules/analytics/monitoring.routes.js
const express = require('express');
const router = express.Router();
const { authenticateUser, requireRole } = require('../../middleware/auth.middleware');
const {
    checkAtRiskStudentsHandler,
    getSystemMetricsHandler
} = require('./monitoring.controller');

router.use(authenticateUser);

router.post('/check-at-risk', requireRole('PROFESSOR', 'ADMIN'), checkAtRiskStudentsHandler);
router.get('/system-metrics', requireRole('ADMIN'), getSystemMetricsHandler);

module.exports = router;
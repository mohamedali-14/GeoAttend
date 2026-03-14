const express = require('express');
const router = express.Router();
const { authenticateUser } = require("../../middleware/auth.middleware");
const { markAttendance, getLiveAttendance, getAttendanceReport, randomCheck } = require("./attendance.controller");

router.use(authenticateUser);

router.post('/mark/:sessionId', markAttendance);
router.get('/live/:sessionId', getLiveAttendance);
router.get('/report/:sessionId', getAttendanceReport);
router.post('/random-check/:sessionId', randomCheck);

module.exports = router;
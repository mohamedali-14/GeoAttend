const express = require('express');

const router = express.Router();

const {

    getLiveAttendance,
    getAttendanceReport,
    randomCheck

} = require('./attendance.controller');

router.get('/live/:sessionId', getLiveAttendance);

router.get('/report/:sessionId', getAttendanceReport);

router.post('/random-check/:sessionId', randomCheck);

module.exports = router;
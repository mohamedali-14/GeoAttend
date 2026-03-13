const express = require("express");
const adminRoutes = require("../admin/admin.routes");
const courseRoutes = require("../courses/course.routes");
const scheduleRoutes = require("../schedules/schedule.routes");
const enrollmentRoutes = require("../modules/enrollments/enrollments.routes"); 
const professorRoutes = require('../modules/professor/professor.routes');
const sessionRoutes = require('../modules/sessions/session.routes');
const attendanceRoutes = require('../modules/attendance/attendance.routes');

const router = express.Router();

router.use("/admin", adminRoutes);
router.use("/courses", courseRoutes);
router.use("/schedules", scheduleRoutes);
router.use("/enrollments", enrollmentRoutes); 
router.use('/professor', professorRoutes);
router.use('/sessions', sessionRoutes);
router.use('/attendance', attendanceRoutes);

module.exports = router;
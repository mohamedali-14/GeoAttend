const express = require("express");
const router = express.Router();

const adminRoutes = require("../admin/admin.routes");
const authRoutes = require("../modules/auth/auth.routes");
const courseRoutes = require("../courses/course.routes");
const scheduleRoutes = require("../schedules/schedule.routes");
const enrollmentRoutes = require("../modules/enrollments/enrollments.routes");
const professorRoutes = require("../modules/professor/professor.routes");
const sessionRoutes = require("../modules/sessions/session.routes");
const attendanceRoutes = require("../modules/attendance/attendance.routes");
const usersRoutes = require("../modules/users/users.routes");

router.use("/admin", adminRoutes);
router.use("/auth", authRoutes);
router.use("/courses", courseRoutes);
router.use("/schedules", scheduleRoutes);
router.use("/enrollments", enrollmentRoutes);
router.use("/professor", professorRoutes);
router.use("/sessions", sessionRoutes);
router.use("/attendance", attendanceRoutes);
router.use("/users", usersRoutes);

module.exports = router;
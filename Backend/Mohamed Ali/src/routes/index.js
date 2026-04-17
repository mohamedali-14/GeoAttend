const express = require("express");

const adminRoutes = require("../admin/admin.routes");
const courseRoutes = require("../courses/course.routes");
const scheduleRoutes = require("../schedules/schedule.routes");
const enrollmentRoutes = require("../modules/enrollments/enrollments.routes"); 

const router = express.Router();

router.use("/admin", adminRoutes);
router.use("/courses", courseRoutes);
router.use("/schedules", scheduleRoutes);
router.use("/enrollments", enrollmentRoutes); 

module.exports = router;
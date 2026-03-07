const express = require("express");

// استدعاء المسارات من المجلدات الصحيحة
const adminRoutes = require("../admin/admin.routes");
const courseRoutes = require("../courses/course.routes");
const scheduleRoutes = require("../schedules/schedule.routes");

const router = express.Router();

router.use("/admin", adminRoutes);
router.use("/courses", courseRoutes);
router.use("/schedules", scheduleRoutes);

module.exports = router;

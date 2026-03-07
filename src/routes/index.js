const express = require("express");

const adminRoutes = require("../modules/admin/admin.routes");
const courseRoutes = require("../modules/courses/course.routes");
const scheduleRoutes = require("../modules/schedules/schedule.routes");

const router = express.Router();

router.use("/admin",adminRoutes);

router.use("/courses",courseRoutes);

router.use("/schedules",scheduleRoutes);

module.exports = router;
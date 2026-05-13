const express = require("express");
const router = express.Router();
const { authenticateUser, requireRole } = require("../middleware/auth.middleware");
const { createSchedule, getSchedules, deleteSchedule } = require("./schedule.controller");

router.use(authenticateUser);

router.get("/", getSchedules);
router.post("/", requireRole("ADMIN", "PROFESSOR"), createSchedule);
router.delete("/:scheduleId", requireRole("ADMIN", "PROFESSOR"), deleteSchedule);

module.exports = router;
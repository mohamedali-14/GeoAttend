const express = require("express");
const router = express.Router();

const { createSchedule, getSchedules } = require("./schedule.controller");
const { authenticateUser, requireRole } = require("../../middleware/auth.middleware");

router.post(
    "/",
    authenticateUser,
    requireRole("ADMIN"),
    createSchedule
);

router.get(
    "/",
    authenticateUser,
    getSchedules
);

module.exports = router;
const express = require("express");
const router = express.Router();

const { createCourse } = require("./course.controller");
const { authenticateUser, requireRole } = require("../../middleware/auth.middleware");

router.post(
    "/",
    authenticateUser,
    requireRole("ADMIN"),
    createCourse
);

module.exports = router;
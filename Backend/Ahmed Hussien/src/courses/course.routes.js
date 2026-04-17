const express = require("express");
const router = express.Router();
const { authenticateUser, requireRole } = require("../middleware/auth.middleware");
const { createCourse, getCourses, getCourse, updateCourse, deleteCourse } = require("./course.controller");

router.use(authenticateUser);

router.get("/", getCourses);
router.get("/:courseId", getCourse);
router.post("/", requireRole("ADMIN", "PROFESSOR"), createCourse);
router.put("/:courseId", requireRole("ADMIN", "PROFESSOR"), updateCourse);
router.delete("/:courseId", requireRole("ADMIN"), deleteCourse);

module.exports = router;
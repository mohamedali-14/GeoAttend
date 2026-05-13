const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const { authenticateUser, requireRole } = require("../../middleware/auth.middleware");

const { 
    enrollStudent, 
    getProfessorCourses
} = require("./enrollments.controller");

const { getStudentEnrollments } = require("./student_courses");
const { validateEnrollment } = require("./validation");
const { getCourseStats } = require("./stats");
const { batchEnroll } = require("./batch_enroll");

router.use(authenticateUser);
router.get('/student/:studentId', getStudentEnrollments);


router.post('/validate', validateEnrollment);


router.get('/professor-courses', getProfessorCourses);

router.post('/', requireRole("ADMIN", "PROFESSOR"), enrollStudent);


router.post('/batch', requireRole("ADMIN"), upload.single('file'), batchEnroll);


router.get('/stats', requireRole("ADMIN", "PROFESSOR"), getCourseStats);

module.exports = router;
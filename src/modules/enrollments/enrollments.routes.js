const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const { authenticateUser } = require('../../middleware/auth.middleware');
const {
  enrollStudent,
  getStudentEnrollments,
  getProfessorCourses,
  batchEnroll,
  validateEnrollment,
  getCourseStats
} = require('./enrollments.controller');

// All routes require authentication
router.use(authenticateUser);

// Day 1: Enroll student
router.post('/', enrollStudent);

// Day 2: Get student's enrollments
router.get('/student/:studentId', getStudentEnrollments);

// Day 3: Get professor's courses (as query param)
router.get('/professor-courses', getProfessorCourses);

// Day 4: Batch enrollment via CSV
router.post('/batch', upload.single('file'), batchEnroll);

// Day 5: Validate enrollment
router.post('/validate', validateEnrollment);

// Day 6: Course statistics
router.get('/stats', getCourseStats);

module.exports = router;
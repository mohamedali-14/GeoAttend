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

// GET /enrollments — all active enrollments (ADMIN/PROFESSOR see all, STUDENT sees own)
router.get('/', async (req, res) => {
  try {
    const { db } = require('../../config/firebase');
    const user = req.user;
    let snap;
    if (user.role === 'STUDENT') {
      snap = await db.collection('enrollments')
        .where('studentId', '==', user.uid)
        .where('status', '==', 'ACTIVE')
        .get();
    } else {
      snap = await db.collection('enrollments')
        .where('status', '==', 'ACTIVE')
        .get();
    }
    const enrollments = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({ enrollments, count: enrollments.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/student/:studentId', getStudentEnrollments);

router.post('/validate', validateEnrollment);

router.get('/professor-courses', getProfessorCourses);

// Allow ADMIN, PROFESSOR/DOCTOR, and STUDENT (student can enroll themselves)
router.post('/', enrollStudent);

// DELETE /enrollments/student/:studentId/course/:courseId
router.delete('/student/:studentId/course/:courseId', requireRole("ADMIN", "PROFESSOR"), async (req, res) => {
  try {
    const { studentId, courseId } = req.params;
    const { db, admin } = require('../../config/firebase');
    const snap = await db.collection('enrollments')
      .where('studentId', '==', studentId)
      .where('courseId', '==', courseId)
      .where('status', '==', 'ACTIVE')
      .get();
    if (snap.empty) return res.status(404).json({ error: 'Enrollment not found' });
    const batch = db.batch();
    snap.docs.forEach(d => batch.update(d.ref, { status: 'INACTIVE', updatedAt: admin.firestore.FieldValue.serverTimestamp() }));
    await batch.commit();
    await db.collection('courses').doc(courseId).update({ studentCount: admin.firestore.FieldValue.increment(-1) });
    res.json({ message: 'Student unenrolled successfully' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/batch', requireRole("ADMIN"), upload.single('file'), batchEnroll);

router.get('/stats', requireRole("ADMIN", "PROFESSOR"), getCourseStats);

module.exports = router;
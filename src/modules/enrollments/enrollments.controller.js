const { db, admin } = require('../../config/firebase');
const fs = require('fs');
const csv = require('csv-parser');

// ==================== Helper Functions ====================

/**
 * Get current semester based on month
 * @returns {string} 'FIRST' or 'SECOND'
 */
function getCurrentSemester() {
  const month = new Date().getMonth() + 1;
  return (month >= 9 || month <= 1) ? 'FIRST' : 'SECOND';
}

/**
 * Check if two schedules conflict
 * @param {Object} sched1 - First schedule { days: string[], time: string }
 * @param {Object} sched2 - Second schedule { days: string[], time: string }
 * @returns {boolean} True if schedules conflict
 */
function hasConflict(sched1, sched2) {
  if (!sched1 || !sched2) return false;
  const daysOverlap = sched1.days?.some(day => sched2.days?.includes(day));
  const timeOverlap = sched1.time === sched2.time;
  return daysOverlap && timeOverlap;
}

// ==================== Day 1: Enroll Student ====================

/**
 * Enroll a student in a course
 * POST /api/enrollments
 * Body: { courseId, studentId, semester? }
 */
async function enrollStudent(req, res) {
  try {
    const { courseId, studentId, semester } = req.body;
    const requestingUser = req.user;

    // Authorization: Admin or self-enroll
    if (requestingUser.role === 'STUDENT' && requestingUser.uid !== studentId) {
      return res.status(403).json({ error: 'You can only enroll yourself' });
    }

    // Check for existing enrollment
    const existing = await db.collection('enrollments')
      .where('studentId', '==', studentId)
      .where('courseId', '==', courseId)
      .limit(1)
      .get();

    if (!existing.empty) {
      return res.status(400).json({ error: 'Already enrolled in this course' });
    }

    // Fetch course and student info
    const [courseDoc, studentDoc] = await Promise.all([
      db.collection('courses').doc(courseId).get(),
      db.collection('users').doc(studentId).get()
    ]);

    if (!courseDoc.exists) {
      return res.status(404).json({ error: 'Course not found' });
    }
    
    if (!studentDoc.exists || studentDoc.data().role !== 'STUDENT') {
      return res.status(400).json({ error: 'Invalid student' });
    }

    const enrollmentData = {
      studentId,
      studentName: studentDoc.data().fullName || 'Unknown',
      courseId,
      courseName: courseDoc.data().name,
      professorId: courseDoc.data().professorId,
      enrolledAt: admin.firestore.FieldValue.serverTimestamp(),
      semester: semester || getCurrentSemester(),
      year: new Date().getFullYear(),
      status: 'ACTIVE'
    };

    const enrollmentRef = await db.collection('enrollments').add(enrollmentData);

    // Increment student count in course
    await db.collection('courses').doc(courseId).update({
      studentCount: admin.firestore.FieldValue.increment(1)
    });

    res.status(201).json({
      message: 'Enrolled successfully',
      enrollment: { id: enrollmentRef.id, ...enrollmentData }
    });
  } catch (error) {
    console.error('Enroll student error:', error);
    res.status(500).json({ error: error.message });
  }
}

// ==================== Day 2: Get Student Enrollments ====================

/**
 * Get all active enrollments for a student
 * GET /api/enrollments/student/:studentId
 */
async function getStudentEnrollments(req, res) {
  try {
    const { studentId } = req.params;
    const requestingUser = req.user;

    // Students can only view their own
    if (requestingUser.role === 'STUDENT' && requestingUser.uid !== studentId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const snapshot = await db.collection('enrollments')
      .where('studentId', '==', studentId)
      .where('status', '==', 'ACTIVE')
      .orderBy('enrolledAt', 'desc')
      .get();

    const enrollments = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json({ enrollments, count: enrollments.length });
  } catch (error) {
    console.error('Get student enrollments error:', error);
    res.status(500).json({ error: error.message });
  }
}

// ==================== Day 3: Get Professor Courses ====================

/**
 * Get all courses assigned to a professor
 * GET /api/enrollments/professor-courses?professorId=xxx
 */
async function getProfessorCourses(req, res) {
  try {
    const { professorId } = req.query;
    const requestingUser = req.user;

    // Professors can only view their own courses
    if (requestingUser.role === 'PROFESSOR' && requestingUser.uid !== professorId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const snapshot = await db.collection('courses')
      .where('professorId', '==', professorId)
      .where('isActive', '==', true)
      .orderBy('createdAt', 'desc')
      .get();

    const courses = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json({ courses, count: courses.length });
  } catch (error) {
    console.error('Get professor courses error:', error);
    res.status(500).json({ error: error.message });
  }
}

// ==================== Day 4: Batch Enrollment ====================

/**
 * Upload CSV and enroll multiple students
 * POST /api/enrollments/batch
 * Body: multipart/form-data with CSV file
 * CSV format: studentId,courseId,semester
 */
async function batchEnroll(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    const file = req.file;
    const results = [];
    const errors = [];

    fs.createReadStream(file.path)
      .pipe(csv())
      .on('data', (row) => results.push(row))
      .on('end', async () => {
        const batch = db.batch();
        const courseRefs = {};

        for (const row of results) {
          const { studentId, courseId, semester } = row;

          // Validate required fields
          if (!studentId || !courseId) {
            errors.push({ row, error: 'Missing required fields' });
            continue;
          }

          // Validate course exists
          if (!courseRefs[courseId]) {
            const courseDoc = await db.collection('courses').doc(courseId).get();
            if (!courseDoc.exists) {
              errors.push({ row, error: 'Course not found' });
              continue;
            }
            courseRefs[courseId] = courseDoc.data();
          }

          // Check for duplicate enrollment
          const existing = await db.collection('enrollments')
            .where('studentId', '==', studentId)
            .where('courseId', '==', courseId)
            .limit(1)
            .get();

          if (!existing.empty) {
            errors.push({ row, error: 'Already enrolled' });
            continue;
          }

          const enrollmentRef = db.collection('enrollments').doc();
          batch.set(enrollmentRef, {
            studentId,
            courseId,
            courseName: courseRefs[courseId].name,
            professorId: courseRefs[courseId].professorId,
            enrolledAt: admin.firestore.FieldValue.serverTimestamp(),
            semester: semester || getCurrentSemester(),
            year: new Date().getFullYear(),
            status: 'ACTIVE'
          });

          // Increment course student count
          batch.update(db.collection('courses').doc(courseId), {
            studentCount: admin.firestore.FieldValue.increment(1)
          });
        }

        await batch.commit();
        
        // Clean up temp file
        fs.unlinkSync(file.path);

        res.json({
          message: 'Batch enrollment completed',
          totalProcessed: results.length,
          successCount: results.length - errors.length,
          errors
        });
      });
  } catch (error) {
    console.error('Batch enroll error:', error);
    res.status(500).json({ error: error.message });
  }
}

// ==================== Day 5: Validate Enrollment ====================

/**
 * Check if enrollment is valid (no conflicts, prerequisites met)
 * POST /api/enrollments/validate
 * Body: { studentId, courseId }
 */
async function validateEnrollment(req, res) {
  try {
    const { studentId, courseId } = req.body;

    // Get course details
    const courseDoc = await db.collection('courses').doc(courseId).get();
    if (!courseDoc.exists) {
      return res.status(404).json({ valid: false, reason: 'Course not found' });
    }
    const course = courseDoc.data();

    // Check prerequisites
    if (course.prerequisites && course.prerequisites.length > 0) {
      const completedCourses = await db.collection('grades')
        .where('studentId', '==', studentId)
        .where('status', '==', 'PASSED')
        .get();

      const completedIds = completedCourses.docs.map(doc => doc.data().courseId);
      const missing = course.prerequisites.filter(p => !completedIds.includes(p));

      if (missing.length > 0) {
        return res.status(400).json({
          valid: false,
          reason: 'Prerequisites not met',
          missing
        });
      }
    }

    // Check schedule conflicts
    const existingEnrollments = await db.collection('enrollments')
      .where('studentId', '==', studentId)
      .where('status', '==', 'ACTIVE')
      .get();

    const courseSchedule = course.schedule;

    for (const doc of existingEnrollments.docs) {
      const enrolledCourse = await db.collection('courses').doc(doc.data().courseId).get();
      const enrolledSchedule = enrolledCourse.data().schedule;

      if (hasConflict(courseSchedule, enrolledSchedule)) {
        return res.status(400).json({
          valid: false,
          reason: 'Schedule conflict with existing course',
          conflictingCourse: enrolledCourse.data().name
        });
      }
    }

    res.json({ valid: true });
  } catch (error) {
    console.error('Validate enrollment error:', error);
    res.status(500).json({ error: error.message });
  }
}

// ==================== Day 6: Course Statistics ====================

/**
 * Get student count per course
 * GET /api/enrollments/stats?courseId=xxx (optional)
 */
async function getCourseStats(req, res) {
  try {
    const { courseId } = req.query;

    if (courseId) {
      // Stats for a single course
      const courseDoc = await db.collection('courses').doc(courseId).get();
      if (!courseDoc.exists) {
        return res.status(404).json({ error: 'Course not found' });
      }

      const enrollmentsSnapshot = await db.collection('enrollments')
        .where('courseId', '==', courseId)
        .where('status', '==', 'ACTIVE')
        .count()
        .get();

      return res.status(200).json({
        courseId,
        courseName: courseDoc.data().name,
        studentCount: enrollmentsSnapshot.data().count
      });
    } else {
      // Stats for all courses
      const coursesSnap = await db.collection('courses')
        .where('isActive', '==', true)
        .get();
      
      const stats = [];

      for (const courseDoc of coursesSnap.docs) {
        const enrollmentsSnapshot = await db.collection('enrollments')
          .where('courseId', '==', courseDoc.id)
          .where('status', '==', 'ACTIVE')
          .count()
          .get();

        stats.push({
          courseId: courseDoc.id,
          courseName: courseDoc.data().name,
          studentCount: enrollmentsSnapshot.data().count
        });
      }

      return res.status(200).json({ stats });
    }
  } catch (error) {
    console.error('Get course stats error:', error);
    return res.status(500).json({ error: error.message });
  }
}

// ==================== Exports ====================

module.exports = {
  enrollStudent,
  getStudentEnrollments,
  getProfessorCourses,
  batchEnroll,
  validateEnrollment,
  getCourseStats
};
const { db } = require('../../config/firebase');

/**
 * Check if enrollment is valid (no conflicts, prerequisites met)
 * POST /enrollments/validate
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

    const courseSchedule = course.schedule; // e.g., { days: ['MON'], time: '10:00' }

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
    res.status(500).json({ error: error.message });
  }
}

function hasConflict(sched1, sched2) {
  if (!sched1 || !sched2) return false;
  const daysOverlap = sched1.days?.some(day => sched2.days?.includes(day));
  const timeOverlap = sched1.time === sched2.time;
  return daysOverlap && timeOverlap;
}

module.exports = { validateEnrollment };
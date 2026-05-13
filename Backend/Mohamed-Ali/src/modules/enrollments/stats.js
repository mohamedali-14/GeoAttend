const { db } = require('../../config/firebase');

/**
 * Get student count per course (or a single course)
 * GET /courses/stats?courseId=xxx (optional)
 */
async function getCourseStats(req, res) {
  try {
    const { courseId } = req.query;

    if (courseId) {
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
      // Aggregate all courses
      const coursesSnap = await db.collection('courses').get();
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
    return res.status(500).json({ error: error.message });
  }
}

module.exports = { getCourseStats };
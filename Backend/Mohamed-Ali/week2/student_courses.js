const { db } = require('../firebase');

/**
 * Get all active enrollments for a student
 * GET /enrollments/student/:studentId
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
    res.status(500).json({ error: error.message });
  }
}

module.exports = { getStudentEnrollments };
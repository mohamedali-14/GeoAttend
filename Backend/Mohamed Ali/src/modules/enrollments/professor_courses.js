const { db } = require('../../config/firebase');

/**
 * Get all courses assigned to a professor (with student counts)
 * GET /courses?professorId=xxx
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
      .orderBy('createdAt', 'desc')
      .get();

    const courses = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json({ courses, count: courses.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = { getProfessorCourses };
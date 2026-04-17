const { db, admin } = require('../firebase');

/**
 * Enroll a student in a course
 * POST /enrollments
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

    if (!courseDoc.exists) return res.status(404).json({ error: 'Course not found' });
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
    res.status(500).json({ error: error.message });
  }
}

function getCurrentSemester() {
  const month = new Date().getMonth() + 1;
  return (month >= 9 || month <= 1) ? 'FIRST' : 'SECOND';
}

module.exports = { enrollStudent };
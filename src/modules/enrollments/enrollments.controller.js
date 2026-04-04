const { db, admin } = require("../../config/firebase");

function getCurrentSemester() {
    const month = new Date().getMonth() + 1;
    return (month >= 9 || month <= 1) ? 'FIRST' : 'SECOND';
}

function hasConflict(sched1, sched2) {
    if (!sched1 || !sched2) return false;
    const daysOverlap = sched1.days?.some(day => sched2.days?.includes(day));
    const timeOverlap = sched1.time === sched2.time;
    return daysOverlap && timeOverlap;
}

async function enrollStudent(req, res) {
    try {
        const { courseId, studentId, semester } = req.body;
        const requestingUser = req.user;

        if (requestingUser.role === 'STUDENT' && requestingUser.uid !== studentId) {
            return res.status(403).json({ error: 'You can only enroll yourself' });
        }

        const existing = await db.collection('enrollments')
            .where('studentId', '==', studentId)
            .where('courseId', '==', courseId)
            .where('status', '==', 'ACTIVE')
            .limit(1)
            .get();

        if (!existing.empty) return res.status(400).json({ error: 'Already enrolled in this course' });

        const [courseDoc, studentDoc] = await Promise.all([
            db.collection('courses').doc(courseId).get(),
            db.collection('users').doc(studentId).get()
        ]);

        if (!courseDoc.exists) return res.status(404).json({ error: 'Course not found' });
        if (!studentDoc.exists || studentDoc.data().role !== 'STUDENT') {
            return res.status(400).json({ error: 'Invalid student' });
        }

        const courseData = courseDoc.data();
        const studentData = studentDoc.data();

        const enrollmentData = {
            studentId,
            studentName: studentData.fullName || 'Unknown',
            courseId,
            courseName: courseData.name,
            professorId: courseData.professorId,
            professorName: courseData.professorName || '',
            enrolledAt: admin.firestore.FieldValue.serverTimestamp(),
            semester: semester || getCurrentSemester(),
            year: new Date().getFullYear(),
            status: 'ACTIVE'
        };

        const enrollmentRef = await db.collection('enrollments').add(enrollmentData);
        await db.collection('courses').doc(courseId).update({ studentCount: admin.firestore.FieldValue.increment(1) });

        res.status(201).json({ message: 'Enrolled successfully', enrollment: { id: enrollmentRef.id, ...enrollmentData } });
    } catch (error) {
        console.error('Enroll student error:', error);
        res.status(500).json({ error: error.message });
    }
}

async function getStudentEnrollments(req, res) {
    try {
        const { studentId } = req.params;
        const requestingUser = req.user;

        if (requestingUser.role === 'STUDENT' && requestingUser.uid !== studentId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const snapshot = await db.collection('enrollments')
            .where('studentId', '==', studentId)
            .where('status', '==', 'ACTIVE')
            .orderBy('enrolledAt', 'desc')
            .get();

        const enrollments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json({ enrollments, count: enrollments.length });
    } catch (error) {
        console.error('Get student enrollments error:', error);
        res.status(500).json({ error: error.message });
    }
}

async function getProfessorCourses(req, res) {
    try {
        const { professorId } = req.query;
        const requestingUser = req.user;

        if (requestingUser.role === 'PROFESSOR' && requestingUser.uid !== professorId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const snapshot = await db.collection('courses')
            .where('professorId', '==', professorId)
            .where('isActive', '==', true)
            .orderBy('createdAt', 'desc')
            .get();

        const courses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json({ courses, count: courses.length });
    } catch (error) {
        console.error('Get professor courses error:', error);
        res.status(500).json({ error: error.message });
    }
}

async function validateEnrollment(req, res) {
    try {
        const { studentId, courseId } = req.body;

        const courseDoc = await db.collection('courses').doc(courseId).get();
        if (!courseDoc.exists) return res.status(404).json({ valid: false, reason: 'Course not found' });

        const course = courseDoc.data();

        if (course.prerequisites && course.prerequisites.length > 0) {
            const completedCourses = await db.collection('grades')
                .where('studentId', '==', studentId)
                .where('status', '==', 'PASSED')
                .get();

            const completedIds = completedCourses.docs.map(doc => doc.data().courseId);
            const missing = course.prerequisites.filter(p => !completedIds.includes(p));

            if (missing.length > 0) {
                return res.status(400).json({ valid: false, reason: 'Prerequisites not met', missing });
            }
        }

        if (course.schedule) {
            const existingEnrollments = await db.collection('enrollments')
                .where('studentId', '==', studentId)
                .where('status', '==', 'ACTIVE')
                .get();

            for (const doc of existingEnrollments.docs) {
                const enrolledCourse = await db.collection('courses').doc(doc.data().courseId).get();
                const enrolledSchedule = enrolledCourse.data().schedule;

                if (hasConflict(course.schedule, enrolledSchedule)) {
                    return res.status(400).json({
                        valid: false,
                        reason: 'Schedule conflict with existing course',
                        conflictingCourse: enrolledCourse.data().name
                    });
                }
            }
        }

        res.json({ valid: true });
    } catch (error) {
        console.error('Validate enrollment error:', error);
        res.status(500).json({ error: error.message });
    }
}

async function getCourseStats(req, res) {
    try {
        const { courseId } = req.query;

        if (courseId) {
            const courseDoc = await db.collection('courses').doc(courseId).get();
            if (!courseDoc.exists) return res.status(404).json({ error: 'Course not found' });

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
            const coursesSnap = await db.collection('courses').where('isActive', '==', true).get();
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

module.exports = { enrollStudent, getStudentEnrollments, getProfessorCourses, validateEnrollment, getCourseStats };
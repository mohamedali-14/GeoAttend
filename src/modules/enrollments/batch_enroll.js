const { db, admin } = require("../../config/firebase");
const fs = require('fs');
const csv = require('csv-parser');

function getCurrentSemester() {
    const month = new Date().getMonth() + 1;
    return (month >= 9 || month <= 1) ? 'FIRST' : 'SECOND';
}

async function batchEnroll(req, res) {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    try {
        const file = req.file;
        const results = [];
        const errors = [];

        fs.createReadStream(file.path)
            .pipe(csv())
            .on('data', (row) => results.push(row))
            .on('end', async () => {
                const batch = db.batch();
                const courseCache = {};

                for (const row of results) {
                    const { studentId, courseId, semester } = row;

                    if (!studentId || !courseId) {
                        errors.push({ row, error: 'Missing required fields' });
                        continue;
                    }

                    if (!courseCache[courseId]) {
                        const courseDoc = await db.collection('courses').doc(courseId).get();
                        if (!courseDoc.exists) {
                            errors.push({ row, error: 'Course not found' });
                            continue;
                        }
                        courseCache[courseId] = courseDoc.data();
                    }

                    const studentDoc = await db.collection('users').doc(studentId).get();
                    if (!studentDoc.exists || studentDoc.data().role !== 'STUDENT') {
                        errors.push({ row, error: 'Invalid student' });
                        continue;
                    }

                    const existing = await db.collection('enrollments')
                        .where('studentId', '==', studentId)
                        .where('courseId', '==', courseId)
                        .where('status', '==', 'ACTIVE')
                        .limit(1)
                        .get();

                    if (!existing.empty) {
                        errors.push({ row, error: 'Already enrolled' });
                        continue;
                    }

                    const enrollmentRef = db.collection('enrollments').doc();
                    batch.set(enrollmentRef, {
                        studentId,
                        studentName: studentDoc.data().fullName || 'Unknown',
                        courseId,
                        courseName: courseCache[courseId].name,
                        professorId: courseCache[courseId].professorId,
                        professorName: courseCache[courseId].professorName || '',
                        enrolledAt: admin.firestore.FieldValue.serverTimestamp(),
                        semester: semester || getCurrentSemester(),
                        year: new Date().getFullYear(),
                        status: 'ACTIVE'
                    });

                    batch.update(db.collection('courses').doc(courseId), {
                        studentCount: admin.firestore.FieldValue.increment(1)
                    });
                }

                await batch.commit();
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

module.exports = { batchEnroll };
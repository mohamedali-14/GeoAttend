const { db, admin } = require('../firebase');
const fs = require('fs');
const csv = require('csv-parser');

/**
 * Upload CSV and enroll multiple students
 * POST /enrollments/batch
 * Body: multipart/form-data with CSV file
 */

async function batchEnroll(req, res) {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    try {
        const file = req.file; // assumes multer or similar
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
                fs.unlinkSync(file.path); // clean up temp file

                res.json({
                    message: 'Batch enrollment completed',
                    totalProcessed: results.length,
                    successCount: results.length - errors.length,
                    errors
                });
            });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

function getCurrentSemester() {
    const month = new Date().getMonth() + 1;
    return (month >= 9 || month <= 1) ? 'FIRST' : 'SECOND';
}

module.exports = { batchEnroll };
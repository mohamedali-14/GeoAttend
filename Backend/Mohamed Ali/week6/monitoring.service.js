// src/services/monitoring.service.js
const { db, admin } = require('../config/firebase');

async function checkAtRiskStudents(courseId) {
    try {
        const courseDoc = await db.collection('courses').doc(courseId).get();
        const course = courseDoc.data();
        
        const enrollmentsSnap = await db.collection('enrollments')
            .where('courseId', '==', courseId)
            .where('status', '==', 'ACTIVE')
            .get();
        
        const atRiskStudents = [];
        
        for (const doc of enrollmentsSnap.docs) {
            const studentId = doc.data().studentId;
            
            const attendanceSnap = await db.collection('attendance')
                .where('studentId', '==', studentId)
                .where('courseId', '==', courseId)
                .get();
            
            const totalSessions = attendanceSnap.size;
            const presentSessions = attendanceSnap.docs.filter(d => d.data().status === 'PRESENT').length;
            const attendanceRate = totalSessions > 0 ? (presentSessions / totalSessions) * 100 : 100;
            
            if (attendanceRate < 70) {
                const studentDoc = await db.collection('users').doc(studentId).get();
                atRiskStudents.push({
                    studentId,
                    studentName: studentDoc.data().fullName || studentDoc.data().email,
                    attendanceRate: Math.round(attendanceRate),
                    riskLevel: attendanceRate < 50 ? 'high' : 'medium'
                });
            }
        }
        
        await db.collection('monitoring').add({
            courseId,
            courseName: course.name,
            checkedAt: admin.firestore.FieldValue.serverTimestamp(),
            atRiskStudents,
            summary: {
                highRisk: atRiskStudents.filter(s => s.riskLevel === 'high').length,
                mediumRisk: atRiskStudents.filter(s => s.riskLevel === 'medium').length,
                totalAtRisk: atRiskStudents.length
            }
        });
        
        return { atRiskStudents, totalAtRisk: atRiskStudents.length };
    } catch (error) {
        console.error('Error checking at-risk students:', error);
        throw error;
    }
}

async function getSystemMetrics() {
    try {
        const usersSnap = await db.collection('users').get();
        const attendanceSnap = await db.collection('attendance').get();
        const quizzesSnap = await db.collection('quizzes').get();
        const submissionsSnap = await db.collection('quizSubmissions').get();

        return {
            users: {
                total: usersSnap.size,
                students: usersSnap.docs.filter(d => d.data().role === 'STUDENT').length,
                professors: usersSnap.docs.filter(d => d.data().role === 'PROFESSOR').length
            },
            attendance: {
                totalRecords: attendanceSnap.size,
                averageDailyCheckins: Math.round(attendanceSnap.size / 30)
            },
            quizzes: {
                totalQuizzes: quizzesSnap.size,
                totalSubmissions: submissionsSnap.size
            },
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        console.error('Error getting system metrics:', error);
        throw error;
    }
}

module.exports = { checkAtRiskStudents, getSystemMetrics };
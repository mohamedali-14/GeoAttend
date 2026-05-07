// src/services/monitoring.service.js
const { db, admin } = require('../config/firebase');
const { sendToMultipleDevices } = require('./notification.service');

async function checkAtRiskStudents(courseId) {
    try {
        const courseDoc = await db.collection('courses').doc(courseId).get();
        if (!courseDoc.exists) {
            throw new Error('Course not found');
        }
        const course = courseDoc.data();

        const enrollmentsSnap = await db.collection('enrollments')
            .where('courseId', '==', courseId)
            .where('status', '==', 'ACTIVE')
            .get();

        const atRiskStudents = [];

        for (const doc of enrollmentsSnap.docs) {
            const studentId = doc.data().studentId;
            
            // Get attendance records for this student in this course
            const attendanceSnap = await db.collection('attendance')
                .where('studentId', '==', studentId)
                .where('courseId', '==', courseId)
                .get();
            
            const totalSessions = attendanceSnap.size;
            const presentSessions = attendanceSnap.docs.filter(d => d.data().status === 'PRESENT').length;
            const attendanceRate = totalSessions > 0 ? (presentSessions / totalSessions) * 100 : 100;
            
            let riskLevel = 'low';
            let riskFactors = [];
            
            if (attendanceRate < 50) {
                riskLevel = 'high';
                riskFactors.push('Critical low attendance rate');
            } else if (attendanceRate < 70) {
                riskLevel = 'high';
                riskFactors.push('Low attendance rate');
            } else if (attendanceRate < 80) {
                riskLevel = 'medium';
                riskFactors.push('Below average attendance');
            }
            
            // Check for missed consecutive sessions
            const sortedRecords = attendanceSnap.docs
                .map(d => ({ ...d.data(), timestamp: d.data().timestamp?.toDate() }))
                .filter(r => r.timestamp)
                .sort((a, b) => b.timestamp - a.timestamp);
            
            let missedStreak = 0;
            for (const record of sortedRecords) {
                if (record.status !== 'PRESENT') {
                    missedStreak++;
                } else {
                    break;
                }
            }
            
            if (missedStreak >= 3) {
                riskFactors.push(`Missed last ${missedStreak} sessions`);
                if (riskLevel === 'low') riskLevel = 'medium';
            }
            
            if (riskFactors.length > 0) {
                const studentDoc = await db.collection('users').doc(studentId).get();
                atRiskStudents.push({
                    studentId,
                    studentName: studentDoc.data()?.fullName || 'Unknown',
                    studentEmail: studentDoc.data()?.email || 'N/A',
                    attendanceRate: Math.round(attendanceRate),
                    missedStreak,
                    riskLevel,
                    riskFactors
                });
            }
        }

        // Send alert to professor if there are at-risk students
        if (atRiskStudents.length > 0 && course.professorId) {
            await sendAlertToProfessor(course.professorId, {
                courseId,
                courseName: course.name,
                totalAtRisk: atRiskStudents.length,
                highRiskCount: atRiskStudents.filter(s => s.riskLevel === 'high').length
            });
        }

        // Store monitoring result
        const monitoringRef = await db.collection('monitoringLogs').add({
            courseId,
            courseName: course.name,
            checkedAt: admin.firestore.FieldValue.serverTimestamp(),
            atRiskCount: atRiskStudents.length,
            highRiskCount: atRiskStudents.filter(s => s.riskLevel === 'high').length,
            mediumRiskCount: atRiskStudents.filter(s => s.riskLevel === 'medium').length,
            lowRiskCount: atRiskStudents.filter(s => s.riskLevel === 'low').length,
            students: atRiskStudents
        });

        return { 
            atRiskStudents, 
            totalAtRisk: atRiskStudents.length,
            monitoringId: monitoringRef.id
        };
    } catch (error) {
        console.error('Error checking at-risk students:', error);
        throw error;
    }
}

async function sendAlertToProfessor(professorId, alertData) {
    try {
        const tokensSnap = await db.collection('users')
            .doc(professorId)
            .collection('fcm_tokens')
            .limit(5)
            .get();

        const tokens = tokensSnap.docs.map(doc => doc.data().token);

        if (tokens.length > 0) {
            await sendToMultipleDevices(
                tokens,
                {
                    title: '⚠️ At-Risk Students Alert',
                    body: `${alertData.courseName}: ${alertData.totalAtRisk} students need attention`
                },
                {
                    type: 'MONITORING_ALERT',
                    courseId: alertData.courseId,
                    highRiskCount: alertData.highRiskCount.toString()
                }
            );
        }
        
        // Also store notification log
        await db.collection('notifications').add({
            type: 'MONITORING_ALERT',
            professorId: professorId,
            courseId: alertData.courseId,
            courseName: alertData.courseName,
            totalAtRisk: alertData.totalAtRisk,
            sentAt: admin.firestore.FieldValue.serverTimestamp()
        });
    } catch (error) {
        console.error('Error sending alert to professor:', error);
    }
}

async function getSystemMetrics() {
    try {
        // Get user counts
        const usersSnap = await db.collection('users').get();
        const totalUsers = usersSnap.size;
        const students = usersSnap.docs.filter(d => d.data().role === 'STUDENT').length;
        const professors = usersSnap.docs.filter(d => d.data().role === 'PROFESSOR').length;
        const admins = usersSnap.docs.filter(d => d.data().role === 'ADMIN').length;
        
        // Get course counts
        const coursesSnap = await db.collection('courses').where('isActive', '==', true).get();
        const totalCourses = coursesSnap.size;
        
        // Get session counts
        const sessionsSnap = await db.collection('sessions').get();
        const totalSessions = sessionsSnap.size;
        const activeSessions = sessionsSnap.docs.filter(d => d.data().status === 'ACTIVE').length;
        const completedSessions = sessionsSnap.docs.filter(d => d.data().status === 'COMPLETED' || d.data().status === 'ENDED').length;
        
        // Get attendance counts
        const attendanceSnap = await db.collection('attendance').get();
        const totalAttendance = attendanceSnap.size;
        const presentCount = attendanceSnap.docs.filter(d => d.data().status === 'PRESENT').length;
        
        // Get quiz counts
        const quizzesSnap = await db.collection('quizzes').get();
        const totalQuizzes = quizzesSnap.size;
        
        const submissionsSnap = await db.collection('quizSubmissions').get();
        const totalSubmissions = submissionsSnap.size;
        
        // Get selfie counts
        const selfiesSnap = await db.collection('attendanceSelfies').get();
        const totalSelfies = selfiesSnap.size;
        const pendingSelfies = selfiesSnap.docs.filter(d => d.data().verificationStatus === 'PENDING').length;
        
        // Get storage usage approximation
        let totalStorageBytes = 0;
        for (const doc of selfiesSnap.docs) {
            if (doc.data().metadata?.fileSize) {
                totalStorageBytes += doc.data().metadata.fileSize;
            }
        }

        return {
            users: {
                total: totalUsers,
                students: students,
                professors: professors,
                admins: admins
            },
            courses: {
                total: totalCourses,
                active: totalCourses
            },
            sessions: {
                total: totalSessions,
                active: activeSessions,
                completed: completedSessions
            },
            attendance: {
                totalRecords: totalAttendance,
                presentCount: presentCount,
                averageAttendanceRate: totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 0
            },
            quizzes: {
                totalQuizzes: totalQuizzes,
                totalSubmissions: totalSubmissions,
                averageSubmissionsPerQuiz: totalQuizzes > 0 ? Math.round(totalSubmissions / totalQuizzes) : 0
            },
            selfies: {
                total: totalSelfies,
                pending: pendingSelfies,
                verified: totalSelfies - pendingSelfies
            },
            storage: {
                totalBytes: totalStorageBytes,
                totalMB: Math.round(totalStorageBytes / (1024 * 1024)),
                totalGB: (totalStorageBytes / (1024 * 1024 * 1024)).toFixed(2)
            },
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        console.error('Error getting system metrics:', error);
        throw error;
    }
}

module.exports = {
    checkAtRiskStudents,
    sendAlertToProfessor,
    getSystemMetrics
};
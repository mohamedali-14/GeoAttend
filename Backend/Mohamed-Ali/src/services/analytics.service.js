const { db, admin } = require('./firebase');

async function getAttendanceStats({ courseId, professorId, period = 'month', startDate, endDate }) {
    try {
        let sessionsQuery = db.collection('sessions');
        
        if (courseId) {
            sessionsQuery = sessionsQuery.where('courseId', '==', courseId);
        }
        if (professorId) {
            sessionsQuery = sessionsQuery.where('professorId', '==', professorId);
        }
        
        let dateRange = { startDate: null, endDate: null };
        if (startDate && endDate) {
            dateRange = { startDate: new Date(startDate), endDate: new Date(endDate) };
        } else {
            dateRange = getDateRange(period);
        }
        
        if (dateRange.startDate) {
            sessionsQuery = sessionsQuery.where('scheduledDate', '>=', dateRange.startDate);
            sessionsQuery = sessionsQuery.where('scheduledDate', '<=', dateRange.endDate);
        }
        
        const sessionsSnapshot = await sessionsQuery.get();
        const sessions = sessionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        let totalStudents = 0;
        let totalPresent = 0;
        let totalSessions = sessions.length;
        let completedSessions = 0;
        
        for (const session of sessions) {
            const enrollmentsSnap = await db.collection('enrollments')
                .where('courseId', '==', session.courseId)
                .where('status', '==', 'ACTIVE')
                .get();
            
            const sessionStudentCount = enrollmentsSnap.size;
            totalStudents += sessionStudentCount;
            
            const attendanceSnap = await db.collection('attendance')
                .where('sessionId', '==', session.id)
                .where('status', '==', 'PRESENT')
                .get();
            
            totalPresent += attendanceSnap.size;
            
            if (session.status === 'ENDED' || session.status === 'COMPLETED') {
                completedSessions++;
            }
        }
        
        const avgStudentsPerSession = totalSessions > 0 ? totalStudents / totalSessions : 0;
        const averageAttendance = totalSessions > 0 && totalStudents > 0 ? (totalPresent / totalStudents) * 100 : 0;
        
        return {
            summary: {
                totalSessions: totalSessions,
                completedSessions: completedSessions,
                totalCheckins: totalPresent,
                averageAttendanceRate: Math.round(averageAttendance),
                averageStudentsPerSession: Math.round(avgStudentsPerSession),
                totalStudents: Math.round(avgStudentsPerSession)
            },
            period: period,
            dateRange: {
                startDate: dateRange.startDate?.toISOString(),
                endDate: dateRange.endDate?.toISOString()
            },
            generatedAt: new Date().toISOString()
        };
    } catch (error) {
        console.error('Error getting attendance stats:', error);
        throw error;
    }
}

async function getAttendanceTrends({ courseId, professorId, interval = 'daily', days = 30 }) {
    try {
        let sessionsQuery = db.collection('sessions');
        
        if (courseId) {
            sessionsQuery = sessionsQuery.where('courseId', '==', courseId);
        }
        if (professorId) {
            sessionsQuery = sessionsQuery.where('professorId', '==', professorId);
        }
        
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        startDate.setHours(0, 0, 0, 0);
        
        sessionsQuery = sessionsQuery.where('scheduledDate', '>=', startDate);
        sessionsQuery = sessionsQuery.orderBy('scheduledDate', 'asc');
        
        const sessionsSnapshot = await sessionsQuery.get();
        const sessions = sessionsSnapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data(),
            scheduledDate: doc.data().scheduledDate?.toDate() || new Date()
        }));
        
        const groupedData = {};
        
        for (const session of sessions) {
            const enrollmentsSnap = await db.collection('enrollments')
                .where('courseId', '==', session.courseId)
                .where('status', '==', 'ACTIVE')
                .get();
            const enrolledCount = enrollmentsSnap.size;
            
            const attendanceSnap = await db.collection('attendance')
                .where('sessionId', '==', session.id)
                .where('status', '==', 'PRESENT')
                .get();
            const presentCount = attendanceSnap.size;
            
            const date = session.scheduledDate;
            let key;
            if (interval === 'daily') {
                key = date.toISOString().split('T')[0];
            } else if (interval === 'weekly') {
                const weekNum = getWeekNumber(date);
                key = `${date.getFullYear()}-W${weekNum}`;
            } else {
                key = `${date.getFullYear()}-${date.getMonth() + 1}`;
            }
            
            if (!groupedData[key]) {
                groupedData[key] = {
                    totalPresent: 0,
                    totalEnrolled: 0,
                    count: 0,
                    sessions: []
                };
            }
            
            groupedData[key].totalPresent += presentCount;
            groupedData[key].totalEnrolled += enrolledCount;
            groupedData[key].count++;
            groupedData[key].sessions.push({
                sessionId: session.id,
                title: session.title,
                attendanceRate: enrolledCount > 0 ? (presentCount / enrolledCount) * 100 : 0
            });
        }
        
        const trends = [];
        for (const [key, data] of Object.entries(groupedData)) {
            trends.push({
                period: key,
                attendanceRate: data.totalEnrolled > 0 ? Math.round((data.totalPresent / data.totalEnrolled) * 100) : 0,
                totalSessions: data.count,
                totalPresent: data.totalPresent,
                totalEnrolled: data.totalEnrolled,
                sessions: data.sessions
            });
        }
        
        return {
            trends: trends.sort((a, b) => a.period.localeCompare(b.period)),
            interval: interval,
            daysAnalyzed: days,
            generatedAt: new Date().toISOString()
        };
    } catch (error) {
        console.error('Error getting attendance trends:', error);
        throw error;
    }
}

async function getStudentEngagement(studentId, courseId = null) {
    try {
        const studentDoc = await db.collection('users').doc(studentId).get();
        if (!studentDoc.exists) {
            throw new Error('Student not found');
        }
        const studentData = studentDoc.data();
        
        let attendanceQuery = db.collection('attendance').where('studentId', '==', studentId);
        
        const attendanceSnap = await attendanceQuery.get();
        const attendanceRecords = attendanceSnap.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            timestamp: doc.data().timestamp?.toDate()
        }));
        
        let sessionsQuery = db.collection('sessions');
        if (courseId) {
            sessionsQuery = sessionsQuery.where('courseId', '==', courseId);
        }
        const sessionsSnap = await sessionsQuery.get();
        const totalSessions = sessionsSnap.size;
        
        let presentSessions = 0;
        let lateArrivals = 0;
        let earlyDepartures = 0;
        let selfieVerified = 0;
        let gpsVerified = 0;
        let qrVerified = 0;
        let randomCheckVerified = 0;
        
        const enrollmentsSnap = await db.collection('enrollments')
            .where('studentId', '==', studentId)
            .where('status', '==', 'ACTIVE')
            .get();
        
        const enrolledCourses = enrollmentsSnap.docs.map(doc => ({
            courseId: doc.data().courseId,
            courseName: doc.data().courseName,
            enrolledAt: doc.data().enrolledAt?.toDate()
        }));
        
        for (const record of attendanceRecords) {
            if (record.status === 'PRESENT') {
                presentSessions++;
            }
            if (record.isLate) lateArrivals++;
            if (record.leftEarly) earlyDepartures++;
            
            switch (record.verificationMethod) {
                case 'SELFIE': selfieVerified++; break;
                case 'GPS': gpsVerified++; break;
                case 'QR': qrVerified++; break;
                case 'RANDOM_CHECK': randomCheckVerified++; break;
            }
        }
        
        const attendanceRate = totalSessions > 0 ? (presentSessions / totalSessions) * 100 : 0;
        
        const monthlyPerformance = {};
        for (const record of attendanceRecords) {
            if (record.timestamp) {
                const month = record.timestamp.toISOString().slice(0, 7);
                if (!monthlyPerformance[month]) {
                    monthlyPerformance[month] = { present: 0, total: 0 };
                }
                if (record.status === 'PRESENT') {
                    monthlyPerformance[month].present++;
                }
                monthlyPerformance[month].total++;
            }
        }
        
        const monthlyData = Object.entries(monthlyPerformance).map(([month, data]) => ({
            month,
            attendanceRate: data.total > 0 ? (data.present / data.total) * 100 : 0,
            presentCount: data.present,
            totalSessions: data.total
        }));
        
        return {
            studentId: studentId,
            studentName: studentData.fullName,
            studentEmail: studentData.email,
            studentCode: studentData.studentId,
            enrolledCourses: enrolledCourses,
            summary: {
                totalSessions: totalSessions,
                presentCount: presentSessions,
                absentCount: totalSessions - presentSessions,
                attendanceRate: Math.round(attendanceRate),
                lateArrivals: lateArrivals,
                earlyDepartures: earlyDepartures,
                verificationBreakdown: {
                    selfie: selfieVerified,
                    gps: gpsVerified,
                    qr: qrVerified,
                    randomCheck: randomCheckVerified
                }
            },
            monthlyPerformance: monthlyData,
            lastUpdated: new Date().toISOString()
        };
    } catch (error) {
        console.error('Error getting student engagement:', error);
        throw error;
    }
}

async function getCourseAnalytics(courseId) {
    try {
        const courseDoc = await db.collection('courses').doc(courseId).get();
        if (!courseDoc.exists) {
            throw new Error('Course not found');
        }
        const course = courseDoc.data();
        
        const sessionsSnap = await db.collection('sessions')
            .where('courseId', '==', courseId)
            .orderBy('scheduledDate', 'desc')
            .get();
        
        const sessions = sessionsSnap.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data(),
            scheduledDate: doc.data().scheduledDate?.toDate()
        }));
        
        const enrollmentsSnap = await db.collection('enrollments')
            .where('courseId', '==', courseId)
            .where('status', '==', 'ACTIVE')
            .get();
        
        const totalStudents = enrollmentsSnap.size;
        const enrolledStudents = [];
        
        for (const doc of enrollmentsSnap.docs) {
            const studentDoc = await db.collection('users').doc(doc.data().studentId).get();
            if (studentDoc.exists) {
                enrolledStudents.push({
                    studentId: studentDoc.id,
                    name: studentDoc.data().fullName,
                    studentCode: studentDoc.data().studentId
                });
            }
        }
        
        const sessionAttendance = [];
        let totalAttendanceRate = 0;
        let totalPresentCount = 0;
        
        for (const session of sessions) {
            const attendanceSnap = await db.collection('attendance')
                .where('sessionId', '==', session.id)
                .where('status', '==', 'PRESENT')
                .get();
            
            const presentCount = attendanceSnap.size;
            const rate = totalStudents > 0 ? (presentCount / totalStudents) * 100 : 0;
            
            totalAttendanceRate += rate;
            totalPresentCount += presentCount;
            
            sessionAttendance.push({
                sessionId: session.id,
                title: session.title,
                date: session.scheduledDate,
                startTime: session.startTime,
                endTime: session.endTime,
                attendanceRate: Math.round(rate),
                presentCount: presentCount,
                absentCount: totalStudents - presentCount,
                totalStudents: totalStudents,
                status: session.status
            });
        }
        
        const averageAttendance = sessions.length > 0 ? totalAttendanceRate / sessions.length : 0;
        const averagePresentPerSession = sessions.length > 0 ? totalPresentCount / sessions.length : 0;
        
        const studentPerformance = [];
        for (const student of enrolledStudents) {
            const studentAttendance = await db.collection('attendance')
                .where('studentId', '==', student.studentId)
                .where('courseId', '==', courseId)
                .get();
            
            const presentCount = studentAttendance.docs.filter(doc => doc.data().status === 'PRESENT').length;
            const studentRate = sessions.length > 0 ? (presentCount / sessions.length) * 100 : 0;
            
            studentPerformance.push({
                studentId: student.studentId,
                name: student.name,
                studentCode: student.studentCode,
                attendanceRate: Math.round(studentRate),
                presentCount: presentCount,
                absentCount: sessions.length - presentCount
            });
        }
        
        studentPerformance.sort((a, b) => b.attendanceRate - a.attendanceRate);
        
        const attendanceDistribution = {
            excellent: studentPerformance.filter(s => s.attendanceRate >= 90).length,
            good: studentPerformance.filter(s => s.attendanceRate >= 75 && s.attendanceRate < 90).length,
            average: studentPerformance.filter(s => s.attendanceRate >= 60 && s.attendanceRate < 75).length,
            poor: studentPerformance.filter(s => s.attendanceRate < 60).length
        };
        
        return {
            courseId: courseId,
            courseName: course.name,
            courseCode: course.code,
            professorId: course.professorId,
            professorName: course.professorName,
            department: course.department,
            summary: {
                totalStudents: totalStudents,
                totalSessions: sessions.length,
                averageAttendanceRate: Math.round(averageAttendance),
                averagePresentPerSession: Math.round(averagePresentPerSession),
                completedSessions: sessions.filter(s => s.status === 'ENDED' || s.status === 'COMPLETED').length,
                upcomingSessions: sessions.filter(s => s.status === 'SCHEDULED').length,
                activeSessions: sessions.filter(s => s.status === 'ACTIVE').length
            },
            attendanceDistribution: attendanceDistribution,
            sessionAttendance: sessionAttendance,
            studentPerformance: studentPerformance,
            topPerformers: studentPerformance.slice(0, 5),
            lowPerformers: studentPerformance.slice(-5).reverse(),
            generatedAt: new Date().toISOString()
        };
    } catch (error) {
        console.error('Error getting course analytics:', error);
        throw error;
    }
}

async function getRealtimeDashboard(professorId) {
    try {
        const activeSessionsSnap = await db.collection('sessions')
            .where('professorId', '==', professorId)
            .where('status', '==', 'ACTIVE')
            .get();
        
        const activeSessions = [];
        for (const doc of activeSessionsSnap.docs) {
            const session = { id: doc.id, ...doc.data() };
            
            const attendanceSnap = await db.collection('attendance')
                .where('sessionId', '==', session.id)
                .where('status', '==', 'PRESENT')
                .get();
            
            const enrollmentsSnap = await db.collection('enrollments')
                .where('courseId', '==', session.courseId)
                .where('status', '==', 'ACTIVE')
                .get();
            
            const recentCheckins = [];
            for (const attDoc of attendanceSnap.docs) {
                recentCheckins.push({
                    studentId: attDoc.data().studentId,
                    studentName: attDoc.data().studentName,
                    timestamp: attDoc.data().timestamp?.toDate(),
                    method: attDoc.data().method
                });
            }
            
            recentCheckins.sort((a, b) => b.timestamp - a.timestamp);
            
            activeSessions.push({
                sessionId: session.id,
                courseName: session.courseName,
                title: session.title,
                startTime: session.startTime,
                currentAttendance: attendanceSnap.size,
                totalEnrolled: enrollmentsSnap.size,
                attendanceRate: enrollmentsSnap.size > 0 ? Math.round((attendanceSnap.size / enrollmentsSnap.size) * 100) : 0,
                recentCheckins: recentCheckins.slice(0, 10),
                location: session.location,
                randomCheckActive: session.randomCheckActive || false
            });
        }
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const upcomingSessionsSnap = await db.collection('sessions')
            .where('professorId', '==', professorId)
            .where('scheduledDate', '>=', today)
            .where('scheduledDate', '<', tomorrow)
            .where('status', '==', 'SCHEDULED')
            .get();
        
        const upcomingSessions = upcomingSessionsSnap.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data(),
            scheduledDate: doc.data().scheduledDate?.toDate()
        }));
        
        const weeklyStats = await getAttendanceStats({ professorId: professorId, period: 'week' });
        const allCoursesStats = await getAttendanceStats({ professorId: professorId });
        
        return {
            professorId: professorId,
            activeSessions: activeSessions,
            upcomingSessions: upcomingSessions,
            weeklySummary: weeklyStats.summary,
            overallAttendanceRate: allCoursesStats.summary.averageAttendanceRate,
            lastUpdated: new Date().toISOString()
        };
    } catch (error) {
        console.error('Error getting realtime dashboard:', error);
        throw error;
    }
}

async function getQuickStats(userId, userRole) {
    try {
        let stats = {
            totalCourses: 0,
            totalSessions: 0,
            upcomingSessions: 0,
            averageAttendance: 0,
            totalStudents: 0,
            completionRate: 0
        };
        
        if (userRole === 'PROFESSOR') {
            const coursesSnap = await db.collection('courses')
                .where('professorId', '==', userId)
                .where('isActive', '==', true)
                .get();
            
            stats.totalCourses = coursesSnap.size;
            
            for (const courseDoc of coursesSnap.docs) {
                const enrollmentsSnap = await db.collection('enrollments')
                    .where('courseId', '==', courseDoc.id)
                    .where('status', '==', 'ACTIVE')
                    .get();
                stats.totalStudents += enrollmentsSnap.size;
                
                const sessionsSnap = await db.collection('sessions')
                    .where('courseId', '==', courseDoc.id)
                    .get();
                stats.totalSessions += sessionsSnap.size;
                
                const now = new Date();
                const upcomingSnap = await db.collection('sessions')
                    .where('courseId', '==', courseDoc.id)
                    .where('scheduledDate', '>=', now)
                    .where('status', '==', 'SCHEDULED')
                    .get();
                stats.upcomingSessions += upcomingSnap.size;
            }
        } else if (userRole === 'STUDENT') {
            const enrollmentsSnap = await db.collection('enrollments')
                .where('studentId', '==', userId)
                .where('status', '==', 'ACTIVE')
                .get();
            
            stats.totalCourses = enrollmentsSnap.size;
            
            const engagement = await getStudentEngagement(userId);
            stats.averageAttendance = engagement.summary.attendanceRate;
            stats.totalSessions = engagement.summary.totalSessions;
        } else if (userRole === 'ADMIN') {
            const coursesSnap = await db.collection('courses').where('isActive', '==', true).get();
            stats.totalCourses = coursesSnap.size;
            
            const studentsSnap = await db.collection('users').where('role', '==', 'STUDENT').get();
            stats.totalStudents = studentsSnap.size;
            
            const professorsSnap = await db.collection('users').where('role', '==', 'PROFESSOR').get();
            stats.totalProfessors = professorsSnap.size;
            
            const sessionsSnap = await db.collection('sessions').get();
            stats.totalSessions = sessionsSnap.size;
            
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const upcomingSnap = await db.collection('sessions')
                .where('scheduledDate', '>=', today)
                .where('status', '==', 'SCHEDULED')
                .get();
            stats.upcomingSessions = upcomingSnap.size;
            
            const attendanceStats = await getAttendanceStats({});
            stats.averageAttendance = attendanceStats.summary.averageAttendanceRate;
        }
        
        return {
            stats: stats,
            userRole: userRole,
            generatedAt: new Date().toISOString()
        };
    } catch (error) {
        console.error('Error getting quick stats:', error);
        throw error;
    }
}

async function exportAnalyticsData({ courseId, professorId, format = 'json', period = 'month' }) {
    try {
        const stats = await getAttendanceStats({ courseId, professorId, period });
        const trends = await getAttendanceTrends({ courseId, professorId });
        
        let detailedData = {};
        
        if (courseId) {
            detailedData = await getCourseAnalytics(courseId);
        } else if (professorId) {
            const coursesSnap = await db.collection('courses')
                .where('professorId', '==', professorId)
                .get();
            
            detailedData.courses = [];
            for (const doc of coursesSnap.docs) {
                const courseData = await getCourseAnalytics(doc.id);
                detailedData.courses.push(courseData);
            }
        }
        
        const exportData = {
            generatedAt: new Date().toISOString(),
            parameters: { courseId, professorId, period },
            summary: stats,
            trends: trends,
            detailedData: detailedData
        };
        
        return exportData;
    } catch (error) {
        console.error('Error exporting analytics data:', error);
        throw error;
    }
}

function getDateRange(period) {
    const now = new Date();
    const startDate = new Date(now);
    
    switch (period) {
        case 'week':
            startDate.setDate(now.getDate() - 7);
            break;
        case 'month':
            startDate.setMonth(now.getMonth() - 1);
            break;
        case 'semester':
            startDate.setMonth(now.getMonth() - 4);
            break;
        case 'year':
            startDate.setFullYear(now.getFullYear() - 1);
            break;
        default:
            return { startDate: null, endDate: null };
    }
    
    startDate.setHours(0, 0, 0, 0);
    now.setHours(23, 59, 59, 999);
    
    return { startDate, endDate: now };
}

function getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

module.exports = {
    getAttendanceStats,
    getAttendanceTrends,
    getStudentEngagement,
    getCourseAnalytics,
    getRealtimeDashboard,
    getQuickStats,
    exportAnalyticsData
};
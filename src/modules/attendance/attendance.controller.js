const { db, admin } = require('../../config/firebase');
const { generateGeohash, calculateDistance, getGeohashQueryBounds } = require('../../config/geofire');


async function joinSession(req, res) {
    try {
        const { sessionId } = req.params;
        const { lat, lng, deviceId, method = 'GPS' } = req.body;
        const studentId = req.user.uid;
        const studentRole = req.user.role;


        if (studentRole !== 'STUDENT') {
            return res.status(403).json({ error: 'Only students can join sessions' });
        }


        if (!lat || !lng) {
            return res.status(400).json({ error: 'Latitude and longitude are required' });
        }

        const sessionDoc = await db.collection('sessions').doc(sessionId).get();
        if (!sessionDoc.exists) {
            return res.status(404).json({ error: 'Session not found' });
        }
        const session = sessionDoc.data();


        if (session.status !== 'ACTIVE') {
            return res.status(400).json({ error: 'Session is not active' });
        }


        if (session.expiresAt && session.expiresAt.toDate() < new Date()) {
            return res.status(400).json({ error: 'Session has expired' });
        }


        const isEnrolled = await checkEnrollment(studentId, session.courseId);
        if (!isEnrolled) {
            return res.status(403).json({ error: 'You are not enrolled in this course' });
        }


        const isWithinTimeWindow = checkTimeWindow(session);
        if (!isWithinTimeWindow) {
            return res.status(400).json({ error: 'Attendance window has closed' });
        }


        const existingAttendance = await db.collection('attendance')
            .where('sessionId', '==', sessionId)
            .where('studentId', '==', studentId)
            .limit(1)
            .get();

        if (!existingAttendance.empty) {
            return res.status(400).json({ error: 'Attendance already marked for this session' });
        }


        const settingsDoc = await db.collection('system_settings').doc('attendance').get();
        const defaultRadius = settingsDoc.exists ? settingsDoc.data().gpsRadius : 100;


        const sessionLat = session.location?.lat;
        const sessionLng = session.location?.lng;

        let distance = null;
        let isWithinRange = false;

        if (sessionLat && sessionLng) {
            distance = calculateDistance(lat, lng, sessionLat, sessionLng);
            const allowedRadius = session.radius || defaultRadius;
            isWithinRange = distance <= allowedRadius;
        } else {

            isWithinRange = true;
            distance = 0;
        }


        const recentAttendance = await db.collection('attendance')
            .where('studentId', '==', studentId)
            .where('timestamp', '>=', new Date(Date.now() - 5 * 60 * 1000))
            .get();

        if (recentAttendance.size > 1) {
            await logViolation(studentId, 'MULTIPLE_DEVICES', { deviceId, sessionId });
        }


        const geohash = generateGeohash(lat, lng);

        const attendanceData = {
            sessionId,
            studentId,
            studentName: req.user.fullName,
            courseId: session.courseId,
            courseName: session.courseName,
            professorId: session.professorId,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            location: new admin.firestore.GeoPoint(lat, lng),
            geohash,
            distance: distance ? Math.round(distance) : 0,
            isWithinRange,
            method,
            deviceId: deviceId || null,
            status: isWithinRange ? 'PRESENT' : 'OUT_OF_RANGE'
        };

        const attendanceRef = await db.collection('attendance').add(attendanceData);

        await db.collection('sessions').doc(sessionId).update({
            studentsPresent: admin.firestore.FieldValue.increment(1)
        });

        res.status(201).json({
            message: isWithinRange ? 'Attendance marked successfully' : 'Marked but outside range - pending review',
            attendance: { id: attendanceRef.id, ...attendanceData, timestamp: new Date() },
            distance,
            allowedRadius: session.radius || defaultRadius,
            isWithinRange
        });
    } catch (error) {
        console.error('Join session error:', error);
        res.status(500).json({ error: error.message });
    }
}


async function getNearbySessions(req, res) {
    try {
        const { lat, lng, radius = 100 } = req.query;
        const studentId = req.user.uid;

        if (!lat || !lng) {
            return res.status(400).json({ error: 'Latitude and longitude are required' });
        }

        const center = [parseFloat(lat), parseFloat(lng)];
        const radiusInM = parseInt(radius);


        const bounds = getGeohashQueryBounds(center, radiusInM);
        const sessions = [];


        for (const bound of bounds) {
            const snapshot = await db.collection('sessions')
                .where('geohash', '>=', bound[0])
                .where('geohash', '<=', bound[1])
                .where('status', '==', 'ACTIVE')
                .get();

            for (const doc of snapshot.docs) {
                const session = { id: doc.id, ...doc.data() };

                // Skip sessions without location
                if (!session.location || !session.location.lat || !session.location.lng) continue;

                const distance = calculateDistance(parseFloat(lat), parseFloat(lng), session.location.lat, session.location.lng);

                if (distance <= radiusInM) {
                    const isEnrolled = await checkEnrollment(studentId, session.courseId);
                    if (isEnrolled) {
                        sessions.push({ ...session, distance: Math.round(distance) });
                    }
                }
            }
        }


        const uniqueSessions = Array.from(new Map(sessions.map(s => [s.id, s])).values());

        res.json({
            sessions: uniqueSessions,
            count: uniqueSessions.length,
            location: { lat: parseFloat(lat), lng: parseFloat(lng) }
        });
    } catch (error) {
        console.error('Get nearby sessions error:', error);
        res.status(500).json({ error: error.message });
    }
}


async function getAttendanceHistory(req, res) {
    try {
        const { courseId, limit = 20, startAfter, semester, year } = req.query;
        const studentId = req.user.uid;

        let query = db.collection('attendance')
            .where('studentId', '==', studentId)
            .orderBy('timestamp', 'desc');

        if (courseId) query = query.where('courseId', '==', courseId);
        if (semester) query = query.where('semester', '==', semester);
        if (year) query = query.where('year', '==', parseInt(year));

        query = query.limit(parseInt(limit));

        if (startAfter) {
            const startDoc = await db.collection('attendance').doc(startAfter).get();
            if (startDoc.exists) query = query.startAfter(startDoc);
        }

        const snapshot = await query.get();

        const attendance = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            timestamp: doc.data().timestamp?.toDate()
        }));

        const courseStats = {};
        for (const record of attendance) {
            if (!courseStats[record.courseId]) {
                courseStats[record.courseId] = {
                    courseId: record.courseId,
                    courseName: record.courseName,
                    total: 0,
                    present: 0
                };
            }
            courseStats[record.courseId].total++;
            if (record.status === 'PRESENT') courseStats[record.courseId].present++;
        }

        for (const cid in courseStats) {
            courseStats[cid].percentage = Math.round((courseStats[cid].present / courseStats[cid].total) * 100);
        }

        const lastDoc = snapshot.docs[snapshot.docs.length - 1];

        res.json({
            attendance,
            courseStats: Object.values(courseStats),
            pagination: {
                limit: parseInt(limit),
                nextCursor: lastDoc ? lastDoc.id : null,
                hasMore: attendance.length === parseInt(limit)
            }
        });
    } catch (error) {
        console.error('Get attendance history error:', error);
        res.status(500).json({ error: error.message });
    }
}


async function getSessionSummary(req, res) {
    try {
        const { sessionId } = req.params;
        const professorId = req.user.uid;
        const userRole = req.user.role;

        const sessionDoc = await db.collection('sessions').doc(sessionId).get();
        if (!sessionDoc.exists) {
            return res.status(404).json({ error: 'Session not found' });
        }

        const session = sessionDoc.data();

        // Verify professor owns this session or user is admin
        if (session.professorId !== professorId && userRole !== 'ADMIN') {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Get all enrolled students
        const enrollmentsSnap = await db.collection('enrollments')
            .where('courseId', '==', session.courseId)
            .where('status', '==', 'ACTIVE')
            .get();

        const enrolledStudents = [];
        for (const doc of enrollmentsSnap.docs) {
            const studentDoc = await db.collection('users').doc(doc.data().studentId).get();
            if (studentDoc.exists) {
                enrolledStudents.push({
                    id: studentDoc.id,
                    ...studentDoc.data()
                });
            }
        }

        const attendanceSnap = await db.collection('attendance')
            .where('sessionId', '==', sessionId)
            .get();

        const presentStudents = attendanceSnap.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            timestamp: doc.data().timestamp?.toDate()
        }));

        const presentIds = new Set(presentStudents.map(s => s.studentId));

        res.json({
            session: {
                id: sessionId,
                title: session.title,
                courseName: session.courseName,
                scheduledDate: session.scheduledDate,
                status: session.status,
                location: session.location,
                radius: session.radius
            },
            statistics: {
                totalEnrolled: enrolledStudents.length,
                totalPresent: presentStudents.length,
                totalAbsent: enrolledStudents.length - presentStudents.length,
                attendancePercentage: enrolledStudents.length > 0 ? Math.round((presentStudents.length / enrolledStudents.length) * 100) : 0
            },
            presentStudents: presentStudents.map(s => ({
                id: s.studentId,
                name: s.studentName,
                timestamp: s.timestamp,
                distance: s.distance,
                method: s.method,
                isWithinRange: s.isWithinRange
            })),
            absentStudents: enrolledStudents.filter(s => !presentIds.has(s.id)).map(s => ({
                id: s.id,
                name: s.fullName || `${s.firstName} ${s.lastName}`,
                email: s.email,
                studentId: s.studentId
            }))
        });
    } catch (error) {
        console.error('Get session summary error:', error);
        res.status(500).json({ error: error.message });
    }
}



async function checkEnrollment(studentId, courseId) {
    const enrollmentSnap = await db.collection('enrollments')
        .where('studentId', '==', studentId)
        .where('courseId', '==', courseId)
        .where('status', '==', 'ACTIVE')
        .limit(1)
        .get();
    return !enrollmentSnap.empty;
}

function checkTimeWindow(session) {
    if (!session.startTime && !session.endTime) return true;

    const now = new Date();

    if (session.startTime && session.endTime) {
        const start = new Date(session.startTime);
        const end = new Date(session.endTime);
        return now >= start && now <= end;
    }

    if (session.startTime) {
        const start = new Date(session.startTime);
        const twoHoursLater = new Date(start.getTime() + 2 * 60 * 60 * 1000);
        return now >= start && now <= twoHoursLater;
    }

    return true;
}

async function logViolation(studentId, type, metadata) {
    await db.collection('violations').add({
        studentId,
        type,
        metadata,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log(`Violation logged: ${type} for student ${studentId}`);
}

module.exports = {
    joinSession,
    getNearbySessions,
    getAttendanceHistory,
    getSessionSummary
};
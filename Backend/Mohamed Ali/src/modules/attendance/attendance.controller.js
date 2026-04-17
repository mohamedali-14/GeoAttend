const { db } = require("../../config/firebase");
const { generateGeohash, calculateDistance, getGeohashQueryBounds } = require('../../config/geofire');
async function markAttendance(req, res) {
    try {
        const { sessionId } = req.params;
        const { studentId, location, method = 'QR' } = req.body;
        const requestingUser = req.user;

        if (requestingUser.role === 'STUDENT' && requestingUser.uid !== studentId) {
            return res.status(403).json({ error: 'You can only mark your own attendance' });
        }

        const sessionDoc = await db.collection('sessions').doc(sessionId).get();
        if (!sessionDoc.exists) return res.status(404).json({ error: 'Session not found' });

        const session = sessionDoc.data();
        if (session.status !== 'ACTIVE') return res.status(400).json({ error: 'Session is not active' });

        const existing = await db.collection('attendance')
            .where('sessionId', '==', sessionId)
            .where('studentId', '==', studentId)
            .limit(1)
            .get();

        if (!existing.empty) return res.status(400).json({ error: 'Attendance already marked' });

        const enrollment = await db.collection('enrollments')
            .where('courseId', '==', session.courseId)
            .where('studentId', '==', studentId)
            .where('status', '==', 'ACTIVE')
            .limit(1)
            .get();

        if (enrollment.empty) return res.status(403).json({ error: 'Student not enrolled in this course' });

        let locationVerified = false;
        let distance = null;
        
        if (location && session.location) {
            distance = 0;
            locationVerified = distance <= (session.radius || 50);
        }

        const attendanceData = {
            sessionId,
            studentId,
            studentName: requestingUser.fullName || '',
            courseId: session.courseId,
            courseName: session.courseName,
            method,
            location,
            locationVerified,
            distance,
            timestamp: new Date(),
            markedAt: new Date()
        };

        const attendanceRef = await db.collection('attendance').add(attendanceData);
        res.status(201).json({ message: 'Attendance marked successfully', attendance: { id: attendanceRef.id, ...attendanceData } });
    } catch (error) {
        console.error('Mark attendance error:', error);
        res.status(500).json({ error: error.message });
    }
}

async function getLiveAttendance(req, res) {
    try {
        const { sessionId } = req.params;
        const attendanceSnap = await db.collection('attendance')
            .where('sessionId', '==', sessionId)
            .orderBy('timestamp', 'desc')
            .get();

        const students = attendanceSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json({ attendance: students, count: students.length });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function getAttendanceReport(req, res) {
    try {
        const { sessionId } = req.params;
        const sessionDoc = await db.collection('sessions').doc(sessionId).get();
        if (!sessionDoc.exists) return res.status(404).json({ error: 'Session not found' });

        const session = sessionDoc.data();
        
        const enrollmentsSnap = await db.collection('enrollments')
            .where('courseId', '==', session.courseId)
            .where('status', '==', 'ACTIVE')
            .get();

        const enrolledStudents = enrollmentsSnap.docs.map(doc => doc.data().studentId);
        
        const attendanceSnap = await db.collection('attendance')
            .where('sessionId', '==', sessionId)
            .get();

        const presentStudents = attendanceSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const presentIds = presentStudents.map(s => s.studentId);
        const absentStudents = enrolledStudents.filter(id => !presentIds.includes(id));

        res.json({
            sessionId,
            courseName: session.courseName,
            title: session.title,
            date: session.scheduledDate,
            totalEnrolled: enrolledStudents.length,
            present: presentStudents.length,
            absent: absentStudents.length,
            presentStudents,
            absentStudents
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function randomCheck(req, res) {
    try {
        const { sessionId } = req.params;
        const professorId = req.user.uid;

        const sessionDoc = await db.collection('sessions').doc(sessionId).get();
        if (!sessionDoc.exists) return res.status(404).json({ error: 'Session not found' });

        if (sessionDoc.data().professorId !== professorId) return res.status(403).json({ error: 'Not authorized' });

        await db.collection('sessions').doc(sessionId).update({ randomCheck: true, randomCheckTime: new Date() });
        res.json({ message: "Random attendance check triggered" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

function validateLocationProximity(studentLat, studentLng, sessionLat, sessionLng, maxDistanceMeters = 50) {
    if (!studentLat || !studentLng || !sessionLat || !sessionLng) {
        return { isValid: true, distance: null, message: 'Location validation not available' };
    }
    
    const distance = calculateDistance(studentLat, studentLng, sessionLat, sessionLng);
    const isValid = distance <= maxDistanceMeters;
    
    return {
        isValid,
        distance: Math.round(distance),
        maxDistance: maxDistanceMeters,
        message: isValid ? 'Within allowed range' : `Too far (${Math.round(distance)}m > ${maxDistanceMeters}m)`
    };
}

module.exports = { markAttendance, getLiveAttendance, getAttendanceReport, randomCheck };
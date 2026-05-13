
const { db, admin } = require('../../config/firebase');
const { generateGeohash, calculateDistance, getGeohashQueryBounds } = require('../../config/geofire');
const { uploadAttendanceSelfie, isSelfieRequiredForSession } = require('../utils/selfieUpload');

// ============ ORIGINAL FUNCTIONS (from teammate) ============

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

        // Check if selfie is required for this session
        const requireSelfie = session.verificationSettings?.requireSelfie || false;

        const isEnrolled = await checkEnrollment(studentId, session.courseId);
        if (!isEnrolled) {
            return res.status(403).json({ error: 'You are not enrolled in this course' });
        }

        const existingAttendance = await db.collection('attendance')
            .where('sessionId', '==', sessionId)
            .where('studentId', '==', studentId)
            .limit(1)
            .get();

        if (!existingAttendance.empty) {
            return res.status(400).json({ error: 'Attendance already marked for this session' });
        }

        // GPS Verification
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

        if (!isWithinRange) {
            return res.status(400).json({ error: 'You are outside the allowed location range' });
        }

        // Selfie Verification (if required)
        let selfieResult = null;
        let attendanceStatus = 'PRESENT';
        let verificationMethod = 'GPS';

        if (requireSelfie) {
            const { selfieBase64 } = req.body;
            if (!selfieBase64) {
                return res.status(400).json({ error: 'Selfie photo is required for this session' });
            }

            // Convert base64 to buffer
            let selfieBuffer;
            let selfieMimeType = 'image/jpeg';
            const matches = selfieBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
            if (matches && matches.length === 3) {
                selfieMimeType = matches[1];
                selfieBuffer = Buffer.from(matches[2], 'base64');
            } else {
                selfieBuffer = Buffer.from(selfieBase64, 'base64');
            }

            selfieResult = await uploadAttendanceSelfie(sessionId, studentId, selfieBuffer, selfieMimeType);
            verificationMethod = 'SELFIE_PENDING';
            attendanceStatus = 'PENDING_VERIFICATION';
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
            status: attendanceStatus,
            verificationMethod,
            selfieId: selfieResult?.id || null
        };

        const attendanceRef = await db.collection('attendance').add(attendanceData);

        await db.collection('sessions').doc(sessionId).update({
            studentsPresent: admin.firestore.FieldValue.increment(1)
        });

        res.status(201).json({
            message: requireSelfie ? 'Attendance recorded - pending selfie verification' : 'Attendance marked successfully',
            attendance: { id: attendanceRef.id, ...attendanceData, timestamp: new Date() },
            distance,
            allowedRadius: session.radius || defaultRadius,
            isWithinRange,
            requiresVerification: requireSelfie,
            selfieId: selfieResult?.id
        });
    } catch (error) {
        console.error('Join session error:', error);
        res.status(500).json({ error: error.message });
    }
}

// ============ YOUR FUNCTIONS (from your attendance.controller.js) ============

/**
 * Mark attendance for a student (your version - can be used as alternative endpoint)
 * @param {string} sessionId - Session ID
 * @param {string} studentId - Student ID
 * @param {Object} options - Options including location and selfie
 * @returns {Promise<Object>}
 */
async function markAttendance(sessionId, studentId, options = {}) {
    try {
        const { location, selfieBuffer, selfieMimeType } = options;
        
        const sessionDoc = await db.collection('sessions').doc(sessionId).get();
        if (!sessionDoc.exists) throw new Error('Session not found');
        const session = sessionDoc.data();
        
        if (session.status !== 'ACTIVE') throw new Error('Session is not active');
        
        const enrollmentCheck = await db.collection('enrollments')
            .where('courseId', '==', session.courseId)
            .where('studentId', '==', studentId)
            .where('status', '==', 'ACTIVE')
            .limit(1).get();
        
        if (enrollmentCheck.empty) throw new Error('You are not enrolled in this course');
        
        const existingAttendance = await db.collection('attendance')
            .where('sessionId', '==', sessionId)
            .where('studentId', '==', studentId)
            .limit(1).get();
        
        if (!existingAttendance.empty) throw new Error('Attendance already marked');
        
        const requireGps = session.verificationSettings?.requireGps !== false;
        let gpsValid = true;
        
        if (requireGps && location) {
            gpsValid = await verifyGpsLocation(session, location);
            if (!gpsValid) throw new Error('You are not within the session location');
        }
        
        const requireSelfie = session.verificationSettings?.requireSelfie || false;
        let selfieResult = null;
        
        if (requireSelfie) {
            if (!selfieBuffer) throw new Error('Selfie photo is required for this session');
            selfieResult = await uploadAttendanceSelfie(sessionId, studentId, selfieBuffer, selfieMimeType || 'image/jpeg');
        }
        
        let attendanceStatus = 'PRESENT';
        let verificationMethod = 'GPS_ONLY';
        
        if (requireSelfie) {
            verificationMethod = 'SELFIE_PENDING';
            attendanceStatus = 'PENDING_VERIFICATION';
        } else if (requireGps) {
            verificationMethod = 'GPS';
        }
        
        const attendanceRef = await db.collection('attendance').add({
            sessionId, studentId, courseId: session.courseId, courseName: session.courseName,
            markedAt: admin.firestore.FieldValue.serverTimestamp(),
            verificationMethod, status: attendanceStatus, locationVerified: gpsValid,
            selfieId: selfieResult?.id || null, ipAddress: options.ipAddress || null
        });
        
        return { success: true, attendanceId: attendanceRef.id, requiresVerification: requireSelfie, selfieId: selfieResult?.id, status: attendanceStatus };
    } catch (error) {
        console.error('Error marking attendance:', error);
        throw error;
    }
}

async function verifyGpsLocation(session, studentLocation) {
    if (!session.location || !studentLocation) return false;
    const R = 6371e3;
    const φ1 = session.location.lat * Math.PI / 180;
    const φ2 = studentLocation.lat * Math.PI / 180;
    const Δφ = (studentLocation.lat - session.location.lat) * Math.PI / 180;
    const Δλ = (studentLocation.lng - session.location.lng) * Math.PI / 180;
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    return distance <= (session.radius || 50);
}

// ============ EXISTING FUNCTIONS (keep from teammate) ============

async function getNearbySessions(req, res) {
    try {
        const { lat, lng, radius = 100 } = req.query;
        const studentId = req.user.uid;
        if (!lat || !lng) return res.status(400).json({ error: 'Latitude and longitude are required' });

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
                if (!session.location?.lat || !session.location?.lng) continue;
                const distance = calculateDistance(parseFloat(lat), parseFloat(lng), session.location.lat, session.location.lng);
                if (distance <= radiusInM) {
                    const isEnrolled = await checkEnrollment(studentId, session.courseId);
                    if (isEnrolled) sessions.push({ ...session, distance: Math.round(distance) });
                }
            }
        }
        const uniqueSessions = Array.from(new Map(sessions.map(s => [s.id, s])).values());
        res.json({ sessions: uniqueSessions, count: uniqueSessions.length });
    } catch (error) {
        console.error('Get nearby sessions error:', error);
        res.status(500).json({ error: error.message });
    }
}

async function getAttendanceHistory(req, res) {
    try {
        const { courseId, limit = 20, startAfter, semester, year } = req.query;
        const studentId = req.user.uid;
        let query = db.collection('attendance').where('studentId', '==', studentId).orderBy('timestamp', 'desc');
        if (courseId) query = query.where('courseId', '==', courseId);
        if (semester) query = query.where('semester', '==', semester);
        if (year) query = query.where('year', '==', parseInt(year));
        query = query.limit(parseInt(limit));
        if (startAfter) {
            const startDoc = await db.collection('attendance').doc(startAfter).get();
            if (startDoc.exists) query = query.startAfter(startDoc);
        }
        const snapshot = await query.get();
        const attendance = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), timestamp: doc.data().timestamp?.toDate() }));
        const lastDoc = snapshot.docs[snapshot.docs.length - 1];
        res.json({ attendance, pagination: { limit: parseInt(limit), nextCursor: lastDoc ? lastDoc.id : null, hasMore: attendance.length === parseInt(limit) } });
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
        if (!sessionDoc.exists) return res.status(404).json({ error: 'Session not found' });
        const session = sessionDoc.data();

        if (session.professorId !== professorId && userRole !== 'ADMIN') {
            return res.status(403).json({ error: 'Access denied' });
        }

        const enrollmentsSnap = await db.collection('enrollments')
            .where('courseId', '==', session.courseId)
            .where('status', '==', 'ACTIVE')
            .get();

        const enrolledStudents = [];
        for (const doc of enrollmentsSnap.docs) {
            const studentDoc = await db.collection('users').doc(doc.data().studentId).get();
            if (studentDoc.exists) enrolledStudents.push({ id: studentDoc.id, ...studentDoc.data() });
        }

        const attendanceSnap = await db.collection('attendance')
            .where('sessionId', '==', sessionId)
            .get();

        const presentStudents = attendanceSnap.docs.map(doc => ({ id: doc.id, ...doc.data(), timestamp: doc.data().timestamp?.toDate() }));
        const presentIds = new Set(presentStudents.map(s => s.studentId));

        res.json({
            session: { id: sessionId, title: session.title, courseName: session.courseName, status: session.status },
            statistics: {
                totalEnrolled: enrolledStudents.length,
                totalPresent: presentStudents.length,
                totalAbsent: enrolledStudents.length - presentStudents.length,
                attendancePercentage: enrolledStudents.length > 0 ? Math.round((presentStudents.length / enrolledStudents.length) * 100) : 0
            },
            presentStudents: presentStudents.map(s => ({ id: s.studentId, name: s.studentName, timestamp: s.timestamp, distance: s.distance, method: s.method })),
            absentStudents: enrolledStudents.filter(s => !presentIds.has(s.id)).map(s => ({ id: s.id, name: s.fullName, email: s.email }))
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
        .limit(1).get();
    return !enrollmentSnap.empty;
}

module.exports = {
    joinSession,
    markAttendance,
    getNearbySessions,
    getAttendanceHistory,
    getSessionSummary
};
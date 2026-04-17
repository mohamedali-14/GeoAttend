const { db, admin } = require('../../config/firebase');
const { generateGeohash } = require('../../config/geofire');
const { notifyStudentsSessionStarted } = require('../../services/notification.service');
const QRCode = require('qrcode');
const crypto = require('crypto');

async function createSession(req, res) {
    try {
        const professorId = req.user.uid;
        const { courseId, title, scheduledDate, startTime, endTime, location, radius = 50 } = req.body;

        const courseDoc = await db.collection('courses').doc(courseId).get();
        if (!courseDoc.exists || courseDoc.data().professorId !== professorId) {
            return res.status(403).json({ error: 'Not authorized for this course' });
        }

        const sessionCode = crypto.randomBytes(8).toString('hex').toUpperCase();
        const qrData = JSON.stringify({ sessionCode, courseId, professorId, type: 'ATTENDANCE' });
        const qrCodeUrl = await QRCode.toDataURL(qrData);

        const geohash = location ? generateGeohash(location.lat, location.lng) : null;

        const sessionData = {
            courseId,
            courseName: courseDoc.data().name,
            professorId,
            professorName: req.user.fullName,
            title: title || `Lecture - ${courseDoc.data().name}`,
            sessionCode,
            qrCodeUrl,
            scheduledDate,
            startTime,
            endTime,
            location,
            geohash,
            radius,
            status: "SCHEDULED",
            studentsPresent: 0,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const sessionRef = await db.collection('sessions').add(sessionData);
        
        res.status(201).json({
            message: "Session created",
            session: { id: sessionRef.id, ...sessionData }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function startSession(req, res) {
    try {
        const { sessionId } = req.params;
        const professorId = req.user.uid;

        const sessionRef = db.collection('sessions').doc(sessionId);
        const sessionDoc = await sessionRef.get();

        if (!sessionDoc.exists) {
            return res.status(404).json({ error: 'Session not found' });
        }

        const sessionData = sessionDoc.data();

        if (sessionData.professorId !== professorId) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        await sessionRef.update({
            status: 'ACTIVE',
            actualStartTime: new Date(),
            updatedAt: new Date()
        });

        // Send push notifications to all enrolled students
        const updatedSession = { id: sessionId, ...sessionData, status: 'ACTIVE' };
        await notifyStudentsSessionStarted(updatedSession);

        res.json({
            message: 'Session started - notifications sent to students',
            session: { id: sessionId, status: 'ACTIVE' }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function pauseSession(req, res) {
    try {
        const { sessionId } = req.params;
        const professorId = req.user.uid;

        const sessionRef = db.collection('sessions').doc(sessionId);
        const sessionDoc = await sessionRef.get();

        if (!sessionDoc.exists) {
            return res.status(404).json({ error: 'Session not found' });
        }

        if (sessionDoc.data().professorId !== professorId) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        await sessionRef.update({
            status: 'PAUSED',
            updatedAt: new Date()
        });

        res.json({ message: 'Session paused' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function resumeSession(req, res) {
    try {
        const { sessionId } = req.params;
        const professorId = req.user.uid;

        const sessionRef = db.collection('sessions').doc(sessionId);
        const sessionDoc = await sessionRef.get();

        if (!sessionDoc.exists) {
            return res.status(404).json({ error: 'Session not found' });
        }

        if (sessionDoc.data().professorId !== professorId) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        await sessionRef.update({
            status: 'ACTIVE',
            updatedAt: new Date()
        });

        res.json({ message: 'Session resumed' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function endSession(req, res) {
    try {
        const { sessionId } = req.params;
        const professorId = req.user.uid;

        const sessionRef = db.collection('sessions').doc(sessionId);
        const sessionDoc = await sessionRef.get();

        if (!sessionDoc.exists) {
            return res.status(404).json({ error: 'Session not found' });
        }

        if (sessionDoc.data().professorId !== professorId) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        await sessionRef.update({
            status: 'ENDED',
            actualEndTime: new Date(),
            updatedAt: new Date()
        });

        res.json({ message: 'Session ended' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function getSession(req, res) {
    try {
        const { sessionId } = req.params;
        const sessionDoc = await db.collection('sessions').doc(sessionId).get();
        
        if (!sessionDoc.exists) {
            return res.status(404).json({ error: 'Session not found' });
        }
        
        res.json({ id: sessionDoc.id, ...sessionDoc.data() });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function getSessions(req, res) {
    try {
        const { courseId, professorId, status } = req.query;
        let query = db.collection('sessions');
        
        if (courseId) query = query.where('courseId', '==', courseId);
        if (professorId) query = query.where('professorId', '==', professorId);
        if (status) query = query.where('status', '==', status);
        
        const snapshot = await query.orderBy('createdAt', 'desc').get();
        const sessions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        res.json(sessions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

module.exports = {
    createSession,
    startSession,
    pauseSession,
    resumeSession,
    endSession,
    getSession,
    getSessions
};
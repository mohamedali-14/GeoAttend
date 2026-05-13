
const { db, admin } = require('../../config/firebase');
const { generateGeohash } = require('../../config/geofire');
const { notifyStudentsSessionStarted } = require('../../services/notification.service');
const QRCode = require('qrcode');
const crypto = require('crypto');

// ============ YOUR FUNCTIONS (verification settings) ============

/**
 * Create a new session with verification settings (YOUR ENHANCED VERSION)
 * @param {Object} sessionData - Session data
 * @returns {Promise<string>} - Session ID
 */
async function createSessionWithSettings(sessionData) {
    try {
        const {
            title,
            courseId,
            professorId,
            professorName,
            scheduledDate,
            location,
            radius = 50,
            verificationSettings = {
                requireGps: true,
                requireSelfie: false,
                requireQrCode: false,
                requireRandomCheck: false,
                selfieOptions: {
                    allowRetakes: true,
                    submissionTimeoutMinutes: 2,
                    requireLivePhoto: true
                }
            }
        } = sessionData;
        
        const courseDoc = await db.collection('courses').doc(courseId).get();
        if (!courseDoc.exists) throw new Error('Course not found');
        if (courseDoc.data().professorId !== professorId) {
            throw new Error('You are not authorized to create sessions for this course');
        }
        
        // Generate QR code for session
        const sessionCode = crypto.randomBytes(8).toString('hex').toUpperCase();
        const qrData = JSON.stringify({ sessionCode, courseId, professorId, type: 'ATTENDANCE' });
        const qrCodeUrl = await QRCode.toDataURL(qrData);
        
        const geohash = location ? generateGeohash(location.lat, location.lng) : null;
        
        const sessionRef = await db.collection('sessions').add({
            title,
            courseId,
            courseName: courseDoc.data().name,
            professorId,
            professorName,
            scheduledDate: scheduledDate ? admin.firestore.Timestamp.fromDate(new Date(scheduledDate)) : null,
            location,
            geohash,
            radius,
            verificationSettings,
            sessionCode,
            qrCodeUrl,
            status: 'SCHEDULED',
            studentsPresent: 0,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`Session created: ${sessionRef.id} with selfie required: ${verificationSettings.requireSelfie}`);
        return sessionRef.id;
    } catch (error) {
        console.error('Error creating session:', error);
        throw error;
    }
}

/**
 * Update session verification settings
 * @param {string} sessionId - Session ID
 * @param {string} professorId - Professor ID for authorization
 * @param {Object} updates - Updated settings
 */
async function updateSessionVerificationSettings(sessionId, professorId, updates) {
    try {
        const sessionDoc = await db.collection('sessions').doc(sessionId).get();
        if (!sessionDoc.exists) throw new Error('Session not found');
        if (sessionDoc.data().professorId !== professorId) {
            throw new Error('You do not have permission to update this session');
        }
        const currentSettings = sessionDoc.data().verificationSettings || {};
        await db.collection('sessions').doc(sessionId).update({
            verificationSettings: { ...currentSettings, ...updates },
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`Session ${sessionId} verification settings updated`);
    } catch (error) {
        console.error('Error updating session settings:', error);
        throw error;
    }
}

/**
 * Get session details including verification settings
 */
async function getSessionWithSettings(sessionId) {
    try {
        const sessionDoc = await db.collection('sessions').doc(sessionId).get();
        if (!sessionDoc.exists) throw new Error('Session not found');
        return { id: sessionDoc.id, ...sessionDoc.data() };
    } catch (error) {
        console.error('Error getting session:', error);
        throw error;
    }
}

// ============ ORIGINAL FUNCTIONS (keep from teammate) ============

async function createSession(req, res) {
    try {
        const professorId = req.user.uid;
        const { courseId, title, scheduledDate, startTime, endTime, location, radiusMeters, radius = 50, geoEnabled, randomCheckEnabled, selfieEnabled } = req.body;

        // Try to get course - but don't block if it doesn't exist (allows local course IDs too)
        let courseName = title || "Lecture";
        let effectiveProfId = professorId;
        try {
            const courseDoc = await db.collection('courses').doc(courseId).get();
            if (courseDoc.exists) {
                const courseData = courseDoc.data();
                courseName = courseData.name || courseName;
                // Accept both professorId and doctorId in the course document
                const courseOwner = courseData.professorId || courseData.doctorId;
                if (courseOwner && courseOwner !== professorId) {
                    return res.status(403).json({ error: 'Not authorized for this course' });
                }
            }
        } catch (e) {
            console.warn('[session] Could not verify course:', e.message);
        }

        const sessionCode = Math.random().toString(36).slice(2, 8).toUpperCase();
        const effectiveRadius = radiusMeters || radius;

        const sessionData = {
            courseId,
            courseName,
            professorId: effectiveProfId,
            doctorId: effectiveProfId,
            professorName: req.user.fullName || req.user.email || "",
            title: title || `Lecture - ${courseName}`,
            sessionCode,
            location: location || null,
            radius: effectiveRadius,
            radiusMeters: effectiveRadius,
            geoEnabled: geoEnabled || false,
            randomCheckEnabled: randomCheckEnabled || false,
            selfieEnabled: selfieEnabled || false,
            status: "ACTIVE", // Force active on creation for the demo
            isActive: true,
            studentsPresent: 0,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        let sessionId = "MOCK_" + Date.now();
        try {
            const sessionRef = await db.collection('sessions').add(sessionData);
            sessionId = sessionRef.id;
        } catch (dbErr) {
            console.warn('[createSession] Firestore failed, using in-memory mock session:', dbErr.message);
            if (!global.MOCK_SESSIONS) global.MOCK_SESSIONS = [];
            global.MOCK_SESSIONS.push({ id: sessionId, ...sessionData });
        }

        res.status(201).json({ message: "Session created", session: { id: sessionId, ...sessionData }, sessionId: sessionId, id: sessionId });
    } catch (error) {
        console.error('[createSession] error:', error.message);
        res.status(500).json({ error: error.message });
    }
}

async function startSession(req, res) {
    try {
        const { sessionId } = req.params;
        const professorId = req.user.uid;
        const sessionRef = db.collection('sessions').doc(sessionId);
        const sessionDoc = await sessionRef.get();
        if (!sessionDoc.exists) return res.status(404).json({ error: 'Session not found' });
        const sessionData = sessionDoc.data();
        // Accept both professorId and doctorId fields
        const sessionOwner = sessionData.professorId || sessionData.doctorId;
        if (sessionOwner && sessionOwner !== professorId) return res.status(403).json({ error: 'Not authorized' });
        await sessionRef.update({ status: 'ACTIVE', actualStartTime: new Date(), updatedAt: new Date() });
        const updatedSession = { id: sessionId, ...sessionData, status: 'ACTIVE' };
        await notifyStudentsSessionStarted(updatedSession);
        res.json({ message: 'Session started - notifications sent to students', session: { id: sessionId, status: 'ACTIVE' } });
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
        if (!sessionDoc.exists) return res.status(404).json({ error: 'Session not found' });
        if (sessionDoc.data().professorId !== professorId) return res.status(403).json({ error: 'Not authorized' });
        await sessionRef.update({ status: 'PAUSED', updatedAt: new Date() });
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
        if (!sessionDoc.exists) return res.status(404).json({ error: 'Session not found' });
        if (sessionDoc.data().professorId !== professorId) return res.status(403).json({ error: 'Not authorized' });
        await sessionRef.update({ status: 'ACTIVE', updatedAt: new Date() });
        res.json({ message: 'Session resumed' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function endSession(req, res) {
    try {
        const { sessionId } = req.params;
        const professorId = req.user.uid;

        // Handle in-memory mock sessions
        if (sessionId.startsWith("MOCK_") && global.MOCK_SESSIONS) {
            const idx = global.MOCK_SESSIONS.findIndex(s => s.id === sessionId);
            if (idx >= 0) {
                global.MOCK_SESSIONS[idx].status = 'ENDED';
                global.MOCK_SESSIONS[idx].isActive = false;
                global.MOCK_SESSIONS[idx].actualEndTime = new Date();
                return res.json({ message: 'Session ended (mock)' });
            }
        }

        const sessionRef = db.collection('sessions').doc(sessionId);

        // Try to write DIRECTLY to Firestore
        try {
            await sessionRef.update({
                status: 'ENDED',
                isActive: false,
                actualEndTime: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            console.log(`[endSession] Session ${sessionId} successfully ended in Firestore`);
            return res.json({ message: 'Session ended', savedToDb: true });
        } catch (writeErr) {
            const code = writeErr.code || writeErr.message;
            console.error(`[endSession] Firestore write failed:`, writeErr);
            if (code === 5 || String(code).includes('NOT_FOUND')) {
                return res.status(404).json({ error: 'Session not found in database' });
            }
            // If it fails for another reason, RETURN 500 SO FRONTEND KNOWS!
            return res.status(500).json({ error: `Failed to update database: ${writeErr.message}` });
        }
    } catch (error) {
        console.error('[endSession] Fatal error:', error);
        res.status(500).json({ error: error.message });
    }
}

async function getSession(req, res) {
    try {
        const { sessionId } = req.params;
        if (sessionId.startsWith("MOCK_") && global.MOCK_SESSIONS) {
            const sess = global.MOCK_SESSIONS.find(s => s.id === sessionId);
            if (sess) return res.json(sess);
        }
        const sessionDoc = await db.collection('sessions').doc(sessionId).get();
        if (!sessionDoc.exists) return res.status(404).json({ error: 'Session not found' });
        res.json({ id: sessionDoc.id, ...sessionDoc.data() });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function getSessions(req, res) {
    try {
        const { courseId, professorId, status } = req.query;
        let sessions = [];
        
        try {
            let query = db.collection('sessions');
            if (courseId) query = query.where('courseId', '==', courseId);
            if (professorId) query = query.where('professorId', '==', professorId);
            if (status) query = query.where('status', '==', status);
            const snapshot = await query.get();
            sessions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // Sort in memory to avoid needing composite indexes in Firestore
            sessions.sort((a, b) => {
                const aTime = a.createdAt?.toMillis?.() || new Date(a.createdAt).getTime() || 0;
                const bTime = b.createdAt?.toMillis?.() || new Date(b.createdAt).getTime() || 0;
                return bTime - aTime;
            });
        } catch (dbErr) {
            console.warn('[getSessions] Firestore query failed:', dbErr.message);
        }

        // Merge with in-memory sessions
        if (global.MOCK_SESSIONS) {
            let mockSessions = [...global.MOCK_SESSIONS];
            if (courseId) mockSessions = mockSessions.filter(s => s.courseId === courseId);
            if (professorId) mockSessions = mockSessions.filter(s => s.professorId === professorId);
            if (status) mockSessions = mockSessions.filter(s => s.status === status);
            sessions = [...mockSessions, ...sessions];
        }

        res.json(sessions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }

}
// Add these functions to your existing session.controller.js

/**
 * Create a new session with verification settings (YOUR ENHANCED VERSION)
 */
async function createSessionWithSettings(sessionData) {
    try {
        const {
            title,
            courseId,
            professorId,
            professorName,
            scheduledDate,
            location,
            radius = 50,
            verificationSettings = {
                requireGps: true,
                requireSelfie: false,
                requireQrCode: false,
                requireRandomCheck: false,
                selfieOptions: {
                    allowRetakes: true,
                    submissionTimeoutMinutes: 2,
                    requireLivePhoto: true
                }
            }
        } = sessionData;
        
        const courseDoc = await db.collection('courses').doc(courseId).get();
        if (!courseDoc.exists) throw new Error('Course not found');
        if (courseDoc.data().professorId !== professorId) {
            throw new Error('You are not authorized to create sessions for this course');
        }
        
        const sessionCode = crypto.randomBytes(8).toString('hex').toUpperCase();
        const qrData = JSON.stringify({ sessionCode, courseId, professorId, type: 'ATTENDANCE' });
        const qrCodeUrl = await QRCode.toDataURL(qrData);
        
        const geohash = location ? generateGeohash(location.lat, location.lng) : null;
        
        const sessionRef = await db.collection('sessions').add({
            title,
            courseId,
            courseName: courseDoc.data().name,
            professorId,
            professorName,
            scheduledDate: scheduledDate ? admin.firestore.Timestamp.fromDate(new Date(scheduledDate)) : null,
            location,
            geohash,
            radius,
            verificationSettings,
            sessionCode,
            qrCodeUrl,
            status: 'SCHEDULED',
            studentsPresent: 0,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`Session created: ${sessionRef.id} with selfie required: ${verificationSettings.requireSelfie}`);
        return sessionRef.id;
    } catch (error) {
        console.error('Error creating session:', error);
        throw error;
    }
}

/**
 * Update session verification settings
 */
async function updateSessionVerificationSettings(sessionId, professorId, updates) {
    try {
        const sessionDoc = await db.collection('sessions').doc(sessionId).get();
        if (!sessionDoc.exists) throw new Error('Session not found');
        if (sessionDoc.data().professorId !== professorId) {
            throw new Error('You do not have permission to update this session');
        }
        const currentSettings = sessionDoc.data().verificationSettings || {};
        await db.collection('sessions').doc(sessionId).update({
            verificationSettings: { ...currentSettings, ...updates },
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`Session ${sessionId} verification settings updated`);
    } catch (error) {
        console.error('Error updating session settings:', error);
        throw error;
    }
}

/**
 * Get session details including verification settings
 */
async function getSessionWithSettings(sessionId) {
    try {
        const sessionDoc = await db.collection('sessions').doc(sessionId).get();
        if (!sessionDoc.exists) throw new Error('Session not found');
        return { id: sessionDoc.id, ...sessionDoc.data() };
    } catch (error) {
        console.error('Error getting session:', error);
        throw error;
    }
}
// Add this function to session.controller.js

async function createSessionWithSettings(sessionData) {
    try {
        const {
            title,
            courseId,
            professorId,
            professorName,
            scheduledDate,
            location,
            radius = 50,
            verificationSettings = {
                requireGps: true,
                requireSelfie: false,
                requireQrCode: false,
                requireRandomCheck: false,
                selfieOptions: {
                    allowRetakes: true,
                    submissionTimeoutMinutes: 2,
                    requireLivePhoto: true
                }
            }
        } = sessionData;
        
        const courseDoc = await db.collection('courses').doc(courseId).get();
        if (!courseDoc.exists) throw new Error('Course not found');
        if (courseDoc.data().professorId !== professorId) {
            throw new Error('You are not authorized to create sessions for this course');
        }
        
        const sessionCode = crypto.randomBytes(8).toString('hex').toUpperCase();
        const qrData = JSON.stringify({ sessionCode, courseId, professorId, type: 'ATTENDANCE' });
        const qrCodeUrl = await QRCode.toDataURL(qrData);
        
        const geohash = location ? generateGeohash(location.lat, location.lng) : null;
        
        const sessionRef = await db.collection('sessions').add({
            title,
            courseId,
            courseName: courseDoc.data().name,
            professorId,
            professorName,
            scheduledDate: scheduledDate ? admin.firestore.Timestamp.fromDate(new Date(scheduledDate)) : null,
            location,
            geohash,
            radius,
            verificationSettings,
            sessionCode,
            qrCodeUrl,
            status: 'SCHEDULED',
            studentsPresent: 0,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`Session created: ${sessionRef.id} with selfie required: ${verificationSettings.requireSelfie}`);
        return sessionRef.id;
    } catch (error) {
        console.error('Error creating session:', error);
        throw error;
    }
}

// Also add getSessionWithSettings function
async function getSessionWithSettings(sessionId) {
    try {
        const sessionDoc = await db.collection('sessions').doc(sessionId).get();
        if (!sessionDoc.exists) throw new Error('Session not found');
        return { id: sessionDoc.id, ...sessionDoc.data() };
    } catch (error) {
        console.error('Error getting session:', error);
        throw error;
    }
}

// Update module.exports to include these
module.exports = {
    createSession,
    createSessionWithSettings,  // ← ADD THIS
    updateSessionVerificationSettings,
    getSessionWithSettings,      // ← ADD THIS
    getSession,
    getSessions,
    startSession,
    pauseSession,
    resumeSession,
    endSession
};


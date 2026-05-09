const { db, admin } = require('../config/firebase');
const { sendToMultipleDevices } = require('../services/notification.service');

/**
 * Generate a random 6-digit verification code
 * @returns {string} 6-digit code
 */
function generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Start a random attendance check for a session
 * @param {string} sessionId - Session ID
 * @param {number} duration - Duration in minutes (default: 2)
 * @returns {Promise<object>} { checkId, verificationCode, expiresAt }
 */
async function startRandomCheck(sessionId, duration = 2) {
    try {
        const verificationCode = generateVerificationCode();
        const expiresAt = new Date(Date.now() + duration * 60 * 1000);
        
        
        const checkRef = await db.collection('randomChecks').add({
            sessionId,
            verificationCode,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
            isActive: true,
            duration
        });
        
        
        const sessionDoc = await db.collection('sessions').doc(sessionId).get();
        if (!sessionDoc.exists) {
            throw new Error('Session not found');
        }
        
        const sessionData = sessionDoc.data();
        
        
        const enrollmentsSnap = await db.collection('enrollments')
            .where('courseId', '==', sessionData.courseId)
            .where('status', '==', 'ACTIVE')
            .get();
        
        const studentIds = enrollmentsSnap.docs.map(doc => doc.data().studentId);
        
        
        const tokens = [];
        for (const studentId of studentIds) {
            const userTokensSnap = await db.collection('users')
                .doc(studentId)
                .collection('fcm_tokens')
                .get();
            
            userTokensSnap.docs.forEach(doc => {
                tokens.push(doc.data().token);
            });
        }
        
        
        if (tokens.length > 0) {
            await sendToMultipleDevices(
                tokens,
                {
                    title: '🔐 Random Attendance Check',
                    body: `A random check has started. Submit the code within ${duration} minutes.`
                },
                {
                    type: 'RANDOM_CHECK',
                    sessionId,
                    checkId: checkRef.id,
                    verificationCode,
                    duration: duration.toString(),
                    expiresAt: expiresAt.toISOString()
                }
            );
        }
        
        // Also update session with random check info
        await db.collection('sessions').doc(sessionId).update({
            randomCheckActive: true,
            randomCheckCode: verificationCode,
            randomCheckExpiresAt: expiresAt,
            randomCheckId: checkRef.id,
            updatedAt: new Date()
        });
        
        console.log(`Random check started for session ${sessionId}, code: ${verificationCode}`);
        
        return {
            checkId: checkRef.id,
            verificationCode,
            expiresAt
        };
    } catch (error) {
        console.error('Error starting random check:', error);
        throw error;
    }
}

/**
 * Verify student's submission for random check
 * @param {string} checkId - Random check ID
 * @param {string} studentId - Student ID
 * @param {string} submittedCode - Code submitted by student
 * @returns {Promise<object>} { valid, reason? }
 */
async function verifyRandomCheck(checkId, studentId, submittedCode) {
    try {
        
        const checkDoc = await db.collection('randomChecks').doc(checkId).get();
        
        if (!checkDoc.exists) {
            return { valid: false, reason: 'Check not found' };
        }
        
        const check = checkDoc.data();
        
        
        if (check.expiresAt.toDate() < new Date()) {
            return { valid: false, reason: 'Check expired' };
        }
        
        
        const existingVerification = await db.collection('randomCheckVerifications')
            .where('checkId', '==', checkId)
            .where('studentId', '==', studentId)
            .limit(1)
            .get();
        
        if (!existingVerification.empty) {
            return { valid: false, reason: 'Already verified' };
        }
        
        
        if (check.verificationCode !== submittedCode) {
            // Log failed attempt
            await logFailedAttempt(checkId, studentId, submittedCode);
            return { valid: false, reason: 'Invalid code' };
        }
        
        
        await db.collection('randomCheckVerifications').add({
            checkId,
            studentId,
            verifiedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        // Also mark attendance for this session with special flag
        const attendanceRef = await db.collection('attendance').add({
            sessionId: check.sessionId,
            studentId,
            verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
            verificationMethod: 'RANDOM_CHECK',
            checkId,
            status: 'PRESENT',
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`Student ${studentId} verified random check ${checkId}`);
        
        return { valid: true, attendanceId: attendanceRef.id };
    } catch (error) {
        console.error('Error verifying random check:', error);
        throw error;
    }
}


async function logFailedAttempt(checkId, studentId, submittedCode) {
    try {
        await db.collection('randomCheckFailures').add({
            checkId,
            studentId,
            submittedCode,
            attemptedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`Failed random check attempt for student ${studentId}`);
    } catch (error) {
        console.error('Error logging failed attempt:', error);
    }
}

/**
 * End random check manually
 * @param {string} checkId - Random check ID
 */
async function endRandomCheck(checkId) {
    try {
        const checkRef = db.collection('randomChecks').doc(checkId);
        const checkDoc = await checkRef.get();
        
        if (!checkDoc.exists) {
            throw new Error('Check not found');
        }
        
        const check = checkDoc.data();
        
        await checkRef.update({
            isActive: false,
            endedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        
        await db.collection('sessions').doc(check.sessionId).update({
            randomCheckActive: false,
            randomCheckEndedAt: new Date(),
            updatedAt: new Date()
        });
        
        console.log(`Random check ${checkId} ended`);
        
        const sessionDoc = await db.collection('sessions').doc(check.sessionId).get();
        if (sessionDoc.exists) {
            const sessionData = sessionDoc.data();
            
            
            const verifiedStudents = await db.collection('randomCheckVerifications')
                .where('checkId', '==', checkId)
                .get();
            
            const verifiedIds = new Set(verifiedStudents.docs.map(doc => doc.data().studentId));
            
            
            const enrollmentsSnap = await db.collection('enrollments')
                .where('courseId', '==', sessionData.courseId)
                .where('status', '==', 'ACTIVE')
                .get();
            
            const missingStudents = enrollmentsSnap.docs
                .map(doc => doc.data().studentId)
                .filter(id => !verifiedIds.has(id));
            
            if (missingStudents.length > 0) {
                console.log(`${missingStudents.length} students missed the random check`);
                
                for (const studentId of missingStudents) {
                    await db.collection('attendance').add({
                        sessionId: check.sessionId,
                        studentId,
                        verificationMethod: 'RANDOM_CHECK_MISSED',
                        checkId,
                        status: 'ABSENT',
                        timestamp: admin.firestore.FieldValue.serverTimestamp(),
                        note: 'Missed random attendance check'
                    });
                }
            }
        }
    } catch (error) {
        console.error('Error ending random check:', error);
        throw error;
    }
}

/**
 * Get random check status for a session
 * @param {string} sessionId - Session ID
 * @returns {Promise<object|null>} Random check status or null
 */
async function getRandomCheckStatus(sessionId) {
    try {
        const checksSnapshot = await db.collection('randomChecks')
            .where('sessionId', '==', sessionId)
            .where('isActive', '==', true)
            .orderBy('createdAt', 'desc')
            .limit(1)
            .get();
        
        if (checksSnapshot.empty) {
            return null;
        }
        
        const check = checksSnapshot.docs[0];
        const checkData = check.data();
        
        return {
            id: check.id,
            isActive: checkData.isActive,
            expiresAt: checkData.expiresAt.toDate(),
            duration: checkData.duration,
            createdAt: checkData.createdAt.toDate()
        };
    } catch (error) {
        console.error('Error getting random check status:', error);
        return null;
    }
}


async function autoExpireRandomChecks() {
    try {
        const now = new Date();
        
        const activeChecks = await db.collection('randomChecks')
            .where('isActive', '==', true)
            .get();
        
        for (const doc of activeChecks.docs) {
            const check = doc.data();
            if (check.expiresAt.toDate() < now) {
                await endRandomCheck(doc.id);
                console.log(`Auto-expired random check ${doc.id}`);
            }
        }
    } catch (error) {
        console.error('Error auto-expiring random checks:', error);
    }
}

module.exports = {
    generateVerificationCode,
    startRandomCheck,
    verifyRandomCheck,
    endRandomCheck,
    getRandomCheckStatus,
    autoExpireRandomChecks
};
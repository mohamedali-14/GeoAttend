const { db, admin } = require('../config/firebase');
const { sendToMultipleDevices } = require('../services/storage/notification.service');

function generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

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
        if (!sessionDoc.exists) throw new Error('Session not found');
        
        const sessionData = sessionDoc.data();
        
        const enrollmentsSnap = await db.collection('enrollments')
            .where('courseId', '==', sessionData.courseId)
            .where('status', '==', 'ACTIVE')
            .get();
        
        const studentIds = enrollmentsSnap.docs.map(doc => doc.data().studentId);
        
        const tokens = [];
        for (const studentId of studentIds) {
            const userTokensSnap = await db.collection('users').doc(studentId).collection('fcm_tokens').get();
            userTokensSnap.docs.forEach(doc => { tokens.push(doc.data().token); });
        }
        
        if (tokens.length > 0) {
            await sendToMultipleDevices(
                tokens,
                { title: '🔐 Random Attendance Check', body: `A random check has started. Submit the code within ${duration} minutes.` },
                { type: 'RANDOM_CHECK', sessionId, checkId: checkRef.id, verificationCode, duration: duration.toString(), expiresAt: expiresAt.toISOString() }
            );
        }
        
        console.log(`Random check started for session ${sessionId}, code: ${verificationCode}`);
        return { checkId: checkRef.id, verificationCode, expiresAt };
    } catch (error) {
        console.error('Error starting random check:', error);
        throw error;
    }
}

async function verifyRandomCheck(checkId, studentId, submittedCode) {
    try {
        const checkDoc = await db.collection('randomChecks').doc(checkId).get();
        if (!checkDoc.exists) return { valid: false, reason: 'Check not found' };
        
        const check = checkDoc.data();
        if (check.expiresAt.toDate() < new Date()) return { valid: false, reason: 'Check expired' };
        
        const existingVerification = await db.collection('randomCheckVerifications')
            .where('checkId', '==', checkId)
            .where('studentId', '==', studentId)
            .limit(1)
            .get();
        
        if (!existingVerification.empty) return { valid: false, reason: 'Already verified' };
        
        if (check.verificationCode !== submittedCode) return { valid: false, reason: 'Invalid code' };
        
        await db.collection('randomCheckVerifications').add({
            checkId,
            studentId,
            verifiedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        await db.collection('attendance').add({
            sessionId: check.sessionId,
            studentId,
            verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
            verificationMethod: 'RANDOM_CHECK',
            checkId
        });
        
        return { valid: true };
    } catch (error) {
        console.error('Error verifying random check:', error);
        throw error;
    }
}

async function endRandomCheck(checkId) {
    try {
        await db.collection('randomChecks').doc(checkId).update({
            isActive: false,
            endedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`Random check ${checkId} ended`);
    } catch (error) {
        console.error('Error ending random check:', error);
        throw error;
    }
}

module.exports = { generateVerificationCode, startRandomCheck, verifyRandomCheck, endRandomCheck };
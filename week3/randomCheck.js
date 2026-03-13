const { db, admin } = require('../config/firebase');
const { sendToMultipleDevices } = require('../services/notification.service');

/**
 * Generate a random verification code
 */
function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Start a random attendance check for a session
 */
async function startRandomCheck(sessionId, duration = 2) {
  try {
    const verificationCode = generateVerificationCode();
    const expiresAt = new Date(Date.now() + duration * 60 * 1000);
    
    // Store the random check in Firestore
    const checkRef = await db.collection('randomChecks').add({
      sessionId,
      verificationCode,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
      isActive: true,
      duration
    });
    
    // Get session details
    const sessionDoc = await db.collection('sessions').doc(sessionId).get();
    if (!sessionDoc.exists) {
      throw new Error('Session not found');
    }
    
    const sessionData = sessionDoc.data();
    
    // Get enrolled students' FCM tokens
    const enrollmentsSnap = await db.collection('enrollments')
      .where('courseId', '==', sessionData.courseId)
      .where('status', '==', 'ACTIVE')
      .get();
    
    const studentIds = enrollmentsSnap.docs.map(doc => doc.data().studentId);
    
    // Get tokens
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
 */
async function verifyRandomCheck(checkId, studentId, submittedCode) {
  try {
    const checkDoc = await db.collection('randomChecks').doc(checkId).get();
    
    if (!checkDoc.exists) {
      return { valid: false, reason: 'Check not found' };
    }
    
    const check = checkDoc.data();
    
    // Check if expired
    if (check.expiresAt.toDate() < new Date()) {
      return { valid: false, reason: 'Check expired' };
    }
    
    // Check if already verified for this student
    const existingVerification = await db.collection('randomCheckVerifications')
      .where('checkId', '==', checkId)
      .where('studentId', '==', studentId)
      .limit(1)
      .get();
    
    if (!existingVerification.empty) {
      return { valid: false, reason: 'Already verified' };
    }
    
    // Verify code
    if (check.verificationCode !== submittedCode) {
      return { valid: false, reason: 'Invalid code' };
    }
    
    // Record verification
    await db.collection('randomCheckVerifications').add({
      checkId,
      studentId,
      verifiedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Also mark attendance for this session with special flag
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

/**
 * End random check manually
 */
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

module.exports = {
  generateVerificationCode,
  startRandomCheck,
  verifyRandomCheck,
  endRandomCheck
};
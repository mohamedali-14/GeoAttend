// src/utils/selfieUpload.js
const { storage, db, admin } = require('../config/firebase');
const { v4: uuidv4 } = require('uuid');

const bucket = storage.bucket();

/**
 * Upload a selfie for attendance verification
 * @param {string} sessionId - The session ID
 * @param {string} studentId - The student ID
 * @param {Buffer} imageBuffer - The image data
 * @param {string} mimeType - The image MIME type
 * @returns {Promise<{id: string, url: string}>}
 */
async function uploadAttendanceSelfie(sessionId, studentId, imageBuffer, mimeType) {
  try {
    // Check if selfie is required for this session
    const sessionDoc = await db.collection('sessions').doc(sessionId).get();
    if (!sessionDoc.exists) {
      throw new Error('Session not found');
    }
    
    const session = sessionDoc.data();
    const requireSelfie = session.verificationSettings?.requireSelfie || false;
    
    if (!requireSelfie) {
      throw new Error('Selfie verification is not required for this session');
    }
    
    const fileName = `selfies/${sessionId}/${studentId}_${uuidv4()}.jpg`;
    const file = bucket.file(fileName);
    
    await file.save(imageBuffer, {
      metadata: {
        contentType: 'image/jpeg',
        metadata: { 
          sessionId, 
          studentId, 
          uploadedAt: new Date().toISOString() 
        }
      }
    });
    
    const [signedUrl] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 365 * 24 * 60 * 60 * 1000
    });
    
    const selfieRef = await db.collection('attendanceSelfies').add({
      sessionId,
      studentId,
      storagePath: fileName,
      publicUrl: signedUrl,
      uploadedAt: admin.firestore.FieldValue.serverTimestamp(),
      verificationStatus: 'PENDING', // PENDING, VERIFIED, REJECTED
      rejectionReason: null
    });
    
    console.log(`Selfie uploaded for student ${studentId} in session ${sessionId}`);
    return { id: selfieRef.id, url: signedUrl };
  } catch (error) {
    console.error('Error uploading selfie:', error);
    throw error;
  }
}

/**
 * Verify a selfie (approve attendance)
 * @param {string} selfieId - The selfie ID
 * @param {string} professorId - The professor verifying
 * @returns {Promise<{success: boolean, attendanceId?: string}>}
 */
async function verifySelfie(selfieId, professorId) {
  try {
    const selfieDoc = await db.collection('attendanceSelfies').doc(selfieId).get();
    if (!selfieDoc.exists) throw new Error('Selfie not found');
    
    const selfie = selfieDoc.data();
    
    // Verify professor has permission for this session
    const sessionDoc = await db.collection('sessions').doc(selfie.sessionId).get();
    if (!sessionDoc.exists) throw new Error('Session not found');
    
    if (sessionDoc.data().professorId !== professorId) {
      throw new Error('You do not have permission to verify this selfie');
    }
    
    await db.collection('attendanceSelfies').doc(selfieId).update({
      verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
      verificationStatus: 'VERIFIED',
      verifiedBy: professorId
    });
    
    // Check if attendance already exists to avoid duplicates
    const existingAttendance = await db.collection('attendance')
      .where('sessionId', '==', selfie.sessionId)
      .where('studentId', '==', selfie.studentId)
      .limit(1)
      .get();
    
    let attendanceId;
    if (existingAttendance.empty) {
      const attendanceRef = await db.collection('attendance').add({
        sessionId: selfie.sessionId,
        studentId: selfie.studentId,
        verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
        verificationMethod: 'SELFIE',
        selfieId: selfieId,
        status: 'PRESENT'
      });
      attendanceId = attendanceRef.id;
    } else {
      attendanceId = existingAttendance.docs[0].id;
      await db.collection('attendance').doc(attendanceId).update({
        verificationMethod: 'SELFIE',
        selfieId: selfieId,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
    
    console.log(`Selfie ${selfieId} verified by professor ${professorId}`);
    return { success: true, attendanceId };
  } catch (error) {
    console.error('Error verifying selfie:', error);
    throw error;
  }
}

/**
 * Reject a selfie (deny attendance)
 * @param {string} selfieId - The selfie ID
 * @param {string} professorId - The professor rejecting
 * @param {string} reason - Reason for rejection
 * @returns {Promise<{success: boolean}>}
 */
async function rejectSelfie(selfieId, professorId, reason) {
  try {
    const selfieDoc = await db.collection('attendanceSelfies').doc(selfieId).get();
    if (!selfieDoc.exists) throw new Error('Selfie not found');
    
    const selfie = selfieDoc.data();
    
    // Verify professor has permission
    const sessionDoc = await db.collection('sessions').doc(selfie.sessionId).get();
    if (sessionDoc.data().professorId !== professorId) {
      throw new Error('You do not have permission to reject this selfie');
    }
    
    await db.collection('attendanceSelfies').doc(selfieId).update({
      rejectedAt: admin.firestore.FieldValue.serverTimestamp(),
      verificationStatus: 'REJECTED',
      rejectionReason: reason,
      rejectedBy: professorId
    });
    
    console.log(`Selfie ${selfieId} rejected by professor ${professorId}: ${reason}`);
    return { success: true };
  } catch (error) {
    console.error('Error rejecting selfie:', error);
    throw error;
  }
}

/**
 * Get selfie by session and student
 * @param {string} sessionId - The session ID
 * @param {string} studentId - The student ID
 * @returns {Promise<Object|null>}
 */
async function getSelfieBySessionAndStudent(sessionId, studentId) {
  try {
    const snapshot = await db.collection('attendanceSelfies')
      .where('sessionId', '==', sessionId)
      .where('studentId', '==', studentId)
      .orderBy('uploadedAt', 'desc')
      .limit(1)
      .get();
    
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  } catch (error) {
    console.error('Error getting selfie:', error);
    throw error;
  }
}

/**
 * Get all pending selfies for a session (for professor review)
 * @param {string} sessionId - The session ID
 * @param {string} professorId - The professor ID (for authorization)
 * @returns {Promise<Array>}
 */
async function getPendingSelfiesForSession(sessionId, professorId) {
  try {
    // Verify professor owns this session
    const sessionDoc = await db.collection('sessions').doc(sessionId).get();
    if (!sessionDoc.exists) throw new Error('Session not found');
    if (sessionDoc.data().professorId !== professorId) {
      throw new Error('You do not have permission to view selfies for this session');
    }
    
    const snapshot = await db.collection('attendanceSelfies')
      .where('sessionId', '==', sessionId)
      .where('verificationStatus', '==', 'PENDING')
      .orderBy('uploadedAt', 'asc')
      .get();
    
    const selfies = [];
    for (const doc of snapshot.docs) {
      const selfieData = doc.data();
      
      // Get student info
      const studentDoc = await db.collection('users').doc(selfieData.studentId).get();
      const student = studentDoc.exists ? studentDoc.data() : {};
      
      selfies.push({
        id: doc.id,
        studentId: selfieData.studentId,
        studentName: student.fullName || 'Unknown',
        studentEmail: student.email || 'N/A',
        studentStudentId: student.studentId || 'N/A',
        photoUrl: selfieData.publicUrl,
        uploadedAt: selfieData.uploadedAt,
        storagePath: selfieData.storagePath
      });
    }
    
    return selfies;
  } catch (error) {
    console.error('Error getting pending selfies:', error);
    throw error;
  }
}

/**
 * Check if selfie is required for a session
 * @param {string} sessionId - The session ID
 * @returns {Promise<boolean>}
 */
async function isSelfieRequiredForSession(sessionId) {
  try {
    const sessionDoc = await db.collection('sessions').doc(sessionId).get();
    if (!sessionDoc.exists) return false;
    
    const session = sessionDoc.data();
    return session.verificationSettings?.requireSelfie || false;
  } catch (error) {
    console.error('Error checking selfie requirement:', error);
    return false;
  }
}

module.exports = { 
  uploadAttendanceSelfie, 
  verifySelfie, 
  rejectSelfie,
  getSelfieBySessionAndStudent,
  getPendingSelfiesForSession,
  isSelfieRequiredForSession
};
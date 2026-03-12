const { storage, db, admin } = require('../config/firebase');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const os = require('os');
const fs = require('fs');

const bucket = storage.bucket();

/**
 * Upload selfie for attendance verification
 */
async function uploadAttendanceSelfie(sessionId, studentId, imageBuffer, mimeType) {
  try {
    const fileName = `selfies/${sessionId}/${studentId}_${uuidv4()}.jpg`;
    const file = bucket.file(fileName);
    
    // Upload to Storage
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
    
    // Generate a signed URL (valid for 1 year)
    const [signedUrl] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 365 * 24 * 60 * 60 * 1000 // 1 year
    });
    
    // Save reference in Firestore
    const selfieRef = await db.collection('attendanceSelfies').add({
      sessionId,
      studentId,
      storagePath: fileName,
      publicUrl: signedUrl,
      uploadedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log(`Selfie uploaded for student ${studentId} in session ${sessionId}`);
    
    return {
      id: selfieRef.id,
      url: signedUrl
    };
  } catch (error) {
    console.error('Error uploading selfie:', error);
    throw error;
  }
}

/**
 * Verify selfie (mark as verified)
 */
async function verifySelfie(selfieId) {
  try {
    const selfieDoc = await db.collection('attendanceSelfies').doc(selfieId).get();
    
    if (!selfieDoc.exists) {
      throw new Error('Selfie not found');
    }
    
    const selfie = selfieDoc.data();
    
    await db.collection('attendanceSelfies').doc(selfieId).update({
      verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
      verificationStatus: 'VERIFIED'
    });
    
    // Also mark attendance
    await db.collection('attendance').add({
      sessionId: selfie.sessionId,
      studentId: selfie.studentId,
      verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
      verificationMethod: 'SELFIE',
      selfieId
    });
    
    console.log(`Selfie ${selfieId} verified`);
  } catch (error) {
    console.error('Error verifying selfie:', error);
    throw error;
  }
}

/**
 * Get selfie by session and student
 */
async function getSelfieBySessionAndStudent(sessionId, studentId) {
  try {
    const snapshot = await db.collection('attendanceSelfies')
      .where('sessionId', '==', sessionId)
      .where('studentId', '==', studentId)
      .orderBy('uploadedAt', 'desc')
      .limit(1)
      .get();
    
    if (snapshot.empty) {
      return null;
    }
    
    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data()
    };
  } catch (error) {
    console.error('Error getting selfie:', error);
    throw error;
  }
}

module.exports = {
  uploadAttendanceSelfie,
  verifySelfie,
  getSelfieBySessionAndStudent
};
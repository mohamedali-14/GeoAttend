// src/controllers/session.controller.js
const { db, admin } = require('../config/firebase');

/**
 * Create a new session with verification settings
 * @param {Object} sessionData - Session data
 * @returns {Promise<string>} - Session ID
 */
async function createSession(sessionData) {
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
        requireSelfie: false,  // Default: selfie NOT required
        requireQrCode: false,
        requireRandomCheck: false,
        selfieOptions: {
          allowRetakes: true,
          submissionTimeoutMinutes: 2,
          requireLivePhoto: true
        }
      }
    } = sessionData;
    
    // Verify course exists and professor teaches it
    const courseDoc = await db.collection('courses').doc(courseId).get();
    if (!courseDoc.exists) {
      throw new Error('Course not found');
    }
    
    if (courseDoc.data().professorId !== professorId) {
      throw new Error('You are not authorized to create sessions for this course');
    }
    
    const sessionRef = await db.collection('sessions').add({
      title,
      courseId,
      courseName: courseDoc.data().name,
      professorId,
      professorName,
      scheduledDate: admin.firestore.Timestamp.fromDate(new Date(scheduledDate)),
      location,
      radius,
      verificationSettings,
      status: 'SCHEDULED',
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
 * @returns {Promise<void>}
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
 * @param {string} sessionId - Session ID
 * @returns {Promise<Object>}
 */
async function getSession(sessionId) {
  try {
    const sessionDoc = await db.collection('sessions').doc(sessionId).get();
    if (!sessionDoc.exists) throw new Error('Session not found');
    
    return { id: sessionDoc.id, ...sessionDoc.data() };
  } catch (error) {
    console.error('Error getting session:', error);
    throw error;
  }
}

module.exports = { createSession, updateSessionVerificationSettings, getSession };
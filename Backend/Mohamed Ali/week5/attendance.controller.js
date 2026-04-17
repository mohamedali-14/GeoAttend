// src/controllers/attendance.controller.js
const { db, admin } = require('../config/firebase');
const { uploadAttendanceSelfie, isSelfieRequiredForSession } = require('../utils/selfieUpload');

/**
 * Mark attendance for a student
 * @param {string} sessionId - Session ID
 * @param {string} studentId - Student ID
 * @param {Object} options - Options including location and selfie
 * @returns {Promise<Object>}
 */
async function markAttendance(sessionId, studentId, options = {}) {
  try {
    const { location, selfieBuffer, selfieMimeType } = options;
    
    // Get session details
    const sessionDoc = await db.collection('sessions').doc(sessionId).get();
    if (!sessionDoc.exists) {
      throw new Error('Session not found');
    }
    
    const session = sessionDoc.data();
    
    // Check if session is active
    if (session.status !== 'ACTIVE') {
      throw new Error('Session is not active');
    }
    
    // Check if student is enrolled
    const enrollmentCheck = await db.collection('enrollments')
      .where('courseId', '==', session.courseId)
      .where('studentId', '==', studentId)
      .where('status', '==', 'ACTIVE')
      .limit(1)
      .get();
    
    if (enrollmentCheck.empty) {
      throw new Error('You are not enrolled in this course');
    }
    
    // Check if already marked attendance
    const existingAttendance = await db.collection('attendance')
      .where('sessionId', '==', sessionId)
      .where('studentId', '==', studentId)
      .limit(1)
      .get();
    
    if (!existingAttendance.empty) {
      throw new Error('Attendance already marked for this session');
    }
    
    // GPS verification (if required)
    const requireGps = session.verificationSettings?.requireGps !== false; // Default true
    let gpsValid = true;
    
    if (requireGps && location) {
      gpsValid = await verifyGpsLocation(session, location);
      if (!gpsValid) {
        throw new Error('You are not within the session location');
      }
    }
    
    // Selfie verification (if required)
    const requireSelfie = session.verificationSettings?.requireSelfie || false;
    let selfieResult = null;
    
    if (requireSelfie) {
      if (!selfieBuffer) {
        throw new Error('Selfie photo is required for this session');
      }
      
      selfieResult = await uploadAttendanceSelfie(sessionId, studentId, selfieBuffer, selfieMimeType || 'image/jpeg');
    }
    
    // Create attendance record
    let attendanceStatus = 'PRESENT';
    let verificationMethod = 'GPS_ONLY';
    
    if (requireSelfie) {
      verificationMethod = 'SELFIE_PENDING';
      attendanceStatus = 'PENDING_VERIFICATION'; // Requires professor review
    } else if (requireGps) {
      verificationMethod = 'GPS';
    }
    
    const attendanceRef = await db.collection('attendance').add({
      sessionId,
      studentId,
      courseId: session.courseId,
      courseName: session.courseName,
      markedAt: admin.firestore.FieldValue.serverTimestamp(),
      verificationMethod,
      status: attendanceStatus,
      locationVerified: gpsValid,
      selfieId: selfieResult?.id || null,
      ipAddress: options.ipAddress || null
    });
    
    console.log(`Attendance marked for student ${studentId} in session ${sessionId}`);
    
    return {
      success: true,
      attendanceId: attendanceRef.id,
      requiresVerification: requireSelfie,
      selfieId: selfieResult?.id,
      status: attendanceStatus
    };
  } catch (error) {
    console.error('Error marking attendance:', error);
    throw error;
  }
}

/**
 * Verify GPS location against session location
 * @param {Object} session - Session data
 * @param {Object} studentLocation - Student's location {lat, lng}
 * @returns {Promise<boolean>}
 */
async function verifyGpsLocation(session, studentLocation) {
  if (!session.location || !studentLocation) return false;
  
  const R = 6371e3; // Earth's radius in meters
  const φ1 = session.location.lat * Math.PI / 180;
  const φ2 = studentLocation.lat * Math.PI / 180;
  const Δφ = (studentLocation.lat - session.location.lat) * Math.PI / 180;
  const Δλ = (studentLocation.lng - session.location.lng) * Math.PI / 180;
  
  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  
  return distance <= (session.radius || 50);
}

module.exports = { markAttendance, verifyGpsLocation };
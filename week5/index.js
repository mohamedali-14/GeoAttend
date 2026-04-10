// src/index.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');

admin.initializeApp();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// Import controllers
const { createSession, updateSessionVerificationSettings, getSession } = require('./controllers/session.controller');
const { markAttendance } = require('./controllers/attendance.controller');
const { verifySelfie, rejectSelfie, getPendingSelfiesForSession } = require('./utils/selfieUpload');
const { generateSessionAttendanceExcel, generateSessionAttendancePDF } = require('./services/export.service');

// ============ SESSION ENDPOINTS ============

/**
 * POST /sessions
 * Create a new session with verification settings
 */
app.post('/sessions', async (req, res) => {
  try {
    const { title, courseId, professorId, professorName, scheduledDate, location, radius, verificationSettings } = req.body;
    
    const sessionId = await createSession({
      title,
      courseId,
      professorId,
      professorName,
      scheduledDate,
      location,
      radius,
      verificationSettings
    });
    
    res.status(201).json({ success: true, sessionId });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * GET /sessions/:sessionId
 * Get session details
 */
app.get('/sessions/:sessionId', async (req, res) => {
  try {
    const session = await getSession(req.params.sessionId);
    res.status(200).json({ success: true, session });
  } catch (error) {
    res.status(404).json({ success: false, error: error.message });
  }
});

/**
 * PATCH /sessions/:sessionId/verification-settings
 * Update verification settings
 */
app.patch('/sessions/:sessionId/verification-settings', async (req, res) => {
  try {
    const { professorId, ...updates } = req.body;
    await updateSessionVerificationSettings(req.params.sessionId, professorId, updates);
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// ============ ATTENDANCE ENDPOINTS ============

/**
 * POST /attendance/mark
 * Mark attendance (handles both GPS and selfie requirements)
 */
app.post('/attendance/mark', async (req, res) => {
  try {
    const { sessionId, studentId, location, selfieBase64, ipAddress } = req.body;
    
    // Convert base64 to buffer if selfie provided
    let selfieBuffer = null;
    let selfieMimeType = null;
    
    if (selfieBase64) {
      const matches = selfieBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        selfieMimeType = matches[1];
        selfieBuffer = Buffer.from(matches[2], 'base64');
      } else {
        selfieBuffer = Buffer.from(selfieBase64, 'base64');
        selfieMimeType = 'image/jpeg';
      }
    }
    
    const result = await markAttendance(sessionId, studentId, {
      location,
      selfieBuffer,
      selfieMimeType,
      ipAddress
    });
    
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// ============ SELFIE VERIFICATION ENDPOINTS ============

/**
 * GET /sessions/:sessionId/pending-selfies
 * Get all pending selfies for a session (professor only)
 */
app.get('/sessions/:sessionId/pending-selfies', async (req, res) => {
  try {
    const { professorId } = req.query;
    const selfies = await getPendingSelfiesForSession(req.params.sessionId, professorId);
    res.status(200).json({ success: true, selfies });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * POST /selfies/:selfieId/verify
 * Verify a selfie (approve attendance)
 */
app.post('/selfies/:selfieId/verify', async (req, res) => {
  try {
    const { professorId } = req.body;
    const result = await verifySelfie(req.params.selfieId, professorId);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * POST /selfies/:selfieId/reject
 * Reject a selfie (deny attendance)
 */
app.post('/selfies/:selfieId/reject', async (req, res) => {
  try {
    const { professorId, reason } = req.body;
    const result = await rejectSelfie(req.params.selfieId, professorId, reason);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// ============ REPORT ENDPOINTS ============

/**
 * GET /sessions/:sessionId/export/excel
 * Export attendance to Excel
 */
app.get('/sessions/:sessionId/export/excel', async (req, res) => {
  try {
    const filePath = await generateSessionAttendanceExcel(req.params.sessionId);
    res.download(filePath, `attendance_${req.params.sessionId}.xlsx`);
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * GET /sessions/:sessionId/export/pdf
 * Export attendance to PDF
 */
app.get('/sessions/:sessionId/export/pdf', async (req, res) => {
  try {
    const filePath = await generateSessionAttendancePDF(req.params.sessionId);
    res.download(filePath, `attendance_${req.params.sessionId}.pdf`);
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

exports.api = functions.https.onRequest(app);
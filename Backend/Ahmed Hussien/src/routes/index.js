const express = require("express");
const router = express.Router();

// ============================================
// IMPORTS - Existing Routes
// ============================================
const adminRoutes = require("../admin/admin.routes");
const authRoutes = require("../modules/auth/auth.routes");
const courseRoutes = require("../courses/course.routes");
const scheduleRoutes = require("../schedules/schedule.routes");
const enrollmentRoutes = require("../modules/enrollments/enrollments.routes");
const professorRoutes = require("../modules/professor/professor.routes");
const sessionRoutes = require("../modules/sessions/session.routes");
const attendanceRoutes = require("../modules/attendance/attendance.routes");
const usersRoutes = require("../modules/users/users.routes");

// ============================================
// IMPORTS - Your Week 5 Services & Utils
// ============================================
const { 
    generateSessionAttendanceExcel, 
    generateSessionAttendancePDF 
} = require("../services/export.service");

const { 
    verifySelfie, 
    rejectSelfie, 
    getPendingSelfiesForSession 
} = require("../modules/attendance/selfieUpload");

const { 
    createSessionWithSettings, 
    updateSessionVerificationSettings, 
    getSessionWithSettings 
} = require("../modules/sessions/session.controller");

const { markAttendance } = require("../modules/attendance/attendance.controller");

const { authenticateUser, requireRole } = require("../middleware/auth.middleware");

// ============================================
// EXISTING ROUTES
// ============================================
router.use("/admin", adminRoutes);
router.use("/auth", authRoutes);
router.use("/courses", courseRoutes);
router.use("/schedules", scheduleRoutes);
router.use("/enrollments", enrollmentRoutes);
router.use("/professor", professorRoutes);
router.use("/sessions", sessionRoutes);
router.use("/attendance", attendanceRoutes);
router.use("/users", usersRoutes);

// ============================================
// HEALTH CHECK ENDPOINT
// ============================================
router.get("/health", (req, res) => {
    res.status(200).json({ 
        status: "OK", 
        timestamp: new Date().toISOString(),
        message: "GeoAttend API is running"
    });
});

// ============================================
// NEW WEEK 5 ENDPOINTS - Session with Verification Settings
// ============================================

/**
 * POST /sessions/with-settings
 * Create a new session with advanced verification settings (selfie, GPS, etc.)
 * Access: PROFESSOR only
 */
router.post("/sessions/with-settings", authenticateUser, requireRole("PROFESSOR"), async (req, res) => {
    try {
        const { 
            title, 
            courseId, 
            scheduledDate, 
            location, 
            radius, 
            verificationSettings 
        } = req.body;

        const sessionId = await createSessionWithSettings({
            title,
            courseId,
            professorId: req.user.uid,
            professorName: req.user.fullName,
            scheduledDate,
            location,
            radius,
            verificationSettings
        });

        res.status(201).json({ 
            success: true, 
            sessionId,
            message: "Session created successfully with verification settings"
        });
    } catch (error) {
        console.error("Error creating session with settings:", error);
        res.status(400).json({ 
            success: false, 
            error: error.message 
        });
    }
});

/**
 * PATCH /sessions/:sessionId/verification-settings
 * Update verification settings for an existing session
 * Access: PROFESSOR only
 */
router.patch("/sessions/:sessionId/verification-settings", authenticateUser, requireRole("PROFESSOR"), async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { ...updates } = req.body;

        await updateSessionVerificationSettings(sessionId, req.user.uid, updates);

        res.status(200).json({ 
            success: true, 
            message: "Verification settings updated successfully"
        });
    } catch (error) {
        console.error("Error updating verification settings:", error);
        res.status(400).json({ 
            success: false, 
            error: error.message 
        });
    }
});

/**
 * GET /sessions/:sessionId/settings
 * Get session details including verification settings
 * Access: PROFESSOR or STUDENT (enrolled)
 */
router.get("/sessions/:sessionId/settings", authenticateUser, async (req, res) => {
    try {
        const { sessionId } = req.params;
        const session = await getSessionWithSettings(sessionId);

        if (req.user.role === "PROFESSOR" && session.professorId !== req.user.uid) {
            return res.status(403).json({ 
                success: false, 
                error: "You do not have permission to view this session" 
            });
        }

        res.status(200).json({ 
            success: true, 
            session 
        });
    } catch (error) {
        console.error("Error getting session settings:", error);
        res.status(404).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// ============================================
// NEW WEEK 5 ENDPOINTS - Selfie Verification
// ============================================

/**
 * GET /sessions/:sessionId/pending-selfies
 * Get all pending selfies for a session (professor review queue)
 * Access: PROFESSOR only
 */
router.get("/sessions/:sessionId/pending-selfies", authenticateUser, requireRole("PROFESSOR"), async (req, res) => {
    try {
        const { sessionId } = req.params;
        const selfies = await getPendingSelfiesForSession(sessionId, req.user.uid);

        res.status(200).json({ 
            success: true, 
            selfies,
            count: selfies.length
        });
    } catch (error) {
        console.error("Error getting pending selfies:", error);
        res.status(400).json({ 
            success: false, 
            error: error.message 
        });
    }
});

/**
 * POST /selfies/:selfieId/verify
 * Verify a selfie and mark attendance as approved
 * Access: PROFESSOR only
 */
router.post("/selfies/:selfieId/verify", authenticateUser, requireRole("PROFESSOR"), async (req, res) => {
    try {
        const { selfieId } = req.params;
        const result = await verifySelfie(selfieId, req.user.uid);

        res.status(200).json({ 
            success: true, 
            ...result,
            message: "Selfie verified successfully"
        });
    } catch (error) {
        console.error("Error verifying selfie:", error);
        res.status(400).json({ 
            success: false, 
            error: error.message 
        });
    }
});

/**
 * POST /selfies/:selfieId/reject
 * Reject a selfie with reason (attendance denied)
 * Access: PROFESSOR only
 */
router.post("/selfies/:selfieId/reject", authenticateUser, requireRole("PROFESSOR"), async (req, res) => {
    try {
        const { selfieId } = req.params;
        const { reason } = req.body;

        if (!reason) {
            return res.status(400).json({ 
                success: false, 
                error: "Rejection reason is required" 
            });
        }

        const result = await rejectSelfie(selfieId, req.user.uid, reason);

        res.status(200).json({ 
            success: true, 
            ...result,
            message: "Selfie rejected successfully"
        });
    } catch (error) {
        console.error("Error rejecting selfie:", error);
        res.status(400).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// ============================================
// NEW WEEK 5 ENDPOINTS - Attendance with Selfie
// ============================================

/**
 * POST /attendance/mark-with-selfie
 * Mark attendance with optional selfie verification
 * Access: STUDENT only
 */
router.post("/attendance/mark-with-selfie", authenticateUser, requireRole("STUDENT"), async (req, res) => {
    try {
        const { sessionId, location, selfieBase64, ipAddress } = req.body;

        if (!sessionId) {
            return res.status(400).json({ 
                success: false, 
                error: "Session ID is required" 
            });
        }

        let selfieBuffer = null;
        let selfieMimeType = null;

        if (selfieBase64) {
            const matches = selfieBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
            if (matches && matches.length === 3) {
                selfieMimeType = matches[1];
                selfieBuffer = Buffer.from(matches[2], "base64");
            } else {
                selfieBuffer = Buffer.from(selfieBase64, "base64");
                selfieMimeType = "image/jpeg";
            }
        }

        const result = await markAttendance(sessionId, req.user.uid, {
            location,
            selfieBuffer,
            selfieMimeType,
            ipAddress
        });

        res.status(200).json(result);
    } catch (error) {
        console.error("Error marking attendance with selfie:", error);
        res.status(400).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// ============================================
// NEW WEEK 5 ENDPOINTS - Export Reports
// ============================================

/**
 * GET /sessions/:sessionId/export/excel
 * Export attendance report to Excel
 * Access: PROFESSOR only
 */
router.get("/sessions/:sessionId/export/excel", authenticateUser, requireRole("PROFESSOR"), async (req, res) => {
    try {
        const { sessionId } = req.params;
        
        const { db } = require("../config/firebase");
        const sessionDoc = await db.collection("sessions").doc(sessionId).get();
        
        if (!sessionDoc.exists) {
            return res.status(404).json({ success: false, error: "Session not found" });
        }
        
        if (sessionDoc.data().professorId !== req.user.uid) {
            return res.status(403).json({ success: false, error: "Access denied" });
        }

        const filePath = await generateSessionAttendanceExcel(sessionId);
        res.download(filePath, `attendance_${sessionId}.xlsx`, (err) => {
            if (err) {
                console.error("Error downloading Excel file:", err);
                res.status(500).json({ success: false, error: "Failed to download file" });
            }
        });
    } catch (error) {
        console.error("Error generating Excel report:", error);
        res.status(400).json({ 
            success: false, 
            error: error.message 
        });
    }
});

/**
 * GET /sessions/:sessionId/export/pdf
 * Export attendance report to PDF
 * Access: PROFESSOR only
 */
router.get("/sessions/:sessionId/export/pdf", authenticateUser, requireRole("PROFESSOR"), async (req, res) => {
    try {
        const { sessionId } = req.params;
        
        const { db } = require("../config/firebase");
        const sessionDoc = await db.collection("sessions").doc(sessionId).get();
        
        if (!sessionDoc.exists) {
            return res.status(404).json({ success: false, error: "Session not found" });
        }
        
        if (sessionDoc.data().professorId !== req.user.uid) {
            return res.status(403).json({ success: false, error: "Access denied" });
        }

        const filePath = await generateSessionAttendancePDF(sessionId);
        res.download(filePath, `attendance_${sessionId}.pdf`, (err) => {
            if (err) {
                console.error("Error downloading PDF file:", err);
                res.status(500).json({ success: false, error: "Failed to download file" });
            }
        });
    } catch (error) {
        console.error("Error generating PDF report:", error);
        res.status(400).json({ 
            success: false, 
            error: error.message 
        });
    }
});

module.exports = router;
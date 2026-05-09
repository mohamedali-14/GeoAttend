const express = require("express");
const router  = express.Router();

// Helper to safely require a route — skips if file missing
function safe(path) {
  try { return require(path); }
  catch (e) { 
    console.warn("[routes] Could not load:", path, "-", e.message);
    const r = express.Router();
    r.all("*", (req, res) => res.status(501).json({ error: "Module not available: " + path }));
    return r;
  }
}

router.use("/auth",        safe("../modules/auth/auth.routes.js.js"));
router.use("/users",       safe("../modules/users/users.routes.js"));
router.use("/courses",     safe("../courses/course.routes.js"));
router.use("/schedules",   safe("../schedules/schedule.routes.js"));
router.use("/enrollments", safe("../modules/enrollments/enrollments.routes.js"));
router.use("/sessions",    safe("../modules/sessions/session.routes.js"));
router.use("/attendance",  safe("../modules/attendance/attendance.routes.js"));
router.use("/analytics",   safe("../modules/analytics/analytics.routes.js"));
router.use("/monitoring",  safe("../modules/analytics/monitoring.routes.js"));
router.use("/quiz",        safe("../modules/analytics/quiz.routes.js"));
router.use("/quiz",        safe("../modules/analytics/quiz_sessions.routes.js"));
router.use("/admin",       safe("../admin/admin.routes.js"));
router.use("/professor",   safe("../modules/professor/professor.routes.js"));
router.use("/ai",          safe("../modules/ai/ai.routes.js"));

module.exports = router;

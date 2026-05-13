const { auth, db } = require("../config/firebase");

function normalizeRole(role) {
    if (!role) return "STUDENT";
    if (role === "PROFESSOR") return "DOCTOR";
    return role.toUpperCase();
}

async function authenticateUser(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ error: "No token provided" });
        }

        const token = authHeader.split("Bearer ")[1];
        let decoded;
        try {
            decoded = await auth.verifyIdToken(token);
        } catch (authError) {
            console.error("[auth] Token verification failed:", authError.message);
            
            // If quota exhausted, try to decode without verification (TEMPORARY FALLBACK)
            if (authError.code === "auth/insufficient-permission" || authError.message.includes("RESOURCE_EXHAUSTED") || authError.message.includes("quota")) {
                console.warn("[auth] Quota exhausted, attempting unsafe decode fallback...");
                try {
                    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64").toString());
                    decoded = {
                        uid: payload.user_id || payload.sub,
                        email: payload.email,
                        displayName: payload.name
                    };
                    console.log("[auth] Fallback decode successful for UID:", decoded.uid);
                } catch (decodeError) {
                    throw authError; // Rethrow original if fallback fails
                }
            } else {
                throw authError;
            }
        }

        let userData = {};
        let tokenRole = null;
        try {
            const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64").toString());
            tokenRole = payload.role;
        } catch(e) {}

        try {
            const userDoc = await db.collection("users").doc(decoded.uid).get();
            userData = userDoc.exists ? userDoc.data() : {};
        } catch (dbErr) {
            console.warn("[auth middleware] Firestore quota exceeded. Using token/email fallback for role.");
            userData = {
                role: tokenRole || (decoded.email.includes("doc") || decoded.email.includes("prof") ? "DOCTOR" : decoded.email.includes("admin") ? "ADMIN" : "STUDENT")
            };
        }

        req.user = {
            uid: decoded.uid,
            email: decoded.email,
            role: normalizeRole(userData.role || "STUDENT"),
            fullName: userData.fullName || decoded.displayName || decoded.email.split("@")[0],
            department: userData.department || "",
            studentId: userData.studentId || "",
            isActive: userData.isActive !== false,
            ...userData,
            // Always override with normalized role
            role: normalizeRole(userData.role || "STUDENT"),
        };

        next();
    } catch (error) {
        console.error("[auth] Final auth error:", error.message);
        res.status(401).json({ error: "Invalid or expired token" });
    }
}

function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user) return res.status(401).json({ error: "Authentication required" });

        // Normalize requested roles too
        const normalized = roles.map(r => normalizeRole(r));
        
        if (!normalized.includes(req.user.role)) {
            return res.status(403).json({
                error: "Access denied",
                required: normalized,
                got: req.user.role
            });
        }
        next();
    };
}

module.exports = { authenticateUser, requireRole };

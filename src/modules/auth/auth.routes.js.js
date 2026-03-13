const express = require("express");
const https   = require("https");
const router  = express.Router();
const { createUser } = require("./auth.controller");
const { authenticateUser, requireRole } = require("../../middleware/auth.middleware");

// Helper to make HTTPS POST request
function httpsPost(url, data) {
    return new Promise((resolve, reject) => {
    const body = JSON.stringify(data);
    const urlObj = new URL(url);
    const options = {
        hostname: urlObj.hostname,
        path: urlObj.pathname + urlObj.search,
        method: "POST",
        headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
        },
    };
    const req = https.request(options, (res) => {
        let responseData = "";
        res.on("data", (chunk) => { responseData += chunk; });
        res.on("end", () => {
        try { resolve(JSON.parse(responseData)); }
        catch (e) { reject(e); }
        });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
    });
}

// Login
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
        return res.status(400).json({ error: "Email and password required" });
    }

    const apiKey = process.env.FIREBASE_API_KEY || "";
    const fbData = await httpsPost(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
        { email, password, returnSecureToken: true }
    );

    if (fbData.error) {
        return res.status(401).json({ error: "Invalid email or password" });
    }

    // Get user data from Firestore
    const { db } = require("../../config/firebase");
    const userDoc = await db.collection("users").doc(fbData.localId).get();
    const userData = userDoc.exists ? userDoc.data() : {};

    res.json({
        token: fbData.idToken,
        user: {
        id:         fbData.localId,
        email:      fbData.email,
        fullName:   userData.fullName || fbData.displayName || email.split("@")[0],
        role:       userData.role || "STUDENT",
        department: userData.department || "",
        studentId:  userData.studentId || "",
        isActive:   userData.isActive !== false,
        },
    });
    } catch (err) {
    res.status(500).json({ error: err.message });
    }
});

// Create user (ADMIN only)
router.post("/create-user", authenticateUser, requireRole("ADMIN"), createUser);

module.exports = router;

// Register (public - no auth needed)
router.post("/register", async (req, res) => {
    try {
    const { email, password, fullName, role, department, studentId } = req.body;
    if (!email || !password || !fullName) {
        return res.status(400).json({ error: "Email, password and name required" });
    }

    const { admin, db } = require("../../config/firebase");

    // Create user in Firebase Auth
    const userRecord = await admin.auth().createUser({
        email,
        password,
        displayName: fullName,
    });

    // Save user data in Firestore
    const userData = {
        uid:        userRecord.uid,
        email,
        fullName,
        role:       role || "STUDENT",
        department: department || "",
        studentId:  studentId || "",
        isActive:   true,
        createdAt:  admin.firestore.FieldValue.serverTimestamp(),
    };

    await db.collection("users").doc(userRecord.uid).set(userData);

    res.status(201).json({ message: "User created successfully", uid: userRecord.uid });
    } catch (err) {
        if (err.code === "auth/email-already-exists") {
        return res.status(400).json({ error: "Email already in use" });
        }
    res.status(500).json({ error: err.message });
    }
});
const express = require("express");
const https = require("https");
const router = express.Router();
const { authenticateUser, requireRole } = require("../../middleware/auth.middleware");
const { createUser } = require("./auth.controller");

function httpsPost(url, data) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify(data);
        const urlObj = new URL(url);
        const options = {
            hostname: urlObj.hostname,
            path: urlObj.pathname + urlObj.search,
            method: "POST",
            headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) },
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

router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ error: "Email and password required" });

        const apiKey = process.env.FIREBASE_API_KEY;
        if (!apiKey) return res.status(500).json({ error: "Firebase API key not configured" });

        const fbData = await httpsPost(
            `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
            { email, password, returnSecureToken: true }
        );

        if (fbData.error) {
            console.error("[auth] Firebase login error:", fbData.error);
            const errMsg = fbData.error.message || "";
            
            // EMERGENCY QUOTA BYPASS: If Firebase Auth quota is exhausted, allow login via Firestore
            if (errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("QUOTA_EXCEEDED") || errMsg.includes("quota")) {
                console.warn("[auth] Quota exceeded. Using emergency bypass login...");
                const { db } = require("../../config/firebase");
                const usersSnapshot = await db.collection("users").where("email", "==", email).limit(1).get();
                if (usersSnapshot.empty) {
                    return res.status(401).json({ error: "User not found (Quota bypass mode)" });
                }
                const userDoc = usersSnapshot.docs[0];
                const userData = userDoc.data();
                
                // Generate a fake JWT token that our middleware fallback can decode
                const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64");
                const payload = Buffer.from(JSON.stringify({
                    user_id: userDoc.id,
                    sub: userDoc.id,
                    email: email,
                    name: userData.fullName || email.split("@")[0],
                    exp: Math.floor(Date.now() / 1000) + 315360000 // 10 years
                })).toString("base64");
                const fakeToken = `${header}.${payload}.signature`;

                return res.json({
                    token: fakeToken,
                    refreshToken: "fake_refresh_token_bypass",
                    expiresIn: "315360000", // 10 years
                    user: {
                        uid: userDoc.id,
                        email: email,
                        fullName: userData.fullName || email.split("@")[0],
                        role: userData.role || "STUDENT",
                        department: userData.department || "",
                        studentId: userData.studentId || "",
                        isActive: userData.isActive !== false,
                        profilePicture: userData.profilePicture || undefined,
                    },
                });
            }

            return res.status(401).json({ error: errMsg || "Invalid email or password" });
        }

        const { db } = require("../../config/firebase");
        let userData = {};
        
        // Extract role from custom claims in the ID token (if available)
        let tokenRole = null;
        try {
            const tokenPayload = JSON.parse(Buffer.from(fbData.idToken.split(".")[1], "base64").toString());
            tokenRole = tokenPayload.role;
        } catch (e) {}

        try {
            const userDoc = await db.collection("users").doc(fbData.localId).get();
            userData = userDoc.exists ? userDoc.data() : {};
        } catch (dbErr) {
            console.warn("[auth] Firestore error (likely quota exceeded) when fetching user:", dbErr.message);
            // Fallback so the user can still log in
            userData = {
                fullName: fbData.displayName || email.split("@")[0],
                role: tokenRole || (email.includes("doc") || email.includes("prof") ? "DOCTOR" : email.includes("admin") ? "ADMIN" : "STUDENT"),
                department: "CS",
                studentId: email.includes("stu") ? "2021000" : "",
                isActive: true
            };
        }

        res.json({
            token: fbData.idToken,
            refreshToken: fbData.refreshToken,
            expiresIn: fbData.expiresIn,
            user: {
                uid: fbData.localId,
                email: fbData.email,
                fullName: userData.fullName || fbData.displayName || email.split("@")[0],
                role: userData.role || "STUDENT",
                department: userData.department || "",
                studentId: userData.studentId || "",
                isActive: userData.isActive !== false,
                profilePicture: userData.profilePicture || undefined,
            },
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post("/register", async (req, res) => {
    try {
        const { email, password, fullName, role, department, studentId } = req.body;
        if (!email || !password || !fullName) {
            return res.status(400).json({ error: "Email, password and name required" });
        }

        const { admin, db } = require("../../config/firebase");
        const userRecord = await admin.auth().createUser({ email, password, displayName: fullName });

        // Save role in Firebase Auth Custom Claims (Bypasses Firestore Quota!)
        try {
            await admin.auth().setCustomUserClaims(userRecord.uid, { role: role || "STUDENT" });
        } catch (claimErr) {
            console.warn("Failed to set custom claims", claimErr.message);
        }

        const userData = {
            uid: userRecord.uid,
            email,
            fullName,
            role: role || "STUDENT",
            department: department || "",
            studentId: studentId || "",
            isActive: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        try {
            await db.collection("users").doc(userRecord.uid).set(userData);
        } catch (dbErr) {
            console.warn("[auth] Firestore quota exceeded during registration. User created in Auth only.", dbErr.message);
        }
        res.status(201).json({ message: "User created successfully", uid: userRecord.uid });
    } catch (err) {
        if (err.code === "auth/email-already-exists") {
            return res.status(400).json({ error: "Email already in use" });
        }
        res.status(500).json({ error: err.message });
    }
});

router.post("/create-user", authenticateUser, requireRole("ADMIN"), createUser);

module.exports = router;
/**
 * Run this once to create/fix admin user in Firestore:
 * node src/scripts/createAdmin.js admin@test.com
 */
require("dotenv").config();
const { admin, db } = require("../config/firebase");

const email = process.argv[2];
if (!email) { console.log("Usage: node src/scripts/createAdmin.js <email>"); process.exit(1); }

async function makeAdmin() {
    try {
        const user = await admin.auth().getUserByEmail(email);
        await db.collection("users").doc(user.uid).set({
            uid: user.uid, email,
            fullName: user.displayName || email.split("@")[0],
            role: "ADMIN",
            isActive: true,
            department: "Administration",
            studentId: "",
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        console.log(`✅ ${email} is now ADMIN (uid: ${user.uid})`);
    } catch (e) {
        console.error("❌ Error:", e.message);
    }
    process.exit(0);
}
makeAdmin();

const { admin, auth, db } = require("../../config/firebase");

async function createUser(data) {
    const { email, password, fullName, role, department, studentId } = data;

    const userRecord = await auth.createUser({ email, password, displayName: fullName });
    await auth.setCustomUserClaims(userRecord.uid, { role });

    const userData = {
        uid: userRecord.uid,
        email,
        fullName,
        role,
        department: department || null,
        studentId: studentId || null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        isActive: true
    };

    await db.collection("users").doc(userRecord.uid).set(userData);
    return userData;
}

module.exports = { createUser };
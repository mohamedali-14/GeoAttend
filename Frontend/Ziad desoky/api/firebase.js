const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: process.env.FIREBASE_PROJECT_ID || 'geoattend-14',
    });
}

const db = admin.firestore();
const auth = admin.auth();

module.exports = { admin, db, auth };

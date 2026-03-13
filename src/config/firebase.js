const admin = require("firebase-admin");

// Set emulator environment variables for local development
if (process.env.NODE_ENV !== 'production') {
  process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
  process.env.FIREBASE_STORAGE_EMULATOR_HOST = 'localhost:9199';
  process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';
}

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'geoattend-14', // Make sure this matches your project ID
    // For local emulators, no credentials needed
    credential: admin.credential.applicationDefault()
  });
}

const db = admin.firestore();
const auth = admin.auth();
const storage = admin.storage();
const messaging = admin.messaging();

module.exports = {
  admin,
  db,
  auth,
  storage,
  messaging
};
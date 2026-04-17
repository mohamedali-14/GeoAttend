const admin = require("firebase-admin");

<<<<<<< Updated upstream
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
=======
// Check if we're running in emulator mode
const isEmulator = process.env.FIRESTORE_EMULATOR_HOST || 
                   process.env.FIREBASE_AUTH_EMULATOR_HOST ||
                   process.env.FIREBASE_STORAGE_EMULATOR_HOST;

if (!admin.apps.length) {
  if (isEmulator) {
    // Use emulator configuration (no credentials needed)
    admin.initializeApp({
      projectId: "geoattend-14",
    });
    console.log("🔥 Running with Firebase Emulators");
  } else {
    // Production mode - use service account
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      }),
    });
  }
>>>>>>> Stashed changes
}

const db = admin.firestore();
const auth = admin.auth();
const storage = admin.storage();
const messaging = admin.messaging();

<<<<<<< Updated upstream
module.exports = {
  admin,
  db,
  auth,
  storage,
  messaging
};
=======
// Set emulator environment variables for local development
if (isEmulator) {
  if (!process.env.FIRESTORE_EMULATOR_HOST) {
    process.env.FIRESTORE_EMULATOR_HOST = "localhost:8080";
  }
  if (!process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    process.env.FIREBASE_AUTH_EMULATOR_HOST = "localhost:9099";
  }
  if (!process.env.FIREBASE_STORAGE_EMULATOR_HOST) {
    process.env.FIREBASE_STORAGE_EMULATOR_HOST = "localhost:9199";
  }
}

module.exports = { admin, db, auth, storage, messaging };
>>>>>>> Stashed changes

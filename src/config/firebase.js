const admin = require("firebase-admin");

if (!admin.apps.length) {

  admin.initializeApp({

    credential: admin.credential.cert({
      projectId: "geoattend-14",
      clientEmail: "firebase-adminsdk-fbsvc@geoattend-14.iam.gserviceaccount.com",
      privateKey: process.env.FIREBASE_PRIVATE_KEY
        ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
        : undefined,
    }),

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
  messaging,
};
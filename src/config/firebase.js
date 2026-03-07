const admin = require("firebase-admin");
const functions = require("firebase-functions");

if (!admin.apps.length) {

    admin.initializeApp({
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
    messaging,
    functions
};
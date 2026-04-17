import { initializeApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";
import { getAuth, connectAuthEmulator } from "firebase/auth";

// Your Firebase web config (from console)
const firebaseConfig = {
  apiKey: "AIzaSyAYn2p9qJNjovomac_MRnBThaAbDC5VXjQ",
  authDomain: "geoatten-14.firebaseapp.com",
  projectId: "geoatten-14",
  storageBucket: "geoatten-14.firebasestorage.app",
  messagingSenderId: "864639491661",
  appId: "1:864639491661:web:276e54ae633508ba614604",
  measurementId: "G-WWGQ8YTVGJ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Get services
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);

// Connect to emulators if on localhost
if (window.location.hostname === "localhost") {
  connectFirestoreEmulator(db, "localhost", 8080);
  connectStorageEmulator(storage, "localhost", 9199);
  connectAuthEmulator(auth, "http://localhost:9099");
  console.log("Connected to Firebase emulators");
}

export { db, storage, auth };

/**
 * This file initializes Firebase in the frontend and connects to emulators when running locally.
 * Then in their frontend code, they can import these services:
 * import { db, storage, auth } from './firebase.js';
 */
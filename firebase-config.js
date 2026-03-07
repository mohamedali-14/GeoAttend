// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAYn2p9qJNjoVomac_MRnBThaAbDC5VXjQ",
  authDomain: "geoattend-14.firebaseapp.com",
  projectId: "geoattend-14",
  storageBucket: "geoattend-14.firebasestorage.app",
  messagingSenderId: "864639491661",
  appId: "1:864639491661:web:276e54ae633508ba614604",
  measurementId: "G-WWGQ8YTVGJ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
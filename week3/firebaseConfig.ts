import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
    apiKey: "AIzaSyAYn2p9qJNjoVomac_MRnBThaAbDC5VXjQ",
    authDomain: "geoattend-14.firebaseapp.com",
    projectId: "geoattend-14",
    storageBucket: "geoattend-14.firebasestorage.app",
    messagingSenderId: "864639491661",
    appId: "1:864639491661:web:276e54ae633508ba614604",
    measurementId: "G-WWGQ8YTVGJ"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyBZtzeEI92l4qAkmMOd6XA14XXUdT7UQgQ",
    authDomain: "geo-attendance182.firebaseapp.com",
    projectId: "geo-attendance182",
    storageBucket: "geo-attendance182.firebasestorage.app",
    messagingSenderId: "1076891005109",
    appId: "1:1076891005109:web:c8d1c1245dcccc2e840efc",
    measurementId: "G-EXWVWZY17K"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

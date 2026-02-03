// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
// import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries


// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
// Use import.meta.env in Vite, fall back to process.env in Jest
const env = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : process.env;

const firebaseConfig = {
 apiKey: env.VITE_FIREBASE_API_KEY,
 authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
 projectId: env.VITE_FIREBASE_PROJECT_ID,
 storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
 messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
 appId: env.VITE_FIREBASE_APP_ID,
 measurementId: env.VITE_FIREBASE_MEASUREMENT_ID
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Only connect to emulator in development mode
if (env.DEV) {
  connectAuthEmulator(auth, "http://localhost:9099");
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
}

// Export the db and auth instances
export { db, auth, app };

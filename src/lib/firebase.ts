
// src/lib/firebase.ts
import { initializeApp, getApps, getApp, type FirebaseApp, type FirebaseOptions } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";
// import { getAuth } from "firebase/auth"; // We'll use this later for Firebase Auth

// Your web app's Firebase configuration should be set in environment variables
const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID, // Optional
};

let app: FirebaseApp | undefined = undefined;
let db: Firestore | undefined = undefined;

// Check if essential config values are present BEFORE attempting to initialize
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error(
    "CRITICAL Firebase Setup Error: NEXT_PUBLIC_FIREBASE_API_KEY or NEXT_PUBLIC_FIREBASE_PROJECT_ID is missing or empty in your environment variables. Firebase will not be initialized. Please check your .env.local file and Vercel environment variable configuration."
  );
} else {
  if (!getApps().length) {
    try {
      app = initializeApp(firebaseConfig);
    } catch (e) {
      console.error("CRITICAL Firebase Setup Error: Failed to initialize Firebase app. This might be due to invalid Firebase config values.", e);
      app = undefined; // Ensure app is explicitly undefined on error
    }
  } else {
    app = getApp();
  }

  if (app) {
    try {
      db = getFirestore(app);
    } catch (e) {
      console.error("CRITICAL Firebase Setup Error: Failed to initialize Firestore instance. Ensure Firestore is enabled in your Firebase project.", e);
      db = undefined; // Ensure db is explicitly undefined on error
    }
  } else {
    // This case means app initialization failed above or was skipped due to missing critical config
    console.error("Firebase app was not initialized (likely due to config errors). Firestore cannot be accessed.");
  }
}

// const auth = getAuth(app); // We'll use this later if app is defined

export { app, db };
// export { app, db, auth }; // When auth is ready

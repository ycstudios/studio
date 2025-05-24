
// src/lib/firebase.ts
import { initializeApp, getApps, getApp, type FirebaseApp, type FirebaseOptions } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";

console.log("[Firebase Init] Starting Firebase configuration loading...");

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
    "CRITICAL Firebase Setup Error: NEXT_PUBLIC_FIREBASE_API_KEY or NEXT_PUBLIC_FIREBASE_PROJECT_ID is missing or empty. Firebase will NOT be initialized. Ensure these are set in your Vercel project environment variables."
  );
} else {
  console.log("[Firebase Init] Required environment variables (API Key, Project ID) seem present.");
  if (!getApps().length) {
    try {
      app = initializeApp(firebaseConfig);
      console.log("[Firebase Init] Firebase app initialized successfully.");
    } catch (e: any) {
      console.error("[Firebase Init] CRITICAL Firebase Setup Error: Failed to initialize Firebase app. This might be due to invalid Firebase config values.", e.message, e.stack);
      app = undefined; // Ensure app is explicitly undefined on error
    }
  } else {
    app = getApp();
    console.log("[Firebase Init] Existing Firebase app retrieved.");
  }

  if (app) {
    try {
      db = getFirestore(app);
      console.log("[Firebase Init] Firestore instance obtained successfully.");
    } catch (e: any) {
      console.error("[Firebase Init] CRITICAL Firebase Setup Error: Failed to initialize Firestore instance. Ensure Firestore is enabled in your Firebase project.", e.message, e.stack);
      db = undefined; // Ensure db is explicitly undefined on error
    }
  } else {
    // This case means app initialization failed above or was skipped due to missing critical config
    console.error("[Firebase Init] Firebase app was not initialized (likely due to config errors). Firestore cannot be accessed.");
  }
}

export { app, db };

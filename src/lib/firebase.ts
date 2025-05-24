
import { initializeApp, getApps, getApp, type FirebaseOptions } from "firebase/app";
import { getFirestore } from "firebase/firestore";
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

// Initialize Firebase
let app;
if (!getApps().length) {
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    console.error("Firebase configuration is missing or incomplete. Check your environment variables.");
    // You might want to throw an error here or handle it more gracefully
    // For now, we'll let it proceed and potentially fail at Firestore initialization
    // to make it obvious during development if env vars are not set.
  }
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

let db;
try {
  db = getFirestore(app);
} catch (error) {
  console.error("Could not initialize Firestore. Is Firebase configured correctly and Firestore enabled in your project?", error);
  // Handle the case where db might not be initialized, e.g., by using a mock or throwing
}

// const auth = getAuth(app); // We'll use this later

export { app, db };
// export { app, db, auth }; // When auth is ready

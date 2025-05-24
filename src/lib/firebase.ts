
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// import { getAuth } from "firebase/auth"; // We'll use this later for Firebase Auth

// Your web app's Firebase configuration (Provided by user)
const firebaseConfig = {
  apiKey: "AIzaSyCAmOTx4jjRQh0ORe3SWpOtxLgGK_da81U",
  authDomain: "devconnect-l619l.firebaseapp.com",
  projectId: "devconnect-l619l",
  storageBucket: "devconnect-l619l.firebasestorage.app", // Corrected from firebasestorage.app
  messagingSenderId: "43730779152",
  appId: "1:43730779152:web:c9f2a757afcd10dc9f9e95"
  // measurementId is optional, so it's okay if it's not here
};

// Initialize Firebase
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

const db = getFirestore(app);
// const auth = getAuth(app); // We'll use this later

export { app, db };
// export { app, db, auth }; // When auth is ready

// firebase.js

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getDatabase } from 'firebase/database'; // Importing Realtime DB

const firebaseConfig = {
  apiKey: "AIzaSyDox9LvhALSqiFDI0uuouRenUoWS7s_6_g",
  authDomain: "global-24bf4.firebaseapp.com",
  projectId: "global-24bf4",
  storageBucket: "global-24bf4.appspot.com",
  messagingSenderId: "539795244110",
  appId: "1:539795244110:web:57e730468168376bedef1f",
  databaseURL: "https://global-24bf4-default-rtdb.firebaseio.com" // Realtime DB URL
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Get services
const db = getFirestore(app);          // Firestore Database
const auth = getAuth(app);             // Firebase Authentication
const storage = getStorage(app);       // Firebase Storage
const realtimeDB = getDatabase(app);  // Firebase Realtime Database

// Export services for use in other files
export { db, auth, storage, realtimeDB };

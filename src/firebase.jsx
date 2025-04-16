// src/firebase.js

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getDatabase } from 'firebase/database'; // Realtime DB

const firebaseConfig = {
  apiKey: "AIzaSyDox9LvhALSqiFDI0uuouRenUoWS7s_6_g",
  authDomain: "global-24bf4.firebaseapp.com",
  projectId: "global-24bf4",
  storageBucket: "global-24bf4.appspot.com",
  messagingSenderId: "539795244110",
  appId: "1:539795244110:web:57e730468168376bedef1f",
  databaseURL: "https://global-24bf4-default-rtdb.firebaseio.com" // IMPORTANT!
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const realtimeDB = getDatabase(app);

export { auth, db, storage, realtimeDB };

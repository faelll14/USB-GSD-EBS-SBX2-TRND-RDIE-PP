import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  limit,
  getDocs,
  orderBy,
  runTransaction,
  deleteDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBJsv-MRx7lJKqSLUyvECGyhBYjyyOUsBs",
  authDomain: "ujian-utama.firebaseapp.com",
  projectId: "ujian-utama",
  storageBucket: "ujian-utama.firebasestorage.app",
  messagingSenderId: "74155959576",
  appId: "1:74155959576:android:28c74a9721940c3687ea6d"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

window.PatSecFirebase = {
  auth,
  db,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  limit,
  getDocs,
  orderBy,
  runTransaction,
  deleteDoc,
  serverTimestamp
};

window.dispatchEvent(new Event("patsec-firebase-ready"));

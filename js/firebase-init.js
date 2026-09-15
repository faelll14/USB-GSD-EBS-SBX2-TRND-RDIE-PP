import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  collectionGroup,
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

const SECONDARY_POOL_SIZE = 6;
let secondaryPoolIndex = 0;

function getSecondaryAuth(poolIndex) {
  const name = "PatSecProvisioning_" + poolIndex;
  let secondaryApp;
  try {
    secondaryApp = getApp(name);
  } catch (e) {
    secondaryApp = initializeApp(firebaseConfig, name);
  }
  return getAuth(secondaryApp);
}

async function createAuthAccountSecondary(email, password) {
  const poolIndex = secondaryPoolIndex % SECONDARY_POOL_SIZE;
  secondaryPoolIndex++;
  const secondaryAuth = getSecondaryAuth(poolIndex);
  const result = await createUserWithEmailAndPassword(secondaryAuth, email, password);
  const uid = result.user.uid;
  await signOut(secondaryAuth);
  return uid;
}

window.PatSecFirebase = {
  auth,
  db,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  createAuthAccountSecondary,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  collectionGroup,
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

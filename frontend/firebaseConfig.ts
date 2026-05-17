import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApp, getApps, initializeApp } from "firebase/app";
import { Auth, getAuth, initializeAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// @ts-ignore
import { getReactNativePersistence } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDhY3atQAXPHbxKY3fbbpOKkbY7cTmZB-c",
  authDomain: "scrapit-authentication-631ba.firebaseapp.com",
  projectId: "scrapit-authentication-631ba",
  storageBucket: "scrapit-authentication-631ba.firebasestorage.app",
  messagingSenderId: "843829160917",
  appId: "1:843829160917:web:fbb5bde26e3a0d187ceb5c",
  measurementId: "G-L7CV4EZRFB",
};

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth with persistence for React Native
let auth: Auth;

try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch (error) {
  // Already initialized or fallback
  auth = getAuth(app);
}

// Initialize Firestore
const db = getFirestore(app);

export { app, auth, db, firebaseConfig };
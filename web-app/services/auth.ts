import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import { getFirebaseApp } from "./firebase";

// Helper to safely get Auth instance
const getAuth = () => {
    const app = getFirebaseApp();
    
    // If we have an initialized app instance, use it
    if (app) return app.auth();

    // Fallback: Check global firebase instance, but safely
    if (firebase.apps.length && typeof firebase.auth === 'function') {
        return firebase.auth();
    }
    
    return null;
};

const getDb = () => {
    const app = getFirebaseApp();
    if (!app) {
        if (firebase.apps.length && typeof firebase.firestore === 'function') {
             return firebase.firestore();
        }
        return null;
    }
    return app.firestore();
};

export const initAuth = () => {
  return getAuth();
};

export const listenToAuthChanges = (callback: (user: firebase.User | null) => void) => {
  const auth = getAuth();
  
  if (!auth) {
      // CRITICAL FIX: If Auth is missing (e.g., config error or network fail), 
      // immediately return null to the callback. This ensures the app's loading
      // state resolves to false so the UI can render in Simulation Mode.
      callback(null);
      return () => {};
  }
  
  return auth.onAuthStateChanged(callback);
};

export const signIn = (email: string, password: string) => {
  const auth = getAuth();
  if (!auth) throw new Error("Auth not initialized (Offline Mode)");
  return auth.signInWithEmailAndPassword(email, password);
};

export const signUp = async (email: string, password: string) => {
  const auth = getAuth();
  const db = getDb();

  if (!auth) throw new Error("Auth not initialized (Offline Mode)");
  
  const cred = await auth.createUserWithEmailAndPassword(email, password);
  const user = cred.user;

  if (user && db) {
    try {
      await db.collection("users").doc(user.uid).set({
        email: user.email,
        display_name: user.email?.split("@")[0] ?? "",
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
    } catch (error) {
      console.error("Error creating user profile in Firestore:", error);
    }
  }

  return cred;
};

export const logOut = () => {
  const auth = getAuth();
  if (!auth) throw new Error("Auth not initialized");
  return auth.signOut();
};
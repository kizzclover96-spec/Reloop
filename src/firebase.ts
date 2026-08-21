import { initializeApp } from "firebase/app";
import { getAuth, setPersistence, browserSessionPersistence, browserLocalPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

if (!firebaseConfig.apiKey) {
  console.warn(
    "Firebase config is missing. Copy .env.example to .env.local and fill in your project's config values."
  );
}

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

// Session-only by default: the auth session lives in sessionStorage and is
// gone the moment the tab/window closes — never sits indefinitely in
// localStorage the way Firebase's default (browserLocalPersistence) does.
// A signed-in user can opt into staying signed in via the "Remember me"
// toggle on the login screen (see setRememberMe below) — this default is
// the safe starting point, not a hard rule.
setPersistence(auth, browserSessionPersistence).catch((err) => {
  console.error("Failed to set auth persistence:", err);
});

/**
 * Called from the "Remember me" toggle before signing in/up. Must be set
 * before the actual sign-in call for it to take effect on that session.
 */
export async function setRememberMe(remember: boolean) {
  try {
    await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
  } catch (err) {
    console.error("Failed to update auth persistence:", err);
  }
}

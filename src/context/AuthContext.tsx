import React, { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithCredential,
  GoogleAuthProvider,
  OAuthProvider,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { Capacitor } from "@capacitor/core";
import { FirebaseAuthentication } from "@capacitor-firebase/authentication";
import { auth } from "../firebase";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithYahoo: () => Promise<void>;
  updateDisplayName: (name: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUp = async (email: string, password: string, displayName: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName) {
      await updateProfile(cred.user, { displayName });
    }
  };

  /**
   * Google explicitly blocks OAuth sign-in inside an embedded WebView — both
   * popup and redirect — as a security policy (the "disallowed_useragent"
   * error). This isn't a Capacitor quirk to work around with clever
   * redirect handling; it's a hard rule on Google's side, and no amount of
   * Firebase JS SDK configuration changes it. The only real fix is
   * triggering the platform's actual native Google Sign-In (a system
   * account chooser or a real browser tab, never the app's own WebView),
   * which is what @capacitor-firebase/authentication does.
   *
   * IMPORTANT: with skipNativeAuth: false, the plugin claims to sync the
   * resulting native session into the Firebase JS SDK's own auth state
   * automatically — but that's implicit, internal behavior we don't
   * control, and it can silently fail to fire onAuthStateChanged (this is
   * exactly what happened: sign-in succeeded, but the app never
   * navigated). So this doesn't rely on that — it explicitly takes the
   * idToken the native sign-in returns and completes the credential
   * exchange with the JS SDK itself via signInWithCredential(), which is
   * what actually fires onAuthStateChanged and is deterministic regardless
   * of whatever the plugin does or doesn't do internally.
   *
   * On the web (not running inside the native app), the original popup
   * flow works fine and is used unchanged.
   */
  const signInWithGoogle = async () => {
    if (Capacitor.isNativePlatform()) {
      const result = await FirebaseAuthentication.signInWithGoogle();
      const idToken = result.credential?.idToken;
      if (!idToken) {
        throw new Error("Google sign-in didn't return an ID token.");
      }
      await signInWithCredential(auth, GoogleAuthProvider.credential(idToken));
    } else {
      await signInWithPopup(auth, new GoogleAuthProvider());
    }
  };

  // Yahoo isn't a built-in Firebase provider like Google — on the web it's
  // added via the generic OAuthProvider with Yahoo's provider id. This
  // requires enabling "Yahoo" under Firebase Console → Authentication →
  // Sign-in method → Add new provider → OpenID Connect / Yahoo, with a
  // client ID and secret from Yahoo's developer console (developer.yahoo.com).
  //
  // Same explicit-credential-exchange fix as Google above, for the same
  // reason — don't depend on the plugin's implicit native-to-JS sync.
  //
  // NOTE: signInWithYahoo() below is @capacitor-firebase/authentication's
  // documented method for this provider as of when this was written — if
  // it 404s or doesn't exist on your installed plugin version, check
  // https://capawesome.io/plugins/firebase/authentication/ for the current
  // API surface, since less-common providers shift between versions more
  // than Google/Apple do.
  const signInWithYahoo = async () => {
    if (Capacitor.isNativePlatform()) {
      const result = await FirebaseAuthentication.signInWithYahoo();
      const cred = result.credential;
      if (!cred?.idToken && !cred?.accessToken) {
        throw new Error("Yahoo sign-in didn't return a usable credential.");
      }
      const provider = new OAuthProvider("yahoo.com");
      const credential = provider.credential({
        idToken: cred.idToken,
        accessToken: cred.accessToken,
      });
      await signInWithCredential(auth, credential);
    } else {
      await signInWithPopup(auth, new OAuthProvider("yahoo.com"));
    }
  };

  /**
   * Updates the Auth-level displayName — the single source of truth for a
   * user's name in this app; there's no separate copy mirrored in
   * Firestore. New listings, orders, etc. pick up the new name from here
   * automatically going forward; existing ones keep whatever name was
   * denormalized onto them at the time (same pattern as shipping
   * addresses on past orders — a snapshot, not a live reference, so past
   * activity doesn't silently change after the fact).
   *
   * onAuthStateChanged doesn't re-fire just because updateProfile() was
   * called — it mutates the existing User object in place — so the local
   * `user` state needs a genuinely new object reference here, or React's
   * setState will bail out (same reference in, same reference out) and the
   * UI won't reflect the change until the next real auth event.
   */
  const updateDisplayName = async (name: string) => {
    if (!auth.currentUser) throw new Error("Not signed in.");
    const trimmed = name.trim();
    if (!trimmed) throw new Error("Name can't be empty.");
    await updateProfile(auth.currentUser, { displayName: trimmed });
    await auth.currentUser.reload();
    setUser(auth.currentUser ? ({ ...auth.currentUser } as User) : null);
  };

  const logout = async () => {
    if (Capacitor.isNativePlatform()) {
      await FirebaseAuthentication.signOut();
    }
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signInWithGoogle, signInWithYahoo, updateDisplayName, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

// Firebase web SDK for party mode. It is loaded lazily, in the browser only, the first time a party
// page needs it, so `next build` (prerendering) and solo mode never touch Firebase.
import type { Auth } from "firebase/auth";
import type { Database } from "firebase/database";

// TODO: real config — paste the web app config from Firebase Console
// (Project settings → General → Your apps → SDK setup and configuration → Config).
// It is not a secret, so it is committed here rather than read from NEXT_PUBLIC_* env vars.
export const firebaseConfig = {
  apiKey: "TODO",
  authDomain: "TODO",
  databaseURL: "TODO",
  projectId: "TODO",
  appId: "TODO",
};

export const firebaseConfigured = !Object.values(firebaseConfig).includes("TODO");

export interface FirebaseContext {
  auth: Auth;
  authSdk: typeof import("firebase/auth");
  db: Database;
  dbSdk: typeof import("firebase/database");
}

let context: Promise<FirebaseContext> | null = null;
let serverOffset = 0;

async function init(): Promise<FirebaseContext> {
  const [appSdk, authSdk, dbSdk] = await Promise.all([
    import("firebase/app"),
    import("firebase/auth"),
    import("firebase/database"),
  ]);
  const app = appSdk.getApps()[0] ?? appSdk.initializeApp(firebaseConfig);
  let auth: Auth;
  try {
    // Session persistence: one anonymous player per browser tab, kept across reloads of that tab.
    auth = authSdk.initializeAuth(app, { persistence: authSdk.browserSessionPersistence });
  } catch {
    auth = authSdk.getAuth(app); // already initialised (dev hot reload)
  }
  const db = dbSdk.getDatabase(app);
  dbSdk.onValue(dbSdk.ref(db, ".info/serverTimeOffset"), (snap) => {
    serverOffset = Number(snap.val()) || 0;
  });
  return { auth, authSdk, db, dbSdk };
}

export function firebase(): Promise<FirebaseContext> {
  if (typeof window === "undefined") return Promise.reject(new Error("Firebase chỉ chạy trên trình duyệt."));
  if (!firebaseConfigured) return Promise.reject(new Error("Firebase chưa được cấu hình (app/party/firebase.ts)."));
  if (!context) {
    context = init();
    context.catch(() => {
      context = null; // allow a retry after a failed load
    });
  }
  return context;
}

/** The current user's uid, signing in anonymously if needed. */
export async function ensureSignedIn(): Promise<string> {
  const { auth, authSdk } = await firebase();
  await auth.authStateReady();
  if (auth.currentUser) return auth.currentUser.uid;
  const cred = await authSdk.signInAnonymously(auth);
  return cred.user.uid;
}

/** Firebase server time in ms (local clock corrected by `.info/serverTimeOffset`). */
export function serverNow(): number {
  return Date.now() + serverOffset;
}

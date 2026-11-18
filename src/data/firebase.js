/**
 * The Firebase app shared by the analysis cache and the Tradeviser account (sign-in and cloud
 * API keys). It's the same Firebase project as Tradeviser, so the same Google accounts and uids.
 *
 * Optional: without the VITE_FIREBASE_* settings (.env.local) db and auth are null and the app
 * works without the shared cache or sign-in.
 */
import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const env = import.meta.env;
const config = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: env.VITE_FIREBASE_DATABASE_URL,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};

let db = null;
let auth = null;
if (config.databaseURL && config.apiKey) {
  try {
    const app = initializeApp(config);
    db = getDatabase(app);
    if (config.authDomain) auth = getAuth(app);
  } catch (e) {
    console.warn('Firebase unavailable:', e);
  }
}

export { db, auth };
export const googleProvider = new GoogleAuthProvider();

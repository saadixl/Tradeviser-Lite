/**
 * The Tradeviser account (Google sign-in, same Firebase project as Tradeviser) and which API key
 * each provider uses: this browser's, or the one saved in the account when "Use keys from cloud"
 * is on. Components read it through useAccount() and useApiKey().
 */
import { useSyncExternalStore } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut as fbSignOut } from 'firebase/auth';
import { auth, googleProvider } from './firebase';
import { loadApiKey, loadAllApiKeys, onLocalKeysChange } from './providers';
import { saveCloudKeys, deleteCloudKeys, subscribeCloudKeys } from './cloudKeys';

const USE_CLOUD_PREF = 'tradeviser-lite:use-cloud-keys';

export const accountEnabled = Boolean(auth);

function loadUseCloud() {
  try {
    return localStorage.getItem(USE_CLOUD_PREF) === '1';
  } catch {
    return false;
  }
}

let state = {
  authReady: !auth,
  user: null, // { uid, name, email, photoURL }
  useCloud: loadUseCloud(),
  cloud: null, // { keys, updatedAt } once loaded for the signed-in user
  cloudError: null,
  localVersion: 0,
};
const listeners = new Set();
const setState = (patch) => {
  state = { ...state, ...patch };
  listeners.forEach((fn) => fn());
};
const subscribe = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

onLocalKeysChange(() => setState({ localVersion: state.localVersion + 1 }));

let unsubCloud = null;
if (auth) {
  onAuthStateChanged(auth, (u) => {
    unsubCloud?.();
    unsubCloud = null;
    setState({
      authReady: true,
      user: u ? { uid: u.uid, name: u.displayName, email: u.email, photoURL: u.photoURL } : null,
      cloud: null,
      cloudError: null,
    });
    if (u) {
      unsubCloud = subscribeCloudKeys(
        u.uid,
        (cloud) => setState({ cloud, cloudError: null }),
        (e) => setState({ cloud: { keys: {}, updatedAt: {} }, cloudError: e?.message || 'Could not load cloud keys' })
      );
    }
  });
}

export function useAccount() {
  return useSyncExternalStore(subscribe, () => state);
}

/** The key an analysis uses for this provider, and where it came from ('cloud' | 'local' | null). */
export function activeApiKey(provider, s = state) {
  const cloudKey = s.user && s.useCloud ? s.cloud?.keys?.[provider] : '';
  if (cloudKey) return { key: cloudKey, source: 'cloud' };
  const local = loadApiKey(provider);
  return { key: local, source: local ? 'local' : null };
}

export function useApiKey(provider) {
  const s = useAccount();
  return activeApiKey(provider, s);
}

export async function signIn() {
  await signInWithPopup(auth, googleProvider);
}

export async function signOut() {
  await fbSignOut(auth);
}

export function setUseCloud(on) {
  try {
    if (on) localStorage.setItem(USE_CLOUD_PREF, '1');
    else localStorage.removeItem(USE_CLOUD_PREF);
  } catch {
    /* ignore */
  }
  setState({ useCloud: on });
}

/** Encrypts this browser's keys and saves them to the signed-in account. */
export async function uploadLocalKeys() {
  if (!state.user) throw new Error('Sign in first.');
  await saveCloudKeys(state.user.uid, loadAllApiKeys());
}

export async function removeCloudKeys() {
  if (!state.user) throw new Error('Sign in first.');
  await deleteCloudKeys(state.user.uid);
}

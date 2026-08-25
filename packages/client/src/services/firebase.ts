import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  Auth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import {
  getFirestore,
  Firestore,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
  query,
  where,
  limit
} from 'firebase/firestore';
import { getFunctions, Functions, httpsCallable } from 'firebase/functions';
import {
  getStorage,
  FirebaseStorage,
  ref as storageRef,
  uploadString,
  getDownloadURL,
  getBytes,
  deleteObject,
  listAll
} from 'firebase/storage';
import { getFirebaseConfig, isFirebaseConfigured } from './configService';

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;
let functionsInstance: Functions | null = null;

export type UserRole = 'super_admin' | 'creator';

export interface AuthorUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isAnonymous?: boolean;
  role?: UserRole;
  createdAt?: number;
  updatedAt?: number;
}

const LOCAL_USER_KEY = 'serverless_tour_local_user';

export function initFirebase() {
  if (getApps().length > 0) {
    app = getApps()[0];
    auth = getAuth(app);
    db = getFirestore(app);
    try {
      storage = getStorage(app);
    } catch {
      // Storage init optional
    }
    try {
      functionsInstance = getFunctions(app);
    } catch {
      // Functions init optional
    }
    return { app, auth, db, storage, functions: functionsInstance };
  }

  const config = getFirebaseConfig();
  if (isFirebaseConfigured()) {
    try {
      app = initializeApp(config);
      auth = getAuth(app);
      db = getFirestore(app);
      try {
        storage = getStorage(app);
      } catch {
        // Storage init optional
      }
      try {
        functionsInstance = getFunctions(app);
      } catch {
        // Functions init optional
      }
    } catch (err) {
      console.warn('Firebase initialization failed, falling back to local simulated storage:', err);
    }
  }

  return { app, auth, db, storage, functions: functionsInstance };
}

initFirebase();

export { app, auth, db, storage, functionsInstance as functions };

export function getLocalUser(): AuthorUser | null {
  const data = localStorage.getItem(LOCAL_USER_KEY);
  if (data) {
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }
  return null;
}

export function setLocalUser(user: AuthorUser | null): void {
  if (user) {
    localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(LOCAL_USER_KEY);
  }
}

/**
 * Synchronize user profile and role with Firestore /users/{uid} document.
 * Strictly verifies existing pre-provisioned access. Does NOT create pending request documents.
 */
export async function syncUserProfile(u: User): Promise<AuthorUser> {
  const { db: currentDb, auth: currentAuth } = initFirebase();
  let role: UserRole | null = null;
  const userEmail = (u.email || '').toLowerCase();

  if (currentDb) {
    try {
      // 1. Direct UID document lookup
      const userDocRef = doc(currentDb, 'users', u.uid);
      const snap = await getDoc(userDocRef);

      if (snap.exists()) {
        const data = snap.data();
        const r = data.role as string;
        if (r === 'super_admin' || r === 'creator') {
          role = r as UserRole;
          // Update display name & photo in background
          setDoc(userDocRef, {
            displayName: u.displayName || data.displayName || userEmail.split('@')[0],
            photoURL: u.photoURL || data.photoURL || '',
            updatedAt: Date.now()
          }, { merge: true }).catch(() => {});
        }
      } else if (userEmail) {
        // 2. Lookup by email pre-provisioned in /users
        const usersCol = collection(currentDb, 'users');
        const q = query(usersCol, where('email', '==', userEmail), limit(1));
        const emailSnap = await getDocs(q);

        if (!emailSnap.empty) {
          const preDoc = emailSnap.docs[0];
          const preData = preDoc.data();
          const r = preData.role as string;
          if (r === 'super_admin' || r === 'creator') {
            role = r as UserRole;
            // Link real Firebase UID to document
            await setDoc(userDocRef, {
              uid: u.uid,
              email: userEmail,
              displayName: u.displayName || preData.displayName || userEmail.split('@')[0],
              photoURL: u.photoURL || preData.photoURL || '',
              role,
              createdAt: preData.createdAt || Date.now(),
              updatedAt: Date.now()
            }, { merge: true });

            if (preDoc.id !== u.uid) {
              await deleteDoc(doc(currentDb, 'users', preDoc.id)).catch(() => {});
            }
          }
        } else {
          // 3. First-user self-bootstrapping: if /users is totally empty, make first user super_admin
          const countSnap = await getDocs(usersCol);
          if (countSnap.empty) {
            role = 'super_admin';
            await setDoc(userDocRef, {
              uid: u.uid,
              email: userEmail,
              displayName: u.displayName || userEmail.split('@')[0] || 'Super Admin',
              photoURL: u.photoURL || '',
              role: 'super_admin',
              createdAt: Date.now(),
              updatedAt: Date.now()
            });
          }
        }
      }
    } catch (err) {
      console.warn('Firestore user profile sync check notice:', err);
    }
  }

  // If user is not authorized, sign them out immediately and reject
  if (!role) {
    if (currentAuth) {
      await fbSignOut(currentAuth).catch(() => {});
    }
    setLocalUser(null);
    throw new Error('ACCESS_DENIED: Your account does not have permission to access NAVIGATE Studio. Please contact the Super Admin.');
  }

  const authorUser: AuthorUser = {
    uid: u.uid,
    email: u.email,
    displayName: u.displayName || userEmail.split('@')[0] || 'Creator',
    photoURL: u.photoURL,
    role
  };

  setLocalUser(authorUser);
  return authorUser;
}

/**
 * Fetch all registered users directly from Firestore /users collection or Cloud Function
 */
export async function fetchUsersFromFirestore(): Promise<AuthorUser[]> {
  const { db: currentDb, functions: currentFunctions } = initFirebase();

  // 1. Try secure Cloud Function (Super Admin only)
  if (currentFunctions) {
    try {
      const fn = httpsCallable<void, { users: any[] }>(currentFunctions, 'listUsers');
      const res = await fn();
      if (res.data?.users && Array.isArray(res.data.users)) {
        return res.data.users
          .filter((u) => u.role === 'super_admin' || u.role === 'creator')
          .map((u) => ({
            uid: u.uid || u.id,
            email: u.email || null,
            displayName: u.displayName || null,
            photoURL: u.photoURL || null,
            role: u.role as UserRole,
            createdAt: u.createdAt,
            updatedAt: u.updatedAt
          }));
      }
    } catch {
      // Fallback to direct Firestore query
    }
  }

  // 2. Direct Firestore query fallback
  if (currentDb) {
    try {
      const usersCol = collection(currentDb, 'users');
      const snap = await getDocs(usersCol);
      return snap.docs
        .map((d) => {
          const data = d.data();
          return {
            uid: d.id,
            email: data.email || null,
            displayName: data.displayName || null,
            photoURL: data.photoURL || null,
            role: data.role as UserRole,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt
          };
        })
        .filter((u) => u.role === 'super_admin' || u.role === 'creator');
    } catch (err) {
      console.warn('Direct Firestore users fetch notice:', err);
    }
  }

  return [];
}

/**
 * Call secure Firebase Cloud Function: setUserRole
 */
export async function callSetUserRole(
  targetUid: string,
  role: UserRole,
  email?: string,
  displayName?: string
): Promise<boolean> {
  const { functions: currentFunctions, db: currentDb } = initFirebase();

  // Try via Cloud Function
  if (currentFunctions) {
    try {
      const fn = httpsCallable<
        { targetUid: string; role: string; email?: string; displayName?: string },
        { success: boolean }
      >(currentFunctions, 'setUserRole');
      const res = await fn({ targetUid, role, email, displayName });
      return res.data.success;
    } catch (err) {
      console.warn('Cloud Function setUserRole notice, attempting direct Firestore write:', err);
    }
  }

  // Direct Firestore write fallback (if permissions allow)
  if (currentDb) {
    try {
      const userRef = doc(currentDb, 'users', targetUid);
      await setDoc(
        userRef,
        {
          uid: targetUid,
          ...(email ? { email: email.toLowerCase() } : {}),
          ...(displayName ? { displayName } : {}),
          role,
          updatedAt: Date.now()
        },
        { merge: true }
      );
      return true;
    } catch (err) {
      console.error('Direct Firestore role update failed:', err);
    }
  }

  return false;
}

/**
 * Delete / revoke a user document from Firestore
 */
export async function deleteUserFromFirestore(targetUid: string): Promise<boolean> {
  const { functions: currentFunctions, db: currentDb } = initFirebase();

  if (currentFunctions) {
    try {
      const fn = httpsCallable<{ targetUid: string }, { success: boolean }>(currentFunctions, 'deleteUser');
      const res = await fn({ targetUid });
      return res.data.success;
    } catch (err) {
      console.warn('Cloud Function deleteUser error, trying direct Firestore delete:', err);
    }
  }

  if (currentDb) {
    try {
      const userRef = doc(currentDb, 'users', targetUid);
      await deleteDoc(userRef);
      return true;
    } catch (err) {
      console.error('Direct Firestore user delete failed:', err);
    }
  }

  return false;
}

/**
 * Upload a DOM snapshot directly to Firebase Storage bucket as draft stopgap
 */
export async function uploadSnapshotToFirebaseStorage(
  demoId: string,
  stepId: string,
  snapshot: any
): Promise<string | null> {
  if (!storage) return null;
  try {
    const sRef = storageRef(storage, `drafts/${demoId}/snapshots/${stepId}.json`);
    const jsonStr = JSON.stringify(snapshot);
    await uploadString(sRef, jsonStr, 'raw', {
      contentType: 'application/json',
      cacheControl: 'public, max-age=3600'
    });
    return await getDownloadURL(sRef);
  } catch (err) {
    console.warn('Firebase Storage snapshot upload note:', err);
    return null;
  }
}

/**
 * Download a DOM snapshot directly from Firebase Storage bucket for cross-device draft editing
 */
export async function downloadSnapshotFromFirebaseStorage(
  demoId: string,
  snapshotKeyOrUrl: string
): Promise<any | null> {
  const cleanKey = snapshotKeyOrUrl
    .replace(/^local:\/\/snapshots\/[^/]+\//, '')
    .replace(/^https?:\/\/[^/]+\/drafts\/[^/]+\/snapshots\//, '')
    .replace(/\.json$/, '');

  const candidateKeys = [cleanKey, snapshotKeyOrUrl];

  // 1. Try Firebase Storage SDK getBytes
  if (storage) {
    for (const k of candidateKeys) {
      try {
        const sRef = storageRef(storage, `drafts/${demoId}/snapshots/${k}.json`);
        const buffer = await getBytes(sRef);
        const text = new TextDecoder('utf-8').decode(buffer);
        return JSON.parse(text);
      } catch {}
    }
  }

  // 2. Try zero-CORS server-side Cloud Function
  if (functionsInstance) {
    try {
      const callable = httpsCallable<{ demoId: string; stepId: string }, any>(
        functionsInstance,
        'getDraftSnapshot'
      );
      const res = await callable({ demoId, stepId: cleanKey });
      if (res?.data) {
        return res.data;
      }
    } catch {}
  }

  // 3. Try fetch with download URL fallback
  if (storage) {
    for (const k of candidateKeys) {
      try {
        const sRef = storageRef(storage, `drafts/${demoId}/snapshots/${k}.json`);
        const url = await getDownloadURL(sRef);
        const res = await fetch(url);
        if (res.ok) {
          return await res.json();
        }
      } catch {}
    }
  }

  return null;
}

/**
 * Clean up all draft snapshots for a demo in Firebase Storage
 */
export async function deleteDemoFromFirebaseStorage(demoId: string): Promise<void> {
  if (!storage) return;
  try {
    const folderRef = storageRef(storage, `drafts/${demoId}/snapshots`);
    const res = await listAll(folderRef);
    await Promise.all(res.items.map((item) => deleteObject(item)));
  } catch (err) {
    console.warn('Firebase Storage deleteDemo note:', err);
  }
}

/**
 * Call secure Firebase Cloud Function: getPresignedUploadUrl
 */
export async function callGetPresignedUploadUrl(
  demoId: string,
  stepId: string
): Promise<{ uploadUrl: string; publicUrl: string; key: string } | null> {
  if (!functionsInstance) return null;
  try {
    const fn = httpsCallable<{ demoId: string; stepId: string }, { uploadUrl: string; publicUrl: string; key: string }>(
      functionsInstance,
      'getPresignedUploadUrl'
    );
    const res = await fn({ demoId, stepId });
    return res.data;
  } catch (err) {
    console.warn('Cloud Function getPresignedUploadUrl call failed:', err);
    return null;
  }
}

/**
 * Call secure Firebase Cloud Function: publishTourManifest
 */
export async function callPublishTourManifest(
  demoId: string,
  manifest: any,
  snapshots?: Record<string, any>
): Promise<{ success: boolean; manifestUrl: string } | null> {
  if (!functionsInstance) return null;
  try {
    const fn = httpsCallable<{ demoId: string; manifest: any; snapshots?: Record<string, any> }, { success: boolean; manifestUrl: string }>(
      functionsInstance,
      'publishTourManifest'
    );
    const res = await fn({ demoId, manifest, snapshots });
    return res.data;
  } catch (err) {
    console.warn('Cloud Function publishTourManifest call failed:', err);
    return null;
  }
}

/**
 * Call secure Firebase Cloud Function: deleteTourAssets
 */
export async function callDeleteTourAssets(demoId: string): Promise<{ success: boolean } | null> {
  if (!functionsInstance) return null;
  try {
    const fn = httpsCallable<{ demoId: string }, { success: boolean }>(
      functionsInstance,
      'deleteTourAssets'
    );
    const res = await fn({ demoId });
    return res.data;
  } catch (err) {
    console.warn('Cloud Function deleteTourAssets call failed:', err);
    return null;
  }
}

/**
 * Sign in using Firebase or Local Mock Mode
 */
export async function loginWithEmail(email: string, pass: string): Promise<AuthorUser> {
  const { auth: currentAuth } = initFirebase();
  const cleanEmail = email.trim();

  if (currentAuth) {
    try {
      const cred = await signInWithEmailAndPassword(currentAuth, cleanEmail, pass);
      return await syncUserProfile(cred.user);
    } catch (err: any) {
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        try {
          const cred = await createUserWithEmailAndPassword(currentAuth, cleanEmail, pass);
          return await syncUserProfile(cred.user);
        } catch {
          throw err;
        }
      }
      throw err;
    }
  }

  throw new Error("Firebase auth not configured");
}

export async function loginWithGoogle(): Promise<AuthorUser> {
  const { auth: currentAuth } = initFirebase();
  if (currentAuth) {
    const provider = new GoogleAuthProvider();
    const cred = await signInWithPopup(currentAuth, provider);
    return await syncUserProfile(cred.user);
  }

  throw new Error("Firebase auth not configured");
}

export async function logoutAuthor(): Promise<void> {
  const { auth: currentAuth } = initFirebase();
  if (currentAuth) {
    try {
      await fbSignOut(currentAuth);
    } catch (e) {
      console.warn(e);
    }
  }
  setLocalUser(null);
}

export function subscribeAuthState(callback: (user: AuthorUser | null) => void): () => void {
  const { auth: currentAuth } = initFirebase();
  if (currentAuth) {
    return onAuthStateChanged(currentAuth, async (u: User | null) => {
      if (u) {
        try {
          const userObj = await syncUserProfile(u);
          callback(userObj);
        } catch {
          setLocalUser(null);
          callback(null);
        }
      } else {
        setLocalUser(null);
        callback(null);
      }
    });
  }

  // Without Firebase configured, no user is logged in
  callback(null);
  return () => {};
}

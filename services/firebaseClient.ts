import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, signInAnonymously, Auth } from 'firebase/auth';
import { getFirestore, collection, addDoc, serverTimestamp, setDoc, doc, Firestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

let app: FirebaseApp | null = null;
export let db: Firestore | null = null;
export let auth: Auth | null = null;

try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
} catch (e) {
  console.warn("Firebase could not be initialized, continuing locally.", e);
}

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
      tenantId: auth?.currentUser?.tenantId,
      providerInfo: auth?.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  // DO NOT throw, to prevent crashing the app in an iframe
  // throw new Error(JSON.stringify(errInfo));
}

export async function linkWithGoogle() {
  if (!auth) throw new Error("Authentication module failed to initialize (usually due to privacy blockers).");
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("No user is currently signed in.");
  
  if (currentUser.isAnonymous) {
    const { GoogleAuthProvider, linkWithPopup } = await import('firebase/auth');
    const provider = new GoogleAuthProvider();
    try {
      await linkWithPopup(currentUser, provider);
    } catch(error) {
      handleFirestoreError(error, OperationType.UPDATE, 'auth');
    }
  } else {
    throw new Error("User is already a permanent account.");
  }
}

export async function loginWithGoogle() {
  if (!auth) throw new Error("Authentication module failed to initialize (usually due to privacy blockers).");
  const { GoogleAuthProvider, signInWithPopup } = await import('firebase/auth');
  const provider = new GoogleAuthProvider();
  try {
    await signInWithPopup(auth, provider);
  } catch(error) {
    handleFirestoreError(error, OperationType.GET, 'auth');
  }
}

export async function logout() {
  if (auth) await auth.signOut();
}

export async function logSearchEvent(input: any) {
  try {
    if (!auth || !db) return;
    let currentUser = auth.currentUser;
    if (!currentUser) {
      // First try logging in anonymously
      const cred = await signInAnonymously(auth);
      currentUser = cred.user;
    }

    const path = `searches`;
    const searchId = crypto.randomUUID();
    await setDoc(doc(db, path, searchId), {
      userId: currentUser.uid,
      location: input.location,
      category: input.category,
      pricingTier: input.pricingTier,
      currency: input.currency,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'searches');
  }
}

import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  collection, 
  deleteDoc,
  enableIndexedDbPersistence
} from "firebase/firestore";
import { getAuth, signInAnonymously } from "firebase/auth";

export const firebaseConfig = {
  apiKey: (import.meta as any).env?.VITE_FIREBASE_API_KEY || "AIzaSyCbD6Ysr6LjG-1imDH9D7YVfPE7E6E7648",
  authDomain: (import.meta as any).env?.VITE_FIREBASE_AUTH_DOMAIN || "ta-contingency-railway.firebaseapp.com",
  projectId: (import.meta as any).env?.VITE_FIREBASE_PROJECT_ID || "ta-contingency-railway",
  storageBucket: (import.meta as any).env?.VITE_FIREBASE_STORAGE_BUCKET || "ta-contingency-railway.firebasestorage.app",
  messagingSenderId: (import.meta as any).env?.VITE_FIREBASE_MESSAGING_SENDER_ID || "414726402240",
  appId: (import.meta as any).env?.VITE_FIREBASE_APP_ID || "1:414726402240:web:8afb69f95649b98a2d3d25",
  measurementId: (import.meta as any).env?.VITE_FIREBASE_MEASUREMENT_ID || "G-72E8ZEJCYS"
};

// Initialize Firebase App safely
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// Attempt anonymous sign-in in the background so Firestore rules can require auth if needed
try {
  signInAnonymously(auth).catch(() => {
    // optional, ignore if anonymous auth is not enabled in Firebase console yet
  });
} catch {
  // ignore
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    isAnonymous?: boolean | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path,
  };
  console.warn('Firestore Operation Notification:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// User Profile Service
export interface FirebaseUser {
  hrmsId: string;
  name: string;
  desig?: string;
  dept?: string;
  hq?: string;
  level?: string;
  createdAt?: string;
  updatedAt?: string;
}

export async function getFirebaseUser(hrmsId: string): Promise<FirebaseUser | null> {
  const cleanId = hrmsId.trim().toUpperCase();
  const path = `users/${cleanId}`;
  try {
    const docRef = doc(db, 'users', cleanId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as FirebaseUser;
    }
    return null;
  } catch (error) {
    // If permission or network issue, fallback to localStorage cache
    console.warn('Firebase getDoc notice:', error);
    return null;
  }
}

export async function saveFirebaseUser(user: FirebaseUser): Promise<void> {
  const cleanId = user.hrmsId.trim().toUpperCase();
  const path = `users/${cleanId}`;
  try {
    const docRef = doc(db, 'users', cleanId);
    await setDoc(docRef, {
      ...user,
      hrmsId: cleanId,
      updatedAt: new Date().toISOString(),
      createdAt: user.createdAt || new Date().toISOString(),
    }, { merge: true });
  } catch (error) {
    console.warn('Firebase setDoc notice:', error);
    // Don't crash frontend; localStorage will retain state
  }
}

// Bills / Claims Service
export async function getFirebaseBills(hrmsId: string): Promise<any[]> {
  const cleanId = hrmsId.trim().toUpperCase();
  const path = `users/${cleanId}/bills`;
  try {
    const colRef = collection(db, 'users', cleanId, 'bills');
    const snap = await getDocs(colRef);
    const bills: any[] = [];
    snap.forEach((d) => {
      bills.push(d.data());
    });
    return bills;
  } catch (error) {
    console.warn('Firebase getDocs notice:', error);
    return [];
  }
}

export async function saveFirebaseBill(hrmsId: string, bill: { id: string; title: string; state: any }): Promise<void> {
  const cleanId = hrmsId.trim().toUpperCase();
  const path = `users/${cleanId}/bills/${bill.id}`;
  try {
    const docRef = doc(db, 'users', cleanId, 'bills', bill.id);
    await setDoc(docRef, {
      id: bill.id,
      title: bill.title,
      state: bill.state,
      hrmsId: cleanId,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (error) {
    console.warn('Firebase saveBill notice:', error);
  }
}

export async function deleteFirebaseBill(hrmsId: string, billId: string): Promise<void> {
  const cleanId = hrmsId.trim().toUpperCase();
  const path = `users/${cleanId}/bills/${billId}`;
  try {
    const docRef = doc(db, 'users', cleanId, 'bills', billId);
    await deleteDoc(docRef);
  } catch (error) {
    console.warn('Firebase deleteBill notice:', error);
  }
}

export async function testFirebaseConnection(): Promise<{ success: boolean; message: string; projectId: string }> {
  try {
    // Test read
    const testDoc = doc(db, '_connection_test', 'ping');
    await getDoc(testDoc);
    return {
      success: true,
      message: `Connected successfully to Firebase Firestore (${firebaseConfig.projectId})`,
      projectId: firebaseConfig.projectId,
    };
  } catch (err: any) {
    // If error is permission-denied, the project exists and is reachable!
    if (err.code === 'permission-denied') {
      return {
        success: true,
        message: `Connected to Firebase project "${firebaseConfig.projectId}". (Ensure Firestore security rules are applied in Firebase Console).`,
        projectId: firebaseConfig.projectId,
      };
    }
    return {
      success: false,
      message: `Firebase error: ${err.message || 'Unable to connect to Firestore.'}`,
      projectId: firebaseConfig.projectId,
    };
  }
}

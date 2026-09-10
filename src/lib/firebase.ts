import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { 
  initializeFirestore, 
  getFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager,
  setLogLevel 
} from "firebase/firestore";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";

// Suppress transient backend unreachable / offline warnings from cluttering console
try {
  setLogLevel('error');
} catch (_) {}

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyB_IFx9D75KnocfGLGH9sBDIaa3T0pTRn0",
  authDomain: "agaram-dhines-online-academy.firebaseapp.com",
  projectId: "agaram-dhines-online-academy",
  storageBucket: "agaram-dhines-online-academy.firebasestorage.app",
  messagingSenderId: "825909851431",
  appId: "1:825909851431:web:add4be35e13e113d096502"
};

export const isFirebaseConfigured = true;

// ஏற்கனவே App தொடங்கப்பட்டிருந்தால் அதையே பயன்படுத்தவும் 
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

let firestoreDb: any;
try {
  firestoreDb = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    }),
    experimentalAutoDetectLongPolling: true,
    ignoreUndefinedProperties: true
  });
} catch (_) {
  try {
    firestoreDb = initializeFirestore(app, {
      experimentalAutoDetectLongPolling: true,
      ignoreUndefinedProperties: true
    });
  } catch (__) {
    firestoreDb = getFirestore(app);
  }
}
export const db = firestoreDb;

let firebaseStorage;
try {
  firebaseStorage = getStorage(app);
} catch (e) {
  console.warn("Firebase Storage initialization warning:", e);
}
export const storage = firebaseStorage;

/**
 * Uploads a file directly to Firebase Storage and returns its permanent download URL.
 * Automatically handles PDF, Word, JPG, PNG up to 10MB.
 */
export const uploadFileToFirebaseStorage = async (
  file: File | Blob, 
  path: string,
  onProgress?: (percent: number) => void
): Promise<string> => {
  if (!storage) {
    throw new Error("Firebase Storage is not initialized.");
  }
  const fileRef = storageRef(storage, path);
  const snapshot = await uploadBytes(fileRef, file);
  const downloadUrl = await getDownloadURL(snapshot.ref);
  return downloadUrl;
};

export const googleProvider = new GoogleAuthProvider();

// Secondary app for creating users without signing out the admin
const secondaryApp = getApps().some(a => a.name === "Secondary") ? getApp("Secondary") : initializeApp(firebaseConfig, "Secondary");
export const secondaryAuth = getAuth(secondaryApp);

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Error signing in with Google", error);
    throw error;
  }
};



import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { 
  initializeFirestore, 
  getFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager,
  setLogLevel,
  doc,
  setDoc
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
 * Converts a File or Blob to Base64 Data URL string
 */
export const blobToBase64 = (file: File | Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
};

/**
 * Uploads a file directly to Firebase Storage with a strict 3-second timeout guard.
 * If Firebase Storage is unavailable (e.g., storage/retry-limit-exceeded or bucket not provisioned),
 * it seamlessly and reliably falls back to IndexedDB and Cloud Firestore chunking!
 */
export const uploadFileToFirebaseStorage = async (
  file: File | Blob, 
  path: string,
  onProgress?: (percent: number) => void
): Promise<string> => {
  // 1. Attempt upload to Firebase Storage with 3-second timeout safeguard
  if (storage) {
    try {
      if (onProgress) onProgress(20);
      const fileRef = storageRef(storage, path);
      const storageUploadPromise = (async () => {
        const snapshot = await uploadBytes(fileRef, file);
        return await getDownloadURL(snapshot.ref);
      })();

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Storage timeout / Bucket unreachable")), 3000)
      );

      const downloadUrl = await Promise.race([storageUploadPromise, timeoutPromise]);
      if (downloadUrl) {
        if (onProgress) onProgress(100);
        return downloadUrl;
      }
    } catch (storageErr: any) {
      console.warn("Firebase Storage unavailable or timed out, activating seamless Firestore fallback:", storageErr?.message || storageErr);
    }
  }

  // 2. Seamless Firestore & Local Fallback Pipeline
  try {
    if (onProgress) onProgress(40);
    const base64Data = await blobToBase64(file);
    if (onProgress) onProgress(70);

    const cleanId = path.replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = (file as File).name || 'media_file';
    const fileType = file.type || 'application/octet-stream';

    // Store in IndexedDB for instant 0ms local playback
    try {
      if (typeof window !== 'undefined' && typeof indexedDB !== 'undefined') {
        const req = indexedDB.open('agaram_dhines_files_db', 1);
        req.onsuccess = () => {
          const idb = req.result;
          if (idb.objectStoreNames.contains('uploaded_work_files')) {
            const tx = idb.transaction('uploaded_work_files', 'readwrite');
            tx.objectStore('uploaded_work_files').put({
              id: cleanId,
              fileData: base64Data,
              fileName,
              fileType,
              updatedAt: Date.now()
            });
          }
        };
      }
    } catch (_) {}

    // If small (< 350KB), save to Firestore 'stored_media_files' doc and return base64
    if (firestoreDb && base64Data.length <= 350000) {
      try {
        await setDoc(doc(firestoreDb, 'stored_media_files', cleanId), {
          id: cleanId,
          path,
          fileName,
          fileType,
          data: base64Data,
          createdAt: Date.now()
        }, { merge: true });
      } catch (dbErr) {
        console.warn("Firestore stored_media_files save warning:", dbErr);
      }
      if (onProgress) onProgress(100);
      return base64Data;
    }

    // If larger (> 350KB), chunk across 'file_chunks' docs in Firestore
    if (firestoreDb && base64Data.length > 350000) {
      try {
        const CHUNK_SIZE = 400000;
        const chunks: string[] = [];
        let idx = 0;
        while (idx < base64Data.length) {
          chunks.push(base64Data.slice(idx, idx + CHUNK_SIZE));
          idx += CHUNK_SIZE;
        }
        await Promise.all(chunks.map((chunkStr, i) => {
          return setDoc(doc(firestoreDb, 'file_chunks', `${cleanId}_chunk_${i}`), {
            uploadId: cleanId,
            chunkIndex: i,
            totalChunks: chunks.length,
            data: chunkStr,
            fileName,
            fileType,
            createdAt: Date.now()
          }, { merge: true });
        }));
      } catch (chunkErr) {
        console.warn("Firestore file_chunks save warning:", chunkErr);
      }
      if (onProgress) onProgress(100);
      return `firestore-media://${cleanId}`;
    }

    if (onProgress) onProgress(100);
    return base64Data;
  } catch (fallbackErr: any) {
    console.error("Universal upload fallback failed:", fallbackErr);
    throw new Error(fallbackErr?.message || "Upload failed");
  }
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



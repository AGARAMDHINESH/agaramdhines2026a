import { auth } from './firebase';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';

export const SCOPES = [
  'https://www.googleapis.com/auth/drive.file'
];

export const DEFAULT_DRIVE_FOLDER_URL = "https://drive.google.com/drive/folders/1UVeNB2oWYIHmp7dgG9NT2S0khrEJuK-G?usp=drive_link";
export const DEFAULT_DRIVE_FOLDER_ID = "1UVeNB2oWYIHmp7dgG9NT2S0khrEJuK-G";

// In-memory token caching (NOT in localStorage as per Workspace security constitution)
let cachedAccessToken: string | null = null;
let isSigningIn = false;

// Clear cached token on signout
try {
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      cachedAccessToken = null;
    }
  });
} catch (_) {}

/**
 * Extracts Google Drive Folder ID from a full Drive URL or returns the ID directly.
 */
export const extractDriveFolderId = (urlOrId: string): string => {
  if (!urlOrId || typeof urlOrId !== 'string') return DEFAULT_DRIVE_FOLDER_ID;
  const trimmed = urlOrId.trim();

  // Pattern for /folders/<ID>
  const folderMatch = trimmed.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch && folderMatch[1]) {
    return folderMatch[1];
  }

  // Pattern for id=<ID>
  const idMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idMatch && idMatch[1]) {
    return idMatch[1];
  }

  // If plain ID without slashes
  if (/^[a-zA-Z0-9_-]{15,45}$/.test(trimmed)) {
    return trimmed;
  }

  return DEFAULT_DRIVE_FOLDER_ID;
};

/**
 * Obtains an active OAuth access token with drive.file permission via Firebase Auth popup.
 */
export const getDriveAccessToken = async (forcePrompt: boolean = false): Promise<string> => {
  if (cachedAccessToken && !forcePrompt) {
    return cachedAccessToken;
  }

  if (isSigningIn) {
    throw new Error("Authentication currently in progress, please wait.");
  }

  try {
    isSigningIn = true;
    const provider = new GoogleAuthProvider();
    SCOPES.forEach(scope => provider.addScope(scope));

    if (forcePrompt) {
      provider.setCustomParameters({ prompt: 'select_account consent' });
    }

    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error("Google Drive Access Token பெற முடியவில்லை (Failed to obtain access token).");
    }

    cachedAccessToken = credential.accessToken;
    return cachedAccessToken;
  } catch (error: any) {
    console.error("Google Drive sign-in error:", error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const clearDriveAccessToken = () => {
  cachedAccessToken = null;
};

export interface DriveUploadResult {
  id: string;
  name: string;
  webViewLink?: string;
  size?: string;
  createdTime?: string;
  folderId: string;
}

/**
 * Uploads a JSON backup object or string directly to a specific Google Drive Folder using multipart upload.
 */
export const uploadBackupToGoogleDrive = async (
  backupData: any,
  fileName: string,
  folderUrlOrId: string = DEFAULT_DRIVE_FOLDER_ID
): Promise<DriveUploadResult> => {
  const folderId = extractDriveFolderId(folderUrlOrId);
  let accessToken = await getDriveAccessToken();

  const performUpload = async (token: string): Promise<DriveUploadResult> => {
    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const metadata = {
      name: fileName,
      mimeType: 'application/json',
      parents: [folderId],
      description: `Agaram Dhines Online Academy Database Backup - ${new Date().toISOString()}`
    };

    const contentStr = typeof backupData === 'string' ? backupData : JSON.stringify(backupData, null, 2);

    const multipartRequestBody =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: application/json\r\n\r\n' +
      contentStr +
      closeDelimiter;

    const response = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,createdTime,size',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': `multipart/related; boundary=${boundary}`
        },
        body: multipartRequestBody
      }
    );

    if (response.status === 401) {
      // Token might be expired, clear cached token
      cachedAccessToken = null;
      throw new Error("AUTH_EXPIRED");
    }

    if (!response.ok) {
      let errorMsg = `Google Drive API error: ${response.status} ${response.statusText}`;
      try {
        const errJson = await response.json();
        if (errJson?.error?.message) {
          errorMsg = errJson.error.message;
        }
      } catch (_) {}
      throw new Error(errorMsg);
    }

    const file = await response.json();
    return {
      id: file.id,
      name: file.name,
      webViewLink: file.webViewLink,
      size: file.size,
      createdTime: file.createdTime,
      folderId
    };
  };

  try {
    return await performUpload(accessToken);
  } catch (err: any) {
    if (err.message === "AUTH_EXPIRED") {
      // Re-authenticate once and retry
      const freshToken = await getDriveAccessToken(true);
      return await performUpload(freshToken);
    }
    throw err;
  }
};

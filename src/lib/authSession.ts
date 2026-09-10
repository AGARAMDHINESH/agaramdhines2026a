// Dedicated permanent session management for Agaram Dhines Academy
// Ensures users (Admin, Staff, Student) remain logged in permanently until manual logout.

const SESSION_KEY = 'userSession';
const COOKIE_KEY = 'agaram_user_session';

// In-memory fallback across re-renders
let memorySession: any = null;

// Helper to set persistent cookie (10 years)
const setPersistentCookie = (name: string, value: string) => {
  try {
    if (typeof document !== 'undefined') {
      const maxAge = 365 * 24 * 60 * 60 * 10; // 10 years
      document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`;
    }
  } catch (_) {}
};

// Helper to get cookie
const getCookie = (name: string): string | null => {
  try {
    if (typeof document === 'undefined') return null;
    const cookies = document.cookie.split(';');
    for (const c of cookies) {
      const trimmed = c.trim();
      if (trimmed.startsWith(`${name}=`)) {
        return decodeURIComponent(trimmed.substring(name.length + 1));
      }
    }
  } catch (_) {}
  return null;
};

// Helper to remove cookie
const removeCookie = (name: string) => {
  try {
    if (typeof document !== 'undefined') {
      document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
    }
  } catch (_) {}
};

export const getUserSession = (): any => {
  // 1. Try memory cache
  if (memorySession && typeof memorySession === 'object' && memorySession.role) {
    return memorySession;
  }

  // 2. Try window global fallback
  if (typeof window !== 'undefined' && (window as any).__AGARAM_SESSION__) {
    const ws = (window as any).__AGARAM_SESSION__;
    if (ws && ws.role) {
      memorySession = ws;
      return ws;
    }
  }

  // 3. Try localStorage
  try {
    const rawLocal = localStorage.getItem(SESSION_KEY);
    if (rawLocal && rawLocal !== 'undefined' && rawLocal !== 'null') {
      const parsed = JSON.parse(rawLocal);
      if (parsed && parsed.role) {
        memorySession = parsed;
        if (typeof window !== 'undefined') (window as any).__AGARAM_SESSION__ = parsed;
        // Re-sync cookie and sessionStorage
        try { sessionStorage.setItem(SESSION_KEY, rawLocal); } catch (_) {}
        setPersistentCookie(COOKIE_KEY, rawLocal);
        return parsed;
      }
    }
  } catch (_) {}

  // 4. Try sessionStorage
  try {
    const rawSession = sessionStorage.getItem(SESSION_KEY);
    if (rawSession && rawSession !== 'undefined' && rawSession !== 'null') {
      const parsed = JSON.parse(rawSession);
      if (parsed && parsed.role) {
        memorySession = parsed;
        if (typeof window !== 'undefined') (window as any).__AGARAM_SESSION__ = parsed;
        try { localStorage.setItem(SESSION_KEY, rawSession); } catch (_) {}
        setPersistentCookie(COOKIE_KEY, rawSession);
        return parsed;
      }
    }
  } catch (_) {}

  // 5. Try persistent Cookie
  try {
    const rawCookie = getCookie(COOKIE_KEY);
    if (rawCookie && rawCookie !== 'undefined' && rawCookie !== 'null') {
      const parsed = JSON.parse(rawCookie);
      if (parsed && parsed.role) {
        memorySession = parsed;
        if (typeof window !== 'undefined') (window as any).__AGARAM_SESSION__ = parsed;
        try { localStorage.setItem(SESSION_KEY, rawCookie); } catch (_) {}
        try { sessionStorage.setItem(SESSION_KEY, rawCookie); } catch (_) {}
        return parsed;
      }
    }
  } catch (_) {}

  return null;
};

export const saveUserSession = (userData: any): void => {
  if (!userData) return;
  const cleanData = JSON.parse(JSON.stringify(userData));
  const rawString = JSON.stringify(cleanData);

  memorySession = cleanData;
  if (typeof window !== 'undefined') {
    (window as any).__AGARAM_SESSION__ = cleanData;
  }

  try {
    localStorage.setItem(SESSION_KEY, rawString);
  } catch (_) {}

  try {
    sessionStorage.setItem(SESSION_KEY, rawString);
  } catch (_) {}

  setPersistentCookie(COOKIE_KEY, rawString);
};

export const clearUserSession = (): void => {
  memorySession = null;
  if (typeof window !== 'undefined') {
    delete (window as any).__AGARAM_SESSION__;
  }

  try {
    localStorage.removeItem(SESSION_KEY);
  } catch (_) {}

  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch (_) {}

  removeCookie(COOKIE_KEY);
};

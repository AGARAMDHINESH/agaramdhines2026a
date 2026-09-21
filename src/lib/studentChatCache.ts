/**
 * Agaram Dhines Online Academy - Student Client-Side Search & Doubt Cache
 * 
 * Stores student questions, AI answers, and pinned doubts locally in the student's browser/mobile
 * without cluttering the Academy's central database.
 */

export interface StudentSearchItem {
  id: string;
  question: string;
  answer: string;
  timestamp: number;
  grade?: string;
  category?: string;
  isPinned: boolean;
  suggestedFollowUps?: string[];
}

const STORAGE_KEY = "agaram_tamil_asan_student_history_v1";

export const getStudentSearchHistory = (): StudentSearchItem[] => {
  if (typeof window === "undefined" || !window.localStorage) {
    return [];
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch (e) {
    console.error("Failed to load student search history from localStorage:", e);
    return [];
  }
};

export const saveStudentSearchItem = (item: Omit<StudentSearchItem, "id" | "timestamp" | "isPinned"> & { id?: string; timestamp?: number; isPinned?: boolean }): StudentSearchItem => {
  const current = getStudentSearchHistory();
  const newItem: StudentSearchItem = {
    id: item.id || `doubt-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    question: item.question.trim(),
    answer: item.answer.trim(),
    timestamp: item.timestamp || Date.now(),
    grade: item.grade || "பொதுவான தமிழ்",
    category: item.category || "பொது",
    isPinned: !!item.isPinned,
    suggestedFollowUps: item.suggestedFollowUps || []
  };

  // Check if identical question already exists, replace or prepend
  const filtered = current.filter(c => c.question.toLowerCase() !== newItem.question.toLowerCase());
  const updated = [newItem, ...filtered].slice(0, 150); // keep up to 150 cached items locally

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn("Failed to write search item to localStorage:", e);
  }

  return newItem;
};

export const togglePinStudentSearchItem = (id: string): StudentSearchItem[] => {
  const current = getStudentSearchHistory();
  const updated = current.map(item => {
    if (item.id === id) {
      return { ...item, isPinned: !item.isPinned };
    }
    return item;
  });

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn("Failed to update pinned state:", e);
  }

  return updated;
};

export const deleteStudentSearchItem = (id: string): StudentSearchItem[] => {
  const current = getStudentSearchHistory();
  const updated = current.filter(item => item.id !== id);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn("Failed to delete item from localStorage:", e);
  }

  return updated;
};

export const clearStudentSearchHistory = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.warn("Failed to clear search history:", e);
  }
};

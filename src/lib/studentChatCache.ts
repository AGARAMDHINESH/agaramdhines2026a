/**
 * Agaram Dhines Online Academy - Student Client-Side Search & Doubt Cache
 * 
 * Stores student questions, AI answers, and pinned doubts locally in the student's browser/mobile
 * without cluttering the Academy's central database.
 */

import { safeGetItem, safeSetItem, safeRemoveItem } from "./safeStorage";

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
  try {
    const raw = safeGetItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch (e) {
    console.error("Failed to load student search history:", e);
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
  const updated = [newItem, ...filtered].slice(0, 30); // keep up to 30 cached items locally

  safeSetItem(STORAGE_KEY, JSON.stringify(updated));

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

  safeSetItem(STORAGE_KEY, JSON.stringify(updated));

  return updated;
};

export const deleteStudentSearchItem = (id: string): StudentSearchItem[] => {
  const current = getStudentSearchHistory();
  const updated = current.filter(item => item.id !== id);

  safeSetItem(STORAGE_KEY, JSON.stringify(updated));

  return updated;
};

export const clearStudentSearchHistory = (): void => {
  safeRemoveItem(STORAGE_KEY);
};

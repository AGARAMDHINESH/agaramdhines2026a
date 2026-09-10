/**
 * Badge & Background Notification Manager
 * Handles Web App Badging API (navigator.setAppBadge, navigator.clearAppBadge),
 * System / Mobile Notification Bar alerts, and unread counts for exams & notifications.
 */

// Helper to normalize grade strings (e.g. "தரம் 10", "Grade 10", "10")
export const normalizeGrade = (g: string = ''): string => {
  return g.replace(/(தரம்|grade|வகுப்பு|class|\s)/gi, '').trim();
};

/**
 * Calculates unattended exams for a student based on their grade and existing submissions.
 */
export const getUnattendedExams = (
  exams: any[] = [],
  submissions: any[] = [],
  studentId: string = '',
  studentGrade: string = ''
): any[] => {
  if (!Array.isArray(exams) || !studentGrade) return [];

  const myGradeNorm = normalizeGrade(studentGrade);

  // 1. Filter exams that belong to this student's grade
  const gradeExams = exams.filter((exam) => {
    if (!exam.grades || exam.grades.length === 0) return true;
    if (exam.grades.includes('All') || exam.grades.includes('அனைத்தும்')) return true;
    return exam.grades.some((g: string) => {
      return g === studentGrade || normalizeGrade(g) === myGradeNorm;
    });
  });

  // 2. Filter out exams where the student has already submitted marks
  const unattended = gradeExams.filter((exam) => {
    const isSubmitted = submissions.some(
      (sub) => sub.examId === exam.id && sub.studentId === studentId
    );
    return !isSubmitted;
  });

  return unattended;
};

/**
 * Updates the App Icon Badge on the phone's home screen or desktop taskbar (App Badging API).
 * Similar to WhatsApp / Facebook red badge counter!
 */
export const updateAppBadge = (count: number): void => {
  const safeCount = Math.max(0, Math.floor(count || 0));

  // Store in localStorage for persistence
  localStorage.setItem('agaram_app_badge_count', safeCount.toString());

  // 1. Mobile & PWA App Badging API
  if (typeof navigator !== 'undefined' && 'setAppBadge' in navigator) {
    if (safeCount > 0) {
      (navigator as any).setAppBadge(safeCount).catch((err: any) => {
        console.debug('Badge API setAppBadge not supported or permitted:', err);
      });
    } else {
      if ('clearAppBadge' in navigator) {
        (navigator as any).clearAppBadge().catch((err: any) => {
          console.debug('Badge API clearAppBadge:', err);
        });
      }
    }
  }

  // 2. Browser Tab Title Indicator (e.g., "(3) அகரம் தினைஸ் அகாடமி")
  if (typeof document !== 'undefined') {
    const baseTitle = 'அகரம் தினைஸ் அகாடமி';
    if (safeCount > 0) {
      document.title = `(${safeCount}) ${baseTitle}`;
    } else {
      document.title = baseTitle;
    }
  }

  // 3. Dispatch an internal event so all UI components update instantly
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('app_badge_updated', { detail: { count: safeCount } })
    );
  }
};

/**
 * Clears the App Icon Badge completely (resets to 0).
 */
export const clearAppBadge = (): void => {
  updateAppBadge(0);
};

/**
 * Plays the soft notification alert chime.
 */
export const playNotificationSound = () => {
  try {
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audio.volume = 0.6;
    audio.play().catch(() => {
      // Audio playback might be restricted before user gesture
    });
  } catch (e) {
    // Ignore audio failures
  }
};

/**
 * Triggers a System Notification in the phone's notification bar (Status Bar).
 * Uses ServiceWorker if available, falling back to Notification API.
 */
export const showSystemNotification = async (
  title: string,
  options: {
    body: string;
    icon?: string;
    badge?: string;
    url?: string;
    badgeCount?: number;
    tag?: string;
  }
) => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  if (Notification.permission !== 'granted') {
    return false;
  }

  // Update badge count if provided
  if (typeof options.badgeCount === 'number') {
    updateAppBadge(options.badgeCount);
  }

  // Vibrate phone if supported
  if ('vibrate' in navigator) {
    try {
      navigator.vibrate([200, 100, 200]);
    } catch (_) {}
  }

  // Play sound
  playNotificationSound();

  const notifOptions: any = {
    body: options.body,
    icon: options.icon || '/logo-192.png',
    badge: options.badge || '/logo-192.png',
    tag: options.tag || 'agaram-exam-alert',
    renotify: true,
    data: {
      url: options.url || '/student-dashboard?tab=marks&subTab=exams',
      badgeCount: options.badgeCount
    }
  };

  // 1. Try displaying via Service Worker registration (gives rich notification on mobile)
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg && 'showNotification' in reg) {
        await reg.showNotification(title, notifOptions);
        return true;
      }
    } catch (e) {
      console.warn('SW notification fallback:', e);
    }
  }

  // 2. Direct browser Notification fallback
  try {
    const notif = new Notification(title, notifOptions);
    notif.onclick = () => {
      window.focus();
      if (options.url) {
        window.location.href = options.url;
      }
      notif.close();
    };
    return true;
  } catch (err) {
    console.error('Direct notification error:', err);
    return false;
  }
};

/**
 * Requests Notification permission with full explanation
 */
export const requestSystemNotificationPermission = async (): Promise<NotificationPermission> => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    alert('உங்கள் உலாவி (Browser) நோட்டிபிகேஷன் வசதியை ஆதரிக்கவில்லை.');
    return 'denied';
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      showSystemNotification('அகரம் தினைஸ் அகாடமி 🎓', {
        body: 'வாட்ஸ்அப் போன்று பரீட்சை மற்றும் நேரலை வகுப்பு அறிவிப்புகள் உங்கள் ஃபோனுக்கு வரும்!',
        url: '/student-dashboard?tab=marks&subTab=exams',
        tag: 'welcome-notification'
      });
    }
    return permission;
  } catch (err) {
    console.error('Error requesting notification permission:', err);
    return 'denied';
  }
};

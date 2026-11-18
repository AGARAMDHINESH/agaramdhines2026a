import { useEffect, useRef } from 'react';
import { db, isFirebaseConfigured } from '../lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { updateAppBadge, showSystemNotification } from '../lib/badgeManager';
import { safeGetItem, safeSetItem } from '../lib/safeStorage';
import { doesItemMatchStudentSubjects } from '../components/RecordingSection';

export function useRealtimeNotifications(
  grade: string | undefined,
  onNewNotification?: (notif: any) => void,
  studentSubjects?: string[]
) {
  const subjectsRef = useRef<string[] | undefined>(studentSubjects);
  subjectsRef.current = studentSubjects;

  useEffect(() => {
    if (!isFirebaseConfigured || !grade) return;

    // Request permission for browser notifications on first user interaction if default
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      const askPermission = () => {
        Notification.requestPermission().catch(() => {});
        document.removeEventListener('click', askPermission);
      };
      document.addEventListener('click', askPermission);
    }

    const badgeKey = `app_badge_count_${grade}`;
    
    // Initial badge from storage
    const currentBadge = parseInt(safeGetItem(badgeKey) || "0", 10);
    if (currentBadge > 0) {
      updateAppBadge(currentBadge);
    }

    // Create a timestamp to only trigger alerts for truly "new" notifications arriving while app is open
    const activeSessionTime = new Date(Date.now() - 60000).toISOString();

    const q = query(
      collection(db, 'notifications'),
      where('grade', 'in', [grade, 'Public', 'public', 'All', 'all'])
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const notification: any = { ...change.doc.data(), id: change.doc.id };

          // Strict subject isolation for subject-targeted Zoom class notifications
          const hasTargetSubject = Boolean(
            (notification.subject && String(notification.subject).trim()) ||
            (Array.isArray(notification.subjects) && notification.subjects.some((s: any) => String(s || '').trim()))
          );
          if (notification.type === 'zoom_class' && hasTargetSubject) {
            const subs = subjectsRef.current;
            if (Array.isArray(subs) && !doesItemMatchStudentSubjects(notification, subs)) {
              return;
            }
          }

          const isRealtime = notification.createdAt && notification.createdAt >= activeSessionTime;
          
          if (isRealtime) {
            console.log("Real-time notification received:", notification);
            
            // Increment and set badge
            const newBadge = parseInt(safeGetItem(badgeKey) || "0", 10) + 1;
            safeSetItem(badgeKey, newBadge.toString());
            updateAppBadge(newBadge);

            // Trigger System Notification (Notification Bar / Lock screen)
            showSystemNotification(notification.title || 'அகரம் தினைஸ் அகாடமி', {
              body: notification.message || 'புதிய அறிவிப்பு வந்துள்ளது',
              icon: '/logo-192.png',
              badge: '/logo-192.png',
              tag: notification.id || 'agaram-realtime-alert',
              url: notification.type === 'exam' 
                ? '/student-dashboard?tab=marks&subTab=exams' 
                : '/student-dashboard?tab=notices',
              badgeCount: newBadge
            });
          }

          // Always report to the callback so the UI can decide what to do
          if (onNewNotification) {
            onNewNotification({ ...notification, _isInitial: !isRealtime });
          }
        }
      });
    }, (error) => {
      if (error?.code !== 'unavailable') {
        console.warn("Notification listener notice:", error?.message || error);
      }
    });

    return () => unsubscribe();
  }, [grade]);
}

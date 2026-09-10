// Service Worker for Background Push Notifications & App Icon Badges
// Supports Firebase Cloud Messaging (FCM) & Standard Web Push API

importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyB_IFx9D75KnocfGLGH9sBDIaa3T0pTRn0",
  authDomain: "agaram-dhines-online-academy.firebaseapp.com",
  projectId: "agaram-dhines-online-academy",
  storageBucket: "agaram-dhines-online-academy.firebasestorage.app",
  messagingSenderId: "825909851431",
  appId: "1:825909851431:web:add4be35e13e113d096502"
});

const messaging = firebase.messaging();

// Handles incoming background notifications when the app is completely CLOSED
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Background message received:', payload);
  const title = payload.notification?.title || payload.data?.title || 'அகரம் தினைஸ் அகாடமி';
  const body = payload.notification?.body || payload.data?.body || 'புதிய தேர்வு/அறிவிப்பு வந்துள்ளது!';
  const url = payload.data?.url || '/student-dashboard?tab=marks&subTab=exams';
  const badgeCount = parseInt(payload.data?.badge || payload.data?.badgeCount || '1', 10);

  // Update App Icon Badge (like WhatsApp red unread count)
  if ('setAppBadge' in navigator) {
    if (badgeCount > 0) {
      navigator.setAppBadge(badgeCount).catch(() => {});
    } else {
      navigator.clearAppBadge().catch(() => {});
    }
  }

  const notificationOptions = {
    body: body,
    icon: '/logo-192.png',
    badge: '/logo-192.png',
    vibrate: [200, 100, 200],
    tag: payload.data?.tag || payload.data?.id || 'exam-notification',
    renotify: true,
    data: {
      url: url,
      badgeCount: badgeCount
    },
    actions: [
      { action: 'open', title: 'பரீட்சை எழுது (Open Exam)' }
    ]
  };

  return self.registration.showNotification(title, notificationOptions);
});

// Generic Web Push event listener
self.addEventListener('push', (event) => {
  if (!event.data) return;
  try {
    const data = event.data.json();
    const title = data.title || 'அகரம் தினைஸ் அகாடமி';
    const body = data.body || data.message || 'புதிய பரீட்சை வந்துள்ளது!';
    const badgeCount = parseInt(data.badge || data.badgeCount || '1', 10);

    if ('setAppBadge' in navigator) {
      if (badgeCount > 0) {
        navigator.setAppBadge(badgeCount).catch(() => {});
      } else {
        navigator.clearAppBadge().catch(() => {});
      }
    }

    const options = {
      body: body,
      icon: '/logo-192.png',
      badge: '/logo-192.png',
      vibrate: [200, 100, 200],
      tag: data.id || 'agaram-push',
      renotify: true,
      data: {
        url: data.url || '/student-dashboard?tab=marks&subTab=exams',
        badgeCount: badgeCount
      },
      actions: [
        { action: 'open', title: 'பார்வையிடு (View)' }
      ]
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    console.error('Error handling generic push event:', err);
  }
});

// User taps on the notification in the phone's notification bar
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) 
    ? event.notification.data.url 
    : '/student-dashboard?tab=marks&subTab=exams';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If a window is already open, focus it and navigate
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          if ('navigate' in client) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

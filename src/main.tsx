import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from 'virtual:pwa-register';
import App from "./App.tsx";
import "./index.css";

// Register Service Worker for PWA & Background Push safely without auto-reload loops
if ("serviceWorker" in navigator) {
  // Clean up any conflicting duplicate service workers at root scope
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const reg of registrations) {
      if (reg.active?.scriptURL?.includes('firebase-messaging-sw.js')) {
        reg.unregister().catch(() => {});
      }
    }
  }).catch(() => {});

  // Register PWA service worker with manual refresh handling (no automatic window.location.reload)
  registerSW({
    immediate: false,
    onNeedRefresh() {
      console.log('Agaram App: New version available.');
    },
    onOfflineReady() {
      console.log('Agaram App: Ready to work offline.');
    }
  });

  // Restore badge count if exists
  try {
    const savedBadge = parseInt(localStorage.getItem('agaram_app_badge_count') || '0', 10);
    if (savedBadge > 0 && 'setAppBadge' in navigator) {
      (navigator as any).setAppBadge(savedBadge).catch(() => {});
    }
  } catch (_) {}
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

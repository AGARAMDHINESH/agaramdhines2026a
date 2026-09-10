import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(), 
      tailwindcss(),
      VitePWA({
        registerType: 'prompt',
        injectRegister: null,
        devOptions: {
          enabled: false
        },
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'logo.png', 'logo-192.png', 'logo-512.png', 'logo-maskable-192.png', 'logo-maskable-512.png', 'screenshots/home.jpg', 'screenshots/desktop.jpg'],
        manifest: {
          id: '/?source=pwa',
          name: 'Agaram Dhines Online Academy',
          short_name: 'Agaram',
          description: 'Agaram Dhines Online Academy App',
          theme_color: '#ffffff',
          background_color: '#ffffff',
          display: 'standalone',
          display_override: ['window-controls-overlay', 'standalone', 'browser'],
          orientation: 'portrait',
          start_url: '/',
          scope: '/',
          lang: 'ta',
          dir: 'ltr',
          categories: ['education', 'productivity'],
          iarc_rating_id: 'e84b072d-71b3-4d3e-86ae-31a8ce4e53b7',
          prefer_related_applications: true,
          related_applications: [
            {
              platform: 'play',
              url: 'https://play.google.com/store/apps/details?id=com.agaram.dhines.online.academy',
              id: 'com.agaram.dhines.online.academy'
            }
          ],
          scope_extensions: [
            { origin: 'https://app-agaramdhines-lk.vercel.app' }
          ],
          file_handlers: [
            {
              action: '/',
              accept: {
                'application/pdf': ['.pdf'],
                'image/png': ['.png'],
                'image/jpeg': ['.jpg', '.jpeg']
              }
            }
          ],
          shortcuts: [
            {
              name: 'Student Dashboard',
              url: '/student-dashboard',
              description: 'Go to Student Dashboard'
            },
            {
              name: 'Admin Panel',
              url: '/admin',
              description: 'Go to Admin Panel'
            }
          ],
          icons: [
            {
              src: '/logo-192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: '/logo-maskable-192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'maskable'
            },
            {
              src: '/logo-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: '/logo-maskable-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable'
            }
          ],
          screenshots: [
            {
              src: '/screenshots/home.jpg',
              sizes: '768x1376',
              type: 'image/jpeg',
              form_factor: 'narrow',
              label: 'Agaram Dhines Academy App View'
            },
            {
              src: '/screenshots/desktop.jpg',
              sizes: '1376x768',
              type: 'image/jpeg',
              form_factor: 'wide',
              label: 'Agaram Dhines Academy Home'
            }
          ]
        },
        workbox: {
          maximumFileSizeToCacheInBytes: 5000000, // 5 MB
          globPatterns: ['**/*.{js,css,html,ico,png,svg}']
        }
      })
    ],
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              return 'vendor';
            }
          }
        }
      }
    },
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});

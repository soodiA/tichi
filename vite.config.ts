import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/tichi/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'تیچی',
        short_name: 'تیچی',
        description: 'یادگیری شاد الفبای فارسی برای دانش‌آموزان پایه اول',
        theme_color: '#7C3AED',
        background_color: '#FFF8F0',
        display: 'standalone',
        start_url: '/tichi/',
        lang: 'fa',
        dir: 'rtl',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        disableDevLogs: true,
        skipWaiting: true,
        clientsClaim: true,
      },
      // Use generateSW strategy which avoids rollup/terser for the service worker
      strategies: 'generateSW',
    }),
  ],
});

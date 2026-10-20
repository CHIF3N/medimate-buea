import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'MediMate — safe medicine in Buea',
        short_name: 'MediMate',
        description: 'Safe medicine from purchase to the last dose. Ask in English, French or Pidgin, find stock, check packs, finish every course. Works offline.',
        theme_color: '#5b3fe8',
        background_color: '#f5f4f0',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        lang: 'en',
        categories: ['health', 'medical'],
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
          { name: 'Ask MediMate', url: '/ask', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
          { name: 'Check a medicine pack', url: '/verify', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
          { name: 'My treatment', url: '/course', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // Only Latin font subsets are needed offline (English, French, Pidgin).
        globIgnores: ['**/*cyrillic*', '**/*greek*', '**/*vietnamese*', '**/og.png'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        runtimeCaching: [
          {
            // Map tiles: keep what the user has seen so the map works offline.
            urlPattern: /^https:\/\/tile\.openstreetmap\.org\/.*/,
            handler: 'CacheFirst',
            options: { cacheName: 'map-tiles', expiration: { maxEntries: 600, maxAgeSeconds: 60 * 60 * 24 * 30 } },
          },
          {
            // OCR engine + language data, and the barcode reader, downloaded on first use.
            urlPattern: /^https:\/\/(cdn\.jsdelivr\.net|unpkg\.com|fastly\.jsdelivr\.net)\/.*/,
            handler: 'CacheFirst',
            options: { cacheName: 'scanner-engines', expiration: { maxEntries: 40, maxAgeSeconds: 60 * 60 * 24 * 60 } },
          },
        ],
      },
    }),
  ],
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 900,
  },
});

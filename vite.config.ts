import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import pkg from './package.json' with { type: 'json' }

export default defineConfig({
  // Single source of truth for the version the app reports: package.json, which
  // is also what the release tag is cut from.
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.svg',
        'pwa-icon.svg',
        'apple-touch-icon.png',
        'pwa-192x192.png',
        'pwa-512x512.png',
        'maskable-icon-512x512.png',
      ],
      manifest: {
        id: '/',
        name: 'PokeCount Tracker - Thai Pokémon TCG',
        short_name: 'PokeCount',
        description: 'สมุดสะสมการ์ด จัดเด็ค เช็คการ์ดที่ขาด และฐานข้อมูลการ์ดโปเกมอนภาษาไทย',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'any',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: `pwa-192x192.png?v=${pkg.version}`,
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: `pwa-512x512.png?v=${pkg.version}`,
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: `maskable-icon-512x512.png?v=${pkg.version}`,
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: `pwa-512x512.png?v=${pkg.version}`,
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
        ],
      },
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        maximumFileSizeToCacheInBytes: 15 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,json}'],
        globIgnores: [
          'card-images/**',
          'card-images-hd/**',
          'set-boosters/**',
          'data/**',
          '**/*.map',
        ],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/],
        ignoreURLParametersMatching: [/^utm_/, /^fbclid$/, /^v$/],
        runtimeCaching: [
          {
            // Cloudflare R2 Card Images (Thumbnails & HD)
            urlPattern: /^https:\/\/pub-af524b77e8e3403685545bc0a8222090\.r2\.dev\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'r2-card-images',
              expiration: {
                maxEntries: 4000,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
              },
              cacheableResponse: {
                statuses: [200],
              },
            },
          },
          {
            // Official Pokémon Card Asia CDN images (fallback)
            urlPattern: /^https:\/\/asia\.pokemon-card\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'official-card-images',
              expiration: {
                maxEntries: 1000,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
              },
              cacheableResponse: {
                statuses: [200],
              },
            },
          },
        ],
      },
    }),
  ],
  base: '/',
  server: {
    host: true,
    port: 5173,
    strictPort: true,
  },
  preview: {
    host: true,
    port: 4173,
    strictPort: true,
  },
})

import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vite'
import { readFileSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string }

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  define: {
    // Which build this is. The OTA release script pins BUILD_TIME so the
    // number in the update manifest matches the bundle it describes.
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_TIME__: JSON.stringify(Number(process.env.IRONWARD_BUILD_TIME) || Date.now()),
  },
  build: {
    // The release script builds the over-the-air bundle elsewhere so it
    // doesn't disturb a site build.
    outDir: process.env.IRONWARD_OUT_DIR || 'dist',
  },
  plugins: [
    // public/downloads (the APK) and public/updates (OTA bundles) are what
    // the *site* serves. A native build or update bundle must not carry
    // them — they'd sit inside the app, and inside every next copy of it.
    {
      name: 'ironward-strip-site-only-files',
      apply: 'build',
      closeBundle() {
        if (mode !== 'capacitor') return
        const out = resolve(process.env.IRONWARD_OUT_DIR || 'dist')
        for (const dir of ['downloads', 'updates', '.well-known']) rmSync(resolve(out, dir), { recursive: true, force: true })
      },
    },
    react(),
    tailwindcss(),
    // A native bundle is copied into the app and does not need a service
    // worker; keeping it web-only avoids serving stale assets after an
    // app update.
    mode !== 'capacitor' && VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      workbox: {
        // The APK and OTA zips are downloads, not app shell.
        globIgnores: ['downloads/**', 'updates/**'],
        // /auth/ always loads fresh: a cached older copy of the app may not know
        // the Google callback route and would bounce it to the home page.
        navigateFallbackDenylist: [/^\/downloads\//, /^\/updates\//, /^\/api\//, /^\/auth\//, /^\/\.well-known\//],
        // Exercise demo photos (~3 MB in all) aren't precached; each one is
        // kept after its first view so it works with no signal at the gym.
        runtimeCaching: [
          {
            // The extended exercise library: served from cache, refreshed
            // in the background.
            urlPattern: ({ url }) => url.pathname === '/exercise-db.json',
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'exercise-library' },
          },
          {
            // Its demo photos, from the public CDN — kept once seen.
            urlPattern: ({ url }) => url.hostname === 'cdn.jsdelivr.net' && url.pathname.includes('/free-exercise-db'),
            handler: 'CacheFirst',
            options: { cacheName: 'exercise-library-photos', expiration: { maxEntries: 400 }, cacheableResponse: { statuses: [0, 200] } },
          },
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/exercises/'),
            handler: 'CacheFirst',
            options: { cacheName: 'exercise-demos', expiration: { maxEntries: 200 } },
          },
        ],
      },
      manifest: {
        name: 'Ironward — Always moving forward.',
        short_name: 'Ironward',
        description: 'The gym log that tells you exactly what to lift next. Onward with iron.',
        theme_color: '#0c0d0f',
        background_color: '#0c0d0f',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ].filter(Boolean),
}))

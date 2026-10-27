import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages serves the app at https://<user>.github.io/<repo-name>/
const base = '/wehrgasse/'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // our own service worker (src/sw.ts), needed later for push
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      // the icons are already in globPatterns, don't add them to the cache list twice
      includeManifestIcons: false,
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,png}'],
      },
      manifest: {
        id: base,
        name: 'WG-App',
        short_name: 'WG',
        description: 'Wer macht diese Woche was in der WG?',
        lang: 'de',
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'portrait',
        // same as --bg in src/index.css
        background_color: '#f4f2fb',
        theme_color: '#f4f2fb',
        // copied from docs/wg-app-icon/ (rendered by its render_icons.py, ADR 0014)
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  base,
})

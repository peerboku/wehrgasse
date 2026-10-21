// Generates all app icons (PNG) from public/favicon.svg. Run: npm run icons
import { defineConfig } from '@vite-pwa/assets-generator/config'

const green = '#1f9d6b'

export default defineConfig({
  images: ['public/favicon.svg'],
  preset: {
    // padding 0: the SVG already has its own background and margins
    transparent: { sizes: [64, 192, 512], padding: 0 },
    maskable: { sizes: [512], padding: 0, resizeOptions: { background: green } },
    // iOS Home Screen icon: no transparency allowed, iOS rounds the corners itself
    apple: { sizes: [180], padding: 0, resizeOptions: { background: green } },
  },
})

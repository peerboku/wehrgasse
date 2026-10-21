import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // GitHub Pages serves the app at https://<user>.github.io/<repo-name>/
  base: '/wehrgasse/',
})

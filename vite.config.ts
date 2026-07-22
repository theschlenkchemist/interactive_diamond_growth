import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// IMPORTANT for GitHub Pages: set base to "/<your-repo-name>/"
// If you deploy to https://<user>.github.io/mwcvd-trainer/ then base is "/mwcvd-trainer/"
// If you deploy to a custom domain or a user page, set base to "/"
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE ?? '/mwcvd-trainer/',
})

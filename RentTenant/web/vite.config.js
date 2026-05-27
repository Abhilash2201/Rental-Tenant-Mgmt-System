import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * Vite configuration for Rent & Tenant Management Web App
 * - React plugin for JSX fast refresh
 * - Tailwind CSS v4 via official Vite plugin
 * - Proxy: /api requests forwarded to backend on port 5000
 */
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    port: 5173,
    // Proxy API calls to the backend in development
    // so frontend calls /api/... → http://localhost:5000/api/...
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
})

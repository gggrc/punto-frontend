import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // PERBAIKAN KRUSIAL: Menambahkan Proxy untuk Development dan Production
  // Ini menyelesaikan masalah "double URL" (Vercel domain + Railway URL)
  server: {
    proxy: {
      '/api': {
        // Ganti dengan URL Railway Anda yang sebenarnya
        target: 'https://punto-backend-production.up.railway.app', 
        changeOrigin: true,
        // Rewrite path: /api/start_game -> /start_game (karena kita menghilangkan /api di Flask)
        rewrite: (path) => path.replace(/^\/api/, '') 
      }
    }
  }
});
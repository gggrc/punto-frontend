import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// PASTIKAN URL INI BENAR
const RAILWAY_BACKEND_URL = 'https://punto-backend-production.up.railway.app'; 

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // PERBAIKAN: Menambahkan proxy untuk setiap endpoint root
  server: {
    proxy: {
      '/start_game': {
        target: RAILWAY_BACKEND_URL, 
        changeOrigin: true,
        rewrite: (path) => path // Path sudah benar, tidak perlu rewrite
      },
      '/make_move': {
        target: RAILWAY_BACKEND_URL, 
        changeOrigin: true,
        rewrite: (path) => path
      },
      '/ai_move': {
        target: RAILWAY_BACKEND_URL, 
        changeOrigin: true,
        rewrite: (path) => path
      },
      // HATI-HATI: Proxy root (/) dapat mengganggu aset statis.
      // Kami hanya mendefinisikan endpoint API yang jelas.
    }
  }
});
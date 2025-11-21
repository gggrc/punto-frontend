import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// URL Fallback Lokal (Pastikan Flask server berjalan di port 5000)
const LOCAL_BACKEND_URL = 'http://127.0.0.1:5000'; 

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // PERBAIKAN: Mengganti proxy ke URL lokal untuk pengembangan
  server: {
    proxy: {
      '/start_game': {
        target: LOCAL_BACKEND_URL, 
        changeOrigin: true,
        rewrite: (path) => path
      },
      '/make_move': {
        target: LOCAL_BACKEND_URL, 
        changeOrigin: true,
        rewrite: (path) => path
      },
      '/ai_move': {
        target: LOCAL_BACKEND_URL, 
        changeOrigin: true,
        rewrite: (path) => path
      },
      // HATI-HATI: Jika Anda ingin menguji Railway dari lokal, ganti LOCAL_BACKEND_URL
    }
  }
});
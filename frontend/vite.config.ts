import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      // Mesmo papel do rewrite /api do vercel.json: a API fica same-origin e o
      // cookie de sessão (httpOnly) funciona. changeOrigin: false mantém o Host
      // "localhost", então o backend grava o cookie sem Secure (http local).
      '/api': { target: 'http://localhost:8000', changeOrigin: false },
    },
  },
})

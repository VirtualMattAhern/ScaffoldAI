import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Skafold',
        short_name: 'Skafold',
        description: 'From ideas to plans to focused action.',
        theme_color: '#2563eb',
        background_color: '#eff6ff',
        display: 'standalone',
      },
    }),
  ],
  server: {
    proxy: {
      '/api': { target: 'http://localhost:3003', changeOrigin: true },
    },
  },
})

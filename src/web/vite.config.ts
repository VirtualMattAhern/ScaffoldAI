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
        name: 'skafold',
        short_name: 'skafold',
        description: 'From ideas to plans to focused action.',
        theme_color: '#0ea5e9',
        background_color: '#f0f9ff',
        display: 'standalone',
        icons: [
          {
            src: '/brand/skafold-icon.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
        ],
      },
    }),
  ],
  server: {
    proxy: {
      '/api': { target: 'http://localhost:3003', changeOrigin: true },
    },
  },
})

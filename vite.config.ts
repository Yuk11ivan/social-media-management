import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    watch: {
      ignored: [
        '**/backend/*_profiles/**',
        '**/.agents/**',
        '**/node_modules/**',
        '**/*.mp4',
        '**/*.webm',
        '**/*.mov',
        // 仅忽略项目根目录的素材，避免 EBUSY；不影响 public/ 与 src/assets/
        '*.mp4',
        '*.webm',
        '*.mov',
        '*.{jpg,jpeg,png,gif,webp,avif}',
      ],
    },
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})

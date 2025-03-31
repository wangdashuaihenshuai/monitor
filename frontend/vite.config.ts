import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
// https://vite.dev/config/
export default defineConfig({
  plugins: [tailwindcss(), react()],
  // 添加服务器配置和代理
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:11100',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:11100',
        ws: true,
        changeOrigin: true,
      }
    }
  }
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: './', // 讓 build 產物可以部署在 GitHub Pages 的子路徑下（https://user.github.io/repo/）
  plugins: [react()],
})

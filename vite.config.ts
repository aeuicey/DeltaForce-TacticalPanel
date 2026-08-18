import { existsSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// demo/ 目录为本地录屏素材（.gitignore 忽略），存在时才加入构建入口
const demoEntry = 'demo/v0.0.1/app/cinematic-demo.html'

export default defineConfig({
  plugins: [react()],
  // GitHub Pages 部署在 /<仓库名>/ 子路径下，CI 通过 VITE_BASE 注入；本地/Electron/Android 保持 '/'
  base: process.env.VITE_BASE ?? '/',
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        modeConfig: 'mode-config.html',
        ...(existsSync(demoEntry) ? { cinematicDemo: demoEntry } : {}),
      },
    },
  },
  server: {
    host: true,
    port: 5173,
    proxy: {
      // 网页端分享模式：开发时将分享中继 API 代理到本地零依赖中继服务器（npm run share:server）
      '/api/share': 'http://localhost:8781',
    },
  },
})

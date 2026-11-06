import { defineConfig, Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

function spaRoutesPlugin(): Plugin {
  const routes = [
    'dashboard',
    'flood',
    'heat',
    'fire',
    'crop',
    'drainage',
    'simulation',
    'methodology',
    'roadmap',
    'about',
    'data-sources',
    'alerts',
  ]
  return {
    name: 'spa-routes-fallback',
    closeBundle() {
      const distDir = path.resolve(__dirname, 'dist')
      const indexHtml = path.join(distDir, 'index.html')
      if (!fs.existsSync(indexHtml)) return
      const htmlContent = fs.readFileSync(indexHtml, 'utf-8')
      for (const route of routes) {
        const routeDir = path.join(distDir, route)
        if (!fs.existsSync(routeDir)) {
          fs.mkdirSync(routeDir, { recursive: true })
        }
        fs.writeFileSync(path.join(routeDir, 'index.html'), htmlContent)
      }
    },
  }
}

export default defineConfig({
  plugins: [react(), spaRoutesPlugin()],
  build: {
    sourcemap: false,
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          charts: ['recharts'],
          maps: ['leaflet', 'react-leaflet'],
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})

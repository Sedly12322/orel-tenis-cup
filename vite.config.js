import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/vysledky': {
        target: 'https://orellichnov.cz',
        changeOrigin: true,
        secure: false,
        rewrite: (_path) => '/otcl/vysledky/',
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, _req, _res) => {
            // Přidáme User-Agent a Referer, aby server neblokoval požadavek
            proxyReq.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
            proxyReq.setHeader('Referer', 'https://orellichnov.cz/otcl/vysledky/');
          });
        }
      }
    }
  }
})

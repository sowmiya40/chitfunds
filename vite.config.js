import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://swarm-guidance-uplifting.ngrok-free.dev',
        changeOrigin: true,
        secure: false,
        headers: {
          Connection: 'keep-alive'
        },
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            proxyReq.setHeader('Host', 'swarm-guidance-uplifting.ngrok-free.dev');
            proxyReq.setHeader('Origin', 'https://swarm-guidance-uplifting.ngrok-free.dev');
          });
        }
      }
    }
  }
})

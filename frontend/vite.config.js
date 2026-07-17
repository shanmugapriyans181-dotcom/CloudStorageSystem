import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8080',
        changeOrigin: true,
        configure: (proxy) => {
          const originalOn = proxy.on;
          const interceptor = function (event, listener) {
            if (event === 'error') {
              return proxy;
            }
            return originalOn.apply(this, arguments);
          };
          proxy.on = interceptor;
          proxy.addListener = interceptor;

          originalOn.call(proxy, 'error', (err, _req, res) => {
            if (err.code === 'ECONNREFUSED') {
              console.warn('\x1b[33m[vite-proxy] Backend at http://127.0.0.1:8080 is offline or starting up...\x1b[0m');
              if (!res.headersSent) {
                res.writeHead(503, { 'Content-Type': 'text/plain' });
                res.end('Backend server is starting or offline.');
              }
            } else {
              console.error('[vite-proxy] Error:', err);
            }
          });
        }
      }
    }
  }
})

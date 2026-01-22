import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Polyfill process.env for the existing code structure if needed,
    // though using import.meta.env is preferred in Vite.
    // We map VITE_API_KEY to process.env.API_KEY for backward compatibility with your code.
    'process.env.API_KEY': 'import.meta.env.VITE_API_KEY'
  },
  server: {
    proxy: {
      '/api/genai': {
        target: 'https://generativelanguage.googleapis.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/genai/, '')
      }
    }
  }
});
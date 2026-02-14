import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate heavy vendor libs into their own chunks
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-recharts': ['recharts'],
          'vendor-monaco': ['@monaco-editor/react'],
          'vendor-elevenlabs': ['@elevenlabs/react', '@elevenlabs/client'],
        },
      },
    },
  },
  optimizeDeps: {
    include: ['lucide-react'],
  },
})

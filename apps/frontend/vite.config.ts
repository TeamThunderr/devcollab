import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => ({
  plugins: [react()],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  // ── Dev server ────────────────────────────────────────────────────────────
  server: {
    port: 5173,
    watch: {
      usePolling: true,
    },
    proxy: {
      '/api': {
        target: process.env.BACKEND_URL || 'http://localhost:3000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: process.env.BACKEND_URL || 'http://localhost:3000',
        changeOrigin: true,
        ws: true,
      },
    },
  },

  // ── Production build ──────────────────────────────────────────────────────
  build: {
    outDir: 'dist',
    // Generate sourcemaps for Sentry error tracking
    sourcemap: mode === 'production' ? 'hidden' : true,
    // Warn when a single chunk exceeds 1MB
    chunkSizeWarningLimit: 1000,

    rollupOptions: {
      onwarn(warning, warn) {
        if (warning.code === 'MODULE_LEVEL_DIRECTIVE') return
        warn(warning)
      },

      output: {
        // ── Code splitting strategy ────────────────────────────────────────
        // Split large dependencies into separate cached chunks.
        // Users only re-download a chunk when THAT package changes.
        manualChunks(id) {
          // Monaco editor is ~2MB — isolated so it doesn't bloat the main bundle
          if (id.includes('monaco-editor') || id.includes('@monaco-editor')) {
            return 'monaco'
          }
          // Tiptap rich text editor
          if (id.includes('@tiptap')) {
            return 'tiptap'
          }
          // React and core libraries
          if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
            return 'react-vendor'
          }
          // Charting / dnd
          if (id.includes('@dnd-kit')) {
            return 'dnd'
          }
          // All other node_modules → vendor chunk
          if (id.includes('node_modules')) {
            return 'vendor'
          }
        },
      },
    },
  },
}))

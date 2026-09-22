import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1300,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules/three') || id.includes('node_modules/d3-force-3d')) return 'vendor-three'
          if (id.includes('node_modules/react-force-graph-3d')) return 'vendor-force-graph'
        },
      },
    },
  },
})

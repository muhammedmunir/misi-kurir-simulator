import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const resolve = (p: string) => decodeURIComponent(new URL(p, import.meta.url).pathname).replace(/^\/(?=[A-Za-z]:\/)/, '');

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve('./src'),
    },
  },
  build: {
    target: 'es2020',
    sourcemap: false,
    chunkSizeWarningLimit: 3000,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('three') || id.includes('react-three')) return 'r3f-vendor';
            if (id.includes('react') || id.includes('react-router')) return 'react-vendor';
            if (id.includes('zustand') || id.includes('supabase') || id.includes('idb')) return 'lib-vendor';
            if (id.includes('@react-three/postprocessing')) return 'post-vendor';
            return 'vendor';
          }
        },
      },
    },
  },
  server: {
    port: 3000,
    strictPort: true,
    cors: true,
  },
  preview: {
    port: 3000,
    strictPort: true,
  },
});

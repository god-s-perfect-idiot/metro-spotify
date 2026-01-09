import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte()],
  server: {
    port: 6888,
    host: true,
    allowedHosts: ['ready-laws-grin.loca.lt/']
  },
  build: {
    outDir: 'dist',
    sourcemap: false
  },
  resolve: {
    alias: {
      $lib: '/src/lib',
      $components: '/src/components',
      $store: '/src/store',
      $utils: '/src/utils'
    }
  }
});

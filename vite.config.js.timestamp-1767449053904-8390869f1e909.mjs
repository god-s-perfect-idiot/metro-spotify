// vite.config.js
import { defineConfig } from "file:///Users/samarmusthafa/personal%20projects/metro-spotify/node_modules/.pnpm/vite@5.4.21_@types+node@25.0.3_lightningcss@1.30.2/node_modules/vite/dist/node/index.js";
import { svelte } from "file:///Users/samarmusthafa/personal%20projects/metro-spotify/node_modules/.pnpm/@sveltejs+vite-plugin-svelte@3.1.2_svelte@4.2.20_vite@5.4.21_@types+node@25.0.3_lightningcss@1.30.2_/node_modules/@sveltejs/vite-plugin-svelte/src/index.js";
var vite_config_default = defineConfig({
  plugins: [svelte()],
  server: {
    port: 5173,
    host: true,
    allowedHosts: ["a86227c2cafb.ngrok-free.app"]
  },
  build: {
    outDir: "dist",
    sourcemap: false
  },
  resolve: {
    alias: {
      $lib: "/src/lib",
      $components: "/src/components",
      $store: "/src/store",
      $utils: "/src/utils"
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMvc2FtYXJtdXN0aGFmYS9wZXJzb25hbCBwcm9qZWN0cy9tZXRyby1zcG90aWZ5XCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvVXNlcnMvc2FtYXJtdXN0aGFmYS9wZXJzb25hbCBwcm9qZWN0cy9tZXRyby1zcG90aWZ5L3ZpdGUuY29uZmlnLmpzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9Vc2Vycy9zYW1hcm11c3RoYWZhL3BlcnNvbmFsJTIwcHJvamVjdHMvbWV0cm8tc3BvdGlmeS92aXRlLmNvbmZpZy5qc1wiO2ltcG9ydCB7IGRlZmluZUNvbmZpZyB9IGZyb20gJ3ZpdGUnO1xuaW1wb3J0IHsgc3ZlbHRlIH0gZnJvbSAnQHN2ZWx0ZWpzL3ZpdGUtcGx1Z2luLXN2ZWx0ZSc7XG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gIHBsdWdpbnM6IFtzdmVsdGUoKV0sXG4gIHNlcnZlcjoge1xuICAgIHBvcnQ6IDUxNzMsXG4gICAgaG9zdDogdHJ1ZSxcbiAgICBhbGxvd2VkSG9zdHM6IFsnYTg2MjI3YzJjYWZiLm5ncm9rLWZyZWUuYXBwJ11cbiAgfSxcbiAgYnVpbGQ6IHtcbiAgICBvdXREaXI6ICdkaXN0JyxcbiAgICBzb3VyY2VtYXA6IGZhbHNlXG4gIH0sXG4gIHJlc29sdmU6IHtcbiAgICBhbGlhczoge1xuICAgICAgJGxpYjogJy9zcmMvbGliJyxcbiAgICAgICRjb21wb25lbnRzOiAnL3NyYy9jb21wb25lbnRzJyxcbiAgICAgICRzdG9yZTogJy9zcmMvc3RvcmUnLFxuICAgICAgJHV0aWxzOiAnL3NyYy91dGlscydcbiAgICB9XG4gIH1cbn0pO1xuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUFnVixTQUFTLG9CQUFvQjtBQUM3VyxTQUFTLGNBQWM7QUFFdkIsSUFBTyxzQkFBUSxhQUFhO0FBQUEsRUFDMUIsU0FBUyxDQUFDLE9BQU8sQ0FBQztBQUFBLEVBQ2xCLFFBQVE7QUFBQSxJQUNOLE1BQU07QUFBQSxJQUNOLE1BQU07QUFBQSxJQUNOLGNBQWMsQ0FBQyw2QkFBNkI7QUFBQSxFQUM5QztBQUFBLEVBQ0EsT0FBTztBQUFBLElBQ0wsUUFBUTtBQUFBLElBQ1IsV0FBVztBQUFBLEVBQ2I7QUFBQSxFQUNBLFNBQVM7QUFBQSxJQUNQLE9BQU87QUFBQSxNQUNMLE1BQU07QUFBQSxNQUNOLGFBQWE7QUFBQSxNQUNiLFFBQVE7QUFBQSxNQUNSLFFBQVE7QUFBQSxJQUNWO0FBQUEsRUFDRjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==

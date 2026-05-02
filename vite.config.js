import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3120,
    proxy: {
      "/api": {
        target: "http://localhost:3120",
        changeOrigin: true,
      },
      "/health": {
        target: "http://localhost:3120",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
  },
});

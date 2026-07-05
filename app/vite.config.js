import { defineConfig } from "vite";

// Tauri expects a fixed dev server on 1420. `fs.allow: ['..']` lets the
// frontend import the shared engine at ../engine (repo root, outside app/).
export default defineConfig({
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    fs: { allow: [".."] },
  },
  build: {
    target: "es2021",
    outDir: "dist",
    emptyOutDir: true,
  },
});

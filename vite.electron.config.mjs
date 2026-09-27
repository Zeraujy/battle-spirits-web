import { defineConfig } from "vite";
import { builtinModules } from "node:module";
import { resolve } from "node:path";

// Electron main/preload are Node runtimes, not browser bundles. Building them
// as SSR prevents Vite from replacing node:* built-ins with browser stubs.
// Those built-ins stay external and are resolved by Electron/Node at runtime.
const nodeBuiltins = new Set([
  ...builtinModules,
  ...builtinModules.map((name) => `node:${name}`),
]);

export default defineConfig({
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
  build: {
    outDir: "desktop-dist",
    emptyOutDir: true,
    sourcemap: false,
    minify: true,
    reportCompressedSize: false,
    ssr: true,
    rolldownOptions: {
      input: {
        main: resolve("electron/main.cjs"),
        preload: resolve("electron/preload.cjs"),
      },
      external: (id) => id === "electron" || id === "socket.io-client" || nodeBuiltins.has(id),
      output: {
        format: "cjs",
        minify: true,
        comments: false,
        minifyInternalExports: true,
        entryFileNames: "[name].cjs",
        chunkFileNames: "chunks/[name]-[hash].cjs",
        exports: "auto",
      },
    },
  },
});

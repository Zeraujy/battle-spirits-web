import { defineConfig } from "vite";
import { resolve } from "node:path";

// Desktop-only production bundle. The readable Electron sources remain in the
// repository for development, but packaged clients receive only this minified
// bundle inside app.asar.
export default defineConfig({
  define: {
    "process.env.NODE_ENV": JSON.stringify("production")
  },
  build: {
    outDir: "desktop-dist",
    emptyOutDir: true,
    sourcemap: false,
    minify: true,
    reportCompressedSize: false,
    lib: {
      entry: {
        main: resolve("electron/main.cjs"),
        preload: resolve("electron/preload.cjs")
      },
      formats: ["cjs"]
    },
    rolldownOptions: {
      external: ["electron", "socket.io-client"],
      output: {
        format: "cjs",
        minify: true,
        comments: false,
        minifyInternalExports: true,
        entryFileNames: "[name].cjs",
        chunkFileNames: "chunks/[name]-[hash].cjs",
        exports: "auto"
      }
    }
  }
});

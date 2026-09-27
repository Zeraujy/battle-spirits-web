import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "./",

  build: {
    outDir: "dist",
    sourcemap: false,
    minify: true,
    chunkSizeWarningLimit: 1200,

    rolldownOptions: {
      output: {
        minify: true,
        comments: false,
        minifyInternalExports: true,
        codeSplitting: {
          groups: [
            {
              name: "react",
              test: /node_modules[\\/](?:react|react-dom)[\\/]/,
              priority: 20
            },
            {
              name: "network",
              test: /node_modules[\\/](?:socket\.io-client|@supabase[\\/])/,
              priority: 10
            }
          ]
        }
      }
    }
  }
});

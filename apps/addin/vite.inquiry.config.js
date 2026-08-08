import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const inquiryRoot = fileURLToPath(new URL("./inquiry", import.meta.url));
const inquiryOutDir = fileURLToPath(new URL("./dist/outlook-addin", import.meta.url));

export default defineConfig(({ mode }) => ({
  root: inquiryRoot,
  base: mode === "production" ? "/outlook-addin/" : "/",
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: 5188,
  },
  preview: {
    host: "127.0.0.1",
    port: 5189,
  },
  build: {
    outDir: inquiryOutDir,
    emptyOutDir: true,
    sourcemap: false,
  },
}));

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => ({
  // Vite's production mode is hosted below CloudFront's /addin/ prefix;
  // local dev keeps root-relative URLs so the localhost manifest remains valid.
  base: mode === "production" ? "/addin/" : "/",
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: 5186,
  },
  preview: {
    host: "127.0.0.1",
    port: 5187,
  },
}));

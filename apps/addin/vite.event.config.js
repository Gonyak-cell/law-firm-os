import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    emptyOutDir: false,
    lib: {
      entry: fileURLToPath(new URL("./src/outlook-event-entry.js", import.meta.url)),
      name: "LawOSOutlookEventRuntime",
      formats: ["iife"],
      fileName: () => "event-runtime.js",
    },
    minify: true,
    sourcemap: false,
  },
});

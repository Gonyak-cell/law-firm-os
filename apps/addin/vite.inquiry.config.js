import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const inquiryRoot = fileURLToPath(new URL("./inquiry", import.meta.url));
const inquiryOutDir = fileURLToPath(new URL("./dist/outlook-addin", import.meta.url));
const inquiryProfile = Object.freeze({
  key: "inquiry-only",
  productId: "952431be-51b8-42a2-9bf6-769a15934e85",
  productionSourceLocation:
    "/outlook-addin/index.html?tenantId=tenant_amic_matter_vault&clientInquiryOnly=1",
  productionBase: "/outlook-addin/",
  itemModes: ["read"],
  actions: ["inquiry.create", "inquiry.link"],
});
const configuredBuildRevision = process.env.LAWOS_OUTLOOK_ADDIN_BUILD_REVISION;
const buildRevision = configuredBuildRevision === undefined ? "local" : configuredBuildRevision;
if (buildRevision !== buildRevision.trim() || !/^[A-Za-z0-9._-]{1,128}$/u.test(buildRevision)) {
  throw new TypeError("LAWOS_OUTLOOK_ADDIN_BUILD_REVISION is invalid");
}

export default defineConfig(({ mode }) => ({
  root: inquiryRoot,
  base: mode === "production" ? "/outlook-addin/" : "/",
  define: {
    __LAWOS_OUTLOOK_BUILD_PROFILE__: JSON.stringify(inquiryProfile),
    __LAWOS_OUTLOOK_NAA_REDIRECT_PATH__: JSON.stringify("/outlook-addin/index.html"),
    __LAWOS_OUTLOOK_ADDIN_BUILD__: JSON.stringify(`addin@${buildRevision}`),
  },
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

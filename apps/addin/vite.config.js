import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const configuredVaultAttach =
  process.env.LAWOS_OUTLOOK_VAULT_ATTACH_ENABLED ?? "0";
if (!new Set(["0", "1"]).has(configuredVaultAttach)) {
  throw new TypeError("LAWOS_OUTLOOK_VAULT_ATTACH_ENABLED must be 0 or 1");
}
const configuredVaultSourceSave =
  process.env.LAWOS_OUTLOOK_VAULT_SOURCE_SAVE_ENABLED ?? "0";
if (!new Set(["0", "1"]).has(configuredVaultSourceSave)) {
  throw new TypeError("LAWOS_OUTLOOK_VAULT_SOURCE_SAVE_ENABLED must be 0 or 1");
}

const matterProfile = Object.freeze({
  key: "matter-full",
  productId: "8f3cc90d-56dd-4c1c-b9c2-0a1100500101",
  productionSourceLocation: "/addin/index.html",
  productionBase: "/addin/",
  vaultExactAttachmentEnabled: configuredVaultAttach === "1",
  vaultSourceSaveEnabled: configuredVaultSourceSave === "1",
});
const configuredBuildRevision = process.env.LAWOS_OUTLOOK_ADDIN_BUILD_REVISION;
const buildRevision = configuredBuildRevision === undefined ? "local" : configuredBuildRevision;
if (buildRevision !== buildRevision.trim() || !/^[A-Za-z0-9._-]{1,128}$/u.test(buildRevision)) {
  throw new TypeError("LAWOS_OUTLOOK_ADDIN_BUILD_REVISION is invalid");
}

export default defineConfig(({ mode }) => ({
  // Vite's production mode is hosted below CloudFront's /addin/ prefix;
  // local dev keeps root-relative URLs so the localhost manifest remains valid.
  base: mode === "production" ? "/addin/" : "/",
  define: {
    __LAWOS_OUTLOOK_BUILD_PROFILE__: JSON.stringify(matterProfile),
    __LAWOS_OUTLOOK_NAA_REDIRECT_PATH__: JSON.stringify("/addin/index.html"),
    __LAWOS_OUTLOOK_ADDIN_BUILD__: JSON.stringify(`addin@${buildRevision}`),
  },
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

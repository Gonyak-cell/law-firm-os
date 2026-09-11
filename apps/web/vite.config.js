import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const apiProxyTarget = process.env.LAWOS_WEB_API_PROXY_TARGET ?? "http://127.0.0.1:4180";
const webRoot = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = resolve(webRoot, "../..");

export default {
  base: "./",
  server: {
    strictPort: true,
    fs: {
      strict: true,
      allow: [
        webRoot,
        resolve(repoRoot, "packages/matter/src/practice-area.js"),
      ],
    },
    proxy: {
      "^/master-data(?:/|$)": apiProxyTarget,
      "^/api(?:/|$)": apiProxyTarget,
    }
  }
};

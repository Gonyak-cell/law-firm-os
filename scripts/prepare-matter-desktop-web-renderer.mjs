#!/usr/bin/env node
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..");
const webRoot = join(repoRoot, "apps/web");
const webDist = join(webRoot, "dist");
const desktopRendererWeb = join(repoRoot, "apps/desktop/src/renderer/web");
const receiptPath = join(repoRoot, "docs/lazycodex/evidence/matter-web/desktop-web-renderer-asset.md");

await execFileAsync("npm", ["--workspace", "apps/web", "run", "build"], { cwd: repoRoot });

if (!existsSync(join(webDist, "index.html"))) {
  throw new Error("apps/web build did not produce dist/index.html");
}

await rm(desktopRendererWeb, { recursive: true, force: true });
await mkdir(dirname(receiptPath), { recursive: true });
await cp(webDist, desktopRendererWeb, { recursive: true });

const receipt = `# Desktop Web Renderer Asset Receipt

Status: PASS

The canonical \`apps/web\` build was copied into the desktop auth shell handoff target.

## Paths

- Source: \`apps/web/dist/index.html\`
- Desktop renderer target: \`apps/desktop/src/renderer/web/index.html\`

## Boundary

- UI source of truth: \`apps/web\`
- Desktop \`offline.html\`: auth/password reset gate only
- production go-live: false
- public release: false
- owner approval: false
`;

await writeFile(receiptPath, receipt);

console.log(JSON.stringify({
  verdict: "PASS",
  source: "apps/web/dist/index.html",
  target: "apps/desktop/src/renderer/web/index.html",
  ui_source_of_truth: "apps/web",
  production_go_live: false,
  public_release: false,
  owner_approval: false
}, null, 2));

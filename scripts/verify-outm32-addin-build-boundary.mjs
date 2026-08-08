import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ADDIN = join(ROOT, "apps/addin");
const DIST = join(ADDIN, "dist");
const FORBIDDEN_IMPORTS = Object.freeze(["docx", "@law-firm-os/matter", "packages/matter"]);
const FORBIDDEN_BUNDLE_MARKERS = Object.freeze([
  "amic-matter-agreement-docx",
  "MatterDocumentTemplateVersion",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "[Content_Types].xml",
]);

function filesBelow(root, accepted) {
  const files = [];
  const visit = (path) => {
    for (const name of readdirSync(path)) {
      const child = join(path, name);
      if (statSync(child).isDirectory()) visit(child);
      else if (accepted(child)) files.push(child);
    }
  };
  visit(root);
  return files;
}

const packageJson = JSON.parse(readFileSync(join(ADDIN, "package.json"), "utf8"));
for (const dependency of FORBIDDEN_IMPORTS.slice(0, 2)) {
  assert.equal(packageJson.dependencies?.[dependency], undefined, `Add-in must not depend on ${dependency}`);
  assert.equal(packageJson.devDependencies?.[dependency], undefined, `Add-in must not dev-depend on ${dependency}`);
}

const sourceFiles = filesBelow(join(ADDIN, "src"), (path) => [".js", ".jsx", ".mjs"].includes(extname(path)));
const importEdges = [];
for (const path of sourceFiles) {
  const source = readFileSync(path, "utf8");
  for (const match of source.matchAll(/(?:from\s*|import\s*\()\s*["']([^"']+)["']/gu)) {
    importEdges.push({ source: relative(ROOT, path), target: match[1] });
  }
}
for (const edge of importEdges) {
  assert.equal(FORBIDDEN_IMPORTS.some((entry) => edge.target === entry || edge.target.startsWith(`${entry}/`) || edge.target.includes(entry)), false, `forbidden Add-in import: ${edge.source} -> ${edge.target}`);
}

assert.equal(existsSync(join(DIST, "index.html")), true, "Add-in application build is missing dist/index.html");
assert.equal(existsSync(join(DIST, "event-runtime.js")), true, "Add-in event runtime build is missing dist/event-runtime.js");
const bundles = filesBelow(DIST, (path) => extname(path) === ".js");
assert.ok(bundles.length > 0, "Add-in build produced no JavaScript bundles");
for (const path of bundles) {
  const bundle = readFileSync(path, "utf8");
  for (const marker of FORBIDDEN_BUNDLE_MARKERS) {
    assert.equal(bundle.includes(marker), false, `server-only DOCX marker leaked into ${relative(ROOT, path)}: ${marker}`);
  }
}

process.stdout.write(`${JSON.stringify({
  outcome: "passed",
  addin_source_files: sourceFiles.length,
  import_edges_checked: importEdges.length,
  built_bundles_checked: bundles.length,
  server_only_docx_leaks: 0,
})}\n`);

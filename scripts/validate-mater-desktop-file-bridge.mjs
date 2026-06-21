#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const DESKTOP_SRC = "apps/desktop/src";

function listFiles(dir) {
  if (!existsSync(dir)) return [];
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...listFiles(path));
    else if (path.endsWith(".js") || path.endsWith(".mjs")) files.push(path);
  }
  return files.sort();
}

function lineFindings(path, source) {
  const findings = [];
  const checks = [
    ["directory_watch", /\b(?:fs\.)?(?:watch|watchFile)\s*\(|chokidar|createWatcher/],
    ["recursive_scan", /\b(?:readdir|readdirSync|opendir|opendirSync)\s*\(|\bglob\s*\(|fast-glob|recursive\s*:\s*true/],
    ["arbitrary_path_read", /\b(?:readFile|readFileSync|createReadStream)\s*\(\s*(?:request|payload|params|input)?\.?(?:path|filePath|absolutePath)/],
    ["arbitrary_path_write", /\b(?:writeFile|writeFileSync|appendFile|appendFileSync|createWriteStream)\s*\(\s*(?:request|payload|params|input)?\.?(?:path|filePath|absolutePath)/],
    ["path_retention", /\b(?:localStorage|sessionStorage|indexedDB|JSON\.stringify|writeFile|writeFileSync|appendFile|appendFileSync)\b.*(?:path|filePath|absolutePath)/i],
    ["path_retention", /selectedHandles\.set\([\s\S]*?\{[\s\S]*?(?:path|filePath|absolutePath)[\s\S]*?\}/]
  ];

  for (const [lineNumber, line] of source.split("\n").entries()) {
    for (const [code, pattern] of checks.slice(0, 5)) {
      if (pattern.test(line)) findings.push(`${path}:${lineNumber + 1}:${code}`);
    }
  }

  for (const [code, pattern] of checks.slice(5)) {
    if (pattern.test(source)) findings.push(`${path}:source:${code}`);
  }

  return findings;
}

function collectFindings(sources) {
  return sources.flatMap(({ path, source }) => lineFindings(path, source));
}

const desktopSources = listFiles(DESKTOP_SRC).map((path) => ({ path, source: readFileSync(path, "utf8") }));
const findings = collectFindings(desktopSources);

const probes = {
  directory_watch: collectFindings([{ path: "probe-directory-watch.js", source: "fs.watch('/Users/example/Documents', () => {})" }]),
  recursive_scan: collectFindings([{ path: "probe-recursive-scan.js", source: "readdirSync('/Users/example', { recursive: true })" }]),
  arbitrary_path_read: collectFindings([{ path: "probe-arbitrary-read.js", source: "readFileSync(request.path)" }]),
  arbitrary_path_write: collectFindings([{ path: "probe-arbitrary-write.js", source: "writeFileSync(payload.filePath, data)" }]),
  path_retention: collectFindings([
    { path: "probe-path-retention.js", source: "localStorage.setItem('lastPath', filePath); selectedHandles.set(handleId, { filePath })" }
  ])
};

for (const [probeName, probeFindings] of Object.entries(probes)) {
  assert(
    probeFindings.some((finding) => finding.includes(probeName.replaceAll("_", "-")) || finding.includes(probeName)),
    `${probeName} probe was not detected`
  );
}

assert.deepEqual(findings, [], "desktop file bridge forbidden filesystem findings present");

console.log(
  JSON.stringify(
    {
      verdict: "PASS",
      checked_files: desktopSources.length,
      findings,
      probes: {
        directory_watch: "detected",
        recursive_scan: "detected",
        arbitrary_path_read: "detected",
        arbitrary_path_write: "detected",
        path_retention: "detected"
      }
    },
    null,
    2
  )
);

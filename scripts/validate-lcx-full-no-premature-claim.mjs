#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOTS = [
  "docs/lazycodex/evidence/matter-web/artifacts",
  "docs/lazycodex/evidence/matter-desktop",
  "docs/desktop",
  "apps/desktop/dist/release"
];
const FILES = [
  "docs/lazycodex/lcx-full-implementation-tuw-plan-2026-06-30.md",
  "docs/lazycodex/lcx-full-implementation-tuw-traceability-2026-06-30.md"
];
const JSON_TRUE_KEYS = new Set([
  "public_release_claim",
  "production_go_live_claim",
  "owner_approval_claim",
  "actual_launch_go_live_claim",
  "app_store_distribution_claim",
  "microsoft_store_distribution_claim",
  "windows_authenticode_signing_claim",
  "provider_production_write_claim",
  "vault_document_write_enabled",
  "go_live_approved"
]);

function listFiles(dir) {
  if (!existsSync(dir)) return [];
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...listFiles(path));
    else if (/\.(md|json)$/.test(entry.name)) files.push(path);
  }
  return files;
}

function scanJson(path, source) {
  const findings = [];
  let parsed;
  try {
    parsed = JSON.parse(source);
  } catch {
    return findings;
  }

  function visit(value, trail = []) {
    if (!value || typeof value !== "object") return;
    for (const [key, child] of Object.entries(value)) {
      const nextTrail = [...trail, key];
      if (JSON_TRUE_KEYS.has(key) && child === true) findings.push(`${path}:${nextTrail.join(".")} true`);
      visit(child, nextTrail);
    }
  }

  visit(parsed);
  return findings;
}

function scanText(path, source) {
  const findings = [];
  const positiveLine = /(^|\b)(public release|production go-live|owner approval|provider production write|vault document write|go-live approved|windows authenticode)(\s*(claim|status|state|approval|enabled))?\s*[:|=]\s*(true|approved|ready|complete|pass|enabled)\b/i;
  source.split("\n").forEach((line, index) => {
    if (positiveLine.test(line) && !/\b(false|not claimed|not approved|blocked|pending|denied)\b/i.test(line)) {
      findings.push(`${path}:${index + 1}:${line.trim()}`);
    }
  });
  return findings;
}

const files = [...ROOTS.flatMap(listFiles), ...FILES.filter((path) => existsSync(path))].sort();
const findings = [];
for (const path of files) {
  const source = readFileSync(path, "utf8");
  findings.push(...scanJson(path, source), ...scanText(path, source));
}

const probes = [
  scanJson("probe.json", '{"public_release_claim":true}'),
  scanJson("probe.json", '{"production_go_live_claim":true}'),
  scanJson("probe.json", '{"owner_approval_claim":true}'),
  scanText("probe.md", "production go-live: approved")
];
assert.equal(probes.every((result) => result.length === 1), true, "claim guard probes must be detected");
assert.deepEqual(findings, [], `premature claims found:\n${findings.join("\n")}`);

console.log(JSON.stringify({
  verdict: "PASS",
  checked_files: files.length,
  findings,
  public_release_claim: false,
  production_go_live_claim: false,
  owner_approval_claim: false,
  provider_production_write_claim: false
}, null, 2));

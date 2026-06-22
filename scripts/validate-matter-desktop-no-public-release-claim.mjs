#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const scanRoots = ["docs/lazycodex/evidence/matter-desktop", "docs/desktop"];

function listMarkdownFiles(dir) {
  if (!existsSync(dir)) return [];
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...listMarkdownFiles(path));
    else if (entry.isFile() && path.endsWith(".md")) files.push(path);
  }
  return files.sort();
}

function claimFindings(path, source) {
  const findings = [];
  const positivePatterns = [
    ["public_release_claim", /\bpublic[- ]release\b\s*[:|]\s*(true|approved|ready|yes|pass)\b/i],
    ["production_go_live_claim", /\bproduction go-live\b\s*[:|]\s*(true|approved|ready|yes|pass)\b/i],
    ["owner_approval_claim", /\bowner[- ]approved\b\s*[:|]\s*(true|approved|ready|yes|pass)\b/i],
    ["owner_approval_claim", /\bowner approval\b\s*[:|]\s*(true|approved|ready|yes|pass)\b/i],
    ["status_public_release", /^Status:\s*(public_release_approved|production_ready|owner_approved)\b/i]
  ];

  source.split("\n").forEach((line, index) => {
    for (const [code, pattern] of positivePatterns) {
      if (pattern.test(line)) findings.push(`${path}:${index + 1}:${code}`);
    }
  });
  return findings;
}

function collectFindings(sources) {
  return sources.flatMap(({ path, source }) => claimFindings(path, source));
}

const sources = scanRoots.flatMap((root) => listMarkdownFiles(root).map((path) => ({ path, source: readFileSync(path, "utf8") })));
const findings = collectFindings(sources);
const probes = {
  public_release_claim: collectFindings([{ path: "probe-public.md", source: "public-release: true" }]),
  production_go_live_claim: collectFindings([{ path: "probe-prod.md", source: "production go-live: approved" }]),
  owner_approval_claim: collectFindings([{ path: "probe-owner.md", source: "owner-approved: true" }])
};

for (const [probeName, probeFindings] of Object.entries(probes)) {
  assert(probeFindings.some((finding) => finding.includes(probeName)), `${probeName} probe was not detected`);
}

assert.deepEqual(findings, [], "matter desktop public release / go-live / owner approval claim found without receipt");

console.log(
  JSON.stringify(
    {
      verdict: "PASS",
      checked_files: sources.length,
      findings,
      probes: Object.fromEntries(Object.keys(probes).map((probeName) => [probeName, "detected"])),
      public_release_claim: false,
      production_go_live_claim: false,
      owner_approval_claim: false
    },
    null,
    2
  )
);

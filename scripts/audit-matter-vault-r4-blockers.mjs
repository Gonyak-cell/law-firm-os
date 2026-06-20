#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const scans = [
  {
    id: "matter-never-owns-document-bytes",
    file: "packages/matter/src/matter-vault-link.js",
    required: [/Matter must not store document bytes/, /document_bytes_included: false/],
    forbidden: [/matter_owns_document_bytes:\\s*true/],
  },
  {
    id: "vault-summary-count-leak-safe",
    file: "packages/matter/src/matter-vault-link.js",
    required: [/createMatterVaultSummary/, /omitted_denied_count: null/, /count_leak_prevented: true/],
    forbidden: [/denied_count:\\s*documents\\.length/],
  },
  {
    id: "launch-claim-separated",
    file: "docs/reorganization/client-matter-os/matter-vault-r4/signoff.md",
    required: [
      /Owner release authority \| received for release\/cutover progression/,
      /External production smoke receipt \| pending/,
      /Production migration operator receipt \| pending/,
      /Actual launch\/go-live completed claim \| false/,
    ],
    forbidden: [/go-live approved/i],
  },
  {
    id: "crosswalk-closed",
    file: "docs/reorganization/client-matter-os/matter-vault-r4/package-manifest.json",
    required: [/"closed_tuws": 118/, /"not_closed_tuws": 0/, /"go_live_claim": false/],
    forbidden: [/"not_closed_tuws": [1-9]/, /"go_live_claim": true/],
  },
  {
    id: "loop-closeout-recorded",
    file: "docs/reorganization/client-matter-os/matter-vault-r4/loop-closeout.md",
    required: [/Closed TUWs: 118\/118/, /Go-live claim: false/],
    forbidden: [/go-live approved/i],
  },
];

const findings = [];

for (const scan of scans) {
  const full = path.join(ROOT, scan.file);
  if (!existsSync(full)) {
    findings.push(`${scan.id}: missing ${scan.file}`);
    continue;
  }
  const text = readFileSync(full, "utf8");
  for (const pattern of scan.required) {
    if (!pattern.test(text)) findings.push(`${scan.id}: missing ${pattern.source}`);
  }
  for (const pattern of scan.forbidden) {
    if (pattern.test(text)) findings.push(`${scan.id}: forbidden ${pattern.source}`);
  }
}

if (findings.length > 0) {
  console.error("Matter-Vault R4 blockers remain:");
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}

console.log("Matter-Vault R4 blocker audit passed.");

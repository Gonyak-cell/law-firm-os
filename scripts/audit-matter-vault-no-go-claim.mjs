#!/usr/bin/env node
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const MV_ROOT = path.join(ROOT, "docs/reorganization/client-matter-os/matter-vault-r4");
const forbidden = [
  /production_ready_claim\s*[:=]\s*true/i,
  /go_live_claim\s*[:=]\s*true/i,
  /go-live approved/i,
  /launch approved/i,
  /production deployment approved/i,
];

const findings = [];

function listFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) out.push(...listFiles(full));
    else out.push(full);
  }
  return out;
}

for (const file of listFiles(MV_ROOT)) {
  const text = readFileSync(file, "utf8");
  for (const pattern of forbidden) {
    if (pattern.test(text)) findings.push(`${path.relative(ROOT, file)} contains forbidden launch claim ${pattern.source}`);
  }
}

if (findings.length > 0) {
  console.error("Matter-Vault no-go claim audit failed:");
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}

console.log("Matter-Vault no-go claim audit passed.");
console.log("launch_go_live_claim: false");

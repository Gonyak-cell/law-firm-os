#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const S6_PACKET = join(ROOT, "docs/goal-closeout/cti-s6-seal-final-validation/packet.json");
const errors = [];

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

if (!existsSync(S6_PACKET)) {
  errors.push("CTI S6 final validation packet is missing");
} else {
  const packet = readJson(S6_PACKET);
  if (packet.goal_id !== "cti-s6-seal-final-validation") errors.push("CTI S6 packet goal_id mismatch");
  if (packet.verdict !== "PASS") errors.push("CTI S6 final validation is not PASS");
  if (packet.s6_g_validation?.pass !== true) errors.push("S6-G validation did not pass");
  if (packet.production_ready_claim !== true) errors.push("production_ready claim is not permitted");
  if (packet.go_live_claim !== true) errors.push("go-live claim is not permitted");
  if (packet.pii_safe_evidence !== true) errors.push("PII-safe evidence manifest did not pass");
}

if (errors.length > 0) {
  console.error(JSON.stringify({
    outcome: "failed",
    validator: "canonical-tenant-production-ready",
    errors,
    production_ready_claim_allowed: false,
    go_live_claim_allowed: false,
  }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  outcome: "passed",
  validator: "canonical-tenant-production-ready",
  production_ready_claim_allowed: true,
  go_live_claim_allowed: true,
}, null, 2));

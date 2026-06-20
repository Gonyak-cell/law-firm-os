#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const errors = [];
const currentBoundary = "runtime_api_evidence_only__durable_persistence_open";
const targetState = "runtime_write_ready__durable_persistence_guarded";

function read(path) {
  return readFileSync(resolve(root, path), "utf8");
}

function assert(condition, message) {
  if (!condition) errors.push(message);
}

const requiredBoundaryFiles = [
  "docs/hrx-enterprise/00-boundary-decision.md",
  "docs/hrx-enterprise/01-terminology.md",
  "docs/hrx-enterprise/02-tuw-governance.md",
  "docs/hrx-enterprise/03-release-gates.md",
  "docs/hrx-enterprise/acceptance-gates.md",
  "docs/hrx-enterprise/plan-intake.md",
  "docs/hrx-enterprise/dev-handoff-receipt.md",
  "docs/hrx-enterprise/tuw-traceability-matrix.md",
];

for (const file of requiredBoundaryFiles) {
  assert(existsSync(resolve(root, file)), `${file}: missing`);
  if (existsSync(resolve(root, file))) {
    const text = read(file);
    assert(text.includes(currentBoundary), `${file}: missing current boundary ${currentBoundary}`);
  }
}

const boundaryDecision = existsSync(resolve(root, "docs/hrx-enterprise/00-boundary-decision.md"))
  ? read("docs/hrx-enterprise/00-boundary-decision.md")
  : "";
assert(boundaryDecision.includes("The target state is not the current state"), "boundary decision must separate target from current state");

const releaseGates = existsSync(resolve(root, "docs/hrx-enterprise/03-release-gates.md"))
  ? read("docs/hrx-enterprise/03-release-gates.md")
  : "";
for (const gate of ["G-P0-1 Durable Persistence", "G-P0-2 Route Authz", "G-P0-3 Step-up", "G-P0-4 Durable Audit", "G-P0-5 Real Context", "G-P0-6 E2E", "G-P0-7 No Premature Claim"]) {
  assert(releaseGates.includes(gate), `release gates missing ${gate}`);
}

const targetClaimFiles = [
  "docs/hrx-enterprise/00-boundary-decision.md",
  "docs/hrx-enterprise/01-terminology.md",
  "docs/hrx-enterprise/02-tuw-governance.md",
  "docs/hrx-enterprise/03-release-gates.md",
  "docs/hrx-enterprise/plan-intake.md",
  "docs/hrx-enterprise/dev-handoff-receipt.md",
  "docs/hrx-enterprise/tuw-traceability-matrix.md",
];

for (const file of targetClaimFiles) {
  if (!existsSync(resolve(root, file))) continue;
  const text = read(file);
  for (const [lineIndex, line] of text.split(/\r?\n/).entries()) {
    if (!line.includes(targetState)) continue;
    const lower = line.toLowerCase();
    const lineIsExplicitlyTargetOnly =
      lower.includes("target") ||
      lower.includes("future") ||
      lower.includes("not the current") ||
      lower.includes("not a current") ||
      lower.includes("does not claim") ||
      lower.includes("do not prove") ||
      lower.includes("does not prove") ||
      lower.includes("cannot close") ||
      line.includes("목표");
    const lineLooksLikeCurrentClaim =
      lower.includes("current") ||
      line.includes("현재") ||
      lower.includes("status") ||
      lower.includes("boundary") ||
      lower.includes("readiness");
    if (lineLooksLikeCurrentClaim && !lineIsExplicitlyTargetOnly) {
      errors.push(`${file}:${lineIndex + 1}: target state appears to be claimed as current state`);
    }
  }
}

const filesThatMustMentionOwnerSignoff = [
  "docs/hrx-enterprise/03-release-gates.md",
  "docs/hrx-enterprise/go-no-go-template.md",
  "docs/hrx-enterprise/owner-decision-template.md",
  "docs/hrx-enterprise/dev-handoff-receipt.md",
];
for (const file of filesThatMustMentionOwnerSignoff) {
  if (!existsSync(resolve(root, file))) {
    errors.push(`${file}: missing`);
    continue;
  }
  const text = read(file).toLowerCase();
  assert(
    text.includes("owner") || text.includes("human") || text.includes("release authority"),
    `${file}: must preserve human/owner sign-off boundary`,
  );
}

const packageManifest = existsSync(resolve(root, "docs/hrx-enterprise/roadmap-package/package-manifest.json"))
  ? JSON.parse(read("docs/hrx-enterprise/roadmap-package/package-manifest.json"))
  : null;
assert(packageManifest?.tuW_count === 127, "roadmap package manifest must report 127 TUWs");
assert(packageManifest?.p0_count === 63, "roadmap package manifest must report 63 P0 TUWs");
assert(packageManifest?.target_state === targetState, "roadmap package manifest target state mismatch");

if (errors.length > 0) {
  console.error("HRX no-premature-claim validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("HRX no-premature-claim validation passed.");
console.log(`current_boundary: ${currentBoundary}`);
console.log(`target_state: ${targetState}`);
console.log("go_live_claim_allowed: false");

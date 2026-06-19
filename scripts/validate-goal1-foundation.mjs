#!/usr/bin/env node
import { access, readFile } from "node:fs/promises";
import path from "node:path";

const errors = [];

async function exists(relativePath) {
  try {
    await access(path.resolve(relativePath));
    return true;
  } catch {
    return false;
  }
}

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.resolve(relativePath), "utf8"));
}

function requireText(value, needle, label) {
  const text = JSON.stringify(value);
  if (!text.includes(needle)) errors.push(`${label} missing ${needle}`);
}

function requireArrayIncludes(array, value, label) {
  if (!Array.isArray(array) || !array.includes(value)) errors.push(`${label} missing ${value}`);
}

async function requireFiles(files, label) {
  for (const file of files) {
    if (!(await exists(file))) errors.push(`${label} missing file: ${file}`);
  }
}

const requiredContracts = [
  "contracts/law-firm-os.product-contract.json",
  "contracts/core-domain-contract.json",
  "contracts/permission-kernel-contract.json",
  "contracts/audit-compliance-contract.json",
  "contracts/goal1-claude-review-contract.json",
  "contracts/goal1-mutual-agreement-contract.json",
];

const requiredPackageFiles = [
  "packages/domain/package.json",
  "packages/domain/src/entities.js",
  "packages/domain/src/invariants.js",
  "packages/domain/src/index.js",
  "packages/domain/test/domain.test.js",
  "packages/authz/package.json",
  "packages/authz/src/evaluate.js",
  "packages/authz/src/index.js",
  "packages/authz/test/authz.test.js",
  "packages/audit/package.json",
  "packages/audit/src/events.js",
  "packages/audit/src/append-only-ledger.js",
  "packages/audit/src/retention.js",
  "packages/audit/src/index.js",
  "packages/audit/test/audit.test.js",
];

const claudePackets = [
  { programId: "RP00", gate: "C00", min: 8, path: "docs/claude-review-packets/goal1-c00-rp00.json" },
  { programId: "RP01", gate: "C01", min: 10, path: "docs/claude-review-packets/goal1-c01-rp01.json" },
  { programId: "RP02", gate: "C02", min: 12, path: "docs/claude-review-packets/goal1-c02-rp02.json" },
  { programId: "RP03", gate: "C03", min: 12, path: "docs/claude-review-packets/goal1-c03-rp03.json" },
];

await requireFiles(requiredContracts, "Goal 1 contract evidence");
await requireFiles(requiredPackageFiles, "Goal 1 package evidence");

const packageJson = await readJson("package.json");
for (const scriptName of [
  "test",
  "build",
  "validate",
  "weighted:validate",
  "goal1:foundation:validate",
  "goal1:claude-review:run",
  "goal1:claude-review:result:validate",
  "goal1:claude-review:validate",
  "goal1:agreement:validate",
  "rp03:audit-architecture:validate",
]) {
  if (!packageJson.scripts?.[scriptName]) errors.push(`package.json missing script ${scriptName}`);
}

const hermesProject = await readJson("hermes/project.json");
const validationCommands = new Map((hermesProject.validation_commands ?? []).map((command) => [command.id, command]));
for (const commandId of [
  "product_contract_validate",
  "goal1_foundation_validate",
  "domain_authz_audit_tests",
  "goal1_claude_review_validate",
  "goal1_agreement_validate",
  "weighted_ledger_validate",
  "rp03_audit_architecture_validate",
]) {
  const command = validationCommands.get(commandId);
  if (!command) {
    errors.push(`hermes/project.json missing validation command ${commandId}`);
  } else {
    if (command.must_pass !== true) errors.push(`validation command ${commandId} must pass`);
    if (command.writes_product_state !== false) errors.push(`validation command ${commandId} must not write product state`);
  }
}

const hermesGates = new Map((hermesProject.foundation_slice_gates ?? []).map((gate) => [gate.id, gate]));
for (const expected of [
  { gateId: "H00", programId: "RP00", claudeGate: "C00", packet: "docs/claude-review-packets/goal1-c00-rp00.json" },
  { gateId: "H01", programId: "RP01", claudeGate: "C01", packet: "docs/claude-review-packets/goal1-c01-rp01.json" },
  { gateId: "H02", programId: "RP02", claudeGate: "C02", packet: "docs/claude-review-packets/goal1-c02-rp02.json" },
  { gateId: "H03", programId: "RP03", claudeGate: "C03", packet: "docs/claude-review-packets/goal1-c03-rp03.json" },
]) {
  const gate = hermesGates.get(expected.gateId);
  if (!gate) {
    errors.push(`hermes/project.json missing foundation gate ${expected.gateId}`);
    continue;
  }
  if (gate.program_id !== expected.programId) errors.push(`${expected.gateId} program_id must be ${expected.programId}`);
  if (gate.claude_gate !== expected.claudeGate) errors.push(`${expected.gateId} claude_gate must be ${expected.claudeGate}`);
  if (gate.required_packet !== expected.packet) errors.push(`${expected.gateId} required_packet mismatch`);
  if (!Array.isArray(gate.validation_command_ids) || gate.validation_command_ids.length < 2) {
    errors.push(`${expected.gateId} must list validation command ids`);
  }
}

const productContract = await readJson("contracts/law-firm-os.product-contract.json");
const domainContract = await readJson("contracts/core-domain-contract.json");
const permissionContract = await readJson("contracts/permission-kernel-contract.json");
const auditContract = await readJson("contracts/audit-compliance-contract.json");
const weightedLedger = await readJson("docs/weighted-implementation-ledger.json");
let claudeReviewResult = null;

if (domainContract.program_id !== "RP01") errors.push("core-domain-contract must bind to RP01");
requireArrayIncludes(domainContract.invariants, "matter_first_traceability", "core domain invariants");
requireArrayIncludes(domainContract.invariants, "dms_owns_documents", "core domain invariants");
requireText(productContract, "matter_first_required", "product contract");

if (permissionContract.program_id !== "RP02") errors.push("permission-kernel-contract must bind to RP02");
requireArrayIncludes(permissionContract.invariants, "deny_over_allow", "permission invariants");
requireArrayIncludes(permissionContract.invariants, "cross_tenant_fails_closed", "permission invariants");
requireArrayIncludes(permissionContract.decision_order, "cross_tenant_deny", "permission decision_order");

if (auditContract.program_id !== "RP03") errors.push("audit-compliance-contract must bind to RP03");
if (auditContract.event_contract?.append_only !== true) errors.push("audit contract must require append_only");
if (auditContract.immutability?.hash_algorithm !== "sha256") errors.push("audit contract must use sha256 hash-chain");
requireArrayIncludes(auditContract.retention_and_legal_hold?.purge_requires, "no_active_legal_hold", "audit purge requirements");

if (weightedLedger.implementation_subphase_count !== 54355) {
  errors.push("weighted ledger must retain 54,355 implementation subphases");
}
if (weightedLedger.requirement_count !== 227) {
  errors.push("weighted ledger must retain 227 requirement references");
}
if (weightedLedger.construction_inspection_template?.id !== "construction_inspection.v1") {
  errors.push("weighted ledger missing construction_inspection.v1");
}
if (weightedLedger.market_validation_template?.id !== "market_validation.v1") {
  errors.push("weighted ledger missing market_validation.v1");
}

const reviewContract = await readJson("contracts/goal1-claude-review-contract.json");
const reviewPrograms = new Map((reviewContract.programs ?? []).map((program) => [program.id, program]));
const requiredPacketFields = reviewContract.review_packet_template?.required_fields ?? [];

for (const packetDef of claudePackets) {
  if (!(await exists(packetDef.path))) {
    errors.push(`missing Claude packet ${packetDef.path}`);
    continue;
  }
  const packet = await readJson(packetDef.path);
  const program = reviewPrograms.get(packetDef.programId);
  if (!program) errors.push(`Claude review contract missing ${packetDef.programId}`);
  if (packet.program_id !== packetDef.programId) errors.push(`${packetDef.path} program_id mismatch`);
  if (packet.claude_gate !== packetDef.gate) errors.push(`${packetDef.path} claude_gate mismatch`);
  if (packet.status !== "packet_ready") errors.push(`${packetDef.path} must be packet_ready`);
  if (!Array.isArray(packet.review_checkpoints) || packet.review_checkpoints.length < packetDef.min) {
    errors.push(`${packetDef.path} must include at least ${packetDef.min} review checkpoints`);
  }
  for (const field of requiredPacketFields) {
    if (!(field in packet)) errors.push(`${packetDef.path} missing packet field ${field}`);
  }
  for (const checkpoint of program?.review_checkpoints ?? []) {
    if (!packet.review_checkpoints?.includes(checkpoint)) {
      errors.push(`${packetDef.path} missing checkpoint ${checkpoint}`);
    }
  }
}

try {
  claudeReviewResult = await readJson("docs/claude-review-results/goal1-claude-review.json");
} catch {
  errors.push("missing actual Claude Code review result: docs/claude-review-results/goal1-claude-review.json");
}

if (claudeReviewResult) {
  if (claudeReviewResult.status !== "review_completed") {
    errors.push(`actual Claude Code review must be review_completed, got ${claudeReviewResult.status}`);
  }
  const review = claudeReviewResult.parsed_review;
  if (!review) {
    errors.push("actual Claude Code review must include parsed_review");
  } else {
    if (!["PASS", "PASS_WITH_FINDINGS"].includes(review.overall_verdict)) {
      errors.push(`actual Claude Code review overall_verdict blocks closeout: ${review.overall_verdict}`);
    }
    if (review.blocks_goal1_closeout === true) {
      errors.push("actual Claude Code review says Goal 1 closeout is blocked");
    }
    for (const gate of ["C00", "C01", "C02", "C03"]) {
      const verdict = review.per_gate?.[gate]?.verdict;
      if (!["PASS", "PASS_WITH_FINDINGS"].includes(verdict)) {
        errors.push(`actual Claude Code review ${gate} verdict blocks closeout: ${verdict}`);
      }
    }
    for (const finding of review.findings ?? []) {
      if (["P0_BLOCKER", "P1_MUST_FIX"].includes(finding.severity)) {
        errors.push(`blocking Claude finding remains: ${finding.severity} ${finding.title}`);
      }
    }
  }
}

if (errors.length > 0) {
  console.error("Goal 1 foundation validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Goal 1 foundation validation passed.");
console.log("programs: RP00/H00/C00, RP01/H01/C01, RP02/H02/C02, RP03/H03/C03");
console.log("packages: domain, authz, audit");
console.log(`weighted_subphases: ${weightedLedger.implementation_subphase_count}`);

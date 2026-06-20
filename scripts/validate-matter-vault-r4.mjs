#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const MV_ROOT = path.join(ROOT, "docs/reorganization/client-matter-os/matter-vault-r4");

const EXPECTED_GATE_COUNTS = Object.freeze({
  "MV-G0": 10,
  "MV-G1": 12,
  "MV-G2": 14,
  "MV-G3": 16,
  "MV-G4": 14,
  "MV-G5": 12,
  "MV-G6": 16,
  "MV-G7": 10,
  "MV-G8": 14,
});

const REQUIRED_DOCS = [
  "README.md",
  "00-source-package-intake.md",
  "package-manifest.json",
  "matter-vault-tuw-crosswalk.json",
  "matter-vault-tuw-crosswalk.csv",
  "ownership.md",
  "api-matrix.md",
  "event-taxonomy.md",
  "ui-ia.md",
  "qa-evidence-checklist.md",
  "pr-plan.md",
  "g0-closeout.md",
  "r4-closeout.md",
  "migration-dry-run.md",
  "rollback-plan.md",
  "signoff.md",
];

const REQUIRED_FILES = [
  "packages/matter/src/matter-vault-link.js",
  "packages/matter/src/matter-vault-link-repository.js",
  "packages/matter/src/matter-opening-orchestrator.js",
  "packages/matter/src/timeline-projection.js",
  "packages/platform/src/persistence/repository.js",
  "packages/platform/src/persistence/unit-of-work.js",
  "packages/platform/src/persistence/migration-runner.js",
  "packages/platform/src/persistence/outbox.js",
  "packages/platform/src/persistence/seed-mode.js",
  "packages/platform/migrations/001_matter_vault_core.sql",
  "packages/dms/src/vault-permission-service.js",
  "packages/ai-governance/src/source-policy.js",
  "packages/ai-governance/src/retrieval-evidence.js",
  "packages/client-portal/src/matter-vault-projection-service.js",
  "apps/api/src/matter-runtime-context.js",
  "apps/api/src/server.js",
  "apps/api/test/matter-vault-integration.test.js",
  "apps/web/src/components/MatterVaultPanel.jsx",
  "apps/web/src/components/MattersSurface.jsx",
  "apps/web/src/data/apiClient.js",
  "apps/web/test/ui-regression.test.mjs",
  "packages/platform/test/matter-vault-persistence.test.js",
  "packages/dms/test/matter-vault-guards.test.js",
  "packages/ai-governance/test/matter-vault-source-policy.test.js",
  "packages/client-portal/test/matter-vault-projection.test.js",
];

const errors = [];

function add(message) {
  errors.push(message);
}

function readRoot(file) {
  return readFileSync(path.join(ROOT, file), "utf8");
}

function readDoc(file) {
  return readFileSync(path.join(MV_ROOT, file), "utf8");
}

function listFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = statSync(full);
    if (stat.isDirectory()) out.push(...listFiles(full));
    else out.push(full);
  }
  return out;
}

function requirePatterns(file, patterns) {
  const source = readRoot(file);
  for (const pattern of patterns) {
    if (!pattern.test(source)) add(`missing marker:${file}:${pattern.source}`);
  }
}

function rejectPatterns(file, patterns) {
  const source = readRoot(file);
  for (const pattern of patterns) {
    if (pattern.test(source)) add(`forbidden marker:${file}:${pattern.source}`);
  }
}

if (!existsSync(MV_ROOT)) add(`missing Matter-Vault root: ${MV_ROOT}`);
for (const doc of REQUIRED_DOCS) {
  if (!existsSync(path.join(MV_ROOT, doc))) add(`missing Matter-Vault doc: ${doc}`);
}
for (const file of REQUIRED_FILES) {
  if (!existsSync(path.join(ROOT, file))) add(`missing Matter-Vault implementation file: ${file}`);
}

if (errors.length === 0) {
  const manifest = JSON.parse(readDoc("package-manifest.json"));
  const crosswalk = JSON.parse(readDoc("matter-vault-tuw-crosswalk.json"));
  if (manifest.total_tuws !== 118) add(`manifest total_tuws must be 118, got ${manifest.total_tuws}`);
  if (manifest.current_completion_claim !== "repo_implementation_candidate_complete") {
    add("manifest current_completion_claim must be repo_implementation_candidate_complete");
  }
  if (manifest.implementation_completion_claim !== true) add("manifest implementation_completion_claim must be true");
  if (manifest.production_ready_claim !== false || manifest.go_live_claim !== false) {
    add("manifest must keep production/go-live claims false");
  }
  if (crosswalk.length !== 118) add(`crosswalk must contain 118 rows, got ${crosswalk.length}`);
  const uniqueIds = new Set(crosswalk.map((row) => row.tuw_id));
  if (uniqueIds.size !== crosswalk.length) add("crosswalk contains duplicate tuw_id values");
  for (const [gate, expected] of Object.entries(EXPECTED_GATE_COUNTS)) {
    const actual = crosswalk.filter((row) => row.gate === gate).length;
    if (actual !== expected) add(`${gate} count must be ${expected}, got ${actual}`);
  }
  for (const row of crosswalk) {
    if (!row.evidence_path?.startsWith("docs/reorganization/client-matter-os/matter-vault-r4/evidence/")) {
      add(`${row.tuw_id}: evidence path must live under matter-vault-r4/evidence`);
    }
    if (!existsSync(path.join(ROOT, row.evidence_path))) add(`${row.tuw_id}: missing evidence file ${row.evidence_path}`);
  }

  for (const phrase of [
    "Total TUWs | 118",
    "Source backlog SHA-256",
    "repo_implementation_candidate_complete",
    "does not claim production readiness or go-live approval",
  ]) {
    if (!readDoc("00-source-package-intake.md").includes(phrase)) add(`source intake missing phrase: ${phrase}`);
  }

  for (const phrase of [
    "Matter owns case execution",
    "Vault/DMS owns document metadata",
    "Matter never stores document bytes",
    "Vault never mutates Matter status",
  ]) {
    if (!readDoc("ownership.md").includes(phrase)) add(`ownership missing phrase: ${phrase}`);
  }

  requirePatterns("packages/matter/src/matter-vault-link.js", [
    /createMatterVaultLink/,
    /createMatterVaultSummary/,
    /Matter must not store document bytes/,
    /Vault must not mutate Matter status/,
    /raw_storage_path_included: false/,
    /document_bytes_included: false/,
  ]);
  requirePatterns("packages/matter/src/matter-opening-orchestrator.js", [
    /openMatterWithVault/,
    /createWorkspaceForMatter/,
    /matter\.vault_link\.created/,
    /clearance_gated_matter_opening_created_vault_workspace/,
    /recordIdempotency/,
  ]);
  requirePatterns("packages/platform/src/persistence/unit-of-work.js", [/runUnitOfWork/, /restore\(item\.snapshot\)/]);
  requirePatterns("packages/platform/src/persistence/repository.js", [/assertProductionRepository/, /durable repository/, /Map repository/]);
  requirePatterns("packages/platform/src/persistence/outbox.js", [/createOutboxEvent/, /enqueueOutboxEvent/]);
  requirePatterns("packages/platform/src/persistence/seed-mode.js", [/synthetic seed mode must be disabled/]);
  requirePatterns("packages/dms/src/vault-permission-service.js", [
    /createMatterVaultPermissionEnvelope/,
    /permission decision required before Matter-Vault search/,
    /omitted_result_count: null/,
  ]);
  requirePatterns("packages/ai-governance/src/source-policy.js", [
    /filterMatterVaultSourcesForAi/,
    /permission decision required before AI retrieval/,
    /unauthorized_source_excluded: true/,
  ]);
  requirePatterns("packages/client-portal/src/matter-vault-projection-service.js", [
    /createMatterVaultPortalProjection/,
    /internal_memo_excluded: true/,
    /projection_only: true/,
    /document_bytes_included: false/,
  ]);
  requirePatterns("packages/matter/src/timeline-projection.js", [
    /projectVaultEventToMatterTimeline/,
    /raw_storage_path_included: false/,
    /document_bytes_included: false/,
  ]);
  requirePatterns("apps/api/src/matter-runtime-context.js", [
    /GET \/api\/matters\/:matter_id\/command-center/,
    /GET \/api\/matters\/:matter_id\/vault-summary/,
    /POST \/api\/matters\/:matter_id\/documents/,
    /handleMatterVaultSummary/,
    /handleMatterDocumentFacade/,
    /handleMatterTimeline/,
    /matter\.document_facade\.uploaded/,
    /document_bytes_included: false/,
    /count_leak_prevented: true/,
  ]);
  requirePatterns("apps/api/src/server.js", [/dmsRuntime: dmsRuntimeContext/, /createDefaultMatterRuntime\(\{[\s\S]*dmsRuntime: dmsRuntimeContext[\s\S]*\}\)/]);
  requirePatterns("apps/api/test/matter-vault-integration.test.js", [
    /Matter-Vault opening creates a Vault workspace/,
    /matter_vault_link/,
    /vault-summary/,
    /timeline/,
    /matter_owns_document_bytes, false/,
  ]);
  requirePatterns("apps/web/src/components/MatterVaultPanel.jsx", [
    /data-mv-matter-vault-panel="true"/,
    /fetchMatterVaultSummary/,
    /fetchMatterTimeline/,
    /raw storage paths, and denied counts stay hidden/,
  ]);
  requirePatterns("apps/web/src/data/apiClient.js", [/fetchMatterVaultSummary/, /fetchMatterTimeline/, /\/vault-summary/, /\/timeline/]);
  requirePatterns("packages/platform/migrations/001_matter_vault_core.sql", [
    /create table if not exists matter_vault_links/,
    /create table if not exists vault_workspaces/,
    /create table if not exists dms_documents/,
    /create table if not exists matter_timeline_events/,
    /create table if not exists integration_outbox/,
  ]);

  rejectPatterns("apps/web/src/components/MatterVaultPanel.jsx", [/mockData|from "\.\.\/data\/mockData/]);

  const forbiddenClaims = [
    /production_ready_claim\\s*[:=]\\s*true/i,
    /go_live_claim\\s*[:=]\\s*true/i,
    /go-live approved/i,
    /status\\s*:\\s*Matter-Vault R4 complete/i,
  ];
  for (const file of listFiles(MV_ROOT)) {
    const text = readFileSync(file, "utf8");
    for (const pattern of forbiddenClaims) {
      if (pattern.test(text)) add(`${path.relative(ROOT, file)} contains forbidden completion claim ${pattern}`);
    }
  }
}

if (errors.length > 0) {
  console.error("Matter-Vault R4 validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Matter-Vault R4 validation passed.");
console.log("tuws: 118");
console.log(`gates: ${Object.keys(EXPECTED_GATE_COUNTS).length}`);
console.log("implementation_lane: matter-vault-r4");
console.log("launch_go_live_claim: false");

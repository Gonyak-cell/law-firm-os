#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  AMIC_CURRENT_MATTER_CLIENTS,
  AMIC_CURRENT_MATTER_CODE_CANDIDATES
} from "../packages/matter/src/amic-matter-code-candidates.js";
import {
  DERIVED_STORE_PATH_MANIFEST,
  STORE_PATH_MANIFEST
} from "../apps/api/src/store-path-manifest.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const GENERATED_AT = "2026-07-06T02:05:06Z";
const REDACTION_SALT = "cti-g0-s0-2026-07-06-redaction-v1";
const PLAN_REF = "workbook/canonical-tenant-data-injection-execution-plan-2026-07-06.md";
const CONTRACT_REF = "contracts/production-data-policy-contract.json";
const GOAL_ID = "cti-g0-s0";

function sha256Text(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function sha256File(file) {
  return sha256Text(await readFile(path.join(ROOT, file), "utf8"));
}

function piiSafeHash(...parts) {
  return sha256Text([REDACTION_SALT, ...parts.map((part) => String(part ?? ""))].join("|"));
}

async function ensureDir(file) {
  await mkdir(path.dirname(path.join(ROOT, file)), { recursive: true });
}

async function writeJson(file, value) {
  await ensureDir(file);
  await writeFile(path.join(ROOT, file), `${JSON.stringify(value, null, 2)}\n`);
}

async function writeText(file, value) {
  await ensureDir(file);
  await writeFile(path.join(ROOT, file), value.endsWith("\n") ? value : `${value}\n`);
}

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

async function walkFiles(dir, predicate, results = []) {
  const abs = path.join(ROOT, dir);
  let entries = [];
  try {
    entries = await readdir(abs, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === ".git" || entry.name === "dist") continue;
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walkFiles(rel, predicate, results);
    } else if (predicate(rel)) {
      results.push(rel);
    }
  }
  return results;
}

async function lineHits(file, pattern) {
  const text = await readFile(path.join(ROOT, file), "utf8");
  return text.split(/\r?\n/).flatMap((line, index) => pattern.test(line) ? [{ line: index + 1, text: line.trim() }] : []);
}

function boundaryBase(ctiItem, launchTuw, status) {
  return {
    schema_version: "law-firm-os.cti.s0-receipt.v0.1",
    generated_at: GENERATED_AT,
    goal_id: GOAL_ID,
    source_plan: PLAN_REF,
    cti_item: ctiItem,
    launch_tuw: launchTuw,
    status,
    pii_boundary: {
      plaintext_client_or_matter_names_written: false,
      phone_or_email_pii_written: false,
      credential_material_written: false
    },
    execution_boundary: {
      production_credentials_used: false,
      real_data_contact_performed: false,
      product_state_write_performed: false,
      migration_executed: false,
      cutover_executed: false
    }
  };
}

async function main() {
  const contract = JSON.parse(await readFile(path.join(ROOT, CONTRACT_REF), "utf8"));
  const planSha256 = await sha256File(PLAN_REF);
  const contractSha256 = await sha256File(CONTRACT_REF);
  const candidatesFile = "packages/matter/src/amic-matter-code-candidates.js";
  const desktopCandidatesFile = "apps/desktop/dist/mac/matter.app/Contents/Resources/app/runtime/packages/matter/src/amic-matter-code-candidates.js";
  const candidatesSha256 = await sha256File(candidatesFile);
  let desktopCandidatesSha256 = null;
  let desktopCandidatesExists = false;
  try {
    await stat(path.join(ROOT, desktopCandidatesFile));
    desktopCandidatesExists = true;
    desktopCandidatesSha256 = await sha256File(desktopCandidatesFile);
  } catch {
    desktopCandidatesExists = false;
  }

  const allJsFiles = await walkFiles("apps", (file) => file.endsWith(".js") || file.endsWith(".mjs") || file.endsWith(".jsx"));
  await walkFiles("packages", (file) => file.endsWith(".js") || file.endsWith(".mjs") || file.endsWith(".jsx"), allJsFiles);
  await walkFiles("scripts", (file) => file.endsWith(".js") || file.endsWith(".mjs"), allJsFiles);
  const repositoryImportFiles = [];
  for (const file of allJsFiles) {
    const text = await readFile(path.join(ROOT, file), "utf8");
    if (/packages\/(persistence|matter|master-data|dms|crm|intake|billing|analytics|ai-governance|client-portal|enterprise)\/src\/.*repository/.test(text)) {
      repositoryImportFiles.push(file);
    }
  }

  const realClientTargetFiles = [
    "scripts/run-lcx-vltui-production-smoke.mjs",
    "scripts/smoke-matter-desktop-aws-runtime.mjs",
    "scripts/drill-matter-vault-backup-restore.mjs",
    "scripts/run-lcx-full-release-preflight-proof.mjs",
    "scripts/validate-matter-vault-r4-external-receipts.mjs",
    "scripts/validate-matter-vault-r4-aws-env-plan.mjs",
    "scripts/validate-lcx-full-final-release-packet.mjs",
    "apps/api/src/server.js",
    "apps/api/src/master-data-context.js"
  ];
  const realClientDataUsedSites = [];
  for (const file of realClientTargetFiles) {
    const hits = await lineHits(file, /real_client_data_used|uses_real_client_data|real_client_data_loaded/);
    if (hits.length > 0) realClientDataUsedSites.push({ file, hits: hits.map(({ line }) => ({ line })) });
  }

  const mappingRows = AMIC_CURRENT_MATTER_CODE_CANDIDATES.map((matter, index) => ({
    row_number: index + 1,
    matter_id: matter.matter_id,
    matter_number: matter.matter_number,
    source_revision: matter.source_revision,
    matter_code_hash: piiSafeHash("matter_code", matter.matter_code),
    client_id_hash: piiSafeHash("client_id", matter.client_id),
    source_lanes_hash: piiSafeHash("source_lanes", JSON.stringify(matter.source_lanes ?? [])),
    owner_primary_attorney_email: "",
    owner_secondary_attorney_email: "",
    owner_matter_status: "",
    owner_notes: ""
  }));
  const mappingCsv = [
    [
      "row_number",
      "matter_id",
      "matter_number",
      "source_revision",
      "matter_code_hash",
      "client_id_hash",
      "source_lanes_hash",
      "owner_primary_attorney_email",
      "owner_secondary_attorney_email",
      "owner_matter_status",
      "owner_notes"
    ].join(","),
    ...mappingRows.map((row) => Object.values(row).map(csvCell).join(","))
  ].join("\n");
  const mappingCsvPath = "workbook/cti-i1-lead-lawyer-mapping-template-2026-07-06.csv";
  const mappingJsonPath = "workbook/cti-i1-lead-lawyer-mapping-template-2026-07-06.json";
  await writeText(mappingCsvPath, mappingCsv);
  await writeJson(mappingJsonPath, {
    schema_version: "law-firm-os.cti.i1-lead-lawyer-mapping-template.v0.1",
    generated_at: GENERATED_AT,
    goal_id: GOAL_ID,
    row_count: mappingRows.length,
    source_revision: "amic_current_onedrive_matter_code_inventory_2026_07_01",
    source_candidates_file: candidatesFile,
    source_candidates_sha256: candidatesSha256,
    pii_boundary: {
      plaintext_matter_code_included: false,
      plaintext_client_name_included: false,
      owner_private_plaintext_workbook_required_after_i4: true
    },
    columns: Object.keys(mappingRows[0] ?? {}),
    rows: mappingRows
  });

  const receipts = [
    ["docs/launch/cti-s0-t01-lambda-config-receipt-2026-07-06.json", {
      ...boundaryBase("S0-T01", "LT-PRE-W08-T04", "blocked_pending_i4"),
      reason: "Lambda production configuration read requires production AWS credentials while I4 is absent.",
      required_after_unblock: ["aws sso/sts identity receipt", "get-function-configuration masked receipt"]
    }],
    ["docs/launch/cti-s0-t02-persistence-census-2026-07-06.json", {
      ...boundaryBase("S0-T02", "LT-PRE-W08-T03", "local_static_complete"),
      store_path_manifest: {
        store_path_count: STORE_PATH_MANIFEST.length,
        derived_store_path_count: DERIVED_STORE_PATH_MANIFEST.length,
        envs: STORE_PATH_MANIFEST.map((entry) => entry.env),
        derived_envs: DERIVED_STORE_PATH_MANIFEST.map((entry) => entry.env)
      },
      repository_import_census: {
        file_count: repositoryImportFiles.length,
        sample_files: repositoryImportFiles.slice(0, 40)
      }
    }],
    ["docs/launch/cti-s0-t03-coldstart-probe-receipt-2026-07-06.json", {
      ...boundaryBase("S0-T03", "LT-PRE-W08-T04", "blocked_pending_i4"),
      reason: "Cold-start marker probe requires product state write and production credentials while I4 is absent.",
      sequencing_guard: "S0-T04 production store readback snapshot must complete before this probe after I4."
    }],
    ["docs/launch/cti-s0-t04-store-readback-snapshot-receipt-2026-07-06.json", {
      ...boundaryBase("S0-T04", "LT-PRE-W08-T04", "blocked_pending_i4"),
      reason: "Production store readback snapshot touches real client/matter data while I4 is absent.",
      sequencing_guard: "This receipt is the required predecessor of S0-T03 when later authorized."
    }],
    ["docs/launch/cti-s0-t05-desktop-seed-drift-diff-2026-07-06.json", {
      ...boundaryBase("S0-T05", "LT-PRE-W08-T03", "local_static_complete"),
      source_candidates_file: candidatesFile,
      source_candidates_sha256: candidatesSha256,
      desktop_candidates_file: desktopCandidatesFile,
      desktop_candidates_exists: desktopCandidatesExists,
      desktop_candidates_sha256: desktopCandidatesSha256,
      drift_diff_zero: desktopCandidatesExists && desktopCandidatesSha256 === candidatesSha256,
      candidate_counts: {
        clients: AMIC_CURRENT_MATTER_CLIENTS.length,
        matter_codes: AMIC_CURRENT_MATTER_CODE_CANDIDATES.length
      }
    }],
    ["docs/launch/cti-s0-t06-lead-lawyer-mapping-workbook-receipt-2026-07-06.json", {
      ...boundaryBase("S0-T06", "LT-PRE-W08-T03", "pii_safe_template_complete_plaintext_blocked_pending_i4"),
      template_csv: mappingCsvPath,
      template_json: mappingJsonPath,
      row_count: mappingRows.length,
      owner_fields: [
        "owner_primary_attorney_email",
        "owner_secondary_attorney_email",
        "owner_matter_status",
        "owner_notes"
      ],
      plaintext_workbook_boundary: "Plaintext matter-code workbook is blocked until I4 because the production-data-policy contract is unratified."
    }],
    ["docs/launch/cti-s0-t07-real-client-data-used-inventory-2026-07-06.json", {
      ...boundaryBase("S0-T07", "LT-PRE-W08-T03", "local_static_complete"),
      inventory_site_count: realClientDataUsedSites.length,
      inventory_sites: realClientDataUsedSites,
      additive_transition_rule: "Do not rewrite closed receipts. Future CTI receipts must use schema/version branching so legacy false assertions remain valid and CTI true receipts are explicitly scoped."
    }]
  ];
  for (const [file, value] of receipts) await writeJson(file, value);

  const d07JsonPath = "docs/launch/cti-d07-disposition-register-2026-07-06.json";
  const d07MdPath = "docs/launch/cti-d07-disposition-register-2026-07-06.md";
  await writeJson(d07JsonPath, {
    schema_version: "law-firm-os.cti.d07-disposition-register.v0.1",
    generated_at: GENERATED_AT,
    goal_id: GOAL_ID,
    local_candidate_matter_count: AMIC_CURRENT_MATTER_CODE_CANDIDATES.length,
    local_candidate_client_count: AMIC_CURRENT_MATTER_CLIENTS.length,
    production_149th_row_state: "unknown_blocked_pending_s0_t04_i4",
    recommendation: "Do not delete or include the possible 149th production row until S0-T04 readback snapshot is authorized and compared.",
    pii_boundary: {
      plaintext_row_values_included: false
    }
  });
  await writeText(d07MdPath, `# CTI D-07 Disposition Register - 2026-07-06

Status: blocked pending I4 and S0-T04

Local candidate matter-code count: ${AMIC_CURRENT_MATTER_CODE_CANDIDATES.length}

Local candidate client count: ${AMIC_CURRENT_MATTER_CLIENTS.length}

The possible 149th production row cannot be deleted, included, or classified before the S0-T04 production store readback snapshot. S0-T04 remains blocked because I4 ratification is absent. S0-T03 must not run before S0-T04.
`);

  const s1JsonPath = "docs/launch/cti-s1-branch-assessment-2026-07-06.json";
  const s1MdPath = "docs/launch/cti-s1-branch-assessment-2026-07-06.md";
  await writeJson(s1JsonPath, {
    schema_version: "law-firm-os.cti.s1-branch-assessment.v0.1",
    generated_at: GENERATED_AT,
    goal_id: GOAL_ID,
    branch_status: "unknown_blocked_pending_i4_s0_t01_s0_t03",
    reason: "EFS/current STORE_PATH branch requires production Lambda configuration and cold-start persistence proof. Both are blocked until I4.",
    allowed_next_step: "owner I4 ratification, then S0-T04 before S0-T03, then S1 branch decision",
    no_s1_execution_started: true
  });
  await writeText(s1MdPath, `# CTI S1 Branch Assessment - 2026-07-06

Status: unknown, blocked pending I4

S1 cannot be branched to EFS-present, EFS-provision, or alternate durable store yet. The branch depends on S0-T01 Lambda configuration and S0-T03 cold-start persistence proof, while S0-T04 must precede S0-T03. Those production/real-data probes are blocked by the unratified production-data-policy contract.
`);

  const artifactIndexPath = "docs/launch/cti-s0-artifact-index-2026-07-06.json";
  const artifacts = [
    "docs/launch/cti-decision-register-2026-07-06.md",
    "docs/launch/cti-production-data-policy-ratification-packet-2026-07-06.md",
    "docs/launch/cti-s0-probe-boundary-register-2026-07-06.md",
    "docs/launch/cti-tuw-crosswalk-2026-07-06.json",
    "docs/launch/cti-tuw-crosswalk-2026-07-06.md",
    ...receipts.map(([file]) => file),
    mappingCsvPath,
    mappingJsonPath,
    d07JsonPath,
    d07MdPath,
    s1JsonPath,
    s1MdPath,
    "docs/goal-closeout/cti-g0-s0/packet.json",
    "docs/goal-closeout/cti-g0-s0/command-evidence.json",
    "docs/goal-closeout/cti-g0-s0/adjudication.md",
    "docs/goal-closeout/cti-g0-s0/construction-inspection.json",
    "docs/goal-closeout/cti-g0-s0/claude-review-result.json",
    "scripts/generate-cti-g0-s0-evidence.mjs",
    "scripts/validate-cti-g0-s0-closeout.mjs",
    "workbook/launch-tuw/launch-tuw-ledger.json",
    "workbook/launch-tuw/10_PRE.md"
  ];
  const artifactHashes = [];
  for (const file of artifacts) {
    try {
      artifactHashes.push({ path: file, sha256: await sha256File(file) });
    } catch {
      artifactHashes.push({ path: file, sha256: null, missing: true });
    }
  }
  await writeJson(artifactIndexPath, {
    schema_version: "law-firm-os.cti.s0-artifact-index.v0.1",
    generated_at: GENERATED_AT,
    goal_id: GOAL_ID,
    source_plan: PLAN_REF,
    source_plan_sha256: planSha256,
    contract_ref: CONTRACT_REF,
    contract_sha256: contractSha256,
    contract_status: contract.status,
    s0_g_artifacts: {
      s0_t01: "docs/launch/cti-s0-t01-lambda-config-receipt-2026-07-06.json",
      s0_t02: "docs/launch/cti-s0-t02-persistence-census-2026-07-06.json",
      s0_t03: "docs/launch/cti-s0-t03-coldstart-probe-receipt-2026-07-06.json",
      s0_t04: "docs/launch/cti-s0-t04-store-readback-snapshot-receipt-2026-07-06.json",
      s0_t05: "docs/launch/cti-s0-t05-desktop-seed-drift-diff-2026-07-06.json",
      s0_t06: "docs/launch/cti-s0-t06-lead-lawyer-mapping-workbook-receipt-2026-07-06.json",
      s0_t07: "docs/launch/cti-s0-t07-real-client-data-used-inventory-2026-07-06.json",
      s0_t08: "docs/launch/cti-production-data-policy-ratification-packet-2026-07-06.md"
    },
    blockers: [
      "I4 owner ratification absent",
      "S0-T04 production readback blocked",
      "S0-T03 cold-start probe blocked until S0-T04 and I4",
      "S1 branch decision blocked"
    ],
    artifact_hashes: artifactHashes
  });

  const evidenceManifestPath = "docs/lazycodex/evidence/matter-web/artifacts/cti-g0-s0-evidence-manifest-2026-07-06.json";
  const finalArtifacts = [...artifacts, artifactIndexPath];
  const finalHashes = [];
  for (const file of finalArtifacts) finalHashes.push({ path: file, sha256: await sha256File(file) });
  await writeJson(evidenceManifestPath, {
    schema_version: "law-firm-os.cti.g0-s0-evidence-manifest.v0.1",
    generated_at: GENERATED_AT,
    goal_id: GOAL_ID,
    pii_safe: true,
    production_credentials_used: false,
    real_data_contact_performed: false,
    product_state_write_performed: false,
    artifact_hashes: finalHashes
  });

  console.log(JSON.stringify({
    status: "generated",
    candidate_matter_count: AMIC_CURRENT_MATTER_CODE_CANDIDATES.length,
    candidate_client_count: AMIC_CURRENT_MATTER_CLIENTS.length,
    real_client_data_used_inventory_sites: realClientDataUsedSites.length,
    artifacts: finalArtifacts.length + 1,
    evidence_manifest: evidenceManifestPath
  }, null, 2));
}

await main();

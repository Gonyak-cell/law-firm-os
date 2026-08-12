#!/usr/bin/env node
import { createHash } from "node:crypto";
import {
  chmodSync,
  closeSync,
  existsSync,
  fsyncSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  realpathSync,
  renameSync,
  statSync,
  unlinkSync,
  writeSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { resolveTrustedRoot } from "./lib/external-release-trust.mjs";

export const BUNDLE_SCHEMA_VERSION = "law-firm-os.external-pilot-ops-bundle.v0.1";
const CANONICAL_TMPDIR = realpathSync(tmpdir());
export const DEFAULT_BUNDLE_PATH = path.join(CANONICAL_TMPDIR, "lawos-external-pilot-ops", "external-pilot-ops-bundle.json");
export const DEFAULT_MARKDOWN_PATH = path.join(CANONICAL_TMPDIR, "lawos-external-pilot-ops", "external-pilot-ops-bundle.generated.md");
export const ALLOWED_DATA_MODES = Object.freeze(["synthetic_only", "real_data"]);
export const DEFAULT_PUBLIC_PROJECTION_PATH = null;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function nearestExisting(pathname) {
  let current = pathname;
  while (!existsSync(current)) {
    const parent = path.dirname(current);
    if (parent === current) return null;
    current = parent;
  }
  return current;
}

function failOutputPath(code, message, details = {}) {
  const error = new Error(message);
  error.code = code;
  error.details = details;
  throw error;
}

/**
 * Validate an output path before any parent directory creation. Existing and
 * future ancestors must not traverse symlinks; default temporary paths are
 * canonicalized above so platform aliases do not weaken this check.
 */
export function assertSafeOutputPath(rootDir, filePath) {
  resolveTrustedRoot(rootDir);
  const absolute = path.resolve(filePath);
  const parent = path.dirname(absolute);
  const existing = nearestExisting(parent);
  if (!existing) failOutputPath("TRUST_OUTPUT_PARENT_MISSING", "output parent has no existing regular ancestor", { filePath: absolute });
  let cursor = parent;
  while (true) {
    if (existsSync(cursor) && lstatSync(cursor).isSymbolicLink()) failOutputPath("TRUST_OUTPUT_SYMLINK", "output path may not traverse a symlink ancestor", { filePath: absolute, ancestor: cursor });
    const next = path.dirname(cursor);
    if (next === cursor) break;
    cursor = next;
  }
  if (existsSync(absolute) && lstatSync(absolute).isSymbolicLink()) failOutputPath("TRUST_OUTPUT_SYMLINK", "output path may not replace a symlink", { filePath: absolute });
  if (existsSync(existing) && !statSync(existing).isDirectory()) failOutputPath("TRUST_OUTPUT_PARENT_INVALID", "output parent ancestor must be a directory", { filePath: absolute, ancestor: existing });
  return absolute;
}

function isoNow() {
  return new Date().toISOString();
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function mergeObjects(base, override) {
  if (!override || typeof override !== "object" || Array.isArray(override)) return clone(base);
  const result = clone(base);
  for (const [key, value] of Object.entries(override)) {
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      result[key] &&
      typeof result[key] === "object" &&
      !Array.isArray(result[key])
    ) {
      result[key] = mergeObjects(result[key], value);
    } else {
      result[key] = clone(value);
    }
  }
  return result;
}

function roleSlot(role, requiredEvidence) {
  return {
    role,
    name: "",
    team: "",
    channel: "",
    coverage: "",
    timezone: "",
    approval_ref: {
      ref: null,
      sha256: null,
      signature_ref: null,
      scope: null,
      approved_at: null,
      expires_at: null,
    },
    receipt: receiptSlot(`${role}_support`),
    required_evidence: requiredEvidence,
  };
}

function receiptSlot(kind) {
  return {
    kind,
    ref: null,
    sha256: null,
    outcome: "pending",
    scope: null,
    expires_at: null,
    signature_ref: null,
    recorded_at: null,
    recorded_by: null,
  };
}

export function createExternalPilotOpsTemplate({ generatedAt = isoNow(), requestedDataMode = "synthetic_only" } = {}) {
  if (!ALLOWED_DATA_MODES.includes(requestedDataMode)) {
    throw new Error(`requestedDataMode must be one of ${ALLOWED_DATA_MODES.join(", ")}`);
  }
  const syntheticOnly = requestedDataMode === "synthetic_only";
  return {
    schema_version: BUNDLE_SCHEMA_VERSION,
    bundle_id: "external-pilot-ops",
    generated_at: generatedAt,
    source_refs: [
      "docs/launch/runbooks/incident-sla-oncall-decision.md",
      "docs/launch/runbooks/incident-response-runbook.md",
      "docs/launch/runbooks/rollback-runbook.md",
      "contracts/production-data-policy-contract.json",
    ],
    pilot_binding: {
      pilot_id: null,
      lawos_tenant_id: null,
      lawos_tenant_ref: null,
      lawos_tenant_sha256: null,
      entra_tenant_id: null,
      entra_tenant_ref: null,
      entra_tenant_sha256: null,
      entra_application_ref: null,
      entra_application_sha256: null,
      roster_ref: null,
      roster_sha256: null,
      source_ref: null,
      source_ref_sha256: null,
      source_sha: null,
      source_tree: null,
      version: null,
      binding_sha256: null,
      api_artifact_ref: null,
      api_artifact_sha256: null,
      desktop_artifact_ref: null,
      desktop_artifact_sha256: null,
    },
    trust: {
      trusted_registry_ref: null,
      trusted_registry_sha256: null,
      anchor_ref: null,
      anchor_sha256: null,
    },
    boundary: {
      external_pilot_ops_bundle_only: true,
      provider_calls_executed: false,
      external_systems_contacted: false,
      real_data_read: false,
      real_data_written: false,
      external_pilot_distribution_enabled: false,
      go_live_approved_by_bundle: false,
      production_cutover_approved_by_bundle: false,
      legal_text_generated_by_bundle: false,
    },
    data_boundary: {
      requested_mode: requestedDataMode,
      synthetic_only: syntheticOnly,
      real_data_present: !syntheticOnly,
      real_data_authorized: false,
      real_data_execution: "not_executed",
      transition_gate: {
        exact_human_approval_refs_required: true,
        exact_legal_approval_refs_required: true,
        monitoring_receipt_required: true,
        backup_restore_receipt_required: true,
        provider_calls_performed_by_generator: false,
      },
    },
    roles: {
      support_contact: roleSlot("support_contact", "human_approval"),
      on_call_primary: roleSlot("on_call_primary", "human_approval"),
      on_call_secondary: roleSlot("on_call_secondary", "human_approval"),
      incident_commander: roleSlot("incident_commander", "human_approval"),
      security_privacy_contact: roleSlot("security_privacy_contact", "legal_approval"),
      rollback_owner: roleSlot("rollback_owner", "human_approval"),
    },
    monitoring: {
      dashboard_ref: null,
      alert_channels: [],
      observation_window: null,
      thresholds: {
        error_rate_percent: null,
        p95_latency_ms: null,
        auth_failure_rate_percent: null,
        backup_age_minutes: null,
        critical_alert_count: null,
      },
      threshold_basis_ref: null,
      receipt: receiptSlot("monitoring"),
    },
    incident_escalation: {
      incident_channel: null,
      escalation_policy_ref: null,
      acknowledgement_sla_minutes: null,
      levels: [
        { severity: "P0", notify_roles: [], acknowledgement_minutes: null, escalation_ref: null },
        { severity: "P1", notify_roles: [], acknowledgement_minutes: null, escalation_ref: null },
        { severity: "P2", notify_roles: [], acknowledgement_minutes: null, escalation_ref: null },
      ],
      tabletop_receipt: receiptSlot("incident_escalation_tabletop"),
    },
    privacy_dpa_retention: {
      acceptance_status: "pending",
      privacy_acceptance_ref: null,
      dpa_acceptance_ref: null,
      retention_acceptance_ref: null,
      legal_review_receipt: receiptSlot("privacy_dpa_retention"),
      subprocessor_decision_ref: null,
      legal_hold_policy_ref: null,
      deletion_exit_acceptance_ref: null,
      no_legal_text_generated: true,
    },
    backup_restore: {
      restore_target: "isolated",
      isolated_restore_required: true,
      receipt_ref: null,
      receipt_sha256: null,
      outcome: "pending",
      scope: null,
      expires_at: null,
      signature_ref: null,
      recorded_at: null,
      recorded_by: null,
      rpo_minutes: null,
      rto_minutes: null,
      restored_object_count: null,
      backup_scope_ref: null,
    },
    approvals: {
      human: [
        { role: "pilot_owner", ref: null, sha256: null, outcome: "pending", scope: null, expires_at: null, signature_ref: null, approved_at: null, approved_by: null },
        { role: "support_owner", ref: null, sha256: null, outcome: "pending", scope: null, expires_at: null, signature_ref: null, approved_at: null, approved_by: null },
        { role: "rollback_owner", ref: null, sha256: null, outcome: "pending", scope: null, expires_at: null, signature_ref: null, approved_at: null, approved_by: null },
      ],
      legal: [
        { role: "privacy_owner", ref: null, sha256: null, outcome: "pending", scope: null, expires_at: null, signature_ref: null, approved_at: null, approved_by: null },
        { role: "dpa_owner", ref: null, sha256: null, outcome: "pending", scope: null, expires_at: null, signature_ref: null, approved_at: null, approved_by: null },
        { role: "retention_owner", ref: null, sha256: null, outcome: "pending", scope: null, expires_at: null, signature_ref: null, approved_at: null, approved_by: null },
      ],
    },
    claims: {
      external_pilot_ready: false,
      real_data_ready: false,
      go_live_ready: false,
    },
    status: "TEMPLATE_ONLY",
    operational_status: "PENDING_EXTERNAL_APPROVAL",
    required_fields: {
      roles: [
        "support_contact",
        "on_call_primary",
        "on_call_secondary",
        "incident_commander",
        "security_privacy_contact",
        "rollback_owner",
      ],
      human_approval_roles: ["pilot_owner", "support_owner", "rollback_owner"],
      legal_approval_roles: ["privacy_owner", "dpa_owner", "retention_owner"],
      receipts: ["monitoring", "privacy_dpa_retention", "backup_restore"],
    },
    template_policy: {
      generated_offline: true,
      contains_real_data: false,
      contains_fabricated_legal_text: false,
      blank_fields_require_human_completion: true,
    },
  };
}

function readJsonIfPresent(filePath) {
  if (!filePath || !existsSync(filePath)) return null;
  return JSON.parse(readFileSync(filePath, "utf8"));
}

export function renderExternalPilotOpsMarkdown(bundle) {
  const lines = [
    "# External Pilot Operations Bundle",
    "",
    `Generated at: ${bundle.generated_at}`,
    `Requested data mode: \`${bundle.data_boundary.requested_mode}\``,
    "",
    "## Boundary",
    "",
    "- This is an offline template and validator input; it does not contact a provider.",
    "- It does not approve external-pilot distribution, production cutover, or go-live.",
    "- Synthetic-only remains the default. Real-data mode is blocked until exact human/legal approvals and monitoring/DR receipts resolve.",
    "- No legal text is generated here. Legal/DPA/retention fields are references for human completion only.",
    "",
    "## Required operational fields",
    "",
    "| Area | Required fields | Current state |",
    "| --- | --- | --- |",
    `| Support/on-call | ${bundle.required_fields.roles.join(", ")} | ${bundle.data_boundary.synthetic_only ? "template slots" : "must be human-complete"} |`,
    `| Rollback | rollback_owner, rollback approval reference | ${bundle.roles.rollback_owner.name ? "provided" : "pending"} |`,
    `| Monitoring | dashboard, alert channels, thresholds, monitoring receipt | ${bundle.monitoring.receipt.outcome} |`,
    `| Escalation | incident channel, policy reference, P0/P1/P2 routes, tabletop receipt | ${bundle.incident_escalation.tabletop_receipt.outcome} |`,
    `| Privacy/DPA/retention | acceptance references and legal receipt | ${bundle.privacy_dpa_retention.acceptance_status} |`,
    `| Backup/restore | isolated restore receipt, RPO/RTO | ${bundle.backup_restore.outcome} |`,
    `| Pilot binding | pilot ID, tenant/Entra refs+digests, roster digest, source SHA/tree, API/desktop artifact hashes | ${bundle.pilot_binding.pilot_id ? "provided" : "pending"} |`,
    "",
    "## Reference-only acceptance contract",
    "",
    "Fill references with exact human/legal records and receipt hashes. Do not paste policy text or personal/client data into this bundle.",
    "",
    "## Data flag",
    "",
    `- synthetic_only: \`${bundle.data_boundary.synthetic_only}\``,
    `- real_data_present: \`${bundle.data_boundary.real_data_present}\``,
    `- real_data_authorized: \`${bundle.data_boundary.real_data_authorized}\``,
    `- real_data_execution: \`${bundle.data_boundary.real_data_execution}\``,
    "",
  ];
  return `${lines.join("\n")}\n`;
}

export function renderExternalPilotOpsPublicProjection(bundle) {
  return {
    schema_version: "law-firm-os.external-pilot-ops-public-projection.v0.1",
    bundle_id: bundle.bundle_id,
    generated_at: bundle.generated_at,
    status: bundle.status,
    operational_status: bundle.operational_status,
    boundary: {
      provider_calls_executed: false,
      external_systems_contacted: false,
      real_data_read: false,
      real_data_written: false,
      external_pilot_distribution_enabled: false,
      go_live_approved: false,
      production_cutover_approved: false,
    },
    data_boundary: {
      requested_mode: bundle.data_boundary.requested_mode,
      synthetic_only: bundle.data_boundary.synthetic_only,
      real_data_present: bundle.data_boundary.real_data_present,
      real_data_authorized: false,
      real_data_execution: "not_executed",
    },
    required_field_groups: {
      roles: [
        "support_contact",
        "on_call_primary",
        "on_call_secondary",
        "incident_commander",
        "security_privacy_contact",
        "rollback_owner",
      ],
      human_approval_roles: ["pilot_owner", "support_owner", "rollback_owner"],
      legal_approval_roles: ["privacy_owner", "dpa_owner", "retention_owner"],
      receipts: ["monitoring", "privacy_dpa_retention", "backup_restore"],
    },
  };
}

export function writeAtomicPrivate(filePath, body, mode = 0o600, { rootDir = ROOT } = {}) {
  const absolutePath = path.resolve(filePath);
  assertSafeOutputPath(rootDir, absolutePath);
  mkdirSync(path.dirname(absolutePath), { recursive: true, mode: 0o700 });
  const temporaryPath = `${absolutePath}.${process.pid}.${Date.now()}.tmp`;
  let descriptor;
  try {
    descriptor = openSync(temporaryPath, "wx", mode);
    chmodSync(temporaryPath, mode);
    writeSync(descriptor, body, undefined, "utf8");
    fsyncSync(descriptor);
    closeSync(descriptor);
    descriptor = undefined;
    renameSync(temporaryPath, absolutePath);
  } catch (error) {
    if (descriptor !== undefined) closeSync(descriptor);
    try { unlinkSync(temporaryPath); } catch {}
    throw error;
  }
  return absolutePath;
}

export function sha256File(filePath) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

export function generateExternalPilotOpsBundle({
  rootDir = ROOT,
  inputPath = DEFAULT_BUNDLE_PATH,
  outputPath = DEFAULT_BUNDLE_PATH,
  markdownPath = DEFAULT_MARKDOWN_PATH,
  publicProjectionPath = DEFAULT_PUBLIC_PROJECTION_PATH,
  requestedDataMode,
  generatedAt,
} = {}) {
  resolveTrustedRoot(rootDir);
  const absoluteInput = path.resolve(rootDir, inputPath);
  const existing = readJsonIfPresent(absoluteInput);
  const requested = requestedDataMode ?? existing?.data_boundary?.requested_mode ?? "synthetic_only";
  const template = createExternalPilotOpsTemplate({
    generatedAt: generatedAt ?? existing?.generated_at ?? isoNow(),
    requestedDataMode: requested,
  });
  const bundle = mergeObjects(template, existing ?? {});
  for (const key of ["boundary", "data_boundary", "pilot_binding", "trust", "roles", "monitoring", "incident_escalation", "privacy_dpa_retention", "backup_restore", "approvals", "claims", "required_fields", "template_policy"]) {
    if (!isObject(bundle[key])) bundle[key] = clone(template[key]);
  }
  if (!isObject(bundle.data_boundary.transition_gate)) bundle.data_boundary.transition_gate = clone(template.data_boundary.transition_gate);
  for (const field of ["exact_human_approval_refs_required", "exact_legal_approval_refs_required", "monitoring_receipt_required", "backup_restore_receipt_required"]) bundle.data_boundary.transition_gate[field] = true;
  for (const key of Object.keys(template.roles)) {
    if (!isObject(bundle.roles[key])) bundle.roles[key] = clone(template.roles[key]);
  }
  bundle.schema_version = BUNDLE_SCHEMA_VERSION;
  bundle.bundle_id = "external-pilot-ops";
  bundle.generated_at = generatedAt ?? existing?.generated_at ?? bundle.generated_at;
  bundle.data_boundary.requested_mode = requested;
  bundle.status = "TEMPLATE_ONLY";
  bundle.operational_status = "PENDING_EXTERNAL_APPROVAL";
  bundle.boundary.external_pilot_ops_bundle_only = true;
  bundle.boundary.provider_calls_executed = false;
  bundle.boundary.external_systems_contacted = false;
  bundle.boundary.real_data_read = false;
  bundle.boundary.real_data_written = false;
  bundle.boundary.external_pilot_distribution_enabled = false;
  bundle.boundary.go_live_approved_by_bundle = false;
  bundle.boundary.production_cutover_approved_by_bundle = false;
  bundle.boundary.legal_text_generated_by_bundle = false;
  bundle.trust = clone(template.trust);
  bundle.data_boundary.transition_gate.provider_calls_performed_by_generator = false;
  bundle.data_boundary.synthetic_only = bundle.data_boundary.requested_mode === "synthetic_only";
  bundle.data_boundary.real_data_present = bundle.data_boundary.requested_mode === "real_data";
  bundle.data_boundary.real_data_authorized = false;
  bundle.data_boundary.real_data_execution = "not_executed";
  bundle.claims = {
    external_pilot_ready: false,
    real_data_ready: false,
    go_live_ready: false,
  };
  delete bundle.external_pilot_ready;
  delete bundle.real_data_ready;
  delete bundle.go_live_ready;
  bundle.template_policy.generated_offline = true;
  bundle.template_policy.contains_real_data = false;
  bundle.template_policy.contains_fabricated_legal_text = false;
  bundle.template_policy.blank_fields_require_human_completion = true;
  bundle.required_fields = clone(template.required_fields);

  const absoluteOutput = assertSafeOutputPath(rootDir, path.resolve(rootDir, outputPath));
  const absoluteMarkdown = assertSafeOutputPath(rootDir, path.resolve(rootDir, markdownPath));
  writeAtomicPrivate(absoluteOutput, `${JSON.stringify(bundle, null, 2)}\n`, 0o600, { rootDir });
  writeAtomicPrivate(absoluteMarkdown, renderExternalPilotOpsMarkdown(bundle), 0o600, { rootDir });
  if (publicProjectionPath) {
    const absoluteProjection = assertSafeOutputPath(rootDir, path.resolve(rootDir, publicProjectionPath));
    writeAtomicPrivate(absoluteProjection, `${JSON.stringify(renderExternalPilotOpsPublicProjection(bundle), null, 2)}\n`, 0o644, { rootDir });
  }
  return {
    bundle,
    outputPath,
    markdownPath,
    publicProjectionPath,
    bundleSha256: sha256File(absoluteOutput),
  };
}

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--input" || arg === "--output" || arg === "--markdown" || arg === "--public-projection" || arg === "--mode" || arg === "--data-mode") {
      options[arg === "--markdown" ? "markdownPath" : arg === "--input" ? "inputPath" : arg === "--output" ? "outputPath" : arg === "--public-projection" ? "publicProjectionPath" : "requestedDataMode"] = argv[++index];
    } else if (arg === "--generated-at") {
      options.generatedAt = argv[++index];
    } else if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return options;
}

function printHelp() {
  console.log("Usage: node scripts/generate-external-pilot-ops-bundle.mjs [--input file] [--output file] [--markdown file] [--public-projection file] [--mode synthetic_only|real_data]");
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
  try {
    const options = parseArgs(process.argv.slice(2));
    if (options.help) {
      printHelp();
    } else {
      const result = generateExternalPilotOpsBundle(options);
      console.log(JSON.stringify({
        output_path: result.outputPath,
        markdown_path: result.markdownPath,
        requested_data_mode: result.bundle.data_boundary.requested_mode,
        synthetic_only: result.bundle.data_boundary.synthetic_only,
        provider_calls_executed: result.bundle.boundary.provider_calls_executed,
        bundle_sha256: result.bundleSha256,
      }, null, 2));
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

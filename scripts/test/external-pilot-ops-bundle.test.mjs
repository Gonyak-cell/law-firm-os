import assert from "node:assert/strict";
import { createHash, generateKeyPairSync, sign } from "node:crypto";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import test from "node:test";

process.env.NODE_ENV = "test";
import {
  DEFAULT_BUNDLE_PATH,
  DEFAULT_MARKDOWN_PATH,
  createExternalPilotOpsTemplate,
  generateExternalPilotOpsBundle,
} from "../generate-external-pilot-ops-bundle.mjs";
import {
  DEFAULT_VALIDATION_MARKDOWN_PATH,
  DEFAULT_VALIDATION_PATH,
  validateExternalPilotOpsBundle,
  validateExternalPilotOpsBundleFile,
} from "../validate-external-pilot-ops-bundle.mjs";
import {
  ExternalReleaseTrustError,
  verifyDetachedReceipt,
  verifyTrustedRegistry,
} from "../lib/external-release-trust.mjs";

const NOW = "2026-08-12T12:00:00.000Z";
const EXPIRES = "2099-12-31T00:00:00.000Z";
const PILOT_ID = "pilot-acme-2026-08";
const LAWOS_TENANT_ID = "lawos-acme-001";
const ENTRA_TENANT_ID = "11111111-2222-4333-8444-555555555555";
const SOURCE_SHA = "a".repeat(40);
const SOURCE_TREE = "b".repeat(40);
const API_SHA = sha256("api artifact\n");
const DESKTOP_SHA = sha256("desktop artifact\n");
const VERSION = "pilot-ops-v0.1.0";
const SCOPE = "external-pilot-ops";
const RECEIPT_SOURCE = "pilot_operations";
const RECEIPT_SCHEMA = "law-firm-os.external-pilot-ops-signed-receipt.v0.1";
const BINDING_SHA = sha256(JSON.stringify({
  pilot_id: PILOT_ID,
  lawos_tenant_id: LAWOS_TENANT_ID,
  entra_tenant_id: ENTRA_TENANT_ID,
  source_sha: SOURCE_SHA,
  source_tree: SOURCE_TREE,
  version: VERSION,
}));

function fixtureRoot(t) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "lawos-external-pilot-ops-")));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function writeBytes(root, relativePath, body) {
  const absolutePath = join(root, relativePath);
  mkdirSync(join(absolutePath, ".."), { recursive: true });
  const bytes = Buffer.isBuffer(body) ? body : Buffer.from(body);
  writeFileSync(absolutePath, bytes);
  chmodSync(absolutePath, 0o600);
  return { ref: relativePath, sha256: sha256(bytes) };
}

function writeJson(root, relativePath, value) {
  return writeBytes(root, relativePath, `${JSON.stringify(value, null, 2)}\n`);
}

function signedReceipt(root, relativePath, { operation, role, issuedAt = "2026-08-12T10:00:00.000Z", expiresAt = EXPIRES, keyPair }) {
  const receipt = {
    schema_version: RECEIPT_SCHEMA,
    receipt_type: operation,
    receipt_source: RECEIPT_SOURCE,
    key_id: "pilot-ops-key-001",
    scope: SCOPE,
    pilot_id: PILOT_ID,
    lawos_tenant_id: LAWOS_TENANT_ID,
    entra_tenant_id: ENTRA_TENANT_ID,
    source_sha: SOURCE_SHA,
    source_tree: SOURCE_TREE,
    version: VERSION,
    artifact_sha256: API_SHA,
    binding_sha256: BINDING_SHA,
    api_artifact_sha256: API_SHA,
    desktop_artifact_sha256: DESKTOP_SHA,
    role,
    operation,
    issued_at: issuedAt,
    expires_at: expiresAt,
  };
  const bytes = Buffer.from(`${JSON.stringify(receipt, null, 2)}\n`);
  const receiptRef = writeBytes(root, relativePath, bytes);
  const signatureBytes = sign(null, bytes, keyPair.privateKey);
  const signatureRef = writeBytes(root, `${relativePath}.sig`, signatureBytes);
  return {
    ref: receiptRef.ref,
    sha256: receiptRef.sha256,
    signature_ref: { ref: signatureRef.ref, sha256: signatureRef.sha256 },
    scope: SCOPE,
    expires_at: expiresAt,
    issued_at: issuedAt,
  };
}

function evidence(root, relativePath, body = "evidence\n") {
  return writeBytes(root, relativePath, body);
}

function completeRealDataBundle(root) {
  generateExternalPilotOpsBundle({ rootDir: root, outputPath: "bundle.json", markdownPath: "bundle.md", generatedAt: "2026-08-12T00:00:00.000Z" });
  const bundle = JSON.parse(readFileSync(join(root, "bundle.json"), "utf8"));
  const keyPair = generateKeyPairSync("ed25519");
  const publicKeySpki = keyPair.publicKey.export({ type: "spki", format: "pem" });
  const registry = {
    schema_version: "law-firm-os.external-release-trust-registry.v1",
    generated_at: "2026-08-12T00:00:00.000Z",
    keys: [{
      key_id: "pilot-ops-key-001",
      algorithm: "Ed25519",
      public_key_spki_pem: publicKeySpki,
      allowed_receipt_sources: [RECEIPT_SOURCE],
      allowed_receipt_types: ["role_assignment", "support_receipt", "approval", "monitoring_receipt", "incident_escalation_tabletop", "privacy_dpa_retention", "backup_restore"],
      allowed_pilot_ids: [PILOT_ID],
      allowed_lawos_tenant_ids: [LAWOS_TENANT_ID],
      allowed_entra_tenant_ids: [ENTRA_TENANT_ID],
      allowed_source_shas: [SOURCE_SHA],
      allowed_source_trees: [SOURCE_TREE],
      allowed_versions: [VERSION],
      allowed_roles: [
        "support_contact",
        "on_call_primary",
        "on_call_secondary",
        "incident_commander",
        "security_privacy_contact",
        "rollback_owner",
        "pilot_owner",
        "support_owner",
        "privacy_owner",
        "dpa_owner",
        "retention_owner",
        "monitoring",
        "incident_escalation",
        "privacy_dpa_retention",
        "backup_restore",
      ],
      allowed_operations: ["role_assignment", "support_receipt", "approval", "monitoring_receipt", "incident_escalation_tabletop", "privacy_dpa_retention", "backup_restore"],
      allowed_artifact_sha256s: [API_SHA, DESKTOP_SHA],
      allowed_binding_sha256s: [BINDING_SHA],
      valid_from: "2026-01-01T00:00:00.000Z",
      valid_until: EXPIRES,
    }],
  };
  const registryRef = writeJson(root, "docs/pilot/trust-registry.json", registry);
  const anchor = writeJson(root, "docs/pilot/trust-anchor.json", {
    schema_version: "law-firm-os.external-pilot-ops-trust-anchor.v0.1",
    registry_ref: registryRef.ref,
    registry_sha256: registryRef.sha256,
    scope: SCOPE,
    pilot_id: PILOT_ID,
    lawos_tenant_id: LAWOS_TENANT_ID,
    entra_tenant_id: ENTRA_TENANT_ID,
    source_sha: SOURCE_SHA,
    source_tree: SOURCE_TREE,
    version: VERSION,
    binding_sha256: BINDING_SHA,
    api_artifact_sha256: API_SHA,
    desktop_artifact_sha256: DESKTOP_SHA,
  });
  bundle.data_boundary.requested_mode = "real_data";
  bundle.data_boundary.synthetic_only = false;
  bundle.data_boundary.real_data_present = true;
  bundle.data_boundary.real_data_authorized = false;
  bundle.pilot_binding = {
    pilot_id: PILOT_ID,
    lawos_tenant_id: LAWOS_TENANT_ID,
    lawos_tenant_ref: evidence(root, "docs/pilot/lawos-tenant.json"),
    lawos_tenant_sha256: null,
    entra_tenant_id: ENTRA_TENANT_ID,
    entra_tenant_ref: evidence(root, "docs/pilot/entra-tenant.json"),
    entra_tenant_sha256: null,
    entra_application_ref: evidence(root, "docs/pilot/entra-application.json"),
    entra_application_sha256: null,
    roster_ref: evidence(root, "docs/pilot/roster.json"),
    roster_sha256: null,
    source_ref: evidence(root, "docs/pilot/source.json"),
    source_ref_sha256: null,
    source_sha: SOURCE_SHA,
    source_tree: SOURCE_TREE,
    version: VERSION,
    binding_sha256: BINDING_SHA,
    api_artifact_ref: evidence(root, "docs/pilot/api.artifact", "api artifact\n"),
    api_artifact_sha256: API_SHA,
    desktop_artifact_ref: evidence(root, "docs/pilot/desktop.artifact", "desktop artifact\n"),
    desktop_artifact_sha256: DESKTOP_SHA,
  };
  bundle.pilot_binding.lawos_tenant_sha256 = bundle.pilot_binding.lawos_tenant_ref.sha256;
  bundle.pilot_binding.entra_tenant_sha256 = bundle.pilot_binding.entra_tenant_ref.sha256;
  bundle.pilot_binding.entra_application_sha256 = bundle.pilot_binding.entra_application_ref.sha256;
  bundle.pilot_binding.roster_sha256 = bundle.pilot_binding.roster_ref.sha256;
  bundle.pilot_binding.source_ref_sha256 = bundle.pilot_binding.source_ref.sha256;
  bundle.pilot_binding.api_artifact_sha256 = bundle.pilot_binding.api_artifact_ref.sha256;
  bundle.pilot_binding.desktop_artifact_sha256 = bundle.pilot_binding.desktop_artifact_ref.sha256;
  bundle.trust = {
    trusted_registry_ref: registryRef.ref,
    trusted_registry_sha256: registryRef.sha256,
    anchor_ref: anchor.ref,
    anchor_sha256: anchor.sha256,
  };
  for (const role of Object.keys(bundle.roles)) {
    const approval = signedReceipt(root, `docs/pilot/${role}-role-approval.json`, { operation: "role_assignment", role, keyPair });
    bundle.roles[role] = {
      ...bundle.roles[role],
      name: `${role}-human`,
      team: "pilot-operations",
      channel: "docs/pilot/incident-channel.txt",
      coverage: "approved-pilot-window",
      timezone: "Asia/Seoul",
      approval_ref: approval,
      receipt: {
        kind: `${role}_support`,
        ...signedReceipt(root, `docs/pilot/${role}-receipt.json`, { operation: "support_receipt", role, keyPair }),
        outcome: "passed",
        recorded_at: "2026-08-12T10:00:00.000Z",
        recorded_by: "human-operator",
      },
    };
  }
  bundle.approvals.human = ["pilot_owner", "support_owner", "rollback_owner"].map((role) => ({
    role,
    ...signedReceipt(root, `docs/pilot/${role}-approval.json`, { operation: "approval", role, keyPair }),
    outcome: "approved",
    approved_at: "2026-08-12T10:00:00.000Z",
    approved_by: "human-operator",
  }));
  bundle.approvals.legal = ["privacy_owner", "dpa_owner", "retention_owner"].map((role) => ({
    role,
    ...signedReceipt(root, `docs/pilot/${role}-legal-approval.json`, { operation: "approval", role, keyPair }),
    outcome: "approved",
    approved_at: "2026-08-12T10:00:00.000Z",
    approved_by: "human-operator",
  }));
  const monitoringDashboard = evidence(root, "docs/pilot/monitoring-dashboard.txt");
  const monitoringThresholds = evidence(root, "docs/pilot/monitoring-thresholds.json");
  const incidentChannel = evidence(root, "docs/pilot/incident-channel.txt");
  bundle.monitoring = {
    dashboard_ref: monitoringDashboard,
    alert_channels: [incidentChannel],
    observation_window: "approved-pilot-window",
    thresholds: { error_rate_percent: 5, p95_latency_ms: 1000, auth_failure_rate_percent: 5, backup_age_minutes: 60, critical_alert_count: 0 },
    threshold_basis_ref: monitoringThresholds,
    receipt: { ...signedReceipt(root, "docs/pilot/monitoring-receipt.json", { operation: "monitoring_receipt", role: "monitoring", keyPair }), kind: "monitoring", outcome: "passed", recorded_at: "2026-08-12T10:00:00.000Z", recorded_by: "human-operator" },
  };
  bundle.incident_escalation = {
    incident_channel: incidentChannel,
    escalation_policy_ref: evidence(root, "docs/pilot/escalation-policy.json"),
    acknowledgement_sla_minutes: 15,
    levels: ["P0", "P1", "P2"].map((severity) => ({ severity, notify_roles: ["on_call_primary", "incident_commander"], acknowledgement_minutes: 15, escalation_ref: evidence(root, `docs/pilot/${severity}-escalation.json`) })),
    tabletop_receipt: { ...signedReceipt(root, "docs/pilot/escalation-tabletop.json", { operation: "incident_escalation_tabletop", role: "incident_escalation", keyPair }), kind: "incident_escalation_tabletop", outcome: "passed", recorded_at: "2026-08-12T10:00:00.000Z", recorded_by: "human-operator" },
  };
  bundle.privacy_dpa_retention = {
    acceptance_status: "accepted",
    privacy_acceptance_ref: evidence(root, "docs/pilot/privacy-acceptance.json"),
    dpa_acceptance_ref: evidence(root, "docs/pilot/dpa-acceptance.json"),
    retention_acceptance_ref: evidence(root, "docs/pilot/retention-acceptance.json"),
    legal_review_receipt: { ...signedReceipt(root, "docs/pilot/legal-review-receipt.json", { operation: "privacy_dpa_retention", role: "privacy_dpa_retention", keyPair }), kind: "privacy_dpa_retention", outcome: "passed", recorded_at: "2026-08-12T10:00:00.000Z", recorded_by: "human-operator" },
    subprocessor_decision_ref: evidence(root, "docs/pilot/subprocessor-decision.json"),
    legal_hold_policy_ref: evidence(root, "docs/pilot/legal-hold-policy.json"),
    deletion_exit_acceptance_ref: evidence(root, "docs/pilot/deletion-exit.json"),
    no_legal_text_generated: true,
  };
  const backup = signedReceipt(root, "docs/pilot/backup-restore-receipt.json", { operation: "backup_restore", role: "backup_restore", keyPair });
  bundle.backup_restore = {
    restore_target: "isolated",
    isolated_restore_required: true,
    receipt_ref: { ref: backup.ref, sha256: backup.sha256 },
    receipt_sha256: backup.sha256,
    signature_ref: backup.signature_ref,
    outcome: "passed",
    scope: backup.scope,
    expires_at: backup.expires_at,
    recorded_at: "2026-08-12T10:00:00.000Z",
    recorded_by: "human-operator",
    rpo_minutes: 15,
    rto_minutes: 60,
    restored_object_count: 10,
    backup_scope_ref: evidence(root, "docs/pilot/backup-scope.json"),
  };
  for (const file of ["escalation-policy.json", "P0-escalation.json", "P1-escalation.json", "P2-escalation.json", "privacy-acceptance.json", "dpa-acceptance.json", "retention-acceptance.json", "subprocessor-decision.json", "legal-hold-policy.json", "deletion-exit.json", "backup-scope.json"]) {
    if (!statSync(join(root, `docs/pilot/${file}`), { throwIfNoEntry: false })) evidence(root, `docs/pilot/${file}`);
  }
  writeFileSync(join(root, "bundle.json"), `${JSON.stringify(bundle, null, 2)}\n`);
  return { bundle, keyPair };
}

test("generator emits offline synthetic-only template with private outputs and optional public projection", (t) => {
  const root = fixtureRoot(t);
  generateExternalPilotOpsBundle({ rootDir: root, outputPath: "bundle.json", markdownPath: "bundle.md", publicProjectionPath: "public.json", generatedAt: "2026-08-12T00:00:00.000Z" });
  const bundle = JSON.parse(readFileSync(join(root, "bundle.json"), "utf8"));
  assert.equal(bundle.status, "TEMPLATE_ONLY");
  assert.equal(bundle.data_boundary.synthetic_only, true);
  assert.equal(bundle.boundary.provider_calls_executed, false);
  assert.equal(statSync(join(root, "bundle.json")).mode & 0o777, 0o600);
  assert.equal(statSync(join(root, "bundle.md")).mode & 0o777, 0o600);
  assert.equal(statSync(join(root, "public.json")).mode & 0o777, 0o644);
  const projection = JSON.parse(readFileSync(join(root, "public.json"), "utf8"));
  assert.deepEqual(Object.keys(projection).sort(), ["boundary", "bundle_id", "data_boundary", "generated_at", "operational_status", "required_field_groups", "schema_version", "status"]);
  assert.equal(Object.hasOwn(projection, "pilot_binding"), false);
});

test("default private output paths are outside the repository docs tree", () => {
  assert.equal(path.isAbsolute(DEFAULT_BUNDLE_PATH), true);
  assert.equal(path.isAbsolute(DEFAULT_MARKDOWN_PATH), true);
  assert.equal(DEFAULT_BUNDLE_PATH.includes(`${path.sep}docs${path.sep}`), false);
  assert.equal(DEFAULT_MARKDOWN_PATH.includes(`${path.sep}docs${path.sep}`), false);
  assert.equal(DEFAULT_BUNDLE_PATH.includes("lawos-external-pilot-ops"), true);
  assert.equal(DEFAULT_VALIDATION_PATH.includes(`${path.sep}docs${path.sep}`), false);
  assert.equal(DEFAULT_VALIDATION_MARKDOWN_PATH.includes(`${path.sep}docs${path.sep}`), false);
});

test("default generator and validator outputs are private and atomic", (t) => {
  const root = fixtureRoot(t);
  const generated = generateExternalPilotOpsBundle({ rootDir: root });
  t.after(() => {
    rmSync(generated.outputPath, { force: true });
    rmSync(generated.markdownPath, { force: true });
    rmSync(DEFAULT_VALIDATION_PATH, { force: true });
    rmSync(DEFAULT_VALIDATION_MARKDOWN_PATH, { force: true });
  });
  assert.equal(statSync(generated.outputPath).mode & 0o777, 0o600);
  assert.equal(statSync(generated.markdownPath).mode & 0o777, 0o600);
  const report = validateExternalPilotOpsBundleFile({ rootDir: root, bundlePath: generated.outputPath, markdownPath: generated.markdownPath });
  assert.equal(report.verdict, "PASS");
  assert.equal(statSync(DEFAULT_VALIDATION_PATH).mode & 0o777, 0o600);
  assert.equal(statSync(DEFAULT_VALIDATION_MARKDOWN_PATH).mode & 0o777, 0o600);
});

test("generator strips caller trust-root selections and validator rejects injected trust input", (t) => {
  const root = fixtureRoot(t);
  writeJson(root, "input.json", {
    trust: {
      trusted_registry_ref: "docs/pilot/self-minted-registry.json",
      trusted_registry_sha256: "f".repeat(64),
      anchor_ref: "docs/pilot/self-minted-anchor.json",
      anchor_sha256: "e".repeat(64),
    },
    claims: { external_pilot_ready: true },
  });
  generateExternalPilotOpsBundle({ rootDir: root, inputPath: "input.json", outputPath: "bundle.json", markdownPath: "bundle.md", generatedAt: "2026-08-12T00:00:00.000Z" });
  const generated = JSON.parse(readFileSync(join(root, "bundle.json"), "utf8"));
  assert.deepEqual(generated.trust, { trusted_registry_ref: null, trusted_registry_sha256: null, anchor_ref: null, anchor_sha256: null });
  assert.equal(generated.claims.external_pilot_ready, false);
  generated.trust.trusted_registry_ref = "docs/pilot/injected-registry.json";
  const report = validateExternalPilotOpsBundle(generated, { rootDir: root });
  assert.equal(report.verdict, "FAIL");
  assert.ok(report.findings.some((finding) => finding.code === "TRUST_INPUT_NOT_ACCEPTED"));
});

test("production and test CLI reject deterministic clock injection", () => {
  const result = spawnSync(process.execPath, ["scripts/validate-external-pilot-ops-bundle.mjs", "--now", NOW], {
    cwd: process.cwd(),
    env: { ...process.env, NODE_ENV: "test" },
    encoding: "utf8",
  });
  assert.notEqual(result.status, 0);
  assert.match(`${result.stdout}\n${result.stderr}`, /Unknown argument: --now/);
  assert.throws(() => validateExternalPilotOpsBundle(createExternalPilotOpsTemplate(), { rootDir: process.cwd(), now: NOW }), /NOW_OVERRIDE_FORBIDDEN/);
});

test("child-process generator rejects a symlink root before writing", (t) => {
  const root = fixtureRoot(t);
  const rootAlias = join(root, "root-alias");
  const realRoot = fixtureRoot(t);
  symlinkSync(realRoot, rootAlias, "dir");
  const outputPath = join(realRoot, "generated", "bundle.json");
  const script = `import { generateExternalPilotOpsBundle } from ${JSON.stringify(pathToFileURL(path.join(process.cwd(), "scripts/generate-external-pilot-ops-bundle.mjs")).href)};
try { generateExternalPilotOpsBundle({ rootDir: process.env.OPS_ROOT_ALIAS, outputPath: "generated/bundle.json", markdownPath: "generated/bundle.md" }); process.exit(2); }
catch (error) { if (error.code !== "TRUST_ROOT_INVALID") process.exit(3); }`;
  const result = spawnSync(process.execPath, ["--input-type=module", "-e", script], {
    cwd: process.cwd(),
    env: { ...process.env, OPS_ROOT_ALIAS: rootAlias },
    encoding: "utf8",
  });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.equal(existsSync(outputPath), false);
  assert.equal(existsSync(join(realRoot, "generated")), false);
});

test("child-process validator rejects a symlink report ancestor before writing", (t) => {
  const root = fixtureRoot(t);
  generateExternalPilotOpsBundle({ rootDir: root, outputPath: "bundle.json", markdownPath: "bundle.md" });
  const outside = fixtureRoot(t);
  symlinkSync(outside, join(root, "report-alias"), "dir");
  const script = `import { validateExternalPilotOpsBundleFile } from ${JSON.stringify(pathToFileURL(path.join(process.cwd(), "scripts/validate-external-pilot-ops-bundle.mjs")).href)};
try { validateExternalPilotOpsBundleFile({ rootDir: process.env.OPS_ROOT, bundlePath: "bundle.json", validationPath: "report-alias/report.json", validationMarkdownPath: "report-alias/report.md" }); process.exit(2); }
catch (error) { if (error.code !== "TRUST_OUTPUT_SYMLINK") process.exit(3); }`;
  const result = spawnSync(process.execPath, ["--input-type=module", "-e", script], {
    cwd: process.cwd(),
    env: { ...process.env, OPS_ROOT: root },
    encoding: "utf8",
  });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.equal(existsSync(join(outside, "report.json")), false);
  assert.equal(existsSync(join(outside, "report.md")), false);
});

test("validator keeps an incomplete synthetic template safe and writes private validation outputs", (t) => {
  const root = fixtureRoot(t);
  generateExternalPilotOpsBundle({ rootDir: root, outputPath: "bundle.json", markdownPath: "bundle.md", generatedAt: "2026-08-12T00:00:00.000Z" });
  const report = validateExternalPilotOpsBundleFile({ rootDir: root, bundlePath: "bundle.json", markdownPath: "bundle.md", validationPath: "validation.json", validationMarkdownPath: "validation.md" });
  assert.equal(report.verdict, "PASS");
  assert.equal(report.operational_status, "pending_required_fields");
  assert.equal(report.summary.real_data_authorized, false);
  assert.equal(statSync(join(root, "validation.json")).mode & 0o777, 0o600);
});

test("real-data mode fails closed without exact trust, signed approvals, receipts, and bindings", () => {
  const bundle = createExternalPilotOpsTemplate({ generatedAt: "2026-08-12T00:00:00.000Z", requestedDataMode: "real_data" });
  bundle.data_boundary.synthetic_only = false;
  bundle.data_boundary.real_data_present = true;
  const report = validateExternalPilotOpsBundle(bundle, { rootDir: process.cwd() });
  assert.equal(report.verdict, "FAIL");
  assert.equal(report.operational_status, "blocked");
  assert.equal(report.summary.real_data_authorized, false);
  assert.ok(report.findings.some((finding) => finding.code === "REAL_DATA_NOT_AUTHORIZED"));
  assert.ok(report.findings.some((finding) => finding.code === "TRUST_CONFIG_MISSING" || finding.code === "REFERENCE_MISSING"));
});

test("bundle generated_at must be canonical UTC and not future-dated", () => {
  const bundle = createExternalPilotOpsTemplate({ generatedAt: "2099-01-01T00:00:00.000Z" });
  const future = validateExternalPilotOpsBundle(bundle, { rootDir: process.cwd() });
  assert.ok(future.findings.some((finding) => finding.code === "TIMESTAMP_FUTURE"));
  bundle.generated_at = "2026-08-12T10:00:00.00Z";
  const nonCanonical = validateExternalPilotOpsBundle(bundle, { rootDir: process.cwd() });
  assert.ok(nonCanonical.findings.some((finding) => finding.code === "TIMESTAMP_INVALID"));
});

test("a self-minted registry cannot bypass the canonical production trust root", (t) => {
  const root = fixtureRoot(t);
  const { bundle } = completeRealDataBundle(root);
  const report = validateExternalPilotOpsBundle(bundle, { rootDir: root });
  assert.equal(report.verdict, "FAIL");
  assert.equal(report.summary.real_data_authorized, false);
  assert.ok(report.findings.some((finding) => finding.code === "TRUST_ROOT_NOT_CONFIGURED"));
  assert.ok(report.findings.some((finding) => finding.code === "TRUST_INPUT_NOT_ACCEPTED"));
});

test("complete self-minted real-data fixture remains blocked until the canonical root is installed", (t) => {
  const root = fixtureRoot(t);
  const { bundle } = completeRealDataBundle(root);
  const report = validateExternalPilotOpsBundle(bundle, { rootDir: root });
  assert.equal(report.verdict, "FAIL", JSON.stringify(report.findings, null, 2));
  assert.equal(report.operational_status, "blocked");
  assert.equal(report.summary.real_data_authorized, false);
  assert.ok(report.findings.some((finding) => finding.code === "TRUST_ROOT_NOT_CONFIGURED"));
});

test("tampering signed receipt bytes or input readiness claims never authorizes real data", (t) => {
  const root = fixtureRoot(t);
  const { bundle } = completeRealDataBundle(root);
  bundle.claims.external_pilot_ready = true;
  const receiptPath = join(root, bundle.monitoring.receipt.ref);
  writeFileSync(receiptPath, `${readFileSync(receiptPath, "utf8")}tampered\n`);
  const report = validateExternalPilotOpsBundle(bundle, { rootDir: root });
  assert.equal(report.verdict, "FAIL");
  assert.equal(report.summary.real_data_authorized, false);
  assert.ok(report.findings.some((finding) => finding.code === "REFERENCE_HASH_MISMATCH" || finding.code === "TRUST_RECEIPT_HASH_MISMATCH"));
  assert.ok(report.findings.some((finding) => finding.code === "CLAIMS_NOT_ACCEPTED"));
});

test("signed receipt verifier rejects wrong key, scope, tenant, and validity dimensions", (t) => {
  const root = fixtureRoot(t);
  const { bundle, keyPair } = completeRealDataBundle(root);
  const receiptPath = join(root, bundle.monitoring.receipt.ref);
  let receiptBytes = readFileSync(receiptPath);
  const receipt = JSON.parse(receiptBytes.toString("utf8"));
  const signaturePath = join(root, bundle.monitoring.receipt.signature_ref.ref);
  let signatureBytes = readFileSync(signaturePath);
  const registry = verifyTrustedRegistry({
    rootDir: root,
    registryPath: bundle.trust.trusted_registry_ref,
    registrySha256: bundle.trust.trusted_registry_sha256,
    now: Date.parse(NOW),
  });
  const receiptRef = {
    path: bundle.monitoring.receipt.ref,
    sha256: sha256(receiptBytes),
    signature_ref: {
      path: bundle.monitoring.receipt.signature_ref.ref,
      sha256: sha256(signatureBytes),
    },
  };
  const verify = (candidate, overrides = {}) => {
    receiptBytes = Buffer.from(`${JSON.stringify(candidate, null, 2)}\n`);
    signatureBytes = sign(null, receiptBytes, keyPair.privateKey);
    writeFileSync(receiptPath, receiptBytes);
    writeFileSync(signaturePath, signatureBytes);
    receiptRef.sha256 = sha256(receiptBytes);
    receiptRef.signature_ref.sha256 = sha256(signatureBytes);
    return verifyDetachedReceipt({
      rootDir: root,
      receiptRef,
      registry,
      expectedReceiptType: "monitoring_receipt",
      expectedReceiptSource: "pilot_operations",
      expectedPilotId: PILOT_ID,
      expectedLawosTenantId: overrides.lawosTenantId ?? LAWOS_TENANT_ID,
      expectedEntraTenantId: overrides.entraTenantId ?? ENTRA_TENANT_ID,
      expectedSourceSha: overrides.sourceSha ?? SOURCE_SHA,
      expectedSourceTree: overrides.sourceTree ?? SOURCE_TREE,
      expectedVersion: overrides.version ?? VERSION,
      expectedRole: overrides.role ?? receipt.role,
      expectedOperation: overrides.operation ?? "monitoring_receipt",
      expectedArtifactSha256: overrides.artifactSha256 ?? [API_SHA, DESKTOP_SHA],
      expectedBindingSha256: overrides.bindingSha256 ?? BINDING_SHA,
      now: Date.parse(NOW),
    });
  };
  assert.doesNotThrow(() => verify(receipt));
  const errorCode = (candidate, overrides) => {
    assert.throws(() => verify(candidate, overrides), (error) => error instanceof ExternalReleaseTrustError);
    try {
      verify(candidate, overrides);
    } catch (error) {
      return error.code;
    }
    return null;
  };
  assert.equal(errorCode({ ...receipt, key_id: "untrusted-key-999" }), "TRUSTED_KEY_NOT_FOUND");
  assert.equal(errorCode({ ...receipt, receipt_type: "wrong-operation" }), "TRUST_RECEIPT_SCOPE_MISMATCH");
  assert.equal(errorCode({ ...receipt, source_sha: "c".repeat(40) }), "TRUST_RECEIPT_SCOPE_MISMATCH");
  assert.equal(errorCode({ ...receipt, source_tree: "d".repeat(40) }), "TRUST_RECEIPT_SCOPE_MISMATCH");
  assert.equal(errorCode({ ...receipt, version: "pilot-ops-v0.2.0" }), "TRUST_RECEIPT_SCOPE_MISMATCH");
  assert.equal(errorCode({ ...receipt, role: "wrong-role" }), "TRUST_RECEIPT_SCOPE_MISMATCH");
  assert.equal(errorCode({ ...receipt, artifact_sha256: DESKTOP_SHA }, { artifactSha256: API_SHA }), "TRUST_RECEIPT_SCOPE_MISMATCH");
  assert.equal(errorCode({ ...receipt, binding_sha256: "e".repeat(64) }), "TRUST_RECEIPT_SCOPE_MISMATCH");
  assert.equal(errorCode(receipt, { lawosTenantId: "lawos-other" }), "TRUST_RECEIPT_TENANT_SCOPE_MISMATCH");
  assert.equal(errorCode({ ...receipt, expires_at: "2020-01-01T00:00:00.000Z" }), "TRUST_RECEIPT_TIME_INVALID");
  assert.equal(errorCode({ ...receipt, issued_at: "2099-01-01T00:00:00.000Z" }), "TRUST_RECEIPT_TIME_INVALID");
  assert.equal(errorCode({ ...receipt, issued_at: "2026-02-30T00:00:00.000Z" }), "TRUST_TIMESTAMP_INVALID");
});

test("real-data evidence must remain private even when its digest and signature are valid", (t) => {
  const root = fixtureRoot(t);
  const { bundle } = completeRealDataBundle(root);
  chmodSync(join(root, bundle.monitoring.receipt.ref), 0o644);
  const report = validateExternalPilotOpsBundle(bundle, { rootDir: root });
  assert.equal(report.verdict, "FAIL");
  assert.ok(report.findings.some((finding) => finding.code === "REFERENCE_NOT_PRIVATE"));
});

test("realpath-safe references reject ancestor symlink escapes and directories", (t) => {
  const root = fixtureRoot(t);
  const outside = fixtureRoot(t);
  const { bundle } = completeRealDataBundle(root);
  writeFileSync(join(outside, "escaped.json"), "outside\n");
  symlinkSync(outside, join(root, "docs/pilot/escape"), "dir");
  bundle.monitoring.receipt.ref = "docs/pilot/escape/escaped.json";
  bundle.monitoring.receipt.sha256 = sha256("outside\n");
  const escaped = validateExternalPilotOpsBundle(bundle, { rootDir: root });
  assert.ok(escaped.findings.some((finding) => finding.code === "REFERENCE_SYMLINK_ESCAPE"));
  const { bundle: directoryBundle } = completeRealDataBundle(root);
  directoryBundle.monitoring.receipt.ref = "docs/pilot";
  directoryBundle.monitoring.receipt.sha256 = "0".repeat(64);
  const directory = validateExternalPilotOpsBundle(directoryBundle, { rootDir: root });
  assert.ok(directory.findings.some((finding) => finding.code === "REFERENCE_DIRECTORY"));
});

test("LawOS and Entra tenant identifiers are explicit and must remain distinct", (t) => {
  const root = fixtureRoot(t);
  const { bundle } = completeRealDataBundle(root);
  bundle.pilot_binding.entra_tenant_id = bundle.pilot_binding.lawos_tenant_id;
  bundle.pilot_binding.tenant_ref = bundle.pilot_binding.lawos_tenant_ref;
  const report = validateExternalPilotOpsBundle(bundle, { rootDir: root });
  assert.equal(report.verdict, "FAIL");
  assert.ok(report.findings.some((finding) => finding.code === "TENANT_IDENTIFIERS_NOT_DISTINCT"));
  assert.ok(report.findings.some((finding) => finding.code === "LEGACY_TENANT_ALIAS_REJECTED"));
});

test("offline behavior is observable from generated and validated machine fields, without provider calls", (t) => {
  const root = fixtureRoot(t);
  generateExternalPilotOpsBundle({ rootDir: root, outputPath: "bundle.json", markdownPath: "bundle.md" });
  const report = validateExternalPilotOpsBundleFile({ rootDir: root, bundlePath: "bundle.json", markdownPath: "bundle.md", validationPath: "validation.json", validationMarkdownPath: "validation.md" });
  assert.equal(report.boundary.provider_calls_executed, false);
  assert.equal(report.boundary.external_systems_contacted, false);
  assert.equal(report.boundary.real_data_read, false);
  assert.equal(report.boundary.real_data_written, false);
  assert.equal(report.summary.real_data_authorized, false);
});

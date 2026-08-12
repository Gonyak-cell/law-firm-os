import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash, generateKeyPairSync, sign } from "node:crypto";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { verifyDetachedReceipt, verifyTrustedRegistry } from "../lib/external-release-trust.mjs";
import { main, validateExternalReleaseReadiness } from "../validate-external-release-readiness.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
process.env.NODE_ENV = "test";
const contractBytes = readFileSync(path.join(repoRoot, "contracts/external-release-readiness-contract.json"));
const RECEIPT_SCHEMA_VERSION = "law-firm-os.external-release-receipt.v0.2";
const INTERNAL_PROVISIONING_RECEIPT_SCHEMA_VERSION = "law-firm-os.external-tenant-provisioning-receipt.v1";

function hash(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function writeBytes(root, relativePath, bytes) {
  const target = path.join(root, relativePath);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, bytes);
  return { path: relativePath, sha256: hash(bytes) };
}

function writeJson(root, relativePath, value) {
  return writeBytes(root, relativePath, Buffer.from(`${JSON.stringify(value, null, 2)}\n`));
}

function writeSignedJson(root, relativePath, value, keyPair) {
  const bytes = Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
  const receiptRef = writeBytes(root, relativePath, bytes);
  const signatureRef = writeBytes(root, `${relativePath}.sig`, sign(null, bytes, keyPair.privateKey));
  return { ...receiptRef, signature_ref: signatureRef };
}

function bindingSha256({ pilot_id, lawos_tenant_id, entra_tenant_id, source_sha, source_tree, version }) {
  return hash(Buffer.from(JSON.stringify({ pilot_id, lawos_tenant_id, entra_tenant_id, source_sha, source_tree, version }), "utf8"));
}

function receiptBase({ receipt_type, receipt_source, pilot_id, source_sha, source_tree, lawos_tenant_id = null, entra_tenant_id = null, version, verdict = "PASS", key_id = "release-evidence-key-001", role = receipt_source, operation = receipt_type }) {
  return {
    schema_version: RECEIPT_SCHEMA_VERSION,
    receipt_type,
    receipt_source,
    verdict,
    key_id,
    issued_at: "2026-08-12T01:30:00Z",
    expires_at: "2026-12-31T23:59:59Z",
    pilot_id,
    ...(lawos_tenant_id ? { lawos_tenant_id } : {}),
    ...(entra_tenant_id ? { entra_tenant_id } : {}),
    source_sha,
    source_tree,
    version,
    artifact_sha256: "b".repeat(64),
    binding_sha256: bindingSha256({ pilot_id, lawos_tenant_id, entra_tenant_id, source_sha, source_tree, version }),
    role,
    operation,
  };
}

function makeCompleteFixture() {
  const root = mkdtempSync(path.join(tmpdir(), "lawos-external-release-"));
  writeBytes(root, "contracts/external-release-readiness-contract.json", contractBytes);
  const keyPair = generateKeyPairSync("ed25519");
  const sourceSha = "a".repeat(40);
  const sourceTree = "d".repeat(40);
  const pilotId = "pilot-law-firm-001";
  const lawosTenantId = "lawos-law-firm-001";
  const entraTenantId = "11111111-2222-4333-8444-555555555555";
  const version = "1.2.3";
  const issuer = `https://login.microsoftonline.com/${entraTenantId}/v2.0`;
  const oidcConfigVersion = "oidc-config-v1";
  const allowedReceiptTypes = [
    "api_artifact_deployment",
    "tenant_provisioning_adapter",
    "tenant_pinned_runtime_binding",
    "multi_tenant_runtime_review",
    "m365_consent_deployment_visibility",
    "macos_distribution_artifacts",
    "operations_support_rollback",
    "backup_restore_rehearsal",
    "legal_owner_approval",
  ];
  const registry = {
    schema_version: "law-firm-os.external-release-trust-registry.v1",
    generated_at: "2026-08-12T01:00:00Z",
    keys: [{
      key_id: "release-evidence-key-001",
      algorithm: "Ed25519",
      public_key_spki_pem: keyPair.publicKey.export({ type: "spki", format: "pem" }),
      valid_from: "2020-01-01T00:00:00Z",
      valid_until: "2030-01-01T00:00:00Z",
      revoked_at: null,
      allowed_receipt_sources: ["release_pipeline", "internal_provisioning_adapter", "external_provider", "independent_runtime_review", "microsoft_365_provider", "operations_owner", "legal_owner"],
      allowed_receipt_types: allowedReceiptTypes,
      allowed_pilot_ids: [pilotId],
      allowed_lawos_tenant_ids: [lawosTenantId],
      allowed_entra_tenant_ids: [entraTenantId],
      allowed_source_shas: [sourceSha],
      allowed_source_trees: [sourceTree],
      allowed_versions: [version],
      allowed_roles: ["release_pipeline", "internal_provisioning_adapter", "external_provider", "independent_runtime_review", "microsoft_365_provider", "operations_owner", "legal_owner"],
      allowed_operations: ["api_artifact_deployment", "tenant_provisioning_adapter", "tenant_runtime_binding", "m365_consent_deployment_visibility", "macos_distribution_artifacts", "operations_support_rollback", "backup_restore_rehearsal", "legal_owner_approval"],
      allowed_artifact_sha256s: ["b".repeat(64)],
      allowed_binding_sha256s: [bindingSha256({ pilot_id: pilotId, lawos_tenant_id: lawosTenantId, entra_tenant_id: entraTenantId, source_sha: sourceSha, source_tree: sourceTree, version })],
    }],
  };
  const registryRef = writeJson(root, "trust/registry.json", registry);

  const configRef = writeJson(root, "evidence/tenant-config.json", {
    LAWOS_IDENTITY_TENANT_ID: lawosTenantId,
    LAWOS_DATABASE_TENANT_ID: lawosTenantId,
    config_version: oidcConfigVersion,
    resolved_oidc: { tenant_id: entraTenantId, issuer, protected: true },
  });
  const apiReceipt = receiptBase({ receipt_type: "api_artifact_deployment", receipt_source: "release_pipeline", pilot_id: pilotId, lawos_tenant_id: lawosTenantId, entra_tenant_id: entraTenantId, source_sha: sourceSha, source_tree: sourceTree, version, operation: "api_artifact_deployment" });
  apiReceipt.artifact_sha256 = "b".repeat(64);
  apiReceipt.deployment = {
    status: "DEPLOYED",
    target: "matter-lawos-api-pilot",
    source_sha: sourceSha,
    source_tree: sourceTree,
    artifact_sha256: apiReceipt.artifact_sha256,
    binding_sha256: apiReceipt.binding_sha256,
    version,
    deployed_at: "2026-08-12T01:00:00Z",
    deployment_receipt_id: "deploy-api-001",
  };

  const manifestRef = writeJson(root, "evidence/tenant-manifest.json", {
    schema_version: "law-firm-os.external-tenant-provisioning.v1",
    tenant: {
      tenant_id: lawosTenantId,
      deployment: {
        identity_tenant_id: lawosTenantId,
        database_tenant_id: lawosTenantId,
        federated_tenant_id: entraTenantId,
        staff_auth_authority: "entra-oidc",
      },
    },
  });

  const internalProvisioningReceipt = {
    schema_version: INTERNAL_PROVISIONING_RECEIPT_SCHEMA_VERSION,
    outcome: "completed",
    tenant_ref: `tenant_sha256:${hash(Buffer.from(lawosTenantId, "utf8"))}`,
    manifest_ref: `manifest_sha256:${manifestRef.sha256}`,
    request_ref: `request_sha256:${"2".repeat(64)}`,
    deployment_mode: "tenant-pinned",
    staff_auth_authority: "entra-oidc",
    federated_directory_configured: true,
    member_count: 1,
    member_refs: [`member_sha256:${"3".repeat(64)}`],
    prebound_federated_member_count: 1,
    reset_required_member_count: 0,
    runtime_binding: {
      separate_deployment_required: true,
      identity_authority_pinned: true,
      database_authority_pinned: true,
      shared_multi_tenant_runtime: false,
    },
    authentication_material_returned: false,
    pii_returned: false,
    production_ready_claim: false,
  };
  const internalProvisioningRef = writeJson(root, "receipts/internal-provisioning.json", internalProvisioningReceipt);
  const provisioningReceipt = receiptBase({ receipt_type: "tenant_provisioning_adapter", receipt_source: "internal_provisioning_adapter", pilot_id: pilotId, lawos_tenant_id: lawosTenantId, entra_tenant_id: entraTenantId, source_sha: sourceSha, source_tree: sourceTree, version, operation: "tenant_provisioning_adapter" });
  provisioningReceipt.internal_receipt_schema_version = INTERNAL_PROVISIONING_RECEIPT_SCHEMA_VERSION;
  provisioningReceipt.internal_receipt_ref = internalProvisioningRef;
  provisioningReceipt.manifest_schema_version = "law-firm-os.external-tenant-provisioning.v1";
  provisioningReceipt.manifest_ref = manifestRef;
  provisioningReceipt.provisioning = {
    status: "PROVISIONED",
    namespace: "law-firm-001",
    provisioned_at: "2026-08-12T01:01:00Z",
    provisioning_receipt_id: "tenant-provision-001",
  };

  const runtimeReceipt = receiptBase({ receipt_type: "tenant_pinned_runtime_binding", receipt_source: "external_provider", pilot_id: pilotId, lawos_tenant_id: lawosTenantId, entra_tenant_id: entraTenantId, source_sha: sourceSha, source_tree: sourceTree, version, operation: "tenant_runtime_binding" });
  runtimeReceipt.runtime = {
    binding_mode: "tenant_pinned",
    identity_tenant_id: lawosTenantId,
    database_tenant_id: lawosTenantId,
    federated_tenant_id: entraTenantId,
    issuer,
    config_ref: configRef,
    resolved_oidc_config_version: oidcConfigVersion,
    resolved_oidc_config_sha256: configRef.sha256,
    resolved_oidc_config_protected: true,
    safe_tenant_projection: {
      lawos_tenant_id: lawosTenantId,
      entra_tenant_id: entraTenantId,
      deployment_mode: "tenant-pinned",
      staff_auth_authority: "entra-oidc",
    },
    deployment_receipt_id: "tenant-runtime-deploy-001",
    deployed_at: "2026-08-12T01:02:00Z",
  };

  const m365Receipt = receiptBase({ receipt_type: "m365_consent_deployment_visibility", receipt_source: "microsoft_365_provider", pilot_id: pilotId, lawos_tenant_id: lawosTenantId, entra_tenant_id: entraTenantId, source_sha: sourceSha, source_tree: sourceTree, version });
  m365Receipt.product_id = "8f3cc90d-56dd-4c1c-b9c2-0a1100500101";
  m365Receipt.consent = { status: "GRANTED", scopes_match: true, scope_sha256: "c".repeat(64) };
  m365Receipt.deployment = { status: "ENABLED", assignment_fingerprint_sha256: "d".repeat(64) };
  m365Receipt.visibility = {
    positive: { status: "VISIBLE", population: "included", principal_ref: "included-principal-hash", observed_at: "2026-08-12T01:04:00Z" },
    negative: { status: "NOT_VISIBLE", population: "excluded", principal_ref: "excluded-principal-hash", observed_at: "2026-08-12T01:05:00Z" },
  };

  const packageBytes = Buffer.from("not-a-real-dmg-test-fixture");
  const packageRef = writeBytes(root, "artifacts/matter-pilot.dmg", packageBytes);
  const checksumsRef = writeBytes(root, "artifacts/checksums.sha256", Buffer.from(`${packageRef.sha256}  matter-pilot.dmg\n`));
  const sbomRef = writeJson(root, "artifacts/sbom.cdx.json", { bomFormat: "CycloneDX", specVersion: "1.5", components: [{ type: "library", name: "lawos-fixture", version: "1.0.0" }] });
  const macReceipt = receiptBase({ receipt_type: "macos_distribution_artifacts", receipt_source: "release_pipeline", pilot_id: pilotId, lawos_tenant_id: lawosTenantId, entra_tenant_id: entraTenantId, source_sha: sourceSha, source_tree: sourceTree, version });
  macReceipt.signing = { developer_id: true, notarized: true, stapled: true, gatekeeper_accepted: true, notarization_ticket_ref: "notary-ticket-001" };
  macReceipt.artifacts = { package: { ...packageRef, kind: "dmg" }, checksums: checksumsRef, sbom: sbomRef };

  const operationsReceipt = receiptBase({ receipt_type: "operations_support_rollback", receipt_source: "operations_owner", pilot_id: pilotId, lawos_tenant_id: lawosTenantId, entra_tenant_id: entraTenantId, source_sha: sourceSha, source_tree: sourceTree, version });
  operationsReceipt.owners = { monitoring_owner: "ops-monitoring-owner", support_owner: "ops-support-owner", rollback_owner: "ops-rollback-owner" };
  operationsReceipt.runbooks = { monitoring: "runbook:monitoring:001", support: "runbook:support:001", rollback: "runbook:rollback:001" };
  operationsReceipt.incident_channel = "support-channel:law-firm-001";
  operationsReceipt.observed_at = "2026-08-12T01:07:00Z";

  const backupReceipt = receiptBase({ receipt_type: "backup_restore_rehearsal", receipt_source: "release_pipeline", pilot_id: pilotId, lawos_tenant_id: lawosTenantId, entra_tenant_id: entraTenantId, source_sha: sourceSha, source_tree: sourceTree, version });
  backupReceipt.rehearsal = { status: "PASS", backup_ref: "backup-rehearsal-001", expected_state_sha256: "e".repeat(64), restored_state_sha256: "e".repeat(64), exact_restore: true, rpo_seconds: 60, rto_seconds: 300, approved_threshold_ref: "threshold-approval:001", started_at: "2026-08-12T01:08:00Z", finished_at: "2026-08-12T01:12:00Z" };

  const legalReceipt = receiptBase({ receipt_type: "legal_owner_approval", receipt_source: "legal_owner", pilot_id: pilotId, lawos_tenant_id: lawosTenantId, entra_tenant_id: entraTenantId, source_sha: sourceSha, source_tree: sourceTree, version, verdict: "APPROVED" });
  legalReceipt.approval = { decision: "APPROVED", owner: "legal-owner-ref-001", approval_ref: "approval:legal-owner:001", scope_ref: "scope:law-firm-pilot:001", received_at: "2026-08-12T01:13:00Z" };

  const refs = {
    api: writeSignedJson(root, "receipts/api.json", apiReceipt, keyPair),
    provisioning: writeSignedJson(root, "receipts/provisioning.json", provisioningReceipt, keyPair),
    runtime: writeSignedJson(root, "receipts/runtime.json", runtimeReceipt, keyPair),
    m365: writeSignedJson(root, "receipts/m365.json", m365Receipt, keyPair),
    mac: writeSignedJson(root, "receipts/mac.json", macReceipt, keyPair),
    operations: writeSignedJson(root, "receipts/operations.json", operationsReceipt, keyPair),
    backup: writeSignedJson(root, "receipts/backup.json", backupReceipt, keyPair),
    legal: writeSignedJson(root, "receipts/legal.json", legalReceipt, keyPair),
  };
  const input = {
    schema_version: "law-firm-os.external-release-readiness-input.v0.2",
    tenant_identity_schema_version: "law-firm-os.external-tenant-identity.v1",
    status: "READY_FOR_EXTERNAL_PILOT_REVIEW",
    release: { source_sha: sourceSha, source_tree: sourceTree, version, release_channel: "external_pilot" },
    pilot: { pilot_id: pilotId, law_firm_name: "Example Law Firm", lawos_tenant_id: lawosTenantId, entra_tenant_id: entraTenantId, environment: "external_pilot" },
    runtime_assumptions: {
      current_runtime_mode: "single_tenant_env_binding",
      tenant_environment_variable: "LAWOS_IDENTITY_TENANT_ID",
      database_tenant_environment_variable: "LAWOS_DATABASE_TENANT_ID",
      federated_tenant_source: "resolved_oidc_protected_config",
      issuer_strategy: "https://login.microsoftonline.com/{entra_tenant_id}/v2.0",
      provisioning_receipt_alone_satisfies_runtime_binding: false,
    },
    gates: {
      api_artifact_deployment: { receipt_ref: refs.api },
      tenant_provisioning: { provisioning_receipt_ref: refs.provisioning, runtime_binding_receipt_ref: refs.runtime },
      m365_consent_deployment_visibility: { receipt_ref: refs.m365 },
      macos_distribution: { receipt_ref: refs.mac },
      operations_support_rollback: { receipt_ref: refs.operations },
      backup_restore_rehearsal: { receipt_ref: refs.backup },
      legal_owner_approval: { receipt_ref: refs.legal },
    },
  };
  const inputRef = writeJson(root, "input.json", input);
  return { root, input, inputRef, refs, sourceSha, sourceTree, version, pilotId, lawosTenantId, entraTenantId, runtimeReceipt, m365Receipt, keyPair, registryRef };
}

function validateFixture(fixture, inputPath = fixture.inputRef.path, options = {}) {
  return validateExternalReleaseReadiness({
    rootDir: fixture.root,
    inputPath,
    contractPath: "contracts/external-release-readiness-contract.json",
    testOnlyTrustRoot: options.testOnlyTrustRoot ?? { test_only: true, registryPath: fixture.registryRef.path, registrySha256: fixture.registryRef.sha256 },
  });
}

test("complete named pilot matrix requires signed exact bytes and distinct LawOS/Entra IDs", () => {
  const fixture = makeCompleteFixture();
  const report = validateFixture(fixture);
  assert.equal(report.verdict, "PASS");
  assert.equal(report.readiness, "READY_FOR_EXTERNAL_PILOT_REVIEW");
  assert.equal(report.findings.length, 0);
  assert.equal(report.pilot.lawos_tenant_id, fixture.lawosTenantId);
  assert.equal(report.pilot.entra_tenant_id, fixture.entraTenantId);
  assert.notEqual(report.pilot.lawos_tenant_id, report.pilot.entra_tenant_id);
  assert.equal(report.boundary.detached_receipt_signatures_required, true);
  assert.equal(report.boundary.external_pilot_distribution_approved_by_validator, false);
  assert.equal(report.boundary.provider_calls_made_by_validator, false);
});

test("template remains blocked and distinguishes technical, provider, operations, and legal gaps", () => {
  const report = validateExternalReleaseReadiness({ rootDir: repoRoot, inputPath: "docs/launch/external-release/external-release-readiness-input.template.json" });
  assert.equal(report.verdict, "FAIL");
  assert.equal(report.readiness, "BLOCKED_PENDING_EXTERNAL_INPUTS");
  assert.ok(report.findings.some((finding) => finding.code === "TRUST_ROOT_NOT_CONFIGURED"));
  assert.ok(report.findings.some((finding) => finding.code === "TENANT_RUNTIME_BINDING_REQUIRED"));
  assert.equal(report.technical_proof.pending_gate_count, 3);
  assert.equal(report.external_provider_inputs.pending_gate_count, 2);
  assert.equal(report.human_operations_inputs.pending_gate_count, 1);
  assert.equal(report.human_legal_inputs.pending_gate_count, 1);
});

test("receipt file presence does not pass when bytes, signatures, or semantic fields drift", () => {
  const fixture = makeCompleteFixture();
  writeFileSync(path.join(fixture.root, "receipts/api.json"), Buffer.from("{}\n"));
  const report = validateFixture(fixture);
  assert.equal(report.verdict, "FAIL");
  assert.ok(report.findings.some((finding) => finding.code === "RECEIPT_SHA256_MISMATCH"));

  const emptyReceiptRef = writeJson(fixture.root, "receipts/api-empty.json", {});
  fixture.input.gates.api_artifact_deployment.receipt_ref = emptyReceiptRef;
  writeJson(fixture.root, "input.json", fixture.input);
  const semanticReport = validateFixture(fixture);
  assert.ok(semanticReport.findings.some((finding) => finding.code === "RECEIPT_REQUIRED_FIELDS_MISSING"));
  assert.ok(semanticReport.findings.some((finding) => finding.code === "TRUST_SIGNATURE_REQUIRED"));
});

test("tenant provisioning alone cannot pass the single-tenant runtime boundary", () => {
  const fixture = makeCompleteFixture();
  fixture.input.gates.tenant_provisioning.runtime_binding_receipt_ref = null;
  writeJson(fixture.root, "input.json", fixture.input);
  const report = validateFixture(fixture);
  assert.equal(report.verdict, "FAIL");
  assert.ok(report.findings.some((finding) => finding.code === "TENANT_RUNTIME_BINDING_REQUIRED"));
  const tenantGate = report.gates.find((gate) => gate.gate_id === "tenant_provisioning");
  assert.equal(tenantGate.slots.find((slot) => slot.slot === "provisioning").state, "verified");
  assert.equal(tenantGate.slots.find((slot) => slot.slot === "runtime_binding").state, "pending_external");
  assert.equal(report.boundary.provisioning_receipt_alone_passes_runtime, false);
});

test("separately reviewed multi-tenant runtime receipt is the explicit alternative", () => {
  const fixture = makeCompleteFixture();
  const multiTenantReceipt = receiptBase({ receipt_type: "multi_tenant_runtime_review", receipt_source: "independent_runtime_review", pilot_id: fixture.pilotId, lawos_tenant_id: fixture.lawosTenantId, entra_tenant_id: fixture.entraTenantId, source_sha: fixture.sourceSha, source_tree: fixture.sourceTree, version: fixture.version, verdict: "APPROVED", operation: "tenant_runtime_binding" });
  multiTenantReceipt.runtime = {
    binding_mode: "multi_tenant",
    review_status: "APPROVED",
    issuer_validation_strategy: "per_request_tenant_and_issuer_validation",
    isolation_negative_tests: "PASS",
    independent_review_ref: "review:runtime-isolation:001",
    reviewed_by: "security-reviewer-001",
    reviewed_at: "2026-08-12T01:20:00Z",
  };
  fixture.refs.runtime = writeSignedJson(fixture.root, "receipts/runtime-multi.json", multiTenantReceipt, fixture.keyPair);
  fixture.input.gates.tenant_provisioning.runtime_binding_receipt_ref = fixture.refs.runtime;
  writeJson(fixture.root, "input.json", fixture.input);
  const report = validateFixture(fixture);
  assert.equal(report.verdict, "PASS");
  assert.equal(report.gates.find((gate) => gate.gate_id === "tenant_provisioning").state, "verified");
});

test("M365 positive and negative visibility are both required", () => {
  const fixture = makeCompleteFixture();
  fixture.m365Receipt.visibility.negative.status = "VISIBLE";
  fixture.refs.m365 = writeSignedJson(fixture.root, "receipts/m365-drift.json", fixture.m365Receipt, fixture.keyPair);
  fixture.input.gates.m365_consent_deployment_visibility.receipt_ref = fixture.refs.m365;
  writeJson(fixture.root, "input.json", fixture.input);
  const report = validateFixture(fixture);
  assert.equal(report.verdict, "FAIL");
  assert.ok(report.findings.some((finding) => finding.code === "M365_NEGATIVE_VISIBILITY_STATUS"));
});

test("LawOS/Entra namespace swap and omission fail closed without legacy fallback", () => {
  const swapped = makeCompleteFixture();
  swapped.input.pilot.lawos_tenant_id = swapped.entraTenantId;
  swapped.input.pilot.entra_tenant_id = swapped.lawosTenantId;
  writeJson(swapped.root, "input.json", swapped.input);
  const swapReport = validateFixture(swapped);
  assert.equal(swapReport.verdict, "FAIL");
  assert.ok(swapReport.findings.some((finding) => finding.code === "NAMED_PILOT_FIELD_INVALID"));

  const omitted = makeCompleteFixture();
  delete omitted.input.pilot.entra_tenant_id;
  writeJson(omitted.root, "input.json", omitted.input);
  const omissionReport = validateFixture(omitted);
  assert.equal(omissionReport.verdict, "FAIL");
  assert.ok(omissionReport.findings.some((finding) => finding.code === "NAMED_PILOT_FIELD_INVALID"));

  const mixedReceipt = makeCompleteFixture();
  mixedReceipt.m365Receipt.lawos_tenant_id = mixedReceipt.lawosTenantId;
  delete mixedReceipt.m365Receipt.entra_tenant_id;
  mixedReceipt.refs.m365 = writeSignedJson(mixedReceipt.root, "receipts/m365-mixed.json", mixedReceipt.m365Receipt, mixedReceipt.keyPair);
  mixedReceipt.input.gates.m365_consent_deployment_visibility.receipt_ref = mixedReceipt.refs.m365;
  writeJson(mixedReceipt.root, "input.json", mixedReceipt.input);
  const mixedReport = validateFixture(mixedReceipt);
  assert.equal(mixedReport.verdict, "FAIL");
  assert.ok(mixedReport.findings.some((finding) => finding.code === "TENANT_ID_NAMESPACE_INVALID"));
});

test("receipt trust root rejects forged source/verdict, changed signature/public key, untrusted key, and scope mismatch", () => {
  const forged = makeCompleteFixture();
  const forgedApi = { ...forged.input.gates.api_artifact_deployment.receipt_ref };
  const forgedReceipt = {
    ...JSON.parse(readFileSync(path.join(forged.root, forgedApi.path), "utf8")),
    receipt_source: "operations_owner",
    verdict: "APPROVED",
  };
  forged.input.gates.api_artifact_deployment.receipt_ref = writeSignedJson(forged.root, "receipts/api-forged.json", forgedReceipt, forged.keyPair);
  writeJson(forged.root, "input.json", forged.input);
  const forgedReport = validateFixture(forged);
  assert.ok(forgedReport.findings.some((finding) => finding.code === "RECEIPT_SOURCE"));
  assert.ok(forgedReport.findings.some((finding) => finding.code === "RECEIPT_VERDICT_NOT_PASS"));

  const changedSignature = makeCompleteFixture();
  const changedSigBytes = Buffer.from("x".repeat(64));
  const changedSigRef = writeBytes(changedSignature.root, "receipts/api.json.sig", changedSigBytes);
  changedSignature.input.gates.api_artifact_deployment.receipt_ref.signature_ref = changedSigRef;
  writeJson(changedSignature.root, "input.json", changedSignature.input);
  const changedSignatureReport = validateFixture(changedSignature);
  assert.ok(changedSignatureReport.findings.some((finding) => finding.code.startsWith("TRUST_SIGNATURE") || finding.code === "TRUST_RECEIPT_HASH_MISMATCH"));

  const changedPublicKey = makeCompleteFixture();
  const otherKey = generateKeyPairSync("ed25519");
  const changedRegistry = JSON.parse(readFileSync(path.join(changedPublicKey.root, changedPublicKey.registryRef.path), "utf8"));
  changedRegistry.keys[0].public_key_spki_pem = otherKey.publicKey.export({ type: "spki", format: "pem" });
  changedPublicKey.registryRef = writeJson(changedPublicKey.root, "trust/registry-mutated.json", changedRegistry);
  const changedPublicKeyReport = validateFixture(changedPublicKey);
  assert.ok(changedPublicKeyReport.findings.some((finding) => finding.code.startsWith("TRUST_SIGNATURE") || finding.code === "TRUST_REGISTRY_HASH_MISMATCH"));

  const untrusted = makeCompleteFixture();
  const untrustedReceipt = { ...JSON.parse(readFileSync(path.join(untrusted.root, untrusted.refs.api.path), "utf8")), key_id: "untrusted-key" };
  untrusted.input.gates.api_artifact_deployment.receipt_ref = writeSignedJson(untrusted.root, "receipts/api-untrusted.json", untrustedReceipt, untrusted.keyPair);
  writeJson(untrusted.root, "input.json", untrusted.input);
  const untrustedReport = validateFixture(untrusted);
  assert.ok(untrustedReport.findings.some((finding) => finding.code === "TRUSTED_KEY_NOT_FOUND"));

  const scope = makeCompleteFixture();
  const scopeReceipt = { ...JSON.parse(readFileSync(path.join(scope.root, scope.refs.api.path), "utf8")), pilot_id: "pilot-other-firm-002" };
  scope.input.gates.api_artifact_deployment.receipt_ref = writeSignedJson(scope.root, "receipts/api-scope.json", scopeReceipt, scope.keyPair);
  writeJson(scope.root, "input.json", scope.input);
  const scopeReport = validateFixture(scope);
  assert.ok(scopeReport.findings.some((finding) => finding.code === "PILOT_ID_MISMATCH"));
  assert.ok(scopeReport.findings.some((finding) => finding.code === "TRUST_RECEIPT_SCOPE_MISMATCH"));

  const keyScope = makeCompleteFixture();
  const keyScopeRegistry = JSON.parse(readFileSync(path.join(keyScope.root, keyScope.registryRef.path), "utf8"));
  keyScopeRegistry.keys[0].allowed_pilot_ids = ["pilot-other-firm-002"];
  keyScope.registryRef = writeJson(keyScope.root, "trust/registry-scope.json", keyScopeRegistry);
  const keyScopeReport = validateFixture(keyScope);
  assert.ok(keyScopeReport.findings.some((finding) => finding.code === "TRUSTED_KEY_SCOPE_MISMATCH"));

  const sourceScope = makeCompleteFixture();
  const sourceScopeRegistry = JSON.parse(readFileSync(path.join(sourceScope.root, sourceScope.registryRef.path), "utf8"));
  sourceScopeRegistry.keys[0].allowed_source_trees = ["f".repeat(40)];
  sourceScope.registryRef = writeJson(sourceScope.root, "trust/registry-source-scope.json", sourceScopeRegistry);
  const sourceScopeReport = validateFixture(sourceScope);
  assert.ok(sourceScopeReport.findings.some((finding) => finding.code === "TRUSTED_KEY_SCOPE_MISMATCH"));

  const missingRegistry = makeCompleteFixture();
  const missingRegistryReport = validateExternalReleaseReadiness({ rootDir: missingRegistry.root, inputPath: missingRegistry.inputRef.path, contractPath: "contracts/external-release-readiness-contract.json" });
  assert.ok(missingRegistryReport.findings.some((finding) => finding.code === "TRUST_ROOT_NOT_CONFIGURED"));
});

test("receipt trust timestamps reject impossible calendar dates", () => {
  const fixture = makeCompleteFixture();
  const api = JSON.parse(readFileSync(path.join(fixture.root, fixture.refs.api.path), "utf8"));
  api.issued_at = "2026-02-30T01:30:00Z";
  fixture.input.gates.api_artifact_deployment.receipt_ref = writeSignedJson(fixture.root, "receipts/api-impossible-date.json", api, fixture.keyPair);
  writeJson(fixture.root, "input.json", fixture.input);
  const report = validateFixture(fixture);
  assert.ok(report.findings.some((finding) => finding.code === "TRUST_TIMESTAMP_INVALID"));
});

test("signed receipt replay cannot cross the exact LawOS tenant namespace", () => {
  const fixture = makeCompleteFixture();
  const replayReceipt = JSON.parse(readFileSync(path.join(fixture.root, fixture.refs.api.path), "utf8"));
  replayReceipt.lawos_tenant_id = "lawos-other-002";
  const replayRegistry = JSON.parse(readFileSync(path.join(fixture.root, fixture.registryRef.path), "utf8"));
  replayRegistry.keys[0].allowed_lawos_tenant_ids.push("lawos-other-002");
  fixture.registryRef = writeJson(fixture.root, "trust/registry-replay-scope.json", replayRegistry);
  fixture.input.gates.api_artifact_deployment.receipt_ref = writeSignedJson(fixture.root, "receipts/api-cross-tenant-replay.json", replayReceipt, fixture.keyPair);
  writeJson(fixture.root, "input.json", fixture.input);
  const report = validateFixture(fixture);
  assert.equal(report.verdict, "FAIL");
  assert.ok(report.findings.some((finding) => finding.code === "TRUST_RECEIPT_TENANT_SCOPE_MISMATCH"));
});

test("detached receipt expiry rejects the exact now boundary", () => {
  const fixture = makeCompleteFixture();
  const now = Date.parse("2026-08-12T02:00:00Z");
  const receipt = JSON.parse(readFileSync(path.join(fixture.root, fixture.refs.api.path), "utf8"));
  receipt.expires_at = "2026-08-12T02:00:00Z";
  const receiptRef = writeSignedJson(fixture.root, "receipts/api-expiry-equality.json", receipt, fixture.keyPair);
  const registry = verifyTrustedRegistry({ rootDir: fixture.root, registryPath: fixture.registryRef.path, registrySha256: fixture.registryRef.sha256, now });
  const receiptBytes = readFileSync(path.join(fixture.root, receiptRef.path));
  assert.throws(() => verifyDetachedReceipt({
    rootDir: fixture.root,
    receiptRef,
    receiptBytes,
    receipt,
    registry,
    expectedReceiptType: "api_artifact_deployment",
    expectedReceiptSource: "release_pipeline",
    expectedPilotId: fixture.pilotId,
    expectedLawosTenantId: fixture.lawosTenantId,
    expectedEntraTenantId: fixture.entraTenantId,
    expectedSourceSha: fixture.sourceSha,
    expectedSourceTree: fixture.sourceTree,
    expectedVersion: fixture.version,
    expectedRole: "release_pipeline",
    expectedOperation: "api_artifact_deployment",
    expectedArtifactSha256: receipt.artifact_sha256,
    expectedBindingSha256: receipt.binding_sha256,
    now,
  }), (error) => error?.code === "TRUST_RECEIPT_TIME_INVALID");
});

test("trusted registry generated_at cannot be in the future", () => {
  const fixture = makeCompleteFixture();
  const futureRegistry = JSON.parse(readFileSync(path.join(fixture.root, fixture.registryRef.path), "utf8"));
  futureRegistry.generated_at = "2026-08-13T00:00:00Z";
  const futureRegistryRef = writeJson(fixture.root, "trust/registry-future-generated.json", futureRegistry);
  assert.throws(() => verifyTrustedRegistry({
    rootDir: fixture.root,
    registryPath: futureRegistryRef.path,
    registrySha256: futureRegistryRef.sha256,
    now: Date.parse("2026-08-12T23:59:59Z"),
  }), (error) => error?.code === "TRUST_REGISTRY_TIME_INVALID");
});

test("normal production validation rejects a caller-minted registry even when legacy options are supplied", () => {
  const fixture = makeCompleteFixture();
  const report = validateExternalReleaseReadiness({
    rootDir: fixture.root,
    inputPath: fixture.inputRef.path,
    trustRegistryPath: fixture.registryRef.path,
    trustRegistrySha256: fixture.registryRef.sha256,
  });
  assert.equal(report.verdict, "FAIL");
  assert.ok(report.findings.some((finding) => finding.code === "TRUST_ROOT_NOT_CONFIGURED"));
  assert.equal(report.boundary.trusted_receipt_registry_supplied, false);
  assert.throws(() => main(["--root", fixture.root, "--input", fixture.inputRef.path, "--trust-registry", fixture.registryRef.path, "--trust-registry-sha256", fixture.registryRef.sha256]), /unknown argument/);
});

test("canonical contract hash rejects an empty or drifted caller contract", () => {
  const fixture = makeCompleteFixture();
  writeFileSync(path.join(fixture.root, "contracts/external-release-readiness-contract.json"), Buffer.from("{}\n"));
  const report = validateFixture(fixture);
  assert.equal(report.verdict, "FAIL");
  assert.ok(report.findings.some((finding) => finding.code === "CANONICAL_CONTRACT_HASH_MISMATCH"));
  assert.ok(report.findings.some((finding) => finding.code === "CONTRACT_SHAPE_INVALID"));
});

test("ancestor symlink receipt paths fail closed", () => {
  const fixture = makeCompleteFixture();
  symlinkSync(path.join(fixture.root, "receipts"), path.join(fixture.root, "linked-receipts"));
  fixture.input.gates.api_artifact_deployment.receipt_ref = {
    ...fixture.refs.api,
    path: "linked-receipts/api.json",
    signature_ref: { ...fixture.refs.api.signature_ref, path: "linked-receipts/api.json.sig" },
  };
  writeJson(fixture.root, "input.json", fixture.input);
  const report = validateFixture(fixture);
  assert.equal(report.verdict, "FAIL");
  assert.ok(report.findings.some((finding) => finding.code === "FILE_REFERENCE_SYMLINK"));
});

test("nested deployment timestamps and authority receipt bindings are strict", () => {
  const timestampFixture = makeCompleteFixture();
  const api = JSON.parse(readFileSync(path.join(timestampFixture.root, timestampFixture.refs.api.path), "utf8"));
  api.deployment.deployed_at = "2026-02-30T01:00:00Z";
  timestampFixture.input.gates.api_artifact_deployment.receipt_ref = writeSignedJson(timestampFixture.root, "receipts/api-impossible-deployment-date.json", api, timestampFixture.keyPair);
  writeJson(timestampFixture.root, "input.json", timestampFixture.input);
  const timestampReport = validateFixture(timestampFixture);
  assert.ok(timestampReport.findings.some((finding) => finding.code === "DEPLOYMENT_TIMESTAMP_INVALID"));

  const missingFixture = makeCompleteFixture();
  const operations = JSON.parse(readFileSync(path.join(missingFixture.root, missingFixture.refs.operations.path), "utf8"));
  delete operations.source_tree;
  delete operations.entra_tenant_id;
  missingFixture.input.gates.operations_support_rollback.receipt_ref = writeSignedJson(missingFixture.root, "receipts/operations-missing-bindings.json", operations, missingFixture.keyPair);
  writeJson(missingFixture.root, "input.json", missingFixture.input);
  const missingReport = validateFixture(missingFixture);
  assert.ok(missingReport.findings.some((finding) => finding.code === "RECEIPT_REQUIRED_FIELDS_MISSING"));
  assert.ok(missingReport.findings.some((finding) => finding.code === "TENANT_ID_NAMESPACE_INVALID"));
});

test("provisioning adapter reconciles internal manifest digest and bytes", () => {
  const fixture = makeCompleteFixture();
  const internal = JSON.parse(readFileSync(path.join(fixture.root, "receipts/internal-provisioning.json"), "utf8"));
  internal.manifest_ref = `manifest_sha256:${"f".repeat(64)}`;
  const internalRef = writeJson(fixture.root, "receipts/internal-provisioning-mismatch.json", internal);
  const provisioning = JSON.parse(readFileSync(path.join(fixture.root, fixture.refs.provisioning.path), "utf8"));
  provisioning.internal_receipt_ref = internalRef;
  fixture.input.gates.tenant_provisioning.provisioning_receipt_ref = writeSignedJson(fixture.root, "receipts/provisioning-manifest-mismatch.json", provisioning, fixture.keyPair);
  writeJson(fixture.root, "input.json", fixture.input);
  const report = validateFixture(fixture);
  assert.equal(report.verdict, "FAIL");
  assert.ok(report.findings.some((finding) => finding.code === "INTERNAL_PROVISIONING_MANIFEST_REF_MISMATCH"));
});

test("validator reports are atomically rewritten with private mode", () => {
  const fixture = makeCompleteFixture();
  mkdirSync(path.join(fixture.root, "reports"), { recursive: true });
  const reportPath = path.join(fixture.root, "reports/readiness.json");
  const markdownPath = path.join(fixture.root, "reports/readiness.md");
  writeFileSync(reportPath, "old\n");
  writeFileSync(markdownPath, "old\n");
  chmodSync(reportPath, 0o644);
  chmodSync(markdownPath, 0o644);
  const exitCode = main(["--root", fixture.root, "--input", fixture.inputRef.path, "--report", "reports/readiness.json", "--report-md", "reports/readiness.md"]);
  assert.equal(exitCode, 1);
  assert.equal(statSync(reportPath).mode & 0o777, 0o600);
  assert.equal(statSync(markdownPath).mode & 0o777, 0o600);
});

test("CLI rejects a symlink --root before creating any report target", () => {
  const fixture = makeCompleteFixture();
  const rootLink = path.join(fixture.root, "root-link");
  symlinkSync(fixture.root, rootLink);
  const reportDirectory = path.join(fixture.root, "reports-never-created");
  const reportPath = "reports-never-created/readiness.json";
  assert.throws(() => execFileSync(process.execPath, [
    path.join(repoRoot, "scripts/validate-external-release-readiness.mjs"),
    "--root",
    rootLink,
    "--input",
    fixture.inputRef.path,
    "--report",
    reportPath,
  ], { cwd: repoRoot, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }), (error) => error.status !== 0);
  assert.equal(existsSync(reportDirectory), false);
});

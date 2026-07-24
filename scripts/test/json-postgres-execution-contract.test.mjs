import { generateKeyPairSync, sign } from "node:crypto";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";
import test from "node:test";
import { canonicalizeJson, sha256Hex } from "../lib/runtime-safety-approval-contract.mjs";
import {
  JSON_POSTGRES_EXECUTION_MODES,
  JSON_POSTGRES_EXECUTION_PACKET_VERSION,
  JSON_POSTGRES_W12_AUTHORIZED_STAGES,
  JSON_POSTGRES_W13_W14_AUTHORIZED_STAGES,
  JSON_POSTGRES_W15_AUTHORIZED_STAGES,
  createJsonPostgresExecutionPacket,
  validateJsonPostgresExecutionPacket,
  verifyJsonPostgresExecutionApproval,
  verifyJsonPostgresExecutionApprovalPayload,
} from "../lib/json-postgres-execution-contract.mjs";
import {
  JSON_POSTGRES_INVENTORY_DELTA_POLICY_SHA256,
} from "../../packages/persistence/src/postgres/source-authority-manifest.js";

const SOURCE_SHA = "a".repeat(40);
const SOURCE_TREE = "b".repeat(40);
const DIGEST = "c".repeat(64);

function packet(phase = "w12-real-data-rehearsal") {
  const production = phase === "w13-production-cutover";
  const projection = phase === "w15-relational-projection";
  return {
    schema_version: JSON_POSTGRES_EXECUTION_PACKET_VERSION,
    packet_id: projection ? "lawos-w15-packet-001" : production ? "lawos-w13-packet-001" : "lawos-w12-packet-001",
    source_sha: SOURCE_SHA,
    source_tree: SOURCE_TREE,
    phase,
    action: projection ? "lawos-json-postgres-relational-projection"
      : production ? "lawos-json-postgres-production-cutover" : "lawos-json-postgres-real-data-rehearsal",
    environment: projection ? "lawos-production-projection" : production ? "lawos-production" : "lawos-private-rehearsal",
    data_scope: "approved-real-manifest",
    contact_scope: projection ? [] : production ? ["individual-active-user-request-only"] : ["non-delivery-sink"],
    bindings: Object.fromEntries([
      "artifact_sha256",
      "artifact_manifest_sha256",
      "lockfile_sha256",
      "migration_catalog_sha256",
      "record_type_catalog_sha256",
      "record_authority_sha256",
      "field_crosswalk_sha256",
      "authority_manifest_sha256",
      "authority_bundle_sha256",
      "migration_manifest_sha256",
      "dms_object_manifest_sha256",
      "inventory_content_sha256",
      "inventory_delta_policy_sha256",
      "transform_sha256",
      "infrastructure_template_sha256",
      "dms_provider_contract_sha256",
      "backup_retention_contract_sha256",
      "performance_acceptance_sha256",
      "post_write_runbook_sha256",
      "w12_terminal_receipt_sha256",
      "cut012_terminal_receipt_sha256",
      "go_live_receipt_sha256",
    ].map((key) => {
      if (key === "inventory_delta_policy_sha256") {
        return [key, JSON_POSTGRES_INVENTORY_DELTA_POLICY_SHA256];
      }
      if (projection) return [key, DIGEST];
      if (production) {
        return [key, ["cut012_terminal_receipt_sha256", "go_live_receipt_sha256"].includes(key)
          ? "0".repeat(64)
          : DIGEST];
      }
      return [key, ["w12_terminal_receipt_sha256", "cut012_terminal_receipt_sha256", "go_live_receipt_sha256"].includes(key)
        ? "0".repeat(64)
        : DIGEST];
    })),
    target: {
      target_ref: projection ? "lawos-production-projection" : production ? "lawos-production" : "lawos-private-rehearsal",
      aws_account: "770880870480",
      aws_region: "ap-northeast-2",
      artifact_bucket_ref: production || projection ? "bucket:lawos-prod-artifacts" : "bucket:lawos-rehearsal-artifacts",
      artifact_bucket_name: production || projection ? "lawos-prod-artifacts-770880870480" : "lawos-rehearsal-artifacts-770880870480",
      artifact_expected_bucket_owner: "770880870480",
      artifact_kms_key_ref: production || projection ? "alias/lawos-prod-artifacts" : "alias/lawos-rehearsal-artifacts",
      artifact_object_lock_enabled: true,
      artifact_versioning_enabled: true,
      artifact_public_access_blocked: true,
      database_secret_ref: production || projection ? "secret:lawos-prod-db" : "secret:lawos-rehearsal-db",
      tenant_context_secret_ref: production || projection ? "secret:lawos-prod-tenant-context" : "secret:lawos-rehearsal-tenant-context",
      dms_bucket_ref: production || projection ? "bucket:lawos-prod-dms" : "bucket:lawos-rehearsal-dms",
      dms_bucket_name: production || projection ? "lawos-prod-dms-770880870480" : "lawos-rehearsal-dms-770880870480",
      dms_prefix: "approved-real-migration",
      dms_kms_key_ref: production || projection ? "alias/lawos-prod-dms" : "alias/lawos-rehearsal-dms",
      dms_expected_bucket_owner: "770880870480",
      dms_default_retention_days: 365,
      dms_object_lock_enabled: true,
      dms_versioning_enabled: true,
      dms_public_access_blocked: true,
      program_input_bucket_ref: production || projection ? "bucket:lawos-prod-program-input" : "bucket:lawos-rehearsal-program-input",
      program_input_bucket_name: production || projection
        ? "lawos-prod-program-input-770880870480"
        : "lawos-rehearsal-program-input-770880870480",
      program_input_expected_bucket_owner: "770880870480",
      program_input_kms_key_ref: production || projection ? "alias/lawos-prod-program-input" : "alias/lawos-rehearsal-program-input",
      program_input_object_lock_enabled: true,
      program_input_versioning_enabled: true,
      program_input_public_access_blocked: true,
      approved_tenant_ids: ["tenant_amic"],
      backup_target_ref: production || projection ? "backup:lawos-prod" : "backup:lawos-rehearsal",
      isolated: !(production || projection),
      production: production || projection,
      public_access: false,
      tls_mode: "verify-full",
      monthly_cost_ceiling_krw: 300000,
    },
    operators: projection
      ? ["matter-prod-deploy-admin", "matter-readonly-auditor"]
      : production
      ? ["matter-prod-deploy-admin", "matter-cutover-operator", "matter-readonly-auditor"]
      : ["matter-staging-admin", "matter-readonly-auditor"],
    allowed_modes: [...JSON_POSTGRES_EXECUTION_MODES],
    authorized_stages: [...(projection
      ? JSON_POSTGRES_W15_AUTHORIZED_STAGES
      : production ? JSON_POSTGRES_W13_W14_AUTHORIZED_STAGES : JSON_POSTGRES_W12_AUTHORIZED_STAGES)],
    requirements: ["Exact signed inventory and target bindings are required."],
    stop_conditions: ["Stop on any binding or safety drift."],
    current_state: "PENDING_HUMAN_APPROVAL",
    external_actions_authorized: false,
    claims: {
      real_data_read: false,
      real_data_mutated: false,
      production_contacted: false,
      production_write: false,
      json_authority_disabled: false,
      release: false,
      go_live: false,
    },
  };
}

function signedApproval(value) {
  const root = mkdtempSync(join(tmpdir(), "lawos-json-postgres-execution-approval-"));
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const validated = validateJsonPostgresExecutionPacket(value, { sourceSha: SOURCE_SHA, sourceTree: SOURCE_TREE });
  const registry = {
    schema_version: "law-firm-os.runtime-safety.approval-trust-registry.v1",
    generated_at: "2026-07-23T00:00:00.000Z",
    keys: [{
      key_id: "owner-key-1",
      algorithm: "Ed25519",
      public_key_spki_pem: publicKey.export({ type: "spki", format: "pem" }),
      roles: ["owner"],
      actions: [validated.action],
      environments: [validated.environment],
      valid_from: "2026-07-23T00:00:00.000Z",
      valid_until: "2026-07-30T00:00:00.000Z",
      revoked_at: null,
    }],
  };
  const receipt = {
    schema_version: "law-firm-os.runtime-safety.approval.v1",
    approval_id: "lawos-json-postgres-approval-001",
    key_id: "owner-key-1",
    role: "owner",
    decision: "approved",
    packet_sha256: validated.packet_sha256,
    source_sha: SOURCE_SHA,
    source_tree: SOURCE_TREE,
    action: validated.action,
    environment: validated.environment,
    signed_at: "2026-07-23T01:00:00.000Z",
    expires_at: "2026-07-29T00:00:00.000Z",
    data_scope: [
      "approved-real-manifest",
      `authority-manifest:${value.bindings.authority_manifest_sha256}`,
      `inventory:${value.bindings.inventory_content_sha256}`,
      `inventory-delta-policy:${value.bindings.inventory_delta_policy_sha256}`,
    ],
    contact_scope: value.contact_scope,
  };
  const registryBytes = JSON.stringify(registry);
  const registryPath = join(root, "registry.json");
  const receiptPath = join(root, "approval.json");
  const receiptBytes = JSON.stringify(receipt);
  const signatureBytes = sign(null, Buffer.from(canonicalizeJson(receipt)), privateKey);
  writeFileSync(registryPath, registryBytes);
  writeFileSync(receiptPath, receiptBytes);
  writeFileSync(`${receiptPath}.sig`, signatureBytes);
  return {
    registryPath,
    receiptPath,
    registryBytes,
    receiptBytes,
    signatureBytes,
    registrySha256: sha256Hex(registryBytes),
  };
}

test("execution packet closes W12 and W13 source, scope, target, cost and claim bindings", () => {
  assert.equal(validateJsonPostgresExecutionPacket(packet()).valid, true);
  assert.equal(validateJsonPostgresExecutionPacket(packet("w13-production-cutover")).valid, true);
  assert.equal(validateJsonPostgresExecutionPacket(packet("w15-relational-projection")).valid, true);
  for (const mutate of [
    (value) => { value.target.public_access = true; },
    (value) => { value.target.tls_mode = "disable"; },
    (value) => { value.target.monthly_cost_ceiling_krw = 300001; },
    (value) => { value.target.approved_tenant_ids = ["tenant_lawos_staging_cut005_a"]; },
    (value) => { value.target.program_input_object_lock_enabled = false; },
    (value) => { value.bindings.authority_manifest_sha256 = "bad"; },
    (value) => { value.bindings.authority_manifest_sha256 = "0".repeat(64); },
    (value) => { value.bindings.inventory_delta_policy_sha256 = DIGEST; },
    (value) => { value.operators = ["matter-prod-deploy-admin"]; },
    (value) => { value.claims.production_write = true; },
    (value) => { value.extra = true; },
  ]) {
    const value = packet("w13-production-cutover");
    mutate(value);
    assert.throws(() => validateJsonPostgresExecutionPacket(value));
  }
});

test("execution packet builder emits the complete pending non-authorizing phase contract", () => {
  const source = packet("w13-production-cutover");
  const built = createJsonPostgresExecutionPacket({
    packetId: source.packet_id,
    sourceSha: source.source_sha,
    sourceTree: source.source_tree,
    phase: source.phase,
    bindings: source.bindings,
    target: source.target,
  });
  assert.equal(built.packet_sha256, validateJsonPostgresExecutionPacket(built.packet).packet_sha256);
  assert.equal(built.packet.current_state, "PENDING_HUMAN_APPROVAL");
  assert.equal(built.packet.external_actions_authorized, false);
  assert.equal(built.packet.authorized_stages.at(0), "cut-008");
  assert.ok(built.packet.requirements.length >= 4);
  assert.ok(built.packet.stop_conditions.some((item) => item.includes("KRW 300,000")));
});

test("execution approval verifies detached Ed25519 signature and exact packet scopes", () => {
  const value = packet();
  const signed = signedApproval(value);
  const verified = verifyJsonPostgresExecutionApproval({
    packet: value,
    sourceSha: SOURCE_SHA,
    sourceTree: SOURCE_TREE,
    trustRegistryPath: signed.registryPath,
    trustRegistrySha256: signed.registrySha256,
    approvalReceiptPath: signed.receiptPath,
    now: Date.parse("2026-07-24T00:00:00.000Z"),
  });
  assert.equal(verified.valid, true);
  assert.equal(verified.decision, "approved");
  const payloadVerified = verifyJsonPostgresExecutionApprovalPayload({
    packet: value,
    sourceSha: SOURCE_SHA,
    sourceTree: SOURCE_TREE,
    trustRegistryBytes: signed.registryBytes,
    trustRegistrySha256: signed.registrySha256,
    approvalReceiptBytes: signed.receiptBytes,
    approvalSignatureBytes: signed.signatureBytes,
    now: Date.parse("2026-07-24T00:00:00.000Z"),
  });
  assert.equal(payloadVerified.packet_sha256, verified.packet_sha256);

  value.bindings.inventory_content_sha256 = "d".repeat(64);
  assert.throws(() => verifyJsonPostgresExecutionApproval({
    packet: value,
    sourceSha: SOURCE_SHA,
    sourceTree: SOURCE_TREE,
    trustRegistryPath: signed.registryPath,
    trustRegistrySha256: signed.registrySha256,
    approvalReceiptPath: signed.receiptPath,
    now: Date.parse("2026-07-24T00:00:00.000Z"),
  }));
});

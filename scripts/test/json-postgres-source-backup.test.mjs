import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  compileJsonPostgresMigrationCorpus,
  createJsonPostgresSourceTransformPlan,
} from "../../apps/api/src/json-postgres-source-transform.js";
import {
  createJsonPostgresAdjudicationRecommendations,
  createJsonPostgresRecordAuthority,
} from "../../packages/persistence/src/postgres/source-adjudication.js";
import {
  JSON_POSTGRES_EXECUTION_REQUIRED_BINDINGS,
  createJsonPostgresExecutionPacket,
} from "../../packages/persistence/src/postgres/execution-contract.js";
import { inventoryJsonPostgresSources } from "../../packages/persistence/src/postgres/source-inventory.js";
import {
  createJsonPostgresSourceLocatorManifest,
} from "../../packages/persistence/src/postgres/source-locator-manifest.js";
import {
  JSON_POSTGRES_INVENTORY_DELTA_POLICY_SHA256,
} from "../../packages/persistence/src/postgres/source-authority-manifest.js";
import {
  executeJsonPostgresSourceBackup,
} from "../lib/json-postgres-source-backup.mjs";

const ACCOUNT = "770880870480";
const TENANT = "tenant_backup_fixture";
const KMS_ARN = "arn:aws:kms:ap-northeast-2:770880870480:key/00000000-0000-0000-0000-000000000000";

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), "lawos-source-backup-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(join(root, "registration-seed.json"), JSON.stringify({
    users: [{
      user_id: "user_001",
      email: "person@example.test",
      status: "active",
      tenant_memberships: [{ tenant_id: TENANT, status: "active" }],
    }],
  }));
  await writeFile(join(root, "member-roster.json"), JSON.stringify({
    members: [{
      user_id: "user_001",
      employee_id: "employee_001",
      display_name: "Person",
      work_email: "person@example.test",
      employment_type: "full_time",
      status: "active",
    }],
  }));
  const locators = [];
  const inventory = await inventoryJsonPostgresSources({
    roots: [{ ref: "runtime-primary", path: root }],
    onSourceLocator: async (locator) => locators.push(locator),
    clock: () => new Date("2026-07-23T00:00:00.000Z"),
  });
  const locatorManifest = createJsonPostgresSourceLocatorManifest({ inventory, locators });
  const recommendations =
    createJsonPostgresAdjudicationRecommendations({
      inventory,
      approvedInventoryContentSha256:
        inventory.inventory_content_sha256,
    });
  const recordAuthority = createJsonPostgresRecordAuthority({
    inventory,
    recommendations,
    decisionSetRef: "backup-fixture",
    ownerDecisionRef: "backup-fixture-owner",
    sourceSha: "a".repeat(40),
    sourceTree: "b".repeat(40),
    rootPriority: ["runtime-primary"],
  });
  const transformPlan = createJsonPostgresSourceTransformPlan({
    inventory,
    locatorManifest,
    transformSetRef: "backup-fixture",
    tenantId: TENANT,
    approvedRootRefs: ["runtime-primary"],
    recordAuthority,
    decisions: recordAuthority.sources.map((source) => ({
      ...source,
      transform: source.classification === "authoritative" ? {
        kind: source.source_family === "member-roster"
          ? "identity-roster"
          : "identity-registration",
        domain_id: null,
      } : null,
    })),
  });
  const compiled = await compileJsonPostgresMigrationCorpus({
    inventory,
    locatorManifest,
    transformPlan,
  });
  const bindings = Object.fromEntries(JSON_POSTGRES_EXECUTION_REQUIRED_BINDINGS.map((key) => [
    key,
    key === "inventory_content_sha256" ? inventory.inventory_content_sha256
      : key === "inventory_delta_policy_sha256" ? JSON_POSTGRES_INVENTORY_DELTA_POLICY_SHA256
      : key === "transform_sha256" ? compiled.result.result_sha256
        : key === "migration_manifest_sha256" ? compiled.corpus.manifest_sha256
          : key === "w12_terminal_receipt_sha256" ? "1".repeat(64)
            : ["cut012_terminal_receipt_sha256", "go_live_receipt_sha256"].includes(key)
              ? "0".repeat(64)
              : "2".repeat(64),
  ]));
  const packet = createJsonPostgresExecutionPacket({
    packetId: "backup-fixture",
    sourceSha: "a".repeat(40),
    sourceTree: "b".repeat(40),
    phase: "w13-production-cutover",
    bindings,
    target: {
      target_ref: "lawos-production",
      aws_account: ACCOUNT,
      aws_region: "ap-northeast-2",
      artifact_bucket_ref: "bucket:artifacts",
      artifact_bucket_name: "lawos-prod-artifacts-770880870480",
      artifact_expected_bucket_owner: ACCOUNT,
      artifact_kms_key_ref: "alias/lawos-artifacts",
      artifact_object_lock_enabled: true,
      artifact_versioning_enabled: true,
      artifact_public_access_blocked: true,
      database_secret_ref: "secret:lawos-db",
      tenant_context_secret_ref: "secret:tenant-context",
      dms_bucket_ref: "bucket:dms",
      dms_bucket_name: "lawos-prod-dms-770880870480",
      dms_prefix: "approved",
      dms_kms_key_ref: "alias/lawos-dms",
      dms_expected_bucket_owner: ACCOUNT,
      dms_default_retention_days: 365,
      dms_object_lock_enabled: true,
      dms_versioning_enabled: true,
      dms_public_access_blocked: true,
      program_input_bucket_ref: "bucket:program-input",
      program_input_bucket_name: "lawos-prod-input-770880870480",
      program_input_expected_bucket_owner: ACCOUNT,
      program_input_kms_key_ref: "alias/lawos-input",
      program_input_object_lock_enabled: true,
      program_input_versioning_enabled: true,
      program_input_public_access_blocked: true,
      approved_tenant_ids: [TENANT],
      backup_target_ref: "backup:program-input",
      isolated: false,
      production: true,
      public_access: false,
      tls_mode: "verify-full",
      monthly_cost_ceiling_krw: 300000,
    },
  }).packet;
  return { inventory, locatorManifest, transformPlan, transformResult: compiled.result, packet };
}

test("source freeze uploads and restores every exact source without mutating it", async (t) => {
  const value = await fixture(t);
  const retainUntil = "2027-07-23T00:00:00.000Z";
  const stored = new Map();
  const result = await executeJsonPostgresSourceBackup({
    ...value,
    retainUntil,
    kmsKeyArn: KMS_ARN,
    now: Date.parse("2026-07-23T00:00:00.000Z"),
    putObject: async ({ plan, source, bytes }) => {
      stored.set(source.object_key, Buffer.from(bytes));
      return {
        bucket: plan.bucket,
        key: source.object_key,
        version_id: `version-${source.source_ref}`,
        expected_bucket_owner: plan.expected_bucket_owner,
        server_side_encryption: "aws:kms",
        kms_key_arn: KMS_ARN,
        object_lock_mode: "COMPLIANCE",
        retain_until: retainUntil,
        content_sha256: source.sha256,
        byte_size: source.byte_size,
      };
    },
    getObject: async ({ plan, source, stored: object }) => ({
      ...object,
      bucket: plan.bucket,
      bytes: stored.get(source.object_key),
    }),
  });
  assert.equal(result.result.safe_counts.source_count, 2);
  assert.equal(result.result.safe_counts.uploaded_object_count, 2);
  assert.equal(result.result.safe_counts.restored_object_count, 2);
  assert.equal(result.result.safe_counts.source_mutation_count, 0);
  assert.equal(result.result.objects.every((object) => object.restore_verified), true);
  assert.equal(JSON.stringify(result).includes("person@example.test"), false);
});

test("source freeze fails closed on restore digest drift", async (t) => {
  const value = await fixture(t);
  await assert.rejects(executeJsonPostgresSourceBackup({
    ...value,
    retainUntil: "2027-07-23T00:00:00.000Z",
    kmsKeyArn: KMS_ARN,
    now: Date.parse("2026-07-23T00:00:00.000Z"),
    putObject: async ({ plan, source }) => ({
      bucket: plan.bucket,
      key: source.object_key,
      version_id: "version-1",
      expected_bucket_owner: plan.expected_bucket_owner,
      server_side_encryption: "aws:kms",
      kms_key_arn: KMS_ARN,
      object_lock_mode: "COMPLIANCE",
      retain_until: "2027-07-23T00:00:00.000Z",
      content_sha256: source.sha256,
      byte_size: source.byte_size,
    }),
    getObject: async ({ plan, source, stored }) => ({
      ...stored,
      bucket: plan.bucket,
      bytes: Buffer.from("drift"),
      content_sha256: source.sha256,
    }),
  }), /restore digest drifted/u);
});

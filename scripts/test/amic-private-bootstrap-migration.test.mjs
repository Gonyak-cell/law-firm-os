import assert from "node:assert/strict";
import {
  createHash,
  generateKeyPairSync,
  sign,
} from "node:crypto";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createLocalStorageAdapter } from "../../packages/dms/src/storage/local-storage-adapter.js";
import { createHrxMemberPhotoStorage } from "../../packages/hrx/src/member-photo-storage.js";
import { canonicalizeJson } from "../../packages/runtime-auth/src/runtime-safety-approval-contract.js";
import { createMigratedPostgresFixture } from "../../packages/persistence/test/helpers/disposable-postgres.js";
import { createDomainSnapshot, hashDomainValue } from "../../packages/persistence/src/domain-ledger.js";
import { createPostgresDomainLedger } from "../../packages/persistence/src/postgres/domain-ledger.js";
import {
  AMIC_BOOTSTRAP_ENRICHMENT_ACTION,
  enrichmentApprovalDataScope,
  executeAmicPrivateBootstrapEnrichment,
  planAmicPrivateBootstrapEnrichment,
} from "../lib/amic-private-bootstrap-enrichment.mjs";
import {
  createAmicPrivateBootstrapLegalEntityMappingTemplate,
} from "../lib/amic-private-bootstrap-inventory.mjs";
import {
  AMIC_PRIVATE_BOOTSTRAP_MIGRATION_DRY_RUN_VERSION,
  compileAmicPrivateBootstrapMigration,
  dryRunAmicPrivateBootstrapMigration,
} from "../lib/amic-private-bootstrap-migration.mjs";
import {
  AMIC_PRIVATE_BOOTSTRAP_EXECUTION_ACTION,
  AMIC_PRIVATE_BOOTSTRAP_EXECUTION_RESULT_VERSION,
  createAmicPrivateBootstrapExecutionPacket,
  executeAmicPrivateBootstrapMigration,
  validateAmicPrivateBootstrapExecutionPacket,
  validateAmicPrivateBootstrapExecutionPreflightBinding,
  validateAmicPrivateBootstrapProductionTarget,
  verifyAmicPrivateBootstrapExecutionApprovalPayload,
} from "../lib/amic-private-bootstrap-execution.mjs";
import {
  AMIC_PRIVATE_BOOTSTRAP_PACKET_INPUT_VERSION,
  createAmicPrivateBootstrapPhotoStorageAdapterId,
  validateAmicPrivateBootstrapPacketInputBinding,
} from "../lib/amic-private-bootstrap-production.mjs";

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function versionedPhotoStorage() {
  const base = createLocalStorageAdapter({
    adapter_id: "synthetic-versioned-member-photo",
  });
  const calls = { stage: 0, finalize: 0 };
  const withVersion = (receipt) => receipt && Object.freeze({
    ...receipt,
    version_id: `version-${receipt.sha256}`,
  });
  const storage = Object.freeze({
    ...base,
    provider: "synthetic-versioned",
    stageObject(input) {
      calls.stage += 1;
      return base.stageObject(input);
    },
    finalizeObject(input) {
      calls.finalize += 1;
      return withVersion(base.finalizeObject(input));
    },
    statObject(input) {
      return withVersion(base.statObject(input));
    },
  });
  return Object.freeze({
    calls,
    photos: createHrxMemberPhotoStorage({ storage }),
  });
}

function productionTarget(overrides = {}) {
  return {
    aws_account: "770880870480",
    aws_region: "ap-northeast-2",
    database_secret_ref: "lawos/production/postgres-url",
    tenant_context_secret_ref: "lawos/production/postgres-tenant-context",
    photo_bucket_name: "lawos-private-member-photos-prod",
    photo_expected_bucket_owner: "770880870480",
    photo_kms_key_arn:
      "arn:aws:kms:ap-northeast-2:770880870480:key/11111111-2222-3333-4444-555555555555",
    photo_prefix: "amic-private-bootstrap/member-photos",
    bucket_versioning_required: true,
    bucket_owner_enforced: true,
    public_access_block_required: true,
    server_side_encryption: "aws:kms",
    ...overrides,
  };
}

function approvedExecution(packet) {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const signedAt = "2026-09-03T00:00:00.000Z";
  const expiresAt = "2026-09-05T00:00:00.000Z";
  const keyId = "synthetic-private-bootstrap-owner";
  const registry = {
    schema_version: "law-firm-os.runtime-safety.approval-trust-registry.v1",
    generated_at: signedAt,
    keys: [{
      key_id: keyId,
      algorithm: "Ed25519",
      public_key_spki_pem: publicKey.export({ type: "spki", format: "pem" }),
      roles: ["owner"],
      actions: [AMIC_PRIVATE_BOOTSTRAP_EXECUTION_ACTION],
      environments: [packet.environment],
      valid_from: "2026-09-01T00:00:00.000Z",
      valid_until: "2026-09-10T00:00:00.000Z",
      revoked_at: null,
    }],
  };
  const receipt = {
    schema_version: "law-firm-os.runtime-safety.approval.v1",
    approval_id: "approval.synthetic.private-bootstrap.001",
    key_id: keyId,
    role: "owner",
    decision: "approved",
    packet_sha256: packet.packet_sha256,
    source_sha: packet.source_sha,
    source_tree: packet.source_tree,
    action: packet.action,
    environment: packet.environment,
    signed_at: signedAt,
    expires_at: expiresAt,
    data_scope: [
      "approved-real-manifest",
      `private-bootstrap-inventory:${packet.bindings.inventory_sha256}`,
      `private-bootstrap-mapping:${packet.bindings.mapping_sha256}`,
      `private-bootstrap-migration:${packet.bindings.migration_manifest_sha256}`,
      `private-bootstrap-catalog:${packet.bindings.record_type_catalog_sha256}`,
      `private-bootstrap-photos:${packet.bindings.photo_aggregate_sha256}`,
    ],
    contact_scope: [],
  };
  const registryBytes = Buffer.from(JSON.stringify(registry));
  const receiptBytes = Buffer.from(JSON.stringify(receipt));
  const signatureBytes = sign(
    null,
    Buffer.from(canonicalizeJson(receipt)),
    privateKey,
  );
  return verifyAmicPrivateBootstrapExecutionApprovalPayload({
    packet,
    trustRegistryBytes: registryBytes,
    trustRegistrySha256: sha256(registryBytes),
    approvalReceiptBytes: receiptBytes,
    approvalSignatureBytes: signatureBytes,
    now: Date.parse("2026-09-04T00:00:00.000Z"),
  });
}

async function fixture({
  accountOnlyDisposition = "quarantine",
  accountOnlyTenantId = "tenant-synthetic",
  linkedTenantId = "tenant-synthetic",
} = {}) {
  const root = await mkdtemp(join(tmpdir(), "amic-bootstrap-migration-"));
  await mkdir(join(root, "source"), { recursive: true });
  await mkdir(join(root, "photos"), { recursive: true });
  const registration = {
    schema_version: "law-firm-os.matter-vault-user-registration-seed.v0.1",
    tenant_id: "tenant-synthetic",
    users: [{
      user_id: "user-linked",
      email: "linked@example.test",
      status: "active",
      display_name: "Linked Person",
      local_dev: {
        synthetic_only: true,
        synthetic_token: "local-dev-only:linked@example.test",
      },
      tenant_memberships: [{
        tenant_id: linkedTenantId,
        status: "active",
        role_profile_id: "staff",
        role_ids: ["staff"],
        group_ids: ["legal"],
        scopes: ["matter.read"],
        hrx_scopes: ["hrx.self"],
      }],
    }, {
      user_id: "user-account-only",
      email: "pending@example.test",
      status: "active",
      display_name: "Pending Person",
      local_dev: {
        synthetic_only: true,
        synthetic_token: "local-dev-only:pending@example.test",
      },
      tenant_memberships: [{
        tenant_id: accountOnlyTenantId,
        status: "active",
        role_ids: ["staff"],
        group_ids: ["legal"],
        scopes: ["matter.read"],
        hrx_scopes: ["hrx.self"],
      }],
    }],
  };
  const roster = {
    schema_version: "law-firm-os.hrx-member-roster-source-of-truth.v0.1",
    tenant_id: "tenant-synthetic",
    created_at: "2026-09-03T00:00:00.000Z",
    members: [{
      user_id: "user-linked",
      employee_id: "employee-linked",
      display_name: "Linked Person",
      legal_name: "Linked Person",
      work_email: "linked@example.test",
      mobile_phone: "+82-10-0000-0000",
      title: "Attorney",
      employment_type: "full_time",
      status: "active",
      profile_status: "active",
      affiliation: "Synthetic Firm",
      department: "Legal",
      organization_group: "Synthetic Firm",
      org_unit_id: "org-legal",
      country: "대한민국",
      start_date: "2024-03-01",
    }],
  };
  await writeFile(
    join(root, "source", "registration.json"),
    JSON.stringify(registration),
  );
  await writeFile(
    join(root, "source", "roster.json"),
    JSON.stringify(roster),
  );
  await writeFile(
    join(root, "photos", `${sha256("employee-linked")}.png`),
    PNG,
  );
  const sourceOptions = {
    root,
    registrationPath: "source/registration.json",
    rosterPath: "source/roster.json",
    photoDirectory: "photos",
  };
  const mapping = structuredClone(
    await createAmicPrivateBootstrapLegalEntityMappingTemplate(sourceOptions),
  );
  mapping.approval_ref = "approval.synthetic.migration.001";
  for (const assignment of mapping.assignments) {
    if (assignment.source_presence.roster) {
      assignment.disposition = "assign";
      assignment.legal_entity_id = "company-synthetic";
    } else if (accountOnlyDisposition === "assign") {
      assignment.disposition = "assign";
      assignment.legal_entity_id = "company-synthetic";
    } else {
      assignment.disposition = "quarantine";
      assignment.quarantine_reason_code = "ACCOUNT_ONLY_REVIEW";
    }
  }
  return { sourceOptions, mapping };
}

function enrichmentApproval(plan) {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const registryBytes = Buffer.from(JSON.stringify({ schema_version: "law-firm-os.runtime-safety.approval-trust-registry.v1",
    generated_at: "2026-09-05T00:00:00.000Z", keys: [{ key_id: "synthetic-owner", algorithm: "Ed25519",
      public_key_spki_pem: publicKey.export({ type: "spki", format: "pem" }), roles: ["owner"], actions: [AMIC_BOOTSTRAP_ENRICHMENT_ACTION],
      environments: ["synthetic-test"], valid_from: "2026-09-01T00:00:00.000Z", valid_until: "2026-10-01T00:00:00.000Z", revoked_at: null }] }));
  const receipt = { schema_version: "law-firm-os.runtime-safety.approval.v1", approval_id: "approval.synthetic-enrichment", key_id: "synthetic-owner",
    role: "owner", decision: "approved", packet_sha256: plan.packet_sha256, source_sha: plan.source_sha, source_tree: plan.source_tree,
    action: plan.action, environment: plan.environment, signed_at: "2026-09-05T00:00:00.000Z", expires_at: "2026-09-06T00:00:00.000Z",
    data_scope: enrichmentApprovalDataScope(plan), contact_scope: [] };
  return { registryBytes, registrySha256: sha256(registryBytes), receiptBytes: Buffer.from(JSON.stringify(receipt)),
    signatureBytes: sign(null, Buffer.from(canonicalizeJson(receipt)), privateKey) };
}

test("existing tenant enrichment preserves business history and atomically records replayable scoped additions", async (t) => {
  const database = await createMigratedPostgresFixture(t);
  if (!database) return;
  const { sourceOptions, mapping } = await fixture();
  const compiled = await compileAmicPrivateBootstrapMigration({ ...sourceOptions, mapping });
  const corpus = structuredClone(compiled.corpus);
  delete corpus.manifest_sha256;
  corpus.domains[0].records.find((record) => record.record_type === "hrx_employees").payload.photo_version_id = "immutable-version-1";
  const records = structuredClone(corpus.domains[0].records);
  for (const record of records) {
    for (const field of Object.keys(record.payload)) if (field.startsWith("photo_") || field === "legal_entity_id") delete record.payload[field];
    record.payload.source_ref = "preserved-existing-provenance";
    if (record.record_type === "hrx_employment_profiles") {
      record.payload.effective_from = "2023-01-01";
      record.payload.start_date = "2022-01-01";
      record.payload.department = "Existing department";
    }
  }
  const historical = structuredClone(records.find((record) => record.record_type === "hrx_employment_profiles"));
  historical.record_id = "historical-profile";
  historical.unique_key = null;
  historical.payload.profile_id = "historical-profile";
  historical.payload.effective_from = "2021-01-01";
  records.push(historical, { tenant_id: corpus.tenant_id, domain_id: "hrx", record_type: "hrx_audit_events", record_id: "existing-business-audit",
    append_only: true, payload: { event_id: "existing-business-audit", business_record_preserved: true } });
  const ledger = createPostgresDomainLedger({ pool: database.appPool });
  const baseline = createDomainSnapshot({ tenant_id: corpus.tenant_id, domain_id: "hrx", records });
  await ledger.importSnapshot(baseline);
  const scope = { tenant_id: corpus.tenant_id, domain_id: "hrx" };
  const read = () => ledger.transaction(scope, async (tx) => createDomainSnapshot({ ...scope, records: await tx.list(),
    idempotency_entries: await tx.listIdempotency(), audit_events: await tx.listAudit() }));
  const before = await read();
  const context = { sourceSha: "a".repeat(40), sourceTree: "b".repeat(40), importPacketSha256: "c".repeat(64), mappingSha256: "d".repeat(64), environment: "synthetic-test" };
  const plan = planAmicPrivateBootstrapEnrichment({ ...context, corpus, currentSnapshot: before });
  assert.equal(plan.changed_record_count, 3);
  assert.equal(plan.employment_profile_coverage_count, 2);
  assert.equal(plan.record_count, 5);
  assert.equal(plan.dates_and_existing_facts_preserved, true);
  assert.doesNotMatch(JSON.stringify(plan), /Linked Person|linked@example|employee-linked|Existing department|2021-01-01/);
  const run = { pool: database.appPool, corpus, plan, sourceSha: context.sourceSha, sourceTree: context.sourceTree,
    approval: enrichmentApproval(plan), clock: () => new Date("2026-09-05T01:00:00.000Z") };
  await assert.rejects(executeAmicPrivateBootstrapEnrichment({ ...run, plan: { ...plan, changed_record_count: 99 } }), { code: "AMIC_ENRICHMENT_PLAN_DRIFT" });
  const wrongScope = structuredClone(corpus);
  wrongScope.tenant_id = "tenant-negative";
  await assert.rejects(executeAmicPrivateBootstrapEnrichment({ ...run, corpus: wrongScope }), { code: "AMIC_ENRICHMENT_TENANT" });
  const conflicted = structuredClone(before);
  conflicted.records.find((record) => record.record_type === "hrx_employment_profiles").payload.legal_entity_id = "other-company";
  assert.throws(() => planAmicPrivateBootstrapEnrichment({ ...context, corpus, currentSnapshot: conflicted }), { code: "AMIC_ENRICHMENT_FIELD_CONFLICT" });
  const faultPool = Object.create(database.appPool);
  faultPool.connect = async () => {
    const client = await database.appPool.connect();
    return { release: (...args) => client.release(...args), query: (sql, ...args) => {
      if (String(sql).includes("INSERT INTO lawos_domain.outbox_events")) throw Object.assign(new Error("synthetic outbox failure"), { code: "SIMULATED_OUTBOX_FAILURE" });
      return client.query(sql, ...args);
    } };
  };
  await assert.rejects(executeAmicPrivateBootstrapEnrichment({ ...run, pool: faultPool }));
  assert.equal((await read()).snapshot_hash, before.snapshot_hash);
  const result = await executeAmicPrivateBootstrapEnrichment(run);
  assert.equal(result.outcome, "PASS");
  assert.equal(result.replayed, false);
  assert.equal((await executeAmicPrivateBootstrapEnrichment(run)).replayed, true);
  assert.equal((await executeAmicPrivateBootstrapEnrichment({ ...run, readOnly: true })).read_only, true);
  const after = await read();
  assert.equal(after.records.length, before.records.length);
  assert.equal(after.audit_events.length, before.audit_events.length + 1);
  assert.equal(after.idempotency_entries.length, before.idempotency_entries.length + 1);
  for (const prior of before.records) {
    const current = after.records.find((record) => record.record_id === prior.record_id && record.record_type === prior.record_type);
    for (const [key, value] of Object.entries(prior.payload)) assert.deepEqual(current.payload[key], value);
    if (prior.record_type === "hrx_employment_profiles") assert.equal(current.payload.legal_entity_id, "company-synthetic");
  }
  assert.equal((await ledger.list({ tenant_id: "tenant-negative", domain_id: "hrx" })).length, 0);
  assert.equal(hashDomainValue(after.records.find((record) => record.record_id === "existing-business-audit")),
    hashDomainValue(before.records.find((record) => record.record_id === "existing-business-audit")));
});

test("private bootstrap compiler creates a scoped real-data corpus without photo bytes", async () => {
  const { sourceOptions, mapping } = await fixture();
  const compiled = await compileAmicPrivateBootstrapMigration({
    ...sourceOptions,
    mapping,
  });
  assert.equal(compiled.corpus.data_scope, "approved-real-manifest");
  assert.equal(compiled.corpus.accounts.length, 1);
  assert.equal("local_dev" in compiled.corpus.accounts[0], false);
  assert.doesNotMatch(JSON.stringify(compiled.corpus), /local-dev-only/u);
  const hrx = compiled.corpus.domains.find((domain) =>
    domain.domain_id === "hrx");
  assert.equal(hrx.records.length, 3);
  const employee = hrx.records.find((record) =>
    record.record_type === "hrx_employees").payload;
  const profile = hrx.records.find((record) =>
    record.record_type === "hrx_employment_profiles").payload;
  assert.match(employee.photo_object_id, /^employee-photo:[a-f0-9]{64}$/u);
  assert.equal(employee.photo_sha256, sha256(PNG));
  assert.equal(employee.mobile_phone, "+82-10-0000-0000");
  assert.equal(profile.legal_entity_id, "company-synthetic");
  assert.equal(profile.start_date, "2024-03-01");
  assert.equal(profile.effective_from, "2024-03-01");
  assert.equal(compiled.photo_stages.length, 1);
  assert.equal(compiled.photo_stages[0].bytes.equals(PNG), true);
  assert.doesNotMatch(JSON.stringify(compiled.corpus), /synthetic-private-bootstrap-photo/u);
  assert.equal(compiled.mapping_receipt.quarantined_subject_count, 1);
});

test("private bootstrap dry-run emits only counts and digests and performs no writes", async () => {
  const { sourceOptions, mapping } = await fixture();
  const receipt = await dryRunAmicPrivateBootstrapMigration({
    ...sourceOptions,
    mapping,
  });
  assert.equal(
    receipt.schema_version,
    AMIC_PRIVATE_BOOTSTRAP_MIGRATION_DRY_RUN_VERSION,
  );
  assert.equal(receipt.outcome, "PASS");
  assert.equal(receipt.source_subject_count, 2);
  assert.equal(receipt.assigned_subject_count, 1);
  assert.equal(receipt.quarantined_subject_count, 1);
  assert.equal(receipt.directory_target_count, 1);
  assert.equal(receipt.hrx_record_count, 3);
  assert.equal(receipt.photo_target_count, 1);
  assert.equal(receipt.rejected_item_count, 0);
  assert.equal(receipt.postgres_write_count, 0);
  assert.equal(receipt.object_storage_write_count, 0);
  assert.equal(receipt.raw_identity_included, false);
  assert.equal(receipt.raw_photo_included, false);
  assert.doesNotMatch(
    JSON.stringify(receipt),
    /Linked Person|linked@example\.test|employee-linked/u,
  );
});

test("approved account-only tenant drift is stripped into a disabled target membership", async () => {
  const { sourceOptions, mapping } = await fixture({
    accountOnlyDisposition: "assign",
    accountOnlyTenantId: "tenant-legacy",
  });
  const compiled = await compileAmicPrivateBootstrapMigration({
    ...sourceOptions,
    mapping,
  });
  const account = compiled.corpus.accounts.find((row) =>
    row.profile?.roster_link_status === "pending-roster-link");
  assert.equal(compiled.corpus.accounts.length, 2);
  assert.equal(account.membership.tenant_id, "tenant-synthetic");
  assert.equal(account.membership.status, "disabled");
  assert.deepEqual(account.membership.role_ids, []);
  assert.deepEqual(account.membership.group_ids, []);
  assert.deepEqual(account.membership.scopes, []);
  assert.deepEqual(account.membership.hrx_scopes, []);
  assert.equal(account.role_profile_id, null);
  assert.deepEqual(account.role_ids, []);
  assert.deepEqual(account.group_ids, []);
  assert.deepEqual(account.scopes, []);
  assert.deepEqual(account.hrx_scopes, []);
  assert.equal(account.profile.login_allowed, false);
  assert.equal("local_dev" in account, false);
  assert.equal(JSON.stringify(account).includes("tenant-legacy"), false);

  const drifted = await fixture({ linkedTenantId: "tenant-legacy" });
  await assert.rejects(
    compileAmicPrivateBootstrapMigration({
      ...drifted.sourceOptions,
      mapping: drifted.mapping,
    }),
    /registration membership is outside the inventory tenant/u,
  );
});

test("private bootstrap compiler refuses an incomplete mapping", async () => {
  const { sourceOptions, mapping } = await fixture();
  mapping.assignments[0].disposition = "pending";
  mapping.assignments[0].legal_entity_id = null;
  await assert.rejects(
    compileAmicPrivateBootstrapMigration({
      ...sourceOptions,
      mapping,
    }),
    /disposition must be assign or quarantine/u,
  );
});

test("non-synthetic execution packet requires exact signed production coordinates", async () => {
  const { sourceOptions, mapping } = await fixture();
  const preflight = await dryRunAmicPrivateBootstrapMigration({
    ...sourceOptions,
    mapping,
  });
  const packetInput = {
    schema_version: AMIC_PRIVATE_BOOTSTRAP_PACKET_INPUT_VERSION,
    packet_id: "amic-private-bootstrap-production-001",
    environment: "lawos-production",
    negative_tenant_id: "tenant-synthetic-negative",
    production_target: productionTarget(),
  };
  const adapterId = createAmicPrivateBootstrapPhotoStorageAdapterId(
    packetInput.production_target,
  );
  const base = {
    packetId: packetInput.packet_id,
    sourceSha: "1".repeat(40),
    sourceTree: "2".repeat(40),
    environment: "lawos-production",
    preflightReceipt: preflight,
    negativeTenantId: packetInput.negative_tenant_id,
    photoStorageProvider: "s3",
    photoStorageAdapterId: adapterId,
  };
  assert.throws(
    () => createAmicPrivateBootstrapExecutionPacket(base),
    (error) => error?.code === "AMIC_PRIVATE_BOOTSTRAP_PACKET_TARGET",
  );
  const packet = createAmicPrivateBootstrapExecutionPacket({
    ...base,
    productionTarget: packetInput.production_target,
  });
  assert.equal(approvedExecution(packet).valid, true);
  assert.deepEqual(packet.target.production, productionTarget());
  assert.equal(
    validateAmicPrivateBootstrapExecutionPacket(packet, {
      sourceSha: base.sourceSha,
      sourceTree: base.sourceTree,
    }).valid,
    true,
  );
  const inputBinding = validateAmicPrivateBootstrapPacketInputBinding({
    packet,
    input: packetInput,
  });
  assert.equal(inputBinding.photo_storage_adapter_id, adapterId);
  assert.equal(
    validateAmicPrivateBootstrapExecutionPreflightBinding({
      packet,
      preflightReceipt: preflight,
      negativeTenantId: packetInput.negative_tenant_id,
      photoStorageProvider: "s3",
      photoStorageAdapterId: adapterId,
    }).preflight_bound,
    true,
  );
  assert.throws(
    () => validateAmicPrivateBootstrapPacketInputBinding({
      packet,
      input: {
        ...packetInput,
        negative_tenant_id: "tenant-drifted-negative",
      },
    }),
    (error) => error?.code === "AMIC_PRIVATE_BOOTSTRAP_INPUT_BINDING",
  );
});

test("production target rejects cross-account, cross-region, mutable, or extra coordinates", () => {
  const invalid = [
    productionTarget({ aws_account: "123" }),
    productionTarget({ aws_region: "us-east-1" }),
    productionTarget({ photo_expected_bucket_owner: "123456789012" }),
    productionTarget({
      photo_kms_key_arn:
        "arn:aws:kms:ap-northeast-2:123456789012:key/11111111-2222-3333-4444-555555555555",
    }),
    productionTarget({ bucket_versioning_required: false }),
    productionTarget({ public_access_block_required: false }),
    productionTarget({ photo_prefix: "../member-photos" }),
    productionTarget({
      database_secret_ref:
        "arn:aws:secretsmanager:us-east-1:770880870480:secret:lawos/postgres",
    }),
    productionTarget({
      tenant_context_secret_ref: "lawos/production/postgres-url",
    }),
    { ...productionTarget(), unsupported: true },
  ];
  for (const target of invalid) {
    assert.throws(
      () => validateAmicPrivateBootstrapProductionTarget(target),
      (error) => [
        "AMIC_PRIVATE_BOOTSTRAP_PACKET_SCHEMA",
        "AMIC_PRIVATE_BOOTSTRAP_PACKET_TARGET",
      ].includes(error?.code),
    );
  }
});

test("synthetic packet refuses production infrastructure coordinates", async () => {
  const { sourceOptions, mapping } = await fixture();
  const preflight = await dryRunAmicPrivateBootstrapMigration({
    ...sourceOptions,
    mapping,
  });
  assert.throws(
    () => createAmicPrivateBootstrapExecutionPacket({
      packetId: "amic-private-bootstrap-synthetic-with-production",
      sourceSha: "3".repeat(40),
      sourceTree: "4".repeat(40),
      environment: "synthetic-test",
      preflightReceipt: preflight,
      negativeTenantId: "tenant-synthetic-negative",
      photoStorageProvider: "synthetic-versioned",
      photoStorageAdapterId: "synthetic-versioned-member-photo",
      productionTarget: productionTarget(),
    }),
    (error) => error?.code === "AMIC_PRIVATE_BOOTSTRAP_PACKET_TARGET",
  );
});

test("signed synthetic execution commits versioned photos and PostgreSQL readback exactly once", async (t) => {
  const postgres = await createMigratedPostgresFixture(t);
  if (!postgres) return;
  const { sourceOptions, mapping } = await fixture();
  const preflight = await dryRunAmicPrivateBootstrapMigration({
    ...sourceOptions,
    mapping,
  });
  const versioned = versionedPhotoStorage();
  const sourceSha = "a".repeat(40);
  const sourceTree = "b".repeat(40);
  const negativeTenantId = "tenant-synthetic-negative";
  const packet = createAmicPrivateBootstrapExecutionPacket({
    packetId: "amic-private-bootstrap-synthetic-001",
    sourceSha,
    sourceTree,
    environment: "synthetic-test",
    preflightReceipt: preflight,
    negativeTenantId,
    photoStorageProvider: versioned.photos.storage_provider,
    photoStorageAdapterId: versioned.photos.storage_adapter_id,
  });
  const approval = approvedExecution(packet);
  const input = {
    packet,
    approval,
    sourceSha,
    sourceTree,
    negativeTenantId,
    pool: postgres.appPool,
    memberPhotoStorage: versioned.photos,
    ...sourceOptions,
    mapping,
  };
  const result = await executeAmicPrivateBootstrapMigration(input);
  assert.equal(
    result.schema_version,
    AMIC_PRIVATE_BOOTSTRAP_EXECUTION_RESULT_VERSION,
  );
  assert.equal(result.outcome, "PASS");
  assert.equal(result.directory_readback_count, 1);
  assert.equal(result.hrx_record_readback_count, 3);
  assert.equal(result.photo_committed_count, 1);
  assert.equal(result.photo_readback_count, 1);
  assert.equal(result.tenant_negative_visible_count, 0);
  assert.equal(result.repair_required, false);
  assert.notEqual(
    result.planned_migration_manifest_sha256,
    result.committed_migration_manifest_sha256,
  );
  assert.deepEqual(versioned.calls, { stage: 1, finalize: 1 });
  assert.doesNotMatch(
    JSON.stringify(result),
    /Linked Person|linked@example\.test|employee-linked|synthetic-private-bootstrap-photo/u,
  );

  const replay = await executeAmicPrivateBootstrapMigration(input);
  assert.equal(replay.outcome, "PASS");
  assert.equal(replay.invariant_hash, result.invariant_hash);
  assert.equal(
    replay.committed_migration_manifest_sha256,
    result.committed_migration_manifest_sha256,
  );
  assert.deepEqual(versioned.calls, { stage: 1, finalize: 1 });
});

test("execution refuses an unsigned packet before PostgreSQL or photo writes", async () => {
  const { sourceOptions, mapping } = await fixture();
  const preflight = await dryRunAmicPrivateBootstrapMigration({
    ...sourceOptions,
    mapping,
  });
  const versioned = versionedPhotoStorage();
  const packet = createAmicPrivateBootstrapExecutionPacket({
    packetId: "amic-private-bootstrap-synthetic-unsigned",
    sourceSha: "c".repeat(40),
    sourceTree: "d".repeat(40),
    environment: "synthetic-test",
    preflightReceipt: preflight,
    negativeTenantId: "tenant-synthetic-negative",
    photoStorageProvider: versioned.photos.storage_provider,
    photoStorageAdapterId: versioned.photos.storage_adapter_id,
  });
  await assert.rejects(
    executeAmicPrivateBootstrapMigration({
      packet,
      approval: null,
      sourceSha: packet.source_sha,
      sourceTree: packet.source_tree,
      negativeTenantId: "tenant-synthetic-negative",
      pool: { connect() {} },
      memberPhotoStorage: versioned.photos,
      ...sourceOptions,
      mapping,
    }),
    (error) => error?.code === "AMIC_PRIVATE_BOOTSTRAP_APPROVAL_REQUIRED",
  );
  assert.deepEqual(versioned.calls, { stage: 0, finalize: 0 });
});

test("a committed unversioned photo produces a repair-required safe receipt", async () => {
  const { sourceOptions, mapping } = await fixture();
  const preflight = await dryRunAmicPrivateBootstrapMigration({
    ...sourceOptions,
    mapping,
  });
  const base = createLocalStorageAdapter({
    adapter_id: "synthetic-unversioned-member-photo",
  });
  const photos = createHrxMemberPhotoStorage({
    storage: Object.freeze({ ...base, provider: "synthetic-unversioned" }),
  });
  const packet = createAmicPrivateBootstrapExecutionPacket({
    packetId: "amic-private-bootstrap-synthetic-unversioned",
    sourceSha: "e".repeat(40),
    sourceTree: "f".repeat(40),
    environment: "synthetic-test",
    preflightReceipt: preflight,
    negativeTenantId: "tenant-synthetic-negative",
    photoStorageProvider: photos.storage_provider,
    photoStorageAdapterId: photos.storage_adapter_id,
  });
  const approval = approvedExecution(packet);
  await assert.rejects(
    executeAmicPrivateBootstrapMigration({
      packet,
      approval,
      sourceSha: packet.source_sha,
      sourceTree: packet.source_tree,
      negativeTenantId: "tenant-synthetic-negative",
      pool: { connect() {} },
      memberPhotoStorage: photos,
      ...sourceOptions,
      mapping,
    }),
    (error) => error?.code === "AMIC_PRIVATE_BOOTSTRAP_PHOTO_VERSION_REQUIRED"
      && error?.safe_receipt?.outcome === "BLOCKED"
      && error?.safe_receipt?.photo_committed_count === 1
      && error?.safe_receipt?.external_write_may_have_occurred === true
      && error?.safe_receipt?.repair_required === true
      && JSON.stringify(error.safe_receipt).includes("Linked Person") === false,
  );
});

test("an ambiguous photo-finalize failure requires repair without a returned receipt", async () => {
  const { sourceOptions, mapping } = await fixture();
  const preflight = await dryRunAmicPrivateBootstrapMigration({
    ...sourceOptions,
    mapping,
  });
  const base = createLocalStorageAdapter({
    adapter_id: "synthetic-ambiguous-photo-finalize",
  });
  const storage = Object.freeze({
    ...base,
    provider: "synthetic-versioned",
    async finalizeObject(input) {
      await base.finalizeObject(input);
      throw Object.assign(new Error("simulated lost finalize response"), {
        code: "SIMULATED_FINALIZE_RESPONSE_LOST",
      });
    },
  });
  const photos = createHrxMemberPhotoStorage({ storage });
  const packet = createAmicPrivateBootstrapExecutionPacket({
    packetId: "amic-private-bootstrap-synthetic-ambiguous-finalize",
    sourceSha: "7".repeat(40),
    sourceTree: "8".repeat(40),
    environment: "synthetic-test",
    preflightReceipt: preflight,
    negativeTenantId: "tenant-synthetic-negative",
    photoStorageProvider: photos.storage_provider,
    photoStorageAdapterId: photos.storage_adapter_id,
  });
  await assert.rejects(
    executeAmicPrivateBootstrapMigration({
      packet,
      approval: approvedExecution(packet),
      sourceSha: packet.source_sha,
      sourceTree: packet.source_tree,
      negativeTenantId: "tenant-synthetic-negative",
      pool: { connect() {} },
      memberPhotoStorage: photos,
      ...sourceOptions,
      mapping,
    }),
    (error) => error?.code === "SIMULATED_FINALIZE_RESPONSE_LOST"
      && error?.safe_receipt?.failed_phase === "photo-finalize"
      && error?.safe_receipt?.photo_committed_count === 0
      && error?.safe_receipt?.external_write_may_have_occurred === true
      && error?.safe_receipt?.repair_required === true,
  );
});

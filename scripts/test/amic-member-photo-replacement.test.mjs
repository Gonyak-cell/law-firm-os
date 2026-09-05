import assert from "node:assert/strict";
import { createHash, generateKeyPairSync, sign } from "node:crypto";
import test from "node:test";
import { createLocalStorageAdapter } from "../../packages/dms/src/storage/local-storage-adapter.js";
import { createHrxMemberPhotoStorage } from "../../packages/hrx/src/member-photo-storage.js";
import { createDomainSnapshot, hashDomainValue } from "../../packages/persistence/src/domain-ledger.js";
import { createPostgresDomainLedger } from "../../packages/persistence/src/postgres/domain-ledger.js";
import { createMigratedPostgresFixture } from "../../packages/persistence/test/helpers/disposable-postgres.js";
import { canonicalizeJson } from "../../packages/runtime-auth/src/runtime-safety-approval-contract.js";
import {
  AMIC_MEMBER_PHOTO_REPLACEMENT_ACTION, AMIC_MEMBER_PHOTO_REPLACEMENT_VERSION,
  executeAmicMemberPhotoReplacement, memberPhotoReplacementApprovalDataScope, planAmicMemberPhotoReplacement,
} from "../lib/amic-member-photo-replacement.mjs";

const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");
const NEW_PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aK1sAAAAASUVORK5CYII=", "base64");
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
const CONTEXT = { sourceSha: "a".repeat(40), sourceTree: "b".repeat(40), environment: "synthetic-test", photoStorageAdapterId: "synthetic-photo-replacement" };
const SCOPE = { tenant_id: "tenant-synthetic-photo", domain_id: "hrx" };
const NOW = "2026-09-05T01:00:00.000Z";
const PHOTO_FIELDS = ["photo_object_id", "photo_sha256", "photo_byte_size", "photo_content_type", "photo_version_id"];

function approved(plan, overrides = {}) {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const registryBytes = Buffer.from(JSON.stringify({ schema_version: "law-firm-os.runtime-safety.approval-trust-registry.v1",
    generated_at: "2026-09-05T00:00:00.000Z", keys: [{ key_id: "synthetic-owner", algorithm: "Ed25519",
      public_key_spki_pem: publicKey.export({ type: "spki", format: "pem" }), roles: ["owner"],
      actions: [AMIC_MEMBER_PHOTO_REPLACEMENT_ACTION], environments: ["synthetic-test"],
      valid_from: "2026-09-01T00:00:00.000Z", valid_until: "2026-10-01T00:00:00.000Z", revoked_at: null }] }));
  const receipt = { schema_version: "law-firm-os.runtime-safety.approval.v1", approval_id: "approval.synthetic-photo", key_id: "synthetic-owner",
    role: "owner", decision: "approved", packet_sha256: plan.packet_sha256, source_sha: plan.source_sha, source_tree: plan.source_tree,
    action: plan.action, environment: plan.environment, signed_at: "2026-09-05T00:00:00.000Z", expires_at: "2026-09-06T00:00:00.000Z",
    data_scope: memberPhotoReplacementApprovalDataScope(plan), contact_scope: [], ...overrides };
  return { registryBytes, registrySha256: digest(registryBytes), receiptBytes: Buffer.from(JSON.stringify(receipt)),
    signatureBytes: sign(null, Buffer.from(canonicalizeJson(receipt)), privateKey) };
}
function versionedStorage() {
  const base = createLocalStorageAdapter({ adapter_id: "synthetic-photo-replacement" });
  const calls = { stage: 0, finalize: 0, deleted: 0 };
  const version = (receipt) => receipt && { ...receipt, version_id: `version-${receipt.sha256}` };
  const storage = { ...base, provider: "synthetic-versioned",
    stageObject(input) { calls.stage += 1; return base.stageObject(input); },
    finalizeObject(input) { calls.finalize += 1; return version(base.finalizeObject(input)); },
    statObject(input) { return version(base.statObject(input)); },
    deleteOrphan(input) { calls.deleted += 1; return base.deleteOrphan(input); } };
  return { photos: createHrxMemberPhotoStorage({ storage }), calls };
}
async function fixture(t, { count = 2 } = {}) {
  const database = await createMigratedPostgresFixture(t);
  if (!database) return null;
  const { photos, calls } = versionedStorage();
  const records = [];
  const changes = [];
  for (let index = 1; index <= count; index += 1) {
    const scope = { tenant_id: SCOPE.tenant_id, legal_entity_id: "company-synthetic", employee_id: `employee-${index}` };
    const old = index === 1 ? await photos.storePhoto({ ...scope, bytes: PNG, idempotency_key: "old-photo" }) : null;
    records.push({ ...SCOPE, record_type: "hrx_employees", record_id: scope.employee_id,
      payload: { tenant_id: SCOPE.tenant_id, employee_id: scope.employee_id, name: `Synthetic Person ${index}`,
        work_email: `synthetic${index}@example.invalid`, mobile_phone: "preserved-contact", ...(old ?? {}) } });
    records.push({ ...SCOPE, record_type: "hrx_employment_profiles", record_id: `profile-${index}`,
      payload: { ...scope, profile_id: `profile-${index}`, effective_from: "2023-01-01", start_date: "2022-01-01", status: "active" } });
    changes.push({ ...scope, profile_id: `profile-${index}`, expected_photo: old,
      original_sha256: "e".repeat(64), photo_sha256: digest(NEW_PNG), photo_byte_size: NEW_PNG.length });
    delete changes.at(-1).tenant_id;
  }
  records.push({ ...SCOPE, record_type: "hrx_employment_profiles", record_id: "historical-profile",
    payload: { tenant_id: SCOPE.tenant_id, employee_id: "employee-1", profile_id: "historical-profile", legal_entity_id: "company-past", effective_from: "2020-01-01", effective_to: "2022-12-31" } },
  { ...SCOPE, record_type: "hrx_audit_events", record_id: "historic-audit", append_only: true,
    payload: { tenant_id: SCOPE.tenant_id, event_id: "historic-audit", preserved_business_history: true } });
  const ledger = createPostgresDomainLedger({ pool: database.appPool });
  await ledger.importSnapshot(createDomainSnapshot({ ...SCOPE, records }));
  const read = () => ledger.transaction(SCOPE, async (tx) => createDomainSnapshot({ ...SCOPE,
    records: await tx.list(), idempotency_entries: await tx.listIdempotency(), audit_events: await tx.listAudit() }));
  const manifest = { schema_version: AMIC_MEMBER_PHOTO_REPLACEMENT_VERSION, tenant_id: SCOPE.tenant_id,
    request_id: "photo-replacement-synthetic-001", source_manifest_sha256: "d".repeat(64), changes };
  const before = await read();
  const plan = planAmicMemberPhotoReplacement({ ...CONTEXT, manifest, currentSnapshot: before });
  const run = { ...CONTEXT, pool: database.appPool, manifest, plan, approval: approved(plan), memberPhotoStorage: photos,
    readPhotoBytes: async () => NEW_PNG, clock: () => new Date(NOW) };
  return { database, photos, calls, ledger, read, before, manifest, plan, run };
}
const withoutPhotos = (payload) => Object.fromEntries(Object.entries(payload).filter(([field]) => !PHOTO_FIELDS.includes(field)));

// The database fixture executes migrations and uses the restricted application pool, not an in-memory ledger.
test("photo replacement preserves old objects and other HRX facts, atomically rolls back, and replays without storing again", async (t) => {
  const f = await fixture(t);
  if (!f) return;
  assert.doesNotMatch(JSON.stringify(f.plan), /Synthetic Person|example.invalid|employee-1|company-synthetic/);
  const faultPool = Object.create(f.database.appPool);
  faultPool.connect = async () => {
    const client = await f.database.appPool.connect();
    return { release: (...args) => client.release(...args), query: (sql, ...args) => {
      if (String(sql).includes("INSERT INTO lawos_domain.outbox_events")) throw Object.assign(new Error("synthetic outbox failure"), { code: "SIMULATED_OUTBOX_FAILURE" });
      return client.query(sql, ...args);
    } };
  };
  await assert.rejects(executeAmicMemberPhotoReplacement({ ...f.run, pool: faultPool }), (error) => {
    assert.equal(error.code, "LAWOS_POSTGRES_OPERATION_FAILED");
    assert.equal(error.postgres_code, "SIMULATED_OUTBOX_FAILURE");
    assert.equal(error.recovery_receipt.database_commit_state, "unknown");
    assert.equal(error.recovery_receipt.objects.length, 2);
    assert.ok(error.recovery_receipt.objects.every((item) => item.state === "body_verified"));
    assert.equal(error.recovery_receipt.committed_objects_deleted, false);
    return true;
  });
  assert.equal((await f.read()).snapshot_hash, f.before.snapshot_hash);
  assert.equal(f.calls.finalize, 3); // One prior object, two immutable replacements survived rollback.
  const result = await executeAmicMemberPhotoReplacement(f.run);
  assert.equal(result.outcome, "PASS");
  assert.equal(result.replayed, false);
  assert.equal(result.photo_body_readback_count, 2);
  assert.equal(result.photos[0].previous_photo.photo_sha256, digest(PNG));
  assert.equal(result.photos[0].current_photo.photo_sha256, digest(NEW_PNG));
  assert.equal(result.photos[1].previous_photo, null);
  assert.equal(f.calls.finalize, 3);
  assert.equal((await executeAmicMemberPhotoReplacement(f.run)).replayed, true);
  assert.equal((await executeAmicMemberPhotoReplacement({ ...f.run, readOnly: true, readPhotoBytes: undefined })).read_only, true);
  assert.equal(f.calls.finalize, 3);
  assert.equal(f.calls.deleted, 0);
  const after = await f.read();
  assert.equal(after.records.length, f.before.records.length);
  assert.equal(after.idempotency_entries.length, f.before.idempotency_entries.length + 1);
  assert.equal(after.audit_events.length, f.before.audit_events.length + 1);
  for (const old of f.before.records) {
    const current = after.records.find((record) => record.record_id === old.record_id && record.record_type === old.record_type);
    if (old.record_type === "hrx_employees") {
      assert.deepEqual(withoutPhotos(current.payload), withoutPhotos(old.payload));
      assert.equal(current.state_version, old.state_version + 1);
    } else assert.deepEqual(current, old);
  }
  const old = f.manifest.changes[0];
  assert.deepEqual((await f.photos.readPhoto({ tenant_id: SCOPE.tenant_id, ...old, photo: old.expected_photo })).bytes, PNG);
  assert.equal((await f.ledger.list({ tenant_id: "tenant-negative", domain_id: "hrx" })).length, 0);
  const changedRequest = structuredClone(f.manifest);
  changedRequest.changes[0].expected_photo = result.photos[0].current_photo;
  changedRequest.changes[0].photo_sha256 = digest(PNG);
  changedRequest.changes[0].photo_byte_size = PNG.length;
  changedRequest.changes[1].expected_photo = result.photos[1].current_photo;
  changedRequest.changes[1].photo_sha256 = digest(PNG);
  changedRequest.changes[1].photo_byte_size = PNG.length;
  const conflictingPlan = planAmicMemberPhotoReplacement({ ...CONTEXT, manifest: changedRequest, currentSnapshot: after });
  await assert.rejects(executeAmicMemberPhotoReplacement({ ...f.run, manifest: changedRequest, plan: conflictingPlan,
    approval: approved(conflictingPlan), readPhotoBytes: async () => PNG }), { code: "LAWOS_AMIC_PHOTO_REPLAY_CONFLICT" });
  assert.equal(f.calls.finalize, 3);
});

test("photo replacement rejects wrong tenant/entity/employee, partial old metadata, stale versions, or unsigned byte drift", async (t) => {
  const f = await fixture(t, { count: 1 });
  if (!f) return;
  for (const [recordType, field, value] of [
    ["hrx_employees", "tenant_id", "tenant-negative"],
    ["hrx_employment_profiles", "tenant_id", "tenant-negative"],
    ["hrx_employment_profiles", "legal_entity_id", "company-negative"],
    ["hrx_employment_profiles", "employee_id", "employee-negative"],
  ]) {
    const before = structuredClone(f.before);
    before.records.find((record) => record.record_type === recordType && ["employee-1", "profile-1"].includes(record.record_id)).payload[field] = value;
    assert.throws(() => planAmicMemberPhotoReplacement({ ...CONTEXT, manifest: f.manifest, currentSnapshot: before }), { code: "LAWOS_AMIC_PHOTO_OWNER_SCOPE" });
  }
  for (const update of [
    { expected_photo: null },
    { expected_photo: { ...f.manifest.changes[0].expected_photo, photo_version_id: "stale-version" } },
    { expected_photo: { ...f.manifest.changes[0].expected_photo, photo_sha256: "f".repeat(64) } },
    { expected_photo: { ...f.manifest.changes[0].expected_photo, photo_version_id: null } },
  ]) {
    const manifest = structuredClone(f.manifest);
    Object.assign(manifest.changes[0], update);
    assert.throws(() => planAmicMemberPhotoReplacement({ ...CONTEXT, manifest, currentSnapshot: f.before }));
  }
  const duplicate = structuredClone(f.manifest);
  duplicate.changes.push(duplicate.changes[0]);
  assert.throws(() => planAmicMemberPhotoReplacement({ ...CONTEXT, manifest: duplicate, currentSnapshot: f.before }), { code: "LAWOS_AMIC_PHOTO_MANIFEST" });
  await assert.rejects(executeAmicMemberPhotoReplacement({ ...f.run, readPhotoBytes: async () => PNG }), { code: "LAWOS_AMIC_PHOTO_SOURCE_BYTES_DRIFT" });
  await assert.rejects(executeAmicMemberPhotoReplacement({ ...f.run, readPhotoBytes: async () => Buffer.alloc(6 * 1024 * 1024) }), { safe_error_code: "HRX_MEMBER_PHOTO_INVALID" });
  await assert.rejects(executeAmicMemberPhotoReplacement({ ...f.run, readOnly: true }), { code: "LAWOS_AMIC_PHOTO_RECEIPT_MISSING" });
  assert.equal((await f.read()).snapshot_hash, f.before.snapshot_hash);
  assert.equal(f.calls.finalize, 1);
});

test("fresh exact replacement approval is mandatory before any storage operation and again before PG commit", async (t) => {
  const f = await fixture(t, { count: 1 });
  if (!f) return;
  for (const overrides of [
    { action: "lawos-amic-private-bootstrap-enrich" },
    { signed_at: "2026-09-05T02:00:00.000Z" },
    { expires_at: "2026-09-05T00:30:00.000Z" },
    { data_scope: ["approved-real-manifest"] },
    { data_scope: [...memberPhotoReplacementApprovalDataScope(f.plan), "another-scope"] },
    { contact_scope: ["another-contact"] },
  ]) await assert.rejects(executeAmicMemberPhotoReplacement({ ...f.run, approval: approved(f.plan, overrides) }));
  await assert.rejects(executeAmicMemberPhotoReplacement({ ...f.run, sourceSha: "c".repeat(40) }));
  await assert.rejects(executeAmicMemberPhotoReplacement({ ...f.run, approval: { ...f.run.approval, registrySha256: "f".repeat(64) } }));
  await assert.rejects(executeAmicMemberPhotoReplacement({ ...f.run, plan: { ...f.plan, changed_record_count: 7 } }), { code: "LAWOS_AMIC_PHOTO_PLAN_DRIFT" });
  assert.equal(f.calls.finalize, 1);
  let now = NOW;
  const photos = { ...f.photos, async storePhoto(input) {
    const photo = await f.photos.storePhoto(input);
    now = "2026-09-06T01:00:00.000Z";
    return photo;
  } };
  await assert.rejects(executeAmicMemberPhotoReplacement({ ...f.run, memberPhotoStorage: photos, clock: () => new Date(now) }), (error) => {
    assert.equal(error.recovery_receipt.objects[0].state, "body_verified");
    assert.equal(error.recovery_receipt.database_commit_state, "not_attempted");
    return true;
  });
  assert.equal((await f.read()).snapshot_hash, f.before.snapshot_hash);
  assert.equal(f.calls.deleted, 0);
});

test("concurrent record edits after object commit cannot be overwritten by a stale photo plan", async (t) => {
  const f = await fixture(t, { count: 1 });
  if (!f) return;
  let externalUpdated;
  const photos = { ...f.photos, async storePhoto(input) {
    const photo = await f.photos.storePhoto(input);
    await f.ledger.transaction(SCOPE, async (tx) => {
      const employee = await tx.read({ record_type: "hrx_employees", record_id: "employee-1" });
      await tx.write({ ...employee, expected_version: employee.state_version, payload: { ...employee.payload, mobile_phone: "concurrent-authoritative-value" } });
    });
    externalUpdated = await f.read();
    return photo;
  } };
  await assert.rejects(executeAmicMemberPhotoReplacement({ ...f.run, memberPhotoStorage: photos }), (error) => {
    assert.equal(error.code, "LAWOS_AMIC_PHOTO_BASELINE_DRIFT");
    assert.equal(error.recovery_receipt.objects.length, 1);
    return true;
  });
  assert.equal((await f.read()).snapshot_hash, externalUpdated.snapshot_hash);
  assert.equal(f.calls.deleted, 0);
  assert.equal((await f.read()).records.find((record) => record.record_id === "employee-1").payload.photo_sha256, digest(PNG));
});

test("two simultaneous requests with the same old photo state commit exactly once", async (t) => {
  const f = await fixture(t, { count: 1 });
  if (!f) return;
  const secondManifest = { ...f.manifest, request_id: "photo-replacement-competing-002" };
  const secondPlan = planAmicMemberPhotoReplacement({ ...CONTEXT, manifest: secondManifest, currentSnapshot: f.before });
  let arrivals = 0;
  let resume;
  const barrier = new Promise((resolve) => { resume = resolve; });
  const photos = { ...f.photos, async storePhoto(input) {
    const photo = await f.photos.storePhoto(input);
    arrivals += 1;
    if (arrivals === 2) resume();
    await barrier;
    return photo;
  } };
  const results = await Promise.allSettled([
    executeAmicMemberPhotoReplacement({ ...f.run, memberPhotoStorage: photos }),
    executeAmicMemberPhotoReplacement({ ...f.run, manifest: secondManifest, plan: secondPlan,
      approval: approved(secondPlan), memberPhotoStorage: photos }),
  ]);
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  const failed = results.find((result) => result.status === "rejected").reason;
  assert.ok(["40001", "LAWOS_DOMAIN_BASELINE_CONFLICT", "LAWOS_AMIC_PHOTO_STALE_METADATA", "LAWOS_AMIC_PHOTO_BASELINE_DRIFT", "REPOSITORY_CONFLICT"].includes(failed.code), failed.code);
  assert.equal(failed.recovery_receipt.committed_objects_deleted, false);
  const after = await f.read();
  assert.equal(after.idempotency_entries.length, f.before.idempotency_entries.length + 1);
  assert.equal(after.audit_events.length, f.before.audit_events.length + 1);
  assert.equal(f.calls.deleted, 0);
});

test("approval expiring while the write transaction reads its baseline prevents the first PG mutation", async (t) => {
  const f = await fixture(t, { count: 1 });
  if (!f) return;
  let now = NOW;
  let writeTransaction = false;
  let changedClock = false;
  let writes = 0;
  const delayedPool = Object.create(f.database.appPool);
  delayedPool.connect = async () => {
    const client = await f.database.appPool.connect();
    return { release: (...args) => client.release(...args), async query(sql, ...args) {
      const query = String(sql);
      if (query.startsWith("BEGIN")) writeTransaction = !query.includes("READ ONLY");
      if (/^\s*(?:INSERT|UPDATE)/u.test(query)) writes += 1;
      const result = await client.query(sql, ...args);
      if (writeTransaction && query.includes("FROM lawos_domain.records") && !changedClock) {
        now = "2026-09-06T01:00:00.000Z";
        changedClock = true;
      }
      return result;
    } };
  };
  await assert.rejects(executeAmicMemberPhotoReplacement({ ...f.run, pool: delayedPool, clock: () => new Date(now) }), (error) => {
    assert.equal(error.recovery_receipt.objects[0].state, "body_verified");
    return true;
  });
  assert.equal(changedClock, true);
  assert.equal(writes, 0);
  assert.equal((await f.read()).snapshot_hash, f.before.snapshot_hash);
  assert.equal(f.calls.deleted, 0);
});

test("same signed approval concurrently replays one PG commit without duplicate audit", async (t) => {
  const f = await fixture(t, { count: 1 });
  if (!f) return;
  let arrivals = 0;
  let resume;
  const barrier = new Promise((resolve) => { resume = resolve; });
  const photos = { ...f.photos, async storePhoto(input) {
    const photo = await f.photos.storePhoto(input);
    if (++arrivals === 2) resume();
    await barrier;
    return photo;
  } };
  const results = await Promise.all([
    executeAmicMemberPhotoReplacement({ ...f.run, memberPhotoStorage: photos }),
    executeAmicMemberPhotoReplacement({ ...f.run, memberPhotoStorage: photos }),
  ]);
  assert.deepEqual(results.map((result) => result.replayed).sort(), [false, true]);
  assert.deepEqual(results[0].photos, results[1].photos);
  const after = await f.read();
  assert.equal(after.idempotency_entries.length, f.before.idempotency_entries.length + 1);
  assert.equal(after.audit_events.length, f.before.audit_events.length + 1);
  assert.equal(f.calls.deleted, 0);
});

test("storage target drift, missing committed version, body corruption, and source-read expiry leave PG unchanged", async (t) => {
  const f = await fixture(t, { count: 1 });
  if (!f) return;
  await assert.rejects(executeAmicMemberPhotoReplacement({ ...f.run, memberPhotoStorage: { ...f.photos, storage_adapter_id: "wrong-storage" } }),
    { code: "LAWOS_AMIC_PHOTO_STORAGE_REQUIRED" });
  assert.equal(f.calls.finalize, 1);
  let now = NOW;
  await assert.rejects(executeAmicMemberPhotoReplacement({ ...f.run, clock: () => new Date(now), readPhotoBytes: async () => {
    now = "2026-09-06T01:00:00.000Z";
    return NEW_PNG;
  } }));
  assert.equal(f.calls.finalize, 1);
  const unversioned = { ...f.photos, async storePhoto(input) { return { ...await f.photos.storePhoto(input), photo_version_id: null }; } };
  await assert.rejects(executeAmicMemberPhotoReplacement({ ...f.run, memberPhotoStorage: unversioned }),
    { code: "LAWOS_AMIC_PHOTO_COMMITTED_METADATA" });
  const corrupt = { ...f.photos, async readPhoto(input) { return { ...await f.photos.readPhoto(input), bytes: PNG }; } };
  await assert.rejects(executeAmicMemberPhotoReplacement({ ...f.run, memberPhotoStorage: corrupt }),
    { code: "LAWOS_AMIC_PHOTO_BODY_READBACK" });
  assert.equal((await f.read()).snapshot_hash, f.before.snapshot_hash);
  assert.equal(f.calls.deleted, 0);
});

test("a partial storage failure reports retained and uncertain objects before any PG change", async (t) => {
  const f = await fixture(t);
  if (!f) return;
  const photos = { ...f.photos, async storePhoto(input) {
    if (input.employee_id === "employee-2") throw Object.assign(new Error("synthetic storage timeout"), { code: "SYNTHETIC_STORAGE_TIMEOUT" });
    return f.photos.storePhoto(input);
  } };
  let recovery;
  await assert.rejects(executeAmicMemberPhotoReplacement({ ...f.run, memberPhotoStorage: photos }), (error) => {
    assert.equal(error.code, "SYNTHETIC_STORAGE_TIMEOUT");
    recovery = error.recovery_receipt;
    assert.equal(recovery.database_commit_state, "not_attempted");
    assert.equal(recovery.objects.length, 2);
    assert.equal(recovery.objects[0].state, "body_verified");
    assert.equal(recovery.objects[1].state, "commit_outcome_unknown");
    assert.equal(recovery.objects[1].photo.photo_version_id, null);
    return true;
  });
  assert.equal((await f.read()).snapshot_hash, f.before.snapshot_hash);
  assert.equal(f.calls.finalize, 2);
  assert.equal(f.calls.deleted, 0);
  const change = f.manifest.changes[0];
  assert.deepEqual((await f.photos.readPhoto({ tenant_id: SCOPE.tenant_id, ...change, photo: recovery.objects[0].photo })).bytes, NEW_PNG);
  assert.deepEqual((await f.photos.readPhoto({ tenant_id: SCOPE.tenant_id, ...change, photo: change.expected_photo })).bytes, PNG);
  assert.equal((await executeAmicMemberPhotoReplacement(f.run)).outcome, "PASS");
  assert.equal(f.calls.finalize, 3);
});

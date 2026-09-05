import { createHash } from "node:crypto";
import { createHrxMemberPhotoMetadata, assertValidHrxMemberPhotoPng, getHrxMemberPhotoStorageTarget } from "../../packages/hrx/src/member-photo-storage.js";
import { createHrxDomainRecordId } from "../../packages/hrx/src/postgres-store-v2.js";
import { createDomainSnapshot, hashDomainValue } from "../../packages/persistence/src/domain-ledger.js";
import { createPostgresDomainLedger } from "../../packages/persistence/src/postgres/domain-ledger.js";
import { flushDomainSnapshotToScopedLedger } from "../../packages/persistence/src/record-domain-adapter.js";
import { validateRuntimeSafetyApprovalPayload } from "../../packages/runtime-auth/src/runtime-safety-approval-contract.js";
import { validateAmicPrivateBootstrapProductionTarget } from "./amic-private-bootstrap-execution.mjs";

export const AMIC_MEMBER_PHOTO_REPLACEMENT_VERSION = "law-firm-os.amic-member-photo-replacement.v1";
export const AMIC_MEMBER_PHOTO_REPLACEMENT_ACTION = "lawos-amic-member-photo-replace";
const PHOTO_FIELDS = ["photo_object_id", "photo_sha256", "photo_byte_size", "photo_content_type", "photo_version_id"];
const REF = /^[A-Za-z0-9_.:-]{1,160}$/u;
const SHA = /^[a-f0-9]{64}$/u;
const equal = (a, b) => hashDomainValue(a) === hashDomainValue(b);
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const absent = (value) => value === undefined || value === null || value === "";
const photoOf = (payload) => PHOTO_FIELDS.every((field) => absent(payload[field]))
  ? null : Object.fromEntries(PHOTO_FIELDS.map((field) => [field, payload[field]]));
const scopeOf = (manifest, change) => ({ tenant_id: manifest.tenant_id, legal_entity_id: change.legal_entity_id, employee_id: change.employee_id });
const recordRef = (record) => hashDomainValue(`${record.record_type}:${record.record_id}`);
function requireCondition(condition, code) {
  if (!condition) throw Object.assign(new Error("member photo replacement precondition failed"), { code: `LAWOS_${code}`, safe_error_code: code, status: 409 });
}
function exactKeys(value, keys) {
  return value && typeof value === "object" && !Array.isArray(value) && equal(Object.keys(value).sort(), [...keys].sort());
}
function committedPhoto(scope, photo) {
  requireCondition(exactKeys(photo, PHOTO_FIELDS) && typeof photo.photo_version_id === "string"
    && photo.photo_version_id.trim() !== "" && photo.photo_version_id !== "pending-storage-version"
    && equal(photo, createHrxMemberPhotoMetadata({ ...scope, ...photo })), "AMIC_PHOTO_COMMITTED_METADATA");
  return photo;
}
function validateManifest(manifest) {
  requireCondition(exactKeys(manifest, ["schema_version", "tenant_id", "request_id", "source_manifest_sha256", "changes"])
    && manifest.schema_version === AMIC_MEMBER_PHOTO_REPLACEMENT_VERSION && typeof manifest.tenant_id === "string" && REF.test(manifest.tenant_id)
    && typeof manifest.request_id === "string" && REF.test(manifest.request_id) && SHA.test(manifest.source_manifest_sha256)
    && Array.isArray(manifest.changes) && manifest.changes.length > 0 && manifest.changes.length <= 100,
  "AMIC_PHOTO_MANIFEST");
  const employees = new Set();
  for (const change of manifest.changes) {
    requireCondition(exactKeys(change, ["employee_id", "profile_id", "legal_entity_id", "expected_photo", "original_sha256", "photo_sha256", "photo_byte_size"])
      && [change.employee_id, change.profile_id, change.legal_entity_id].every((value) => typeof value === "string" && REF.test(value))
      && SHA.test(change.original_sha256) && SHA.test(change.photo_sha256) && Number.isSafeInteger(change.photo_byte_size)
      && !employees.has(change.employee_id), "AMIC_PHOTO_MANIFEST");
    employees.add(change.employee_id);
    const scope = scopeOf(manifest, change);
    createHrxMemberPhotoMetadata({ ...scope, ...change });
    if (change.expected_photo !== null) committedPhoto(scope, change.expected_photo);
    requireCondition(change.expected_photo?.photo_sha256 !== change.photo_sha256, "AMIC_PHOTO_REPLACEMENT_UNCHANGED");
  }
  return manifest;
}
function targets(manifest, snapshot) {
  requireCondition(snapshot.tenant_id === manifest.tenant_id && snapshot.domain_id === "hrx", "AMIC_PHOTO_TENANT");
  return manifest.changes.map((change) => {
    const employeeId = createHrxDomainRecordId("hrx_employees", { tenant_id: manifest.tenant_id, employee_id: change.employee_id });
    const profileId = createHrxDomainRecordId("hrx_employment_profiles", { tenant_id: manifest.tenant_id, profile_id: change.profile_id });
    const employees = snapshot.records.filter((record) => record.record_type === "hrx_employees"
      && (record.record_id === employeeId || record.payload.employee_id === change.employee_id));
    const profiles = snapshot.records.filter((record) => record.record_type === "hrx_employment_profiles"
      && (record.record_id === profileId || record.payload.profile_id === change.profile_id));
    const employee = employees[0];
    const profile = profiles[0];
    requireCondition(employees.length === 1 && profiles.length === 1
      && employee.record_id === employeeId && employee.payload.employee_id === change.employee_id
      && profile.record_id === profileId && profile.payload.profile_id === change.profile_id
      && profile.payload.employee_id === change.employee_id && profile.payload.legal_entity_id === change.legal_entity_id
      && [employee, profile].every((record) => record.tenant_id === manifest.tenant_id
        && record.payload.tenant_id === manifest.tenant_id && !record.append_only), "AMIC_PHOTO_OWNER_SCOPE");
    return { change, employee, profile };
  });
}
function photoTarget(production) {
  return { bucket_ref: `s3://${production.photo_bucket_name}/${production.photo_prefix}`,
    expected_bucket_owner: production.photo_expected_bucket_owner, region: production.aws_region, endpoint_mode: "aws-default-guarded",
    kms_key_ref: production.photo_kms_key_arn, server_side_encryption: production.server_side_encryption };
}
export function planAmicMemberPhotoReplacement({ manifest, currentSnapshot, sourceSha, sourceTree, photoStorageAdapterId, productionTarget = null, environment }) {
  validateManifest(manifest);
  requireCondition(/^[a-f0-9]{40}$/u.test(sourceSha) && /^[a-f0-9]{40}$/u.test(sourceTree)
    && typeof photoStorageAdapterId === "string" && REF.test(photoStorageAdapterId)
    && ["synthetic-test", "lawos-private-rehearsal", "lawos-production"].includes(environment), "AMIC_PHOTO_SOURCE_BINDING");
  const production = productionTarget === null ? null : validateAmicPrivateBootstrapProductionTarget(productionTarget);
  requireCondition(environment === "synthetic-test" || production !== null, "AMIC_PHOTO_STORAGE_TARGET_REQUIRED");
  const before = createDomainSnapshot(currentSnapshot);
  const changes = targets(manifest, before).map(({ change, employee, profile }) => {
    requireCondition(equal(photoOf(employee.payload), change.expected_photo), "AMIC_PHOTO_STALE_METADATA");
    return { employee_ref_sha256: recordRef(employee), profile_ref_sha256: recordRef(profile),
      scope_sha256: hashDomainValue(scopeOf(manifest, change)), expected_employee_version: employee.state_version,
      expected_employee_payload_sha256: employee.payload_hash, expected_profile_version: profile.state_version,
      expected_profile_payload_sha256: profile.payload_hash, expected_photo_sha256: hashDomainValue(change.expected_photo),
      original_sha256: change.original_sha256, photo_sha256: change.photo_sha256, photo_byte_size: change.photo_byte_size };
  });
  const material = { schema_version: AMIC_MEMBER_PHOTO_REPLACEMENT_VERSION, action: AMIC_MEMBER_PHOTO_REPLACEMENT_ACTION,
    environment, source_sha: sourceSha, source_tree: sourceTree, photo_storage_adapter_id: photoStorageAdapterId, source_manifest_sha256: manifest.source_manifest_sha256,
    production_target: production, photo_storage_target_sha256: hashDomainValue(production ? photoTarget(production) : null),
    manifest_sha256: hashDomainValue(manifest), request_ref_sha256: hashDomainValue(manifest.request_id),
    tenant_ref_sha256: hashDomainValue(manifest.tenant_id), changed_record_count: changes.length, changes,
    record_deletion_count: 0, previous_objects_preserved: true, source_mutated: false, raw_identity_returned: false };
  return Object.freeze({ ...material, packet_sha256: hashDomainValue(material) });
}
export function memberPhotoReplacementApprovalDataScope(plan) {
  return ["approved-real-manifest", `member-photo-source:${plan.source_manifest_sha256}`, `member-photo-replacement:${plan.manifest_sha256}`];
}
export function verifyAmicMemberPhotoReplacementApproval({ plan, sourceSha, sourceTree, registryBytes, registrySha256, receiptBytes, signatureBytes, now = new Date() }) {
  const { packet_sha256: packetSha256, ...material } = plan;
  requireCondition(plan.schema_version === AMIC_MEMBER_PHOTO_REPLACEMENT_VERSION && plan.action === AMIC_MEMBER_PHOTO_REPLACEMENT_ACTION
    && plan.source_sha === sourceSha && plan.source_tree === sourceTree && /^[a-f0-9]{40}$/u.test(sourceSha)
    && /^[a-f0-9]{40}$/u.test(sourceTree) && hashDomainValue(material) === packetSha256
    && plan.record_deletion_count === 0 && plan.previous_objects_preserved === true && plan.source_mutated === false
    && plan.raw_identity_returned === false, "AMIC_PHOTO_PLAN_DRIFT");
  const receipt = JSON.parse(Buffer.from(receiptBytes).toString("utf8"));
  requireCondition(equal(receipt.data_scope, memberPhotoReplacementApprovalDataScope(plan)) && equal(receipt.contact_scope, [])
    && Number.isFinite(new Date(now).getTime()) && new Date(receipt.signed_at).getTime() <= new Date(now).getTime(), "AMIC_PHOTO_APPROVAL_SCOPE_TIME");
  const verified = validateRuntimeSafetyApprovalPayload({ registryBytes, receiptBytes, signatureBytes, expectedRegistrySha256: registrySha256,
    expectedRole: "owner", expectedAction: AMIC_MEMBER_PHOTO_REPLACEMENT_ACTION, expectedEnvironment: plan.environment,
    expectedPacketSha256: packetSha256, expectedSourceSha: sourceSha, expectedSourceTree: sourceTree,
    allowedDataScope: memberPhotoReplacementApprovalDataScope(plan), allowedContactScope: [], now });
  requireCondition(verified.decision === "approved", "AMIC_PHOTO_APPROVAL_REJECTED");
  return verified;
}
async function snapshot(tx, tenantId) {
  return createDomainSnapshot({ tenant_id: tenantId, domain_id: "hrx", records: await tx.list(),
    idempotency_entries: await tx.listIdempotency(), audit_events: await tx.listAudit() });
}
async function verifyBodies(storage, manifest, selected) {
  for (const { change, employee } of selected) {
    const photo = committedPhoto(scopeOf(manifest, change), photoOf(employee.payload));
    const observed = await storage.readPhoto({ ...scopeOf(manifest, change), photo });
    requireCondition(Buffer.isBuffer(observed.bytes) && observed.sha256 === photo.photo_sha256
      && sha256(observed.bytes) === photo.photo_sha256 && observed.bytes.length === photo.photo_byte_size,
    "AMIC_PHOTO_BODY_READBACK");
    assertValidHrxMemberPhotoPng(observed.bytes);
  }
}

// expectedRegistrySha256 must come from trusted execution configuration, not the approval bundle.
// readPhotoBytes supplies only the approved display PNG; original_sha256 is provenance, not an original-file upload request.
export async function executeAmicMemberPhotoReplacement({ pool, manifest, plan, sourceSha, sourceTree, approval, expectedRegistrySha256,
  memberPhotoStorage, readPhotoBytes, readOnly = false, clock = () => new Date() }) {
  requireCondition(typeof expectedRegistrySha256 === "string" && SHA.test(expectedRegistrySha256), "AMIC_PHOTO_REGISTRY_PIN_REQUIRED");
  manifest = structuredClone(manifest);
  plan = structuredClone(plan);
  if (plan.environment !== "synthetic-test") clock = () => new Date();
  const verifyApproval = () => verifyAmicMemberPhotoReplacementApproval({ ...approval, registrySha256: expectedRegistrySha256, plan, sourceSha, sourceTree, now: clock() });
  verifyApproval();
  validateManifest(manifest);
  requireCondition(hashDomainValue(manifest) === plan.manifest_sha256 && hashDomainValue(manifest.tenant_id) === plan.tenant_ref_sha256,
    "AMIC_PHOTO_MANIFEST_DRIFT");
  requireCondition(typeof memberPhotoStorage?.readPhoto === "function"
    && memberPhotoStorage.storage_adapter_id === plan.photo_storage_adapter_id
    && (plan.environment === "synthetic-test" || memberPhotoStorage.storage_provider === "s3")
    && (readOnly || (typeof memberPhotoStorage.storePhoto === "function" && typeof readPhotoBytes === "function")), "AMIC_PHOTO_STORAGE_REQUIRED");
  if (plan.production_target !== null) {
    const target = validateAmicPrivateBootstrapProductionTarget(plan.production_target);
    const actual = getHrxMemberPhotoStorageTarget(memberPhotoStorage);
    requireCondition(actual && Object.isFrozen(actual) && equal(actual, photoTarget(target))
      && hashDomainValue(actual) === plan.photo_storage_target_sha256, "AMIC_PHOTO_STORAGE_TARGET_DRIFT");
  } else requireCondition(plan.environment === "synthetic-test" && plan.photo_storage_target_sha256 === hashDomainValue(null),
    "AMIC_PHOTO_STORAGE_TARGET_REQUIRED");
  const scope = { tenant_id: manifest.tenant_id, domain_id: "hrx" };
  const key = `amic-member-photo-replacement:${plan.request_ref_sha256}`;
  const ledger = (readonly) => createPostgresDomainLedger({ pool, clock, transactionOptions: { isolationLevel: "serializable", readOnly: readonly } });
  const assertBaseline = (before) => requireCondition(equal(planAmicMemberPhotoReplacement({ manifest, currentSnapshot: before,
    sourceSha, sourceTree, photoStorageAdapterId: plan.photo_storage_adapter_id, productionTarget: plan.production_target, environment: plan.environment }), plan), "AMIC_PHOTO_BASELINE_DRIFT");
  async function existing(tx, before) {
    const prior = before.idempotency_entries.find((entry) => entry.key === key);
    if (!prior) return null;
    const response = prior.response;
    requireCondition(prior.request_hash === plan.packet_sha256 && response?.packet_sha256 === plan.packet_sha256
      && response.manifest_sha256 === plan.manifest_sha256, "AMIC_PHOTO_REPLAY_CONFLICT");
    const selected = targets(manifest, before);
    requireCondition(equal(response.photos, selected.map(({ change, employee }) => ({ employee_ref_sha256: recordRef(employee),
      previous_photo: change.expected_photo, current_photo: photoOf(employee.payload) }))),
    "AMIC_PHOTO_REPLAY_STATE_DRIFT");
    const audit = before.audit_events.filter((event) => event.event_id === key && event.event_type === "hrx.member_photos.replaced" && equal(event.payload, response));
    const outbox = (await tx.listOutbox()).filter((event) => event.event_id === `outbox:${key}` && event.topic === "hrx.audit"
      && event.payload.audit_event_id === key && event.payload.payload_hash === hashDomainValue(response));
    requireCondition(audit.length === 1 && outbox.length === 1, "AMIC_PHOTO_LEDGER_READBACK");
    return { response, selected };
  }
  const prior = await ledger(true).transaction(scope, async (tx) => {
    const before = await snapshot(tx, manifest.tenant_id);
    const replay = await existing(tx, before);
    if (!replay) {
      requireCondition(!readOnly, "AMIC_PHOTO_RECEIPT_MISSING");
      assertBaseline(before);
    }
    return replay;
  });
  if (prior) {
    await verifyBodies(memberPhotoStorage, manifest, prior.selected);
    return Object.freeze({ ...prior.response, outcome: "PASS", replayed: true, read_only: readOnly, photo_body_readback_count: prior.selected.length });
  }
  const committed = [];
  let databaseCommit = "not_attempted";
  try {
    for (const change of manifest.changes) {
      verifyApproval();
      const bytes = Buffer.from(await readPhotoBytes(structuredClone(change)));
      assertValidHrxMemberPhotoPng(bytes);
      requireCondition(sha256(bytes) === change.photo_sha256 && bytes.byteLength === change.photo_byte_size, "AMIC_PHOTO_SOURCE_BYTES_DRIFT");
      const receipt = { employee_ref_sha256: recordRef({ record_type: "hrx_employees",
        record_id: createHrxDomainRecordId("hrx_employees", scopeOf(manifest, change)) }),
        photo: createHrxMemberPhotoMetadata({ ...scopeOf(manifest, change), ...change }), state: "commit_outcome_unknown" };
      verifyApproval();
      committed.push(receipt);
      receipt.photo = committedPhoto(scopeOf(manifest, change), await memberPhotoStorage.storePhoto({ ...scopeOf(manifest, change), bytes,
        expected_sha256: change.photo_sha256, idempotency_key: `photo-replace:${plan.packet_sha256}` }));
      requireCondition(receipt.photo.photo_sha256 === change.photo_sha256 && receipt.photo.photo_byte_size === change.photo_byte_size,
        "AMIC_PHOTO_STORAGE_SOURCE_DRIFT");
      await verifyBodies(memberPhotoStorage, manifest, [{ change, employee: { payload: receipt.photo } }]);
      receipt.state = "body_verified";
    }
    verifyApproval();
    databaseCommit = "unknown";
    const result = await ledger(false).transaction(scope, async (tx) => {
      const before = await snapshot(tx, manifest.tenant_id);
      const replay = await existing(tx, before);
      if (replay) return { ...replay, replayed: true };
      assertBaseline(before);
      const selected = targets(manifest, before);
      const updates = new Map(selected.map(({ employee }, index) => [recordRef(employee), committed[index].photo]));
      const records = before.records.map((record) => updates.has(recordRef(record))
        ? { ...record, payload: { ...record.payload, ...updates.get(recordRef(record)) }, state_version: record.state_version + 1 } : record);
      const after = createDomainSnapshot({ ...before, source_hash: undefined, records });
      const unchangedHash = (rows) => hashDomainValue(rows.filter((record) => !updates.has(recordRef(record))));
      requireCondition(unchangedHash(before.records) === unchangedHash(after.records), "AMIC_PHOTO_PRESERVATION_FAILED");
      const response = { schema_version: AMIC_MEMBER_PHOTO_REPLACEMENT_VERSION, packet_sha256: plan.packet_sha256,
        manifest_sha256: plan.manifest_sha256, changed_record_count: selected.length, record_count: before.records.length,
        unchanged_records_sha256: unchangedHash(after.records), record_deletion_count: 0, previous_objects_preserved: true,
        source_mutated: false, raw_identity_returned: false,
        photos: selected.map(({ change, employee }, index) => ({ employee_ref_sha256: recordRef(employee),
          previous_photo: change.expected_photo, current_photo: committed[index].photo })) };
      const source = createDomainSnapshot({ ...after, source_hash: undefined,
        idempotency_entries: [...before.idempotency_entries, { key, request_hash: plan.packet_sha256, response }],
        audit_events: [...before.audit_events, { event_id: key, event_type: "hrx.member_photos.replaced", actor_id: "private-bootstrap-owner",
          object_type: "MemberPhotoReplacement", object_id: plan.packet_sha256, payload: response, created_at: new Date(clock()).toISOString() }] });
      verifyApproval();
      await flushDomainSnapshotToScopedLedger({ tx, source, ...scope, expected_baseline: before });
      const observed = await snapshot(tx, manifest.tenant_id);
      requireCondition(observed.records.length === before.records.length && unchangedHash(observed.records) === unchangedHash(before.records),
        "AMIC_PHOTO_PRESERVATION_FAILED");
      return { ...await existing(tx, observed), replayed: false };
    });
    databaseCommit = "committed";
    await verifyBodies(memberPhotoStorage, manifest, result.selected);
    return Object.freeze({ ...result.response, outcome: "PASS", replayed: result.replayed, read_only: false,
      photo_body_readback_count: result.selected.length });
  } catch (error) {
    const failure = error instanceof Error ? error : new Error("member photo replacement failed");
    failure.recovery_receipt = Object.freeze({ schema_version: AMIC_MEMBER_PHOTO_REPLACEMENT_VERSION,
      packet_sha256: plan.packet_sha256, database_commit_state: databaseCommit,
      objects: structuredClone(committed), previous_objects_preserved: true, committed_objects_deleted: false,
      recovery_action: "read_back_ledger_and_objects_before_retry", source_mutated: false, raw_identity_returned: false });
    throw failure;
  }
}

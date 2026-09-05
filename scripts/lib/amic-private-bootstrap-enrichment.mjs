import { createDomainSnapshot, hashDomainValue } from "../../packages/persistence/src/domain-ledger.js";
import { createPostgresDomainLedger } from "../../packages/persistence/src/postgres/domain-ledger.js";
import { flushDomainSnapshotToScopedLedger } from "../../packages/persistence/src/record-domain-adapter.js";
import { prepareJsonPostgresMigrationCorpus } from "../../packages/persistence/src/postgres/json-postgres-migration.js";
import { validateRuntimeSafetyApprovalPayload } from "../../packages/runtime-auth/src/runtime-safety-approval-contract.js";

export const AMIC_BOOTSTRAP_ENRICHMENT_ACTION = "lawos-amic-private-bootstrap-enrich";
export const AMIC_BOOTSTRAP_ENRICHMENT_VERSION = "law-firm-os.amic-private-bootstrap-enrichment.v1";
const VERSION = AMIC_BOOTSTRAP_ENRICHMENT_VERSION;
const PHOTO_FIELDS = ["photo_object_id", "photo_sha256", "photo_byte_size", "photo_content_type", "photo_version_id"];
const PROFILE_FIELDS = ["legal_entity_id", "affiliation", "department", "organization_group", "country", "professional_profile"];
const TYPES = new Set(["hrx_employees", "hrx_employment_profiles", "hrx_employee_user_links"]);
const identity = (record) => `${record.record_type}:${record.record_id}`;
const missing = (value) => value === undefined || value === null || value === "";
const equal = (left, right) => hashDomainValue(left) === hashDomainValue(right);

function requireCondition(condition, code) {
  if (!condition) throw Object.assign(new Error("private bootstrap enrichment precondition failed"), { code, status: 409 });
}

function recordsHash(snapshot) {
  return createDomainSnapshot({ tenant_id: snapshot.tenant_id, domain_id: "hrx", records: snapshot.records }).snapshot_hash;
}

async function readSnapshot(tx, tenantId) {
  return createDomainSnapshot({ tenant_id: tenantId, domain_id: "hrx", records: await tx.list(),
    idempotency_entries: await tx.listIdempotency(), audit_events: await tx.listAudit() });
}

function buildEnrichment({ corpus, currentSnapshot, sourceSha, sourceTree, importPacketSha256, mappingSha256, environment }) {
  requireCondition(/^[a-f0-9]{40}$/.test(sourceSha) && /^[a-f0-9]{40}$/.test(sourceTree)
    && /^[a-f0-9]{64}$/.test(importPacketSha256) && /^[a-f0-9]{64}$/.test(mappingSha256)
    && ["synthetic-test", "lawos-private-rehearsal", "lawos-production"].includes(environment), "AMIC_ENRICHMENT_BINDING");
  const prepared = prepareJsonPostgresMigrationCorpus(corpus, { allowRealData: true });
  requireCondition(corpus.data_scope === "approved-real-manifest" && prepared.rejected.length === 0
    && prepared.snapshots.length === 1 && prepared.snapshots[0].domain_id === "hrx", "AMIC_ENRICHMENT_CORPUS");
  const desired = prepared.snapshots[0];
  const before = createDomainSnapshot(currentSnapshot);
  requireCondition(before.tenant_id === desired.tenant_id && before.domain_id === "hrx", "AMIC_ENRICHMENT_TENANT");
  requireCondition(desired.records.length > 0 && desired.records.every((record) => TYPES.has(record.record_type)), "AMIC_ENRICHMENT_RECORD_TYPES");
  const observedById = new Map(before.records.map((record) => [identity(record), record]));
  const employees = new Map();
  const profiles = new Map();
  for (const record of desired.records) {
    const current = observedById.get(identity(record));
    requireCondition(current && !current.append_only && equal(current.references, record.references)
      && current.unique_key === record.unique_key, "AMIC_ENRICHMENT_EXISTING_BASELINE_REQUIRED");
    const fields = record.record_type === "hrx_employee_user_links" ? ["employee_id", "user_id", "purpose"]
      : record.record_type === "hrx_employees" ? ["employee_id", "work_email"] : ["employee_id", "profile_id"];
    requireCondition(fields.every((field) => equal(current.payload[field], record.payload[field])), "AMIC_ENRICHMENT_IDENTITY_CONFLICT");
    if (record.record_type === "hrx_employees") {
      requireCondition(!employees.has(record.payload.employee_id), "AMIC_ENRICHMENT_DUPLICATE_EMPLOYEE");
      employees.set(record.payload.employee_id, record);
      if (record.payload.photo_object_id) requireCondition(PHOTO_FIELDS.every((field) => !missing(record.payload[field]))
        && record.payload.photo_version_id !== "pending-storage-version", "AMIC_ENRICHMENT_PHOTO_VERSION_REQUIRED");
    }
    if (record.record_type === "hrx_employment_profiles") {
      requireCondition(!profiles.has(record.payload.employee_id) && /^[A-Za-z0-9_.:-]{1,160}$/.test(record.payload.legal_entity_id), "AMIC_ENRICHMENT_PROFILE_SCOPE");
      profiles.set(record.payload.employee_id, record);
    }
  }
  requireCondition(employees.size === profiles.size && employees.size * 3 === desired.records.length
    && [...profiles.keys()].every((key) => employees.has(key)), "AMIC_ENRICHMENT_ROSTER_COVERAGE");
  const changes = [];
  let profileCoverage = 0;
  const records = before.records.map((current) => {
    const proposed = current.record_type === "hrx_employees" ? employees.get(current.payload.employee_id)
      : current.record_type === "hrx_employment_profiles" ? profiles.get(current.payload.employee_id) : null;
    if (!proposed) return current;
    requireCondition(!current.append_only, "AMIC_ENRICHMENT_APPEND_ONLY");
    const fields = current.record_type === "hrx_employees" ? ["mobile_phone", ...PHOTO_FIELDS] : PROFILE_FIELDS;
    if (current.record_type === "hrx_employment_profiles") profileCoverage += 1;
    const payload = structuredClone(current.payload);
    for (const field of fields) {
      const value = proposed.payload[field];
      if (missing(value)) continue;
      if (!missing(payload[field])) {
        // Existing facts and history are authoritative; conflicting scope or photo identity is never overwritten.
        if (field === "legal_entity_id" || PHOTO_FIELDS.includes(field)) {
          requireCondition(equal(payload[field], value), "AMIC_ENRICHMENT_FIELD_CONFLICT");
        }
        continue;
      }
      payload[field] = structuredClone(value);
    }
    const changedFields = fields.filter((field) => !equal(current.payload[field], payload[field]));
    if (changedFields.length === 0) return current;
    changes.push({ record_type: current.record_type, record_ref_sha256: hashDomainValue(identity(current)),
      before_payload_sha256: current.payload_hash, after_payload_sha256: hashDomainValue(payload),
      expected_version: current.state_version, fields: changedFields.sort() });
    return { ...current, payload, state_version: current.state_version + 1 };
  });
  const after = createDomainSnapshot({ ...before, source_hash: undefined, records });
  const material = { schema_version: VERSION, action: AMIC_BOOTSTRAP_ENRICHMENT_ACTION, environment,
    source_sha: sourceSha, source_tree: sourceTree, import_packet_sha256: importPacketSha256, mapping_sha256: mappingSha256,
    migration_manifest_sha256: prepared.manifest_sha256, tenant_ref_sha256: hashDomainValue(desired.tenant_id),
    before_snapshot_sha256: before.snapshot_hash, after_records_sha256: recordsHash(after),
    approved_roster_count: employees.size, employment_profile_coverage_count: profileCoverage, record_count: before.records.length,
    changed_record_count: changes.length, unchanged_record_count: before.records.length - changes.length, changes,
    dates_and_existing_facts_preserved: true, record_deletion_count: 0, source_mutated: false, raw_identity_returned: false };
  return { plan: Object.freeze({ ...material, packet_sha256: hashDomainValue(material) }), before, after };
}

export function planAmicPrivateBootstrapEnrichment(options) {
  return buildEnrichment(options).plan;
}

export function enrichmentApprovalDataScope(plan) {
  return ["approved-real-manifest", `private-bootstrap-import:${plan.import_packet_sha256}`, `private-bootstrap-mapping:${plan.mapping_sha256}`];
}

export function validateAmicPrivateBootstrapEnrichmentPlan(plan, { sourceSha, sourceTree } = {}) {
  const { packet_sha256: packetSha256, ...material } = plan;
  requireCondition(plan.schema_version === VERSION && plan.action === AMIC_BOOTSTRAP_ENRICHMENT_ACTION
    && (sourceSha === undefined || plan.source_sha === sourceSha) && (sourceTree === undefined || plan.source_tree === sourceTree)
    && hashDomainValue(material) === packetSha256 && /^[a-f0-9]{40}$/.test(plan.source_sha) && /^[a-f0-9]{40}$/.test(plan.source_tree)
    && plan.record_deletion_count === 0 && plan.source_mutated === false && plan.raw_identity_returned === false
    && plan.dates_and_existing_facts_preserved === true, "AMIC_ENRICHMENT_PLAN_DRIFT");
  return plan;
}

export function verifyAmicPrivateBootstrapEnrichmentApproval({ plan, sourceSha, sourceTree, registryBytes, registrySha256, receiptBytes, signatureBytes, now }) {
  requireCondition(typeof sourceSha === "string" && typeof sourceTree === "string", "AMIC_ENRICHMENT_BINDING");
  validateAmicPrivateBootstrapEnrichmentPlan(plan, { sourceSha, sourceTree });
  const packetSha256 = plan.packet_sha256;
  const receipt = JSON.parse(Buffer.from(receiptBytes).toString("utf8"));
  requireCondition(equal(receipt.data_scope, enrichmentApprovalDataScope(plan)) && equal(receipt.contact_scope, []), "AMIC_ENRICHMENT_APPROVAL_SCOPE");
  const verified = validateRuntimeSafetyApprovalPayload({ registryBytes, receiptBytes, signatureBytes, expectedRegistrySha256: registrySha256,
    expectedRole: "owner", expectedAction: AMIC_BOOTSTRAP_ENRICHMENT_ACTION, expectedEnvironment: plan.environment,
    expectedPacketSha256: packetSha256, expectedSourceSha: sourceSha, expectedSourceTree: sourceTree,
    allowedDataScope: enrichmentApprovalDataScope(plan), allowedContactScope: [], now });
  requireCondition(verified.decision === "approved", "AMIC_ENRICHMENT_APPROVAL_REJECTED");
  return verified;
}

export async function executeAmicPrivateBootstrapEnrichment({ pool, corpus, plan, sourceSha, sourceTree, approval, readOnly = false, clock = () => new Date() }) {
  verifyAmicPrivateBootstrapEnrichmentApproval({ ...approval, plan, sourceSha, sourceTree, now: clock() });
  requireCondition(hashDomainValue(corpus.tenant_id) === plan.tenant_ref_sha256, "AMIC_ENRICHMENT_TENANT");
  requireCondition(prepareJsonPostgresMigrationCorpus(corpus, { allowRealData: true }).manifest_sha256 === plan.migration_manifest_sha256,
    "AMIC_ENRICHMENT_SOURCE_DRIFT");
  const ledger = createPostgresDomainLedger({ pool, clock, transactionOptions: { isolationLevel: "serializable", readOnly } });
  const key = `amic-bootstrap-enrichment:${plan.packet_sha256}`;
  const summary = { plan_sha256: plan.packet_sha256, mapping_sha256: plan.mapping_sha256,
    record_count: plan.record_count, changed_record_count: plan.changed_record_count,
    after_records_sha256: plan.after_records_sha256, record_deletion_count: 0 };
  return ledger.transaction({ tenant_id: corpus.tenant_id, domain_id: "hrx" }, async (tx) => {
    const before = await readSnapshot(tx, corpus.tenant_id);
    const prior = before.idempotency_entries.find((entry) => entry.key === key);
    let replayed = false;
    if (prior) {
      requireCondition(prior.request_hash === plan.packet_sha256 && equal(prior.response, summary), "AMIC_ENRICHMENT_REPLAY_CONFLICT");
      replayed = true;
    } else {
      requireCondition(!readOnly, "AMIC_ENRICHMENT_RECEIPT_MISSING");
      const rebuilt = buildEnrichment({ corpus, currentSnapshot: before, sourceSha, sourceTree, importPacketSha256: plan.import_packet_sha256,
        mappingSha256: plan.mapping_sha256, environment: plan.environment });
      requireCondition(equal(rebuilt.plan, plan), "AMIC_ENRICHMENT_BASELINE_DRIFT");
      const source = createDomainSnapshot({ ...rebuilt.after, source_hash: undefined,
        idempotency_entries: [...before.idempotency_entries, { key, request_hash: plan.packet_sha256, response: summary }],
        audit_events: [...before.audit_events, { event_id: key, event_type: "hrx.private_bootstrap.enriched", actor_id: "private-bootstrap-owner",
          object_type: "PrivateBootstrapEnrichment", object_id: plan.packet_sha256, payload: summary, created_at: new Date(clock()).toISOString() }] });
      await flushDomainSnapshotToScopedLedger({ tx, source, tenant_id: corpus.tenant_id, domain_id: "hrx", expected_baseline: before });
    }
    const observed = await readSnapshot(tx, corpus.tenant_id);
    const audit = observed.audit_events.filter((event) => event.event_id === key && event.event_type === "hrx.private_bootstrap.enriched" && equal(event.payload, summary));
    const outbox = (await tx.listOutbox()).filter((event) => event.event_id === `outbox:${key}` && event.topic === "hrx.audit"
      && event.payload.audit_event_id === key && event.payload.payload_hash === hashDomainValue(summary));
    requireCondition(recordsHash(observed) === plan.after_records_sha256 && observed.records.length === plan.record_count
      && audit.length === 1 && outbox.length === 1, "AMIC_ENRICHMENT_READBACK_FAILED");
    return Object.freeze({ schema_version: VERSION, outcome: "PASS", packet_sha256: plan.packet_sha256, replayed,
      record_count: observed.records.length, changed_record_count: plan.changed_record_count, preserved_record_count: plan.unchanged_record_count,
      record_readback_sha256: recordsHash(observed), audit_count: 1, outbox_count: 1, read_only: readOnly,
      record_deletion_count: 0, identity_write: false, photo_write: false, source_mutated: false, raw_identity_returned: false, production_ready_claim: false });
  });
}

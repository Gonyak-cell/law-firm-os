import { createHash } from "node:crypto";

export const DOMAIN_LEDGER_CONTRACT_VERSION = "law-firm-os.domain-ledger.v0.1";
export const DOMAIN_MIGRATION_RECEIPT_SCHEMA_VERSION = "law-firm-os.domain-migration-receipt.v0.1";
export const DOMAIN_IDS = Object.freeze([
  "master-data",
  "matter",
  "crm",
  "intake",
  "hrx",
  "finance",
  "client-portal",
  "ai-governance",
  "dms",
  "dms-auxiliary",
  "analytics",
  "ui-readiness",
  "enterprise-readiness",
]);

const HASH_PATTERN = /^[a-f0-9]{64}$/u;

function canonicalValue(value) {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.keys(value).sort().map((key) => [key, canonicalValue(value[key])]),
  );
}

function requiredText(value, name) {
  const text = String(value ?? "").trim();
  if (!text) throw new TypeError(`${name} is required`);
  return text;
}

function optionalText(value) {
  const text = String(value ?? "").trim();
  return text || null;
}

export function hashDomainValue(value) {
  return createHash("sha256").update(JSON.stringify(canonicalValue(value ?? null))).digest("hex");
}

export function requireDomainId(value) {
  const domainId = requiredText(value, "domain_id");
  if (!DOMAIN_IDS.includes(domainId)) throw new TypeError(`unsupported domain_id: ${domainId}`);
  return domainId;
}

export function requireDomainHash(value, name = "hash") {
  const hash = requiredText(value, name);
  if (!HASH_PATTERN.test(hash)) throw new TypeError(`${name} must be a SHA-256 hash`);
  return hash;
}

const REQUIRED_SMOKE_CHECKS = Object.freeze([
  "source_imported",
  "idempotency_replayed",
  "shadow_equal",
  "readback_equal",
  "json_dual_write_absent",
]);

export function normalizeDomainSmokeResult(input = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError("smoke_result must be an object");
  }
  if (input.status !== "passed") throw new TypeError("smoke_result status must be passed");
  if (input.synthetic_only !== true) throw new TypeError("smoke_result must be synthetic-only");
  if (input.production_migrated !== false) throw new TypeError("smoke_result production_migrated must be false");
  const environment = requiredText(input.environment, "smoke_result environment");
  if (!new Set(["test", "staging"]).has(environment)) throw new TypeError("smoke_result environment must be test or staging");
  const executedAt = new Date(input.executed_at);
  if (!Number.isFinite(executedAt.getTime())) throw new TypeError("smoke_result executed_at must be a valid timestamp");
  const checks = input.checks;
  if (!checks || typeof checks !== "object" || Array.isArray(checks)) throw new TypeError("smoke_result checks are required");
  for (const check of REQUIRED_SMOKE_CHECKS) {
    if (checks[check] !== true) throw new TypeError(`smoke_result check failed: ${check}`);
  }
  return Object.freeze({
    status: "passed",
    synthetic_only: true,
    environment,
    adapter: requiredText(input.adapter, "smoke_result adapter"),
    executed_at: executedAt.toISOString(),
    source_snapshot_hash: requireDomainHash(input.source_snapshot_hash, "smoke_result source_snapshot_hash"),
    checks: Object.freeze(Object.fromEntries(REQUIRED_SMOKE_CHECKS.map((check) => [check, true]))),
    safe_counts: Object.freeze(structuredClone(input.safe_counts ?? {})),
    production_migrated: false,
  });
}

function normalizeReference(input, tenantId) {
  const targetDomainId = requireDomainId(input?.target_domain_id);
  const targetRecordType = requiredText(input?.target_record_type, "target_record_type");
  const targetRecordId = requiredText(input?.target_record_id, "target_record_id");
  const referenceName = requiredText(input?.reference_name, "reference_name");
  if (input?.tenant_id && input.tenant_id !== tenantId) {
    throw new TypeError("domain reference tenant scope mismatch");
  }
  return Object.freeze({
    tenant_id: tenantId,
    reference_name: referenceName,
    target_domain_id: targetDomainId,
    target_record_type: targetRecordType,
    target_record_id: targetRecordId,
  });
}

export function normalizeDomainIdempotency(input = {}, {
  tenant_id: scopeTenantId,
  domain_id: scopeDomainId,
} = {}) {
  const tenantId = requiredText(input.tenant_id ?? scopeTenantId, "tenant_id");
  const domainId = requireDomainId(input.domain_id ?? scopeDomainId);
  if (scopeTenantId && tenantId !== scopeTenantId) throw new TypeError("domain idempotency tenant scope mismatch");
  if (scopeDomainId && domainId !== scopeDomainId) throw new TypeError("domain idempotency domain scope mismatch");
  const key = requiredText(input.key ?? input.idempotency_key, "idempotency key");
  const requestHash = input.request_hash
    ? requireDomainHash(input.request_hash, "idempotency request_hash")
    : hashDomainValue({ operation: input.operation ?? "imported_domain_operation", key });
  const response = structuredClone(input.response ?? null);
  return Object.freeze({
    tenant_id: tenantId,
    domain_id: domainId,
    key,
    request_hash: requestHash,
    response,
    response_hash: hashDomainValue(response),
    created_at: input.created_at ?? null,
  });
}

export function normalizeDomainAuditEvent(input = {}, {
  tenant_id: scopeTenantId,
  domain_id: scopeDomainId,
} = {}) {
  const tenantId = requiredText(input.tenant_id ?? scopeTenantId, "tenant_id");
  const domainId = requireDomainId(input.domain_id ?? scopeDomainId);
  if (scopeTenantId && tenantId !== scopeTenantId) throw new TypeError("domain audit tenant scope mismatch");
  if (scopeDomainId && domainId !== scopeDomainId) throw new TypeError("domain audit domain scope mismatch");
  const eventId = requiredText(input.event_id, "audit event_id");
  const eventType = requiredText(input.event_type ?? input.action, "audit event_type");
  const payload = structuredClone(input.payload ?? {});
  return Object.freeze({
    tenant_id: tenantId,
    domain_id: domainId,
    event_id: eventId,
    event_type: eventType,
    actor_id: optionalText(input.actor_id),
    object_type: optionalText(input.object_type),
    object_id: optionalText(input.object_id),
    payload,
    payload_hash: hashDomainValue(payload),
    created_at: input.created_at ?? null,
  });
}

export function normalizeDomainRecord(input = {}, {
  tenant_id: scopeTenantId,
  domain_id: scopeDomainId,
} = {}) {
  const tenantId = requiredText(input.tenant_id ?? scopeTenantId, "tenant_id");
  const domainId = requireDomainId(input.domain_id ?? scopeDomainId);
  if (scopeTenantId && tenantId !== scopeTenantId) throw new TypeError("domain record tenant scope mismatch");
  if (scopeDomainId && domainId !== scopeDomainId) throw new TypeError("domain record domain scope mismatch");
  const recordType = requiredText(input.record_type, "record_type");
  const recordId = requiredText(input.record_id, "record_id");
  const stateVersion = Number(input.state_version ?? 1);
  if (!Number.isSafeInteger(stateVersion) || stateVersion < 0) {
    throw new TypeError("state_version must be a non-negative integer");
  }
  const payload = structuredClone(input.payload ?? {});
  const references = Object.freeze(
    (input.references ?? [])
      .map((reference) => normalizeReference(reference, tenantId))
      .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right))),
  );
  return Object.freeze({
    tenant_id: tenantId,
    domain_id: domainId,
    record_type: recordType,
    record_id: recordId,
    state_version: Math.max(1, stateVersion),
    unique_key: optionalText(input.unique_key),
    payload,
    payload_hash: hashDomainValue(payload),
    append_only: input.append_only === true,
    references,
    created_at: input.created_at ?? null,
    updated_at: input.updated_at ?? null,
  });
}

function recordKey(record) {
  return `${record.tenant_id}:${record.domain_id}:${record.record_type}:${record.record_id}`;
}

function uniqueKey(record) {
  return record.unique_key
    ? `${record.tenant_id}:${record.domain_id}:${record.record_type}:${record.unique_key}`
    : null;
}

function recordFingerprint(record) {
  return {
    tenant_id: record.tenant_id,
    domain_id: record.domain_id,
    record_type: record.record_type,
    record_id: record.record_id,
    state_version: record.state_version,
    unique_key: record.unique_key,
    payload_hash: record.payload_hash,
    append_only: record.append_only,
    references: record.references,
  };
}

export function createDomainSnapshot({
  tenant_id,
  domain_id,
  records = [],
  idempotency_entries = [],
  audit_events = [],
  source_hash,
} = {}) {
  const tenantId = requiredText(tenant_id, "tenant_id");
  const domainId = requireDomainId(domain_id);
  const normalized = records
    .map((record) => normalizeDomainRecord(record, { tenant_id: tenantId, domain_id: domainId }))
    .sort((left, right) => recordKey(left).localeCompare(recordKey(right)));
  const identities = new Set();
  const uniqueKeys = new Set();
  const idempotencyKeys = new Set();
  const auditEventIds = new Set();
  for (const record of normalized) {
    const identity = recordKey(record);
    if (identities.has(identity)) throw new TypeError(`duplicate domain record identity: ${record.record_type}`);
    identities.add(identity);
    const unique = uniqueKey(record);
    if (unique && uniqueKeys.has(unique)) throw new TypeError(`duplicate domain unique key: ${record.record_type}`);
    if (unique) uniqueKeys.add(unique);
  }
  for (const record of normalized) {
    for (const reference of record.references) {
      if (reference.target_domain_id !== domainId) continue;
      const target = `${reference.tenant_id}:${reference.target_domain_id}:${reference.target_record_type}:${reference.target_record_id}`;
      if (!identities.has(target)) {
        throw new TypeError(`orphan domain reference: ${record.record_type}.${reference.reference_name}`);
      }
    }
  }
  const normalizedIdempotency = idempotency_entries
    .map((entry) => normalizeDomainIdempotency(entry, { tenant_id: tenantId, domain_id: domainId }))
    .sort((left, right) => left.key.localeCompare(right.key));
  for (const entry of normalizedIdempotency) {
    if (idempotencyKeys.has(entry.key)) throw new TypeError("duplicate domain idempotency key");
    idempotencyKeys.add(entry.key);
  }
  const normalizedAudit = audit_events
    .map((event) => normalizeDomainAuditEvent(event, { tenant_id: tenantId, domain_id: domainId }))
    .sort((left, right) => left.event_id.localeCompare(right.event_id));
  for (const event of normalizedAudit) {
    if (auditEventIds.has(event.event_id)) throw new TypeError("duplicate domain audit event");
    auditEventIds.add(event.event_id);
  }
  const byType = Object.fromEntries(
    [...new Set(normalized.map((record) => record.record_type))]
      .sort()
      .map((recordType) => [recordType, normalized.filter((record) => record.record_type === recordType).length]),
  );
  const invariantSummary = Object.freeze({
    record_count: normalized.length,
    record_type_counts: byType,
    append_only_count: normalized.filter((record) => record.append_only).length,
    unique_key_count: uniqueKeys.size,
    reference_count: normalized.reduce((total, record) => total + record.references.length, 0),
    state_version_counts: Object.fromEntries(
      [...new Set(normalized.map((record) => record.state_version))]
        .sort((left, right) => left - right)
        .map((version) => [String(version), normalized.filter((record) => record.state_version === version).length]),
    ),
    idempotency_count: normalizedIdempotency.length,
    audit_event_count: normalizedAudit.length,
    duplicate_identity_count: 0,
    duplicate_unique_key_count: 0,
    orphan_reference_count: 0,
    tenant_mismatch_count: 0,
  });
  const snapshotHash = hashDomainValue({
    records: normalized.map(recordFingerprint),
    idempotency: normalizedIdempotency.map((entry) => ({
      tenant_id: entry.tenant_id,
      domain_id: entry.domain_id,
      key: entry.key,
      request_hash: entry.request_hash,
      response_hash: entry.response_hash,
    })),
    audit_events: normalizedAudit.map((event) => ({
      tenant_id: event.tenant_id,
      domain_id: event.domain_id,
      event_id: event.event_id,
      event_type: event.event_type,
      actor_id: event.actor_id,
      object_type: event.object_type,
      object_id: event.object_id,
      payload_hash: event.payload_hash,
    })),
  });
  return Object.freeze({
    contract_version: DOMAIN_LEDGER_CONTRACT_VERSION,
    tenant_id: tenantId,
    domain_id: domainId,
    source_hash: source_hash ? requireDomainHash(source_hash, "source_hash") : snapshotHash,
    snapshot_hash: snapshotHash,
    invariant_hash: hashDomainValue(invariantSummary),
    invariant_summary: invariantSummary,
    records: Object.freeze(normalized),
    idempotency_entries: Object.freeze(normalizedIdempotency),
    audit_events: Object.freeze(normalizedAudit),
  });
}

export function compareDomainSnapshots(source, target) {
  const left = createDomainSnapshot(source);
  const right = createDomainSnapshot(target);
  if (left.tenant_id !== right.tenant_id || left.domain_id !== right.domain_id) {
    throw new TypeError("domain snapshots must have the same tenant and domain");
  }
  const entries = (snapshot) => [
    ...snapshot.records.map((record) => [
      `record:${recordKey(record)}`,
      hashDomainValue(recordFingerprint(record)),
    ]),
    ...snapshot.idempotency_entries.map((entry) => [
      `idempotency:${entry.tenant_id}:${entry.domain_id}:${entry.key}`,
      hashDomainValue({ request_hash: entry.request_hash, response_hash: entry.response_hash }),
    ]),
    ...snapshot.audit_events.map((event) => [
      `audit:${event.tenant_id}:${event.domain_id}:${event.event_id}`,
      hashDomainValue({
        event_type: event.event_type,
        actor_id: event.actor_id,
        object_type: event.object_type,
        object_id: event.object_id,
        payload_hash: event.payload_hash,
      }),
    ]),
  ];
  const leftMap = new Map(entries(left));
  const rightMap = new Map(entries(right));
  const differingKeys = [...new Set([...leftMap.keys(), ...rightMap.keys()])]
    .filter((key) => leftMap.get(key) !== rightMap.get(key))
    .sort();
  return Object.freeze({
    equal: differingKeys.length === 0,
    source_hash: left.snapshot_hash,
    target_hash: right.snapshot_hash,
    source_count: left.records.length,
    target_count: right.records.length,
    difference_count: differingKeys.length,
    difference_fingerprint: hashDomainValue(differingKeys),
    invariant_hash: hashDomainValue({
      source: left.invariant_summary,
      target: right.invariant_summary,
    }),
  });
}

export function domainReceiptId(kind, value) {
  const prefix = requiredText(kind, "receipt kind").replace(/[^a-z0-9-]/gu, "-");
  return `${prefix}-${hashDomainValue(value).slice(0, 32)}`;
}

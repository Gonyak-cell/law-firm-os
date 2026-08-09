import {
  compareDomainSnapshots,
  createDomainSnapshot,
  hashDomainValue,
  requireDomainId,
} from "./domain-ledger.js";

function requiredText(value, name) {
  const text = String(value ?? "").trim();
  if (!text) throw new TypeError(`${name} is required`);
  return text;
}

function clone(value) {
  return value === undefined ? undefined : structuredClone(value);
}

const materializedBaselines = new WeakMap();
const materializedReadOnlyShadows = new WeakMap();
const materializedCanonicalAuditEvents = new WeakMap();
const IDEMPOTENCY_AUTHORITY_FIELD = "__lawos_idempotency_authority_v1";
const IDEMPOTENCY_RESPONSE_FIELD = "__lawos_idempotency_response_v1";
const IDEMPOTENCY_AUTHORITY_KEYS = Object.freeze([
  "actor_id", "object_id", "object_type", "operation", "request_fingerprint",
]);

function responseWithIdempotencyAuthority(entry) {
  const response = clone(entry.response ?? null);
  const requestFingerprint = String(entry.request_fingerprint ?? "").trim();
  if (!requestFingerprint) return response;
  const authority = Object.freeze({
    operation: requiredText(entry.operation, "idempotency operation"),
    actor_id: entry.actor_id ?? null,
    object_type: entry.object_type ?? null,
    object_id: entry.object_id ?? null,
    request_fingerprint: requestFingerprint,
  });
  if (response && typeof response === "object" && !Array.isArray(response)) {
    if (Object.hasOwn(response, IDEMPOTENCY_AUTHORITY_FIELD)) {
      throw new TypeError("idempotency response uses a reserved authority field");
    }
    return { ...response, [IDEMPOTENCY_AUTHORITY_FIELD]: authority };
  }
  return {
    [IDEMPOTENCY_AUTHORITY_FIELD]: authority,
    [IDEMPOTENCY_RESPONSE_FIELD]: response,
  };
}

function exactKeys(value, expected) {
  return JSON.stringify(Object.keys(value).sort()) === JSON.stringify(expected);
}

function exactIdempotencyAuthority(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)
      || !exactKeys(value, IDEMPOTENCY_AUTHORITY_KEYS)
      || typeof value.operation !== "string" || !value.operation.trim()
      || typeof value.request_fingerprint !== "string" || !value.request_fingerprint.trim()) {
    return false;
  }
  return ["actor_id", "object_type", "object_id"].every((field) => (
    value[field] === null || (typeof value[field] === "string" && value[field].trim())
  ));
}

function idempotencyAuthorityState(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "malformed";
  const keys = Object.keys(value).sort();
  if (keys.some((key) => !IDEMPOTENCY_AUTHORITY_KEYS.includes(key))) return "malformed";
  if (keys.length < IDEMPOTENCY_AUTHORITY_KEYS.length) return "partial";
  return exactIdempotencyAuthority(value) ? "valid" : "malformed";
}

export function decodeRecordDomainIdempotencyResponse(value, { inspection = false } = {}) {
  const response = clone(value ?? null);
  if (!response || typeof response !== "object" || Array.isArray(response)) {
    return Object.freeze({ authority: null, authority_state: "absent", response });
  }
  if (!Object.hasOwn(response, IDEMPOTENCY_AUTHORITY_FIELD)) {
    return Object.freeze({ authority: null, authority_state: "absent", response });
  }
  const authority = response[IDEMPOTENCY_AUTHORITY_FIELD];
  const authorityState = idempotencyAuthorityState(authority);
  const authorityOperationHint = inspection
    && typeof authority?.operation === "string"
    && authority.operation.trim()
    ? authority.operation.trim()
    : null;
  delete response[IDEMPOTENCY_AUTHORITY_FIELD];
  if (Object.hasOwn(response, IDEMPOTENCY_RESPONSE_FIELD)) {
    const unwrapped = clone(response[IDEMPOTENCY_RESPONSE_FIELD]);
    delete response[IDEMPOTENCY_RESPONSE_FIELD];
    if (Object.keys(response).length > 0 && !inspection) {
      throw new TypeError("idempotency response envelope contains unexpected fields");
    }
    return Object.freeze({
      authority: authorityState === "valid" && Object.keys(response).length === 0
        ? clone(authority) : null,
      authority_state: Object.keys(response).length === 0 ? authorityState : "malformed",
      ...(inspection ? { authority_operation_hint: authorityOperationHint } : {}),
      response: unwrapped,
    });
  }
  return Object.freeze({
    authority: authorityState === "valid" ? clone(authority) : null,
    authority_state: authorityState,
    ...(inspection ? { authority_operation_hint: authorityOperationHint } : {}),
    response,
  });
}

function recordIdentity(domainId, recordType, recordId) {
  return `${domainId}:${recordType}:${recordId}`;
}

function compareCommittedDomainSnapshotWithReadback(source, target) {
  const recordKeys = new Set(source.records.map((record) =>
    recordIdentity(source.domain_id, record.record_type, record.record_id)));
  const idempotencyKeys = new Set(source.idempotency_entries.map((entry) => entry.key));
  const auditEventIds = new Set(source.audit_events.map((event) => event.event_id));
  const committedReadback = createDomainSnapshot({
    tenant_id: target.tenant_id,
    domain_id: target.domain_id,
    records: target.records.filter((record) =>
      recordKeys.has(recordIdentity(target.domain_id, record.record_type, record.record_id))),
    idempotency_entries: target.idempotency_entries.filter((entry) => idempotencyKeys.has(entry.key)),
    audit_events: target.audit_events.filter((event) => auditEventIds.has(event.event_id)),
  });
  return compareDomainSnapshots(source, committedReadback);
}

function compareDomainBaselineWithConcurrentReadback(expected, current) {
  const expectedRecordKeys = new Set(expected.records.map((record) =>
    recordIdentity(expected.domain_id, record.record_type, record.record_id)));
  const unexpectedMutableRecords = current.records.filter((record) =>
    !record.append_only
    && !expectedRecordKeys.has(recordIdentity(current.domain_id, record.record_type, record.record_id)));
  if (unexpectedMutableRecords.length > 0) {
    return Object.freeze({
      equal: false,
      difference_count: unexpectedMutableRecords.length,
      difference_fingerprint: hashDomainValue(unexpectedMutableRecords.map((record) => ({
        record_type: record.record_type,
        record_id: record.record_id,
        state_version: record.state_version,
      }))),
    });
  }
  return compareCommittedDomainSnapshotWithReadback(expected, current);
}

export function applyCommittedStateVersions(source, baseline) {
  if (!baseline) return source;
  const priorByIdentity = new Map(baseline.records.map((record) => [
    recordIdentity(record.domain_id, record.record_type, record.record_id),
    record,
  ]));
  const records = source.records.map((record) => {
    const prior = priorByIdentity.get(recordIdentity(record.domain_id, record.record_type, record.record_id));
    if (!prior) return { ...record, state_version: 1 };
    const changed = prior.payload_hash !== record.payload_hash
      || prior.unique_key !== record.unique_key
      || prior.append_only !== record.append_only
      || hashDomainValue(prior.references) !== hashDomainValue(record.references);
    return {
      ...record,
      state_version: changed ? prior.state_version + 1 : prior.state_version,
    };
  });
  return createDomainSnapshot({
    tenant_id: source.tenant_id,
    domain_id: source.domain_id,
    records,
    idempotency_entries: source.idempotency_entries,
    audit_events: source.audit_events,
  });
}

function normalizeSources(repositories) {
  const sources = Array.isArray(repositories) ? repositories : [repositories];
  if (!sources.length) throw new TypeError("at least one source repository is required");
  return sources.map((entry, index) => {
    const repository = entry?.repository ?? entry;
    if (!repository || typeof repository.snapshot !== "function") {
      throw new TypeError("source repository snapshot method is required");
    }
    return Object.freeze({
      source_id: requiredText(entry?.source_id ?? `source-${index + 1}`, "source_id"),
      repository,
    });
  });
}

export function createRecordDomainDescriptor({
  domain_id,
  resolve_record_id,
  unique_key = () => null,
  append_only = () => false,
  references = () => [],
  read_only_shadow_record_types = [],
  pii_fields = [],
  primary_key_fields = [],
  unique_rules = [],
  reference_rules = [],
} = {}) {
  const domainId = requireDomainId(domain_id);
  if (typeof resolve_record_id !== "function") throw new TypeError("resolve_record_id is required");
  if (!Array.isArray(read_only_shadow_record_types)) {
    throw new TypeError("read_only_shadow_record_types must be an array");
  }
  const readOnlyShadowRecordTypes = Object.freeze(
    [...new Set(read_only_shadow_record_types.map((value) =>
      requiredText(value, "read_only_shadow_record_type")))].sort(),
  );
  for (const [value, name] of [
    [unique_key, "unique_key"],
    [append_only, "append_only"],
    [references, "references"],
  ]) {
    if (typeof value !== "function") throw new TypeError(`${name} must be a function`);
  }
  return Object.freeze({
    domain_id: domainId,
    resolve_record_id,
    unique_key,
    append_only,
    references,
    read_only_shadow_record_types: readOnlyShadowRecordTypes,
    inventory: Object.freeze({
      read_only_shadow_record_types: readOnlyShadowRecordTypes,
      pii_fields: Object.freeze([...new Set(pii_fields)].sort()),
      primary_key_fields: Object.freeze([...new Set(primary_key_fields)].sort()),
      unique_rules: Object.freeze([...new Set(unique_rules)].sort()),
      reference_rules: Object.freeze([...new Set(reference_rules)].sort()),
    }),
  });
}

export function createRecordRepositoryDomainSnapshot({
  descriptor,
  repositories,
  tenant_id,
} = {}) {
  const tenantId = requiredText(tenant_id, "tenant_id");
  if (!descriptor || typeof descriptor.resolve_record_id !== "function") {
    throw new TypeError("record domain descriptor is required");
  }
  const sources = normalizeSources(repositories);
  const sourceStates = sources.map(({ source_id, repository }) => {
    const state = repository.snapshot();
    return Object.freeze({
      source_id,
      records: (state.records ?? []).filter((record) => record.tenant_id === tenantId),
      read_only_shadow_records: materializedReadOnlyShadows.get(repository) ?? Object.freeze([]),
      canonical_audit_events: materializedCanonicalAuditEvents.get(repository) ?? Object.freeze([]),
      idempotency: (state.idempotency ?? []).filter((entry) => entry.tenant_id === tenantId),
      audit_events: (state.audit_events ?? []).filter((event) => event.tenant_id === tenantId),
    });
  });
  const rawRecords = new Map();
  const readOnlyShadowRecords = new Map();
  const allowedReadOnlyShadowTypes = new Set(descriptor.read_only_shadow_record_types ?? []);
  let duplicateRecordCount = 0;
  for (const source of sourceStates) {
    for (const record of source.records) {
      const recordType = requiredText(record.model_type, "model_type");
      const recordId = requiredText(descriptor.resolve_record_id(record), `${recordType} record id`);
      const key = recordIdentity(descriptor.domain_id, recordType, recordId);
      const prior = rawRecords.get(key);
      if (prior) {
        if (hashDomainValue(prior) !== hashDomainValue(record)) {
          throw Object.assign(new Error(`conflicting duplicate source record: ${recordType}`), {
            code: "LAWOS_DOMAIN_SOURCE_CONFLICT",
            safe_error_code: "DOMAIN_SOURCE_CONFLICT",
            status: 409,
          });
        }
        duplicateRecordCount += 1;
        continue;
      }
      rawRecords.set(key, clone(record));
    }
    for (const record of source.read_only_shadow_records) {
      const recordType = requiredText(record.record_type, "read-only shadow record_type");
      const recordId = requiredText(record.record_id, "read-only shadow record_id");
      if (
        record.tenant_id !== tenantId
        || record.domain_id !== descriptor.domain_id
        || !allowedReadOnlyShadowTypes.has(recordType)
      ) {
        throw new TypeError("read-only shadow record is outside the descriptor boundary");
      }
      const key = recordIdentity(descriptor.domain_id, recordType, recordId);
      const prior = rawRecords.get(key) ?? readOnlyShadowRecords.get(key);
      if (prior) {
        if (hashDomainValue(prior) !== hashDomainValue(record)) {
          throw Object.assign(new Error(`conflicting duplicate source record: ${recordType}`), {
            code: "LAWOS_DOMAIN_SOURCE_CONFLICT",
            safe_error_code: "DOMAIN_SOURCE_CONFLICT",
            status: 409,
          });
        }
        duplicateRecordCount += 1;
        continue;
      }
      readOnlyShadowRecords.set(key, clone(record));
    }
  }
  const knownIdentities = new Set([...rawRecords.keys(), ...readOnlyShadowRecords.keys()]);
  let externalReferenceCount = 0;
  let optionalMissingReferenceCount = 0;
  const records = [...rawRecords.entries()].map(([identity, record]) => {
    const recordType = record.model_type;
    const recordId = descriptor.resolve_record_id(record);
    const normalizedReferences = [];
    for (const reference of descriptor.references(record) ?? []) {
      const targetDomainId = requireDomainId(reference.target_domain_id ?? descriptor.domain_id);
      const targetRecordType = requiredText(reference.target_record_type, "target_record_type");
      const targetRecordId = requiredText(reference.target_record_id, "target_record_id");
      if (targetDomainId !== descriptor.domain_id) {
        externalReferenceCount += 1;
        continue;
      }
      const targetIdentity = recordIdentity(targetDomainId, targetRecordType, targetRecordId);
      if (!knownIdentities.has(targetIdentity)) {
        if (reference.required === true) {
          throw Object.assign(new Error(`required domain reference is missing: ${recordType}.${reference.reference_name}`), {
            code: "LAWOS_DOMAIN_REFERENCE_MISSING",
            safe_error_code: "DOMAIN_REFERENCE_MISSING",
            status: 409,
          });
        }
        optionalMissingReferenceCount += 1;
        continue;
      }
      normalizedReferences.push({
        reference_name: requiredText(reference.reference_name, "reference_name"),
        target_domain_id: targetDomainId,
        target_record_type: targetRecordType,
        target_record_id: targetRecordId,
      });
    }
    return {
      tenant_id: tenantId,
      domain_id: descriptor.domain_id,
      record_type: recordType,
      record_id: recordId,
      unique_key: descriptor.unique_key(record) ?? null,
      append_only: descriptor.append_only(record) === true,
      payload: clone(record),
      references: normalizedReferences,
      source_identity_hash: hashDomainValue(identity),
    };
  });
  records.push(...[...readOnlyShadowRecords.values()].map(clone));
  const idempotencyMap = new Map();
  for (const source of sourceStates) {
    for (const entry of source.idempotency) {
      const key = requiredText(entry.idempotency_key ?? entry.key, "idempotency key");
      const normalized = {
        tenant_id: tenantId,
        domain_id: descriptor.domain_id,
        key,
        request_hash: entry.request_hash
          ?? entry.request_fingerprint
          ?? (String(entry.operation ?? "").startsWith("request-hash:")
            ? String(entry.operation).slice("request-hash:".length)
            : hashDomainValue({
              operation: entry.operation ?? "imported_domain_operation",
              key,
            })),
        response: responseWithIdempotencyAuthority(entry),
        created_at: entry.created_at ?? null,
      };
      const prior = idempotencyMap.get(key);
      if (prior && hashDomainValue(prior) !== hashDomainValue(normalized)) {
        throw Object.assign(new Error("conflicting duplicate idempotency source"), {
          code: "LAWOS_DOMAIN_SOURCE_CONFLICT",
          safe_error_code: "DOMAIN_SOURCE_CONFLICT",
          status: 409,
        });
      }
      idempotencyMap.set(key, normalized);
    }
  }
  const auditMap = new Map();
  for (const source of sourceStates) {
    const canonicalAuditById = new Map(
      source.canonical_audit_events.map((event) => [event.event_id, event]),
    );
    for (const event of source.audit_events) {
      const eventId = requiredText(event.event_id, "audit event_id");
      const canonical = canonicalAuditById.get(eventId);
      const normalized = canonical ? clone(canonical) : {
        tenant_id: tenantId,
        domain_id: descriptor.domain_id,
        event_id: eventId,
        event_type: requiredText(event.event_type ?? event.action, "audit event_type"),
        actor_id: event.actor_id ?? null,
        object_type: event.object_type ?? null,
        object_id: event.object_id ?? null,
        payload: event.payload?.source_payload_included === false && event.payload?.imported_event_hash
          ? clone(event.payload)
          : {
            imported_event_hash: hashDomainValue(event),
            source_payload_included: false,
          },
        created_at: event.created_at ?? null,
      };
      const prior = auditMap.get(eventId);
      if (prior && hashDomainValue(prior) !== hashDomainValue(normalized)) {
        throw Object.assign(new Error("conflicting duplicate audit source"), {
          code: "LAWOS_DOMAIN_SOURCE_CONFLICT",
          safe_error_code: "DOMAIN_SOURCE_CONFLICT",
          status: 409,
        });
      }
      auditMap.set(eventId, normalized);
    }
  }
  const sourceHash = hashDomainValue(sourceStates.map((source) => ({
    source_id: source.source_id,
    records: source.records,
    read_only_shadow_records: source.read_only_shadow_records,
    canonical_audit_events: source.canonical_audit_events,
    idempotency: source.idempotency,
    audit_events: source.audit_events,
  })));
  const snapshot = createDomainSnapshot({
    tenant_id: tenantId,
    domain_id: descriptor.domain_id,
    records,
    idempotency_entries: [...idempotencyMap.values()],
    audit_events: [...auditMap.values()],
    source_hash: sourceHash,
  });
  return Object.freeze({
    snapshot,
    inventory: Object.freeze({
      domain_id: descriptor.domain_id,
      source_ids: Object.freeze(sourceStates.map((source) => source.source_id)),
      source_record_count: sourceStates.reduce(
        (total, source) => total + source.records.length + source.read_only_shadow_records.length,
        0,
      ),
      canonical_record_count: snapshot.records.length,
      duplicate_record_count: duplicateRecordCount,
      read_only_shadow_record_count: readOnlyShadowRecords.size,
      conflicting_duplicate_count: 0,
      external_reference_count: externalReferenceCount,
      optional_missing_reference_count: optionalMissingReferenceCount,
      tenant_mismatch_count: 0,
      pii_field_names: descriptor.inventory.pii_fields,
      primary_key_fields: descriptor.inventory.primary_key_fields,
      unique_rules: descriptor.inventory.unique_rules,
      reference_rules: descriptor.inventory.reference_rules,
      record_type_counts: snapshot.invariant_summary.record_type_counts,
    }),
  });
}

export async function materializeRecordRepositoryFromDomainLedger({
  ledger,
  descriptor,
  tenant_id,
  create_repository,
} = {}) {
  if (!ledger || typeof ledger.list !== "function") throw new TypeError("domain ledger is required");
  if (typeof create_repository !== "function") throw new TypeError("create_repository is required");
  const scope = { tenant_id, domain_id: descriptor.domain_id };
  const records = await ledger.list(scope);
  const readOnlyShadowTypes = new Set(descriptor.read_only_shadow_record_types ?? []);
  const readOnlyShadowRecords = records.filter((record) =>
    readOnlyShadowTypes.has(record.record_type));
  const idempotency = await ledger.listIdempotency(scope);
  const auditEvents = await ledger.listAudit(scope);
  const repository = create_repository({
    seedRecords: records
      .filter((record) => !readOnlyShadowTypes.has(record.record_type))
      .map((record) => clone(record.payload)),
    preserveSeedRecords: true,
  });
  for (const entry of idempotency) {
    const decoded = decodeRecordDomainIdempotencyResponse(entry.response);
    repository.recordIdempotency?.({
      tenant_id,
      idempotency_key: entry.key,
      operation: decoded.authority?.operation ?? `request-hash:${entry.request_hash}`,
      object_type: decoded.authority?.object_type ?? null,
      object_id: decoded.authority?.object_id ?? null,
      actor_id: decoded.authority?.actor_id ?? null,
      request_fingerprint: decoded.authority ? entry.request_hash : null,
      response: decoded.response,
      created_at: entry.created_at,
    });
  }
  for (const event of auditEvents) {
    repository.appendAudit?.({
      tenant_id,
      event_id: event.event_id,
      action: event.event_type,
      actor_id: event.actor_id,
      object_type: event.object_type,
      object_id: event.object_id,
      payload: clone(event.payload),
      created_at: event.created_at,
    });
  }
  materializedBaselines.set(repository, createDomainSnapshot({
    tenant_id,
    domain_id: descriptor.domain_id,
    records,
    idempotency_entries: idempotency,
    audit_events: auditEvents,
  }));
  materializedReadOnlyShadows.set(
    repository,
    Object.freeze(readOnlyShadowRecords.map((record) => Object.freeze(clone(record)))),
  );
  materializedCanonicalAuditEvents.set(
    repository,
    Object.freeze(auditEvents.map((event) => Object.freeze(clone(event)))),
  );
  return repository;
}

export async function flushRecordRepositoryToDomainLedger({
  ledger,
  descriptor,
  repository,
  tenant_id,
} = {}) {
  const rawSource = createRecordRepositoryDomainSnapshot({
    descriptor,
    repositories: [{ source_id: "materialized-postgres-unit-of-work", repository }],
    tenant_id,
  }).snapshot;
  const expectedBaseline = materializedBaselines.get(repository);
  const source = applyCommittedStateVersions(rawSource, expectedBaseline);
  const scope = { tenant_id, domain_id: descriptor.domain_id };
  await ledger.transaction(scope, (tx) => flushDomainSnapshotToScopedLedger({
    tx,
    source,
    tenant_id,
    domain_id: descriptor.domain_id,
    expected_baseline: expectedBaseline,
  }));
  const comparison = await compareDomainSnapshotWithLedgerReadback({
    ledger,
    source,
    tenant_id,
    domain_id: descriptor.domain_id,
  });
  return Object.freeze({ snapshot: source, comparison });
}

export async function flushDomainSnapshotToScopedLedger({
  tx,
  source,
  tenant_id,
  domain_id = source?.domain_id,
  expected_baseline,
} = {}) {
  const domainId = requireDomainId(domain_id);
  const currentRecords = await tx.list();
  const currentIdempotency = await tx.listIdempotency();
  const currentAudit = await tx.listAudit();
  const baselineRecordKeys = new Set((expected_baseline?.records ?? []).map((record) =>
    recordIdentity(domainId, record.record_type, record.record_id)));
  if (expected_baseline) {
    const currentSnapshot = createDomainSnapshot({
      tenant_id,
      domain_id: domainId,
      records: currentRecords,
      idempotency_entries: currentIdempotency,
      audit_events: currentAudit,
    });
    const baselineComparison = compareDomainBaselineWithConcurrentReadback(expected_baseline, currentSnapshot);
    if (!baselineComparison.equal) {
      throw Object.assign(new Error("domain unit-of-work baseline changed before commit"), {
        code: "LAWOS_DOMAIN_BASELINE_CONFLICT",
        safe_error_code: "DOMAIN_BASELINE_CONFLICT",
        status: 409,
        difference_count: baselineComparison.difference_count,
        difference_fingerprint: baselineComparison.difference_fingerprint,
      });
    }
  }
  const recordMap = new Map(currentRecords.map((record) => [
    recordIdentity(domainId, record.record_type, record.record_id),
    record,
  ]));
  let changedRecordCount = 0;
  const changedRecordReferences = [];
  for (const record of source.records) {
    const identity = recordIdentity(domainId, record.record_type, record.record_id);
    const current = recordMap.get(identity);
    if (!current) {
      await tx.write({ ...record, expected_version: 0 });
      changedRecordCount += 1;
      changedRecordReferences.push({
        record_type: record.record_type,
        record_id: record.record_id,
      });
    }
    else if (
      current.payload_hash !== record.payload_hash
      || current.unique_key !== record.unique_key
      || current.append_only !== record.append_only
    ) {
      if (!baselineRecordKeys.has(identity)) {
        throw Object.assign(new Error("concurrent domain record conflicts with a new unit-of-work record"), {
          code: "LAWOS_DOMAIN_BASELINE_CONFLICT",
          safe_error_code: "DOMAIN_BASELINE_CONFLICT",
          status: 409,
        });
      }
      await tx.write({ ...record, expected_version: current.state_version });
      changedRecordCount += 1;
      changedRecordReferences.push({
        record_type: record.record_type,
        record_id: record.record_id,
      });
    }
  }
  for (const record of source.records) await tx.addReferences(record);
  const deletionBaseline = expected_baseline?.records ?? currentRecords;
  if (deletionBaseline.some((record) => !source.records.some((candidate) =>
    candidate.record_type === record.record_type && candidate.record_id === record.record_id))) {
    throw Object.assign(new Error("domain unit of work cannot silently delete records"), {
      code: "LAWOS_DOMAIN_DELETE_UNSUPPORTED",
      safe_error_code: "DOMAIN_DELETE_UNSUPPORTED",
      status: 409,
    });
  }
  const idempotencyKeys = new Set(currentIdempotency.map((entry) => entry.key));
  const newIdempotencyEntries = source.idempotency_entries.filter((entry) => !idempotencyKeys.has(entry.key));
  if (changedRecordCount > 0 && newIdempotencyEntries.length === 0) {
    throw Object.assign(new Error(`${domainId} domain mutation must claim an idempotency key`), {
      code: "LAWOS_DOMAIN_IDEMPOTENCY_REQUIRED",
      safe_error_code: "DOMAIN_IDEMPOTENCY_REQUIRED",
      status: 409,
      domain_id: domainId,
    });
  }
  for (const entry of source.idempotency_entries) {
    const result = await tx.claimIdempotency(entry);
    if (idempotencyKeys.has(entry.key) && !result.replayed) {
      throw new Error("domain idempotency state changed during flush");
    }
  }
  const auditById = new Map(currentAudit.map((event) => [event.event_id, event]));
  const newAuditEvents = source.audit_events.filter((event) => !auditById.has(event.event_id));
  if (changedRecordCount > 0 && newAuditEvents.length === 0) {
    throw Object.assign(new Error(`${domainId} domain mutation must append an audit event`), {
      code: "LAWOS_DOMAIN_AUDIT_REQUIRED",
      safe_error_code: "DOMAIN_AUDIT_REQUIRED",
      status: 409,
      domain_id: domainId,
    });
  }
  for (const event of source.audit_events) {
    const current = auditById.get(event.event_id);
    if (current) {
      if (hashDomainValue(current.payload) !== hashDomainValue(event.payload) || current.event_type !== event.event_type) {
        throw Object.assign(new Error("append-only domain audit changed during flush"), {
          code: "LAWOS_DOMAIN_AUDIT_CONFLICT",
          safe_error_code: "DOMAIN_AUDIT_CONFLICT",
          status: 409,
        });
      }
    } else {
      await tx.appendAudit(event);
      if (typeof tx.enqueueOutbox !== "function") throw new TypeError("domain transaction outbox method is required");
      await tx.enqueueOutbox({
        event_id: `outbox:${event.event_id}`,
        topic: `${domainId}.audit`,
        aggregate_type: event.object_type,
        aggregate_id: event.object_id,
        payload: {
          audit_event_id: event.event_id,
          event_type: event.event_type,
          payload_hash: hashDomainValue(event.payload ?? {}),
          ...(domainId === "hrx" ? {
            projection_records: changedRecordReferences
              .map((reference) => ({ ...reference }))
              .sort((left, right) =>
                left.record_type.localeCompare(right.record_type)
                  || left.record_id.localeCompare(right.record_id)),
          } : {}),
        },
        created_at: event.created_at,
      });
    }
  }
  const target = createDomainSnapshot({
    tenant_id,
    domain_id: domainId,
    records: await tx.list(),
    idempotency_entries: await tx.listIdempotency(),
    audit_events: await tx.listAudit(),
  });
  const comparison = compareCommittedDomainSnapshotWithReadback(source, target);
  if (!comparison.equal) {
    throw Object.assign(new Error("domain unit-of-work flush differs from PostgreSQL readback"), {
      code: "LAWOS_DOMAIN_SHADOW_DIFFERENCE",
      safe_error_code: "DOMAIN_SHADOW_DIFFERENCE",
      status: 409,
      difference_count: comparison.difference_count,
      difference_fingerprint: comparison.difference_fingerprint,
    });
  }
  return comparison;
}

export async function compareDomainSnapshotWithLedgerReadback({
  ledger,
  source,
  tenant_id,
  domain_id = source?.domain_id,
} = {}) {
  const domainId = requireDomainId(domain_id);
  const scope = { tenant_id, domain_id: domainId };
  const target = createDomainSnapshot({
    tenant_id,
    domain_id: domainId,
    records: await ledger.list(scope),
    idempotency_entries: await ledger.listIdempotency(scope),
    audit_events: await ledger.listAudit(scope),
  });
  const comparison = compareCommittedDomainSnapshotWithReadback(source, target);
  if (!comparison.equal) {
    throw Object.assign(new Error("domain unit-of-work commit differs from PostgreSQL readback"), {
      code: "LAWOS_DOMAIN_SHADOW_DIFFERENCE",
      safe_error_code: "DOMAIN_SHADOW_DIFFERENCE",
      status: 409,
      difference_count: comparison.difference_count,
      difference_fingerprint: comparison.difference_fingerprint,
    });
  }
  return comparison;
}

export async function runRecordRepositoryDomainCommand({
  ledger,
  descriptor,
  tenant_id,
  create_repository,
  command,
} = {}) {
  if (typeof command !== "function") throw new TypeError("domain command callback is required");
  const repository = await materializeRecordRepositoryFromDomainLedger({
    ledger,
    descriptor,
    tenant_id,
    create_repository,
  });
  try {
    const result = await command(repository);
    const flush = await flushRecordRepositoryToDomainLedger({
      ledger,
      descriptor,
      repository,
      tenant_id,
    });
    return Object.freeze({ result, flush });
  } finally {
    repository.close?.();
  }
}

export async function runRecordRepositoryMultiDomainCommand({
  ledger,
  tenant_id,
  domains,
  additional_domains = [],
  command,
} = {}) {
  if (!ledger || typeof ledger.transactionMany !== "function") {
    throw new TypeError("multi-domain PostgreSQL ledger is required");
  }
  if (!Array.isArray(domains) || domains.length < 2) {
    throw new TypeError("at least two domain adapters are required");
  }
  if (typeof command !== "function") throw new TypeError("multi-domain command callback is required");
  const definitions = domains.map((domain) => {
    if (!domain?.descriptor || typeof domain.create_repository !== "function") {
      throw new TypeError("domain descriptor and create_repository are required");
    }
    return Object.freeze({
      key: requiredText(domain.key ?? domain.descriptor.domain_id, "domain key"),
      descriptor: domain.descriptor,
      create_repository: domain.create_repository,
    });
  });
  if (new Set(definitions.map((domain) => domain.key)).size !== definitions.length) {
    throw new TypeError("multi-domain command keys must be unique");
  }
  if (new Set(definitions.map((domain) => domain.descriptor.domain_id)).size !== definitions.length) {
    throw new TypeError("multi-domain command domain_ids must be unique");
  }
  if (!Array.isArray(additional_domains)) throw new TypeError("additional_domains must be an array");
  const additionalDefinitions = additional_domains.map((domain) => {
    const definition = Object.freeze({
      key: requiredText(domain?.key, "additional domain key"),
      domain_id: requireDomainId(domain?.domain_id),
      materialize: domain?.materialize,
      create_snapshot: domain?.create_snapshot,
      get_baseline: domain?.get_baseline,
      flush: domain?.flush,
      compare: domain?.compare,
      close: domain?.close,
    });
    for (const method of ["materialize", "create_snapshot", "get_baseline", "flush", "compare", "close"]) {
      if (typeof definition[method] !== "function") {
        throw new TypeError(`additional domain ${definition.key}.${method} is required`);
      }
    }
    return definition;
  });
  const allKeys = definitions.map((domain) => domain.key)
    .concat(additionalDefinitions.map((domain) => domain.key));
  const allDomainIds = definitions.map((domain) => domain.descriptor.domain_id)
    .concat(additionalDefinitions.map((domain) => domain.domain_id));
  if (new Set(allKeys).size !== allKeys.length) throw new TypeError("multi-domain command keys must be unique");
  if (new Set(allDomainIds).size !== allDomainIds.length) {
    throw new TypeError("multi-domain command domain_ids must be unique");
  }

  const repositories = Object.create(null);
  const additionalValues = Object.create(null);
  try {
    await ledger.transactionMany({
      tenant_id,
      domain_ids: allDomainIds,
    }, async (transactions) => {
      for (const domain of definitions) {
        repositories[domain.key] = await materializeRecordRepositoryFromDomainLedger({
          ledger: transactions[domain.descriptor.domain_id],
          descriptor: domain.descriptor,
          tenant_id,
          create_repository: domain.create_repository,
        });
      }
      for (const domain of additionalDefinitions) {
        additionalValues[domain.key] = await domain.materialize({
          ledger: transactions[domain.domain_id],
          tenant_id,
        });
      }
    });
    const result = await command(Object.freeze({ ...repositories, ...additionalValues }));
    const baselines = Object.fromEntries(definitions.map((domain) => [
      domain.descriptor.domain_id,
      materializedBaselines.get(repositories[domain.key]),
    ]));
    const sources = Object.fromEntries(definitions.map((domain) => [
      domain.descriptor.domain_id,
      applyCommittedStateVersions(createRecordRepositoryDomainSnapshot({
        descriptor: domain.descriptor,
        repositories: [{
          source_id: "materialized-postgres-multi-domain-unit-of-work",
          repository: repositories[domain.key],
        }],
        tenant_id,
      }).snapshot, baselines[domain.descriptor.domain_id]),
    ]));
    for (const domain of additionalDefinitions) {
      sources[domain.domain_id] = domain.create_snapshot({
        value: additionalValues[domain.key],
        tenant_id,
      });
      baselines[domain.domain_id] = domain.get_baseline({
        value: additionalValues[domain.key],
        tenant_id,
      });
    }
    const localComparisons = Object.fromEntries(definitions.map((domain) => [
      domain.descriptor.domain_id,
      compareDomainSnapshots(
        baselines[domain.descriptor.domain_id],
        sources[domain.descriptor.domain_id],
      ),
    ]));
    for (const domain of additionalDefinitions) {
      localComparisons[domain.domain_id] = compareDomainSnapshots(
        baselines[domain.domain_id],
        sources[domain.domain_id],
      );
    }
    if (Object.values(localComparisons).every((comparison) => comparison.equal)) {
      return Object.freeze({ result, flushes: Object.freeze({}) });
    }
    await ledger.transactionMany({
      tenant_id,
      domain_ids: allDomainIds,
    }, async (transactions) => {
      for (const domain of definitions) {
        await flushDomainSnapshotToScopedLedger({
          tx: transactions[domain.descriptor.domain_id],
          source: sources[domain.descriptor.domain_id],
          tenant_id,
          domain_id: domain.descriptor.domain_id,
          expected_baseline: baselines[domain.descriptor.domain_id],
        });
      }
      for (const domain of additionalDefinitions) {
        await domain.flush({
          tx: transactions[domain.domain_id],
          source: sources[domain.domain_id],
          tenant_id,
          domain_id: domain.domain_id,
          expected_baseline: baselines[domain.domain_id],
        });
      }
    });
    const flushes = Object.create(null);
    await ledger.transactionMany({
      tenant_id,
      domain_ids: allDomainIds,
    }, async (transactions) => {
      for (const domain of definitions) {
        const snapshot = sources[domain.descriptor.domain_id];
        const comparison = await compareDomainSnapshotWithLedgerReadback({
          ledger: transactions[domain.descriptor.domain_id],
          source: snapshot,
          tenant_id,
          domain_id: domain.descriptor.domain_id,
        });
        flushes[domain.key] = Object.freeze({ snapshot, comparison });
      }
      for (const domain of additionalDefinitions) {
        const snapshot = sources[domain.domain_id];
        const comparison = await domain.compare({
          ledger: transactions[domain.domain_id],
          source: snapshot,
          tenant_id,
          domain_id: domain.domain_id,
        });
        flushes[domain.key] = Object.freeze({ snapshot, comparison });
      }
    });
    return Object.freeze({ result, flushes: Object.freeze(flushes) });
  } finally {
    for (const repository of Object.values(repositories)) repository.close?.();
    for (const domain of additionalDefinitions) {
      if (Object.hasOwn(additionalValues, domain.key)) {
        await domain.close({ value: additionalValues[domain.key], tenant_id });
      }
    }
  }
}

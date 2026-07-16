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

function recordIdentity(domainId, recordType, recordId) {
  return `${domainId}:${recordType}:${recordId}`;
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
  pii_fields = [],
  primary_key_fields = [],
  unique_rules = [],
  reference_rules = [],
} = {}) {
  const domainId = requireDomainId(domain_id);
  if (typeof resolve_record_id !== "function") throw new TypeError("resolve_record_id is required");
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
    inventory: Object.freeze({
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
      idempotency: (state.idempotency ?? []).filter((entry) => entry.tenant_id === tenantId),
      audit_events: (state.audit_events ?? []).filter((event) => event.tenant_id === tenantId),
    });
  });
  const rawRecords = new Map();
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
  }
  const knownIdentities = new Set(rawRecords.keys());
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
  const idempotencyMap = new Map();
  for (const source of sourceStates) {
    for (const entry of source.idempotency) {
      const key = requiredText(entry.idempotency_key ?? entry.key, "idempotency key");
      const normalized = {
        tenant_id: tenantId,
        domain_id: descriptor.domain_id,
        key,
        request_hash: entry.request_hash
          ?? (String(entry.operation ?? "").startsWith("request-hash:")
            ? String(entry.operation).slice("request-hash:".length)
            : hashDomainValue({
              operation: entry.operation ?? "imported_domain_operation",
              key,
            })),
        response: clone(entry.response ?? null),
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
    for (const event of source.audit_events) {
      const eventId = requiredText(event.event_id, "audit event_id");
      const normalized = {
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
      source_record_count: sourceStates.reduce((total, source) => total + source.records.length, 0),
      canonical_record_count: snapshot.records.length,
      duplicate_record_count: duplicateRecordCount,
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
  const [records, idempotency, auditEvents] = await Promise.all([
    ledger.list(scope),
    ledger.listIdempotency(scope),
    ledger.listAudit(scope),
  ]);
  const repository = create_repository({
    seedRecords: records.map((record) => clone(record.payload)),
    preserveSeedRecords: true,
  });
  for (const entry of idempotency) {
    repository.recordIdempotency?.({
      tenant_id,
      idempotency_key: entry.key,
      operation: `request-hash:${entry.request_hash}`,
      response: clone(entry.response),
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
  return repository;
}

export async function flushRecordRepositoryToDomainLedger({
  ledger,
  descriptor,
  repository,
  tenant_id,
} = {}) {
  const source = createRecordRepositoryDomainSnapshot({
    descriptor,
    repositories: [{ source_id: "materialized-postgres-unit-of-work", repository }],
    tenant_id,
  }).snapshot;
  const expectedBaseline = materializedBaselines.get(repository);
  const scope = { tenant_id, domain_id: descriptor.domain_id };
  await ledger.transaction(scope, (tx) => flushSnapshotToScopedDomainLedger({
    tx,
    descriptor,
    source,
    tenant_id,
    expected_baseline: expectedBaseline,
  }));
  const comparison = await compareLedgerReadback({ ledger, descriptor, source, tenant_id });
  return Object.freeze({ snapshot: source, comparison });
}

async function flushSnapshotToScopedDomainLedger({
  tx,
  descriptor,
  source,
  tenant_id,
  expected_baseline,
} = {}) {
  const currentRecords = await tx.list();
  const currentIdempotency = await tx.listIdempotency();
  const currentAudit = await tx.listAudit();
  if (expected_baseline) {
    const currentSnapshot = createDomainSnapshot({
      tenant_id,
      domain_id: descriptor.domain_id,
      records: currentRecords,
      idempotency_entries: currentIdempotency,
      audit_events: currentAudit,
    });
    const baselineComparison = compareDomainSnapshots(expected_baseline, currentSnapshot);
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
    recordIdentity(descriptor.domain_id, record.record_type, record.record_id),
    record,
  ]));
  for (const record of source.records) {
    const current = recordMap.get(recordIdentity(descriptor.domain_id, record.record_type, record.record_id));
    if (!current) await tx.write({ ...record, expected_version: 0 });
    else if (
      current.payload_hash !== record.payload_hash
      || current.unique_key !== record.unique_key
      || current.append_only !== record.append_only
    ) {
      await tx.write({ ...record, expected_version: current.state_version });
    }
  }
  for (const record of source.records) await tx.addReferences(record);
  if (currentRecords.some((record) => !source.records.some((candidate) =>
    candidate.record_type === record.record_type && candidate.record_id === record.record_id))) {
    throw Object.assign(new Error("domain unit of work cannot silently delete records"), {
      code: "LAWOS_DOMAIN_DELETE_UNSUPPORTED",
      safe_error_code: "DOMAIN_DELETE_UNSUPPORTED",
      status: 409,
    });
  }
  const idempotencyKeys = new Set(currentIdempotency.map((entry) => entry.key));
  for (const entry of source.idempotency_entries) {
    const result = await tx.claimIdempotency(entry);
    if (idempotencyKeys.has(entry.key) && !result.replayed) {
      throw new Error("domain idempotency state changed during flush");
    }
  }
  const auditById = new Map(currentAudit.map((event) => [event.event_id, event]));
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
    }
  }
  const target = createDomainSnapshot({
    tenant_id,
    domain_id: descriptor.domain_id,
    records: await tx.list(),
    idempotency_entries: await tx.listIdempotency(),
    audit_events: await tx.listAudit(),
  });
  const comparison = compareDomainSnapshots(source, target);
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

async function compareLedgerReadback({ ledger, descriptor, source, tenant_id } = {}) {
  const scope = { tenant_id, domain_id: descriptor.domain_id };
  const target = createDomainSnapshot({
    tenant_id,
    domain_id: descriptor.domain_id,
    records: await ledger.list(scope),
    idempotency_entries: await ledger.listIdempotency(scope),
    audit_events: await ledger.listAudit(scope),
  });
  const comparison = compareDomainSnapshots(source, target);
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

  const repositories = Object.fromEntries(await Promise.all(definitions.map(async (domain) => [
    domain.key,
    await materializeRecordRepositoryFromDomainLedger({
      ledger,
      descriptor: domain.descriptor,
      tenant_id,
      create_repository: domain.create_repository,
    }),
  ])));
  try {
    const result = await command(Object.freeze(repositories));
    const sources = Object.fromEntries(definitions.map((domain) => [
      domain.descriptor.domain_id,
      createRecordRepositoryDomainSnapshot({
        descriptor: domain.descriptor,
        repositories: [{
          source_id: "materialized-postgres-multi-domain-unit-of-work",
          repository: repositories[domain.key],
        }],
        tenant_id,
      }).snapshot,
    ]));
    const baselines = Object.fromEntries(definitions.map((domain) => [
      domain.descriptor.domain_id,
      materializedBaselines.get(repositories[domain.key]),
    ]));
    await ledger.transactionMany({
      tenant_id,
      domain_ids: definitions.map((domain) => domain.descriptor.domain_id),
    }, async (transactions) => {
      for (const domain of definitions) {
        await flushSnapshotToScopedDomainLedger({
          tx: transactions[domain.descriptor.domain_id],
          descriptor: domain.descriptor,
          source: sources[domain.descriptor.domain_id],
          tenant_id,
          expected_baseline: baselines[domain.descriptor.domain_id],
        });
      }
    });
    const flushes = Object.fromEntries(await Promise.all(definitions.map(async (domain) => {
      const snapshot = sources[domain.descriptor.domain_id];
      const comparison = await compareLedgerReadback({
        ledger,
        descriptor: domain.descriptor,
        source: snapshot,
        tenant_id,
      });
      return [domain.key, Object.freeze({ snapshot, comparison })];
    })));
    return Object.freeze({ result, flushes: Object.freeze(flushes) });
  } finally {
    for (const repository of Object.values(repositories)) repository.close?.();
  }
}

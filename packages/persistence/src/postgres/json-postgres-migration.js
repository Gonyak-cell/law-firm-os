import { performance } from "node:perf_hooks";
import {
  DOMAIN_IDS,
  compareDomainSnapshots,
  createDomainSnapshot,
  hashDomainValue,
  normalizeDomainAuditEvent,
  normalizeDomainIdempotency,
  normalizeDomainRecord,
  requireDomainId,
} from "../domain-ledger.js";
import { createPostgresIdentityLedger } from "../../../runtime-auth/src/postgres-identity-ledger.js";
import { createPostgresDomainLedger } from "./domain-ledger.js";
import { validateMigrationCorpusAgainstRecordTypeCatalog } from "./record-type-catalog.js";

export const JSON_POSTGRES_MIGRATION_SCHEMA_VERSION = "law-firm-os.json-postgres-migration-corpus.v1";
export const JSON_POSTGRES_MIGRATION_CHECKPOINT_VERSION = "law-firm-os.json-postgres-migration-checkpoint.v1";
export const JSON_POSTGRES_MIGRATION_MODES = Object.freeze([
  "inventory",
  "validate-only",
  "dry-run",
  "import",
  "readback",
  "reconcile",
  "resume",
]);

const DOMAIN_ORDER = new Map([
  "hrx",
  "master-data",
  "crm",
  "intake",
  "matter",
  "dms",
  "dms-auxiliary",
  "finance",
  "client-portal",
  "ai-governance",
  "analytics",
  "ui-readiness",
  "enterprise-readiness",
].map((domainId, index) => [domainId, index]));
const FORBIDDEN_SOURCE_KEY = /(^|_)(password|password_hash|secret|token|credential|authorization|api_key|document_bytes|raw_bytes|raw_payload)(_|$)/iu;
const SAFE_CREDENTIAL_METADATA = new Set(["credential_provider", "credential_status", "credential_rev"]);

function elapsedMilliseconds(startedAt) {
  return Math.max(1, Math.ceil(performance.now() - startedAt));
}

function percentile(values, fraction) {
  if (!values.length) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil(sorted.length * fraction) - 1),
  )];
}

function requiredText(value, name) {
  const text = String(value ?? "").trim();
  if (!text) throw new TypeError(`${name} is required`);
  return text;
}

function normalizedStrings(value, name) {
  if (value == null) return Object.freeze([]);
  if (!Array.isArray(value)) throw new TypeError(`${name} must be an array`);
  return Object.freeze([...new Set(value.map((item) => requiredText(item, name)))].sort());
}

function assertNoCredentialOrRawBytes(value, path = "source") {
  if (Buffer.isBuffer(value) || ArrayBuffer.isView(value)) throw new TypeError(`${path} contains raw bytes`);
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoCredentialOrRawBytes(item, `${path}[${index}]`));
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, item] of Object.entries(value)) {
    if (FORBIDDEN_SOURCE_KEY.test(key) && !SAFE_CREDENTIAL_METADATA.has(key)) {
      throw new TypeError(`${path} contains forbidden secret or raw-byte field`);
    }
    assertNoCredentialOrRawBytes(item, `${path}.${key}`);
  }
}

function reasonCode(error, fallback = "SOURCE_ROW_INVALID") {
  const message = String(error?.message ?? "");
  if (/forbidden secret|raw bytes/iu.test(message)) return "FORBIDDEN_SECRET_OR_RAW_BYTES";
  if (/tenant scope mismatch/iu.test(message)) return "TENANT_SCOPE_MISMATCH";
  if (/state_version/iu.test(message)) return "INVALID_STATE_VERSION";
  if (/unsupported domain/iu.test(message)) return "DOMAIN_UNSUPPORTED";
  if (/required/iu.test(message)) return "REQUIRED_FIELD_MISSING";
  return fallback;
}

function rejectedRow({ manifestSha256, domainId, recordType, kind, index, code, retryable = false }) {
  return Object.freeze({
    reason_code: code,
    record_ref: hashDomainValue({ manifestSha256, domainId, recordType, kind, index }).slice(0, 32),
    domain_id: domainId ?? "identity",
    record_type: String(recordType ?? kind ?? "unknown").replace(/[^A-Za-z0-9_.:-]/gu, "_").slice(0, 96),
    source_kind: String(kind ?? "unknown").replace(/[^A-Za-z0-9_.:-]/gu, "_").slice(0, 32),
    retryable,
  });
}

function sourceMaterial(corpus = {}) {
  return {
    schema_version: corpus.schema_version,
    data_scope: corpus.data_scope,
    tenant_id: corpus.tenant_id,
    accounts: corpus.accounts ?? [],
    domains: corpus.domains ?? [],
  };
}

export function jsonPostgresDirectoryProjection(user = {}) {
  const membership = user.tenant_memberships?.[0] ?? user.membership ?? {};
  return {
    user_id: user.user_id,
    email: String(user.email ?? "").trim().toLowerCase(),
    account_status: user.account_status ?? user.status ?? "active",
    profile: user.profile ?? Object.fromEntries([
      "display_name",
      "english_name",
      "source_title",
      "production_status",
      "qa_tenant_scope",
      "registration_state",
      "highest_privilege",
      "privilege_rank",
      "assurance_level",
      "source_ref",
    ].filter((key) => user[key] != null).map((key) => [key, user[key]])),
    membership: {
      tenant_id: membership.tenant_id,
      status: membership.status ?? "active",
      role_profile_id: membership.role_profile_id ?? user.role_profile_id ?? null,
      role_ids: [...(membership.role_ids ?? user.role_ids ?? [])].sort(),
      group_ids: [...(membership.group_ids ?? user.group_ids ?? [])].sort(),
      scopes: [...(membership.scopes ?? user.scopes ?? [])].sort(),
      hrx_scopes: [...(membership.hrx_scopes ?? user.hrx_scopes ?? [])].sort(),
      source_ref: membership.source_ref ?? user.source_ref ?? null,
    },
  };
}

function directoryProjectionList(users) {
  return users.map(jsonPostgresDirectoryProjection).sort((left, right) => left.user_id.localeCompare(right.user_id));
}

export function prepareJsonPostgresMigrationCorpus(corpus = {}, { allowRealData = false } = {}) {
  if (corpus.schema_version !== JSON_POSTGRES_MIGRATION_SCHEMA_VERSION) throw new TypeError("migration corpus schema is invalid");
  const tenantId = requiredText(corpus.tenant_id, "migration tenant_id");
  const dataScope = requiredText(corpus.data_scope, "migration data_scope");
  if (dataScope !== "synthetic-only" && !(allowRealData && dataScope === "approved-real-manifest")) {
    throw new TypeError("migration corpus data scope is not authorized");
  }
  const manifestSha256 = hashDomainValue(sourceMaterial(corpus));
  if (corpus.manifest_sha256 && corpus.manifest_sha256 !== manifestSha256) throw new TypeError("migration manifest digest mismatch");
  const rejected = [];
  const accounts = [];
  const accountIds = new Set();
  const accountEmails = new Set();
  for (const [index, source] of (corpus.accounts ?? []).entries()) {
    try {
      assertNoCredentialOrRawBytes(source, "account");
      const userId = requiredText(source.user_id, "account user_id");
      const email = requiredText(source.email, "account email").toLowerCase();
      if (accountIds.has(userId)) throw Object.assign(new TypeError("duplicate account user_id"), { reason_code: "DUPLICATE_ACCOUNT_ID" });
      if (accountEmails.has(email)) throw Object.assign(new TypeError("duplicate account email"), { reason_code: "DUPLICATE_ACCOUNT_EMAIL" });
      const membership = source.membership ?? source.tenant_memberships?.[0] ?? {};
      if (membership.tenant_id && membership.tenant_id !== tenantId) throw new TypeError("account tenant scope mismatch");
      const disabled = source.status === "disabled"
        || source.account_status === "disabled"
        || membership.status === "disabled";
      const normalized = Object.freeze({
        user: Object.freeze({
          ...structuredClone(source),
          user_id: userId,
          email,
          status: disabled ? "disabled" : "active",
          account_status: disabled ? "disabled" : "active",
          credential_provider: "lawos-internal-password-provider-v1",
          credential_status: disabled ? "disabled" : "reset_required",
          password_hash: undefined,
        }),
        membership: Object.freeze({
          tenant_id: tenantId,
          status: disabled ? "disabled" : "active",
          role_profile_id: membership.role_profile_id ?? source.role_profile_id ?? null,
          role_ids: normalizedStrings(membership.role_ids ?? source.role_ids, "account role id"),
          group_ids: normalizedStrings(membership.group_ids ?? source.group_ids, "account group id"),
          scopes: normalizedStrings(membership.scopes ?? source.scopes, "account scope"),
          hrx_scopes: normalizedStrings(membership.hrx_scopes ?? source.hrx_scopes, "account HRX scope"),
          source_ref: membership.source_ref ?? source.source_ref ?? null,
        }),
      });
      accountIds.add(userId);
      accountEmails.add(email);
      accounts.push(normalized);
    } catch (error) {
      rejected.push(rejectedRow({
        manifestSha256,
        kind: "account",
        index,
        recordType: "Account",
        code: error?.reason_code ?? reasonCode(error),
      }));
    }
  }

  const domains = [];
  const domainIds = new Set();
  const globalRecordKeys = new Set();
  const pendingReferences = [];
  for (const sourceDomain of [...(corpus.domains ?? [])].sort((left, right) => (
    (DOMAIN_ORDER.get(String(left.domain_id)) ?? Number.MAX_SAFE_INTEGER)
    - (DOMAIN_ORDER.get(String(right.domain_id)) ?? Number.MAX_SAFE_INTEGER)
  ))) {
    let domainId;
    try {
      domainId = requireDomainId(sourceDomain.domain_id);
    } catch (error) {
      rejected.push(rejectedRow({ manifestSha256, kind: "domain", recordType: "Domain", code: reasonCode(error), index: domains.length }));
      continue;
    }
    if (domainIds.has(domainId)) {
      const existing = domains.find((item) => item.domain_id === domainId);
      const offset = existing.source_record_count;
      existing.source_record_count += (sourceDomain.records ?? []).length;
      for (const [index, source] of (sourceDomain.records ?? []).entries()) {
        const rejection = rejectedRow({
          manifestSha256,
          domainId,
          recordType: source?.record_type,
          kind: "record",
          index: offset + index,
          code: "DUPLICATE_DOMAIN_ID",
        });
        existing.rejected.push(rejection);
        rejected.push(rejection);
      }
      continue;
    }
    domainIds.add(domainId);
    const domainRejected = [];
    const records = [];
    const identities = new Set();
    const uniqueKeys = new Set();
    for (const [index, source] of (sourceDomain.records ?? []).entries()) {
      try {
        assertNoCredentialOrRawBytes(source.payload, "record payload");
        if (source.tenant_id && source.tenant_id !== tenantId) throw new TypeError("domain record tenant scope mismatch");
        if (source.domain_id && source.domain_id !== domainId) throw new TypeError("domain record domain scope mismatch");
        const record = normalizeDomainRecord({ ...source, tenant_id: tenantId, domain_id: domainId }, { tenant_id: tenantId, domain_id: domainId });
        const identity = `${domainId}:${record.record_type}:${record.record_id}`;
        const unique = record.unique_key ? `${domainId}:${record.record_type}:${record.unique_key}` : null;
        if (identities.has(identity)) throw Object.assign(new TypeError("duplicate record identity"), { reason_code: "DUPLICATE_RECORD_ID" });
        if (unique && uniqueKeys.has(unique)) throw Object.assign(new TypeError("duplicate record unique key"), { reason_code: "DUPLICATE_UNIQUE_KEY" });
        identities.add(identity);
        if (unique) uniqueKeys.add(unique);
        globalRecordKeys.add(identity);
        records.push(record);
        pendingReferences.push({ domainId, record, index, sourceDomain });
      } catch (error) {
        domainRejected.push(rejectedRow({
          manifestSha256,
          domainId,
          recordType: source?.record_type,
          kind: "record",
          index,
          code: error?.reason_code ?? reasonCode(error),
        }));
      }
    }
    const idempotencyEntries = [];
    const idempotencyKeys = new Set();
    for (const [index, source] of (sourceDomain.idempotency_entries ?? []).entries()) {
      try {
        assertNoCredentialOrRawBytes(source.response, "idempotency response");
        const entry = normalizeDomainIdempotency({ ...source, tenant_id: tenantId, domain_id: domainId }, { tenant_id: tenantId, domain_id: domainId });
        if (idempotencyKeys.has(entry.key)) throw Object.assign(new TypeError("duplicate idempotency key"), { reason_code: "DUPLICATE_IDEMPOTENCY_KEY" });
        idempotencyKeys.add(entry.key);
        idempotencyEntries.push(entry);
      } catch (error) {
        domainRejected.push(rejectedRow({ manifestSha256, domainId, recordType: "Idempotency", kind: "idempotency", index, code: error?.reason_code ?? reasonCode(error) }));
      }
    }
    const auditEvents = [];
    const auditIds = new Set();
    for (const [index, source] of (sourceDomain.audit_events ?? []).entries()) {
      try {
        assertNoCredentialOrRawBytes(source.payload, "audit payload");
        const event = normalizeDomainAuditEvent({ ...source, tenant_id: tenantId, domain_id: domainId }, { tenant_id: tenantId, domain_id: domainId });
        if (auditIds.has(event.event_id)) throw Object.assign(new TypeError("duplicate audit event"), { reason_code: "DUPLICATE_AUDIT_EVENT" });
        auditIds.add(event.event_id);
        auditEvents.push(event);
      } catch (error) {
        domainRejected.push(rejectedRow({ manifestSha256, domainId, recordType: "AuditEvent", kind: "audit", index, code: error?.reason_code ?? reasonCode(error) }));
      }
    }
    domains.push({
      domain_id: domainId,
      source: sourceDomain,
      source_record_count: (sourceDomain.records ?? []).length,
      records,
      idempotency_entries: idempotencyEntries,
      audit_events: auditEvents,
      rejected: domainRejected,
    });
    rejected.push(...domainRejected);
  }

  let removedReferenceTarget;
  do {
    removedReferenceTarget = false;
    for (const pending of pendingReferences) {
      const domain = domains.find((item) => item.domain_id === pending.domainId);
      const recordIndex = domain?.records.indexOf(pending.record) ?? -1;
      if (recordIndex < 0) continue;
      const missing = pending.record.references.find((reference) => !globalRecordKeys.has(
        `${reference.target_domain_id}:${reference.target_record_type}:${reference.target_record_id}`,
      ));
      if (!missing) continue;
      domain.records.splice(recordIndex, 1);
      globalRecordKeys.delete(`${pending.domainId}:${pending.record.record_type}:${pending.record.record_id}`);
      const rejection = rejectedRow({
        manifestSha256,
        domainId: pending.domainId,
        recordType: pending.record.record_type,
        kind: "record",
        index: pending.index,
        code: "MISSING_REFERENCE_TARGET",
        retryable: true,
      });
      domain.rejected.push(rejection);
      rejected.push(rejection);
      removedReferenceTarget = true;
    }
  } while (removedReferenceTarget);

  const snapshots = domains.map((domain) => createDomainSnapshot({
    tenant_id: tenantId,
    domain_id: domain.domain_id,
    source_hash: hashDomainValue({ manifestSha256, domain_id: domain.domain_id }),
    records: domain.records,
    idempotency_entries: domain.idempotency_entries,
    audit_events: domain.audit_events,
  }));
  return Object.freeze({
    tenant_id: tenantId,
    data_scope: dataScope,
    manifest_sha256: manifestSha256,
    accounts: Object.freeze(accounts),
    domains: Object.freeze(domains),
    snapshots: Object.freeze(snapshots),
    rejected: Object.freeze(rejected),
  });
}

function reasonCounts(rejected) {
  return Object.freeze(Object.fromEntries([...new Set(rejected.map((item) => item.reason_code))]
    .sort()
    .map((code) => [code, rejected.filter((item) => item.reason_code === code).length])));
}

function stateVersionDistribution(records) {
  return Object.freeze(Object.fromEntries([...new Set(records.map((record) => Number(record.state_version)))]
    .sort((left, right) => left - right)
    .map((version) => [String(version), records.filter((record) => Number(record.state_version) === version).length])));
}

function validateCheckpoint(checkpoint, prepared) {
  if (!checkpoint) return Object.freeze({ completed_steps: Object.freeze([]) });
  if (checkpoint.schema_version !== JSON_POSTGRES_MIGRATION_CHECKPOINT_VERSION) throw new TypeError("migration checkpoint schema is invalid");
  if (checkpoint.source_manifest_sha256 !== prepared.manifest_sha256) {
    const error = new Error("migration checkpoint source digest mismatch");
    error.code = "LAWOS_MIGRATION_CHECKPOINT_DRIFT";
    error.status = 409;
    throw error;
  }
  return Object.freeze({ completed_steps: Object.freeze([...(checkpoint.completed_steps ?? [])]) });
}

function checkpointFor(prepared, completedSteps) {
  const steps = Object.freeze([...new Set(completedSteps)]);
  return Object.freeze({
    schema_version: JSON_POSTGRES_MIGRATION_CHECKPOINT_VERSION,
    source_manifest_sha256: prepared.manifest_sha256,
    completed_steps: steps,
    checkpoint_hash: hashDomainValue({ source_manifest_sha256: prepared.manifest_sha256, completed_steps: steps }),
  });
}

function isNegativeTenantAccessDenied(error) {
  return error?.code === "LAWOS_POSTGRES_ACCESS_DENIED"
    && error?.status === 403;
}

async function readDomainTarget(ledger, snapshot) {
  return ledger.transaction(snapshot, async (tx) => createDomainSnapshot({
    tenant_id: snapshot.tenant_id,
    domain_id: snapshot.domain_id,
    records: await tx.list(),
    idempotency_entries: await tx.listIdempotency(),
    audit_events: await tx.listAudit(),
  }));
}

export async function runJsonPostgresMigration({
  pool,
  corpus,
  mode = "validate-only",
  allowRealData = false,
  recordTypeCatalog = null,
  negativeTenantId = null,
  checkpoint = null,
  onCheckpoint = null,
} = {}) {
  const migrationStartedAt = performance.now();
  const operationDurationsMs = [];
  if (!JSON_POSTGRES_MIGRATION_MODES.includes(mode)) throw new TypeError("unsupported JSON PostgreSQL migration mode");
  const realData = corpus?.data_scope === "approved-real-manifest";
  if (realData && allowRealData && !recordTypeCatalog) {
    const error = new Error("approved real-data migration requires an exact record-type catalog");
    error.code = "LAWOS_MIGRATION_RECORD_TYPE_CATALOG_REQUIRED";
    throw error;
  }
  const prepared = prepareJsonPostgresMigrationCorpus(corpus, { allowRealData });
  const preparedCatalogCorpus = {
    accounts: prepared.accounts.map((account) => {
      const { password_hash: _discardedPasswordHash, ...user } = account.user;
      return { ...user, membership: account.membership };
    }),
    domains: prepared.domains.map((domain) => ({
      domain_id: domain.domain_id,
      records: domain.records,
    })),
  };
  const recordTypeValidation = recordTypeCatalog
    ? validateMigrationCorpusAgainstRecordTypeCatalog({ corpus: preparedCatalogCorpus, catalog: recordTypeCatalog })
    : null;
  if (recordTypeValidation?.valid === false) {
    const error = new Error("migration corpus does not match the approved record-type catalog");
    error.code = "LAWOS_MIGRATION_RECORD_TYPE_CATALOG_DRIFT";
    error.details = recordTypeValidation;
    throw error;
  }
  const checkpointState = validateCheckpoint(checkpoint, prepared);
  const completedSteps = [...checkpointState.completed_steps];
  const writes = mode === "import" || mode === "resume";
  const reads = writes || mode === "readback" || mode === "reconcile";
  if ((writes || reads) && (!pool || typeof pool.connect !== "function")) throw new TypeError("PostgreSQL pool is required for migration execution");
  const identityLedger = pool ? createPostgresIdentityLedger({ pool }) : null;
  const domainLedger = pool ? createPostgresDomainLedger({ pool }) : null;
  let negativeTenantAccessDenied = false;
  let directoryReplayedCount = 0;
  let directoryAppliedCount = 0;
  if (writes && !completedSteps.includes("identity")) {
    const identityStartedAt = performance.now();
    for (const account of prepared.accounts) {
      const requestHash = hashDomainValue({
        source_manifest_sha256: prepared.manifest_sha256,
        tenant_id: prepared.tenant_id,
        user: account.user,
        membership: account.membership,
      });
      const directoryInput = {
        tenant_id: prepared.tenant_id,
        user: account.user,
        membership: account.membership,
        actor_id: "json-postgres-migration",
        data_scope: prepared.data_scope,
        idempotency_key: `json-postgres-migration:identity:${prepared.manifest_sha256}:${account.user.user_id}`,
        request_hash: requestHash,
      };
      const result = await identityLedger.provisionDirectoryUser({
        ...directoryInput,
      });
      const replay = await identityLedger.provisionDirectoryUser({
        ...directoryInput,
      });
      if (!result.replayed) directoryAppliedCount += 1;
      if (result.replayed || replay.replayed) directoryReplayedCount += 1;
    }
    completedSteps.push("identity");
    await onCheckpoint?.(checkpointFor(prepared, completedSteps));
    operationDurationsMs.push(elapsedMilliseconds(identityStartedAt));
  }

  const domainResults = [];
  for (const snapshot of prepared.snapshots) {
    const domainStartedAt = performance.now();
    const step = `domain:${snapshot.domain_id}`;
    let importResult = null;
    let replayResult = null;
    if (writes && !completedSteps.includes(step)) {
      importResult = await domainLedger.importSnapshot(snapshot);
      replayResult = await domainLedger.importSnapshot(snapshot);
      completedSteps.push(step);
      await onCheckpoint?.(checkpointFor(prepared, completedSteps));
    }
    let target = null;
    let comparison = null;
    let tenantNegativeVisibleCount = 0;
    if (reads) {
      target = await readDomainTarget(domainLedger, snapshot);
      comparison = compareDomainSnapshots(snapshot, target);
      if (writes && comparison.equal !== true) {
        const error = new Error(`migration baseline conflict in ${snapshot.domain_id}`);
        error.code = "LAWOS_DOMAIN_IMPORT_CONFLICT";
        error.safe_error_code = "DOMAIN_IMPORT_CONFLICT";
        error.status = 409;
        throw error;
      }
      if (negativeTenantId && !negativeTenantAccessDenied) {
        for (const record of snapshot.records) {
          try {
            const visible = await domainLedger.read({
              tenant_id: negativeTenantId,
              domain_id: snapshot.domain_id,
              record_type: record.record_type,
              record_id: record.record_id,
            });
            if (visible) tenantNegativeVisibleCount += 1;
          } catch (error) {
            if (!isNegativeTenantAccessDenied(error)) throw error;
            negativeTenantAccessDenied = true;
            break;
          }
        }
      }
    }
    const domain = prepared.domains.find((item) => item.domain_id === snapshot.domain_id);
    const sourceCount = domain.source_record_count;
    const acceptedCount = snapshot.records.length;
    const rejectedRecordCount = domain.rejected.filter((item) => item.source_kind === "record").length;
    domainResults.push(Object.freeze({
      domain_id: snapshot.domain_id,
      source_count: sourceCount,
      accepted_count: acceptedCount,
      rejected_count: domain.rejected.length,
      rejected_record_count: rejectedRecordCount,
      rejected_auxiliary_count: domain.rejected.length - rejectedRecordCount,
      rejected_reason_counts: reasonCounts(domain.rejected),
      source_hash: snapshot.source_hash,
      snapshot_hash: snapshot.snapshot_hash,
      invariant_hash: snapshot.invariant_hash,
      target_readback_hash: target?.snapshot_hash ?? null,
      state_version_distribution: target ? stateVersionDistribution(target.records) : stateVersionDistribution(snapshot.records),
      replayed_noop_count: replayResult?.replayed === true || importResult?.replayed === true || (writes && completedSteps.includes(step)) ? acceptedCount : 0,
      orphan_count: target ? Math.max(0, target.records.length - snapshot.records.length) : 0,
      tenant_negative_visible_count: tenantNegativeVisibleCount,
      readback_equal: comparison?.equal ?? null,
      initial_import_applied: importResult ? importResult.replayed !== true : false,
    }));
    operationDurationsMs.push(elapsedMilliseconds(domainStartedAt));
  }

  let directoryReadbackHash = null;
  let directoryTargetCount = null;
  let directoryOrphanCount = null;
  let directoryTenantNegativeVisibleCount = 0;
  let directoryIdempotencyCount = null;
  let directoryOutboxCount = null;
  let directoryAuditCount = null;
  let outboxLagP95Ms = 0;
  if (reads) {
    const [targetUsers, idempotencyEntries, outboxEvents, auditEvents] = await Promise.all([
      identityLedger.listDirectoryUsers({ tenant_id: prepared.tenant_id }),
      identityLedger.listDirectoryIdempotency({ tenant_id: prepared.tenant_id }),
      identityLedger.listDirectoryOutbox({ tenant_id: prepared.tenant_id }),
      identityLedger.listSecurityAudit({ tenant_id: prepared.tenant_id }),
    ]);
    directoryReadbackHash = hashDomainValue(directoryProjectionList(targetUsers));
    directoryTargetCount = targetUsers.length;
    directoryOrphanCount = Math.max(0, targetUsers.length - prepared.accounts.length);
    const migrationKeyPrefix = `json-postgres-migration:identity:${prepared.manifest_sha256}:`;
    directoryIdempotencyCount = idempotencyEntries.filter((entry) => entry.key.startsWith(migrationKeyPrefix)).length;
    const migratedUserIds = new Set(prepared.accounts.map((account) => account.user.user_id));
    directoryOutboxCount = outboxEvents.filter((event) => (
      event.topic === "identity.directory.user.changed" && migratedUserIds.has(event.aggregate_id)
    )).length;
    directoryAuditCount = auditEvents.filter((event) => (
      event.action === "auth.directory.user.provisioned" && migratedUserIds.has(event.object_id)
    )).length;
    const measuredAt = Date.now();
    const outboxLagSamples = outboxEvents
      .filter((event) => migratedUserIds.has(event.aggregate_id))
      .map((event) => Math.max(
        0,
        measuredAt - Date.parse(event.created_at ?? measuredAt),
      ))
      .filter(Number.isSafeInteger);
    outboxLagP95Ms = percentile(outboxLagSamples, 0.95);
    if (negativeTenantId && !negativeTenantAccessDenied) {
      for (const account of prepared.accounts) {
        try {
          if (await identityLedger.findDirectoryUserByUserId({
            tenant_id: negativeTenantId,
            user_id: account.user.user_id,
          })) {
            directoryTenantNegativeVisibleCount += 1;
          }
        } catch (error) {
          if (!isNegativeTenantAccessDenied(error)) throw error;
          negativeTenantAccessDenied = true;
          break;
        }
      }
    }
  }
  const directorySourceHash = hashDomainValue(directoryProjectionList(prepared.accounts.map((account) => ({
    ...account.user,
    tenant_memberships: [account.membership],
  }))));
  const allReadbackEqual = !reads || (
    directoryReadbackHash === directorySourceHash
    && directoryOrphanCount === 0
    && directoryTenantNegativeVisibleCount === 0
    && domainResults.every((item) => item.readback_equal === true && item.orphan_count === 0 && item.tenant_negative_visible_count === 0)
  );
  const elapsedMs = elapsedMilliseconds(migrationStartedAt);
  if (operationDurationsMs.length === 0) operationDurationsMs.push(elapsedMs);
  return Object.freeze({
    schema_version: "law-firm-os.json-postgres-migration-result.v1",
    outcome: allReadbackEqual ? "PASS" : "BLOCKED",
    mode,
    data_scope: prepared.data_scope,
    source_manifest_sha256: prepared.manifest_sha256,
    record_type_catalog_sha256: recordTypeValidation?.catalog_sha256 ?? null,
    directory: Object.freeze({
      source_count: (corpus.accounts ?? []).length,
      accepted_count: prepared.accounts.length,
      rejected_count: prepared.rejected.filter((item) => item.domain_id === "identity").length,
      source_hash: directorySourceHash,
      target_readback_hash: directoryReadbackHash,
      target_count: directoryTargetCount,
      replayed_noop_count: directoryReplayedCount,
      initial_import_applied_count: directoryAppliedCount,
      idempotency_count: directoryIdempotencyCount,
      audit_count: directoryAuditCount,
      outbox_count: directoryOutboxCount,
      orphan_count: directoryOrphanCount,
      tenant_negative_visible_count: directoryTenantNegativeVisibleCount,
    }),
    domains: Object.freeze(domainResults),
    safe_counts: Object.freeze({
      account_count: prepared.accounts.length,
      domain_count: prepared.snapshots.length,
      source_record_count: prepared.domains.reduce((total, domain) => total + domain.source_record_count, 0),
      accepted_record_count: prepared.snapshots.reduce((total, snapshot) => total + snapshot.records.length, 0),
      rejected_record_count: prepared.rejected.filter((item) => item.source_kind === "record").length,
      rejected_item_count: prepared.rejected.length,
      record_type_catalog_entry_count: recordTypeValidation?.observed_entry_count ?? 0,
      logical_reference_missing_count: recordTypeValidation?.missing_reference_count ?? 0,
      tenant_negative_visible_count: directoryTenantNegativeVisibleCount + domainResults.reduce((total, item) => total + item.tenant_negative_visible_count, 0),
    }),
    rejected_reason_counts: reasonCounts(prepared.rejected),
    rejected_rows: prepared.rejected,
    performance: Object.freeze({
      measurement_count: operationDurationsMs.length,
      elapsed_ms: elapsedMs,
      operation_p50_ms: percentile(operationDurationsMs, 0.5),
      operation_p95_ms: percentile(operationDurationsMs, 0.95),
      operation_p99_ms: percentile(operationDurationsMs, 0.99),
      records_per_tenant: prepared.snapshots.reduce(
        (total, snapshot) => total + snapshot.records.length,
        prepared.accounts.length,
      ),
      largest_domain_batch_size: Math.max(
        0,
        ...prepared.snapshots.map((snapshot) => snapshot.records.length),
      ),
      materialized_payload_bytes: Buffer.byteLength(JSON.stringify({
        accounts: prepared.accounts,
        domains: prepared.domains,
      })),
      retry_count: 0,
      conflict_count: 0,
      pool_total_count: Number(pool?.totalCount ?? 0),
      pool_idle_count: Number(pool?.idleCount ?? 0),
      pool_waiting_count: Number(pool?.waitingCount ?? 0),
      outbox_lag_p95_ms: outboxLagP95Ms,
    }),
    checkpoint: checkpointFor(prepared, completedSteps),
    invariant_hash: hashDomainValue({
      source_manifest_sha256: prepared.manifest_sha256,
      directory_source_hash: directorySourceHash,
      domains: domainResults.map((item) => ({ domain_id: item.domain_id, invariant_hash: item.invariant_hash })),
    }),
    json_fallback_count: 0,
    json_writer_count: 0,
    dual_write_count: 0,
    file_current_authority_count: 0,
    offline_mutation_count: 0,
    memory_fallback_count: 0,
    raw_value_returned: false,
    secret_material_returned: false,
    production_ready_claim: false,
  });
}

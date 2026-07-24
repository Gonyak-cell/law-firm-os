import { createHash } from "node:crypto";

export const JSON_POSTGRES_SOURCE_ADJUDICATION_CONTRACT_VERSION =
  "law-firm-os.json-postgres-source-adjudication-contract.v1";
export const JSON_POSTGRES_SOURCE_ADJUDICATION_RECOMMENDATIONS_VERSION =
  "law-firm-os.json-postgres-source-adjudication-recommendations.v1";
export const JSON_POSTGRES_RECORD_AUTHORITY_VERSION =
  "law-firm-os.json-postgres-record-authority.v1";

const SHA256 = /^[a-f0-9]{64}$/u;
const SHA1 = /^[a-f0-9]{40}$/u;
const SOURCE_REF = /^[a-f0-9]{32}$/u;
const SAFE_REF = /^[A-Za-z0-9_.:-]{1,160}$/u;
const SECRET_FIELD =
  /(^|_)(?:passwords?|password_hash|passwd|passphrases?|secrets?|tokens?|credentials?|authorization|api_key|private_key|recovery_key|document_bytes|raw_bytes|raw_payload)(_|$)/iu;
const SAFE_CREDENTIAL_METADATA = new Set([
  "credential_provider",
  "credential_status",
  "credential_rev",
]);
const CHRONOLOGY_FIELDS = Object.freeze([
  "updated_at",
  "occurred_at",
  "created_at",
  "recorded_at",
  "changed_at",
  "effective_at",
  "effective_from",
  "completed_at",
  "deleted_at",
]);
const STRONG_ID_FIELDS = Object.freeze([
  "record_id",
  "resource_id",
  "event_id",
  "idempotency_key",
  "unique_key",
  "key",
]);
const STATE_VERSION_FIELDS = Object.freeze([
  "state_version",
  "expected_version",
  "row_version",
  "revision",
  "version",
]);
const RECORD_VALUE_CONTAINERS = Object.freeze([
  "data",
  "payload",
  "attributes",
  "details",
  "profile",
  "professional_profile",
]);
const ROOT_PRIORITY = Object.freeze({
  "registered-account-source": 0,
  "registered-roster-source": 0,
  "runtime-primary": 10,
  "runtime-desktop": 20,
  "runtime-electron": 30,
  "packaged-lawos-user-data": 40,
  "local-backups": 50,
});

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) =>
      `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return createHash("sha256").update(
    typeof value === "string" ? value : stableJson(value),
  ).digest("hex");
}

function requiredSafeRef(value, label) {
  const ref = String(value ?? "").trim();
  if (!SAFE_REF.test(ref)) throw new TypeError(`${label} is invalid`);
  return ref;
}

function requiredSourceRef(value, label) {
  const ref = String(value ?? "").trim();
  if (!SOURCE_REF.test(ref)) throw new TypeError(`${label} is invalid`);
  return ref;
}

function hasExactKeys(value, keys) {
  return value
    && typeof value === "object"
    && !Array.isArray(value)
    && stableJson(Object.keys(value).sort())
      === stableJson([...keys].sort());
}

function normalizedText(value) {
  return typeof value === "string" && value.trim()
    ? value.trim().toLowerCase()
    : null;
}

function safeInteger(value) {
  return Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function normalizedFieldName(key) {
  return String(key)
    .replace(/([a-z0-9])([A-Z])/gu, "$1_$2")
    .replace(/[^a-z0-9]+/giu, "_")
    .replace(/^_+|_+$/gu, "")
    .toLowerCase();
}

function isSerializedBytes(value) {
  return value
    && typeof value === "object"
    && !Array.isArray(value)
    && value.type === "Buffer"
    && Array.isArray(value.data)
    && value.data.every((item) =>
      Number.isInteger(item) && item >= 0 && item <= 255);
}

function sanitize(value, state, depth = 0) {
  if (depth > 32) throw new TypeError("adjudication source exceeds maximum depth");
  if (Array.isArray(value)) return value.map((item) => sanitize(item, state, depth + 1));
  if (value === null || typeof value !== "object") return value;
  const output = {};
  for (const [key, item] of Object.entries(value)) {
    const normalizedKey = normalizedFieldName(key);
    if ((SECRET_FIELD.test(normalizedKey)
        && !SAFE_CREDENTIAL_METADATA.has(normalizedKey))
      || isSerializedBytes(item)) {
      state.excluded_secret_field_count += 1;
      continue;
    }
    output[key] = sanitize(item, state, depth + 1);
  }
  return output;
}

function chronologyMs(row) {
  let latest = 0;
  for (const field of CHRONOLOGY_FIELDS) {
    const value = row?.[field];
    if (typeof value !== "string") continue;
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) latest = Math.max(latest, parsed);
  }
  return latest;
}

function identityParts(row) {
  for (const key of STRONG_ID_FIELDS) {
    const value = normalizedText(row?.[key]);
    if (value) return [`${key}:${value}`];
  }
  return Object.keys(row ?? {})
    .filter((key) => key !== "tenant_id" && key.endsWith("_id"))
    .sort()
    .map((key) => {
      const value = normalizedText(row[key]);
      return value ? `${key}:${value}` : null;
    })
    .filter(Boolean);
}

function stateVersion(row) {
  for (const field of STATE_VERSION_FIELDS) {
    const value = safeInteger(row?.[field]);
    if (value !== null) return value;
  }
  return null;
}

function recordValue(row, fields, depth = 0) {
  if (!row || typeof row !== "object" || Array.isArray(row)) return null;
  for (const field of fields) {
    const value = normalizedText(row[field]);
    if (value) return value;
  }
  if (depth >= 4) return null;
  for (const container of RECORD_VALUE_CONTAINERS) {
    const value = recordValue(row[container], fields, depth + 1);
    if (value) return value;
  }
  return null;
}

function recordFingerprint(row, kind, index, state) {
  if (!row || typeof row !== "object" || Array.isArray(row)) return null;
  const ids = identityParts(row);
  if (ids.length === 0) return null;
  const tenant = normalizedText(row.tenant_id) ?? "tenant-unspecified";
  const entityClass = normalizedText(row.record_type)
    ?? normalizedText(row.model_type)
    ?? kind;
  const sanitized = sanitize(row, state);
  const email = recordValue(row, ["email", "work_email"]);
  const userId = recordValue(row, ["user_id"]);
  const employeeId = recordValue(row, ["employee_id"]);
  const matterCode = recordValue(row, ["matter_code"]);
  const matterId = recordValue(row, ["matter_id"])
    ?? (/matter/iu.test(entityClass)
      ? recordValue(row, ["resource_id", "record_id"])
      : null);
  return Object.freeze({
    record_ref: sha256(`${tenant}:${entityClass}:${ids.join("|")}`).slice(0, 32),
    entity_class_ref: sha256(entityClass).slice(0, 24),
    tenant_ref: sha256(tenant).slice(0, 32),
    state_version: stateVersion(row),
    chronology_order: chronologyMs(row),
    content_sha256: sha256(sanitized),
    email_ref: email ? sha256(email).slice(0, 32) : null,
    user_ref: userId ? sha256(userId).slice(0, 32) : null,
    employee_ref: employeeId ? sha256(employeeId).slice(0, 32) : null,
    matter_code_ref: matterCode ? sha256(matterCode).slice(0, 32) : null,
    matter_ref: matterId ? sha256(matterId).slice(0, 32) : null,
    source_order: index,
  });
}

function validateRecordFingerprint(record) {
  const allowed = new Set([
    "record_ref",
    "entity_class_ref",
    "tenant_ref",
    "state_version",
    "chronology_order",
    "content_sha256",
    "email_ref",
    "user_ref",
    "employee_ref",
    "matter_code_ref",
    "matter_ref",
    "source_order",
  ]);
  if (!record || typeof record !== "object" || Array.isArray(record)
    || Object.keys(record).some((key) => !allowed.has(key))
    || !/^[a-f0-9]{32}$/u.test(record.record_ref ?? "")
    || !/^[a-f0-9]{24}$/u.test(record.entity_class_ref ?? "")
    || !/^[a-f0-9]{32}$/u.test(record.tenant_ref ?? "")
    || !SHA256.test(record.content_sha256 ?? "")
    || !Number.isSafeInteger(record.chronology_order)
    || record.chronology_order < 0
    || !Number.isSafeInteger(record.source_order)
    || record.source_order < 0
    || (record.state_version !== null
      && (!Number.isSafeInteger(record.state_version)
        || record.state_version < 0))) {
    throw new TypeError("adjudication record fingerprint is invalid");
  }
  for (const key of [
    "email_ref",
    "user_ref",
    "employee_ref",
    "matter_code_ref",
    "matter_ref",
  ]) {
    if (record[key] !== null
      && !/^[a-f0-9]{32}$/u.test(record[key] ?? "")) {
      throw new TypeError(`adjudication ${key} is invalid`);
    }
  }
  return record;
}

function appendRows(target, rows, kind, state) {
  if (!Array.isArray(rows)) return;
  rows.forEach((row, index) => {
    const fingerprint = recordFingerprint(row, kind, index, state);
    if (fingerprint) target.push(fingerprint);
  });
}

export function inspectJsonPostgresAdjudicationSource(value) {
  const state = { excluded_secret_field_count: 0 };
  const records = [];
  if (Array.isArray(value)) {
    appendRows(records, value, "root-array", state);
  } else if (value && typeof value === "object") {
    appendRows(records, value.records, "records", state);
    appendRows(records, value.idempotency, "idempotency", state);
    appendRows(records, value.idempotency_entries, "idempotency", state);
    appendRows(records, value.audit_events, "audit-events", state);
    appendRows(records, value.users, "identity-users", state);
    appendRows(records, value.members, "identity-roster", state);
    appendRows(records, value.profiles, "profiles", state);
    appendRows(records, value.contacts, "contacts", state);
    for (const [table, rows] of Object.entries(
      value.tables && typeof value.tables === "object" ? value.tables : {},
    )) appendRows(records, rows, `table:${table}`, state);
  }
  records.sort((left, right) =>
    left.record_ref.localeCompare(right.record_ref)
      || left.content_sha256.localeCompare(right.content_sha256)
      || left.source_order - right.source_order);
  return Object.freeze({
    records: Object.freeze(records),
    excluded_secret_field_count: state.excluded_secret_field_count,
  });
}

function contractMaterial(value) {
  return {
    schema_version: value.schema_version,
    inventory_content_sha256: value.inventory_content_sha256,
    sources: value.sources,
    safe_counts: value.safe_counts,
    claims: value.claims,
  };
}

export function createJsonPostgresSourceAdjudicationContract({
  inventoryContentSha256,
  sources = [],
} = {}) {
  if (!SHA256.test(inventoryContentSha256 ?? "")) {
    throw new TypeError("adjudication contract inventory digest is invalid");
  }
  const rows = sources.map(({ source, inspection, parseError = false }) => {
    if (!SOURCE_REF.test(source?.source_ref ?? "")
      || !SAFE_REF.test(source?.root_ref ?? "")
      || !SAFE_REF.test(source?.source_family ?? "")
      || !SHA256.test(source?.sha256 ?? "")) {
      throw new TypeError("adjudication source binding is invalid");
    }
    const records = inspection?.records ?? [];
    if (!Array.isArray(records)) throw new TypeError("adjudication records are invalid");
    records.forEach(validateRecordFingerprint);
    if (!Number.isSafeInteger(
      inspection?.excluded_secret_field_count ?? 0,
    ) || (inspection?.excluded_secret_field_count ?? 0) < 0) {
      throw new TypeError("adjudication secret exclusion count is invalid");
    }
    return Object.freeze({
      source_ref: source.source_ref,
      root_ref: source.root_ref,
      source_family: source.source_family,
      source_sha256: source.sha256,
      parse_status: parseError
        ? "parse-error"
        : inspection
          ? "parsed"
          : "not-json",
      record_count: records.length,
      excluded_secret_field_count:
        inspection?.excluded_secret_field_count ?? 0,
      records: Object.freeze(records),
    });
  }).sort((left, right) => left.source_ref.localeCompare(right.source_ref));
  if (new Set(rows.map((source) => source.source_ref)).size !== rows.length) {
    throw new TypeError("adjudication source refs must be unique");
  }
  const value = Object.freeze({
    schema_version: JSON_POSTGRES_SOURCE_ADJUDICATION_CONTRACT_VERSION,
    inventory_content_sha256: inventoryContentSha256,
    sources: Object.freeze(rows),
    safe_counts: Object.freeze({
      source_count: rows.length,
      parsed_source_count: rows.filter((row) =>
        row.parse_status === "parsed").length,
      parse_error_source_count: rows.filter((row) =>
        row.parse_status === "parse-error").length,
      lineage_record_count: rows.reduce((total, row) =>
        total + row.record_count, 0),
      excluded_secret_field_count: rows.reduce((total, row) =>
        total + row.excluded_secret_field_count, 0),
    }),
    claims: Object.freeze({
      authority_selected_by_mtime: false,
      raw_value_returned: false,
      raw_path_returned: false,
      pii_returned: false,
      secret_material_returned: false,
      real_data_mutated: false,
      production_contacted: false,
    }),
  });
  return Object.freeze({
    ...value,
    adjudication_contract_sha256: sha256(contractMaterial(value)),
  });
}

export function validateJsonPostgresSourceAdjudicationContract(
  contract,
  { inventoryContentSha256 } = {},
) {
  if (contract?.schema_version
      !== JSON_POSTGRES_SOURCE_ADJUDICATION_CONTRACT_VERSION
    || !SHA256.test(contract?.adjudication_contract_sha256 ?? "")
    || contract.inventory_content_sha256 !== inventoryContentSha256
    || !Array.isArray(contract.sources)) {
    throw new TypeError("source adjudication contract is invalid");
  }
  const rebuilt = createJsonPostgresSourceAdjudicationContract({
    inventoryContentSha256,
    sources: contract.sources.map((source) => ({
      source: {
        source_ref: source.source_ref,
        root_ref: source.root_ref,
        source_family: source.source_family,
        sha256: source.source_sha256,
      },
      inspection: source.parse_status === "parsed"
        ? {
            records: source.records,
            excluded_secret_field_count:
              source.excluded_secret_field_count,
          }
        : null,
      parseError: source.parse_status === "parse-error",
    })),
  });
  if (stableJson(rebuilt) !== stableJson(contract)) {
    throw new TypeError("source adjudication contract digest drifted");
  }
  return Object.freeze({
    valid: true,
    adjudication_contract_sha256:
      contract.adjudication_contract_sha256,
    source_count: contract.sources.length,
  });
}

function sourceOrder(left, right) {
  return (ROOT_PRIORITY[left.root_ref] ?? 999)
    - (ROOT_PRIORITY[right.root_ref] ?? 999)
    || left.source_ref.localeCompare(right.source_ref);
}

function chooseRecordWinner(entries) {
  const contentDigests = new Set(entries.map((entry) =>
    entry.record.content_sha256));
  if (contentDigests.size === 1) {
    return {
      winner: [...entries].sort((left, right) =>
        sourceOrder(left.source, right.source))[0],
      conflict: false,
      reason_code: "EXACT_RECORD_CONTENT",
    };
  }
  const withVersions = entries.filter((entry) =>
    entry.record.state_version !== null);
  if (withVersions.length === entries.length) {
    const maxVersion = Math.max(...withVersions.map((entry) =>
      entry.record.state_version));
    const latest = withVersions.filter((entry) =>
      entry.record.state_version === maxVersion);
    if (new Set(latest.map((entry) =>
      entry.record.content_sha256)).size === 1) {
      return {
        winner: [...latest].sort((left, right) =>
          sourceOrder(left.source, right.source))[0],
        conflict: false,
        reason_code: "HIGHER_STATE_VERSION",
      };
    }
    entries = latest;
  }
  if (entries.every((entry) => entry.record.chronology_order > 0)) {
    const maxChronology = Math.max(...entries.map((entry) =>
      entry.record.chronology_order));
    const latest = entries.filter((entry) =>
      entry.record.chronology_order === maxChronology);
    if (new Set(latest.map((entry) =>
      entry.record.content_sha256)).size === 1) {
      return {
        winner: [...latest].sort((left, right) =>
          sourceOrder(left.source, right.source))[0],
        conflict: false,
        reason_code: "LATEST_AUDIT_CHRONOLOGY",
      };
    }
  }
  return { winner: null, conflict: true, reason_code: null };
}

function recommendationMaterial(value) {
  return {
    schema_version: value.schema_version,
    inventory_content_sha256: value.inventory_content_sha256,
    adjudication_contract_sha256: value.adjudication_contract_sha256,
    sources: value.sources,
    record_conflicts: value.record_conflicts,
    identity_conflicts: value.identity_conflicts,
    safe_counts: value.safe_counts,
    claims: value.claims,
  };
}

function recordAuthorityMaterial(value) {
  return {
    schema_version: value.schema_version,
    decision_set_ref: value.decision_set_ref,
    source_sha: value.source_sha,
    source_tree: value.source_tree,
    inventory_content_sha256: value.inventory_content_sha256,
    adjudication_contract_sha256: value.adjudication_contract_sha256,
    recommendation_sha256: value.recommendation_sha256,
    policy: value.policy,
    sources: value.sources,
    record_decisions: value.record_decisions,
    identity_decisions: value.identity_decisions,
    safe_counts: value.safe_counts,
    claims: value.claims,
  };
}

function comparisonMaterial(value) {
  const {
    comparison_sha256: ignoredComparisonSha256,
    ...material
  } = value ?? {};
  return material;
}

function recordEntry(contractByRef, sourceRef, recordRef) {
  const source = contractByRef.get(sourceRef);
  const record = source?.records.find((row) =>
    row.record_ref === recordRef);
  if (!source || !record) {
    throw new TypeError("record authority candidate is absent");
  }
  return { source, record };
}

function validateResidualComparison(comparison, {
  inventoryContentSha256,
  recommendationSha256,
  canonicalSourceRef,
  projectionSourceRef,
  residualRecordRefs,
} = {}) {
  if (comparison?.schema_version
      !== "law-firm-os.json-postgres-residual-record-structural-comparison.v1"
    || comparison.inventory_content_sha256 !== inventoryContentSha256
    || comparison.recommendation_sha256 !== recommendationSha256
    || !SHA256.test(comparison.comparison_sha256 ?? "")
    || sha256(comparisonMaterial(comparison))
      !== comparison.comparison_sha256
    || comparison.claims?.source_read_once !== true
    || Object.entries(comparison.claims ?? {}).some(([key, value]) =>
      key !== "source_read_once" && value !== false)
    || comparison.safe_counts?.residual_record_count !== 0
    || comparison.safe_counts?.conflicting_non_derived_live_field_count
      !== 0) {
    throw new TypeError("record authority residual comparison is invalid");
  }
  const sourceRefs = new Set((comparison.sources ?? []).map((source) =>
    source.source_ref));
  if (!sourceRefs.has(canonicalSourceRef)
    || !sourceRefs.has(projectionSourceRef)
    || sourceRefs.size !== 2) {
    throw new TypeError("record authority residual sources are invalid");
  }
  const comparisonRefs = (comparison.comparisons ?? [])
    .map((row) => row.record_ref).sort();
  if (stableJson(comparisonRefs)
      !== stableJson([...residualRecordRefs].sort())
    || comparison.comparisons.some((row) =>
      row.safe_counts?.conflicting_non_derived_live_field_count !== 0
      || row.safe_counts?.conflicting_field_count !== 0)) {
    throw new TypeError("record authority residual records are invalid");
  }
}

export function createJsonPostgresRecordAuthority({
  inventory,
  recommendations,
  residualComparison,
  decisionSetRef,
  ownerDecisionRef,
  sourceSha,
  sourceTree,
  rootPriority = [],
  canonicalMasterSourceRef,
  crmProjectionSourceRef,
  masterDataResidualRecordRefs = [],
} = {}) {
  validateJsonPostgresAdjudicationRecommendations(recommendations, {
    inventory,
    approvedInventoryContentSha256:
      inventory?.inventory_content_sha256,
  });
  const decisionRef = requiredSafeRef(
    ownerDecisionRef,
    "record authority owner decision ref",
  );
  const setRef = requiredSafeRef(
    decisionSetRef,
    "record authority decision set ref",
  );
  if (!SHA1.test(sourceSha ?? "") || !SHA1.test(sourceTree ?? "")) {
    throw new TypeError("record authority source binding is invalid");
  }
  const priority = rootPriority.map((rootRef) =>
    requiredSafeRef(rootRef, "record authority root priority"));
  if (priority.length === 0
    || new Set(priority).size !== priority.length) {
    throw new TypeError("record authority root priority is invalid");
  }
  const priorityByRoot = new Map(priority.map((rootRef, index) =>
    [rootRef, index]));
  const residualRecordRefs = new Set(masterDataResidualRecordRefs.map(
    (recordRef) => requiredSourceRef(
      recordRef,
      "record authority residual record ref",
    ),
  ));
  if (residualRecordRefs.size !== masterDataResidualRecordRefs.length) {
    throw new TypeError("record authority residual records are duplicated");
  }
  const canonicalSourceRef = residualRecordRefs.size > 0
    ? requiredSourceRef(
        canonicalMasterSourceRef,
        "record authority canonical master source ref",
      )
    : null;
  const projectionSourceRef = residualRecordRefs.size > 0
    ? requiredSourceRef(
        crmProjectionSourceRef,
        "record authority CRM projection source ref",
      )
    : null;
  if (residualRecordRefs.size > 0) {
    if (canonicalSourceRef === projectionSourceRef) {
      throw new TypeError("record authority master sources must differ");
    }
    validateResidualComparison(residualComparison, {
      inventoryContentSha256: inventory.inventory_content_sha256,
      recommendationSha256: recommendations.recommendation_sha256,
      canonicalSourceRef,
      projectionSourceRef,
      residualRecordRefs,
    });
  }
  const contract = inventory.adjudication_contract;
  const contractByRef = new Map(contract.sources.map((source) =>
    [source.source_ref, source]));
  const selectedRecordCounts = new Map(recommendations.sources.map((source) =>
    [source.source_ref, source.winning_record_count]));
  const digestGroups = new Map();
  for (const source of inventory.sources) {
    if (!digestGroups.has(source.sha256)) digestGroups.set(source.sha256, []);
    digestGroups.get(source.sha256).push(source);
  }
  const representatives = [...digestGroups.values()].map((sources) =>
    [...sources].sort(sourceOrder)[0]);
  const recordsByFamilyAndRef = new Map();
  for (const source of representatives) {
    const lineage = contractByRef.get(source.source_ref);
    for (const record of lineage.records) {
      const key = `${source.source_family}:${record.record_ref}`;
      if (!recordsByFamilyAndRef.has(key)) {
        recordsByFamilyAndRef.set(key, []);
      }
      recordsByFamilyAndRef.get(key).push({ source: lineage, record });
    }
  }
  const unresolvedByKey = new Map(
    recommendations.record_conflicts.map((conflict) => [
      `${conflict.source_family}:${conflict.record_ref}`,
      conflict,
    ]),
  );
  const resolvedOwnerConflictKeys = new Set();
  const recordDecisions = [];
  let automaticRecordDecisionCount = 0;
  for (const [key, candidates] of recordsByFamilyAndRef) {
    if (new Set(candidates.map((entry) =>
      entry.record.content_sha256)).size === 1) continue;
    const [sourceFamily, recordRef] = key.split(":");
    const automatic = chooseRecordWinner(candidates);
    let canonical;
    let reasonCode;
    if (!automatic.conflict) {
      canonical = automatic.winner;
      reasonCode = automatic.reason_code;
      automaticRecordDecisionCount += 1;
    } else {
      const conflict = unresolvedByKey.get(key);
      if (!conflict
        || stableJson([...conflict.source_refs].sort())
          !== stableJson(candidates.map((entry) =>
            entry.source.source_ref).sort())) {
        throw new TypeError(
          `record authority unresolved binding drifted: ${recordRef}`,
        );
      }
      const ranked = candidates.filter((entry) =>
        priorityByRoot.has(entry.source.root_ref));
      const bestRank = ranked.length === candidates.length
        ? Math.min(...ranked.map((entry) =>
            priorityByRoot.get(entry.source.root_ref)))
        : null;
      const finalists = bestRank === null
        ? []
        : ranked.filter((entry) =>
            priorityByRoot.get(entry.source.root_ref) === bestRank);
      if (finalists.length === 1) {
        [canonical] = finalists;
        reasonCode = "OWNER_ROOT_PRIORITY";
      } else if (residualRecordRefs.has(recordRef)
        && conflict.source_refs.includes(canonicalSourceRef)
        && conflict.source_refs.includes(projectionSourceRef)
        && finalists.length === 2
        && finalists.every((entry) =>
          [canonicalSourceRef, projectionSourceRef]
            .includes(entry.source.source_ref))) {
        canonical = recordEntry(
          contractByRef,
          canonicalSourceRef,
          recordRef,
        );
        reasonCode = "CANONICAL_MASTER_DATA";
      } else {
        throw new TypeError(
          `record authority remains unresolved: ${recordRef}`,
        );
      }
      resolvedOwnerConflictKeys.add(key);
      selectedRecordCounts.set(
        canonical.source.source_ref,
        (selectedRecordCounts.get(canonical.source.source_ref) ?? 0) + 1,
      );
    }
    recordDecisions.push(Object.freeze({
      source_family: sourceFamily,
      record_ref: recordRef,
      canonical_source_ref: canonical.source.source_ref,
      canonical_content_sha256: canonical.record.content_sha256,
      canonical_destination: "postgres-current",
      archive_only_sources: Object.freeze(candidates
        .filter((entry) =>
          entry.source.source_ref !== canonical.source.source_ref)
        .map((entry) => Object.freeze({
          source_ref: entry.source.source_ref,
          content_sha256: entry.record.content_sha256,
          disposition: "archive-only-lineage",
        }))
        .sort((left, right) =>
          left.source_ref.localeCompare(right.source_ref))),
      reason_code: reasonCode,
      decision_ref: `record-authority:${recordRef}`,
    }));
  }
  recordDecisions.sort((left, right) =>
    left.source_family.localeCompare(right.source_family)
      || left.record_ref.localeCompare(right.record_ref));
  if (resolvedOwnerConflictKeys.size
      !== recommendations.record_conflicts.length
    || recordDecisions.length
      !== automaticRecordDecisionCount + resolvedOwnerConflictKeys.size
    || residualRecordRefs.size !== recordDecisions.filter((decision) =>
      decision.reason_code === "CANONICAL_MASTER_DATA").length) {
    throw new TypeError("record authority conflict coverage is incomplete");
  }
  const sources = recommendations.sources.map((source) => {
    const classification = source.recommended_classification
      ?? ((selectedRecordCounts.get(source.source_ref) ?? 0) > 0
        ? "authoritative"
        : "superseded");
    return Object.freeze({
      source_ref: source.source_ref,
      root_ref: source.root_ref,
      source_family: source.source_family,
      sha256: source.sha256,
      classification,
      reason_code: source.recommended_classification === null
        ? classification === "authoritative"
          ? "OWNER_RECORD_WINNER"
          : "OWNER_RECORD_ARCHIVE_ONLY"
        : source.recommended_reason_code,
      decision_ref: `source-authority:${source.source_ref}`,
    });
  });
  const conflicts = recommendations.identity_conflicts;
  if (conflicts.roster_without_registered_account_refs.length > 0
    || conflicts.duplicate_email_refs.length > 0
    || conflicts.duplicate_matter_code_refs.length > 0) {
    throw new TypeError("record authority identity or matter conflicts remain");
  }
  const identityDecisions =
    conflicts.registered_account_without_roster_refs.map((identityRef) =>
      Object.freeze({
        identity_ref: identityRef,
        account_status: "disabled",
        roster_link_status: "pending-roster-link",
        login_allowed: false,
        password_setup_allowed: false,
        authorization_allowed: false,
        reason_code: "REGISTERED_ACCOUNT_ROSTER_LINK_PENDING",
        decision_ref: `identity-authority:${identityRef}`,
      }));
  const safeCounts = Object.freeze({
    source_count: sources.length,
    authoritative_source_count: sources.filter((source) =>
      source.classification === "authoritative").length,
    superseded_source_count: sources.filter((source) =>
      source.classification === "superseded").length,
    duplicate_source_count: sources.filter((source) =>
      source.classification === "duplicate").length,
    synthetic_source_count: sources.filter((source) =>
      source.classification === "synthetic").length,
    corrupt_source_count: sources.filter((source) =>
      source.classification === "corrupt").length,
    record_decision_count: recordDecisions.length,
    automatic_record_decision_count: automaticRecordDecisionCount,
    owner_record_decision_count: resolvedOwnerConflictKeys.size,
    residual_record_count: 0,
    identity_decision_count: identityDecisions.length,
    duplicate_email_count: 0,
    duplicate_matter_code_count: 0,
  });
  const value = Object.freeze({
    schema_version: JSON_POSTGRES_RECORD_AUTHORITY_VERSION,
    decision_set_ref: setRef,
    source_sha: sourceSha,
    source_tree: sourceTree,
    inventory_content_sha256: inventory.inventory_content_sha256,
    adjudication_contract_sha256:
      contract.adjudication_contract_sha256,
    recommendation_sha256: recommendations.recommendation_sha256,
    policy: Object.freeze({
      owner_decision_ref: decisionRef,
      root_priority: Object.freeze([...priority]),
      canonical_master_source_ref: canonicalSourceRef,
      crm_projection_source_ref: projectionSourceRef,
      master_data_residual_record_refs:
        Object.freeze([...residualRecordRefs].sort()),
      residual_comparison_sha256:
        residualComparison?.comparison_sha256 ?? null,
      source_selection_by_mtime: false,
      preserve_archive_lineage: true,
      preserve_unique_records: true,
      secrets_excluded: true,
    }),
    sources: Object.freeze(sources),
    record_decisions: Object.freeze(recordDecisions),
    identity_decisions: Object.freeze(identityDecisions),
    safe_counts: safeCounts,
    claims: Object.freeze({
      authority_selected_by_mtime: false,
      authority_decision_final: true,
      raw_value_returned: false,
      raw_path_returned: false,
      pii_returned: false,
      secret_material_returned: false,
      source_mutated: false,
      postgres_mutated: false,
      production_contacted: false,
    }),
  });
  return Object.freeze({
    ...value,
    authority_sha256: sha256(recordAuthorityMaterial(value)),
  });
}

export function validateJsonPostgresRecordAuthority(authority, {
  inventory,
  recommendations,
  residualComparison,
} = {}) {
  validateJsonPostgresRecordAuthorityBinding(authority, { inventory });
  const rebuilt = createJsonPostgresRecordAuthority({
    inventory,
    recommendations,
    residualComparison,
    decisionSetRef: authority.decision_set_ref,
    ownerDecisionRef: authority.policy?.owner_decision_ref,
    sourceSha: authority.source_sha,
    sourceTree: authority.source_tree,
    rootPriority: authority.policy?.root_priority,
    canonicalMasterSourceRef:
      authority.policy?.canonical_master_source_ref,
    crmProjectionSourceRef:
      authority.policy?.crm_projection_source_ref,
    masterDataResidualRecordRefs:
      authority.policy?.master_data_residual_record_refs,
  });
  if (stableJson(rebuilt) !== stableJson(authority)) {
    throw new TypeError("record authority manifest drifted");
  }
  return Object.freeze({
    valid: true,
    authority_sha256: authority.authority_sha256,
    source_count: authority.sources.length,
    record_decision_count: authority.record_decisions.length,
    residual_record_count: authority.safe_counts.residual_record_count,
  });
}

export function validateJsonPostgresRecordAuthorityBinding(authority, {
  inventory,
} = {}) {
  const expectedClaims = {
    authority_selected_by_mtime: false,
    authority_decision_final: true,
    raw_value_returned: false,
    raw_path_returned: false,
    pii_returned: false,
    secret_material_returned: false,
    source_mutated: false,
    postgres_mutated: false,
    production_contacted: false,
  };
  const policy = authority?.policy;
  if (!hasExactKeys(authority, [
    "schema_version",
    "decision_set_ref",
    "source_sha",
    "source_tree",
    "inventory_content_sha256",
    "adjudication_contract_sha256",
    "recommendation_sha256",
    "policy",
    "sources",
    "record_decisions",
    "identity_decisions",
    "safe_counts",
    "claims",
    "authority_sha256",
  ])
    || !hasExactKeys(policy, [
      "owner_decision_ref",
      "root_priority",
      "canonical_master_source_ref",
      "crm_projection_source_ref",
      "master_data_residual_record_refs",
      "residual_comparison_sha256",
      "source_selection_by_mtime",
      "preserve_archive_lineage",
      "preserve_unique_records",
      "secrets_excluded",
    ])
    || authority?.schema_version !== JSON_POSTGRES_RECORD_AUTHORITY_VERSION
    || !SHA256.test(authority?.authority_sha256 ?? "")
    || !SHA1.test(authority?.source_sha ?? "")
    || !SHA1.test(authority?.source_tree ?? "")
    || !SAFE_REF.test(authority?.decision_set_ref ?? "")
    || !SHA256.test(authority?.recommendation_sha256 ?? "")
    || sha256(recordAuthorityMaterial(authority))
      !== authority.authority_sha256
    || authority.inventory_content_sha256
      !== inventory?.inventory_content_sha256
    || authority.adjudication_contract_sha256
      !== inventory?.adjudication_contract?.adjudication_contract_sha256
    || authority.safe_counts?.residual_record_count !== 0
    || stableJson(authority.claims) !== stableJson(expectedClaims)
    || !SAFE_REF.test(policy?.owner_decision_ref ?? "")
    || !Array.isArray(policy?.root_priority)
    || policy.root_priority.length === 0
    || new Set(policy.root_priority).size !== policy.root_priority.length
    || policy.root_priority.some((rootRef) =>
      !SAFE_REF.test(rootRef))
    || !Array.isArray(policy?.master_data_residual_record_refs)
    || new Set(policy.master_data_residual_record_refs).size
      !== policy.master_data_residual_record_refs.length
    || policy.master_data_residual_record_refs.some((recordRef) =>
      !SOURCE_REF.test(recordRef))
    || policy.source_selection_by_mtime !== false
    || policy.preserve_archive_lineage !== true
    || policy.preserve_unique_records !== true
    || policy.secrets_excluded !== true) {
    throw new TypeError("record authority manifest is invalid");
  }
  const residualRefs = policy.master_data_residual_record_refs;
  if (stableJson(residualRefs)
      !== stableJson([...residualRefs].sort())
    || (residualRefs.length === 0
      ? policy.canonical_master_source_ref !== null
        || policy.crm_projection_source_ref !== null
        || policy.residual_comparison_sha256 !== null
      : !SOURCE_REF.test(policy.canonical_master_source_ref ?? "")
        || !SOURCE_REF.test(policy.crm_projection_source_ref ?? "")
        || policy.canonical_master_source_ref
          === policy.crm_projection_source_ref
        || !SHA256.test(policy.residual_comparison_sha256 ?? ""))) {
    throw new TypeError("record authority residual policy is invalid");
  }
  const inventoryByRef = new Map((inventory.sources ?? []).map((source) =>
    [source.source_ref, source]));
  const contractByRef = new Map(
    (inventory.adjudication_contract?.sources ?? []).map((source) =>
      [source.source_ref, source]),
  );
  const authorityByRef = new Map();
  for (const source of authority.sources ?? []) {
    const inventoried = inventoryByRef.get(source.source_ref);
    if (!hasExactKeys(source, [
      "source_ref",
      "root_ref",
      "source_family",
      "sha256",
      "classification",
      "reason_code",
      "decision_ref",
    ])
      || authorityByRef.has(source.source_ref)
      || !inventoried
      || source.root_ref !== inventoried.root_ref
      || source.source_family !== inventoried.source_family
      || source.sha256 !== inventoried.sha256
      || !["authoritative", "superseded", "duplicate", "synthetic", "corrupt"]
        .includes(source.classification)
      || !SAFE_REF.test(source.reason_code ?? "")
      || !SAFE_REF.test(source.decision_ref ?? "")) {
      throw new TypeError("record authority source binding is invalid");
    }
    authorityByRef.set(source.source_ref, source);
  }
  if (authorityByRef.size !== inventoryByRef.size) {
    throw new TypeError("record authority source coverage is incomplete");
  }
  const digestGroups = new Map();
  for (const source of inventory.sources ?? []) {
    if (!digestGroups.has(source.sha256)) digestGroups.set(source.sha256, []);
    digestGroups.get(source.sha256).push(source);
  }
  const recordsByKey = new Map();
  for (const sources of digestGroups.values()) {
    const representative = [...sources].sort(sourceOrder)[0];
    const lineage = contractByRef.get(representative.source_ref);
    for (const record of lineage?.records ?? []) {
      const key = `${representative.source_family}:${record.record_ref}`;
      if (!recordsByKey.has(key)) recordsByKey.set(key, []);
      recordsByKey.get(key).push({
        source_ref: representative.source_ref,
        content_sha256: record.content_sha256,
      });
    }
  }
  const divergentRecordKeys = new Set([...recordsByKey]
    .filter(([, records]) => new Set(records.map((record) =>
      record.content_sha256)).size > 1)
    .map(([key]) => key));
  const decisionKeys = new Set();
  const decisionRefs = new Set();
  for (const decision of authority.record_decisions ?? []) {
    const key = `${decision.source_family}:${decision.record_ref}`;
    const expectedCandidates = recordsByKey.get(key) ?? [];
    const canonicalSource = contractByRef.get(
      decision.canonical_source_ref,
    );
    const canonicalRecord = canonicalSource?.records.find((record) =>
      record.record_ref === decision.record_ref);
    if (!hasExactKeys(decision, [
      "source_family",
      "record_ref",
      "canonical_source_ref",
      "canonical_content_sha256",
      "canonical_destination",
      "archive_only_sources",
      "reason_code",
      "decision_ref",
    ])
      || decisionKeys.has(key)
      || decisionRefs.has(decision.decision_ref)
      || !divergentRecordKeys.has(key)
      || !SAFE_REF.test(decision.source_family ?? "")
      || !SOURCE_REF.test(decision.record_ref ?? "")
      || !canonicalRecord
      || canonicalSource.source_family !== decision.source_family
      || canonicalRecord.content_sha256
        !== decision.canonical_content_sha256
      || decision.canonical_destination !== "postgres-current"
      || authorityByRef.get(decision.canonical_source_ref)
          ?.classification !== "authoritative"
      || !Array.isArray(decision.archive_only_sources)
      || decision.archive_only_sources.length === 0
      || ![
        "HIGHER_STATE_VERSION",
        "LATEST_AUDIT_CHRONOLOGY",
        "OWNER_ROOT_PRIORITY",
        "CANONICAL_MASTER_DATA",
      ].includes(decision.reason_code)
      || !SAFE_REF.test(decision.decision_ref ?? "")) {
      throw new TypeError("record authority decision binding is invalid");
    }
    decisionKeys.add(key);
    decisionRefs.add(decision.decision_ref);
    const archiveRefs = new Set();
    for (const archived of decision.archive_only_sources) {
      const source = contractByRef.get(archived.source_ref);
      const record = source?.records.find((row) =>
        row.record_ref === decision.record_ref);
      if (!hasExactKeys(archived, [
        "source_ref",
        "content_sha256",
        "disposition",
      ])
        || archiveRefs.has(archived.source_ref)
        || archived.source_ref === decision.canonical_source_ref
        || archived.disposition !== "archive-only-lineage"
        || !record
        || source.source_family !== decision.source_family
        || record.content_sha256 !== archived.content_sha256) {
        throw new TypeError(
          "record authority archive binding is invalid",
        );
      }
      archiveRefs.add(archived.source_ref);
    }
    const actualCandidateRefs = [
      decision.canonical_source_ref,
      ...archiveRefs,
    ].sort();
    const expectedCandidateRefs = expectedCandidates.map((candidate) =>
      candidate.source_ref).sort();
    if (stableJson(actualCandidateRefs)
        !== stableJson(expectedCandidateRefs)) {
      throw new TypeError(
        "record authority candidate coverage is incomplete",
      );
    }
  }
  if (stableJson([...decisionKeys].sort())
      !== stableJson([...divergentRecordKeys].sort())) {
    throw new TypeError("record authority conflict coverage is incomplete");
  }
  const identityRefs = new Set();
  for (const decision of authority.identity_decisions ?? []) {
    if (!hasExactKeys(decision, [
      "identity_ref",
      "account_status",
      "roster_link_status",
      "login_allowed",
      "password_setup_allowed",
      "authorization_allowed",
      "reason_code",
      "decision_ref",
    ])
      || !SOURCE_REF.test(decision.identity_ref ?? "")
      || identityRefs.has(decision.identity_ref)
      || decision.account_status !== "disabled"
      || decision.roster_link_status !== "pending-roster-link"
      || decision.login_allowed !== false
      || decision.password_setup_allowed !== false
      || decision.authorization_allowed !== false
      || !SAFE_REF.test(decision.reason_code ?? "")
      || !SAFE_REF.test(decision.decision_ref ?? "")) {
      throw new TypeError("record authority identity decision is invalid");
    }
    identityRefs.add(decision.identity_ref);
  }
  const recomputed = {
    source_count: authorityByRef.size,
    authoritative_source_count: [...authorityByRef.values()].filter(
      (source) => source.classification === "authoritative").length,
    superseded_source_count: [...authorityByRef.values()].filter(
      (source) => source.classification === "superseded").length,
    duplicate_source_count: [...authorityByRef.values()].filter(
      (source) => source.classification === "duplicate").length,
    synthetic_source_count: [...authorityByRef.values()].filter(
      (source) => source.classification === "synthetic").length,
    corrupt_source_count: [...authorityByRef.values()].filter(
      (source) => source.classification === "corrupt").length,
    record_decision_count: decisionKeys.size,
    automatic_record_decision_count: authority.record_decisions.filter(
      (decision) => [
        "HIGHER_STATE_VERSION",
        "LATEST_AUDIT_CHRONOLOGY",
      ].includes(decision.reason_code)).length,
    owner_record_decision_count: authority.record_decisions.filter(
      (decision) => [
        "OWNER_ROOT_PRIORITY",
        "CANONICAL_MASTER_DATA",
      ].includes(decision.reason_code)).length,
    residual_record_count: 0,
    identity_decision_count: identityRefs.size,
    duplicate_email_count: 0,
    duplicate_matter_code_count: 0,
  };
  if (stableJson(recomputed) !== stableJson(authority.safe_counts)) {
    throw new TypeError("record authority counts are invalid");
  }
  return Object.freeze({
    valid: true,
    authority_sha256: authority.authority_sha256,
    source_count: authority.sources.length,
    record_decision_count: authority.record_decisions.length,
    residual_record_count: authority.safe_counts.residual_record_count,
  });
}

export function createJsonPostgresAdjudicationRecommendations({
  inventory,
  approvedInventoryContentSha256,
} = {}) {
  const inventoryContentSha256 = inventory?.inventory_content_sha256;
  if (!SHA256.test(approvedInventoryContentSha256 ?? "")
    || inventoryContentSha256 !== approvedInventoryContentSha256
    || !Array.isArray(inventory?.sources)) {
    throw new TypeError("approved adjudication inventory binding is invalid");
  }
  validateJsonPostgresSourceAdjudicationContract(
    inventory?.adjudication_contract,
    { inventoryContentSha256 },
  );
  const contract = inventory.adjudication_contract;
  const inventoryByRef = new Map(inventory.sources.map((source) => [
    source.source_ref,
    source,
  ]));
  const contractByRef = new Map(contract.sources.map((source) => [
    source.source_ref,
    source,
  ]));
  if (inventoryByRef.size !== inventory.sources.length
    || contractByRef.size !== contract.sources.length
    || inventoryByRef.size !== contractByRef.size) {
    throw new TypeError("adjudication inventory source binding is incomplete");
  }
  for (const source of contract.sources) {
    const inventoried = inventoryByRef.get(source.source_ref);
    if (!inventoried
      || source.root_ref !== inventoried.root_ref
      || source.source_family !== inventoried.source_family
      || source.source_sha256 !== inventoried.sha256) {
      throw new TypeError("adjudication inventory source binding drifted");
    }
  }
  const digestGroups = new Map();
  for (const source of inventory.sources) {
    if (!digestGroups.has(source.sha256)) digestGroups.set(source.sha256, []);
    digestGroups.get(source.sha256).push(source);
  }
  const representativeByDigest = new Map([...digestGroups].map(
    ([digest, sources]) => [
      digest,
      [...sources].sort(sourceOrder)[0],
    ],
  ));
  const representatives = [...representativeByDigest.values()];
  const winnerCounts = new Map();
  const conflictSources = new Set();
  const recordConflicts = [];
  const recordsByFamilyAndRef = new Map();
  for (const source of representatives) {
    const lineage = contractByRef.get(source.source_ref);
    for (const record of lineage.records) {
      const key = `${source.source_family}:${record.record_ref}`;
      if (!recordsByFamilyAndRef.has(key)) {
        recordsByFamilyAndRef.set(key, []);
      }
      recordsByFamilyAndRef.get(key).push({ source, record });
    }
  }
  for (const [key, entries] of recordsByFamilyAndRef) {
    const result = chooseRecordWinner(entries);
    if (result.conflict) {
      const [sourceFamily, recordRef] = key.split(":");
      const sourceRefs = [...new Set(entries.map((entry) =>
        entry.source.source_ref))].sort();
      sourceRefs.forEach((sourceRef) => conflictSources.add(sourceRef));
      recordConflicts.push(Object.freeze({
        source_family: sourceFamily,
        record_ref: recordRef,
        source_refs: sourceRefs,
        reason_code: "VERSION_OR_CHRONOLOGY_CONFLICT",
      }));
      continue;
    }
    winnerCounts.set(
      result.winner.source.source_ref,
      (winnerCounts.get(result.winner.source.source_ref) ?? 0) + 1,
    );
  }
  recordConflicts.sort((left, right) =>
    left.source_family.localeCompare(right.source_family)
      || left.record_ref.localeCompare(right.record_ref));

  const registrationUsers = new Set();
  const rosterUsers = new Set();
  const identitiesByEmail = new Map();
  const mattersByCode = new Map();
  for (const source of representatives) {
    const lineage = contractByRef.get(source.source_ref);
    for (const record of lineage.records) {
      if (source.root_ref === "registered-account-source"
        && record.user_ref) {
        registrationUsers.add(
          sha256(`${record.tenant_ref}:${record.user_ref}`).slice(0, 32),
        );
      }
      if (source.root_ref === "registered-roster-source"
        && record.user_ref) {
        rosterUsers.add(
          sha256(`${record.tenant_ref}:${record.user_ref}`).slice(0, 32),
        );
      }
      if (record.email_ref) {
        const identity = record.user_ref ?? record.employee_ref;
        if (identity) {
          const key = `${record.tenant_ref}:${record.email_ref}`;
          if (!identitiesByEmail.has(key)) {
            identitiesByEmail.set(key, new Set());
          }
          identitiesByEmail.get(key).add(identity);
        }
      }
      if (record.matter_code_ref && record.matter_ref) {
        const key = `${record.tenant_ref}:${record.matter_code_ref}`;
        if (!mattersByCode.has(key)) {
          mattersByCode.set(key, new Set());
        }
        mattersByCode.get(key).add(record.matter_ref);
      }
    }
  }
  const identityConflicts = Object.freeze({
    registered_account_without_roster_refs: Object.freeze(
      [...registrationUsers].filter((ref) => !rosterUsers.has(ref)).sort(),
    ),
    roster_without_registered_account_refs: Object.freeze(
      [...rosterUsers].filter((ref) => !registrationUsers.has(ref)).sort(),
    ),
    duplicate_email_refs: Object.freeze(
      [...identitiesByEmail]
        .filter(([, identities]) => identities.size > 1)
        .map(([key, identities]) => {
          const [tenantRef, emailRef] = key.split(":");
          return {
            tenant_ref: tenantRef,
            email_ref: emailRef,
            identity_refs: [...identities].sort(),
          };
        })
        .sort((left, right) =>
          left.tenant_ref.localeCompare(right.tenant_ref)
            || left.email_ref.localeCompare(right.email_ref)),
    ),
    duplicate_matter_code_refs: Object.freeze(
      [...mattersByCode]
        .filter(([, matters]) => matters.size > 1)
        .map(([key, matters]) => {
          const [tenantRef, matterCodeRef] = key.split(":");
          return {
            tenant_ref: tenantRef,
            matter_code_ref: matterCodeRef,
            matter_refs: [...matters].sort(),
          };
        })
        .sort((left, right) =>
          left.tenant_ref.localeCompare(right.tenant_ref)
            || left.matter_code_ref.localeCompare(right.matter_code_ref)),
    ),
  });

  const rows = inventory.sources.map((source) => {
    const representative = representativeByDigest.get(source.sha256);
    const isRepresentative =
      representative.source_ref === source.source_ref;
    let recommendation;
    if (!isRepresentative) {
      recommendation = {
        recommended_classification: "duplicate",
        recommended_reason_code: "EXACT_CONTENT_DUPLICATE",
        recommendation_confidence: "HIGH",
      };
    } else if (source.root_ref.startsWith("registered-")) {
      recommendation = {
        recommended_classification: "authoritative",
        recommended_reason_code: "REGISTERED_SOURCE_OF_TRUTH",
        recommendation_confidence: "HIGH",
      };
    } else if (source.source_family === "session-secret") {
      recommendation = {
        recommended_classification: "superseded",
        recommended_reason_code: "SECRET_ONLY_SOURCE_EXCLUDED",
        recommendation_confidence: "HIGH",
      };
    } else if (contractByRef.get(source.source_ref).parse_status
      === "parse-error") {
      recommendation = {
        recommended_classification: "corrupt",
        recommended_reason_code: "PARSE_ERROR",
        recommendation_confidence: "HIGH",
      };
    } else if (conflictSources.has(source.source_ref)) {
      recommendation = {
        recommended_classification: null,
        recommended_reason_code: "RECORD_CONFLICT_OWNER_DECISION_REQUIRED",
        recommendation_confidence: "UNRESOLVED",
      };
    } else if ((winnerCounts.get(source.source_ref) ?? 0) > 0) {
      recommendation = {
        recommended_classification: "authoritative",
        recommended_reason_code: "LATEST_RECORD_LINEAGE_CONTRIBUTOR",
        recommendation_confidence: "MEDIUM",
      };
    } else if (contractByRef.get(source.source_ref).record_count > 0) {
      recommendation = {
        recommended_classification: "superseded",
        recommended_reason_code: "RECORD_LINEAGE_FULLY_SUPERSEDED",
        recommendation_confidence: "MEDIUM",
      };
    } else {
      recommendation = {
        recommended_classification: null,
        recommended_reason_code: "NO_RECORD_LINEAGE_OWNER_REVIEW_REQUIRED",
        recommendation_confidence: "UNRESOLVED",
      };
    }
    return Object.freeze({
      source_ref: source.source_ref,
      root_ref: source.root_ref,
      source_family: source.source_family,
      sha256: source.sha256,
      digest_group_representative_ref: representative.source_ref,
      lineage_record_count:
        contractByRef.get(source.source_ref).record_count,
      winning_record_count: winnerCounts.get(source.source_ref) ?? 0,
      ...recommendation,
      owner_decision_required: true,
    });
  }).sort((left, right) =>
    left.source_ref.localeCompare(right.source_ref));
  const unresolvedSourceCount = rows.filter((row) =>
    row.recommended_classification === null).length;
  const identityConflictCount =
    identityConflicts.registered_account_without_roster_refs.length
    + identityConflicts.roster_without_registered_account_refs.length
    + identityConflicts.duplicate_email_refs.length
    + identityConflicts.duplicate_matter_code_refs.length;
  const safeCounts = Object.freeze({
    source_count: rows.length,
    digest_group_count: digestGroups.size,
    duplicate_source_count: rows.filter((row) =>
      row.recommended_classification === "duplicate").length,
    authoritative_candidate_count: rows.filter((row) =>
      row.recommended_classification === "authoritative").length,
    superseded_candidate_count: rows.filter((row) =>
      row.recommended_classification === "superseded").length,
    corrupt_candidate_count: rows.filter((row) =>
      row.recommended_classification === "corrupt").length,
    unresolved_source_count: unresolvedSourceCount,
    record_conflict_count: recordConflicts.length,
    identity_conflict_count: identityConflictCount,
    final_owner_decision_count: 0,
  });
  const value = Object.freeze({
    schema_version:
      JSON_POSTGRES_SOURCE_ADJUDICATION_RECOMMENDATIONS_VERSION,
    inventory_content_sha256: inventoryContentSha256,
    adjudication_contract_sha256:
      contract.adjudication_contract_sha256,
    sources: Object.freeze(rows),
    record_conflicts: Object.freeze(recordConflicts),
    identity_conflicts: identityConflicts,
    safe_counts: safeCounts,
    claims: Object.freeze({
      authority_selected_by_mtime: false,
      authority_decision_final: false,
      raw_value_returned: false,
      raw_path_returned: false,
      pii_returned: false,
      secret_material_returned: false,
      real_data_mutated: false,
      production_contacted: false,
    }),
  });
  return Object.freeze({
    ...value,
    recommendation_sha256: sha256(recommendationMaterial(value)),
  });
}

export function validateJsonPostgresAdjudicationRecommendations(
  recommendations,
  { inventory, approvedInventoryContentSha256 } = {},
) {
  if (recommendations?.schema_version
      !== JSON_POSTGRES_SOURCE_ADJUDICATION_RECOMMENDATIONS_VERSION
    || !SHA256.test(recommendations?.recommendation_sha256 ?? "")) {
    throw new TypeError("source adjudication recommendations are invalid");
  }
  const rebuilt = createJsonPostgresAdjudicationRecommendations({
    inventory,
    approvedInventoryContentSha256,
  });
  if (stableJson(rebuilt) !== stableJson(recommendations)) {
    throw new TypeError("source adjudication recommendations drifted");
  }
  return Object.freeze({
    valid: true,
    recommendation_sha256: recommendations.recommendation_sha256,
    source_count: recommendations.sources.length,
    unresolved_source_count:
      recommendations.safe_counts.unresolved_source_count,
  });
}

import { createHash } from "node:crypto";
import { lstat, readFile, realpath } from "node:fs/promises";
import { basename, isAbsolute, relative, sep } from "node:path";
import { ANALYTICS_DOMAIN_DESCRIPTOR } from "../../../packages/analytics/src/central-ledger.js";
import { AI_GOVERNANCE_DOMAIN_DESCRIPTOR } from "../../../packages/ai-governance/src/central-ledger.js";
import { FINANCE_DOMAIN_DESCRIPTOR } from "../../../packages/billing/src/central-ledger.js";
import { PORTAL_DOMAIN_DESCRIPTOR } from "../../../packages/client-portal/src/central-ledger.js";
import { CRM_DOMAIN_DESCRIPTOR } from "../../../packages/crm/src/central-ledger.js";
import { DMS_AUXILIARY_DOMAIN_DESCRIPTOR } from "../../../packages/dms/src/central-ledger.js";
import { EMAIL_DMS_DOMAIN_DESCRIPTOR } from "../../../packages/email-dms/src/central-ledger.js";
import { ENTERPRISE_READINESS_DOMAIN_DESCRIPTOR } from "../../../packages/enterprise/src/central-ledger.js";
import { createHrxDomainSnapshot } from "../../../packages/hrx/src/postgres-store-v2.js";
import {
  HRX_STORE_TABLES,
  HRX_TABLE_PRIMARY_KEYS,
  HRX_TABLE_UNIQUE_CONSTRAINTS,
  createFileHrxStore,
} from "../../../packages/hrx/src/store/file-store.js";
import { loadHrxCoreMigrations } from "../../../packages/hrx/src/migrations/index.js";
import { INTAKE_DOMAIN_DESCRIPTOR } from "../../../packages/intake/src/central-ledger.js";
import { MASTER_DATA_DOMAIN_DESCRIPTOR } from "../../../packages/master-data/src/central-ledger.js";
import { MATTER_DOMAIN_DESCRIPTOR } from "../../../packages/matter/src/central-ledger.js";
import {
  createDomainSnapshot,
  hashDomainValue,
} from "../../../packages/persistence/src/domain-ledger.js";
import {
  JSON_POSTGRES_MIGRATION_SCHEMA_VERSION,
  prepareJsonPostgresMigrationCorpus,
} from "../../../packages/persistence/src/postgres/json-postgres-migration.js";
import {
  inspectJsonPostgresAdjudicationSource,
  validateJsonPostgresRecordAuthorityBinding,
} from "../../../packages/persistence/src/postgres/source-adjudication.js";
import {
  validateJsonPostgresSourceLocatorManifest,
} from "../../../packages/persistence/src/postgres/source-locator-manifest.js";
import {
  createRecordRepositoryDomainSnapshot,
} from "../../../packages/persistence/src/record-domain-adapter.js";
import { UI_READINESS_DOMAIN_DESCRIPTOR } from "../../../packages/platform/src/ui-readiness-central-ledger.js";
import {
  isSafeCredentialPersistenceField,
} from "../../../packages/persistence/src/credential-reference.js";

export const JSON_POSTGRES_SOURCE_TRANSFORM_PLAN_VERSION =
  "law-firm-os.json-postgres-source-transform-plan.v2";
export const JSON_POSTGRES_SOURCE_TRANSFORM_RESULT_VERSION =
  "law-firm-os.json-postgres-source-transform-result.v2";

const MAX_SOURCE_BYTES = 64 * 1024 * 1024;
const SHA256 = /^[a-f0-9]{64}$/u;
const SAFE_REF = /^[A-Za-z0-9_.:-]{1,160}$/u;
const SOURCE_REF = /^[a-f0-9]{32}$/u;
const FINAL_CLASSIFICATIONS = new Set([
  "authoritative",
  "superseded",
  "duplicate",
  "synthetic",
  "corrupt",
]);
const TRANSFORM_KINDS = new Set([
  "identity-registration",
  "identity-roster",
  "runtime-domain-store",
  "hrx-table-store",
]);
const SECRET_FIELD =
  /(^|_)(?:passwords?|password_hash|passwd|passphrases?|secrets?|tokens?|credentials?|authorization|api_key|private_key|recovery_key|document_bytes|raw_bytes|raw_payload)(_|$)/iu;
const REGISTRATION_PROFILE_FIELDS = Object.freeze([
  "display_name",
  "english_name",
  "source_title",
  "mfa_required",
  "production_status",
  "qa_tenant_scope",
  "registration_state",
  "highest_privilege",
  "privilege_rank",
  "assurance_level",
  "source_ref",
]);
const REGISTRATION_MAPPED_FIELDS = new Set([
  "user_id", "email", "status", "account_status", "credential_provider",
  "credential_status", "credential_rev", "profile", "membership",
  "tenant_memberships", "role_profile_id", "role_ids", "group_ids", "scopes",
  "hrx_scopes", "local_dev", ...REGISTRATION_PROFILE_FIELDS,
]);
const ROSTER_MAPPED_FIELDS = new Set([
  "user_id", "employee_id", "display_name", "legal_name", "work_email", "title",
  "employment_type", "status", "profile_status", "affiliation", "department",
  "organization_group", "org_unit_id", "country", "professional_profile",
  "start_date", "mobile_phone", "effective_from", "effective_to",
  "manager_employee_id", "legal_entity_id",
]);
const DESCRIPTORS = new Map([
  ["master-data", MASTER_DATA_DOMAIN_DESCRIPTOR],
  ["matter", MATTER_DOMAIN_DESCRIPTOR],
  ["dms-auxiliary", DMS_AUXILIARY_DOMAIN_DESCRIPTOR],
  ["email-dms", EMAIL_DMS_DOMAIN_DESCRIPTOR],
  ["crm", CRM_DOMAIN_DESCRIPTOR],
  ["intake", INTAKE_DOMAIN_DESCRIPTOR],
  ["finance", FINANCE_DOMAIN_DESCRIPTOR],
  ["analytics", ANALYTICS_DOMAIN_DESCRIPTOR],
  ["ai-governance", AI_GOVERNANCE_DOMAIN_DESCRIPTOR],
  ["client-portal", PORTAL_DOMAIN_DESCRIPTOR],
  ["ui-readiness", UI_READINESS_DOMAIN_DESCRIPTOR],
  ["enterprise-readiness", ENTERPRISE_READINESS_DOMAIN_DESCRIPTOR],
]);

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function requiredText(value, label) {
  const text = String(value ?? "").trim();
  if (!text) throw new TypeError(`${label} is required`);
  return text;
}

function requiredRef(value, label) {
  const text = requiredText(value, label);
  if (!SAFE_REF.test(text)) throw new TypeError(`${label} is invalid`);
  return text;
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

function preservedSourceAttributes(source, mappedFields) {
  return Object.fromEntries(Object.entries(source)
    .filter(([key]) => !mappedFields.has(key)));
}

function closedObject(value, keys, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object`);
  }
  const extras = Object.keys(value).filter((key) => !keys.includes(key));
  if (extras.length > 0) throw new TypeError(`${label} contains unsupported fields: ${extras.join(",")}`);
}

function transformPlanMaterial(value) {
  return {
    schema_version: value.schema_version,
    transform_set_ref: value.transform_set_ref,
    tenant_id: value.tenant_id,
    inventory_content_sha256: value.inventory_content_sha256,
    locator_manifest_sha256: value.locator_manifest_sha256,
    approved_root_refs: value.approved_root_refs,
    account_only_user_ids: value.account_only_user_ids,
    record_authority: value.record_authority,
    sources: value.sources,
  };
}

function normalizeTransform(transform, classification) {
  if (classification !== "authoritative") {
    if (transform != null) throw new TypeError("non-authoritative source must not have a transform");
    return null;
  }
  closedObject(transform, ["kind", "domain_id"], "source transform");
  if (!TRANSFORM_KINDS.has(transform.kind)) throw new TypeError("authoritative source transform kind is invalid");
  const domainId = transform.domain_id == null ? null : requiredRef(transform.domain_id, "transform domain_id");
  if (transform.kind === "runtime-domain-store") {
    if (!DESCRIPTORS.has(domainId)) throw new TypeError(`runtime domain transform is unsupported: ${domainId}`);
  } else if (transform.kind === "hrx-table-store") {
    if (domainId !== "hrx") throw new TypeError("HRX table transform must use the hrx domain");
  } else if (domainId !== null) {
    throw new TypeError("identity transforms must not set domain_id");
  }
  return Object.freeze({ kind: transform.kind, domain_id: domainId });
}

export function createJsonPostgresSourceTransformPlan({
  inventory,
  locatorManifest,
  transformSetRef,
  tenantId,
  approvedRootRefs = [],
  accountOnlyUserIds = [],
  decisions = [],
  recordAuthority,
} = {}) {
  validateJsonPostgresSourceLocatorManifest(locatorManifest, { inventory });
  validateJsonPostgresRecordAuthorityBinding(recordAuthority, {
    inventory,
  });
  const inventoryDigest = inventory?.inventory_content_sha256;
  if (!SHA256.test(inventoryDigest ?? "")) throw new TypeError("source transform requires an exact inventory");
  const approvedRoots = Object.freeze([...new Set(approvedRootRefs.map((value) =>
    requiredRef(value, "approved root ref")))].sort());
  const approvedRootSet = new Set(approvedRoots);
  const accountOnly = Object.freeze([...new Set(accountOnlyUserIds.map((value) =>
    requiredRef(value, "account-only user id")))].sort());
  if (accountOnly.length !== recordAuthority.identity_decisions.length) {
    throw new TypeError(
      "account-only users drifted from record authority identity decisions",
    );
  }
  const sourceByRef = new Map(inventory.sources.map((source) => [source.source_ref, source]));
  const rows = [];
  for (const decision of decisions) {
    closedObject(
      decision,
      ["source_ref", "root_ref", "source_family", "sha256", "classification", "reason_code", "decision_ref", "transform"],
      "source transform decision",
    );
    const sourceRef = requiredText(decision.source_ref, "source ref");
    if (!SOURCE_REF.test(sourceRef)) throw new TypeError("source ref is invalid");
    const source = sourceByRef.get(sourceRef);
    if (!source || source.sha256 !== decision.sha256) throw new TypeError(`source transform decision drifted: ${sourceRef}`);
    if (decision.root_ref != null && decision.root_ref !== source.root_ref) {
      throw new TypeError(`source transform root drifted: ${sourceRef}`);
    }
    if (decision.source_family != null
      && decision.source_family !== source.source_family) {
      throw new TypeError(
        `source transform family drifted: ${sourceRef}`,
      );
    }
    const classification = requiredText(decision.classification, "source classification");
    if (!FINAL_CLASSIFICATIONS.has(classification)) throw new TypeError(`source decision is not terminal: ${sourceRef}`);
    if (!approvedRootSet.has(source.root_ref)) throw new TypeError(`source root is not approved: ${source.root_ref}`);
    rows.push(Object.freeze({
      source_ref: sourceRef,
      root_ref: source.root_ref,
      source_family: source.source_family,
      sha256: source.sha256,
      classification,
      reason_code: requiredRef(decision.reason_code, "source decision reason code"),
      decision_ref: requiredRef(decision.decision_ref, "source decision ref"),
      transform: normalizeTransform(decision.transform, classification),
    }));
  }
  rows.sort((left, right) => left.source_ref.localeCompare(right.source_ref));
  if (rows.length !== inventory.sources.length
    || new Set(rows.map((row) => row.source_ref)).size !== rows.length) {
    throw new TypeError("source transform plan must adjudicate every inventory source exactly once");
  }
  if (!rows.some((row) => row.classification === "authoritative")) {
    throw new TypeError("source transform plan selects no authoritative source");
  }
  const authorityByRef = new Map(recordAuthority.sources.map((source) =>
    [source.source_ref, source]));
  if (rows.some((row) => {
    const authority = authorityByRef.get(row.source_ref);
    return !authority
      || authority.root_ref !== row.root_ref
      || authority.source_family !== row.source_family
      || authority.sha256 !== row.sha256
      || authority.classification !== row.classification
      || authority.reason_code !== row.reason_code
      || authority.decision_ref !== row.decision_ref;
  })) {
    throw new TypeError(
      "source transform decisions drifted from record authority",
    );
  }
  const value = Object.freeze({
    schema_version: JSON_POSTGRES_SOURCE_TRANSFORM_PLAN_VERSION,
    transform_set_ref: requiredRef(transformSetRef, "transform set ref"),
    tenant_id: requiredRef(tenantId, "transform tenant id"),
    inventory_content_sha256: inventoryDigest,
    locator_manifest_sha256: locatorManifest.locator_manifest_sha256,
    approved_root_refs: approvedRoots,
    account_only_user_ids: accountOnly,
    record_authority: recordAuthority,
    sources: Object.freeze(rows),
  });
  return Object.freeze({
    ...value,
    transform_sha256: sha256(stableJson(transformPlanMaterial(value))),
  });
}

export function validateJsonPostgresSourceTransformPlan(plan, {
  inventory,
  locatorManifest,
} = {}) {
  if (plan?.schema_version !== JSON_POSTGRES_SOURCE_TRANSFORM_PLAN_VERSION
    || !SHA256.test(plan?.transform_sha256 ?? "")) {
    throw new TypeError("source transform plan schema is invalid");
  }
  const rebuilt = createJsonPostgresSourceTransformPlan({
    inventory,
    locatorManifest,
    transformSetRef: plan.transform_set_ref,
    tenantId: plan.tenant_id,
    approvedRootRefs: plan.approved_root_refs,
    accountOnlyUserIds: plan.account_only_user_ids,
    recordAuthority: plan.record_authority,
    decisions: plan.sources,
  });
  if (stableJson(rebuilt) !== stableJson(plan)) throw new TypeError("source transform plan digest or binding drifted");
  return Object.freeze({
    valid: true,
    transform_sha256: plan.transform_sha256,
    source_count: plan.sources.length,
  });
}

export function validateJsonPostgresSourceTransformResult(result) {
  closedObject(result, [
    "schema_version",
    "inventory_content_sha256",
    "locator_manifest_sha256",
    "source_transform_plan_sha256",
    "migration_manifest_sha256",
    "safe_counts",
    "claims",
    "result_sha256",
    "source_sha",
    "source_tree",
    "source_read_packet_sha256",
  ], "source transform result");
  if (result.schema_version !== JSON_POSTGRES_SOURCE_TRANSFORM_RESULT_VERSION
    || !SHA256.test(result.result_sha256 ?? "")
    || !SHA256.test(result.inventory_content_sha256 ?? "")
    || !SHA256.test(result.locator_manifest_sha256 ?? "")
    || !SHA256.test(result.source_transform_plan_sha256 ?? "")
    || !SHA256.test(result.migration_manifest_sha256 ?? "")) {
    throw new TypeError("source transform result schema or digest is invalid");
  }
  const material = {
    schema_version: result.schema_version,
    inventory_content_sha256: result.inventory_content_sha256,
    locator_manifest_sha256: result.locator_manifest_sha256,
    source_transform_plan_sha256: result.source_transform_plan_sha256,
    migration_manifest_sha256: result.migration_manifest_sha256,
    safe_counts: result.safe_counts,
    claims: result.claims,
  };
  if (sha256(stableJson(material)) !== result.result_sha256) {
    throw new TypeError("source transform result digest drifted");
  }
  if (!result.safe_counts || Object.values(result.safe_counts).some((value) =>
    !Number.isSafeInteger(value) || value < 0)) {
    throw new TypeError("source transform result safe counts are invalid");
  }
  if (!result.claims || Object.values(result.claims).some((value) => value !== false)) {
    throw new TypeError("source transform result contains an affirmative claim");
  }
  return Object.freeze({
    valid: true,
    result_sha256: result.result_sha256,
    migration_manifest_sha256: result.migration_manifest_sha256,
  });
}

function sanitize(value, state, depth = 0) {
  if (depth > 32) throw new TypeError("source JSON exceeds the maximum transform depth");
  if (Array.isArray(value)) return value.map((item) => sanitize(item, state, depth + 1));
  if (value === null || typeof value !== "object") return value;
  const output = {};
  for (const [key, item] of Object.entries(value)) {
    const normalizedKey = normalizedFieldName(key);
    if ((SECRET_FIELD.test(normalizedKey)
        && !isSafeCredentialPersistenceField(normalizedKey, item))
      || isSerializedBytes(item)) {
      state.excludedSecretFieldCount += 1;
      state.excludedSecretFieldNames.add(
        isSerializedBytes(item) ? "serialized_bytes" : normalizedKey,
      );
      continue;
    }
    output[key] = sanitize(item, state, depth + 1);
  }
  return output;
}

async function readExactSource(locator, expected, state) {
  if (!isAbsolute(locator.root_path) || !isAbsolute(locator.source_path)) {
    throw new TypeError("source locator paths must be absolute");
  }
  if ((await lstat(locator.root_path)).isSymbolicLink() || (await lstat(locator.source_path)).isSymbolicLink()) {
    throw new TypeError("source locator must not use symlinks");
  }
  const [rootPath, sourcePath] = await Promise.all([
    realpath(locator.root_path),
    realpath(locator.source_path),
  ]);
  const rel = relative(rootPath, sourcePath);
  if (rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel)) {
    throw new TypeError("source locator escapes its approved root");
  }
  const metadata = await lstat(sourcePath);
  if (!metadata.isFile() || metadata.size > MAX_SOURCE_BYTES) {
    throw new TypeError("source locator must reference a bounded regular file");
  }
  const bytes = await readFile(sourcePath);
  if (bytes.length !== expected.byte_size || sha256(bytes) !== expected.sha256) {
    throw new TypeError(`source bytes drifted: ${expected.source_ref}`);
  }
  state.verifiedSourceCount += 1;
  if (expected.classification !== "authoritative") return null;
  const sourceName = basename(sourcePath);
  let parsed;
  if (/\.json(?:[-.][a-z0-9]+)?$/iu.test(sourceName)) {
    parsed = JSON.parse(bytes);
  } else if (/\.(?:jsonl|ndjson)(?:[-.][a-z0-9]+)?$/iu.test(
    sourceName,
  )) {
    parsed = bytes.toString("utf8").split(/\r?\n/u).filter(Boolean).map((line) => JSON.parse(line));
  } else {
    throw new TypeError(`authoritative source is not supported JSON: ${expected.source_ref}`);
  }
  state.parsedAuthoritativeSourceCount += 1;
  return sanitize(parsed, state);
}

function authorityDecisionKey(sourceFamily, recordRef) {
  return `${sourceFamily}:${recordRef}`;
}

function filterAuthorityRows(rows, wrapper, source, decisions, state) {
  if (!Array.isArray(rows)) return rows;
  const byOrder = new Map(
    inspectJsonPostgresAdjudicationSource(wrapper).records.map((record) =>
      [record.source_order, record]),
  );
  return rows.filter((row, index) => {
    const fingerprint = byOrder.get(index);
    if (!fingerprint) return true;
    const decision = decisions.get(authorityDecisionKey(
      source.source_family,
      fingerprint.record_ref,
    ));
    if (!decision) return true;
    const candidateRefs = new Set([
      decision.canonical_source_ref,
      ...decision.archive_only_sources.map((entry) => entry.source_ref),
    ]);
    if (!candidateRefs.has(source.source_ref)) {
      throw new TypeError(
        `record authority candidate drifted: ${fingerprint.record_ref}`,
      );
    }
    const expectedContent = source.source_ref
      === decision.canonical_source_ref
      ? decision.canonical_content_sha256
      : decision.archive_only_sources.find((entry) =>
          entry.source_ref === source.source_ref)?.content_sha256;
    if (fingerprint.content_sha256 !== expectedContent) {
      throw new TypeError(
        `record authority content drifted: ${fingerprint.record_ref}`,
      );
    }
    if (source.source_ref === decision.canonical_source_ref) {
      state.canonicalRecordDecisionKeys.add(authorityDecisionKey(
        source.source_family,
        fingerprint.record_ref,
      ));
      return true;
    }
    state.archiveOnlyRecordCopyCount += 1;
    return false;
  });
}

function applyRecordAuthority(parsed, source, recordAuthority, state) {
  const decisions = new Map(recordAuthority.record_decisions.map(
    (decision) => [
      authorityDecisionKey(
        decision.source_family,
        decision.record_ref,
      ),
      decision,
    ],
  ));
  if (Array.isArray(parsed)) {
    return filterAuthorityRows(
      parsed,
      parsed,
      source,
      decisions,
      state,
    );
  }
  const output = { ...parsed };
  for (const key of [
    "records",
    "idempotency",
    "idempotency_entries",
    "audit_events",
    "users",
    "members",
    "profiles",
    "contacts",
  ]) {
    if (!Array.isArray(parsed[key])) continue;
    output[key] = filterAuthorityRows(
      parsed[key],
      { [key]: parsed[key] },
      source,
      decisions,
      state,
    );
  }
  if (parsed.tables && typeof parsed.tables === "object"
    && !Array.isArray(parsed.tables)) {
    output.tables = Object.fromEntries(Object.entries(parsed.tables).map(
      ([table, rows]) => [
        table,
        filterAuthorityRows(
          rows,
          { tables: { [table]: rows } },
          source,
          decisions,
          state,
        ),
      ],
    ));
  }
  return output;
}

function snapshotRepository(state) {
  return Object.freeze({ snapshot: () => structuredClone(state) });
}

function mergeSnapshots(snapshots, tenantId, domainId) {
  const records = new Map();
  const idempotency = new Map();
  const audit = new Map();
  for (const snapshot of snapshots) {
    for (const record of snapshot.records) {
      const key = `${record.record_type}:${record.record_id}`;
      const prior = records.get(key);
      if (prior && hashDomainValue(prior) !== hashDomainValue(record)) {
        throw new TypeError(`conflicting authoritative ${domainId} record: ${key}`);
      }
      records.set(key, record);
    }
    for (const entry of snapshot.idempotency_entries) {
      const prior = idempotency.get(entry.key);
      if (prior && hashDomainValue(prior) !== hashDomainValue(entry)) {
        throw new TypeError(`conflicting authoritative ${domainId} idempotency entry`);
      }
      idempotency.set(entry.key, entry);
    }
    for (const event of snapshot.audit_events) {
      const prior = audit.get(event.event_id);
      if (prior && hashDomainValue(prior) !== hashDomainValue(event)) {
        throw new TypeError(`conflicting authoritative ${domainId} audit event`);
      }
      audit.set(event.event_id, event);
    }
  }
  return createDomainSnapshot({
    tenant_id: tenantId,
    domain_id: domainId,
    records: [...records.values()],
    idempotency_entries: [...idempotency.values()],
    audit_events: [...audit.values()],
  });
}

function rosterState(rosters, tenantId) {
  const members = rosters.flatMap((source) => source.members ?? []);
  const employeeIds = new Set();
  const userIds = new Set();
  const tables = {
    hrx_employees: [],
    hrx_employment_profiles: [],
    hrx_employee_user_links: [],
  };
  for (const member of members) {
    const employeeId = requiredRef(member.employee_id, "roster employee id");
    const userId = requiredRef(member.user_id, "roster user id");
    if (employeeIds.has(employeeId) || userIds.has(userId)) throw new TypeError("roster contains duplicate employee or user identity");
    if (member.legal_entity_id != null) {
      throw new TypeError(
        "roster legal_entity_id must come from an approved legal-entity mapping",
      );
    }
    employeeIds.add(employeeId);
    userIds.add(userId);
    const sourceRef = "approved-identity-roster";
    tables.hrx_employees.push({
      tenant_id: tenantId,
      employee_id: employeeId,
      display_name: requiredText(member.display_name, "roster display name"),
      legal_name: member.legal_name ?? null,
      work_email: requiredText(member.work_email, "roster work email").toLowerCase(),
      mobile_phone: member.mobile_phone ?? null,
      status: member.status === "inactive" ? "inactive" : "active",
      source_ref: sourceRef,
    });
    tables.hrx_employment_profiles.push({
      tenant_id: tenantId,
      profile_id: `profile_${employeeId}`,
      employee_id: employeeId,
      employment_type: member.employment_type ?? "full_time",
      status: member.profile_status === "terminated" ? "terminated" : "active",
      title: member.title ?? null,
      org_unit_id: member.org_unit_id ?? null,
      legal_entity_id: null,
      affiliation: member.affiliation ?? null,
      department: member.department ?? null,
      organization_group: member.organization_group ?? null,
      country: member.country ?? null,
      start_date: member.start_date ?? null,
      manager_employee_id: member.manager_employee_id ?? null,
      effective_from: String(
        member.effective_from ?? member.start_date ?? "1970-01-01",
      ).slice(0, 10),
      effective_to: member.effective_to ?? null,
      source_ref: sourceRef,
      professional_profile: JSON.stringify(member.professional_profile ?? {}),
    });
    tables.hrx_employee_user_links.push({
      tenant_id: tenantId,
      link_id: `login_${employeeId}`,
      employee_id: employeeId,
      user_id: userId,
      purpose: "login_mapping",
      source_ref: sourceRef,
    });
  }
  return {
    schema_version: "law-firm-os.hrx-file-store.v0.1",
    applied_migrations: [],
    tables,
  };
}

function hrxPrimaryKey(table, row) {
  return HRX_TABLE_PRIMARY_KEYS[table]
    .map((field) => requiredText(row[field], `${table}.${field}`))
    .join("\u0000");
}

const HRX_CHRONOLOGY_FIELDS = Object.freeze([
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

const HRX_ROOT_PRIORITY = Object.freeze({
  "registered-roster-source": 0,
  "runtime-primary": 10,
  "runtime-desktop": 20,
  "runtime-electron": 30,
  "packaged-lawos-user-data": 40,
  "local-backups": 50,
});

function hrxChronology(row) {
  let latest = 0;
  for (const field of HRX_CHRONOLOGY_FIELDS) {
    const parsed = Date.parse(row?.[field]);
    if (Number.isFinite(parsed)) latest = Math.max(latest, parsed);
  }
  return latest;
}

function rosterProfileMatchScore(row, rosterProfile) {
  const fields = [
    "title",
    "org_unit_id",
    "manager_employee_id",
    "employment_type",
    "status",
    "professional_profile",
  ];
  let comparable = 0;
  let matching = 0;
  for (const field of fields) {
    if (rosterProfile?.[field] == null || row?.[field] == null) continue;
    comparable += 1;
    if (hashDomainValue(rosterProfile[field])
        === hashDomainValue(row[field])) {
      matching += 1;
    }
  }
  return { comparable, matching };
}

function chooseHrxPrimaryKeyWinner(
  prior,
  candidate,
  table,
  rosterProfilesByEmployee,
) {
  const priorIsRosterAuthority =
    prior.source.transform?.kind === "identity-roster";
  const candidateIsRosterAuthority =
    candidate.source.transform?.kind === "identity-roster";
  const rosterAuthorityTable = [
    "hrx_employees",
    "hrx_employment_profiles",
    "hrx_employee_user_links",
  ].includes(table);
  if (rosterAuthorityTable
    && priorIsRosterAuthority) {
    return { winner: prior, reason_code: "REGISTERED_ROSTER_AUTHORITY" };
  }
  if (rosterAuthorityTable
    && candidateIsRosterAuthority) {
    return {
      winner: candidate,
      reason_code: "REGISTERED_ROSTER_AUTHORITY",
    };
  }
  const priorVersion = Number.isSafeInteger(prior.row.state_version)
    ? prior.row.state_version
    : null;
  const candidateVersion = Number.isSafeInteger(candidate.row.state_version)
    ? candidate.row.state_version
    : null;
  if (priorVersion !== candidateVersion
    && (priorVersion !== null || candidateVersion !== null)) {
    return candidateVersion !== null
      && (priorVersion === null || candidateVersion > priorVersion)
      ? { winner: candidate, reason_code: "HIGHER_STATE_VERSION" }
      : { winner: prior, reason_code: "HIGHER_STATE_VERSION" };
  }
  const priorChronology = hrxChronology(prior.row);
  const candidateChronology = hrxChronology(candidate.row);
  if (priorChronology !== candidateChronology
    && (priorChronology > 0 || candidateChronology > 0)) {
    return candidateChronology > priorChronology
      ? { winner: candidate, reason_code: "LATEST_AUDIT_CHRONOLOGY" }
      : { winner: prior, reason_code: "LATEST_AUDIT_CHRONOLOGY" };
  }
  if (table === "hrx_employment_profiles"
    && prior.row.employee_id === candidate.row.employee_id) {
    const rosterProfile = rosterProfilesByEmployee.get(
      prior.row.employee_id,
    );
    const priorScore = rosterProfileMatchScore(
      prior.row,
      rosterProfile,
    );
    const candidateScore = rosterProfileMatchScore(
      candidate.row,
      rosterProfile,
    );
    if (priorScore.comparable > 0
      && candidateScore.comparable > 0
      && priorScore.matching !== candidateScore.matching) {
      return candidateScore.matching > priorScore.matching
        ? {
            winner: candidate,
            reason_code: "REGISTERED_ROSTER_FIELD_AUTHORITY",
          }
        : {
            winner: prior,
            reason_code: "REGISTERED_ROSTER_FIELD_AUTHORITY",
          };
    }
  }
  const priorRank = HRX_ROOT_PRIORITY[prior.source.root_ref];
  const candidateRank = HRX_ROOT_PRIORITY[candidate.source.root_ref];
  if (Number.isSafeInteger(priorRank)
    && Number.isSafeInteger(candidateRank)
    && priorRank !== candidateRank) {
    return candidateRank < priorRank
      ? { winner: candidate, reason_code: "OWNER_ROOT_PRIORITY" }
      : { winner: prior, reason_code: "OWNER_ROOT_PRIORITY" };
  }
  return null;
}

function mergeHrxStates(entries, tenantId) {
  const normalized = entries.map(({ state, source }) => {
    const store = createFileHrxStore({ initialState: state });
    try {
      return { state: store.snapshot(), source };
    } finally {
      store.close();
    }
  });
  const schemaVersions = new Set(normalized.map((entry) =>
    entry.state.schema_version));
  if (schemaVersions.size !== 1) {
    throw new TypeError("authoritative HRX schema versions conflict");
  }
  const tables = Object.fromEntries(HRX_STORE_TABLES.map((table) => [
    table,
    new Map(),
  ]));
  const resolutionRefs = new Set();
  const rosterResolutionRefs = new Set();
  const uniqueResolutionRefs = new Set();
  const unresolved = new Map();
  const rosterProfilesByEmployee = new Map(
    normalized
      .filter((entry) =>
        entry.source.transform?.kind === "identity-roster")
      .flatMap((entry) =>
        entry.state.tables?.hrx_employment_profiles ?? [])
      .filter((row) =>
        row.tenant_id === tenantId && row.employee_id)
      .map((row) => [row.employee_id, row]),
  );
  normalized.forEach(({ state, source }) => {
    for (const table of HRX_STORE_TABLES) {
      for (const row of state.tables?.[table] ?? []) {
        if (row.tenant_id !== tenantId) continue;
        const key = hrxPrimaryKey(table, row);
        const prior = tables[table].get(key);
        const candidate = { row, source };
        if (prior && hashDomainValue(prior.row) !== hashDomainValue(row)) {
          const conflictRef = `${table}:${sha256(key).slice(0, 24)}`;
          if (prior.source.source_ref === candidate.source.source_ref) {
            throw new TypeError(
              `conflicting authoritative HRX record within one source: ${conflictRef}`,
            );
          }
          const selected = chooseHrxPrimaryKeyWinner(
            prior,
            candidate,
            table,
            rosterProfilesByEmployee,
          );
          if (!selected) {
            const differingFieldNames = [...new Set([
              ...Object.keys(prior.row),
              ...Object.keys(candidate.row),
            ])].filter((field) =>
              hashDomainValue(prior.row[field])
                !== hashDomainValue(candidate.row[field]))
              .sort();
            const existing = unresolved.get(conflictRef);
            unresolved.set(conflictRef, {
              table,
              record_ref: sha256(`${table}:${key}`).slice(0, 32),
              source_refs: [...new Set([
                ...(existing?.source_refs ?? []),
                prior.source.source_ref,
                candidate.source.source_ref,
              ])].sort(),
              root_refs: [...new Set([
                ...(existing?.root_refs ?? []),
                prior.source.root_ref,
                candidate.source.root_ref,
              ])].sort(),
              state_versions: [...new Set([
                ...(existing?.state_versions ?? []),
                Number.isSafeInteger(prior.row.state_version)
                  ? prior.row.state_version
                  : null,
                Number.isSafeInteger(candidate.row.state_version)
                  ? candidate.row.state_version
                  : null,
              ])],
              chronology_orders: [...new Set([
                ...(existing?.chronology_orders ?? []),
                hrxChronology(prior.row),
                hrxChronology(candidate.row),
              ])].sort((left, right) => left - right),
              differing_field_names: [...new Set([
                ...(existing?.differing_field_names ?? []),
                ...differingFieldNames,
              ])].sort(),
            });
            continue;
          }
          tables[table].set(key, selected.winner);
          resolutionRefs.add(conflictRef);
          if (selected.reason_code.startsWith(
            "REGISTERED_ROSTER_",
          )) {
            rosterResolutionRefs.add(conflictRef);
          }
          continue;
        }
        if (!prior) tables[table].set(key, candidate);
      }
    }
  });
  if (unresolved.size > 0) {
    const conflicts = [...unresolved.values()].sort((left, right) =>
      left.table.localeCompare(right.table)
        || left.record_ref.localeCompare(right.record_ref));
    throw Object.assign(
      new TypeError(
        "unresolved authoritative HRX records require owner adjudication",
      ),
      {
        safe_details: {
          conflict_count: conflicts.length,
          conflicts,
        },
      },
    );
  }
  const uniqueConstraints = {
    ...HRX_TABLE_UNIQUE_CONSTRAINTS,
    hrx_employee_user_links: [
      ["tenant_id", "user_id", "purpose"],
    ],
  };
  for (const [table, constraints] of Object.entries(
    uniqueConstraints,
  )) {
    for (const fields of constraints) {
      const byUniqueKey = new Map();
      for (const [primaryKey, entry] of [...tables[table].entries()]
        .sort(([left], [right]) => left.localeCompare(right))) {
        if (fields.some((field) =>
          entry.row[field] === undefined
          || entry.row[field] === null
          || entry.row[field] === "")) {
          continue;
        }
        const uniqueKey = fields.map((field) =>
          String(entry.row[field])).join("\u0000");
        const prior = byUniqueKey.get(uniqueKey);
        if (!prior) {
          byUniqueKey.set(uniqueKey, { primaryKey, entry });
          continue;
        }
        const conflictRef =
          `${table}:unique:${sha256(`${fields.join(",")}:${uniqueKey}`).slice(0, 24)}`;
        const selected = chooseHrxPrimaryKeyWinner(
          prior.entry,
          entry,
          table,
          rosterProfilesByEmployee,
        );
        if (!selected) {
          throw Object.assign(
            new TypeError(
              `unresolved authoritative HRX unique record: ${conflictRef}`,
            ),
            {
              safe_details: {
                table,
                record_ref:
                  sha256(`${table}:${uniqueKey}`).slice(0, 32),
                unique_field_names: [...fields],
                source_refs: [
                  prior.entry.source.source_ref,
                  entry.source.source_ref,
                ].sort(),
                root_refs: [
                  prior.entry.source.root_ref,
                  entry.source.root_ref,
                ].sort(),
              },
            },
          );
        }
        const selectedPrimaryKey = selected.winner === prior.entry
          ? prior.primaryKey
          : primaryKey;
        const loserPrimaryKey = selected.winner === prior.entry
          ? primaryKey
          : prior.primaryKey;
        tables[table].delete(loserPrimaryKey);
        byUniqueKey.set(uniqueKey, {
          primaryKey: selectedPrimaryKey,
          entry: selected.winner,
        });
        uniqueResolutionRefs.add(conflictRef);
        if (selected.reason_code.startsWith(
          "REGISTERED_ROSTER_",
        )) {
          rosterResolutionRefs.add(conflictRef);
        }
      }
    }
  }
  return {
    state: {
      schema_version: [...schemaVersions][0],
      applied_migrations: loadHrxCoreMigrations().map((migration) => ({
        id: migration.id,
        hash: sha256(migration.sql),
        applied_at: null,
      })),
      tables: Object.fromEntries(HRX_STORE_TABLES.map((table) => [
        table,
        [...tables[table].entries()]
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([, entry]) => entry.row),
      ])),
    },
    hrx_primary_key_resolution_count: resolutionRefs.size,
    hrx_unique_resolution_count: uniqueResolutionRefs.size,
    roster_authority_resolution_count: rosterResolutionRefs.size,
  };
}

function identityDecisionRef(user) {
  const record = inspectJsonPostgresAdjudicationSource({
    users: [user],
  }).records[0];
  if (!record?.user_ref) {
    throw new TypeError("account-only user identity cannot be verified");
  }
  return sha256(`${record.tenant_ref}:${record.user_ref}`).slice(0, 32);
}

function identityAccounts(
  registrations,
  rosters,
  tenantId,
  accountOnlyUserIds,
  identityDecisions,
) {
  const users = registrations.flatMap((source) =>
    (source.users ?? []).map((user) => ({
      user,
      source_tenant_id: source.tenant_id ?? null,
    })));
  const members = rosters.flatMap((source) => source.members ?? []);
  const memberByUser = new Map();
  const rosterEmails = new Set();
  for (const member of members) {
    const userId = requiredRef(member.user_id, "roster user id");
    const email = requiredText(member.work_email, "roster work email").toLowerCase();
    if (memberByUser.has(userId) || rosterEmails.has(email)) throw new TypeError("roster contains duplicate user id or work email");
    memberByUser.set(userId, member);
    rosterEmails.add(email);
  }
  const accountOnly = new Set(accountOnlyUserIds);
  const identityDecisionByRef = new Map(identityDecisions.map((decision) =>
    [decision.identity_ref, decision]));
  const appliedIdentityDecisionRefs = new Set();
  const accountIds = new Set();
  const accountEmails = new Set();
  const accounts = users.map(({ user, source_tenant_id: sourceTenantId }) => {
    const userId = requiredRef(user.user_id, "registration user id");
    const email = requiredText(user.email, "registration email").toLowerCase();
    if (accountIds.has(userId) || accountEmails.has(email)) throw new TypeError("registration contains duplicate user id or email");
    accountIds.add(userId);
    accountEmails.add(email);
    const member = memberByUser.get(userId);
    if (!member && !accountOnly.has(userId)) throw new TypeError(`registered account is absent from the approved roster: ${userId}`);
    if (member && requiredText(member.work_email, "roster work email").toLowerCase() !== email) {
      throw new TypeError(`registered and roster email conflict: ${userId}`);
    }
    const accountOnlyDecision = member
      ? null
      : identityDecisionByRef.get(identityDecisionRef(user));
    if (!member && (!accountOnlyDecision
      || accountOnlyDecision.account_status !== "disabled"
      || accountOnlyDecision.roster_link_status !== "pending-roster-link"
      || accountOnlyDecision.login_allowed !== false
      || accountOnlyDecision.password_setup_allowed !== false
      || accountOnlyDecision.authorization_allowed !== false)) {
      throw new TypeError(
        `registered account identity decision drifted: ${userId}`,
      );
    }
    if (accountOnlyDecision) {
      appliedIdentityDecisionRefs.add(accountOnlyDecision.identity_ref);
    }
    const directMembership = user.tenant_memberships?.find((entry) =>
      entry.tenant_id === tenantId)
      ?? user.membership;
    const membership = directMembership?.tenant_id === tenantId
      ? directMembership
      : sourceTenantId === tenantId
        ? {
            tenant_id: tenantId,
            status: user.status === "disabled" ? "disabled" : "active",
            role_profile_id: user.role_profile_id ?? null,
            role_ids: user.role_ids ?? [],
            group_ids: user.group_ids ?? [],
            scopes: user.scopes ?? [],
            hrx_scopes: user.hrx_scopes ?? [],
            source_ref: user.source_ref ?? null,
          }
        : null;
    if (!membership || membership.tenant_id !== tenantId) throw new TypeError(`registration tenant membership is missing: ${userId}`);
    const targetMembership = accountOnlyDecision ? {
      ...membership,
      status: "disabled",
      role_profile_id: null,
      role_ids: [],
      group_ids: [],
      scopes: [],
      hrx_scopes: [],
    } : membership;
    return {
      ...user,
      tenant_id: tenantId,
      tenant_memberships: [targetMembership],
      email,
      ...(accountOnlyDecision ? {
        status: "disabled",
        account_status: "disabled",
        credential_status: "disabled",
      } : {}),
      profile: {
        ...Object.fromEntries(REGISTRATION_PROFILE_FIELDS
          .filter((key) => user[key] !== undefined && user[key] !== null)
          .map((key) => [key, user[key]])),
        ...(user.profile ?? {}),
        ...(member ? Object.fromEntries(Object.entries({
          employee_id: member.employee_id,
          display_name: member.display_name,
          legal_name: member.legal_name,
          work_email: member.work_email,
          title: member.title,
          employment_type: member.employment_type,
          affiliation: member.affiliation,
          department: member.department,
          organization_group: member.organization_group,
          org_unit_id: member.org_unit_id,
          country: member.country,
          start_date: member.start_date,
          mobile_phone: member.mobile_phone,
          professional_profile: member.professional_profile ?? {},
        }).filter(([, value]) => value !== undefined && value !== null)) : {}),
        source_attributes: {
          registration: preservedSourceAttributes(user, REGISTRATION_MAPPED_FIELDS),
          ...(member
            ? { roster: preservedSourceAttributes(member, ROSTER_MAPPED_FIELDS) }
            : {}),
        },
        ...(accountOnlyDecision ? {
          roster_link_status: "pending-roster-link",
          login_allowed: false,
          identity_setup_allowed: false,
          access_grant_allowed: false,
        } : {}),
      },
      membership: targetMembership,
    };
  });
  const missingAccounts = [...memberByUser.keys()].filter((userId) => !accountIds.has(userId));
  if (missingAccounts.length > 0) throw new TypeError("approved roster contains members without registered accounts");
  const staleAccountOnly = [...accountOnly].filter((userId) => !accountIds.has(userId) || memberByUser.has(userId));
  if (staleAccountOnly.length > 0) throw new TypeError("account-only user exceptions are stale or unnecessary");
  if (appliedIdentityDecisionRefs.size !== identityDecisionByRef.size) {
    throw new TypeError(
      "record authority identity decisions were not fully materialized",
    );
  }
  return accounts.sort((left, right) => left.user_id.localeCompare(right.user_id));
}

function withCrossDomainReferences(domainSnapshots, descriptorByDomain) {
  const known = new Set(domainSnapshots.flatMap((snapshot) => snapshot.records.map((record) =>
    `${snapshot.domain_id}:${record.record_type}:${record.record_id}`)));
  let optionalMissingReferenceCount = 0;
  const snapshots = domainSnapshots.map((snapshot) => {
    const descriptor = descriptorByDomain.get(snapshot.domain_id);
    if (!descriptor) return snapshot;
    const records = snapshot.records.map((record) => {
      const references = [];
      for (const reference of descriptor.references(record.payload) ?? []) {
        const targetDomainId = reference.target_domain_id ?? snapshot.domain_id;
        const target = `${targetDomainId}:${reference.target_record_type}:${reference.target_record_id}`;
        if (!known.has(target)) {
          if (reference.required === true) throw new TypeError(`required cross-domain reference is missing: ${target}`);
          optionalMissingReferenceCount += 1;
          continue;
        }
        references.push({
          reference_name: reference.reference_name,
          target_domain_id: targetDomainId,
          target_record_type: reference.target_record_type,
          target_record_id: reference.target_record_id,
        });
      }
      return { ...record, references };
    });
    return createDomainSnapshot({
      tenant_id: snapshot.tenant_id,
      domain_id: snapshot.domain_id,
      records,
      idempotency_entries: snapshot.idempotency_entries,
      audit_events: snapshot.audit_events,
    });
  });
  return Object.freeze({ snapshots, optional_missing_reference_count: optionalMissingReferenceCount });
}

export async function compileJsonPostgresMigrationCorpus({
  inventory,
  locatorManifest,
  transformPlan,
} = {}) {
  validateJsonPostgresSourceTransformPlan(transformPlan, { inventory, locatorManifest });
  const locatorByRef = new Map(locatorManifest.sources.map((source) => [source.source_ref, source]));
  const inventoryByRef = new Map(inventory.sources.map((source) => [source.source_ref, source]));
  const state = {
    verifiedSourceCount: 0,
    parsedAuthoritativeSourceCount: 0,
    excludedSecretFieldCount: 0,
    excludedSecretFieldNames: new Set(),
    canonicalRecordDecisionKeys: new Set(),
    archiveOnlyRecordCopyCount: 0,
    hrxPrimaryKeyResolutionCount: 0,
    hrxUniqueResolutionCount: 0,
    rosterAuthorityResolutionCount: 0,
  };
  const registrations = [];
  const rosters = [];
  const domainStates = new Map();
  const hrxStates = [];
  const descriptorByDomain = new Map();
  for (const decision of transformPlan.sources) {
    let parsed = await readExactSource(locatorByRef.get(decision.source_ref), {
      ...decision,
      byte_size: inventoryByRef.get(decision.source_ref).byte_size,
    }, state);
    if (!parsed) continue;
    parsed = applyRecordAuthority(
      parsed,
      decision,
      transformPlan.record_authority,
      state,
    );
    if (decision.transform.kind === "identity-registration") registrations.push(parsed);
    if (decision.transform.kind === "identity-roster") rosters.push(parsed);
    if (decision.transform.kind === "runtime-domain-store") {
      const domainId = decision.transform.domain_id;
      if (!domainStates.has(domainId)) domainStates.set(domainId, []);
      domainStates.get(domainId).push(parsed);
    }
    if (decision.transform.kind === "hrx-table-store") {
      const store = createFileHrxStore({ initialState: parsed });
      try {
        hrxStates.push({
          state: store.snapshot(),
          source: decision,
        });
      } finally {
        store.close();
      }
    }
  }
  if (registrations.length === 0) throw new TypeError("source transform requires an authoritative identity registration source");
  if (rosters.length === 0) throw new TypeError("source transform requires an authoritative identity roster source");
  if (state.canonicalRecordDecisionKeys.size
      !== transformPlan.record_authority.record_decisions.length) {
    throw new TypeError(
      "source transform did not materialize every canonical record decision",
    );
  }
  const accounts = identityAccounts(
    registrations,
    rosters,
    transformPlan.tenant_id,
    transformPlan.account_only_user_ids,
    transformPlan.record_authority.identity_decisions,
  );
  const rosterAuthority = transformPlan.sources.find((source) =>
    source.classification === "authoritative"
    && source.transform?.kind === "identity-roster");
  if (!rosterAuthority) {
    throw new TypeError("source transform roster authority is missing");
  }
  hrxStates.push({
    state: rosterState(rosters, transformPlan.tenant_id),
    source: rosterAuthority,
  });
  const snapshots = [];
  for (const [domainId, states] of domainStates) {
    const descriptor = DESCRIPTORS.get(domainId);
    descriptorByDomain.set(domainId, descriptor);
    snapshots.push(createRecordRepositoryDomainSnapshot({
      descriptor,
      repositories: states.map((source, index) => ({
        source_id: `approved-source-${index + 1}`,
        repository: snapshotRepository(source),
      })),
      tenant_id: transformPlan.tenant_id,
    }).snapshot);
  }
  const mergedHrx = mergeHrxStates(
    hrxStates,
    transformPlan.tenant_id,
  );
  state.hrxPrimaryKeyResolutionCount =
    mergedHrx.hrx_primary_key_resolution_count;
  state.hrxUniqueResolutionCount =
    mergedHrx.hrx_unique_resolution_count;
  state.rosterAuthorityResolutionCount =
    mergedHrx.roster_authority_resolution_count;
  const hrxStore = createFileHrxStore({
    initialState: mergedHrx.state,
  });
  try {
    snapshots.push(createHrxDomainSnapshot({
      store: hrxStore,
      tenant_id: transformPlan.tenant_id,
    }).snapshot);
  } finally {
    hrxStore.close();
  }
  const referenced = withCrossDomainReferences(snapshots, descriptorByDomain);
  const corpus = {
    schema_version: JSON_POSTGRES_MIGRATION_SCHEMA_VERSION,
    data_scope: "approved-real-manifest",
    tenant_id: transformPlan.tenant_id,
    accounts,
    domains: referenced.snapshots.map((snapshot) => ({
      domain_id: snapshot.domain_id,
      records: snapshot.records,
      idempotency_entries: snapshot.idempotency_entries,
      audit_events: snapshot.audit_events,
    })),
  };
  const prepared = prepareJsonPostgresMigrationCorpus(corpus, { allowRealData: true });
  if (prepared.rejected.length > 0) {
    throw new TypeError(`compiled migration corpus contains ${prepared.rejected.length} rejected items`);
  }
  const sealedCorpus = Object.freeze({
    ...corpus,
    manifest_sha256: prepared.manifest_sha256,
  });
  const resultMaterial = {
    schema_version: JSON_POSTGRES_SOURCE_TRANSFORM_RESULT_VERSION,
    inventory_content_sha256: inventory.inventory_content_sha256,
    locator_manifest_sha256: locatorManifest.locator_manifest_sha256,
    source_transform_plan_sha256: transformPlan.transform_sha256,
    migration_manifest_sha256: prepared.manifest_sha256,
    safe_counts: {
      inventory_source_count: inventory.sources.length,
      verified_source_count: state.verifiedSourceCount,
      authoritative_source_count: transformPlan.sources.filter((source) => source.classification === "authoritative").length,
      parsed_authoritative_source_count: state.parsedAuthoritativeSourceCount,
      record_decision_count:
        transformPlan.record_authority.record_decisions.length,
      archive_only_record_copy_count:
        state.archiveOnlyRecordCopyCount,
      hrx_primary_key_resolution_count:
        state.hrxPrimaryKeyResolutionCount,
      hrx_unique_resolution_count:
        state.hrxUniqueResolutionCount,
      roster_authority_resolution_count:
        state.rosterAuthorityResolutionCount,
      identity_decision_count:
        transformPlan.record_authority.identity_decisions.length,
      account_count: prepared.accounts.length,
      domain_count: prepared.snapshots.length,
      record_count: prepared.snapshots.reduce((total, snapshot) => total + snapshot.records.length, 0),
      idempotency_count: prepared.snapshots.reduce((total, snapshot) => total + snapshot.idempotency_entries.length, 0),
      audit_event_count: prepared.snapshots.reduce((total, snapshot) => total + snapshot.audit_events.length, 0),
      roster_gap_count: 0,
      duplicate_email_count: 0,
      duplicate_matter_code_count: 0,
      missing_required_reference_count: 0,
      optional_missing_reference_count: referenced.optional_missing_reference_count,
      rejected_item_count: 0,
      excluded_secret_field_count: state.excludedSecretFieldCount,
      excluded_secret_field_name_count: state.excludedSecretFieldNames.size,
    },
    claims: {
      raw_source_path_returned: false,
      raw_secret_returned: false,
      raw_document_bytes_returned: false,
      source_mutated: false,
      postgres_mutated: false,
      production_contacted: false,
    },
  };
  return Object.freeze({
    corpus: sealedCorpus,
    result: Object.freeze({
      ...resultMaterial,
      result_sha256: sha256(stableJson(resultMaterial)),
    }),
  });
}

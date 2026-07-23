import { createHash } from "node:crypto";
import { lstat, readFile, realpath } from "node:fs/promises";
import { extname, isAbsolute, relative, sep } from "node:path";
import { ANALYTICS_DOMAIN_DESCRIPTOR } from "../../../packages/analytics/src/central-ledger.js";
import { AI_GOVERNANCE_DOMAIN_DESCRIPTOR } from "../../../packages/ai-governance/src/central-ledger.js";
import { FINANCE_DOMAIN_DESCRIPTOR } from "../../../packages/billing/src/central-ledger.js";
import { PORTAL_DOMAIN_DESCRIPTOR } from "../../../packages/client-portal/src/central-ledger.js";
import { CRM_DOMAIN_DESCRIPTOR } from "../../../packages/crm/src/central-ledger.js";
import { DMS_AUXILIARY_DOMAIN_DESCRIPTOR } from "../../../packages/dms/src/central-ledger.js";
import { ENTERPRISE_READINESS_DOMAIN_DESCRIPTOR } from "../../../packages/enterprise/src/central-ledger.js";
import { createHrxDomainSnapshot } from "../../../packages/hrx/src/postgres-store-v2.js";
import { createFileHrxStore } from "../../../packages/hrx/src/store/file-store.js";
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
  validateJsonPostgresSourceLocatorManifest,
} from "../../../packages/persistence/src/postgres/source-locator-manifest.js";
import {
  createRecordRepositoryDomainSnapshot,
} from "../../../packages/persistence/src/record-domain-adapter.js";
import { UI_READINESS_DOMAIN_DESCRIPTOR } from "../../../packages/platform/src/ui-readiness-central-ledger.js";

export const JSON_POSTGRES_SOURCE_TRANSFORM_PLAN_VERSION =
  "law-firm-os.json-postgres-source-transform-plan.v1";
export const JSON_POSTGRES_SOURCE_TRANSFORM_RESULT_VERSION =
  "law-firm-os.json-postgres-source-transform-result.v1";

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
const SECRET_FIELD = /(^|_)(?:password|password_hash|passwd|passphrase|secret|token|credential|authorization|api_key|private_key|recovery_key|document_bytes|raw_bytes|raw_payload)(_|$)/iu;
const SAFE_CREDENTIAL_METADATA = new Set([
  "credential_provider",
  "credential_status",
  "credential_rev",
]);
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
  "effective_from", "effective_to", "manager_employee_id",
]);
const DESCRIPTORS = new Map([
  ["master-data", MASTER_DATA_DOMAIN_DESCRIPTOR],
  ["matter", MATTER_DOMAIN_DESCRIPTOR],
  ["dms-auxiliary", DMS_AUXILIARY_DOMAIN_DESCRIPTOR],
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
} = {}) {
  validateJsonPostgresSourceLocatorManifest(locatorManifest, { inventory });
  const inventoryDigest = inventory?.inventory_content_sha256;
  if (!SHA256.test(inventoryDigest ?? "")) throw new TypeError("source transform requires an exact inventory");
  const approvedRoots = Object.freeze([...new Set(approvedRootRefs.map((value) =>
    requiredRef(value, "approved root ref")))].sort());
  const approvedRootSet = new Set(approvedRoots);
  const accountOnly = Object.freeze([...new Set(accountOnlyUserIds.map((value) =>
    requiredRef(value, "account-only user id")))].sort());
  const sourceByRef = new Map(inventory.sources.map((source) => [source.source_ref, source]));
  const rows = [];
  for (const decision of decisions) {
    closedObject(
      decision,
      ["source_ref", "root_ref", "sha256", "classification", "reason_code", "decision_ref", "transform"],
      "source transform decision",
    );
    const sourceRef = requiredText(decision.source_ref, "source ref");
    if (!SOURCE_REF.test(sourceRef)) throw new TypeError("source ref is invalid");
    const source = sourceByRef.get(sourceRef);
    if (!source || source.sha256 !== decision.sha256) throw new TypeError(`source transform decision drifted: ${sourceRef}`);
    if (decision.root_ref != null && decision.root_ref !== source.root_ref) {
      throw new TypeError(`source transform root drifted: ${sourceRef}`);
    }
    const classification = requiredText(decision.classification, "source classification");
    if (!FINAL_CLASSIFICATIONS.has(classification)) throw new TypeError(`source decision is not terminal: ${sourceRef}`);
    if (!approvedRootSet.has(source.root_ref)) throw new TypeError(`source root is not approved: ${source.root_ref}`);
    rows.push(Object.freeze({
      source_ref: sourceRef,
      root_ref: source.root_ref,
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
  const value = Object.freeze({
    schema_version: JSON_POSTGRES_SOURCE_TRANSFORM_PLAN_VERSION,
    transform_set_ref: requiredRef(transformSetRef, "transform set ref"),
    tenant_id: requiredRef(tenantId, "transform tenant id"),
    inventory_content_sha256: inventoryDigest,
    locator_manifest_sha256: locatorManifest.locator_manifest_sha256,
    approved_root_refs: approvedRoots,
    account_only_user_ids: accountOnly,
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
    if (SECRET_FIELD.test(key) && !SAFE_CREDENTIAL_METADATA.has(key)) {
      state.excludedSecretFieldCount += 1;
      state.excludedSecretFieldNames.add(key);
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
  const extension = extname(sourcePath).toLowerCase();
  let parsed;
  if (extension === ".json") {
    parsed = JSON.parse(bytes);
  } else if (extension === ".jsonl" || extension === ".ndjson") {
    parsed = bytes.toString("utf8").split(/\r?\n/u).filter(Boolean).map((line) => JSON.parse(line));
  } else {
    throw new TypeError(`authoritative source is not supported JSON: ${expected.source_ref}`);
  }
  state.parsedAuthoritativeSourceCount += 1;
  return sanitize(parsed, state);
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

function rosterSnapshot(rosters, tenantId) {
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
    employeeIds.add(employeeId);
    userIds.add(userId);
    const sourceRef = "approved-identity-roster";
    tables.hrx_employees.push({
      tenant_id: tenantId,
      employee_id: employeeId,
      display_name: requiredText(member.display_name, "roster display name"),
      legal_name: member.legal_name ?? null,
      work_email: requiredText(member.work_email, "roster work email").toLowerCase(),
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
      manager_employee_id: member.manager_employee_id ?? null,
      effective_from: String(member.effective_from ?? "1970-01-01").slice(0, 10),
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
  const store = createFileHrxStore({
    initialState: {
      schema_version: "law-firm-os.hrx-file-store.v0.1",
      applied_migrations: [],
      tables,
    },
  });
  try {
    return createHrxDomainSnapshot({ store, tenant_id: tenantId }).snapshot;
  } finally {
    store.close();
  }
}

function identityAccounts(registrations, rosters, tenantId, accountOnlyUserIds) {
  const users = registrations.flatMap((source) => source.users ?? []);
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
  const accountIds = new Set();
  const accountEmails = new Set();
  const accounts = users.map((user) => {
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
    const membership = user.tenant_memberships?.find((entry) => entry.tenant_id === tenantId)
      ?? user.membership;
    if (!membership || membership.tenant_id !== tenantId) throw new TypeError(`registration tenant membership is missing: ${userId}`);
    return {
      ...user,
      email,
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
          professional_profile: member.professional_profile ?? {},
        }).filter(([, value]) => value !== undefined && value !== null)) : {}),
        source_attributes: {
          registration: preservedSourceAttributes(user, REGISTRATION_MAPPED_FIELDS),
          ...(member
            ? { roster: preservedSourceAttributes(member, ROSTER_MAPPED_FIELDS) }
            : {}),
        },
      },
      membership,
    };
  });
  const missingAccounts = [...memberByUser.keys()].filter((userId) => !accountIds.has(userId));
  if (missingAccounts.length > 0) throw new TypeError("approved roster contains members without registered accounts");
  const staleAccountOnly = [...accountOnly].filter((userId) => !accountIds.has(userId) || memberByUser.has(userId));
  if (staleAccountOnly.length > 0) throw new TypeError("account-only user exceptions are stale or unnecessary");
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
  };
  const registrations = [];
  const rosters = [];
  const domainStates = new Map();
  const hrxSnapshots = [];
  const descriptorByDomain = new Map();
  for (const decision of transformPlan.sources) {
    const parsed = await readExactSource(locatorByRef.get(decision.source_ref), {
      ...decision,
      byte_size: inventoryByRef.get(decision.source_ref).byte_size,
    }, state);
    if (!parsed) continue;
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
        hrxSnapshots.push(createHrxDomainSnapshot({
          store,
          tenant_id: transformPlan.tenant_id,
        }).snapshot);
      } finally {
        store.close();
      }
    }
  }
  if (registrations.length === 0) throw new TypeError("source transform requires an authoritative identity registration source");
  if (rosters.length === 0) throw new TypeError("source transform requires an authoritative identity roster source");
  const accounts = identityAccounts(
    registrations,
    rosters,
    transformPlan.tenant_id,
    transformPlan.account_only_user_ids,
  );
  hrxSnapshots.push(rosterSnapshot(rosters, transformPlan.tenant_id));
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
  snapshots.push(mergeSnapshots(hrxSnapshots, transformPlan.tenant_id, "hrx"));
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

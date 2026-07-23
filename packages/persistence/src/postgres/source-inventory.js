import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { opendir, readFile, realpath, stat } from "node:fs/promises";
import { basename, dirname, extname, join, relative } from "node:path";

export const JSON_POSTGRES_SOURCE_INVENTORY_VERSION = "law-firm-os.json-postgres-source-inventory.v1";
export const JSON_POSTGRES_SOURCE_CLASSIFICATIONS = Object.freeze([
  "authoritative",
  "superseded",
  "duplicate",
  "synthetic",
  "corrupt",
  "manual-review",
]);
export const JSON_POSTGRES_FIELD_DISPOSITIONS = Object.freeze([
  "postgres-live",
  "postgres-json-payload",
  "postgres-specialized-identity",
  "s3-dms-byte-object",
  "derived-recompute",
  "encrypted-archive-only",
  "secret-excluded",
  "synthetic-excluded",
  "rejected-with-reason",
]);

const SOURCE_CLASSIFICATION_SET = new Set(JSON_POSTGRES_SOURCE_CLASSIFICATIONS);
const MAX_PARSE_BYTES = 64 * 1024 * 1024;
const PRUNED_DIRECTORY = /^(?:\.git|node_modules|Cache|Caches|Code Cache|GPUCache|ui-screens|artifacts)$/u;
const CANDIDATE_FILE = /(?:\.json|\.jsonl|\.ndjson)$|(?:store|manifest|registry|roster|profile|contact|secret)/iu;
const BACKUP_CANDIDATE_FILE = /^(?:(?:hrx|matter|master-data|crm-master-data|crm|intake|dms|finance|portal|analytics|ai|ui-readiness|enterprise-readiness)-store\.json(?:[-.][a-z0-9]+)?|(?:lawos-|runtime-|backup-)?manifest(?:[-.][a-z0-9]+)?\.json)$/iu;
const SECRET_FIELD = /(^|_)(?:password|password_hash|passwd|secret|token|credential|authorization|api_key|private_key|recovery_key|document_bytes|raw_bytes|raw_payload)(_|$)/iu;
const SAFE_CREDENTIAL_METADATA = new Set(["credential_provider", "credential_status", "credential_rev"]);
const LIVE_FIELD = new Set([
  "tenant_id", "domain_id", "record_type", "model_type", "record_id", "unique_key", "state_version", "expected_version",
  "user_id", "employee_id", "email", "work_email", "account_status", "credential_provider", "credential_status",
  "credential_rev", "membership", "tenant_memberships", "role_profile_id", "role_ids", "group_ids", "scopes", "hrx_scopes",
  "status", "client_id", "client_group_id", "party_id", "person_id", "organization_id", "entity_id", "matter_id",
  "matter_code", "document_id", "object_id", "version_id", "created_at", "updated_at", "occurred_at", "effective_at",
  "references", "reference_name", "target_domain_id", "target_record_type", "target_record_id",
]);
const DERIVED_FIELD = /^(?:computed_|derived_|search_text$|sort_key$|display_label$|projection_state$|analytics_snapshot$)/iu;
const ARCHIVE_ONLY_FIELD = /^(?:legacy_source_blob|original_import_envelope|source_archive_ref)$/iu;
const SAFE_SCHEMA_VERSION = /^[a-z0-9][a-z0-9._-]{0,95}$/iu;

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function fileSha256(path) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest("hex");
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function modeString(mode) {
  return `0${(Number(mode) & 0o777).toString(8).padStart(3, "0")}`;
}

function sourceFamily(name) {
  const normalized = String(name).toLowerCase();
  for (const family of [
    "hrx-store", "matter-store", "master-data-store", "crm-master-data-store", "crm-store", "intake-store",
    "dms-store", "finance-store", "portal-store", "analytics-store", "ai-store", "ui-readiness-store",
    "enterprise-readiness-store", "account-registration", "user-registration", "registration-seed", "member-roster", "professional-profile", "member-contact",
  ]) {
    if (normalized.includes(family)) return family;
  }
  if (normalized.includes("session-secret")) return "session-secret";
  return extname(normalized).replace(/^\./u, "") || "opaque-candidate";
}

async function candidatePaths(rootPath, mode = "default") {
  const paths = [];
  async function walk(path) {
    const directory = await opendir(path);
    for await (const entry of directory) {
      if (entry.isSymbolicLink()) continue;
      const child = join(path, entry.name);
      if (entry.isDirectory()) {
        if (!PRUNED_DIRECTORY.test(entry.name)) await walk(child);
        continue;
      }
      const pattern = mode === "backup" ? BACKUP_CANDIDATE_FILE : CANDIDATE_FILE;
      if (entry.isFile() && pattern.test(entry.name)) paths.push(child);
    }
  }
  await walk(rootPath);
  return paths.sort();
}

function safeSchemaVersion(value) {
  const text = typeof value === "string" ? value.trim() : "";
  return SAFE_SCHEMA_VERSION.test(text) ? text : null;
}

function inspectJson(value) {
  const fields = new Map();
  const tenantRefs = new Set();
  const recordTypeRefs = new Set();
  const idValues = new Map();
  const objects = [];
  const metrics = {
    registeredAccountIds: new Set(),
    rosterUserIds: new Set(),
    employeeIds: new Set(),
    linkEmployeeIds: new Set(),
    linkUserIds: new Set(),
    employeeToUser: new Map(),
    professionalProfileIds: new Set(),
    careerCount: 0,
    educationCount: 0,
    qualificationCount: 0,
    practiceAreaCount: 0,
  };
  let synthetic = false;
  let recordCount = 0;

  function rememberId(key, item) {
    if (!key.endsWith("_id") || typeof item !== "string" || !item.trim()) return;
    if (!idValues.has(key)) idValues.set(key, new Set());
    idValues.get(key).add(sha256(item.trim().toLowerCase()));
  }

  function visit(item, path = "$", inheritedTenant = null, depth = 0) {
    if (depth > 24 || item == null) return;
    if (Array.isArray(item)) {
      for (const child of item) visit(child, `${path}[]`, inheritedTenant, depth + 1);
      return;
    }
    if (typeof item !== "object") return;
    const tenant = typeof item.tenant_id === "string" && item.tenant_id.trim() ? item.tenant_id.trim() : inheritedTenant;
    const summary = {};
    for (const [key, child] of Object.entries(item)) {
      const fieldPath = `${path}.${key}`;
      fields.set(fieldPath, key);
      if (key === "tenant_id" && typeof child === "string" && child.trim()) tenantRefs.add(sha256(child.trim().toLowerCase()));
      if (key === "record_type" && typeof child === "string" && child.trim()) recordTypeRefs.add(sha256(child.trim()));
      if (key === "model_type" && typeof child === "string" && child.trim()) recordTypeRefs.add(sha256(child.trim()));
      rememberId(key, child);
      if (["tenant_id", "user_id", "employee_id", "email", "work_email", "client_id", "matter_id", "matter_code", "document_id", "object_id", "record_type", "model_type", "record_id"].includes(key)) {
        summary[key] = child;
      }
      visit(child, fieldPath, tenant, depth + 1);
    }
    if (typeof item.matter_id === "string" && item.matter_id.trim() && (
      Object.hasOwn(item, "matter_name") || Object.hasOwn(item, "matter_number") || Object.hasOwn(item, "matter_code")
    )) {
      summary.matter_record_candidate = true;
      summary.matter_code_present = typeof item.matter_code === "string" && Boolean(item.matter_code.trim());
    }
    if (typeof item.record_type === "string" || typeof item.model_type === "string" || typeof item.record_id === "string") recordCount += 1;
    if (Object.keys(summary).length) objects.push({ ...summary, inherited_tenant_id: tenant });
  }

  visit(value);
  synthetic = value?.synthetic_only === true || value?.data_scope === "synthetic-only";
  for (const user of Array.isArray(value?.users) ? value.users : []) {
    if (typeof user?.user_id === "string" && user.user_id.trim()) metrics.registeredAccountIds.add(sha256(user.user_id.trim().toLowerCase()));
  }
  for (const member of Array.isArray(value?.members) ? value.members : []) {
    if (typeof member?.user_id === "string" && member.user_id.trim()) metrics.rosterUserIds.add(sha256(member.user_id.trim().toLowerCase()));
  }
  const tables = value?.tables && typeof value.tables === "object" ? value.tables : {};
  for (const employee of Array.isArray(tables.hrx_employees) ? tables.hrx_employees : []) {
    if (typeof employee?.employee_id === "string" && employee.employee_id.trim()) metrics.employeeIds.add(sha256(employee.employee_id.trim().toLowerCase()));
  }
  for (const link of Array.isArray(tables.hrx_employee_user_links) ? tables.hrx_employee_user_links : []) {
    const employeeRef = typeof link?.employee_id === "string" && link.employee_id.trim() ? sha256(link.employee_id.trim().toLowerCase()) : null;
    const userRef = typeof link?.user_id === "string" && link.user_id.trim() ? sha256(link.user_id.trim().toLowerCase()) : null;
    if (employeeRef) metrics.linkEmployeeIds.add(employeeRef);
    if (userRef) metrics.linkUserIds.add(userRef);
    if (employeeRef && userRef) metrics.employeeToUser.set(employeeRef, userRef);
  }
  const profileCandidates = [
    ...(Array.isArray(value?.profiles) ? value.profiles : []),
    ...(Array.isArray(value?.members) ? value.members.filter((member) => member?.professional_profile) : []),
  ];
  for (const row of profileCandidates) {
    const profile = row?.professional_profile ?? row;
    const profileId = row?.employee_id ?? row?.profile_id;
    if (typeof profileId === "string" && profileId.trim() && profile && typeof profile === "object") {
      metrics.professionalProfileIds.add(sha256(profileId.trim().toLowerCase()));
    }
    metrics.careerCount += Array.isArray(profile?.experience) ? profile.experience.length : Array.isArray(profile?.career) ? profile.career.length : 0;
    metrics.educationCount += Array.isArray(profile?.education) ? profile.education.length : 0;
    metrics.qualificationCount += Array.isArray(profile?.qualifications) ? profile.qualifications.length : 0;
    metrics.practiceAreaCount += Array.isArray(profile?.practice_areas) ? profile.practice_areas.length : 0;
  }
  if (Array.isArray(value?.records)) recordCount = Math.max(recordCount, value.records.length);
  if (value?.tables && typeof value.tables === "object") {
    recordCount = Math.max(recordCount, Object.values(value.tables).reduce((total, rows) => total + (Array.isArray(rows) ? rows.length : 0), 0));
  }
  for (const key of ["users", "members", "profiles", "contacts"]) {
    if (Array.isArray(value?.[key])) recordCount = Math.max(recordCount, value[key].length);
  }
  return { fields, tenantRefs, recordTypeRefs, idValues, objects, metrics, synthetic, recordCount };
}

function fieldDisposition(fieldName, classification) {
  if (classification === "synthetic") return "synthetic-excluded";
  if (SECRET_FIELD.test(fieldName) && !SAFE_CREDENTIAL_METADATA.has(fieldName)) return "secret-excluded";
  if (DERIVED_FIELD.test(fieldName)) return "derived-recompute";
  if (ARCHIVE_ONLY_FIELD.test(fieldName)) return "encrypted-archive-only";
  if (LIVE_FIELD.has(fieldName)) return "postgres-live";
  return "postgres-json-payload";
}

function authorityClassification(authorityManifest, { digest, sourceRef }) {
  const match = authorityManifest?.sources?.find((source) => (
    source.sha256 === digest && (!source.source_ref || source.source_ref === sourceRef)
  ));
  if (!match) return null;
  if (!SOURCE_CLASSIFICATION_SET.has(match.classification)) throw new TypeError("source authority classification is invalid");
  return match.classification;
}

function collectReconciliation(parsedSources) {
  const ids = new Map();
  const objects = [];
  const metrics = {
    registeredAccountIds: new Set(), rosterUserIds: new Set(), employeeIds: new Set(), linkEmployeeIds: new Set(), linkUserIds: new Set(), employeeToUser: new Map(),
    professionalProfileIds: new Set(), careerCount: 0, educationCount: 0, qualificationCount: 0, practiceAreaCount: 0,
  };
  for (const source of parsedSources) {
    for (const [key, values] of source.inspection.idValues) {
      if (!ids.has(key)) ids.set(key, new Set());
      for (const value of values) ids.get(key).add(value);
    }
    objects.push(...source.inspection.objects);
    for (const key of ["registeredAccountIds", "rosterUserIds", "employeeIds", "linkEmployeeIds", "linkUserIds", "professionalProfileIds"]) {
      for (const value of source.inspection.metrics[key]) metrics[key].add(value);
    }
    for (const [employeeRef, userRef] of source.inspection.metrics.employeeToUser) metrics.employeeToUser.set(employeeRef, userRef);
    for (const key of ["careerCount", "educationCount", "qualificationCount", "practiceAreaCount"]) {
      metrics[key] += source.inspection.metrics[key];
    }
  }
  const userIds = ids.get("user_id") ?? new Set();
  const employeeIds = ids.get("employee_id") ?? new Set();
  const clientIds = ids.get("client_id") ?? new Set();
  const matterIds = ids.get("matter_id") ?? new Set();
  const emailsByTenant = new Map();
  const matterCodes = new Map();
  let duplicateEmailCount = 0;
  let duplicateMatterCodeCount = 0;
  let blankMatterCodeCount = 0;
  let missingTenantCount = 0;
  const missingReferences = { matter_to_client: 0, matter_to_employee: 0, dms_finance_portal_to_matter: 0 };
  for (const object of objects) {
    const tenant = typeof object.tenant_id === "string" && object.tenant_id.trim() ? object.tenant_id : object.inherited_tenant_id;
    if ((object.record_id || object.user_id || object.employee_id || object.client_id || object.matter_id) && !tenant) missingTenantCount += 1;
    const email = String(object.email ?? object.work_email ?? "").trim().toLowerCase();
    if (email) {
      const tenantRef = sha256(String(tenant ?? "missing"));
      if (!emailsByTenant.has(tenantRef)) emailsByTenant.set(tenantRef, new Map());
      const emailRef = sha256(email);
      const employeeRef = object.employee_id ? sha256(String(object.employee_id).trim().toLowerCase()) : null;
      const identityRef = object.user_id
        ? sha256(String(object.user_id).trim().toLowerCase())
        : metrics.employeeToUser.get(employeeRef) ?? employeeRef ?? sha256(email);
      const existingIdentity = emailsByTenant.get(tenantRef).get(emailRef);
      if (existingIdentity && existingIdentity !== identityRef) duplicateEmailCount += 1;
      emailsByTenant.get(tenantRef).set(emailRef, existingIdentity ?? identityRef);
    }
    if (object.matter_record_candidate) {
      const code = String(object.matter_code ?? "").trim().toLowerCase();
      if (!object.matter_code_present || !code) blankMatterCodeCount += 1;
      else {
        const codeRef = sha256(code);
        const matterRef = sha256(String(object.matter_id).trim().toLowerCase());
        const existingMatter = matterCodes.get(codeRef);
        if (existingMatter && existingMatter !== matterRef) duplicateMatterCodeCount += 1;
        matterCodes.set(codeRef, existingMatter ?? matterRef);
      }
    }
    if (object.matter_id && object.client_id && !clientIds.has(sha256(String(object.client_id).trim().toLowerCase()))) missingReferences.matter_to_client += 1;
    if (object.matter_id && object.employee_id && !employeeIds.has(sha256(String(object.employee_id).trim().toLowerCase()))) missingReferences.matter_to_employee += 1;
    if (object.matter_id && /dms|finance|portal/iu.test(String(object.record_type ?? object.model_type ?? "")) && !matterIds.has(sha256(String(object.matter_id).trim().toLowerCase()))) {
      missingReferences.dms_finance_portal_to_matter += 1;
    }
  }
  return Object.freeze({
    registered_account_count: metrics.registeredAccountIds.size,
    roster_member_count: metrics.rosterUserIds.size,
    registered_account_without_roster_count: [...metrics.registeredAccountIds].filter((id) => !metrics.rosterUserIds.has(id)).length,
    roster_member_without_registered_account_count: [...metrics.rosterUserIds].filter((id) => !metrics.registeredAccountIds.has(id)).length,
    distinct_user_id_count: userIds.size,
    distinct_employee_id_count: metrics.employeeIds.size || employeeIds.size,
    employee_user_link_count: metrics.linkEmployeeIds.size,
    employee_without_user_link_count: [...metrics.employeeIds].filter((id) => !metrics.linkEmployeeIds.has(id)).length,
    user_link_without_employee_count: [...metrics.linkEmployeeIds].filter((id) => !metrics.employeeIds.has(id)).length,
    professional_profile_count: metrics.professionalProfileIds.size,
    career_entry_count: metrics.careerCount,
    education_entry_count: metrics.educationCount,
    qualification_entry_count: metrics.qualificationCount,
    practice_area_count: metrics.practiceAreaCount,
    duplicate_email_count: duplicateEmailCount,
    distinct_matter_code_count: matterCodes.size,
    duplicate_matter_code_count: duplicateMatterCodeCount,
    blank_matter_code_count: blankMatterCodeCount,
    live_record_missing_tenant_count: missingTenantCount,
    missing_reference_counts: Object.freeze(missingReferences),
  });
}

export async function inventoryJsonPostgresSources({
  roots = [],
  files = [],
  authorityManifest = null,
  clock = () => new Date(),
  onSourceLocator = null,
} = {}) {
  if (onSourceLocator != null && typeof onSourceLocator !== "function") {
    throw new TypeError("onSourceLocator must be a function");
  }
  const candidates = [];
  const rootResults = [];
  for (const root of roots) {
    const rootRef = String(root.ref ?? "").trim();
    if (!rootRef || !root.path) throw new TypeError("inventory root ref and path are required");
    try {
      const resolved = await realpath(root.path);
      const paths = await candidatePaths(resolved, root.candidate_mode ?? "default");
      rootResults.push({ root_ref: rootRef, exists: true, candidate_file_count: paths.length });
      for (const path of paths) candidates.push({ rootRef, rootPath: resolved, path, parseJson: root.parse_json !== false });
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
      rootResults.push({ root_ref: rootRef, exists: false, candidate_file_count: 0 });
    }
  }
  for (const file of files) {
    const rootRef = String(file.ref ?? "").trim();
    if (!rootRef || !file.path) throw new TypeError("inventory file ref and path are required");
    try {
      const path = await realpath(file.path);
      candidates.push({ rootRef, rootPath: dirname(path), path, parseJson: file.parse_json !== false });
      rootResults.push({ root_ref: rootRef, exists: true, candidate_file_count: 1 });
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
      rootResults.push({ root_ref: rootRef, exists: false, candidate_file_count: 0 });
    }
  }

  const detailed = [];
  for (const candidate of candidates) {
    const metadata = await stat(candidate.path);
    const digest = await fileSha256(candidate.path);
    const sourceRef = sha256(`${candidate.rootRef}:${relative(candidate.rootPath, candidate.path)}`).slice(0, 32);
    await onSourceLocator?.(Object.freeze({
      root_ref: candidate.rootRef,
      root_path: candidate.rootPath,
      source_ref: sourceRef,
      source_path: candidate.path,
      sha256: digest,
      byte_size: metadata.size,
    }));
    let parsed = null;
    let inspection = null;
    let parseError = false;
    const parseable = candidate.parseJson && metadata.size <= MAX_PARSE_BYTES
      && [".json", ".jsonl", ".ndjson"].includes(extname(candidate.path).toLowerCase());
    if (parseable) {
      try {
        const bytes = await readFile(candidate.path);
        if (extname(candidate.path).toLowerCase() === ".json") parsed = JSON.parse(bytes);
        else parsed = bytes.toString("utf8").split(/\r?\n/u).filter(Boolean).map((line) => JSON.parse(line));
        inspection = inspectJson(parsed);
      } catch {
        parseError = true;
      }
    }
    const explicit = authorityClassification(authorityManifest, { digest, sourceRef });
    const classification = explicit ?? (parseError ? "corrupt" : inspection?.synthetic ? "synthetic" : "manual-review");
    detailed.push({
      root_ref: candidate.rootRef,
      source_ref: sourceRef,
      source_family: sourceFamily(basename(candidate.path)),
      sha256: digest,
      byte_size: metadata.size,
      mtime: metadata.mtime.toISOString(),
      mode: modeString(metadata.mode),
      schema_version: safeSchemaVersion(parsed?.schema_version),
      tenant_count: inspection?.tenantRefs.size ?? 0,
      record_type_count: inspection?.recordTypeRefs.size ?? 0,
      record_count: inspection?.recordCount ?? 0,
      generation_ref: sha256(`${metadata.birthtimeMs}:${metadata.mtimeMs}:${candidate.rootRef}`).slice(0, 24),
      classification,
      parse_error: parseError,
      parse_skipped: !candidate.parseJson,
      oversized_unparsed: metadata.size > MAX_PARSE_BYTES,
      inspection,
    });
  }

  const byDigest = new Map();
  for (const source of detailed.sort((left, right) => left.source_ref.localeCompare(right.source_ref))) {
    if (!byDigest.has(source.sha256)) byDigest.set(source.sha256, source);
    else if (!["corrupt", "synthetic"].includes(source.classification)) source.classification = "duplicate";
  }

  const fields = new Map();
  for (const source of detailed) {
    for (const [path, name] of source.inspection?.fields ?? []) {
      const key = `${name}:${fieldDisposition(name, source.classification)}`;
      if (!fields.has(key)) fields.set(key, {
        field_name: name,
        path_ref: sha256(path).slice(0, 24),
        disposition: fieldDisposition(name, source.classification),
      });
    }
  }
  const fieldRows = [...fields.values()].sort((left, right) => left.field_name.localeCompare(right.field_name) || left.disposition.localeCompare(right.disposition));
  const sources = detailed.map(({ inspection, ...source }) => Object.freeze(source));
  const classifications = Object.fromEntries(JSON_POSTGRES_SOURCE_CLASSIFICATIONS.map((classification) => [
    classification,
    sources.filter((source) => source.classification === classification).length,
  ]));
  const dispositions = Object.fromEntries(JSON_POSTGRES_FIELD_DISPOSITIONS.map((disposition) => [
    disposition,
    fieldRows.filter((field) => field.disposition === disposition).length,
  ]));
  const reconciliation = {
    scope: "runtime-primary-plus-registered-sources",
    ...collectReconciliation(detailed.filter((source) => source.inspection && (
      source.root_ref === "runtime-primary" || source.root_ref.startsWith("registered-")
    ))),
  };
  const report = {
    schema_version: JSON_POSTGRES_SOURCE_INVENTORY_VERSION,
    generated_at: clock().toISOString(),
    roots: rootResults.sort((left, right) => left.root_ref.localeCompare(right.root_ref)),
    sources,
    classification_counts: classifications,
    field_contract: {
      field_count: fieldRows.length,
      disposition_counts: dispositions,
      fields: fieldRows,
      silent_drop_count: 0,
    },
    reconciliation,
    unavailable_external_sources: [
      { source_ref: "production-efs", status: "not-contacted-authorization-required" },
      { source_ref: "production-s3-backup-manifests", status: "not-contacted-authorization-required" },
    ],
    claims: {
      authority_selected_by_mtime: false,
      raw_value_returned: false,
      pii_returned: false,
      secret_material_returned: false,
      real_data_mutated: false,
      production_contacted: false,
    },
  };
  const inventoryContent = { ...report, generated_at: null };
  return Object.freeze({
    ...report,
    inventory_sha256: sha256(stableJson(report)),
    inventory_content_sha256: sha256(stableJson(inventoryContent)),
  });
}

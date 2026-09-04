import { createHash } from "node:crypto";
import { lstat, readFile, realpath } from "node:fs/promises";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import { createFileHrxStore } from "../../packages/hrx/src/store/file-store.js";
import { createHrxDomainSnapshot } from "../../packages/hrx/src/postgres-store-v2.js";
import {
  assertValidHrxMemberPhotoPng,
  createHrxMemberPhotoMetadata,
} from "../../packages/hrx/src/member-photo-storage.js";
import {
  prepareJsonPostgresMigrationCorpus,
  runJsonPostgresMigration,
} from "../../packages/persistence/src/postgres/json-postgres-migration.js";
import {
  createJsonPostgresRecordTypeCatalog,
} from "../../packages/persistence/src/postgres/record-type-catalog.js";
import { hashDomainValue } from "../../packages/persistence/src/domain-ledger.js";
import {
  inventoryAmicPrivateBootstrap,
  validateAmicPrivateBootstrapLegalEntityMapping,
} from "./amic-private-bootstrap-inventory.mjs";

export const AMIC_PRIVATE_BOOTSTRAP_MIGRATION_DRY_RUN_VERSION =
  "law-firm-os.amic-private-bootstrap-migration-dry-run.v1";
export const AMIC_PRIVATE_BOOTSTRAP_PHOTO_VERSION_PLACEHOLDER =
  "pending-storage-version";

const REGISTRATION_SCHEMA =
  "law-firm-os.matter-vault-user-registration-seed.v0.1";
const ROSTER_SCHEMA =
  "law-firm-os.hrx-member-roster-source-of-truth.v0.1";
const PROFILE_FIELDS = Object.freeze([
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
const ROSTER_PROFILE_FIELDS = Object.freeze([
  "employee_id",
  "display_name",
  "legal_name",
  "work_email",
  "title",
  "employment_type",
  "affiliation",
  "department",
  "organization_group",
  "org_unit_id",
  "country",
  "start_date",
  "mobile_phone",
  "professional_profile",
]);

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function requiredText(value, label) {
  const text = String(value ?? "").trim();
  if (!text) throw new TypeError(`${label} is required`);
  return text;
}

function safeRelativePath(root, path) {
  const rel = relative(root, path);
  if (!rel || rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel)) {
    throw new TypeError("private bootstrap migration source must remain inside root");
  }
  return rel;
}

async function readRegularFileInside(root, path, label) {
  const canonicalRoot = await realpath(resolve(root));
  const absolute = resolve(canonicalRoot, path);
  const canonical = await realpath(absolute);
  safeRelativePath(canonicalRoot, canonical);
  const stat = await lstat(absolute);
  if (!stat.isFile() || stat.isSymbolicLink()) {
    throw new TypeError(`${label} must be a regular non-symlink file`);
  }
  const bytes = await readFile(absolute);
  return Object.freeze({ bytes, sha256: sha256(bytes) });
}

function parsedSource(source, schema, arrayField, label) {
  const value = JSON.parse(source.bytes.toString("utf8"));
  if (value?.schema_version !== schema || !Array.isArray(value[arrayField])) {
    throw new TypeError(`${label} schema is invalid`);
  }
  return value;
}

async function resolveMapping({ mapping, mappingPath, root }) {
  if ((mapping == null) === (mappingPath == null)) {
    throw new TypeError("provide exactly one mapping or mappingPath");
  }
  if (mapping != null) return structuredClone(mapping);
  const source = await readRegularFileInside(root, mappingPath, "legal entity mapping");
  return JSON.parse(source.bytes.toString("utf8"));
}

function dateOnly(value, label) {
  const date = String(value ?? "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(date)
      || Number.isNaN(Date.parse(`${date}T00:00:00.000Z`))) {
    throw new TypeError(`${label} must supply an ISO date`);
  }
  return date;
}

function directMembership(user, tenantId) {
  return user.tenant_memberships?.find((membership) =>
    membership?.tenant_id === tenantId)
    ?? user.membership
    ?? (user.tenant_id === tenantId ? user : null);
}

function disabledMembership(tenantId, sourceRef) {
  return Object.freeze({
    tenant_id: tenantId,
    status: "disabled",
    role_profile_id: null,
    role_ids: Object.freeze([]),
    group_ids: Object.freeze([]),
    scopes: Object.freeze([]),
    hrx_scopes: Object.freeze([]),
    source_ref: sourceRef,
  });
}

function targetMembership(user, tenantId, disabled) {
  const source = directMembership(user, tenantId);
  if (!source || (source.tenant_id != null && source.tenant_id !== tenantId)) {
    throw new TypeError("registration membership is outside the inventory tenant");
  }
  if (disabled) return disabledMembership(tenantId, source.source_ref ?? user.source_ref);
  return Object.freeze({
    tenant_id: tenantId,
    status: source.status === "disabled" ? "disabled" : "active",
    role_profile_id: source.role_profile_id ?? user.role_profile_id ?? null,
    role_ids: Object.freeze([...(source.role_ids ?? user.role_ids ?? [])]),
    group_ids: Object.freeze([...(source.group_ids ?? user.group_ids ?? [])]),
    scopes: Object.freeze([...(source.scopes ?? user.scopes ?? [])]),
    hrx_scopes: Object.freeze([...(source.hrx_scopes ?? user.hrx_scopes ?? [])]),
    source_ref: source.source_ref ?? user.source_ref ?? null,
  });
}

function accountProfile(user, member, legalEntityId, accountOnly) {
  return Object.freeze({
    ...Object.fromEntries(PROFILE_FIELDS
      .filter((field) => user[field] != null)
      .map((field) => [field, structuredClone(user[field])])),
    ...(user.profile && typeof user.profile === "object"
      ? structuredClone(user.profile)
      : {}),
    ...(member
      ? Object.fromEntries(ROSTER_PROFILE_FIELDS
          .filter((field) => member[field] != null)
          .map((field) => [field, structuredClone(member[field])]))
      : {}),
    legal_entity_id: legalEntityId,
    ...(accountOnly ? {
      roster_link_status: "pending-roster-link",
      login_allowed: false,
      identity_setup_allowed: false,
      access_grant_allowed: false,
    } : {}),
  });
}

async function plannedPhoto({
  root,
  photoDirectory,
  tenantId,
  legalEntityId,
  member,
}) {
  const opaqueName = `${sha256(requiredText(member.employee_id, "employee_id"))}.png`;
  const source = await readRegularFileInside(
    root,
    join(photoDirectory, opaqueName),
    "member photo",
  );
  assertValidHrxMemberPhotoPng(source.bytes);
  const metadata = createHrxMemberPhotoMetadata({
    tenant_id: tenantId,
    legal_entity_id: legalEntityId,
    employee_id: member.employee_id,
    photo_sha256: source.sha256,
    photo_byte_size: source.bytes.byteLength,
  });
  return Object.freeze({
    tenant_id: tenantId,
    legal_entity_id: legalEntityId,
    employee_id: member.employee_id,
    bytes: Buffer.from(source.bytes),
    ...metadata,
  });
}

export async function compileAmicPrivateBootstrapMigration({
  mapping: providedMapping,
  mappingPath = null,
  root = process.cwd(),
  registrationPath =
    "docs/reorganization/client-matter-os/matter-vault-r4/launch/matter-vault-user-registration-seed.json",
  rosterPath =
    "docs/reorganization/client-matter-os/matter-vault-r4/launch/hrx-member-roster-source-of-truth.json",
  contactPath = null,
  photoDirectory = "apps/api/src/hrx-member-photos",
} = {}) {
  const mapping = await resolveMapping({
    mapping: providedMapping,
    mappingPath,
    root,
  });
  const mappingReceipt = await validateAmicPrivateBootstrapLegalEntityMapping({
    mapping,
    root,
    registrationPath,
    rosterPath,
    contactPath,
    photoDirectory,
  });
  const inventory = await inventoryAmicPrivateBootstrap({
    root,
    registrationPath,
    rosterPath,
    contactPath,
    photoDirectory,
  });
  const [registrationSource, rosterSource] = await Promise.all([
    readRegularFileInside(root, registrationPath, "registration seed"),
    readRegularFileInside(root, rosterPath, "member roster"),
  ]);
  if (registrationSource.sha256 !== inventory.sources.registration.sha256
      || rosterSource.sha256 !== inventory.sources.roster.sha256) {
    throw new TypeError("private bootstrap source changed after mapping validation");
  }
  const registration = parsedSource(
    registrationSource,
    REGISTRATION_SCHEMA,
    "users",
    "registration seed",
  );
  const roster = parsedSource(
    rosterSource,
    ROSTER_SCHEMA,
    "members",
    "member roster",
  );
  const tenantId = requiredText(registration.tenant_id, "registration tenant_id");
  if (roster.tenant_id !== tenantId) {
    throw new TypeError("registration and roster tenant scope drifted");
  }
  const rosterEffectiveFrom = dateOnly(
    roster.created_at,
    "roster created_at",
  );
  const accounts = [];
  const employees = [];
  const profiles = [];
  const links = [];
  const photos = [];
  for (const assignment of mapping.assignments) {
    const registrationRow = assignment.source_coordinates.registration_row;
    const rosterRow = assignment.source_coordinates.roster_row;
    const user = registrationRow == null
      ? null
      : registration.users[registrationRow - 1];
    const member = rosterRow == null
      ? null
      : roster.members[rosterRow - 1];
    if (user && member && user.user_id !== member.user_id) {
      throw new TypeError("approved mapping source rows no longer identify one subject");
    }
    if (assignment.disposition === "quarantine") continue;
    if (!user) {
      throw new TypeError("an assigned roster-only subject cannot be imported without registration");
    }
    const legalEntityId = requiredText(
      assignment.legal_entity_id,
      "approved legal_entity_id",
    );
    const accountOnly = !member;
    const membership = targetMembership(user, tenantId, accountOnly);
    accounts.push(Object.freeze({
      ...structuredClone(user),
      tenant_id: tenantId,
      status: accountOnly ? "disabled" : user.status,
      account_status: accountOnly ? "disabled" : user.account_status,
      credential_status: accountOnly ? "disabled" : user.credential_status,
      tenant_memberships: Object.freeze([membership]),
      membership,
      profile: accountProfile(user, member, legalEntityId, accountOnly),
    }));
    if (!member) continue;
    const email = requiredText(user.email, "registration email").toLowerCase();
    if (requiredText(member.work_email, "roster work_email").toLowerCase()
        !== email) {
      throw new TypeError("registration and roster email conflict");
    }
    const photo = assignment.source_presence.photo
      ? await plannedPhoto({
          root,
          photoDirectory,
          tenantId,
          legalEntityId,
          member,
        })
      : null;
    if (photo) photos.push(photo);
    const sourceRef = `private-bootstrap:${mappingReceipt.mapping_sha256}`;
    employees.push(Object.freeze({
      schema_version: "law-firm-os.hrx-core-schema.v0.1",
      tenant_id: tenantId,
      employee_id: requiredText(member.employee_id, "roster employee_id"),
      display_name: requiredText(member.display_name, "roster display_name"),
      legal_name: member.legal_name ?? null,
      work_email: email,
      mobile_phone: member.mobile_phone ?? null,
      status: member.status === "inactive" ? "inactive" : "active",
      source_ref: sourceRef,
      ...(photo ? {
        photo_object_id: photo.photo_object_id,
        photo_sha256: photo.photo_sha256,
        photo_byte_size: photo.photo_byte_size,
        photo_content_type: photo.photo_content_type,
        photo_version_id: AMIC_PRIVATE_BOOTSTRAP_PHOTO_VERSION_PLACEHOLDER,
      } : {}),
    }));
    profiles.push(Object.freeze({
      schema_version: "law-firm-os.hrx-core-schema.v0.1",
      tenant_id: tenantId,
      profile_id: `profile_${member.employee_id}`,
      employee_id: member.employee_id,
      employment_type: member.employment_type ?? "full_time",
      status: member.profile_status === "terminated" ? "terminated" : "active",
      title: member.title ?? null,
      org_unit_id: member.org_unit_id ?? null,
      legal_entity_id: legalEntityId,
      affiliation: member.affiliation ?? null,
      department: member.department ?? null,
      organization_group: member.organization_group ?? null,
      country: member.country ?? null,
      manager_employee_id: member.manager_employee_id ?? null,
      start_date: member.start_date ?? null,
      effective_from: dateOnly(
        member.effective_from ?? member.start_date ?? rosterEffectiveFrom,
        "employment profile effective_from",
      ),
      effective_to: member.effective_to ?? null,
      source_ref: sourceRef,
      professional_profile: JSON.stringify(member.professional_profile ?? {}),
    }));
    links.push(Object.freeze({
      schema_version: "law-firm-os.hrx-core-schema.v0.1",
      tenant_id: tenantId,
      link_id: `login_${member.employee_id}`,
      employee_id: member.employee_id,
      user_id: user.user_id,
      purpose: "login_mapping",
      source_ref: sourceRef,
    }));
  }
  const store = createFileHrxStore({
    initialState: {
      schema_version: "law-firm-os.hrx-file-store.v0.1",
      applied_migrations: [],
      tables: {
        hrx_employees: employees,
        hrx_employment_profiles: profiles,
        hrx_employee_user_links: links,
      },
    },
  });
  let snapshot;
  try {
    snapshot = createHrxDomainSnapshot({
      store,
      tenant_id: tenantId,
    }).snapshot;
  } finally {
    store.close();
  }
  const safeAuditPayload = Object.freeze({
    inventory_sha256: inventory.inventory_sha256,
    mapping_sha256: mappingReceipt.mapping_sha256,
    assigned_subject_count: mappingReceipt.assigned_subject_count,
    quarantined_subject_count: mappingReceipt.quarantined_subject_count,
    photo_count: photos.length,
    raw_identity_included: false,
  });
  const domain = Object.freeze({
    domain_id: "hrx",
    records: snapshot.records,
    idempotency_entries: Object.freeze([{
      key: `amic-private-bootstrap:${mappingReceipt.mapping_sha256}`,
      request_hash: hashDomainValue(safeAuditPayload),
      response: safeAuditPayload,
    }]),
    audit_events: Object.freeze([{
      event_id: `amic-private-bootstrap:${mappingReceipt.mapping_sha256}`,
      event_type: "hrx.private_bootstrap.migration",
      actor_id: mapping.approval_ref,
      object_type: "PrivateBootstrapMigration",
      object_id: mappingReceipt.mapping_sha256,
      payload: safeAuditPayload,
    }]),
  });
  const corpus = {
    schema_version: "law-firm-os.json-postgres-migration-corpus.v1",
    data_scope: "approved-real-manifest",
    tenant_id: tenantId,
    accounts: Object.freeze(accounts),
    domains: Object.freeze([domain]),
  };
  const prepared = prepareJsonPostgresMigrationCorpus(corpus, {
    allowRealData: true,
  });
  if (prepared.rejected.length !== 0) {
    throw new TypeError(
      `private bootstrap corpus contains ${prepared.rejected.length} rejected items`,
    );
  }
  const sealedCorpus = Object.freeze({
    ...corpus,
    manifest_sha256: prepared.manifest_sha256,
  });
  const recordTypeCatalog = createJsonPostgresRecordTypeCatalog({
    corpus: sealedCorpus,
  });
  return Object.freeze({
    mapping_receipt: mappingReceipt,
    corpus: sealedCorpus,
    record_type_catalog: recordTypeCatalog,
    photo_stages: Object.freeze(photos),
  });
}

export function createAmicPrivateBootstrapDryRunReceipt(compiled, result) {
  if (!compiled?.mapping_receipt
      || !compiled?.corpus
      || !compiled?.record_type_catalog
      || !Array.isArray(compiled?.photo_stages)
      || result?.mode !== "dry-run") {
    throw new TypeError("private bootstrap dry-run inputs are invalid");
  }
  const photoAggregateSha256 = sha256(compiled.photo_stages
    .map((photo) => `${photo.photo_sha256}:${photo.photo_byte_size}\n`)
    .sort()
    .join(""));
  return Object.freeze({
    schema_version: AMIC_PRIVATE_BOOTSTRAP_MIGRATION_DRY_RUN_VERSION,
    outcome: result.outcome,
    tenant_ref_sha256: sha256(compiled.corpus.tenant_id),
    inventory_sha256: compiled.mapping_receipt.inventory_sha256,
    mapping_sha256: compiled.mapping_receipt.mapping_sha256,
    migration_manifest_sha256: result.source_manifest_sha256,
    record_type_catalog_sha256: result.record_type_catalog_sha256,
    source_subject_count: compiled.mapping_receipt.subject_count,
    assigned_subject_count: compiled.mapping_receipt.assigned_subject_count,
    quarantined_subject_count:
      compiled.mapping_receipt.quarantined_subject_count,
    legal_entity_count: compiled.mapping_receipt.legal_entity_count,
    directory_target_count: result.directory.accepted_count,
    hrx_record_count: result.safe_counts.accepted_record_count,
    photo_target_count: compiled.photo_stages.length,
    photo_aggregate_sha256: photoAggregateSha256,
    rejected_item_count: result.safe_counts.rejected_item_count,
    source_mutated: false,
    postgres_write_count: 0,
    object_storage_write_count: 0,
    raw_identity_included: false,
    raw_photo_included: false,
    production_ready_claim: false,
  });
}

export async function dryRunAmicPrivateBootstrapMigration(options = {}) {
  const compiled = await compileAmicPrivateBootstrapMigration(options);
  const result = await runJsonPostgresMigration({
    corpus: compiled.corpus,
    mode: "dry-run",
    allowRealData: true,
    recordTypeCatalog: compiled.record_type_catalog,
  });
  return createAmicPrivateBootstrapDryRunReceipt(compiled, result);
}

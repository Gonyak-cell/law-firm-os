import { createHash } from "node:crypto";
import { lstat, readFile, readdir, realpath } from "node:fs/promises";
import { basename, join, relative, resolve, sep } from "node:path";
import {
  assertValidHrxMemberPhotoPng,
} from "../../packages/hrx/src/member-photo-storage.js";

export const AMIC_PRIVATE_BOOTSTRAP_INVENTORY_VERSION =
  "law-firm-os.amic-private-bootstrap-inventory.v1";
export const AMIC_PRIVATE_BOOTSTRAP_LEGAL_ENTITY_MAPPING_VERSION =
  "law-firm-os.amic-private-bootstrap-legal-entity-mapping.v1";
export const AMIC_PRIVATE_BOOTSTRAP_LEGAL_ENTITY_MAPPING_RECEIPT_VERSION =
  "law-firm-os.amic-private-bootstrap-legal-entity-mapping-receipt.v1";

const REGISTRATION_SCHEMA =
  "law-firm-os.matter-vault-user-registration-seed.v0.1";
const ROSTER_SCHEMA =
  "law-firm-os.hrx-member-roster-source-of-truth.v0.1";
const CONTACT_SCHEMA =
  "law-firm-os.hrx-member-contact-source-of-truth.v0.1";
const PHOTO_FILE = /^[a-f0-9]{64}\.png$/u;
const SAFE_REF = /^[A-Za-z0-9_.:-]{1,160}$/u;

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) =>
      `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function requiredText(value, label) {
  const text = String(value ?? "").trim();
  if (!text) throw new TypeError(`${label} is required`);
  return text;
}

function requireArray(value, label) {
  if (!Array.isArray(value)) throw new TypeError(`${label} must be an array`);
  return value;
}

function closedObject(value, fields, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object`);
  }
  const extras = Object.keys(value).filter((key) => !fields.includes(key));
  if (extras.length > 0) {
    throw new TypeError(`${label} contains unsupported fields: ${extras.join(",")}`);
  }
}

function requiredSafeRef(value, label) {
  const text = requiredText(value, label);
  if (!SAFE_REF.test(text)) throw new TypeError(`${label} is invalid`);
  return text;
}

function requireUnique(rows, field, label) {
  const values = rows.map((row, index) =>
    requiredText(row?.[field], `${label}[${index}].${field}`));
  if (new Set(values).size !== values.length) {
    throw new TypeError(`${label}.${field} values must be unique`);
  }
  return values;
}

function safeRelativePath(root, path) {
  const value = relative(root, path);
  if (!value || value === ".." || value.startsWith(`..${sep}`)) {
    throw new TypeError("private bootstrap source must be inside the repository root");
  }
  return value.split(sep).join("/");
}

async function readRegularFileInside(root, path, label) {
  const absolute = resolve(root, path);
  const canonicalRoot = await realpath(root);
  const canonical = await realpath(absolute);
  safeRelativePath(canonicalRoot, canonical);
  const stat = await lstat(absolute);
  if (!stat.isFile() || stat.isSymbolicLink()) {
    throw new TypeError(`${label} must be a regular non-symlink file`);
  }
  const bytes = await readFile(absolute);
  return Object.freeze({
    absolute,
    relative_path: safeRelativePath(canonicalRoot, canonical),
    bytes,
    byte_size: bytes.byteLength,
    sha256: sha256(bytes),
  });
}

function parseJsonSource(source, schema, arrayField, label) {
  const value = JSON.parse(source.bytes.toString("utf8"));
  if (value?.schema_version !== schema) {
    throw new TypeError(`${label} schema is invalid`);
  }
  return Object.freeze({
    value,
    rows: requireArray(value[arrayField], `${label}.${arrayField}`),
  });
}

async function inventoryPhotoDirectory(root, photoDirectory, employeeIds) {
  const directory = resolve(root, photoDirectory);
  const canonicalRoot = await realpath(root);
  const canonicalDirectory = await realpath(directory);
  const relativePath = safeRelativePath(canonicalRoot, canonicalDirectory);
  const directoryStat = await lstat(directory);
  if (!directoryStat.isDirectory() || directoryStat.isSymbolicLink()) {
    throw new TypeError("member photo source must be a regular non-symlink directory");
  }
  const entries = (await readdir(directory, { withFileTypes: true }))
    .filter((entry) => !entry.name.startsWith("."));
  if (entries.some((entry) => !entry.isFile() || entry.isSymbolicLink())) {
    throw new TypeError("member photo source must contain regular files only");
  }
  if (entries.some((entry) => !PHOTO_FILE.test(entry.name))) {
    throw new TypeError("member photo source contains an invalid opaque filename");
  }
  const expected = new Set(employeeIds.map((employeeId) =>
    `${sha256(employeeId)}.png`));
  const rows = [];
  for (const entry of entries.sort((left, right) =>
    left.name.localeCompare(right.name, "en"))) {
    const file = await readRegularFileInside(
      canonicalRoot,
      join(canonicalDirectory, entry.name),
      "member photo",
    );
    assertValidHrxMemberPhotoPng(file.bytes);
    rows.push(Object.freeze({
      opaque_name: entry.name,
      byte_size: file.byte_size,
      sha256: file.sha256,
    }));
  }
  const actual = new Set(rows.map((row) => row.opaque_name));
  const aggregateMaterial = rows.map((row) =>
    `${row.opaque_name}:${row.byte_size}:${row.sha256}\n`).join("");
  return Object.freeze({
    relative_path: relativePath,
    file_count: rows.length,
    total_byte_size: rows.reduce((sum, row) => sum + row.byte_size, 0),
    aggregate_sha256: sha256(aggregateMaterial),
    roster_photo_match_count: [...actual].filter((name) => expected.has(name)).length,
    roster_photo_missing_count: [...expected].filter((name) => !actual.has(name)).length,
    orphan_photo_count: [...actual].filter((name) => !expected.has(name)).length,
    raw_filename_included: false,
    raw_bytes_included: false,
  });
}

async function photoOpaqueNames(root, photoDirectory) {
  const directory = resolve(root, photoDirectory);
  const canonicalRoot = await realpath(root);
  const canonicalDirectory = await realpath(directory);
  safeRelativePath(canonicalRoot, canonicalDirectory);
  const directoryStat = await lstat(directory);
  if (!directoryStat.isDirectory() || directoryStat.isSymbolicLink()) {
    throw new TypeError("member photo source must be a regular non-symlink directory");
  }
  const entries = (await readdir(directory, { withFileTypes: true }))
    .filter((entry) => !entry.name.startsWith("."));
  if (entries.some((entry) =>
    !entry.isFile() || entry.isSymbolicLink() || !PHOTO_FILE.test(entry.name))) {
    throw new TypeError("member photo source contains an invalid entry");
  }
  return new Set(entries.map((entry) => entry.name));
}

async function privateBootstrapIdentityCoordinates({
  root,
  registrationPath,
  rosterPath,
  photoDirectory,
  inventory,
}) {
  const repositoryRoot = await realpath(resolve(root));
  const registrationSource = await readRegularFileInside(
    repositoryRoot,
    registrationPath,
    "registration seed",
  );
  const rosterSource = await readRegularFileInside(
    repositoryRoot,
    rosterPath,
    "member roster",
  );
  const registration = parseJsonSource(
    registrationSource,
    REGISTRATION_SCHEMA,
    "users",
    "registration seed",
  );
  const roster = parseJsonSource(
    rosterSource,
    ROSTER_SCHEMA,
    "members",
    "member roster",
  );
  if (registrationSource.sha256 !== inventory.sources.registration.sha256
      || rosterSource.sha256 !== inventory.sources.roster.sha256) {
    throw new TypeError("private bootstrap source changed during inventory");
  }
  const photos = await photoOpaqueNames(repositoryRoot, photoDirectory);
  const coordinates = new Map();
  registration.rows.forEach((row, index) => {
    const userId = requiredText(row?.user_id, `registration seed users[${index}].user_id`);
    coordinates.set(userId, {
      user_id: userId,
      registration_row: index + 1,
      roster_row: null,
      employee_id: null,
    });
  });
  roster.rows.forEach((row, index) => {
    const userId = requiredText(row?.user_id, `member roster members[${index}].user_id`);
    const employeeId = requiredText(
      row?.employee_id,
      `member roster members[${index}].employee_id`,
    );
    const prior = coordinates.get(userId);
    coordinates.set(userId, {
      user_id: userId,
      registration_row: prior?.registration_row ?? null,
      roster_row: index + 1,
      employee_id: employeeId,
    });
  });
  return [...coordinates.values()].map((row) => Object.freeze({
    subject_ref: sha256([
      AMIC_PRIVATE_BOOTSTRAP_LEGAL_ENTITY_MAPPING_VERSION,
      inventory.inventory_sha256,
      row.user_id,
    ].join("\u0000")),
    source_coordinates: Object.freeze({
      registration_row: row.registration_row,
      roster_row: row.roster_row,
    }),
    source_presence: Object.freeze({
      registration: row.registration_row !== null,
      roster: row.roster_row !== null,
      photo: row.employee_id !== null
        && photos.has(`${sha256(row.employee_id)}.png`),
    }),
  })).sort((left, right) => left.subject_ref.localeCompare(right.subject_ref, "en"));
}

export async function inventoryAmicPrivateBootstrap({
  root = process.cwd(),
  registrationPath =
    "docs/reorganization/client-matter-os/matter-vault-r4/launch/matter-vault-user-registration-seed.json",
  rosterPath =
    "docs/reorganization/client-matter-os/matter-vault-r4/launch/hrx-member-roster-source-of-truth.json",
  contactPath = null,
  photoDirectory = "apps/api/src/hrx-member-photos",
} = {}) {
  const repositoryRoot = await realpath(resolve(root));
  const registrationSource = await readRegularFileInside(
    repositoryRoot,
    registrationPath,
    "registration seed",
  );
  const rosterSource = await readRegularFileInside(
    repositoryRoot,
    rosterPath,
    "member roster",
  );
  const registration = parseJsonSource(
    registrationSource,
    REGISTRATION_SCHEMA,
    "users",
    "registration seed",
  );
  const roster = parseJsonSource(
    rosterSource,
    ROSTER_SCHEMA,
    "members",
    "member roster",
  );
  const registrationTenant = requiredText(
    registration.value.tenant_id,
    "registration seed tenant_id",
  );
  const rosterTenant = requiredText(roster.value.tenant_id, "member roster tenant_id");
  if (registrationTenant !== rosterTenant) {
    throw new TypeError("registration and roster tenant scope must match");
  }
  const accountUserIds = requireUnique(
    registration.rows,
    "user_id",
    "registration seed users",
  );
  requireUnique(registration.rows, "email", "registration seed users");
  const rosterUserIds = requireUnique(roster.rows, "user_id", "member roster members");
  const employeeIds = requireUnique(
    roster.rows,
    "employee_id",
    "member roster members",
  );
  requireUnique(roster.rows, "work_email", "member roster members");
  const accountUsers = new Set(accountUserIds);
  const rosterUsers = new Set(rosterUserIds);
  const photos = await inventoryPhotoDirectory(
    repositoryRoot,
    photoDirectory,
    employeeIds,
  );

  let contacts = Object.freeze({
    configured: false,
    relative_path: null,
    schema_version: CONTACT_SCHEMA,
    contact_count: 0,
    byte_size: 0,
    sha256: null,
  });
  if (contactPath) {
    const contactSource = await readRegularFileInside(
      repositoryRoot,
      contactPath,
      "member contact source",
    );
    const parsedContacts = parseJsonSource(
      contactSource,
      CONTACT_SCHEMA,
      "contacts",
      "member contact source",
    );
    requireUnique(parsedContacts.rows, "work_email", "member contacts");
    contacts = Object.freeze({
      configured: true,
      relative_path: contactSource.relative_path,
      schema_version: CONTACT_SCHEMA,
      contact_count: parsedContacts.rows.length,
      byte_size: contactSource.byte_size,
      sha256: contactSource.sha256,
    });
  }

  const sourceMaterial = {
    tenant_ref: sha256(registrationTenant),
    registration_sha256: registrationSource.sha256,
    roster_sha256: rosterSource.sha256,
    contact_sha256: contacts.sha256,
    photo_aggregate_sha256: photos.aggregate_sha256,
  };
  return Object.freeze({
    schema_version: AMIC_PRIVATE_BOOTSTRAP_INVENTORY_VERSION,
    outcome: "PASS",
    tenant_ref: sourceMaterial.tenant_ref,
    sources: Object.freeze({
      registration: Object.freeze({
        relative_path: registrationSource.relative_path,
        schema_version: REGISTRATION_SCHEMA,
        account_count: registration.rows.length,
        byte_size: registrationSource.byte_size,
        sha256: registrationSource.sha256,
      }),
      roster: Object.freeze({
        relative_path: rosterSource.relative_path,
        schema_version: ROSTER_SCHEMA,
        member_count: roster.rows.length,
        byte_size: rosterSource.byte_size,
        sha256: rosterSource.sha256,
      }),
      contacts,
      photos,
    }),
    reconciliation: Object.freeze({
      account_roster_match_count: accountUserIds.filter((id) =>
        rosterUsers.has(id)).length,
      account_only_count: accountUserIds.filter((id) =>
        !rosterUsers.has(id)).length,
      roster_only_count: rosterUserIds.filter((id) =>
        !accountUsers.has(id)).length,
      roster_photo_match_count: photos.roster_photo_match_count,
      roster_photo_missing_count: photos.roster_photo_missing_count,
      orphan_photo_count: photos.orphan_photo_count,
    }),
    legal_entity: Object.freeze({
      assignment_count: 0,
      explicit_mapping_required_before_import: true,
    }),
    inventory_sha256: sha256(JSON.stringify(sourceMaterial)),
    raw_identity_included: false,
    raw_contact_included: false,
    raw_photo_included: false,
    source_mutated: false,
    production_ready_claim: false,
  });
}

export async function createAmicPrivateBootstrapLegalEntityMappingTemplate({
  root = process.cwd(),
  registrationPath =
    "docs/reorganization/client-matter-os/matter-vault-r4/launch/matter-vault-user-registration-seed.json",
  rosterPath =
    "docs/reorganization/client-matter-os/matter-vault-r4/launch/hrx-member-roster-source-of-truth.json",
  contactPath = null,
  photoDirectory = "apps/api/src/hrx-member-photos",
} = {}) {
  const inventory = await inventoryAmicPrivateBootstrap({
    root,
    registrationPath,
    rosterPath,
    contactPath,
    photoDirectory,
  });
  const coordinates = await privateBootstrapIdentityCoordinates({
    root,
    registrationPath,
    rosterPath,
    photoDirectory,
    inventory,
  });
  return Object.freeze({
    schema_version: AMIC_PRIVATE_BOOTSTRAP_LEGAL_ENTITY_MAPPING_VERSION,
    inventory_sha256: inventory.inventory_sha256,
    tenant_ref: inventory.tenant_ref,
    approval_ref: null,
    assignments: Object.freeze(coordinates.map((row) => Object.freeze({
      subject_ref: row.subject_ref,
      source_coordinates: row.source_coordinates,
      source_presence: row.source_presence,
      disposition: "pending",
      legal_entity_id: null,
      quarantine_reason_code: null,
    }))),
    raw_identity_included: false,
    import_authorized: false,
  });
}

export async function validateAmicPrivateBootstrapLegalEntityMapping({
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
  if ((providedMapping == null) === (mappingPath == null)) {
    throw new TypeError("provide exactly one legal entity mapping or mappingPath");
  }
  let mapping = providedMapping;
  if (mappingPath != null) {
    const repositoryRoot = await realpath(resolve(root));
    const source = await readRegularFileInside(
      repositoryRoot,
      mappingPath,
      "legal entity mapping",
    );
    mapping = JSON.parse(source.bytes.toString("utf8"));
  }
  const template = await createAmicPrivateBootstrapLegalEntityMappingTemplate({
    root,
    registrationPath,
    rosterPath,
    contactPath,
    photoDirectory,
  });
  closedObject(mapping, [
    "schema_version",
    "inventory_sha256",
    "tenant_ref",
    "approval_ref",
    "assignments",
    "raw_identity_included",
    "import_authorized",
  ], "legal entity mapping");
  if (mapping.schema_version !== AMIC_PRIVATE_BOOTSTRAP_LEGAL_ENTITY_MAPPING_VERSION) {
    throw new TypeError("legal entity mapping schema is invalid");
  }
  if (mapping.inventory_sha256 !== template.inventory_sha256
      || mapping.tenant_ref !== template.tenant_ref) {
    throw new TypeError("legal entity mapping is not bound to the current inventory");
  }
  if (mapping.raw_identity_included !== false || mapping.import_authorized !== false) {
    throw new TypeError("legal entity mapping must not contain raw identity or authorize import");
  }
  const approvalRef = requiredSafeRef(mapping.approval_ref, "legal entity mapping approval_ref");
  const assignments = requireArray(mapping.assignments, "legal entity mapping assignments");
  const expectedByRef = new Map(template.assignments.map((row) => [row.subject_ref, row]));
  const seen = new Set();
  const normalized = [];
  for (const [index, assignment] of assignments.entries()) {
    const label = `legal entity mapping assignments[${index}]`;
    closedObject(assignment, [
      "subject_ref",
      "source_coordinates",
      "source_presence",
      "disposition",
      "legal_entity_id",
      "quarantine_reason_code",
    ], label);
    const subjectRef = requiredText(assignment.subject_ref, `${label}.subject_ref`);
    if (!/^[a-f0-9]{64}$/u.test(subjectRef) || seen.has(subjectRef)) {
      throw new TypeError(`${label}.subject_ref is invalid or duplicated`);
    }
    seen.add(subjectRef);
    const expected = expectedByRef.get(subjectRef);
    if (!expected) throw new TypeError(`${label}.subject_ref is outside the current inventory`);
    closedObject(
      assignment.source_coordinates,
      ["registration_row", "roster_row"],
      `${label}.source_coordinates`,
    );
    closedObject(
      assignment.source_presence,
      ["registration", "roster", "photo"],
      `${label}.source_presence`,
    );
    if (stableJson(assignment.source_coordinates) !== stableJson(expected.source_coordinates)
        || stableJson(assignment.source_presence) !== stableJson(expected.source_presence)) {
      throw new TypeError(`${label} source binding drifted`);
    }
    const disposition = String(assignment.disposition ?? "");
    let legalEntityId = null;
    let quarantineReasonCode = null;
    if (disposition === "assign") {
      legalEntityId = requiredSafeRef(
        assignment.legal_entity_id,
        `${label}.legal_entity_id`,
      );
      if (assignment.quarantine_reason_code != null) {
        throw new TypeError(`${label} assigned subject must not have a quarantine reason`);
      }
    } else if (disposition === "quarantine") {
      quarantineReasonCode = requiredSafeRef(
        assignment.quarantine_reason_code,
        `${label}.quarantine_reason_code`,
      );
      if (assignment.legal_entity_id != null) {
        throw new TypeError(`${label} quarantined subject must not have a legal entity`);
      }
    } else {
      throw new TypeError(`${label}.disposition must be assign or quarantine`);
    }
    normalized.push({
      subject_ref: subjectRef,
      source_coordinates: expected.source_coordinates,
      source_presence: expected.source_presence,
      disposition,
      legal_entity_id: legalEntityId,
      quarantine_reason_code: quarantineReasonCode,
    });
  }
  if (seen.size !== expectedByRef.size
      || [...expectedByRef.keys()].some((subjectRef) => !seen.has(subjectRef))) {
    throw new TypeError("legal entity mapping must cover every inventory subject exactly once");
  }
  normalized.sort((left, right) => left.subject_ref.localeCompare(right.subject_ref, "en"));
  const legalEntityIds = new Set(normalized
    .filter((row) => row.disposition === "assign")
    .map((row) => row.legal_entity_id));
  const normalizedMapping = {
    schema_version: mapping.schema_version,
    inventory_sha256: mapping.inventory_sha256,
    tenant_ref: mapping.tenant_ref,
    approval_ref: approvalRef,
    assignments: normalized,
    raw_identity_included: false,
    import_authorized: false,
  };
  return Object.freeze({
    schema_version:
      AMIC_PRIVATE_BOOTSTRAP_LEGAL_ENTITY_MAPPING_RECEIPT_VERSION,
    outcome: "PASS",
    inventory_sha256: template.inventory_sha256,
    tenant_ref: template.tenant_ref,
    mapping_sha256: sha256(stableJson(normalizedMapping)),
    subject_count: normalized.length,
    assigned_subject_count: normalized.filter((row) =>
      row.disposition === "assign").length,
    quarantined_subject_count: normalized.filter((row) =>
      row.disposition === "quarantine").length,
    subject_with_photo_count: normalized.filter((row) =>
      row.source_presence.photo).length,
    legal_entity_count: legalEntityIds.size,
    ready_for_dry_run: true,
    import_authorized: false,
    raw_identity_included: false,
    source_mutated: false,
    production_ready_claim: false,
  });
}

import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const DEFAULT_DESKTOP_PRIVATE_DATA_SOURCES = Object.freeze({
  roster: "docs/reorganization/client-matter-os/matter-vault-r4/launch/hrx-member-roster-source-of-truth.json",
  registrationSeed: "docs/reorganization/client-matter-os/matter-vault-r4/launch/matter-vault-user-registration-seed.json",
  photos: "apps/api/src/hrx-member-photos",
});

const COMMON_IDENTITY_KEYS = new Set([
  "contact_id",
  "display_name",
  "email",
  "email_address",
  "employee_id",
  "english_name",
  "legal_name",
  "manager_employee_id",
  "mobile",
  "mobile_phone",
  "phone",
  "phone_number",
  "telephone",
  "tenant_id",
  "user_id",
  "work_email",
]);
const ROSTER_METADATA_KEYS = new Set([
  "affiliation",
  "department",
  "organization_group",
  "start_date",
  "title",
]);
const REGISTRATION_SOURCE_KEYS = new Set(["folder", "sha256", "sheet", "workbook"]);
const CREDENTIAL_KEYS = new Set([
  "access_token",
  "api_key",
  "client_secret",
  "credential",
  "credential_value",
  "password",
  "passwd",
  "private_key",
  "refresh_token",
  "secret",
  "seed",
  "synthetic_token",
  "token",
]);
const SENSITIVE_KEYS = new Set([
  ...COMMON_IDENTITY_KEYS,
  ...CREDENTIAL_KEYS,
  "canonical_display_name",
  "client_code",
  "client_display_name",
  "client_id",
  "client_name",
  "client_short_name",
  "matter_code",
  "matter_id",
  "matter_name",
  "matter_number",
  "org_unit_id",
  "organization_id",
  "organization_name",
  "tenant_name",
]);
const CORPUS_NEEDLES = Symbol("desktop-private-data-needles");
const CORPUS_PHOTO_HASHES = Symbol("desktop-private-photo-hashes");
const MIN_PROTECTED_BYTE_LENGTH = 4;
const MIN_DESCRIPTIVE_BYTE_LENGTH = 14;
const MIN_DESCRIPTIVE_ENTROPY = 3.5;

export class DesktopPrivateDataBoundaryError extends Error {
  constructor(kind, targetPath) {
    super(kind);
    this.name = "DesktopPrivateDataBoundaryError";
    this.kind = kind;
    this.targetPath = targetPath;
  }
}

export function compareCodePointText(leftValue, rightValue) {
  const left = String(leftValue)[Symbol.iterator]();
  const right = String(rightValue)[Symbol.iterator]();
  while (true) {
    const leftStep = left.next();
    const rightStep = right.next();
    if (leftStep.done || rightStep.done) return leftStep.done === rightStep.done ? 0 : leftStep.done ? -1 : 1;
    const leftPoint = leftStep.value.codePointAt(0);
    const rightPoint = rightStep.value.codePointAt(0);
    if (leftPoint !== rightPoint) return leftPoint < rightPoint ? -1 : 1;
  }
}

function normalizedKey(key) {
  return String(key)
    .trim()
    .replace(/([A-Z]+)([A-Z][a-z])/gu, "$1_$2")
    .replace(/([a-z0-9])([A-Z])/gu, "$1_$2")
    .replace(/[^A-Za-z0-9]+/gu, "_")
    .replace(/^_+|_+$/gu, "")
    .toLowerCase();
}

function codePointEntropy(text) {
  const codePoints = [...text];
  const counts = new Map();
  for (const codePoint of codePoints) counts.set(codePoint, (counts.get(codePoint) ?? 0) + 1);
  return [...counts.values()].reduce((entropy, count) => {
    const probability = count / codePoints.length;
    return entropy - probability * Math.log2(probability);
  }, 0);
}

function addScalar(target, value, { sensitive = false } = {}) {
  if (typeof value !== "string" && typeof value !== "number") return;
  const text = String(value).trim();
  const bytes = Buffer.from(text);
  if (!text || bytes.length < MIN_PROTECTED_BYTE_LENGTH) return;
  if (!sensitive && (bytes.length < MIN_DESCRIPTIVE_BYTE_LENGTH || codePointEntropy(text) < MIN_DESCRIPTIVE_ENTROPY)) return;
  target.set(bytes.toString("hex"), bytes);
}

function addLeaves(target, value, { stringsOnly = false, sensitive = false } = {}) {
  if (Array.isArray(value)) {
    for (const child of value) addLeaves(target, child, { stringsOnly, sensitive });
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      addLeaves(target, child, { stringsOnly, sensitive: sensitive || SENSITIVE_KEYS.has(normalizedKey(key)) });
    }
    return;
  }
  if (!stringsOnly || typeof value === "string") addScalar(target, value, { sensitive });
}

function collectProtectedValues(value, sourceKind, protectedValues, credentialValues, { runtimeSafeOnly = false } = {}) {
  if (Array.isArray(value)) {
    for (const child of value) collectProtectedValues(child, sourceKind, protectedValues, credentialValues, { runtimeSafeOnly });
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    const normalized = normalizedKey(key);
    const sensitive = SENSITIVE_KEYS.has(normalized);
    if (CREDENTIAL_KEYS.has(normalized)) {
      addLeaves(credentialValues, child, { sensitive: true });
    } else if (sourceKind === "roster" && normalized === "professional_profile" && !runtimeSafeOnly) {
      addLeaves(protectedValues, child, { stringsOnly: true });
    } else if (sensitive
      || (sourceKind === "roster" && !runtimeSafeOnly && ROSTER_METADATA_KEYS.has(normalized))
      || (sourceKind === "registration_seed" && !runtimeSafeOnly && REGISTRATION_SOURCE_KEYS.has(normalized))) {
      addLeaves(protectedValues, child, { sensitive });
    } else {
      collectProtectedValues(child, sourceKind, protectedValues, credentialValues, { runtimeSafeOnly });
    }
  }
}

async function requirePath(targetPath, missingKind) {
  try {
    return await stat(targetPath);
  } catch {
    throw new DesktopPrivateDataBoundaryError(missingKind, targetPath);
  }
}

async function readProtectedJson(sourcePath, sourceKind) {
  const sourceStat = await requirePath(sourcePath, "missing_protected_source");
  if (!sourceStat.isFile()) throw new DesktopPrivateDataBoundaryError("invalid_protected_source", sourcePath);
  let source;
  try {
    source = await readFile(sourcePath, "utf8");
  } catch {
    throw new DesktopPrivateDataBoundaryError("unreadable_protected_source", sourcePath);
  }
  try {
    return JSON.parse(source);
  } catch {
    throw new DesktopPrivateDataBoundaryError(`invalid_${sourceKind}_json`, sourcePath);
  }
}

async function readCandidateModule(sourcePath, sourceKind) {
  const sourceStat = await requirePath(sourcePath, `missing_${sourceKind}_source`);
  if (!sourceStat.isFile()) throw new DesktopPrivateDataBoundaryError(`invalid_${sourceKind}_source`, sourcePath);
  try {
    return await import(pathToFileURL(sourcePath).href);
  } catch {
    throw new DesktopPrivateDataBoundaryError(`invalid_${sourceKind}_source`, sourcePath);
  }
}

function addCandidateLeaves(target, records) {
  for (const record of records) addLeaves(target, record);
}

async function filesUnder(targetPath) {
  const targetStat = await requirePath(targetPath, "missing_protected_source");
  if (targetStat.isFile()) return [targetPath];
  if (!targetStat.isDirectory()) throw new DesktopPrivateDataBoundaryError("invalid_protected_source", targetPath);
  const files = [];
  const entries = await readdir(targetPath, { withFileTypes: true });
  entries.sort((left, right) => compareCodePointText(left.name, right.name));
  for (const entry of entries) {
    const childPath = path.join(targetPath, entry.name);
    if (entry.isDirectory()) files.push(...await filesUnder(childPath));
    else if (entry.isFile()) files.push(childPath);
  }
  return files;
}

async function sha256File(filePath) {
  const hash = createHash("sha256");
  try {
    for await (const chunk of createReadStream(filePath)) hash.update(chunk);
  } catch {
    throw new DesktopPrivateDataBoundaryError("unreadable_protected_source", filePath);
  }
  return hash.digest("hex");
}

export async function buildDesktopPrivateDataCorpus({
  rosterSourcePath,
  contactSourcePath = null,
  contactSourceNotApplicable = false,
  registrationSeedSourcePath,
  photoSourcePath,
  clientCandidateSourcePath = null,
  matterCandidateSourcePath = null,
  runtimeSafeOnly = false,
} = {}) {
  if (!rosterSourcePath || !registrationSeedSourcePath || !photoSourcePath) {
    throw new DesktopPrivateDataBoundaryError("missing_protected_source_argument", ".");
  }
  const hasContactPath = typeof contactSourcePath === "string" && contactSourcePath.trim().length > 0;
  if (hasContactPath && contactSourceNotApplicable === true) {
    throw new DesktopPrivateDataBoundaryError("conflicting_contact_source_authority", ".");
  }
  if (!hasContactPath && contactSourceNotApplicable !== true) {
    throw new DesktopPrivateDataBoundaryError("missing_contact_source_authority", ".");
  }
  const hasClientCandidatePath = typeof clientCandidateSourcePath === "string" && clientCandidateSourcePath.trim().length > 0;
  const hasMatterCandidatePath = typeof matterCandidateSourcePath === "string" && matterCandidateSourcePath.trim().length > 0;
  if (hasClientCandidatePath !== hasMatterCandidatePath) {
    throw new DesktopPrivateDataBoundaryError("conflicting_candidate_source_authority", ".");
  }

  const rosterPath = path.resolve(rosterSourcePath);
  const contactPath = hasContactPath ? path.resolve(contactSourcePath) : null;
  const registrationPath = path.resolve(registrationSeedSourcePath);
  const photosPath = path.resolve(photoSourcePath);
  const clientCandidatePath = hasClientCandidatePath ? path.resolve(clientCandidateSourcePath) : null;
  const matterCandidatePath = hasMatterCandidatePath ? path.resolve(matterCandidateSourcePath) : null;
  const [roster, contact, registrationSeed, photoFiles, clientCandidateModule, matterCandidateModule] = await Promise.all([
    readProtectedJson(rosterPath, "roster"),
    contactPath ? readProtectedJson(contactPath, "contact") : null,
    readProtectedJson(registrationPath, "registration_seed"),
    filesUnder(photosPath),
    clientCandidatePath ? readCandidateModule(clientCandidatePath, "client_candidate") : null,
    matterCandidatePath ? readCandidateModule(matterCandidatePath, "matter_candidate") : null,
  ]);
  if (photoFiles.length === 0) throw new DesktopPrivateDataBoundaryError("empty_protected_photo_source", photosPath);

  const byKind = {
    roster_protected_value: new Map(),
    contact_protected_value: new Map(),
    registration_seed_protected_value: new Map(),
    credential_protected_value: new Map(),
    client_candidate_protected_value: new Map(),
    matter_client_candidate_protected_value: new Map(),
    matter_candidate_protected_value: new Map(),
  };
  collectProtectedValues(roster, "roster", byKind.roster_protected_value, byKind.credential_protected_value, { runtimeSafeOnly });
  if (contact) collectProtectedValues(contact, "contact", byKind.contact_protected_value, byKind.credential_protected_value, { runtimeSafeOnly });
  collectProtectedValues(
    registrationSeed,
    "registration_seed",
    byKind.registration_seed_protected_value,
    byKind.credential_protected_value,
    { runtimeSafeOnly },
  );
  let clientCandidateRecordCount = 0;
  let matterClientCandidateRecordCount = 0;
  let matterCandidateRecordCount = 0;
  if (clientCandidateModule && matterCandidateModule) {
    const clientCandidates = clientCandidateModule.AMIC_CURRENT_CLIENT_CANDIDATES;
    const matterClients = matterCandidateModule.AMIC_CURRENT_MATTER_CLIENTS;
    const matterCandidates = matterCandidateModule.AMIC_CURRENT_MATTER_CODE_CANDIDATES;
    if (!Array.isArray(clientCandidates) || clientCandidates.length !== 99) {
      throw new DesktopPrivateDataBoundaryError("invalid_client_candidate_corpus", clientCandidatePath);
    }
    if (!Array.isArray(matterClients) || matterClients.length !== 99) {
      throw new DesktopPrivateDataBoundaryError("invalid_matter_client_candidate_corpus", matterCandidatePath);
    }
    if (!Array.isArray(matterCandidates) || matterCandidates.length !== 148) {
      throw new DesktopPrivateDataBoundaryError("invalid_matter_candidate_corpus", matterCandidatePath);
    }
    addCandidateLeaves(byKind.client_candidate_protected_value, clientCandidates);
    addCandidateLeaves(byKind.matter_client_candidate_protected_value, matterClients);
    addCandidateLeaves(byKind.matter_candidate_protected_value, matterCandidates);
    clientCandidateRecordCount = clientCandidates.length;
    matterClientCandidateRecordCount = matterClients.length;
    matterCandidateRecordCount = matterCandidates.length;
  }
  if (byKind.roster_protected_value.size === 0) {
    throw new DesktopPrivateDataBoundaryError("empty_roster_protected_value_corpus", rosterPath);
  }
  if (contactPath && byKind.contact_protected_value.size === 0) {
    throw new DesktopPrivateDataBoundaryError("empty_contact_protected_value_corpus", contactPath);
  }
  if (byKind.registration_seed_protected_value.size + byKind.credential_protected_value.size === 0) {
    throw new DesktopPrivateDataBoundaryError("empty_registration_seed_protected_value_corpus", registrationPath);
  }

  const needles = Object.entries(byKind).flatMap(([kind, values]) =>
    [...values.values()].map((bytes) => Object.freeze({ kind, bytes })));
  const photoHashes = new Set(await Promise.all(photoFiles.map(sha256File)));
  const corpus = {
    protected_value_count: needles.length,
    protected_photo_count: photoHashes.size,
    contact_corpus_status: contactPath ? "loaded" : "not_applicable",
    contact_protected_value_count: byKind.contact_protected_value.size,
    candidate_corpus_status: clientCandidateModule && matterCandidateModule ? "loaded" : "not_configured",
    client_candidate_record_count: clientCandidateRecordCount,
    matter_client_candidate_record_count: matterClientCandidateRecordCount,
    matter_candidate_record_count: matterCandidateRecordCount,
    client_candidate_protected_value_count: byKind.client_candidate_protected_value.size,
    matter_client_candidate_protected_value_count: byKind.matter_client_candidate_protected_value.size,
    matter_candidate_protected_value_count: byKind.matter_candidate_protected_value.size,
  };
  Object.defineProperties(corpus, {
    [CORPUS_NEEDLES]: { value: Object.freeze(needles), enumerable: false },
    [CORPUS_PHOTO_HASHES]: { value: photoHashes, enumerable: false },
  });
  return Object.freeze(corpus);
}

export function desktopPrivateDataCorpusNeedles(corpus) {
  return corpus?.[CORPUS_NEEDLES] ?? null;
}

export function desktopPrivateDataCorpusPhotoHashes(corpus) {
  return corpus?.[CORPUS_PHOTO_HASHES] ?? null;
}

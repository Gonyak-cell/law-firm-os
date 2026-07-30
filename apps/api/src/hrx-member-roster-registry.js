import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const packagedRosterPath = join(__dirname, "hrx-member-roster-source-of-truth.json");
const packagedContactPath = join(__dirname, "hrx-member-contact-source-of-truth.json");
const packagedPhotoSourcePath = join(__dirname, "hrx-member-photos");
const packagedProfessionalProfileCatalogPath = join(__dirname, "hrx-public-professional-profile-catalog.json");
const configuredRosterSourcePath = String(process.env.LAWOS_HRX_MEMBER_ROSTER_SOURCE_PATH ?? "").trim();
const configuredContactSourcePath = String(process.env.LAWOS_HRX_MEMBER_CONTACT_SOURCE_PATH ?? "").trim();
const configuredPhotoSourcePath = String(process.env.LAWOS_HRX_MEMBER_PHOTO_SOURCE_PATH ?? "").trim();
const configuredRosterPath = configuredRosterSourcePath ? resolve(process.cwd(), configuredRosterSourcePath) : null;
const contactSourcePath = configuredContactSourcePath ? resolve(process.cwd(), configuredContactSourcePath) : null;
const photoSourcePath = configuredPhotoSourcePath ? resolve(process.cwd(), configuredPhotoSourcePath) : null;
const repoRosterPath = resolve(
  __dirname,
  "../../../docs/reorganization/client-matter-os/matter-vault-r4/launch/hrx-member-roster-source-of-truth.json",
);

export const HRX_MEMBER_ROSTER_SOURCE_REF = "hrx-member-roster-source-of-truth";
export const HRX_MEMBER_ROSTER_SOURCE_PATH = configuredRosterPath ?? (
  existsSync(packagedRosterPath) ? packagedRosterPath : existsSync(repoRosterPath) ? repoRosterPath : null
);
export const HRX_MEMBER_CONTACT_SOURCE_PATH = contactSourcePath ?? (existsSync(packagedContactPath) ? packagedContactPath : null);
export const HRX_MEMBER_PHOTO_SOURCE_PATH = photoSourcePath ?? (existsSync(packagedPhotoSourcePath) ? packagedPhotoSourcePath : null);
export const HRX_PUBLIC_PROFESSIONAL_PROFILE_SOURCE_REF = "hrx-public-professional-profile-catalog";

const SAFE_MEMBER_PHOTO_REF = /^[A-Za-z0-9_-]{1,128}$/u;
const OPAQUE_EMPLOYEE_REF = /^[a-f0-9]{64}$/u;

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

export const HRX_MEMBER_ROSTER_SOURCE_OF_TRUTH = deepFreeze(
  HRX_MEMBER_ROSTER_SOURCE_PATH
    ? JSON.parse(readFileSync(HRX_MEMBER_ROSTER_SOURCE_PATH, "utf8"))
    : {
        schema_version: "law-firm-os.hrx-member-roster-source-of-truth.v0.1",
        tenant_id: "",
        source_ref: "private-runtime-source-not-configured",
        members: [],
      },
);

function stringField(record, key) {
  const value = record?.[key];
  return typeof value === "string" ? value.trim() : "";
}

function objectField(record, key) {
  const value = record?.[key];
  return value && typeof value === "object" && !Array.isArray(value) ? value : null;
}

function readContactSource(path) {
  if (!path) {
    return {
      schema_version: "law-firm-os.hrx-member-contact-source-of-truth.v0.1",
      source_ref: "private-runtime-source-not-configured",
      contacts: [],
    };
  }
  if (!existsSync(path)) throw new Error("Configured HRX member contact source does not exist");
  const source = JSON.parse(readFileSync(path, "utf8"));
  if (!source || typeof source !== "object" || !Array.isArray(source.contacts)) {
    throw new TypeError("Configured HRX member contact source must contain a contacts array");
  }
  const seenEmails = new Set();
  for (const [index, contact] of source.contacts.entries()) {
    const workEmail = stringField(contact, "work_email").toLowerCase();
    const mobilePhone = stringField(contact, "mobile_phone");
    if (!workEmail || !mobilePhone) throw new TypeError(`Configured HRX member contact row ${index} is incomplete`);
    if (seenEmails.has(workEmail)) throw new TypeError(`Configured HRX member contact row ${index} duplicates work_email`);
    seenEmails.add(workEmail);
  }
  return source;
}

export const HRX_MEMBER_CONTACT_SOURCE_OF_TRUTH = deepFreeze(readContactSource(HRX_MEMBER_CONTACT_SOURCE_PATH));
export const HRX_MEMBER_ROSTER_TENANT_ID = HRX_MEMBER_ROSTER_SOURCE_OF_TRUTH.tenant_id;

function readPublicProfessionalProfileCatalog(path = packagedProfessionalProfileCatalogPath) {
  if (!existsSync(path)) {
    return {
      schema_version: "law-firm-os.hrx-public-professional-profile-catalog.v0.1",
      source_ref: "public-professional-profile-catalog-not-packaged",
      profiles: [],
    };
  }
  const source = JSON.parse(readFileSync(path, "utf8"));
  if (!source || typeof source !== "object" || !Array.isArray(source.profiles)) {
    throw new TypeError("Packaged HRX public professional profile catalog must contain a profiles array");
  }
  const allowedRowKeys = new Set(["employee_id", "employee_ref", "professional_profile"]);
  const allowedProfileKeys = new Set([
    "schema_version",
    "profile_kind",
    "public_role_labels",
    "practice_areas",
    "experience",
    "education",
    "qualifications",
  ]);
  const seenEmployeeRefs = new Set();
  for (const [index, row] of source.profiles.entries()) {
    if (Object.keys(row ?? {}).some((key) => !allowedRowKeys.has(key))) {
      throw new TypeError(`Packaged HRX public professional profile row ${index} contains a non-public field`);
    }
    const employeeId = stringField(row, "employee_id");
    const employeeRef = stringField(row, "employee_ref");
    const professionalProfile = objectField(row, "professional_profile");
    if ((!employeeId && !OPAQUE_EMPLOYEE_REF.test(employeeRef))
      || (employeeId && employeeRef)
      || !professionalProfile) {
      throw new TypeError(`Packaged HRX public professional profile row ${index} is incomplete`);
    }
    if (Object.keys(professionalProfile).some((key) => !allowedProfileKeys.has(key))) {
      throw new TypeError(`Packaged HRX public professional profile row ${index} contains a non-public profile field`);
    }
    const joinRef = employeeId || employeeRef;
    if (seenEmployeeRefs.has(joinRef)) {
      throw new TypeError(`Packaged HRX public professional profile row ${index} duplicates employee reference`);
    }
    seenEmployeeRefs.add(joinRef);
  }
  return source;
}

export const HRX_PUBLIC_PROFESSIONAL_PROFILE_CATALOG = deepFreeze(readPublicProfessionalProfileCatalog());

function mobilePhoneByEmail(contactSource) {
  return new Map(
    (contactSource?.contacts ?? []).map((contact) => [
      stringField(contact, "work_email").toLowerCase(),
      stringField(contact, "mobile_phone"),
    ]),
  );
}

function memberRosterPublicRef(member, contactByEmail) {
  const workEmail = stringField(member, "work_email");
  return Object.freeze({
    user_id: stringField(member, "user_id"),
    employee_id: stringField(member, "employee_id"),
    display_name: stringField(member, "display_name"),
    legal_name: stringField(member, "legal_name"),
    work_email: workEmail,
    mobile_phone: contactByEmail.get(workEmail.toLowerCase()) ?? "",
    title: stringField(member, "title"),
    employment_type: stringField(member, "employment_type") || "full_time",
    start_date: stringField(member, "start_date"),
    status: stringField(member, "status") || "active",
    profile_status: stringField(member, "profile_status") || "active",
    affiliation: stringField(member, "affiliation"),
    department: stringField(member, "department"),
    organization_group: stringField(member, "organization_group"),
    org_unit_id: stringField(member, "org_unit_id"),
    manager_employee_id: stringField(member, "manager_employee_id") || null,
    country: stringField(member, "country") || "대한민국",
    professional_profile: objectField(member, "professional_profile"),
    source_ref: HRX_MEMBER_ROSTER_SOURCE_REF,
  });
}

export function listHrxMemberRosterRows(
  seed = HRX_MEMBER_ROSTER_SOURCE_OF_TRUTH,
  contactSource = HRX_MEMBER_CONTACT_SOURCE_OF_TRUTH,
) {
  const contactByEmail = mobilePhoneByEmail(contactSource);
  return Object.freeze((seed.members ?? []).map((member) => memberRosterPublicRef(member, contactByEmail)));
}

export function findHrxMemberRosterByUserId(userId, seed = HRX_MEMBER_ROSTER_SOURCE_OF_TRUTH) {
  const normalized = String(userId ?? "").trim();
  return listHrxMemberRosterRows(seed).find((member) => member.user_id === normalized) ?? null;
}

export function findHrxMemberRosterByEmployeeId(employeeId, seed = HRX_MEMBER_ROSTER_SOURCE_OF_TRUTH) {
  const normalized = String(employeeId ?? "").trim();
  return listHrxMemberRosterRows(seed).find((member) => member.employee_id === normalized) ?? null;
}

export function findHrxPublicProfessionalProfileByEmployeeId(
  employeeId,
  seed = HRX_PUBLIC_PROFESSIONAL_PROFILE_CATALOG,
) {
  const normalized = String(employeeId ?? "").trim();
  if (!normalized) return null;
  const opaqueRef = createHash("sha256").update(normalized).digest("hex");
  const row = (seed.profiles ?? []).find((profile) =>
    stringField(profile, "employee_id") === normalized
    || stringField(profile, "employee_ref") === opaqueRef);
  if (!row) return null;
  return Object.freeze({
    employee_id: normalized,
    professional_profile: objectField(row, "professional_profile"),
    source_ref: HRX_PUBLIC_PROFESSIONAL_PROFILE_SOURCE_REF,
  });
}

export function memberPhotoDataUrlForEmployeeId(employeeId, sourcePath = HRX_MEMBER_PHOTO_SOURCE_PATH) {
  const normalized = String(employeeId ?? "").trim();
  if (!sourcePath || !SAFE_MEMBER_PHOTO_REF.test(normalized)) return null;
  const fileName = `${createHash("sha256").update(normalized).digest("hex")}.png`;
  const filePath = join(sourcePath, fileName);
  if (!existsSync(filePath)) return null;
  return `data:image/png;base64,${readFileSync(filePath).toString("base64")}`;
}

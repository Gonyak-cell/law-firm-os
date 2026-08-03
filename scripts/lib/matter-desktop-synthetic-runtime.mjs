import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { buildPrivateStagingSyntheticSources } from "./private-staging-artifact.mjs";

const MATTER_DESKTOP_SYNTHETIC_RUNTIME_SCHEMA = "law-firm-os.matter-desktop-synthetic-runtime.v1";

const FIXTURE_ID = "matter-desktop-internal-qa-10";
const TENANT_ID = "tenant_lawos_staging_cut007_a";
const GENERATED_AT = "2026-07-31T00:00:00.000Z";
const ACCOUNT_COUNT = 10;
const REAL_IDENTITY_MARKER = /@amic\.(?:kr|law)|\b(?:user|emp)_amic_[a-z0-9_]+\b/iu;
const GENERIC_PNG_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function genericPngBytes() {
  return Buffer.from(GENERIC_PNG_BASE64, "base64");
}

const GENERIC_PNG_BYTE_SIZE = genericPngBytes().byteLength;
const GENERIC_PNG_SHA256 = sha256(genericPngBytes());

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value) || Buffer.isBuffer(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}

function jsonBytes(value) {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function buildAccountManifest() {
  return {
    schema_version: "law-firm-os.private-staging.synthetic-account-directory.v1",
    data_scope: "synthetic-only",
    real_identity_count: 0,
    accounts_approved: true,
    tenant_id: TENANT_ID,
    accounts: Array.from({ length: ACCOUNT_COUNT }, (_, index) => {
      const ordinal = String(index + 1).padStart(2, "0");
      const suffix = `desktop-qa-${ordinal}`;
      const isAdministrator = index === 0;
      return {
        user_id: `synthetic-lawos-staging-${suffix}`,
        employee_id: `emp-lawos-staging-${suffix}`,
        email: `lawos-staging-${suffix}@example.invalid`,
        display_name: `LawOS Staging Pilot DESKTOP-QA-${ordinal}`,
        account_status: index === ACCOUNT_COUNT - 1 ? "disabled" : "active",
        role_ids: isAdministrator
          ? ["firm_admin", "matter_vault_admin", "matter_vault_user"]
          : ["attorney", "matter_vault_user"],
      };
    }),
  };
}

function syntheticContactSource(roster) {
  return {
    schema_version: "law-firm-os.hrx-member-contact-source-of-truth.v0.1",
    created_at: GENERATED_AT,
    status: "registered-synthetic-desktop-internal-qa-source",
    tenant_id: TENANT_ID,
    source_ref: "matter-desktop-internal-qa-synthetic",
    synthetic_only: true,
    change_control: {
      default_persistence: "synthetic-staging-only",
      implicit_regeneration_allowed: false,
      external_identity_account_creation: false,
      passwords_or_real_tokens_included: false,
      real_contact_values_included: false,
    },
    contacts: roster.members.map((member, index) => ({
      user_id: member.user_id,
      employee_id: member.employee_id,
      display_name: member.display_name,
      work_email: member.work_email,
      mobile_phone: `+1-202-555-${String(index + 101).padStart(4, "0")}`,
      source_ref: "matter-desktop-internal-qa-synthetic",
      synthetic_only: true,
    })),
  };
}

function assertNoRealIdentityMarkers(value) {
  if (REAL_IDENTITY_MARKER.test(JSON.stringify(value))) {
    throw new Error("desktop synthetic runtime fixture contains a real identity marker");
  }
}

export function createMatterDesktopSyntheticRuntimeFixture() {
  const sources = buildPrivateStagingSyntheticSources(buildAccountManifest());
  const employeeByUserId = new Map(sources.roster.members.map((member) => [member.user_id, member]));
  const accountSeed = {
    ...sources.account_seed,
    created_at: GENERATED_AT,
    source: {
      ...sources.account_seed.source,
      kind: "matter-desktop-internal-qa-synthetic",
      account_count: ACCOUNT_COUNT,
    },
    registration_boundary: {
      ...sources.account_seed.registration_boundary,
      local_dev_synthetic_tokens_only: true,
      passwords_or_real_tokens_included: false,
    },
    users: sources.account_seed.users.map((user) => {
      const member = employeeByUserId.get(user.user_id);
      if (!member) throw new Error(`synthetic account has no roster employee: ${user.user_id}`);
      return {
        ...user,
        employee_id: member.employee_id,
        local_dev: {
          ...user.local_dev,
          synthetic_only: true,
          synthetic_token: user.status === "active" ? `local-dev-only:${user.email}` : null,
        },
      };
    }),
  };
  const contact = syntheticContactSource(sources.roster);
  const photos = sources.roster.members.map((member) => {
    const employeeIdSha256 = sha256(member.employee_id);
    return {
      employee_id: member.employee_id,
      employee_id_sha256: employeeIdSha256,
      file_name: `${employeeIdSha256}.png`,
      relative_path: `apps/api/src/hrx-member-photos/${employeeIdSha256}.png`,
      content_type: "image/png",
      byte_size: GENERIC_PNG_BYTE_SIZE,
      sha256: GENERIC_PNG_SHA256,
    };
  });
  const fixture = {
    schema_version: MATTER_DESKTOP_SYNTHETIC_RUNTIME_SCHEMA,
    fixture_id: FIXTURE_ID,
    generated_at: GENERATED_AT,
    data_scope: "synthetic-only",
    tenant_id: TENANT_ID,
    account_seed: accountSeed,
    roster: sources.roster,
    contact,
    photos,
    safe_counts: {
      account_count: ACCOUNT_COUNT,
      user_count: ACCOUNT_COUNT,
      employee_count: ACCOUNT_COUNT,
      contact_count: ACCOUNT_COUNT,
      photo_count: ACCOUNT_COUNT,
      active_account_count: accountSeed.users.filter((user) => user.status === "active").length,
      disabled_account_count: accountSeed.users.filter((user) => user.status === "disabled").length,
      real_identity_count: 0,
    },
  };
  assertNoRealIdentityMarkers(fixture);
  return deepFreeze(fixture);
}

export async function materializeMatterDesktopSyntheticRuntimeFixture(options = {}) {
  if (!options || typeof options !== "object" || Array.isArray(options)) {
    throw new TypeError("materializer options are required");
  }
  const unsupportedKeys = Object.keys(options).filter((key) => key !== "targetRoot");
  if (unsupportedKeys.length) {
    throw new TypeError("materializer accepts only targetRoot; external fixture data is not accepted");
  }
  const { targetRoot } = options;
  if (typeof targetRoot !== "string" || !targetRoot.trim()) throw new TypeError("targetRoot is required");
  const value = createMatterDesktopSyntheticRuntimeFixture();

  const root = resolve(targetRoot);
  const apiSourceRoot = join(root, "apps", "api", "src");
  const rosterPath = join(apiSourceRoot, "hrx-member-roster-source-of-truth.json");
  const contactPath = join(apiSourceRoot, "hrx-member-contact-source-of-truth.json");
  const photosPath = join(apiSourceRoot, "hrx-member-photos");
  const registrationSeedPath = join(apiSourceRoot, "matter-vault-user-registration-seed.json");
  await mkdir(apiSourceRoot, { recursive: true });
  const files = [];
  for (const [path, content] of [
    [rosterPath, jsonBytes(value.roster)],
    [contactPath, jsonBytes(value.contact)],
    [registrationSeedPath, jsonBytes(value.account_seed)],
  ]) {
    await writeFile(path, content);
    const written = await readFile(path);
    files.push({ path, bytes: written.byteLength, sha256: sha256(written) });
  }
  await rm(photosPath, { recursive: true, force: true });
  await mkdir(photosPath, { recursive: true });
  for (const member of value.roster.members) {
    const employeeIdSha256 = sha256(member.employee_id);
    const fileName = `${employeeIdSha256}.png`;
    const path = join(photosPath, fileName);
    await writeFile(path, genericPngBytes());
    const written = await readFile(path);
    files.push({
      path,
      employee_id: member.employee_id,
      file_name: fileName,
      content_type: "image/png",
      bytes: written.byteLength,
      sha256: sha256(written),
    });
  }
  files.sort((left, right) => left.path.localeCompare(right.path));
  return deepFreeze({
    schema_version: MATTER_DESKTOP_SYNTHETIC_RUNTIME_SCHEMA,
    fixture_id: value.fixture_id,
    targetRoot: root,
    rosterPath,
    contactPath,
    photosPath,
    registrationSeedPath,
    files,
    safe_counts: value.safe_counts,
  });
}

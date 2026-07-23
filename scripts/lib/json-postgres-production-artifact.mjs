import {
  parsePrivateStagingGitTree,
  privateStagingArtifactSourcePathAllowed,
} from "./private-staging-artifact.mjs";

const FORBIDDEN_ARCHIVE_ENTRY =
  /(^|\/)(\.env(?:\.|$)|\.git|artifacts|workbook)(\/|$)|\.(?:pem|key|p12|pfx|sqlite|sqlite3|db)$/iu;
const FIRST_PARTY_TEST_ENTRY = /(^|\/)(?:test|tests|__tests__)(\/|$)/iu;
const REAL_IDENTITY_MARKER =
  /@amic\.(?:kr|law)|\b(?:user|emp)_amic_[a-z0-9_]+\b/iu;
const PRIVATE_STAGING_SOURCE = /(^|\/)(?:private-staging[^/]*|[^/]*private-staging[^/]*)(?:\/|$)/iu;
const SHA256 = /^[a-f0-9]{64}$/u;

export const JSON_POSTGRES_PRODUCTION_ARTIFACT_SCHEMA =
  "law-firm-os.json-postgres-production-artifact.v1";

export const JSON_POSTGRES_PRODUCTION_SOURCE_OVERRIDES = Object.freeze([
  Object.freeze({
    source_path: "packages/master-data/src/production-client-candidates.js",
    target_path: "packages/master-data/src/amic-client-candidates.js",
    purpose: "real-clients-loaded-from-approved-postgres-migration-only",
  }),
  Object.freeze({
    source_path: "apps/api/src/production-lawos-role-registry.js",
    target_path: "apps/api/src/lawos-role-registry.js",
    purpose: "roles-loaded-from-postgres-identity-membership-only",
  }),
]);

export const JSON_POSTGRES_PRODUCTION_REDACTION_TARGETS = Object.freeze([
  "apps/api/src/hrx-member-roster-registry.js",
  "apps/api/src/lambda.js",
  "apps/api/src/outlook-addin-runtime-context.js",
  "packages/matter/src/worktree-template-model.js",
]);

function requiredText(value, name) {
  const text = String(value ?? "").trim();
  if (!text) throw new TypeError(`${name} is required`);
  return text;
}

export function emptyJsonPostgresProductionSources() {
  return Object.freeze({
    account_seed: Object.freeze({
      schema_version: "law-firm-os.matter-vault-user-registration-seed.v0.1",
      created_at: "1970-01-01T00:00:00.000Z",
      status: "production-postgres-directory-only",
      tenant_id: "",
      source: Object.freeze({ kind: "postgres-v2-account-directory", account_count: 0 }),
      registration_boundary: Object.freeze({
        external_identity_account_creation: false,
        passwords_or_real_tokens_included: false,
        operator_approval_required_for_production_invites: true,
      }),
      highest_privilege_account: null,
      users: Object.freeze([]),
    }),
    roster: Object.freeze({
      schema_version: "law-firm-os.hrx-member-roster-source-of-truth.v0.1",
      created_at: "1970-01-01T00:00:00.000Z",
      status: "production-postgres-directory-only",
      tenant_id: "",
      source_ref: "postgres-v2-hrx-records",
      change_control: Object.freeze({
        default_persistence: "postgres-v2",
        implicit_regeneration_allowed: false,
        passwords_or_real_tokens_included: false,
      }),
      members: Object.freeze([]),
    }),
  });
}

export function productionArtifactSourcePathAllowed(path) {
  const normalized = String(path ?? "").replaceAll("\\", "/").replace(/^\.\//u, "");
  return privateStagingArtifactSourcePathAllowed(normalized)
    && !PRIVATE_STAGING_SOURCE.test(normalized);
}

export function parseJsonPostgresProductionGitTree(value) {
  return Object.freeze(
    parsePrivateStagingGitTree(value)
      .filter((entry) => productionArtifactSourcePathAllowed(entry.path)),
  );
}

export function redactJsonPostgresProductionRuntimeSource({ targetPath, text } = {}) {
  const path = requiredText(targetPath, "production redaction target");
  if (!JSON_POSTGRES_PRODUCTION_REDACTION_TARGETS.includes(path)) {
    throw new TypeError(`unsupported production redaction target: ${path}`);
  }
  let output = String(text ?? "");
  if (path === "apps/api/src/hrx-member-roster-registry.js") {
    output = output.replace(
      /const MEMBER_PHOTO_FILE_BY_EMPLOYEE_ID = new Map\(\[[\s\S]*?\]\);/u,
      "const MEMBER_PHOTO_FILE_BY_EMPLOYEE_ID = new Map();",
    );
  } else if (path === "apps/api/src/lambda.js") {
    let employeeIndex = 0;
    const employeeIds = new Map();
    output = output
      .replace(/\b[A-Z0-9._%+-]+@amic\.kr\b/giu, "redacted-production-user@production.invalid")
      .replace(/\buser_amic_[a-z0-9_]+\b/giu, "user_production_redacted")
      .replace(/\bemp_amic_[a-z0-9_]+\b/giu, (source) => {
        if (!employeeIds.has(source)) {
          employeeIndex += 1;
          employeeIds.set(source, `employee_production_redacted_${employeeIndex}`);
        }
        return employeeIds.get(source);
      })
      .replaceAll("assumed-role/lawos-private-staging-api-role/", "assumed-role/lawos-production-api-role/");
  } else if (path === "apps/api/src/outlook-addin-runtime-context.js") {
    output = output.replaceAll("@amic.law", "@production.invalid");
  } else if (path === "packages/matter/src/worktree-template-model.js") {
    output = output.replace(/\b[A-Z0-9._%+-]+@amic\.kr\b/giu, "redacted-production-user@production.invalid");
  }
  if (output === text) throw new Error(`production source redaction made no change: ${path}`);
  if (REAL_IDENTITY_MARKER.test(output)) {
    throw new Error(`production source redaction left a real identity marker: ${path}`);
  }
  return Object.freeze({
    target_path: path,
    purpose: "remove-real-identity-source-markers-from-deployment-code",
    text: output,
    byte_size: Buffer.byteLength(output),
  });
}

export function validateJsonPostgresProductionSourceBoundary(entries = []) {
  const violations = entries
    .filter((entry) => REAL_IDENTITY_MARKER.test(String(entry?.text ?? "")))
    .map((entry) => requiredText(entry.path, "production source path"));
  if (violations.length) {
    throw new Error(`production artifact source contains real identity markers: ${violations.slice(0, 5).join(", ")}`);
  }
  return Object.freeze({
    scanned_source_count: entries.length,
    real_identity_marker_count: 0,
  });
}

export function validateJsonPostgresProductionSourceOverrides(overrides) {
  if (!Array.isArray(overrides)
    || overrides.length !== JSON_POSTGRES_PRODUCTION_SOURCE_OVERRIDES.length) {
    throw new Error("production source override set is incomplete");
  }
  const expected = new Map(
    JSON_POSTGRES_PRODUCTION_SOURCE_OVERRIDES.map((entry) => [entry.target_path, entry]),
  );
  for (const override of overrides) {
    const contract = expected.get(override?.target_path);
    if (!contract
      || override.source_path !== contract.source_path
      || override.purpose !== contract.purpose
      || !SHA256.test(String(override.sha256 ?? ""))
      || !Number.isSafeInteger(override.byte_size)
      || override.byte_size < 1) {
      throw new Error("production source override binding is invalid");
    }
    const text = String(override.text ?? "");
    if (Buffer.byteLength(text) !== override.byte_size || REAL_IDENTITY_MARKER.test(text)) {
      throw new Error("production source override contains real identity material");
    }
    if (override.target_path.endsWith("amic-client-candidates.js")
      && !/AMIC_CURRENT_CLIENT_CANDIDATES\s*=\s*Object\.freeze\(\[\]\)/u.test(text)) {
      throw new Error("production client candidate source must be empty");
    }
    if (override.target_path.endsWith("lawos-role-registry.js")
      && (!text.includes('LAWOS_ROLE_REGISTRY_SOURCE = "postgres-v2-account-membership"')
        || !text.includes("LAWOS_INTERNAL_ROLE_ASSIGNMENTS = Object.freeze([])"))) {
      throw new Error("production role source must use PostgreSQL membership only");
    }
    expected.delete(override.target_path);
  }
  if (expected.size) throw new Error("production source override target is missing");
  return Object.freeze({
    override_count: overrides.length,
    packaged_real_client_count: 0,
    packaged_static_role_assignment_count: 0,
  });
}

export function validateJsonPostgresProductionArtifactEntries(entries) {
  const raw = entries.map((entry) => String(entry).replace(/^\.\//u, ""));
  if (raw.some((entry) =>
    !entry
    || entry.includes("\\")
    || entry.startsWith("/")
    || entry.split("/").includes(".."))) {
    throw new Error("production artifact contains an unsafe archive path");
  }
  if (new Set(raw).size !== raw.length) throw new Error("production artifact contains a duplicate entry");
  const normalized = [...raw].sort();
  const required = [
    "apps/api/src/lambda.js",
    "apps/api/src/json-postgres-program-admin-lambda.js",
    "apps/api/src/immutable-program-input.js",
    "apps/api/src/matter-vault-user-registration-seed.json",
    "apps/api/src/hrx-member-roster-source-of-truth.json",
    "certs/global-bundle.pem",
    "deployment-manifest.json",
    "package.json",
    "packages/dms/src/json-postgres-dms-migration.js",
    "packages/persistence/src/postgres/execution-contract.js",
    "packages/persistence/src/postgres/migration-runner.js",
    "packages/persistence/src/postgres/program-receipt.js",
  ];
  for (const path of required) {
    if (!normalized.includes(path)) throw new Error(`production artifact is missing ${path}`);
  }
  const forbidden = normalized.filter((entry) =>
    (entry !== "certs/global-bundle.pem" && FORBIDDEN_ARCHIVE_ENTRY.test(entry))
    || (!entry.startsWith("node_modules/") && FIRST_PARTY_TEST_ENTRY.test(entry))
    || entry.startsWith("infra/")
    || entry.startsWith("scripts/")
    || PRIVATE_STAGING_SOURCE.test(entry));
  if (forbidden.length) {
    throw new Error(`production artifact contains forbidden entries: ${forbidden.slice(0, 5).join(", ")}`);
  }
  const runtimeStores = normalized.filter((entry) =>
    /(^|\/)(?:runtime-stores?|runtime_store|store-data)(\/|$)/iu.test(entry)
    || /(?:^|\/)(?:hrx|master-data|matter|dms|crm|intake|finance|analytics|portal|auth)-(?:store|runtime)\.json$/iu.test(entry));
  if (runtimeStores.length) throw new Error("production artifact contains a legacy runtime store");
  return Object.freeze({
    entry_count: normalized.length,
    forbidden_entry_count: 0,
    runtime_store_entry_count: 0,
    real_json_store_count: 0,
    private_staging_entry_count: 0,
  });
}

export function validateJsonPostgresProductionDeploymentManifest(manifest) {
  if (manifest?.schema_version !== JSON_POSTGRES_PRODUCTION_ARTIFACT_SCHEMA
    || manifest?.data_scope !== "approved-immutable-inputs-only"
    || manifest?.operational_authority !== "postgres-v2"
    || manifest?.json_fallback !== false
    || manifest?.json_writer !== false
    || manifest?.dual_write !== false
    || manifest?.file_current_authority !== false
    || manifest?.offline_mutation !== false
    || manifest?.memory_fallback !== false
    || manifest?.packaged_real_identity_count !== 0
    || manifest?.packaged_real_client_count !== 0
    || manifest?.packaged_static_role_assignment_count !== 0
    || manifest?.secrets_in_environment !== false
    || manifest?.production_ready_claim !== false) {
    throw new Error("production deployment manifest authority boundary drifted");
  }
  return Object.freeze({
    verdict: "PASS",
    data_scope: manifest.data_scope,
    operational_authority: manifest.operational_authority,
    legacy_authority_counter_total: 0,
  });
}

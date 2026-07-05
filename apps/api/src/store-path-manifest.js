import { tmpdir } from "node:os";
import { isAbsolute, relative, resolve } from "node:path";
import { LAWOS_RUNTIME_PROFILES, resolveRuntimeProfile } from "./runtime-profile.js";

export const STORE_PATH_MANIFEST = Object.freeze([
  Object.freeze({
    key: "hrxStorePath",
    env: "LAWOS_HRX_STORE_PATH",
    fileName: "hrx-store.json",
    bounded_context: "hrx",
    required: true,
  }),
  Object.freeze({
    key: "masterDataStorePath",
    env: "LAWOS_MASTER_DATA_STORE_PATH",
    fileName: "master-data-store.json",
    bounded_context: "master-data",
    required: true,
  }),
  Object.freeze({
    key: "matterStorePath",
    env: "LAWOS_MATTER_STORE_PATH",
    fileName: "matter-store.json",
    bounded_context: "matter",
    required: true,
  }),
  Object.freeze({
    key: "dmsStorePath",
    env: "LAWOS_DMS_STORE_PATH",
    fileName: "dms-store.json",
    bounded_context: "vault-dms",
    required: true,
  }),
  Object.freeze({
    key: "crmStorePath",
    env: "LAWOS_CRM_STORE_PATH",
    fileName: "crm-store.json",
    bounded_context: "crm",
    required: true,
  }),
  Object.freeze({
    key: "intakeStorePath",
    env: "LAWOS_INTAKE_STORE_PATH",
    fileName: "intake-store.json",
    bounded_context: "intake",
    required: true,
  }),
  Object.freeze({
    key: "crmMasterDataStorePath",
    env: "LAWOS_CRM_MASTER_DATA_STORE_PATH",
    fileName: "crm-master-data-store.json",
    bounded_context: "crm-master-data",
    required: true,
  }),
  Object.freeze({
    key: "financeStorePath",
    env: "LAWOS_FINANCE_STORE_PATH",
    fileName: "finance-store.json",
    bounded_context: "finance",
    required: true,
  }),
  Object.freeze({
    key: "analyticsStorePath",
    env: "LAWOS_ANALYTICS_STORE_PATH",
    fileName: "analytics-store.json",
    bounded_context: "analytics",
    required: true,
  }),
  Object.freeze({
    key: "aiStorePath",
    env: "LAWOS_AI_STORE_PATH",
    fileName: "ai-store.json",
    bounded_context: "ai-governance",
    required: true,
  }),
  Object.freeze({
    key: "portalStorePath",
    env: "LAWOS_PORTAL_STORE_PATH",
    fileName: "portal-store.json",
    bounded_context: "client-portal",
    required: true,
  }),
  Object.freeze({
    key: "uiReadinessStorePath",
    env: "LAWOS_UI_READINESS_STORE_PATH",
    fileName: "ui-readiness-store.json",
    bounded_context: "ui-readiness",
    required: true,
  }),
  Object.freeze({
    key: "enterpriseReadinessStorePath",
    env: "LAWOS_ENTERPRISE_READINESS_STORE_PATH",
    fileName: "enterprise-readiness-store.json",
    bounded_context: "enterprise-readiness",
    required: true,
  }),
]);

export const DERIVED_STORE_PATH_MANIFEST = Object.freeze([
  Object.freeze({
    key: "dmsObjectStorePath",
    env: "LAWOS_DMS_OBJECT_STORE_PATH",
    derived_from: "dmsStorePath",
    suffix: ".objects",
    type: "directory",
    bounded_context: "vault-dms",
    required: false,
  }),
]);

export const STORE_PATH_PREFLIGHT_EXIT_CODE = 78;
export const STORE_ENV_CATALOG_PATH = "docs/runbooks/store-env-catalog.md";

export class StorePathPreflightError extends Error {
  constructor({ profile, missing = [], nonAbsolute = [], tmpdirPaths = [] } = {}) {
    const details = [];
    if (missing.length > 0) details.push(`missing durable store paths: ${missing.join(", ")}`);
    if (nonAbsolute.length > 0) details.push(`non-absolute store paths: ${nonAbsolute.join(", ")}`);
    if (tmpdirPaths.length > 0) details.push(`tmpdir store paths: ${tmpdirPaths.join(", ")}`);
    super(
      `LAWOS_STORE_PREFLIGHT_FAILED (profile=${profile}): refusing to listen; ${details.join("; ")}; ` +
        `set each required store to an absolute path on persistent storage, or use LAWOS_RUNTIME_PROFILE=local-dev for ephemeral synthetic stores. ` +
        `Catalog: ${STORE_ENV_CATALOG_PATH}`,
    );
    this.name = "StorePathPreflightError";
    this.code = "LAWOS_STORE_PREFLIGHT_FAILED";
    this.exitCode = STORE_PATH_PREFLIGHT_EXIT_CODE;
    this.profile = profile;
    this.missing = Object.freeze([...missing]);
    this.nonAbsolute = Object.freeze([...nonAbsolute]);
    this.tmpdirPaths = Object.freeze([...tmpdirPaths]);
  }
}

export function storePathManifestByKey() {
  return Object.freeze(Object.fromEntries(STORE_PATH_MANIFEST.map((entry) => [entry.key, entry])));
}

export function storePathManifestByEnv() {
  return Object.freeze(Object.fromEntries(STORE_PATH_MANIFEST.map((entry) => [entry.env, entry])));
}

function cleanPath(value) {
  const text = String(value ?? "").trim();
  return text || null;
}

function isInsideTmpdir(pathValue) {
  const resolvedTmpdir = resolve(tmpdir());
  const resolvedPath = resolve(pathValue);
  const rel = relative(resolvedTmpdir, resolvedPath);
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

export function resolveStorePathPreflight({
  env = process.env,
  profile = resolveRuntimeProfile(env),
  providedStorePaths = {},
} = {}) {
  const entries = STORE_PATH_MANIFEST.map((entry) => {
    const paramPath = cleanPath(providedStorePaths[entry.key]);
    const envPath = cleanPath(env[entry.env]);
    const path = paramPath ?? envPath;
    return Object.freeze({
      ...entry,
      path,
      source: paramPath ? "param" : envPath ? "env" : "ephemeral",
    });
  });
  const storePaths = Object.fromEntries(entries.filter((entry) => entry.path).map((entry) => [entry.key, entry.path]));
  const dmsObjectManifest = DERIVED_STORE_PATH_MANIFEST.find((entry) => entry.key === "dmsObjectStorePath");
  const explicitDmsObjectPath = cleanPath(providedStorePaths.dmsObjectStorePath) ?? cleanPath(env[dmsObjectManifest.env]);
  const dmsObjectStorePath = explicitDmsObjectPath ?? (storePaths.dmsStorePath ? `${storePaths.dmsStorePath}${dmsObjectManifest.suffix}` : null);
  if (dmsObjectStorePath) storePaths.dmsObjectStorePath = dmsObjectStorePath;

  const missing = [];
  const nonAbsolute = [];
  const tmpdirPaths = [];
  if (profile === LAWOS_RUNTIME_PROFILES.operational) {
    for (const entry of entries) {
      if (!entry.path) {
        missing.push(entry.env);
        continue;
      }
      if (!isAbsolute(entry.path)) nonAbsolute.push(`${entry.env}=${entry.path}`);
      else if (isInsideTmpdir(entry.path)) tmpdirPaths.push(`${entry.env}=${entry.path}`);
    }
    if (explicitDmsObjectPath && !isAbsolute(explicitDmsObjectPath)) {
      nonAbsolute.push(`${dmsObjectManifest.env}=${explicitDmsObjectPath}`);
    } else if (explicitDmsObjectPath && isInsideTmpdir(explicitDmsObjectPath)) {
      tmpdirPaths.push(`${dmsObjectManifest.env}=${explicitDmsObjectPath}`);
    }
  }

  return Object.freeze({
    ok: missing.length === 0 && nonAbsolute.length === 0 && tmpdirPaths.length === 0,
    profile,
    entries: Object.freeze(entries),
    derivedEntries: Object.freeze([
      Object.freeze({
        ...dmsObjectManifest,
        path: dmsObjectStorePath,
        source: explicitDmsObjectPath ? "param_or_env" : dmsObjectStorePath ? "derived" : "unresolved",
      }),
    ]),
    storePaths: Object.freeze(storePaths),
    missing: Object.freeze(missing),
    nonAbsolute: Object.freeze(nonAbsolute),
    tmpdirPaths: Object.freeze(tmpdirPaths),
  });
}

export function assertStorePathPreflight(options = {}) {
  const result = resolveStorePathPreflight(options);
  if (!result.ok) {
    throw new StorePathPreflightError({
      profile: result.profile,
      missing: result.missing,
      nonAbsolute: result.nonAbsolute,
      tmpdirPaths: result.tmpdirPaths,
    });
  }
  return result;
}

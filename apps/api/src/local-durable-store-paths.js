import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { DERIVED_STORE_PATH_MANIFEST, STORE_PATH_MANIFEST } from "./store-path-manifest.js";
import { LAWOS_RUNTIME_PROFILE_ENV, LAWOS_RUNTIME_PROFILES } from "./runtime-profile.js";

export const LAWOS_DURABLE_RUNTIME_HOME = join(
  homedir(),
  "Library",
  "Application Support",
  "LawFirmOS",
  "runtime-stores",
);

export const LAWOS_DURABLE_SESSION_SECRET_FILE = join(LAWOS_DURABLE_RUNTIME_HOME, "auth", "api-session-secret");

function ensureParent(filePath) {
  mkdirSync(dirname(filePath), { recursive: true });
}

export function lawosDurableStorePathOptions({ root = LAWOS_DURABLE_RUNTIME_HOME } = {}) {
  const paths = Object.fromEntries(STORE_PATH_MANIFEST.map((entry) => [entry.key, join(root, entry.fileName)]));
  const dmsObjectManifest = DERIVED_STORE_PATH_MANIFEST.find((entry) => entry.key === "dmsObjectStorePath");
  if (dmsObjectManifest) paths[dmsObjectManifest.key] = `${paths.dmsStorePath}${dmsObjectManifest.suffix}`;
  return Object.freeze(paths);
}

export function lawosDurableStoreEnv({ root = LAWOS_DURABLE_RUNTIME_HOME, includeSessionSecret = true } = {}) {
  const paths = lawosDurableStorePathOptions({ root });
  const env = {
    [LAWOS_RUNTIME_PROFILE_ENV]: LAWOS_RUNTIME_PROFILES.localDev,
  };
  for (const entry of STORE_PATH_MANIFEST) env[entry.env] = paths[entry.key];
  for (const entry of DERIVED_STORE_PATH_MANIFEST) {
    if (paths[entry.key]) env[entry.env] = paths[entry.key];
  }
  if (includeSessionSecret) env.LAWOS_API_SESSION_SECRET = readOrCreateLocalSessionSecret();
  return Object.freeze(env);
}

export function ensureLawosDurableStoreHome({ root = LAWOS_DURABLE_RUNTIME_HOME } = {}) {
  mkdirSync(root, { recursive: true });
  for (const filePath of Object.values(lawosDurableStorePathOptions({ root }))) {
    if (filePath.endsWith(".objects")) mkdirSync(filePath, { recursive: true });
    else ensureParent(filePath);
  }
  return root;
}

export function readOrCreateLocalSessionSecret({ filePath = LAWOS_DURABLE_SESSION_SECRET_FILE } = {}) {
  if (existsSync(filePath)) return readFileSync(filePath, "utf8").trim();
  ensureParent(filePath);
  const secret = randomBytes(48).toString("base64url");
  writeFileSync(filePath, `${secret}\n`, { mode: 0o600 });
  return secret;
}

export function shouldUseDurableLocalDefaults(env = process.env) {
  const value = env[LAWOS_RUNTIME_PROFILE_ENV];
  return value == null || String(value).trim() === "";
}

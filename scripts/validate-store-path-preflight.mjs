#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, statSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { startApiServer } from "../apps/api/src/server.js";
import {
  DERIVED_STORE_PATH_MANIFEST,
  STORE_ENV_CATALOG_PATH,
  STORE_PATH_MANIFEST,
} from "../apps/api/src/store-path-manifest.js";
import {
  startDesktopLocalApiServer,
  stopDesktopLocalApiServer,
} from "../apps/desktop/src/main/local-api.js";

const OPERATIONAL_SECRET = "store-path-preflight-operational-secret-32";
const OPERATIONAL_STEP_UP_OPTIONS = Object.freeze({
  hrxStepUpSecret: "store-path-preflight-step-up-secret-32-bytes",
  hrxStepUpTotpSecret: "store-path-preflight-step-up-totp-secret-32-bytes",
});

function runtimeTmpdirEntries() {
  return new Set(
    readdirSync(tmpdir()).filter((name) => name.startsWith("lawos-") && name.includes("-runtime-")),
  );
}

function withoutStoreEnv(env = process.env) {
  const next = { ...env };
  for (const entry of [...STORE_PATH_MANIFEST, ...DERIVED_STORE_PATH_MANIFEST]) delete next[entry.env];
  delete next.MATTER_DESKTOP_RUNTIME_STORE_DIR;
  return next;
}

function storePathsUnder(root) {
  return Object.fromEntries(
    STORE_PATH_MANIFEST.map((entry) => [entry.key, join(root, entry.fileName)]),
  );
}

async function fetchJson(url) {
  const response = await fetch(url);
  return { status: response.status, body: await response.json() };
}

async function closeServer(started) {
  await new Promise((resolveClose) => started.server.close(resolveClose));
}

function assertStoreFilesExist(paths) {
  for (const key of ["hrxStorePath", "matterStorePath", "dmsStorePath"]) {
    assert.equal(existsSync(paths[key]), true, `${key} should be created`);
    assert.equal(statSync(paths[key]).size > 0, true, `${key} should contain runtime data`);
  }
}

async function scenarioOperationalNoEnv() {
  const before = runtimeTmpdirEntries();
  const result = spawnSync(process.execPath, ["apps/api/src/server.js"], {
    cwd: resolve("."),
    env: {
      ...withoutStoreEnv(),
      LAWOS_RUNTIME_PROFILE: "operational",
      LAWOS_API_SESSION_SECRET: OPERATIONAL_SECRET,
    },
    encoding: "utf8",
    timeout: 5_000,
  });
  assert.equal(result.status, 78);
  assert.match(result.stderr, /LAWOS_STORE_PREFLIGHT_FAILED/);
  for (const entry of STORE_PATH_MANIFEST) assert.match(result.stderr, new RegExp(entry.env));
  const after = runtimeTmpdirEntries();
  for (const name of after) assert.equal(before.has(name), true, `unexpected tmpdir runtime directory: ${name}`);
}

async function scenarioOperationalStorePaths() {
  const parent = join(resolve("."), "artifacts", "tmp-store-preflight");
  mkdirSync(parent, { recursive: true });
  const root = mkdtempSync(join(parent, "operational-"));
  const paths = storePathsUnder(root);
  try {
    const first = await startApiServer({
      port: 0,
      runtimeProfile: "operational",
      sessionSecret: OPERATIONAL_SECRET,
      ...OPERATIONAL_STEP_UP_OPTIONS,
      ...paths,
    });
    const firstHealth = await fetchJson(`http://${first.host}:${first.port}/api/health`);
    assert.equal(firstHealth.status, 200);
    assert.equal(firstHealth.body.runtime_profile, "operational");
    assert.equal(firstHealth.body.synthetic_login_enabled, false);
    await closeServer(first);
    assertStoreFilesExist(paths);

    const second = await startApiServer({
      port: 0,
      runtimeProfile: "operational",
      sessionSecret: OPERATIONAL_SECRET,
      ...OPERATIONAL_STEP_UP_OPTIONS,
      ...paths,
    });
    const secondHealth = await fetchJson(`http://${second.host}:${second.port}/api/health`);
    assert.equal(secondHealth.status, 200);
    assert.equal(secondHealth.body.runtime_profile, "operational");
    await closeServer(second);
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(parent, { recursive: true, force: true });
  }
}

async function scenarioBareLocalDev() {
  const started = await startApiServer({ port: 0 });
  try {
    const health = await fetchJson(`http://${started.host}:${started.port}/api/health`);
    assert.equal(health.status, 200);
    assert.equal(health.body.runtime_profile, "local-dev");
    assert.equal(health.body.synthetic_login_enabled, true);
  } finally {
    await closeServer(started);
  }
}

async function scenarioDesktopLocalApi() {
  const userDataPath = mkdtempSync(join(tmpdir(), "lawos-store-preflight-desktop-"));
  const localApi = await startDesktopLocalApiServer({
    env: { ...process.env, LAWOS_RUNTIME_PROFILE: "operational" },
    userDataPath,
  });
  assert.ok(localApi);
  try {
    const health = await fetchJson(`${localApi.baseUrl}/api/health`);
    assert.equal(health.status, 200);
    assert.equal(health.body.runtime_profile, "local-dev");
  } finally {
    stopDesktopLocalApiServer(localApi);
  }
}

async function scenarioCatalogMatchesManifest() {
  const catalog = await readFile(STORE_ENV_CATALOG_PATH, "utf8");
  for (const entry of [...STORE_PATH_MANIFEST, ...DERIVED_STORE_PATH_MANIFEST]) {
    assert.match(catalog, new RegExp(entry.env));
  }
  for (const phrase of [
    "required-for-operational",
    "LAWOS_API_SESSION_SECRET",
    "LAWOS_AUDIT_STORE_PATH",
    "LAWOS_API_SESSION_SECRET_SECRET_ID",
    "MATTER_VAULT_BACKUP_ROOT",
    "LAWOS_DMS_OBJECT_STORE_PATH",
  ]) {
    assert.match(catalog, new RegExp(phrase));
  }
}

async function main() {
  await scenarioOperationalNoEnv();
  await scenarioOperationalStorePaths();
  await scenarioBareLocalDev();
  await scenarioDesktopLocalApi();
  await scenarioCatalogMatchesManifest();
  console.log(JSON.stringify({
    outcome: "passed",
    validator: "store-path-preflight",
    scenarios: 5,
    production_ready_claim: false,
  }, null, 2));
}

main().catch((error) => {
  console.error(error?.stack || error?.message || String(error));
  process.exit(1);
});

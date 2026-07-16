#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { startApiServer } from "../apps/api/src/server.js";
import { lawosDurableStorePathOptions } from "../apps/api/src/local-durable-store-paths.js";
import { desktopRuntimeStorePaths } from "../apps/desktop/src/main/local-api.js";
import { createMatterRepository } from "../packages/matter/src/repository.js";
import { writeJsonFileDurably } from "../packages/persistence/src/durable-file.js";

const SESSION_SECRET = "durable-data-persistence-local-secret-32";

async function closeServer(started) {
  await new Promise((resolveClose) => started.server.close(resolveClose));
}

async function fetchJson(url) {
  const response = await fetch(url);
  return { status: response.status, body: await response.json() };
}

function matterRecord(index) {
  const suffix = String(index).padStart(3, "0");
  return {
    model_type: "Matter",
    tenant_id: "tenant_durable_validate",
    matter_id: `matter_durable_${suffix}`,
    client_id: "client_durable_validate",
    matter_code: `DURABLE/VALIDATE/${suffix}`,
    matter_name: `Durable validate ${suffix}`,
    title: `Durable validate ${suffix}`,
    status: "open",
    created_by: "validator",
    created_at: "2026-07-09T00:00:00.000+09:00",
    permission_envelope_id: `perm_durable_${suffix}`,
    audit_trace_id: `audit_durable_${suffix}`,
  };
}

async function validateOperationalRestartPreservesStores(root) {
  const paths = lawosDurableStorePathOptions({ root });
  const first = await startApiServer({
    port: 0,
    runtimeProfile: "operational",
    sessionSecret: SESSION_SECRET,
    ...paths,
  });
  try {
    const health = await fetchJson(`http://${first.host}:${first.port}/api/health`);
    assert.equal(health.status, 200);
    assert.equal(health.body.runtime_profile, "operational");
  } finally {
    await closeServer(first);
  }
  assert.equal(existsSync(paths.matterStorePath), true);
  const before = JSON.parse(readFileSync(paths.matterStorePath, "utf8"));
  const second = await startApiServer({
    port: 0,
    runtimeProfile: "operational",
    sessionSecret: SESSION_SECRET,
    ...paths,
  });
  try {
    const health = await fetchJson(`http://${second.host}:${second.port}/api/health`);
    assert.equal(health.status, 200);
  } finally {
    await closeServer(second);
  }
  const after = JSON.parse(readFileSync(paths.matterStorePath, "utf8"));
  assert.equal(after.records.length >= before.records.length, true);
  return { matter_store_records_before: before.records.length, matter_store_records_after: after.records.length };
}

function validateDesktopStorePathUnity(root) {
  const paths = desktopRuntimeStorePaths({
    env: { MATTER_DESKTOP_RUNTIME_STORE_DIR: root },
    mkdirSyncImpl: mkdirSync,
    userDataPath: join(root, "ignored-user-data"),
  });
  assert.equal(paths.matterStorePath, join(root, "matter-store.json"));
  assert.equal(paths.authCredentialStorePath, join(root, "auth", "credential-store.json"));
  return { desktop_matter_store_path: paths.matterStorePath };
}

function validateAtomicBackupAndShrinkGuard(root) {
  const storePath = join(root, "matter-atomic-store.json");
  const repo = createMatterRepository({ filePath: storePath });
  for (let index = 0; index < 12; index += 1) repo.create(matterRecord(index));
  repo.update(
    { tenant_id: "tenant_durable_validate", model_type: "Matter", id: "matter_durable_001" },
    { title: "Durable validate updated" },
  );
  const generationRoot = join(process.env.HOME, "lawos-backups", "data", "matter-atomic-store.json");
  assert.equal(existsSync(generationRoot), true);
  assert.throws(
    () =>
      writeJsonFileDurably({
        filePath: storePath,
        previousState: JSON.parse(readFileSync(storePath, "utf8")),
        value: { migrations: [], records: [], idempotency: [], audit_events: [] },
      }),
    /LAWOS_STORE_SHRINK_BLOCKED/,
  );
  return { atomic_store_path: storePath, local_generation_backup_dir: generationRoot };
}

async function main() {
  const validationRoot = join(homedir(), "Library", "Application Support", "LawFirmOS");
  mkdirSync(validationRoot, { recursive: true });
  const root = mkdtempSync(join(validationRoot, "durable-data-validate-"));
  try {
    const operational = await validateOperationalRestartPreservesStores(root);
    const desktop = validateDesktopStorePathUnity(root);
    const atomic = validateAtomicBackupAndShrinkGuard(root);
    console.log(JSON.stringify({
      outcome: "passed",
      validator: "durable-data-persistence",
      root,
      operational,
      desktop,
      atomic,
      production_ready_claim: false,
    }, null, 2));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error?.stack ?? error?.message ?? String(error));
  process.exit(1);
});
